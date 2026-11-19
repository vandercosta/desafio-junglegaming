import { delay, http, HttpResponse } from 'msw'
import { cartScopeForUser } from '@/features/cart/cart-api'
import type {
  CheckoutConnection,
  CheckoutConnectionInput,
  CheckoutErrorResponse,
  CheckoutFieldErrors,
  CheckoutQuote,
  CollectorInput,
  Order,
  OrderInput,
} from '@/features/checkout/checkout-api'
import { walletNetworks, type Wallet } from '@/features/wallets/wallets-api'
import { fromWei, toWei } from '@/lib/eth'
import { getMockUserId } from './auth-handlers'
import { buildCart } from './cart-handlers'
import { readCatalog } from './catalog-state'
import {
  cartStorageLock,
  readCart,
  readCheckoutStore,
  writeCheckoutStore,
  type CheckoutStore,
  type StoredOrder,
} from './cart-store'
import { readWallets } from './wallet-handlers'

const scenarioKey = 'kurio:mock-checkout-scenario:v1'
const connectionPrefix = 'kurio:checkout-connection:v1:'
const connectionDurationMs = 30 * 60 * 1000
const processingDurationMs = 1_500

type StoredConnection = CheckoutConnectionInput & {
  id: string
  wallet: Wallet
  expiresAt: number
}

function checkoutError(
  status: number,
  code: string,
  details: Omit<CheckoutErrorResponse, 'code'> = {},
) {
  return HttpResponse.json<CheckoutErrorResponse>(
    { code, ...details },
    { status },
  )
}

function withCheckout(
  request: Request,
  run: (userId: string) => Response | Promise<Response>,
) {
  return navigator.locks.request(cartStorageLock, async () => {
    const userId = getMockUserId()
    const expected = request.headers.get('X-Checkout-User')

    if (!userId) return checkoutError(401, 'AUTH_REQUIRED')
    if (expected !== null && expected !== userId) {
      return checkoutError(409, 'CHECKOUT_SESSION_CHANGED')
    }

    try {
      return await run(userId)
    } catch (error) {
      if (
        error instanceof DOMException &&
        error.name === 'QuotaExceededError'
      ) {
        return checkoutError(503, 'CHECKOUT_STORAGE_UNAVAILABLE')
      }
      throw error
    }
  })
}

function readInput(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function readText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function validateWalletSelection(
  input: Record<string, unknown>,
  fields: CheckoutFieldErrors,
) {
  const { network, walletSlot } = input

  if (walletSlot !== 'principal' && walletSlot !== 'secundaria') {
    fields.walletSlot = 'Selecione uma carteira cadastrada.'
  }
  if (typeof network !== 'string' || !Object.hasOwn(walletNetworks, network)) {
    fields.network = 'Selecione uma rede válida.'
  }

  return fields.walletSlot || fields.network
    ? null
    : ({ walletSlot, network } as CheckoutConnectionInput)
}

function validateCollector(
  raw: unknown,
  fields: CheckoutFieldErrors,
): CollectorInput {
  const input = readInput(raw)
  const collector = {
    displayName: readText(input.displayName),
    username: readText(input.username).toLowerCase(),
    profileName: readText(input.profileName),
    email: readText(input.email).toLowerCase(),
    ensName: readText(input.ensName).toLowerCase(),
    referralCode: readText(input.referralCode),
    note: readText(input.note),
  }

  if (collector.displayName.length < 2 || collector.displayName.length > 60) {
    fields.displayName = 'Use de 2 a 60 caracteres no nome de exibição.'
  }
  if (!/^[a-z0-9_]{3,24}$/.test(collector.username)) {
    fields.username = 'Use de 3 a 24 letras, números ou sublinhados.'
  }
  if (collector.profileName.length < 2 || collector.profileName.length > 60) {
    fields.profileName = 'Use de 2 a 60 caracteres no nome do perfil.'
  }
  if (
    collector.email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(collector.email)
  ) {
    fields.email = 'Informe um e-mail válido.'
  }
  if (
    collector.ensName &&
    !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(collector.ensName)
  ) {
    fields.ensName = 'Informe apenas o nome ENS, sem o sufixo .eth.'
  }
  if (collector.referralCode.length > 32) {
    fields.referralCode = 'Use até 32 caracteres no código de indicação.'
  }
  if (collector.note.length > 500) {
    fields.note = 'Use até 500 caracteres na observação.'
  }

  return collector
}

function savedWallet(
  userId: string,
  { walletSlot, network }: CheckoutConnectionInput,
): Wallet | null {
  const { primary, secondary } = readWallets(userId)
  const wallet =
    walletSlot === 'principal' || secondary?.kind === 'same-as-primary'
      ? primary
      : secondary?.kind === 'independent'
        ? secondary.wallet
        : null

  return wallet?.network === network ? wallet : null
}

function readConnection(userId: string): StoredConnection | null {
  try {
    return JSON.parse(
      localStorage.getItem(`${connectionPrefix}${userId}`) ?? 'null',
    ) as StoredConnection | null
  } catch {
    return null
  }
}

function stringifyHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join(
    '',
  )
}

