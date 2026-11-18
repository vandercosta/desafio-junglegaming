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
}

export type CartResponse = {
  items: CartItem[]
  subtotalEth: string
}

export const guestCartQueryKey = ['cart', 'guest'] as const

function validateCart(data: CartResponse): CartResponse {
  if (!Array.isArray(data?.items) || typeof data.subtotalEth !== 'string') {
    throw new Error('A API retornou um carrinho inválido')
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
