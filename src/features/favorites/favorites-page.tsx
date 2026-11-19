import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { sessionQueryOptions } from '@/features/auth/auth-api'
import { Button } from '@/components/ui/button'
import FavoriteButton from './favorite-button'
import { useFavorites } from './use-favorites'

export default function FavoritesPage() {
  const session = useQuery(sessionQueryOptions)
  const userId = session.data?.session?.user.id

  return (
    <main className="mx-auto grid max-w-5xl gap-4 p-6">
      <Link to="/" className="w-fit underline">
        Voltar ao catálogo
      </Link>
      <h1 className="text-2xl font-semibold">Lista de interesse</h1>
      {userId !== undefined ? (
        <AccountFavorites key={userId} userId={userId} />
      ) : session.data !== undefined ? (
        <Button className="w-fit" asChild>
          <Link to="/favoritos" search={{ auth: 'entrar' }}>
            Entrar para ver favoritos
          </Link>
        </Button>
      ) : null}
    </main>
  )
}

function AccountFavorites({ userId }: { userId: string }) {
  const favorites = useFavorites(userId)

  return (
    <>
      {favorites.isPending && <p role="status">Carregando favoritos…</p>}
      {favorites.isError && (
        <div>
          <p role="alert">Não foi possível carregar os favoritos.</p>
          <Button
            type="button"
            disabled={favorites.isFetching}
            onClick={() => void favorites.refetch()}
          >
            Tentar novamente
          </Button>
        </div>
      )}
      {favorites.data?.items.length === 0 && (
        <p>Você ainda não tem favoritos.</p>
      )}
      {favorites.data && favorites.data.items.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {favorites.data.items.map((nft) => (
            <li key={nft.id} className="grid gap-2 rounded-md border p-4">
              <h2>
                <Link
                  to="/nfts/$nftId"
                  params={{ nftId: nft.id }}
                  className="underline"
                >
                  {nft.name}
                </Link>
              </h2>
              <p>{nft.priceEth.replace('.', ',')} ETH</p>
              <FavoriteButton nft={nft} />
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
