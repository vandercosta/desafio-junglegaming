import { useQuery } from '@tanstack/react-query'
import { Link, useSearch } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { getCart, guestCartQueryKey } from './cart-api'

export default function CartPage() {
  const search = useSearch({ from: '/carrinho' })

  const cart = useQuery({
    queryKey: guestCartQueryKey,
    queryFn: ({ signal }) => getCart(signal),
    retry: false,
  })

  return (
    <main className="mx-auto grid max-w-5xl gap-6 p-6">
      <h1 className="text-2xl font-semibold">Carrinho</h1>

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
              {cart.data.items.map((item) => (
                <li key={item.id} className="rounded-md border p-4">
                  <h3>{item.nftName}</h3>
                  <p>ID do token: #{item.nftId}</p>
                  <p>Edição: {item.editionLabel}</p>

                  <dl className="mt-3 grid grid-cols-3 gap-2">
                    <div>
                      <dt>Preço</dt>
                      <dd>{item.unitPriceEth.replace('.', ',')} ETH</dd>
                    </div>
                    <div>
                      <dt>Edições</dt>
                      <dd>{item.quantity}</dd>
                    </div>
                    <div>
                      <dt>Total</dt>
                      <dd>{item.lineTotalEth.replace('.', ',')} ETH</dd>
                    </div>
                  </dl>
                </li>
              ))}
            </ul>
          </section>

          <aside
            aria-labelledby="cart-summary"
            className="rounded-md border p-4"
          >
            <h2 id="cart-summary">Resumo da carteira</h2>
            <dl className="mt-3">
              <dt>Subtotal</dt>
              <dd>{cart.data.subtotalEth.replace('.', ',')} ETH</dd>
            </dl>
          </aside>
        </div>
      )}

      <Link to="/" search={search} className="w-fit underline">
        Continuar explorando
      </Link>
    </main>
  )
}
