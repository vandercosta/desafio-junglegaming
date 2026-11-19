import { api } from '@/lib/api'

export type CartSelection = {
  nftId: string
  editionId: string
  quantity: number
}

export type CartItem = CartSelection & {
  id: string
  nftName: string
  editionLabel: string
  unitPriceEth: string
  lineTotalEth: string
  availableQuantity: number
}

export type CartResponse = {
  items: CartItem[]
  subtotalEth: string
  discountEth: string
  networkFeeEth: string
  totalEth: string
  couponCode: string | null
  hasStockConflict: boolean
}

export type CartScope = 'guest' | `user:${string}`

export const cartQueriesKey = ['cart'] as const

export function cartScopeForUser(userId?: string): CartScope {
  return userId === undefined ? 'guest' : `user:${userId}`
}

export function cartQueryKey(scope: CartScope) {
  return [...cartQueriesKey, scope] as const
}

function cartRequest(scope: CartScope) {
  return { headers: { 'X-Cart-Scope': scope } }
}

function validateCart(data: CartResponse): CartResponse {
  if (
    !Array.isArray(data?.items) ||
    typeof data.subtotalEth !== 'string' ||
    typeof data.discountEth !== 'string' ||
    typeof data.networkFeeEth !== 'string' ||
    typeof data.totalEth !== 'string' ||
    (data.couponCode !== null && typeof data.couponCode !== 'string') ||
    typeof data.hasStockConflict !== 'boolean'
  ) {
    throw new Error('A API retornou uma cotação inválida')
  }

  return data
}

export async function getCart(
  scope: CartScope,
  signal: AbortSignal,
): Promise<CartResponse> {
  const { data } = await api.get<CartResponse>('/cart', {
    ...cartRequest(scope),
    signal,
  })
  return validateCart(data)
}

export async function addCartItem(
  scope: CartScope,
  selection: CartSelection,
): Promise<CartResponse> {
  const { data } = await api.post<CartResponse>(
    '/cart/items',
    selection,
    cartRequest(scope),
  )
  return validateCart(data)
}

export async function updateCartItemQuantity(
  scope: CartScope,
  itemId: string,
  quantity: number,
): Promise<CartResponse> {
  const { data } = await api.patch<CartResponse>(
    `/cart/items/${encodeURIComponent(itemId)}`,
    { quantity },
    cartRequest(scope),
  )

  return validateCart(data)
}

export async function removeCartItem(
  scope: CartScope,
  itemId: string,
): Promise<CartResponse> {
  const { data } = await api.delete<CartResponse>(
    `/cart/items/${encodeURIComponent(itemId)}`,
    cartRequest(scope),
  )

  return validateCart(data)
}

export async function applyCartCoupon(
  scope: CartScope,
  code: string,
): Promise<CartResponse> {
  const { data } = await api.put<CartResponse>(
    '/cart/coupon',
    { code },
    cartRequest(scope),
  )
  return validateCart(data)
}

export async function removeCartCoupon(
  scope: CartScope,
): Promise<CartResponse> {
  const { data } = await api.delete<CartResponse>(
    '/cart/coupon',
    cartRequest(scope),
  )
  return validateCart(data)
}
