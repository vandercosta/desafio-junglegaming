import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import axios from 'axios'
import { useEffect, useRef, useState } from 'react'
import {
  sessionQueryKey,
  sessionQueryOptions,
  type SessionState,
} from '@/features/auth/auth-api'
import { cartQueryKey, cartScopeForUser } from '@/features/cart/cart-api'
import { parseCatalogSearch } from '@/features/catalog/catalog-search'
import { favoritesQueryKey } from '@/features/favorites/favorites-api'
import { walletsQueryKey } from '@/features/wallets/wallets-api'
import { Button } from '@/components/ui/button'
import {
  checkoutQueryKey,
  createOrder,
  type CheckoutErrorResponse,
  type OrderInput,
} from './checkout-api'
import CheckoutForm from './checkout-form'
import { refreshCheckoutSession } from './checkout-session'
import CheckoutReceipt from './checkout-receipt'
import {
  readCheckoutAttempt,
  removeCheckoutAttempt,
  saveCheckoutAttempt,
  type CheckoutAttempt,
} from './checkout-storage'

export default function CheckoutPage() {
  const search = useSearch({ from: '/pagamento' })
  const cartSearch = parseCatalogSearch(search)
  const session = useQuery(sessionQueryOptions)
  const userId = session.data?.session?.user.id

  return (
    <main className="page-shell grid gap-5 py-6">
      <nav
        aria-label="Caminho da página"
        className="flex flex-wrap gap-2 text-sm"
      >
        <Link to="/" search={cartSearch} className="underline">
          Início
        </Link>
        <span aria-hidden="true">/</span>
        <Link to="/carrinho" search={cartSearch} className="underline">
          Carrinho
        </Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Pagamento</span>
      </nav>
      <h1 className="text-2xl font-semibold">Pagamento</h1>
      {userId ? (
        <AccountCheckout
          key={`${userId}:${search.pedido ?? ''}`}
          userId={userId}
          requestedOrderId={search.pedido}
        />
      ) : session.data !== undefined ? (
        <section className="grid justify-items-start gap-3">
          <p>Entre na sua conta para continuar com o pagamento.</p>
          <Button asChild>
            <Link
              to="/pagamento"
              search={(previous) => ({ ...previous, auth: 'entrar' })}
            >
              Entrar para pagar
            </Link>
          </Button>
        </section>
      ) : session.isPending ? (
        <p role="status">Aguardando a verificação da sessão…</p>
      ) : null}
    </main>
  )
}

function failureMessage(failure: CheckoutErrorResponse | undefined) {
  switch (failure?.code) {
    case 'QUOTE_CHANGED':
      return 'A cotação mudou. Revise o novo total antes de confirmar a compra.'
    case 'WALLET_CHANGED':
    case 'WALLET_NOT_CONNECTED':
      return 'A conexão da carteira precisa ser renovada. Conecte e revise a compra novamente.'
    case 'CART_EMPTY':
      return 'O carrinho está vazio. Adicione um NFT para continuar.'
    case 'CART_STOCK_CONFLICT':
      return 'A disponibilidade mudou. Ajuste as quantidades no carrinho antes de continuar.'
    default:
      return (
        failure?.message ??
        'Não foi possível enviar a compra. Revise os dados e tente novamente.'
      )
  }
}

