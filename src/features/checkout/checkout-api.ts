import { validateCart, type CartResponse } from '@/features/cart/cart-api'
import type { Wallet } from '@/features/wallets/wallets-api'
import { api } from '@/lib/api'

export type CheckoutWalletSlot = 'principal' | 'secundaria'

export type CheckoutConnectionInput = {
  walletSlot: CheckoutWalletSlot
  network: Wallet['network']
}

export type CollectorInput = {
  displayName: string
  username: string
  profileName: string
  email: string
  ensName: string
  referralCode: string
  note: string
}

export type CheckoutQuote = {
  quoteId: string
  cart: CartResponse
}

export type CheckoutConnection =
  | { status: 'connected'; connectionId: string }
  | { status: 'refused' | 'disconnected' }

export type OrderInput = CheckoutConnectionInput & {
  quoteId: string
  connectionId: string
  collector: CollectorInput
}

export type Order = {
  id: string
  status: 'pending' | 'confirmed' | 'refused'
  version: number
  createdAt: string
  transactionId: string | null
  quote: CartResponse
  wallet: Wallet
  collector: CollectorInput
}

export type CheckoutFieldErrors = Partial<
  Record<keyof CollectorInput | keyof CheckoutConnectionInput, string>
>

export type CheckoutErrorResponse = {
  code?: string
  message?: string
  fields?: CheckoutFieldErrors
  quote?: CheckoutQuote
  orderId?: string
}

export const checkoutQueriesKey = ['checkout'] as const

export function checkoutQueryKey(userId: string, ...segments: string[]) {
  return [...checkoutQueriesKey, userId, ...segments] as const
}

function checkoutHeaders(userId: string) {
  return { 'X-Checkout-User': userId }
}

function validateOrder(data: Order): Order {
  if (
    typeof data?.id !== 'string' ||
    !Number.isSafeInteger(data.version) ||
    data.version < 1 ||
    !['pending', 'confirmed', 'refused'].includes(data.status) ||
    !Number.isFinite(Date.parse(data.createdAt)) ||
    (data.status === 'confirmed'
      ? typeof data.transactionId !== 'string'
      : data.transactionId !== null) ||
    typeof data.wallet?.address !== 'string' ||
    typeof data.collector?.displayName !== 'string'
  ) {
    throw new Error('A API retornou um pedido inválido.')
  }

  validateCart(data.quote)
  return data
}

export async function getCheckoutQuote(
  userId: string,
  signal: AbortSignal,
): Promise<CheckoutQuote> {
  const { data } = await api.get<CheckoutQuote>('/checkout/quote', {
    headers: checkoutHeaders(userId),
    signal,
  })

  if (typeof data?.quoteId !== 'string') {
    throw new Error('A API retornou uma cotação inválida.')
  }

  validateCart(data.cart)
  return data
}

export async function connectCheckoutWallet(
  userId: string,
  input: CheckoutConnectionInput,
): Promise<CheckoutConnection> {
  const { data } = await api.post<CheckoutConnection>(
    '/checkout/connection',
    input,
    { headers: checkoutHeaders(userId) },
  )

  if (
    data?.status === 'refused' ||
    data?.status === 'disconnected' ||
    (data?.status === 'connected' && typeof data.connectionId === 'string')
  ) {
    return data
  }

  throw new Error('A API retornou um resultado de conexão inválido.')
}

export async function createOrder(
  userId: string,
  idempotencyKey: string,
  input: OrderInput,
): Promise<Order> {
  const { data } = await api.post<Order>('/orders', input, {
    headers: {
      ...checkoutHeaders(userId),
      'Idempotency-Key': idempotencyKey,
    },
  })

  return validateOrder(data)
}

export async function disconnectCheckoutWallet(
  userId: string,
  connectionId: string,
): Promise<void> {
  const response = await api.delete('/checkout/connection', {
    data: { connectionId },
    headers: checkoutHeaders(userId),
  })

  if (response.status !== 204) {
    throw new Error('A API não confirmou a desconexão da carteira.')
  }
}

export async function getOrder(
  userId: string,
  orderId: string,
  signal: AbortSignal,
): Promise<Order> {
  const { data } = await api.get<Order>(
    `/orders/${encodeURIComponent(orderId)}`,
    { headers: checkoutHeaders(userId), signal },
  )

  if (data?.id !== orderId) {
    throw new Error('A API retornou um pedido diferente do solicitado.')
  }

  return validateOrder(data)
}
