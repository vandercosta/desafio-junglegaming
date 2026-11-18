import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { Trash2 } from 'lucide-react'
import {
  getCart,
  guestCartQueryKey,
  removeCartItem,
  updateCartItemQuantity,
} from './cart-api'
import { Link, useSearch } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'

type CartChange =
  | { kind: 'quantity'; itemId: string; quantity: number }
  | { kind: 'remove'; itemId: string }

export default function CartPage() {
  const search = useSearch({ from: '/carrinho' })

  const cart = useQuery({
    queryKey: guestCartQueryKey,
    queryFn: ({ signal }) => getCart(signal),
    retry: false,
  })

  const queryClient = useQueryClient()

  const editCart = useMutation({
    scope: { id: 'guest-cart' },
    retry: false,
    mutationFn: (change: CartChange) =>
      change.kind === 'quantity'
        ? updateCartItemQuantity(change.itemId, change.quantity)
        : removeCartItem(change.itemId),
    onSuccess: async (updatedCart) => {
      await queryClient.cancelQueries({ queryKey: guestCartQueryKey })
      queryClient.setQueryData(guestCartQueryKey, updatedCart)
    },
    onError: async () => {
      await queryClient.invalidateQueries({ queryKey: guestCartQueryKey })
    },
  })

  const removingItemId =
    editCart.isPending && editCart.variables?.kind === 'remove'
      ? editCart.variables.itemId
      : undefined

  const visibleItems = (cart.data?.items ?? []).filter(
    (item) => item.id !== removingItemId,
  )

  const apiMessage = axios.isAxiosError<{ message?: string }>(editCart.error)
    ? editCart.error.response?.data?.message
    : undefined

  return (
    <main className="mx-auto grid max-w-5xl gap-6 p-6">
      <h1 className="text-2xl font-semibold">Carrinho</h1>

      {editCart.isPending && <p role="status">Atualizando carrinho…</p>}

      {editCart.isError && (
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

            {removingItemId !== undefined ? (
              <p className="mt-3">Atualizando subtotal…</p>
            ) : (
              <dl className="mt-3">
                <dt>Subtotal</dt>
                <dd>{cart.data.subtotalEth.replace('.', ',')} ETH</dd>
              </dl>
            )}
          </aside>
        </div>
      )}

      <Link to="/" search={search} className="w-fit underline">
        Continuar explorando
      </Link>
    </main>
  )
}
