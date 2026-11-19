import type { NftSummary } from '@/features/catalog/catalog-api'
import { api } from '@/lib/api'

export type FavoritesResponse = { items: NftSummary[] }

export const favoritesQueriesKey = ['favorites'] as const

export function favoritesQueryKey(userId: string) {
  return [...favoritesQueriesKey, userId] as const
}

function validateFavorites(data: FavoritesResponse): FavoritesResponse {
  if (!Array.isArray(data?.items)) {
    throw new Error('A API retornou uma lista de favoritos inválida.')
  }

  return data
}

export async function getFavorites(userId: string, signal: AbortSignal) {
  const { data } = await api.get<FavoritesResponse>('/favorites', {
    headers: { 'X-Favorites-User': userId },
    signal,
  })

  return validateFavorites(data)
}

export async function changeFavorite(
  userId: string,
  nftId: string,
  saved: boolean,
) {
  const { data } = await api.request<FavoritesResponse>({
    method: saved ? 'PUT' : 'DELETE',
    url: `/favorites/${encodeURIComponent(nftId)}`,
    headers: { 'X-Favorites-User': userId },
  })

  return validateFavorites(data)
}
