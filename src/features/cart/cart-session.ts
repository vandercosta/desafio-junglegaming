import { useQuery, type QueryClient } from '@tanstack/react-query'
import {
  sessionQueryOptions,
  sessionQueryKey,
  type SessionState,
} from '@/features/auth/auth-api'
import {
  cartQueryKey,
  cartScopeForUser,
  type CartResponse,
  type CartScope,
} from './cart-api'

export function getCartScope(state: SessionState | undefined) {
  return state ? cartScopeForUser(state.session?.user.id) : undefined
}

export function useCartScope() {
  const { data } = useQuery(sessionQueryOptions)
  return getCartScope(data)
}

export async function updateCartCache(
  queryClient: QueryClient,
  scope: CartScope,
  cart: CartResponse,
) {
  const queryKey = cartQueryKey(scope)
  await queryClient.cancelQueries({ queryKey, exact: true })

  if (
    getCartScope(queryClient.getQueryData<SessionState>(sessionQueryKey)) ===
    scope
  ) {
    queryClient.setQueryData(queryKey, cart)
  }
}
