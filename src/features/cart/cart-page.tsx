import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useSearch } from '@tanstack/react-router'
import axios from 'axios'
import { ChevronLeft } from 'lucide-react'
import deleteIcon from '@/assets/icons/delete.svg'
import { listNfts } from '@/features/catalog/catalog-api'
import type { CatalogSearch } from '@/features/catalog/catalog-search'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useRealtime } from '@/features/realtime/realtime-context'
import {
  applyCartCoupon,
  getCart,
  cartQueryKey,
  type CartScope,
  removeCartCoupon,
  removeCartItem,
  updateCartItemQuantity,
} from './cart-api'
import { updateCartCache, useCartScope } from './cart-session'

const desktopColumns =
  'lg:grid-cols-[70px_minmax(0,1.45fr)_minmax(0,0.82fr)_minmax(0,0.84fr)_minmax(0,0.9fr)_36px]'
const quantityButtonClass =
  'size-8 rounded-full text-base enabled:cursor-pointer max-lg:dark:bg-background/40 lg:h-8 lg:w-6 lg:border-primary lg:bg-primary lg:text-primary-foreground lg:dark:border-primary lg:dark:bg-primary lg:dark:hover:bg-primary/80'

type CartChange =
  | { kind: 'quantity'; itemId: string; quantity: number }
  | { kind: 'remove'; itemId: string }
  | { kind: 'apply-coupon'; code: string }
  | { kind: 'remove-coupon' }

export default function CartPage() {
  const scope = useCartScope()

  if (scope === undefined) {
    return (
      <main className="page-shell grid gap-6 py-6">
        <h1 className="text-xl font-bold">Carrinho de NFTs</h1>
        <p role="status">Aguardando a verificação da sessão…</p>
      </main>
    )
  }

  return <ScopedCart key={scope} scope={scope} />
}

