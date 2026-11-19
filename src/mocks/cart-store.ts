import type { CartScope, CartSelection } from '@/features/cart/cart-api'
import type { Order } from '@/features/checkout/checkout-api'
import type { NftUpdatedEvent } from '@/features/realtime/realtime-contract'

const cartsKey = 'kurio:carts:v1'
const legacyGuestKey = 'kurio:guest-cart:v1'
const checkoutField = '$checkout'

export const cartStorageLock = cartsKey

export type CartState = {
  selections: CartSelection[]
  couponCode: string | null
}

type StoredCarts = Record<string, unknown>

export type StoredOrder = {
  order: Order
  idempotencyKey: string
  fingerprint: string
  readyAt: number
  outcome: 'confirmed' | 'refused'
}

export type CheckoutStore = {
  orders: Record<string, StoredOrder[]>
  prices: Record<string, string>
  stock: Record<string, Record<string, number>>
  nftVersions: Record<string, number>
  previousNfts: Record<string, NftUpdatedEvent>
}

export function isCartSelection(value: unknown): value is CartSelection {
  if (typeof value !== 'object' || value === null) return false

  const { nftId, editionId, quantity } = value as Partial<CartSelection>

  return (
    typeof nftId === 'string' &&
    typeof editionId === 'string' &&
    isQuantity(quantity)
  )
}

export function isQuantity(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
}

function readStorage(key: string): unknown {
  try {
    return JSON.parse(localStorage.getItem(key) ?? 'null')
  } catch {
    return null
  }
}

function readCarts(): StoredCarts {
  const stored = readStorage(cartsKey)
  if (stored && typeof stored === 'object' && !Array.isArray(stored)) {
    return stored as StoredCarts
  }

  return { guest: readStorage(legacyGuestKey) }
}

function parseCart(data: unknown): CartState {
  if (Array.isArray(data)) {
    return { selections: data.filter(isCartSelection), couponCode: null }
  }

  const state = (data ?? {}) as Partial<CartState>

  return {
    selections: Array.isArray(state.selections)
      ? state.selections.filter(isCartSelection)
      : [],
    couponCode: typeof state.couponCode === 'string' ? state.couponCode : null,
  }
}

export function readCart(scope: CartScope): CartState {
  return parseCart(readCarts()[scope])
}

export function writeCart(scope: CartScope, state: CartState): void {
  localStorage.setItem(
    cartsKey,
    JSON.stringify({ ...readCarts(), [scope]: state }),
  )
}

export function readCheckoutStore(): CheckoutStore {
  const checkout = readCarts()[checkoutField] as
    Partial<CheckoutStore> | undefined

  return {
    orders: checkout?.orders ?? {},
    prices: checkout?.prices ?? {},
    stock: checkout?.stock ?? {},
    nftVersions: checkout?.nftVersions ?? {},
    previousNfts: checkout?.previousNfts ?? {},
  }
}

export function writeCheckoutStore(
  checkout: CheckoutStore,
  purchase?: { scope: CartScope; cart: CartState },
): void {
  const carts = readCarts()
  if (purchase) carts[purchase.scope] = purchase.cart
  carts[checkoutField] = checkout
  localStorage.setItem(cartsKey, JSON.stringify(carts))
}

export function mergeGuestCart(accountScope: CartScope): void {
  const carts = readCarts()
  const guest = parseCart(carts.guest)
  if (!guest.selections.length) return

  const account = parseCart(carts[accountScope])
  const selections = [...account.selections]

  for (const item of guest.selections) {
    const index = selections.findIndex(
      (candidate) =>
        candidate.nftId === item.nftId &&
        candidate.editionId === item.editionId,
    )

    if (index < 0) {
      selections.push(item)
    } else {
      selections[index] = {
        ...item,
        quantity: selections[index].quantity + item.quantity,
      }
    }
  }

  localStorage.setItem(
    cartsKey,
    JSON.stringify({
      ...carts,
      [accountScope]: {
        selections,
        couponCode: account.couponCode ?? guest.couponCode,
      },
      guest: { selections: [], couponCode: null },
    }),
  )
}