async function fingerprint(value: unknown) {
  const input = new TextEncoder().encode(JSON.stringify(value))
  return stringifyHex(
    new Uint8Array(await crypto.subtle.digest('SHA-256', input)),
  )
}

async function buildQuote(
  userId: string,
  checkout: CheckoutStore,
): Promise<CheckoutQuote> {
  const cart = buildCart(
    readCart(cartScopeForUser(userId)),
    Date.now(),
    readCatalog(checkout),
  )
  return { quoteId: await fingerprint([userId, cart]), cart }
}

function settleOrder(
  userId: string,
  record: StoredOrder,
  checkout: CheckoutStore,
): Order {
  const { order } = record
  if (order.status !== 'pending' || Date.now() < record.readyAt) return order

  const catalog = readCatalog(checkout)
  const hasStock = order.quote.items.every((item) =>
    catalog
      .editionsFor(item.nftId)
      .some(
        (edition) =>
          edition.id === item.editionId &&
          edition.availableQuantity >= item.quantity,
      ),
  )
  const confirmed = record.outcome === 'confirmed' && hasStock
  const next: Order = {
    ...order,
    status: confirmed ? 'confirmed' : 'refused',
    version: order.version + 1,
    transactionId: confirmed
      ? `0x${stringifyHex(crypto.getRandomValues(new Uint8Array(32)))}`
      : null,
  }
  const nextCheckout: CheckoutStore = {
    ...checkout,
    orders: {
      ...checkout.orders,
      [userId]: checkout.orders[userId].map((candidate) =>
        candidate.order.id === order.id
          ? { ...candidate, order: next }
          : candidate,
      ),
    },
  }

  if (!confirmed) {
    writeCheckoutStore(nextCheckout)
    return next
  }

  const scope = cartScopeForUser(userId)
  const currentCart = readCart(scope)
  const purchased = new Map(
    order.quote.items.map((item) => [item.id, item.quantity]),
  )
  const selections = currentCart.selections.flatMap((item) => {
    const quantity =
      item.quantity - (purchased.get(`${item.nftId}:${item.editionId}`) ?? 0)
    return quantity > 0 ? [{ ...item, quantity }] : []
  })
  const couponCode = selections.length ? currentCart.couponCode : null

  // A receipt and its cart/stock effects become durable in the same write.
  writeCheckoutStore(nextCheckout, { scope, cart: { selections, couponCode } })
  return next
}