function ScopedCart({ scope }: { scope: CartScope }) {
  const search = useSearch({ from: '/carrinho' })
  const [couponDraft, setCouponDraft] = useState('')
  const { lastNftUpdate } = useRealtime()
  const [initialEventId] = useState(lastNftUpdate?.eventId)

  const queryKey = cartQueryKey(scope)
  const cart = useQuery({
    queryKey,
    queryFn: ({ signal }) => getCart(scope, signal),
    retry: false,
  })

  const updatedItem =
    lastNftUpdate && lastNftUpdate.eventId !== initialEventId && !cart.isError
      ? cart.data?.items.find((item) => item.nftId === lastNftUpdate.nftId)
      : undefined

  const queryClient = useQueryClient()

  const editCart = useMutation({
    mutationKey: queryKey,
    scope: { id: scope },
    retry: false,
    mutationFn: (change: CartChange) => {
      switch (change.kind) {
        case 'quantity':
          return updateCartItemQuantity(scope, change.itemId, change.quantity)
        case 'remove':
          return removeCartItem(scope, change.itemId)
        case 'apply-coupon':
          return applyCartCoupon(scope, change.code)
        case 'remove-coupon':
          return removeCartCoupon(scope)
      }
    },
    onSuccess: (updatedCart) =>
      updateCartCache(queryClient, scope, updatedCart),
    onError: async () => {
      await queryClient.invalidateQueries({ queryKey })
    },
  })

  const removingItemId =
    editCart.isPending && editCart.variables?.kind === 'remove'
      ? editCart.variables.itemId
      : undefined

  const visibleItems = (cart.data?.items ?? []).filter(
    (item) => item.id !== removingItemId,
  )

  const changeKind = editCart.variables?.kind
  const isCouponChange =
    changeKind === 'apply-coupon' || changeKind === 'remove-coupon'
  const errorData = axios.isAxiosError<{
    code?: string
    message?: unknown
  }>(editCart.error)
    ? editCart.error.response?.data
    : undefined
  const apiMessage = errorData?.message
  const couponError =
    editCart.isError && isCouponChange
      ? typeof apiMessage === 'string'
        ? apiMessage
        : 'Não foi possível atualizar o cupom.'
      : undefined
  const invalidCoupon =
    changeKind === 'apply-coupon' &&
    (errorData?.code === 'COUPON_INVALID' ||
      errorData?.code === 'COUPON_EXPIRED')

  return (
    <main className="page-shell grid gap-6 py-6">
      <nav
        aria-label="Caminho de navegação"
        className="hidden items-center gap-2 text-sm font-semibold lg:flex"
      >
        <Link to="/" search={search} className="hover:underline">
          Início
        </Link>
        <span aria-hidden="true">/</span>
        <Link
          to="/"
          hash="catalogo"
          search={search}
          className="hover:underline"
        >
          Mercado
        </Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Carrinho</span>
      </nav>
      <div className="grid grid-cols-[40px_1fr_40px] items-center gap-2 lg:hidden">
        <Button
          asChild
          variant="outline"
          size="icon"
          className="size-10 rounded-full"
        >
          <Link
            to="/"
            hash="catalogo"
            search={search}
            aria-label="Voltar ao catálogo"
          >
            <ChevronLeft aria-hidden="true" />
          </Link>
        </Button>
        <h1 className="text-center text-xl font-bold">Carrinho de NFTs</h1>
      </div>

      <h1 className="hidden lg:block lg:sr-only">Carrinho de NFTs</h1>

      {editCart.isPending && <p role="status">Atualizando carrinho…</p>}

      <div role="status" className={updatedItem ? 'text-sm' : 'sr-only'}>
        {updatedItem &&
          (cart.isFetching
            ? `Preço ou disponibilidade de ${updatedItem.nftName} mudou. Atualizando o carrinho…`
            : `O carrinho foi atualizado. Confira o preço e a disponibilidade de ${updatedItem.nftName}.`)}
      </div>

      {editCart.isError && !isCouponChange && (
        <p role="alert">
          {typeof apiMessage === 'string'
            ? apiMessage
            : 'Não foi possível atualizar o carrinho.'}
        </p>
      )}

      {cart.isPending && <p role="status">Carregando carrinho…</p>}

      {cart.isError && (
        <div>
          <p role="alert">Não foi possível carregar o carrinho.</p>
          <Button
            type="button"
            disabled={cart.isFetching}
            onClick={() => void cart.refetch()}
          >
            Tentar novamente
          </Button>
        </div>
      )}

      {cart.data?.items.length === 0 && <p>Seu carrinho está vazio.</p>}
      {cart.data?.hasStockConflict && (
        <p role="alert">
          O estoque de um ou mais NFTs mudou. Ajuste as quantidades ou remova os
          itens indisponíveis para atualizar o carrinho.
        </p>
      )}

      {cart.data && cart.data.items.length > 0 && (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,2.35fr)_minmax(0,1fr)] lg:gap-[clamp(24px,6vw,86px)]">
          <section aria-labelledby="cart-items" className="min-w-0">
            <div
              className={`hidden items-center gap-3 border-b pb-3 text-base font-bold lg:grid lg:pr-3 ${desktopColumns}`}
            >
              <h2 id="cart-items" className="col-span-2">
                NFTs
              </h2>
              <span>Preço</span>
              <span>Edições</span>
              <span>Total</span>
            </div>

            <ul className="grid gap-4 lg:mt-3 lg:gap-3">
              {visibleItems.map((item) => (
                <li
                  key={item.id}
                  className={`grid min-h-[100px] min-w-0 grid-cols-[clamp(64px,24vw,100px)_minmax(0,1fr)_auto] items-center gap-x-2 overflow-hidden rounded-[14px] bg-surface-card pr-2 shadow-[0_6px_20px_#0a060473] lg:min-h-[70px] lg:gap-x-3 lg:rounded-none lg:pr-3 lg:shadow-none ${desktopColumns}`}
                >
                  <div className="row-span-3 h-full min-h-[100px] bg-background/25 lg:row-span-1 lg:h-[70px] lg:min-h-0">
                    {item.imageUrl && (
                      <img
                        src={item.imageUrl}
                        alt=""
                        width={100}
                        height={100}
                        className="size-full rounded-l-[14px] object-cover lg:rounded-md"
                      />
                    )}
                  </div>
                  <div className="col-span-2 min-w-0 self-center pt-2 leading-tight lg:col-span-1 lg:py-2">
                    <h3 className="font-bold break-words">{item.nftName}</h3>
                    <p className="mt-1 hidden text-sm text-metadata-foreground lg:block">
                      ID do token: #{item.nftId}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground lg:hidden">
                      Edição: {item.editionLabel}
                    </p>
                  </div>
                  <p className="hidden font-semibold text-muted-foreground lg:block">
                    {item.unitPriceEth.replace('.', ',')} ETH
                  </p>
                  <div className="col-start-2 row-start-2 flex items-center gap-1 justify-self-end lg:col-start-auto lg:row-start-auto lg:gap-2 lg:justify-self-start">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      className={quantityButtonClass}
                      aria-label={`Diminuir quantidade de ${item.nftName}, edição ${item.editionLabel}`}
                      disabled={
                        editCart.isPending ||
                        item.quantity <= 1 ||
                        item.availableQuantity === 0
                      }
                      onClick={() =>
                        editCart.mutate({
                          kind: 'quantity',
                          itemId: item.id,
                          quantity: Math.min(
                            item.quantity - 1,
                            item.availableQuantity,
                          ),
                        })
                      }
                    >
                      −
                    </Button>

                    <output
                      aria-label={`Quantidade de ${item.nftName}, edição ${item.editionLabel}`}
                    >
                      {item.quantity}
                    </output>

                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      className={quantityButtonClass}
                      aria-label={`Aumentar quantidade de ${item.nftName}, edição ${item.editionLabel}`}
                      disabled={
                        editCart.isPending ||
                        item.quantity >= item.availableQuantity
                      }
                      onClick={() =>
                        editCart.mutate({
                          kind: 'quantity',
                          itemId: item.id,
                          quantity: item.quantity + 1,
                        })
                      }
                    >
                      +
                    </Button>
                  </div>
                  <p className="col-span-2 col-start-2 row-start-3 pb-2 text-lg/4 font-bold text-text-accent lg:col-span-1 lg:col-start-auto lg:row-start-auto lg:pb-0 lg:text-base">
                    {item.lineTotalEth.replace('.', ',')} ETH
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="col-start-3 row-start-2 size-9 cursor-pointer rounded-full lg:col-start-auto lg:row-start-auto"
                    aria-label={`Remover ${item.nftName}, edição ${item.editionLabel}`}
                    disabled={editCart.isPending}
                    onClick={() =>
                      editCart.mutate({ kind: 'remove', itemId: item.id })
                    }
                  >
                    <img src={deleteIcon} alt="" className="size-6" />
                  </Button>
                </li>
              ))}
            </ul>
          </section>

          <aside
            aria-labelledby="cart-summary"
            className="min-w-0 rounded-[32px] bg-surface-card px-6 py-5 max-lg:-mx-6 lg:rounded-none lg:bg-transparent lg:p-0"
          >
            <h2
              id="cart-summary"
              className="sr-only lg:not-sr-only lg:border-b lg:pb-3 lg:text-lg lg:font-bold"
            >
              Resumo da carteira
            </h2>

            <form
              className="mt-4 grid gap-2"
              onSubmit={(event) => {
                event.preventDefault()
                const code = couponDraft.trim()

                if (code && !editCart.isPending) {
                  editCart.mutate(
                    { kind: 'apply-coupon', code },
                    { onSuccess: () => setCouponDraft('') },
                  )
                }
              }}
            >
              <label
                htmlFor="cart-coupon-code"
                className="sr-only lg:not-sr-only lg:font-bold"
              >
                Código promocional
              </label>
              <div className="flex min-w-0 items-stretch rounded-full border border-primary/55 focus-within:ring-2 focus-within:ring-ring lg:rounded-sm">
                <input
                  id="cart-coupon-code"
                  name="coupon"
                  placeholder="Digite o código promocional…"
                  type="text"
                  required
                  autoCapitalize="characters"
                  autoComplete="off"
                  spellCheck={false}
                  readOnly={editCart.isPending}
                  value={couponDraft}
                  onChange={(event) => {
                    setCouponDraft(event.currentTarget.value)
                    if (couponError) editCart.reset()
                  }}
                  aria-describedby={
                    couponError ? 'cart-coupon-error' : undefined
                  }
                  aria-invalid={invalidCoupon || undefined}
                  className="min-w-0 flex-1 rounded-full bg-transparent px-3 text-base placeholder:text-metadata-foreground focus-visible:outline-none lg:rounded-none lg:text-sm"
                />
                <Button
                  type="submit"
                  className="h-[50px] px-4 font-bold max-lg:rounded-full lg:h-10 lg:rounded-l-none lg:rounded-r-sm"
                  disabled={editCart.isPending || !couponDraft.trim()}
                >
                  Aplicar
                </Button>
              </div>

              <div
                role="status"
                className={
                  cart.data.couponCode === null ? 'sr-only' : undefined
                }
              >
                {cart.data.couponCode !== null && (
                  <p>Cupom aplicado: {cart.data.couponCode}</p>
                )}
              </div>
              {cart.data.couponCode !== null && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-fit"
                  disabled={editCart.isPending}
                  onClick={() => editCart.mutate({ kind: 'remove-coupon' })}
                >
                  Remover cupom
                </Button>
              )}
              {couponError && (
                <p
                  id="cart-coupon-error"
                  role="alert"
                  className="text-destructive"
                >
                  {couponError}
                </p>
              )}
            </form>

            {removingItemId !== undefined ? (
              <p className="mt-3">Atualizando resumo…</p>
            ) : (
              <dl className="mt-4 grid gap-3 text-sm lg:mt-6 lg:gap-4 lg:text-base">
                <div className="flex flex-wrap justify-between gap-x-3">
                  <dt>Subtotal</dt>
                  <dd>{cart.data.subtotalEth.replace('.', ',')} ETH</dd>
                </div>
                <div className="flex flex-wrap justify-between gap-x-3">
                  <dt>Desconto do lançamento</dt>
                  <dd>
                    {cart.data.discountEth !== '0' && '−'}
                    {cart.data.discountEth.replace('.', ',')} ETH
                  </dd>
                </div>
                <div className="flex flex-wrap justify-between gap-x-3">
                  <dt>Taxa de rede</dt>
                  <dd className="ml-auto text-right">
                    <span>{cart.data.networkFeeEth.replace('.', ',')} ETH</span>
                    <span className="block text-xs text-text-accent">
                      Taxa estimada
                    </span>
                  </dd>
                </div>
                <div className="flex flex-wrap justify-between gap-x-3 pt-1 text-lg font-bold">
                  <dt>Total</dt>
                  <dd className="text-text-accent">
                    {cart.data.totalEth.replace('.', ',')} ETH
                  </dd>
                </div>
              </dl>
            )}
            <Button
              asChild
              className="mt-6 h-[60px] w-full rounded-full bg-linear-to-r from-primary to-primary/80 text-base font-bold lg:h-10 lg:rounded-sm"
            >
              <Link
                to="/pagamento"
                search={search}
                disabled={
                  editCart.isPending ||
                  cart.isFetching ||
                  cart.isError ||
                  cart.data.hasStockConflict
                }
              >
                Conectar e finalizar
              </Link>
            </Button>
            <Link
              to="/"
              hash="catalogo"
              search={search}
              className="mt-4 hidden text-center text-text-accent hover:underline lg:block"
            >
              Continuar explorando
            </Link>
          </aside>
        </div>
      )}

      {cart.data?.items.length ? (
        <CartRecommendations search={search} />
      ) : (
        <Link
          to="/"
          hash="catalogo"
          search={search}
          className="w-fit text-text-accent hover:underline"
        >
          Continuar explorando
        </Link>
      )}
    </main>
  )
}

