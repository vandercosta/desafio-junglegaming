import { useQuery } from '@tanstack/react-query'
import { favoritesQueryKey, getFavorites } from './favorites-api'

export function useFavorites(userId: string) {
  return useQuery({
    queryKey: favoritesQueryKey(userId),
    queryFn: ({ signal }) => getFavorites(userId, signal),
    retry: false,
    staleTime: 30_000,
    refetchOnWindowFocus: 'always',
  })
}
