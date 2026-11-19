import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useSearch } from '@tanstack/react-router'
import axios from 'axios'
import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
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

type CartChange =
  | { kind: 'quantity'; itemId: string; quantity: number }
  | { kind: 'remove'; itemId: string }
  | { kind: 'apply-coupon'; code: string }
  | { kind: 'remove-coupon' }

export default function CartPage() {
  const scope = useCartScope()

  if (scope === undefined) {
    return (
      <main className="mx-auto grid max-w-5xl gap-6 p-6">
        <h1 className="text-2xl font-semibold">Carrinho</h1>
        <p role="status">Aguardando a verificação da sessão…</p>
      </main>
    )
  }

  return <ScopedCart key={scope} scope={scope} />
}

function ScopedCart({ scope }: { scope: CartScope }) {
  const search = useSearch({ from: '/carrinho' })
  const [couponDraft, setCouponDraft] = useState('')

  const queryKey = cartQueryKey(scope)
  const cart = useQuery({
    queryKey,
    queryFn: ({ signal }) => getCart(scope, signal),
    retry: false,
  })

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
    <main className="mx-auto grid max-w-5xl gap-6 p-6">
      <h1 className="text-2xl font-semibold">Carrinho</h1>

      {editCart.isPending && <p role="status">Atualizando carrinho…</p>}

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
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <section aria-labelledby="cart-items">
            <h2 id="cart-items">NFTs</h2>

            <ul className="mt-3 grid gap-3">
              {visibleItems.map((item) => (
                <li key={item.id} className="rounded-md border p-4">
                  <h3>{item.nftName}</h3>
                  <p>ID do token: #{item.nftId}</p>
                  <p>Edição: {item.editionLabel}</p>

                  <dl className="mt-3 grid gap-3 sm:grid-cols-3">
                    <div>
                      <dt>Preço</dt>
                      <dd>{item.unitPriceEth.replace('.', ',')} ETH</dd>
                    </div>
                    <div>
                      <dt>Edições</dt>
                      <dd className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
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
                      </dd>
                    </div>
                    <div>
                      <dt>Total</dt>
                      <dd>{item.lineTotalEth.replace('.', ',')} ETH</dd>
                    </div>
                  </dl>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Remover ${item.nftName}, edição ${item.editionLabel}`}
                    disabled={editCart.isPending}
                    onClick={() =>
                      editCart.mutate({ kind: 'remove', itemId: item.id })
                    }
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </li>
              ))}
            </ul>
          </section>

          <aside
            aria-labelledby="cart-summary"
            className="rounded-md border p-4"
          >
            <h2 id="cart-summary">Resumo da carteira</h2>

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
              <label htmlFor="cart-coupon-code">Código promocional</label>
              <div className="flex flex-wrap gap-2">
                <input
                  id="cart-coupon-code"
                  name="coupon"
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
                  className="h-8 min-w-0 flex-1 rounded-md border bg-background px-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                />
                <Button
                  type="submit"
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
              <dl className="mt-4 grid gap-2 border-t pt-4">
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
                  <dd>{cart.data.networkFeeEth.replace('.', ',')} ETH</dd>
                </div>
                <div className="flex flex-wrap justify-between gap-x-3 border-t pt-2 font-semibold">
                  <dt>Total</dt>
                  <dd>{cart.data.totalEth.replace('.', ',')} ETH</dd>
                </div>
              </dl>
            )}
            <Button asChild className="mt-4 w-full">
              <Link
                to="/pagamento"
                search={search}
                disabled={editCart.isPending || cart.data.hasStockConflict}
              >
                Conectar e finalizar
              </Link>
            </Button>
          </aside>
        </div>
      )}

      <Link to="/" search={search} className="w-fit underline">
        Continuar explorando
      </Link>
    </main>
  )
}