function CartRecommendations({ search }: { search: CatalogSearch }) {
  const recommendations = useQuery({
    queryKey: ['nfts', 'cart-recommendations'],
    queryFn: async ({ signal }) => {
      const first = await listNfts({}, signal)
      if (first.items.length >= 5 || first.total <= first.pageSize)
        return first.items.slice(0, 5)
      const second = await listNfts({ page: 2 }, signal)
      return [...first.items, ...second.items].slice(0, 5)
    },
    retry: false,
  })

  if (!recommendations.data?.length) return null
  return (
    <section aria-labelledby="cart-recommendations" className="mt-8 lg:mt-20">
      <h2
        id="cart-recommendations"
        className="border-b pb-2 text-lg font-bold text-text-accent"
      >
        Colecionadores também viram
      </h2>
      <ul className="mt-6 flex gap-4 overflow-x-auto px-1 py-2 lg:gap-6">
        {recommendations.data.map((nft) => (
          <li
            key={nft.id}
            className="w-[44%] shrink-0 lg:w-[calc((100%-6rem)/5)]"
          >
            <Link
              to="/nfts/$nftId"
              params={{ nftId: nft.id }}
              search={search}
              className="group block focus-visible:outline-2 focus-visible:outline-ring"
            >
              <div className="grid aspect-[258/300] items-center bg-surface-card px-1">
                <img
                  src={nft.imageUrl}
                  alt=""
                  width={250}
                  height={250}
                  loading="lazy"
                  className="aspect-square w-full rounded-xl object-cover"
                />
              </div>
              <p className="mt-2 text-sm group-hover:underline">{nft.name}</p>
            </Link>
            <p className="font-bold text-text-accent">{nft.priceEth} ETH</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