function AccountCheckout({
  userId,
  requestedOrderId,
}: {
  userId: string
  requestedOrderId?: string
}) {
  const navigate = useNavigate({ from: '/pagamento' })
  const queryClient = useQueryClient()
  const [attempt, setAttempt] = useState(() => readCheckoutAttempt(userId))
  const [failure, setFailure] = useState<CheckoutErrorResponse | null>(null)
  const sending = useRef(false)
  const orderId = requestedOrderId ?? attempt?.orderId
  const quoteQueryKey = checkoutQueryKey(userId, 'quote')
  const currentUserMatches = () =>
    queryClient.getQueryData<SessionState>(sessionQueryKey)?.session?.user
      .id === userId

  useEffect(() => {
    if (!requestedOrderId && orderId) {
      void navigate({
        to: '/pagamento',
        search: (previous) => ({ ...previous, pedido: orderId }),
        replace: true,
      })
    }
  }, [navigate, orderId, requestedOrderId])

  function acknowledgeOrder(sent: CheckoutAttempt, receivedId: string) {
    const stored = readCheckoutAttempt(userId)
    if (stored?.key !== sent.key) return
    const next = { ...sent, orderId: receivedId }
    try {
      saveCheckoutAttempt(userId, next)
    } catch {
      // The original request can still be recovered with the saved key.
    }
    setAttempt(next)
  }

  const send = useMutation({
    mutationKey: checkoutQueryKey(userId, 'create-order'),
    mutationFn: ({ key, input }: CheckoutAttempt) =>
      createOrder(userId, key, input),
    retry: false,
    onSuccess: (order, sent) => {
      acknowledgeOrder(sent, order.id)
      if (currentUserMatches()) {
        queryClient.setQueryData(
          checkoutQueryKey(userId, 'order', order.id),
          order,
        )
      }
    },
    onError: async (error, sent) => {
      refreshCheckoutSession(error, queryClient)
      const response = axios.isAxiosError<CheckoutErrorResponse>(error)
        ? error.response
        : undefined
      const data = response?.data
      const status = response?.status

      if (data?.code === 'ORDER_IN_PROGRESS' && data.orderId) {
        acknowledgeOrder(sent, data.orderId)
        return
      }

      // A missing response or server error may happen after order creation.
      if (
        !status ||
        status < 400 ||
        status >= 500 ||
        status === 401 ||
        status === 408 ||
        status === 429 ||
        data?.code === 'CHECKOUT_SESSION_CHANGED'
      )
        return

      removeCheckoutAttempt(userId, sent.key)
      if (!currentUserMatches()) return
      await queryClient.cancelQueries({ queryKey: quoteQueryKey, exact: true })
      if (!currentUserMatches()) return

      if (data?.quote) {
        queryClient.setQueryData(quoteQueryKey, data.quote)
      } else {
        void queryClient.invalidateQueries({
          queryKey: quoteQueryKey,
          exact: true,
        })
      }
      if (
        data?.code === 'QUOTE_CHANGED' ||
        data?.code === 'CART_EMPTY' ||
        data?.code === 'CART_STOCK_CONFLICT'
      ) {
        void queryClient.invalidateQueries({
          queryKey: cartQueryKey(cartScopeForUser(userId)),
          exact: true,
        })
      }
      if (data?.code === 'QUOTE_CHANGED') {
        void queryClient.invalidateQueries({ queryKey: ['nfts'] })
        void queryClient.invalidateQueries({
          queryKey: favoritesQueryKey(userId),
          exact: true,
        })
      }
      if (data?.code === 'WALLET_CHANGED') {
        void queryClient.invalidateQueries({
          queryKey: walletsQueryKey(userId),
          exact: true,
        })
      }

      setFailure({ ...data, message: failureMessage(data) })
      setAttempt(null)
    },
    onSettled: () => {
      sending.current = false
    },
  })

  function sendSaved(saved: CheckoutAttempt) {
    if (sending.current || saved.orderId || !currentUserMatches()) return
    sending.current = true
    send.mutate(saved)
  }

  function placeOrder(input: OrderInput) {
    if (sending.current || !currentUserMatches()) return
    const saved = readCheckoutAttempt(userId)
    const next = saved ?? { key: crypto.randomUUID(), input }

    try {
      if (!saved) saveCheckoutAttempt(userId, next)
    } catch {
      setFailure({
        message:
          'Não foi possível guardar a tentativa de compra. Tente novamente.',
      })
      return
    }

    setFailure(null)
    setAttempt(next)
    sendSaved(next)
  }

  if (orderId) {
    return <CheckoutReceipt key={orderId} userId={userId} orderId={orderId} />
  }

  return (
    <>
      <div hidden={Boolean(attempt)}>
        <CheckoutForm
          userId={userId}
          failure={failure}
          onConfirm={placeOrder}
          onClearFailure={() => setFailure(null)}
        />
      </div>
      {attempt && (
        <section
          aria-labelledby="checkout-attempt-title"
          className="grid max-w-2xl justify-items-start gap-3 rounded-md border p-5"
        >
          <h2 id="checkout-attempt-title" className="text-xl font-semibold">
            Envio do pedido
          </h2>
          {send.isPending ? (
            <p role="status">
              {send.isPaused ? 'Aguardando a conexão…' : 'Enviando pedido…'}
            </p>
          ) : (
            <>
              <p role="alert">
                Ainda não recebemos a confirmação de envio. Tente novamente para
                recuperar o mesmo pedido.
              </p>
              <Button type="button" onClick={() => sendSaved(attempt)}>
                Tentar enviar novamente
              </Button>
            </>
          )}
        </section>
      )}
    </>
  )
}
