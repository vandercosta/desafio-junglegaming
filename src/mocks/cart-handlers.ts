import { delay, http, HttpResponse } from 'msw'
import type { CartResponse, CartSelection } from '@/features/cart/cart-api'
import { fromWei, toWei } from '@/lib/eth'
import { nftEditions, nfts } from './fixtures/nfts'

const storageKey = 'kurio:guest-cart:v1'
const networkFee = toWei('0.016')

type CartState = {
  selections: CartSelection[]
  couponCode: string | null
}

type Coupon = {
  code: string
  discountBasisPoints: bigint
  expiresAt: number | null
}

const coupons: Coupon[] = [
  { code: 'KURIO10', discountBasisPoints: 1000n, expiresAt: null },
  {
    code: 'EXPIRADO10',
    discountBasisPoints: 1000n,
    expiresAt: Date.UTC(2024, 0, 1),
  },
]

function isCartSelection(value: unknown): value is CartSelection {
  if (typeof value !== 'object' || value === null) return false

  const { nftId, editionId, quantity } = value as Partial<CartSelection>

  return (
    typeof nftId === 'string' &&
    typeof editionId === 'string' &&
    isQuantity(quantity)
  )
}

function readCart(): CartState {
  const stored = localStorage.getItem(storageKey)
  let data: unknown
  try {
    data = JSON.parse(stored ?? 'null')
  } catch {
    data = null
  }

  if (Array.isArray(data)) {
    return { selections: data.filter(isCartSelection), couponCode: null }
  }

  if (typeof data === 'object' && data !== null) {
    const { selections, couponCode } = data as Partial<CartState>

    return {
      selections: Array.isArray(selections)
        ? selections.filter(isCartSelection)
        : [],
      couponCode: typeof couponCode === 'string' ? couponCode : null,
    }
  }

  return { selections: [], couponCode: null }
}

function cartItemId(selection: CartSelection): string {
  return `${selection.nftId}:${selection.editionId}`
}

function isQuantity(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
}

function isCouponExpired(coupon: Coupon, now: number): boolean {
  return coupon.expiresAt !== null && now >= coupon.expiresAt
}

function buildCart(state: CartState, now = Date.now()): CartResponse {
  let subtotal = 0n

  const items = state.selections.flatMap((selection) => {
    const nft = nfts.find((item) => item.id === selection.nftId)
    const edition = nftEditions.find((item) => item.id === selection.editionId)

    if (!nft || !edition) return []

    const lineTotal = toWei(nft.priceEth) * BigInt(selection.quantity)
    subtotal += lineTotal

    return [
      {
        ...selection,
        id: cartItemId(selection),
        nftName: nft.name,
        editionLabel: edition.label,
        unitPriceEth: nft.priceEth,
        lineTotalEth: fromWei(lineTotal),
        availableQuantity: edition.availableQuantity,
      },
    ]
  })

  const candidate = coupons.find((coupon) => coupon.code === state.couponCode)
  const coupon =
    items.length > 0 && candidate && !isCouponExpired(candidate, now)
      ? candidate
      : undefined
  const discount = coupon
    ? (subtotal * coupon.discountBasisPoints) / 10_000n
    : 0n
  const fee = items.length > 0 ? networkFee : 0n

  return {
    items,
    subtotalEth: fromWei(subtotal),
    discountEth: fromWei(discount),
    networkFeeEth: fromWei(fee),
    totalEth: fromWei(subtotal - discount + fee),
    couponCode: coupon?.code ?? null,
    hasStockConflict:
      items.length !== state.selections.length ||
      items.some((item) => item.quantity > item.availableQuantity),
  }
}

function persistCart(state: CartState, cart = buildCart(state)) {
  localStorage.setItem(
    storageKey,
    JSON.stringify({
      selections: state.selections,
      couponCode: cart.couponCode,
    }),
  )
  return HttpResponse.json(cart)
}

function simulatedEditFailure() {
  if (import.meta.env.VITE_MOCK_CART_EDITS === 'error') {
    return HttpResponse.json(
      { message: 'O carrinho está temporariamente indisponível.' },
      { status: 503 },
    )
  }
}

