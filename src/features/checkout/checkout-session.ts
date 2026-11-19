import type { QueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { sessionQueryKey } from '@/features/auth/auth-api'
import type { CheckoutErrorResponse } from './checkout-api'

export function refreshCheckoutSession(
  error: unknown,
  queryClient: QueryClient,
) {
  if (
    axios.isAxiosError<CheckoutErrorResponse>(error) &&
    (error.response?.status === 401 ||
      error.response?.data?.code === 'CHECKOUT_SESSION_CHANGED')
  ) {
    void queryClient.invalidateQueries({ queryKey: sessionQueryKey })
  }
}
