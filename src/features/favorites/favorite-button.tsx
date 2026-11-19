import {
  useIsMutating,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import axios from 'axios'
import { Heart } from 'lucide-react'
import {
  sessionQueryKey,
  sessionQueryOptions,
  type SessionState,
} from '@/features/auth/auth-api'
import type { NftSummary } from '@/features/catalog/catalog-api'
import { Button } from '@/components/ui/button'
import { changeFavorite, favoritesQueryKey } from './favorites-api'
import { useFavorites } from './use-favorites'

type FavoriteNft = Pick<NftSummary, 'id' | 'name'>

export default function FavoriteButton({ nft }: { nft: FavoriteNft }) {
  const { data } = useQuery(sessionQueryOptions)
  const userId = data?.session?.user.id

  if (userId !== undefined) {
    return (
      <AccountFavoriteButton
        key={`${userId}:${nft.id}`}
        nft={nft}
        userId={userId}
      />
    )
  }

  if (data === undefined) {
    return (
      <Button type="button" variant="outline-primary" disabled>
        Favoritar
      </Button>
    )
  }

  return (
    <Button variant="outline-primary" asChild>
      <Link
        to="."
        search={(previous) => ({ ...previous, auth: 'entrar' })}
        hash={true}
        resetScroll={false}
        aria-label={`Entrar para favoritar ${nft.name}`}
      >
        <Heart aria-hidden="true" />
        Favoritar
      </Link>
    </Button>
  )
}

function AccountFavoriteButton({
  nft,
  userId,
}: {
  nft: FavoriteNft
  userId: string
}) {
  const favorites = useFavorites(userId)
  const queryClient = useQueryClient()
  const queryKey = favoritesQueryKey(userId)
  const mutationsPending =
    useIsMutating({ mutationKey: queryKey, exact: true }) > 0

  const mutation = useMutation({
    mutationKey: queryKey,
    scope: { id: `favorites:${userId}` },
    mutationFn: (saved: boolean) => changeFavorite(userId, nft.id, saved),
    retry: false,
    onSuccess: async (next) => {
      await queryClient.cancelQueries({ queryKey, exact: true })

      const session = queryClient.getQueryData<SessionState>(sessionQueryKey)
      if (session?.session?.user.id === userId)
        queryClient.setQueryData(queryKey, next)
    },
    onError: (error) => {
      if (
        axios.isAxiosError(error) &&
        [401, 409].includes(error.response?.status ?? 0)
      ) {
        void queryClient.invalidateQueries({ queryKey: sessionQueryKey })
      }
    },
  })

  const confirmed =
    favorites.data?.items.some((item) => item.id === nft.id) ?? false
  const saved = mutation.isPending ? mutation.variables : confirmed

  if (favorites.isError && favorites.data === undefined) {
    return (
      <Button
        type="button"
        variant="outline"
        disabled={favorites.isFetching}
        onClick={() => void favorites.refetch()}
      >
        Tentar carregar favoritos
      </Button>
    )
  }

  return (
    <div className="grid justify-items-start gap-1">
      <Button
        type="button"
        variant="outline-primary"
        aria-label={`Favoritar ${nft.name}`}
        aria-pressed={saved}
        disabled={favorites.isPending || mutation.isPending || mutationsPending}
        onClick={() => mutation.mutate(!confirmed)}
      >
        <Heart aria-hidden="true" fill={saved ? 'currentColor' : 'none'} />
        Favoritar
      </Button>
      {mutation.isError && (
        <p role="alert" className="text-sm text-destructive">
          Não foi possível atualizar o favorito. Tente novamente.
        </p>
      )}
    </div>
  )
}
