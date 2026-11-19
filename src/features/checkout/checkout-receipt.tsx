import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useSearch } from '@tanstack/react-router'
import axios from 'axios'
import { X } from 'lucide-react'
import thankYouIcon from '@/assets/icons/thank-you.svg'
import { useEffect } from 'react'
import { sessionQueryKey, type SessionState } from '@/features/auth/auth-api'
import { cartQueryKey, cartScopeForUser } from '@/features/cart/cart-api'
import { parseCatalogSearch } from '@/features/catalog/catalog-search'
import { favoritesQueryKey } from '@/features/favorites/favorites-api'
import { walletNetworks, walletProviders } from '@/features/wallets/wallets-api'
import { Button } from '@/components/ui/button'
import { useRealtime } from '@/features/realtime/realtime-context'
import { formatEth } from '@/lib/eth'
import { checkoutQueryKey, getOrder } from './checkout-api'
import { refreshCheckoutSession } from './checkout-session'
import {
  readCheckoutAttempt,
  removeCheckoutAttempt,
  removeCheckoutDraft,
} from './checkout-storage'

const receiptDate = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
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

  const transactionId = order.transactionId ?? ''
  const shortTransactionId =
    transactionId.length > 14
      ? `${transactionId.slice(0, 6)}…${transactionId.slice(-4)}`
      : transactionId
  const { quote, wallet } = order

  return (
    <section
      aria-labelledby="checkout-order-title"
      className="relative mx-auto w-full max-w-[578px] border-b-[10px] border-primary bg-surface-card font-mono"
    >
      <Link
        to="/carrinho"
        search={cartSearch}
        aria-label="Fechar comprovante"
        className="absolute top-2 right-2 grid size-10 place-items-center rounded-md text-text-accent hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-primary"
      >
        <X aria-hidden="true" className="size-5" strokeWidth={1.5} />
      </Link>

      <div className="grid justify-items-center gap-3 px-6 pt-[22px] pb-5 text-center">
        <img src={thankYouIcon} alt="" width={80} height={80} />
        <h2
          id="checkout-order-title"
          className="text-base/5 font-bold text-muted-foreground"
        >
          <span className="sr-only">Pedido confirmado. </span>
          Seus NFTs agora estão na sua carteira
        </h2>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-y border-primary px-4 py-4 text-[13px]/5 text-muted-foreground sm:grid-cols-[1.2fr_1fr_0.95fr_auto] sm:gap-x-0 sm:px-9 sm:text-[15px]/5">
        <div className="min-w-0 sm:border-r sm:border-primary sm:pr-3">
          <dt className="font-bold">ID da transação</dt>
          <dd title={transactionId}>
            <span aria-hidden="true">{shortTransactionId}</span>
            <span className="sr-only">{transactionId}</span>
          </dd>
        </div>
        <div className="min-w-0 sm:border-r sm:border-primary sm:px-4">
          <dt>Data</dt>
          <dd>
            <time dateTime={order.createdAt}>
              {receiptDate.format(new Date(order.createdAt))}
            </time>
          </dd>
        </div>
        <div className="min-w-0 sm:border-r sm:border-primary sm:px-4">
          <dt>Total</dt>
          <dd className="wrap-anywhere">{formatEth(quote.totalEth)}</dd>
        </div>
        <div className="min-w-0 sm:pl-4">
          <dt className="font-bold">Carteira</dt>
          <dd className="wrap-anywhere">{walletProviders[wallet.provider]}</dd>
        </div>
      </dl>

      <div className="grid gap-4 px-4 pt-5 pb-8 sm:px-11 sm:pb-12">
        <section aria-labelledby="receipt-details-title" className="grid gap-2">
          <h3 id="receipt-details-title" className="text-[15px] font-bold">
            Detalhes da transação
          </h3>
          <table
            aria-labelledby="receipt-details-title"
            className="w-full table-fixed border-collapse text-left text-xs sm:text-[15px]"
          >
            <colgroup>
              <col className="w-[55%] sm:w-[58%]" />
              <col className="w-[17%]" />
              <col />
            </colgroup>
            <thead className="border-b border-primary/50 font-bold">
              <tr>
                <th scope="col" className="pb-2">
                  NFTs
                </th>
                <th scope="col" className="pb-2 text-center">
                  Edições
                </th>
                <th scope="col" className="pb-2 text-right">
                  Subtotal
                </th>
              </tr>
            </thead>
            <tbody>
              {quote.items.map((item) => (
                <tr key={item.id}>
                  <th
                    scope="row"
                    className="pt-3 pr-1 text-left align-middle font-normal"
                  >
                    <span className="flex min-w-0 items-center gap-2 sm:gap-3">
                      {item.imageUrl && (
                        <img
                          src={item.imageUrl}
                          alt=""
                          width={70}
                          height={70}
                          className="size-10 shrink-0 rounded-lg object-cover sm:size-[70px]"
                        />
                      )}
                      <span className="grid min-w-0 gap-0.5">
                        <span className="wrap-anywhere font-bold sm:text-base">
                          {item.nftName}
                        </span>
                        <span className="wrap-anywhere text-[11px] text-metadata-foreground sm:text-sm">
                          ID do token: #{item.nftId}
                        </span>
                      </span>
                    </span>
                  </th>
                  <td className="pt-3 text-center text-muted-foreground">
                    (x {item.quantity})
                  </td>
                  <td className="wrap-anywhere pt-3 pl-1 text-right font-bold text-text-accent sm:text-lg">
                    {formatEth(item.lineTotalEth)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <dl className="grid gap-1.5 text-sm sm:ml-auto sm:w-2/3 sm:text-base">
          {quote.discountEth !== '0' && (
            <div className="flex justify-between gap-3">
              <dt>
                Desconto{quote.couponCode ? ` (${quote.couponCode})` : ''}
              </dt>
              <dd className="text-right">−{formatEth(quote.discountEth)}</dd>
            </div>
          )}
          <div className="flex justify-between gap-3">
            <dt>Taxa de rede</dt>
            <dd className="text-right">{formatEth(quote.networkFeeEth)}</dd>
          </div>
          <div className="flex justify-between gap-3 font-bold">
            <dt>Total</dt>
            <dd className="text-right text-base text-text-accent sm:text-lg">
              {formatEth(quote.totalEth)}
            </dd>
          </div>
        </dl>

        <div className="grid justify-items-center gap-5 border-t border-primary/50 pt-3.5 text-center">
          <p role="status" className="text-sm/6 text-muted-foreground">
            Pagamento confirmado na simulação. O pedido foi concluído com a
            carteira selecionada na rede {walletNetworks[wallet.network]}.
          </p>
          <Button
            asChild
            className="h-12 rounded-[5px] px-4 text-base font-bold"
          >
            <Link to="/carrinho" search={cartSearch}>
              Voltar ao carrinho
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