export const cartHandlers = [
  http.get('/api/cart', () => {
    return HttpResponse.json(buildCart(readCart()))
  }),

  http.post('/api/cart/items', async ({ request }) => {
    await delay(350)

    const input: unknown = await request.json().catch(() => null)

    if (!isCartSelection(input)) {
      return HttpResponse.json(
        { message: 'Informe um NFT, uma edição e uma quantidade válida.' },
        { status: 400 },
      )
    }

    const nft = nfts.find((item) => item.id === input.nftId)
    const edition = nftEditions.find((item) => item.id === input.editionId)

    if (!nft || !edition) {
      return HttpResponse.json(
        { message: 'NFT ou edição não encontrada.' },
        { status: 404 },
      )
    }

    const state = readCart()
    const { selections } = state
    const index = selections.findIndex(
      (item) =>
        item.nftId === input.nftId && item.editionId === input.editionId,
    )
    const currentQuantity = selections[index]?.quantity ?? 0
    const quantity = currentQuantity + input.quantity

    if (quantity > edition.availableQuantity) {
      return HttpResponse.json(
        { message: 'O carrinho ultrapassaria o limite desta edição.' },
        { status: 409 },
      )
    }

    const next = { ...input, quantity }
    if (index === -1) selections.push(next)
    else selections[index] = next

    return persistCart(state)
  }),

  http.patch('/api/cart/items/:itemId', async ({ params, request }) => {
    await delay(350)

    const failure = simulatedEditFailure()
    if (failure) return failure

    const body: unknown = await request.json().catch(() => null)
    const quantity =
      typeof body === 'object' && body !== null && 'quantity' in body
        ? body.quantity
        : undefined

    if (!isQuantity(quantity)) {
      return HttpResponse.json(
        { message: 'Informe uma quantidade inteira maior que zero.' },
        { status: 400 },
      )
    }

    const state = readCart()
    const { selections } = state
    const item = selections.find(
      (selection) => cartItemId(selection) === params.itemId,
    )
    const edition = nftEditions.find(
      (candidate) => candidate.id === item?.editionId,
    )

    if (!item || !edition) {
      return HttpResponse.json(
        { message: 'Item do carrinho não encontrado.' },
        { status: 404 },
      )
    }

    if (quantity > edition.availableQuantity) {
      return HttpResponse.json(
        { message: 'A quantidade ultrapassa o estoque desta edição.' },
        { status: 409 },
      )
    }

    return persistCart({
      ...state,
      selections: selections.map((selection) =>
        selection === item ? { ...selection, quantity } : selection,
      ),
    })
  }),

  http.delete('/api/cart/items/:itemId', async ({ params }) => {
    await delay(350)

    const failure = simulatedEditFailure()
    if (failure) return failure

    const state = readCart()
    return persistCart({
      ...state,
      selections: state.selections.filter(
        (selection) => cartItemId(selection) !== params.itemId,
      ),
    })
  }),

  http.put('/api/cart/coupon', async ({ request }) => {
    await delay(350)

    const body: unknown = await request.json().catch(() => null)
    const code =
      typeof body === 'object' && body !== null && 'code' in body
        ? body.code
        : undefined
    const normalizedCode =
      typeof code === 'string' ? code.trim().toUpperCase() : ''
    const coupon = coupons.find((item) => item.code === normalizedCode)

    if (!coupon) {
      return HttpResponse.json(
        { code: 'COUPON_INVALID', message: 'Cupom inválido.' },
        { status: 422 },
      )
    }

    const now = Date.now()
    if (isCouponExpired(coupon, now)) {
      return HttpResponse.json(
        { code: 'COUPON_EXPIRED', message: 'Cupom expirado.' },
        { status: 422 },
      )
    }

    const state = { ...readCart(), couponCode: coupon.code }
    const cart = buildCart(state, now)

    if (cart.items.length === 0) {
      return HttpResponse.json(
        {
          code: 'CART_EMPTY',
          message: 'Adicione itens antes de aplicar o cupom.',
        },
        { status: 409 },
      )
    }

    if (cart.hasStockConflict) {
      return HttpResponse.json(
        {
          code: 'CART_STOCK_CONFLICT',
          message:
            'Ajuste as quantidades do carrinho antes de aplicar o cupom.',
        },
        { status: 409 },
      )
    }

    return persistCart(state, cart)
  }),

  http.delete('/api/cart/coupon', async () => {
    await delay(350)

    return persistCart({ ...readCart(), couponCode: null })
  }),
]
