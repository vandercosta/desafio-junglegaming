import type { CartScope, CartSelection } from '@/features/cart/cart-api'

const cartsKey = 'kurio:carts:v1'
const legacyGuestKey = 'kurio:guest-cart:v1'

export const cartStorageLock = cartsKey

export type CartState = {
  selections: CartSelection[]
  couponCode: string | null
}

type StoredCarts = Record<string, unknown>

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