export const checkoutHandlers = [
  http.get('/api/checkout/quote', async ({ request }) => {
    await delay(150)
    return withCheckout(request, async (userId) =>
      HttpResponse.json(await buildQuote(userId, readCheckoutStore())),
    )
  }),

  http.post('/api/checkout/connection', async ({ request }) => {
    await delay(250)
    const raw = readInput(await request.json().catch(() => null))

    return withCheckout(request, (userId) => {
      const fields: CheckoutFieldErrors = {}
      const selection = validateWalletSelection(raw, fields)
      if (!selection) return checkoutError(422, 'VALIDATION_ERROR', { fields })

      const wallet = savedWallet(userId, selection)
      if (!wallet) return checkoutError(409, 'WALLET_CHANGED')

      const scenario = localStorage.getItem(scenarioKey)
      const storageKey = `${connectionPrefix}${userId}`

      if (scenario === 'connection-refused' || scenario === 'disconnected') {
        localStorage.removeItem(scenarioKey)
        localStorage.removeItem(storageKey)
        return HttpResponse.json<CheckoutConnection>({
          status:
            scenario === 'connection-refused' ? 'refused' : 'disconnected',
        })
      }

      const connection: StoredConnection = {
        ...selection,
        id: crypto.randomUUID(),
        wallet,
        expiresAt: Date.now() + connectionDurationMs,
      }
      localStorage.setItem(storageKey, JSON.stringify(connection))

      return HttpResponse.json<CheckoutConnection>({
        status: 'connected',
        connectionId: connection.id,
      })
    })
  }),

  http.delete('/api/checkout/connection', async ({ request }) => {
    await delay(150)
    const { connectionId } = readInput(await request.json().catch(() => null))

    return withCheckout(request, (userId) => {
      if (typeof connectionId !== 'string' || !connectionId) {
        return checkoutError(422, 'VALIDATION_ERROR')
      }

      if (readConnection(userId)?.id === connectionId) {
        localStorage.removeItem(`${connectionPrefix}${userId}`)
      }

      return new HttpResponse(null, { status: 204 })
    })
  }),

  http.post('/api/orders', async ({ request }) => {
    await delay(300)
    const raw = readInput(await request.json().catch(() => null))
    const key = request.headers.get('Idempotency-Key')

    return withCheckout(request, async (userId) => {
      if (!key || !/^[a-zA-Z0-9._:-]{1,128}$/.test(key)) {
        return checkoutError(400, 'IDEMPOTENCY_KEY_REQUIRED')
      }

      const fields: CheckoutFieldErrors = {}
      const selection = validateWalletSelection(raw, fields)
      const collector = validateCollector(raw.collector, fields)
      const quoteId = readText(raw.quoteId)
      const connectionId = readText(raw.connectionId)

      if (!selection || Object.keys(fields).length) {
        return checkoutError(422, 'VALIDATION_ERROR', { fields })
      }
      if (!quoteId || !connectionId)
        return checkoutError(422, 'VALIDATION_ERROR')

      const input: OrderInput = {
        ...selection,
        collector,
        quoteId,
        connectionId,
      }
      const checkout = readCheckoutStore()
      const records = checkout.orders[userId] ?? []
      const hash = await fingerprint(input)
      const previous = records.find((record) => record.idempotencyKey === key)

      if (getMockUserId() !== userId) return checkoutError(401, 'AUTH_REQUIRED')
      if (previous) {
        return previous.fingerprint === hash
          ? HttpResponse.json(previous.order)
          : checkoutError(409, 'IDEMPOTENCY_CONFLICT')
      }

      const pending = records.find(({ order }) => order.status === 'pending')
      if (pending)
        return checkoutError(409, 'ORDER_IN_PROGRESS', {
          orderId: pending.order.id,
        })

      const wallet = savedWallet(userId, selection)
      const connection = readConnection(userId)
      if (
        !connection ||
        connection.id !== input.connectionId ||
        connection.expiresAt <= Date.now()
      ) {
        return checkoutError(409, 'WALLET_NOT_CONNECTED')
      }
      if (
        !wallet ||
        connection.walletSlot !== input.walletSlot ||
        connection.network !== input.network ||
        JSON.stringify(wallet) !== JSON.stringify(connection.wallet)
      ) {
        return checkoutError(409, 'WALLET_CHANGED')
      }

      const scenario = localStorage.getItem(scenarioKey)
      if (scenario === 'disconnected') {
        localStorage.removeItem(scenarioKey)
        localStorage.removeItem(`${connectionPrefix}${userId}`)
        return checkoutError(409, 'WALLET_NOT_CONNECTED')
      }

      const quote = await buildQuote(userId, checkout)
      if (getMockUserId() !== userId) return checkoutError(401, 'AUTH_REQUIRED')
      if (quote.quoteId !== input.quoteId)
        return checkoutError(409, 'QUOTE_CHANGED', { quote })
      if (!quote.cart.items.length) return checkoutError(409, 'CART_EMPTY')
      if (quote.cart.hasStockConflict)
        return checkoutError(409, 'CART_STOCK_CONFLICT')

      if (scenario === 'quote-changed') {
        const first = quote.cart.items[0]
        checkout.prices[first.nftId] = fromWei(
          toWei(first.unitPriceEth) + toWei('0.1'),
        )
        writeCheckoutStore(checkout)
        localStorage.removeItem(scenarioKey)
        return checkoutError(409, 'QUOTE_CHANGED', {
          quote: await buildQuote(userId, checkout),
        })
      }

      const createdAt = Date.now()
      const order: Order = {
        id: crypto.randomUUID(),
        status: 'pending',
        version: 1,
        createdAt: new Date(createdAt).toISOString(),
        transactionId: null,
        quote: quote.cart,
        wallet,
        collector,
      }
      checkout.orders[userId] = [
        ...records,
        {
          order,
          fingerprint: hash,
          idempotencyKey: key,
          readyAt: createdAt + processingDurationMs,
          outcome: scenario === 'refused' ? 'refused' : 'confirmed',
        },
      ]
      writeCheckoutStore(checkout)

      if (scenario === 'timeout' || scenario === 'refused')
        localStorage.removeItem(scenarioKey)
      if (scenario === 'timeout')
        return checkoutError(504, 'ORDER_RESPONSE_TIMEOUT')

      return HttpResponse.json(order, { status: 201 })
    })
  }),

  http.get('/api/orders/:orderId', async ({ request, params }) => {
    await delay(150)
    return withCheckout(request, (userId) => {
      const checkout = readCheckoutStore()
      const record = checkout.orders[userId]?.find(
        ({ order }) => order.id === params.orderId,
      )
      if (!record) return checkoutError(404, 'ORDER_NOT_FOUND')

      return HttpResponse.json(settleOrder(userId, record, checkout))
    })
  }),
]
