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

export const guestCartQueryKey = ['cart', 'guest'] as const

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

export async function getCart(signal: AbortSignal): Promise<CartResponse> {
  const { data } = await api.get<CartResponse>('/cart', { signal })
  return validateCart(data)
}

export async function addCartItem(
  selection: CartSelection,
): Promise<CartResponse> {
  const { data } = await api.post<CartResponse>('/cart/items', selection)
  return validateCart(data)
}

export async function updateCartItemQuantity(
  itemId: string,
  quantity: number,
): Promise<CartResponse> {
  const { data } = await api.patch<CartResponse>(
    `/cart/items/${encodeURIComponent(itemId)}`,
    { quantity },
  )

  return validateCart(data)
}

export async function removeCartItem(itemId: string): Promise<CartResponse> {
  const { data } = await api.delete<CartResponse>(
    `/cart/items/${encodeURIComponent(itemId)}`,
  )

  return validateCart(data)
}

export async function applyCartCoupon(code: string): Promise<CartResponse> {
  const { data } = await api.put<CartResponse>('/cart/coupon', { code })
  return validateCart(data)
}

export async function removeCartCoupon(): Promise<CartResponse> {
  const { data } = await api.delete<CartResponse>('/cart/coupon')
  return validateCart(data)
}
