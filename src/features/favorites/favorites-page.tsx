import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { sessionQueryOptions } from '@/features/auth/auth-api'
import { Button } from '@/components/ui/button'
import { formatEth } from '@/lib/eth'
import FavoriteButton from './favorite-button'
import { useFavorites } from './use-favorites'

export default function FavoritesPage() {
  const session = useQuery(sessionQueryOptions)
  const userId = session.data?.session?.user.id

  return (
    <main className="page-shell grid gap-4 py-6">
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
            <li
              key={nft.id}
              className="grid content-start gap-2 rounded-md border p-4"
            >
              <Link
                to="/nfts/$nftId"
                params={{ nftId: nft.id }}
                className="group grid gap-3 rounded-md focus-visible:outline-2 focus-visible:outline-primary"
              >
                <img
                  src={nft.imageUrl}
                  alt=""
                  loading="lazy"
                  className="aspect-square w-full rounded-md bg-surface-card object-cover"
                />
                <h2 className="group-hover:underline">{nft.name}</h2>
              </Link>
              <p>{formatEth(nft.priceEth)}</p>
              <FavoriteButton nft={nft} />
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
