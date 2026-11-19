import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useSearch } from '@tanstack/react-router'
import axios from 'axios'
import { useEffect } from 'react'
import { sessionQueryKey, type SessionState } from '@/features/auth/auth-api'
import { cartQueryKey, cartScopeForUser } from '@/features/cart/cart-api'
import { parseCatalogSearch } from '@/features/catalog/catalog-search'
import { favoritesQueryKey } from '@/features/favorites/favorites-api'
import { walletNetworks, walletProviders } from '@/features/wallets/wallets-api'
import { Button } from '@/components/ui/button'
import { useRealtime } from '@/features/realtime/realtime-context'
import { checkoutQueryKey, getOrder } from './checkout-api'
import CheckoutSummary from './checkout-summary'
import { refreshCheckoutSession } from './checkout-session'
import {
  readCheckoutAttempt,
  removeCheckoutAttempt,
  removeCheckoutDraft,
} from './checkout-storage'

const receiptDate = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'medium',
  timeZone: 'America/Sao_Paulo',
})

export default function CheckoutReceipt({
  userId,
  orderId,
}: {
  userId: string
  orderId: string
}) {
  const search = useSearch({ from: '/pagamento' })
  const cartSearch = parseCatalogSearch(search)
  const queryClient = useQueryClient()
  const { status } = useRealtime()
  const query = useQuery({
    queryKey: checkoutQueryKey(userId, 'order', orderId),
    queryFn: ({ signal }) => getOrder(userId, orderId, signal),
    retry: false,
    refetchInterval: ({ state }) =>
      state.data?.status === 'pending' && state.status !== 'error'
        ? status === 'online'
          ? false
          : 4_000
        : false,
  })
  const order = query.data

  useEffect(() => {
    refreshCheckoutSession(query.error, queryClient)
  }, [query.error, queryClient])

  useEffect(() => {
    if (order?.status !== 'confirmed' && order?.status !== 'refused') return
    const attempt = readCheckoutAttempt(userId)

    if (attempt?.orderId === order.id) {
      removeCheckoutAttempt(userId, attempt.key)
      if (order.status === 'confirmed') removeCheckoutDraft(userId)
    }

    if (
      order.status === 'confirmed' &&
      queryClient.getQueryData<SessionState>(sessionQueryKey)?.session?.user
        .id === userId
    ) {
      void queryClient.invalidateQueries({
        queryKey: cartQueryKey(cartScopeForUser(userId)),
        exact: true,
      })
      void queryClient.invalidateQueries({
        queryKey: checkoutQueryKey(userId, 'quote'),
        exact: true,
      })
      void queryClient.invalidateQueries({ queryKey: ['nfts'] })
      void queryClient.invalidateQueries({
        queryKey: favoritesQueryKey(userId),
        exact: true,
      })
    }
  }, [order?.id, order?.status, queryClient, userId])

  if (query.isPending && !order) return <p role="status">Consultando pedido…</p>

  if (!order || query.isError) {
    const notFound =
      axios.isAxiosError(query.error) && query.error.response?.status === 404

    return (
      <section className="grid justify-items-start gap-3">
        <p role="alert">
          {notFound
            ? 'Pedido não encontrado.'
            : 'Não foi possível consultar o pedido.'}
        </p>
        {!notFound && (
          <Button
            type="button"
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
          >
            Tentar consultar novamente
          </Button>
        )}
        <Link to="/carrinho" search={cartSearch} className="underline">
          Voltar ao carrinho
        </Link>
      </section>
    )
  }

  if (order.status === 'pending') {
    return (
      <section
        aria-labelledby="checkout-order-title"
        className="grid max-w-2xl gap-3 rounded-md border p-5"
      >
        <h2 id="checkout-order-title" className="text-xl font-semibold">
          Pedido pendente
        </h2>
        <p role="status">Aguardando a confirmação do pagamento simulado.</p>
        <p className="text-sm text-muted-foreground wrap-anywhere">
          Pedido {order.id}
        </p>
      </section>
    )
  }

  if (order.status === 'refused') {
    return (
      <section
        aria-labelledby="checkout-order-title"
        className="grid max-w-2xl gap-3 rounded-md border p-5"
      >
        <h2 id="checkout-order-title" className="text-xl font-semibold">
          Pagamento recusado
        </h2>
        <p role="alert">
          O pagamento foi recusado. Os itens continuam no carrinho.
        </p>
        <p className="text-sm text-muted-foreground wrap-anywhere">
          Pedido {order.id}
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link to="/pagamento" search={cartSearch}>
              Tentar nova compra
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/carrinho" search={cartSearch}>
              Voltar ao carrinho
            </Link>
          </Button>
        </div>
      </section>
    )
  }

  return (
    <section
      aria-labelledby="checkout-order-title"
      className="mx-auto grid w-full max-w-2xl gap-5 rounded-md border p-5 sm:p-7"
    >
      <div className="grid gap-1">
        <h2 id="checkout-order-title" className="text-xl font-semibold">
          Pedido confirmado
        </h2>
        <p role="status">O pagamento foi confirmado na simulação.</p>
      </div>
      <dl className="grid gap-3 border-y py-4 sm:grid-cols-2">
        <div className="min-w-0">
          <dt className="text-sm text-muted-foreground">ID do pedido</dt>
          <dd className="wrap-anywhere">{order.id}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-sm text-muted-foreground">ID da transação</dt>
          <dd className="wrap-anywhere">{order.transactionId}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">Data</dt>
          <dd>
            <time dateTime={order.createdAt}>
              {receiptDate.format(new Date(order.createdAt))}
            </time>
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-sm text-muted-foreground">Carteira e rede</dt>
          <dd className="wrap-anywhere">
            {order.wallet.nickname} · {walletProviders[order.wallet.provider]} ·{' '}
            {walletNetworks[order.wallet.network]}
          </dd>
        </div>
      </dl>
      <CheckoutSummary cart={order.quote} label="Detalhes da transação" />
      <Link to="/carrinho" search={cartSearch} className="w-fit underline">
        Voltar ao carrinho
      </Link>
    </section>
  )
}
