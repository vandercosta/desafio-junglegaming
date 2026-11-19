import { delay, http, HttpResponse } from 'msw'
import type { FavoritesResponse } from '@/features/favorites/favorites-api'
import { getMockUserId } from './auth-handlers'
import { readCatalog } from './catalog-state'

const storageKey = 'kurio:favorites:v1'
const failNextKey = 'kurio:mock-favorites-fail-next:v1'

function readFavorites(userId: string): string[] {
  try {
    const raw = JSON.parse(
      localStorage.getItem(`${storageKey}:${userId}`) ?? '[]',
    )
    return Array.isArray(raw)
      ? raw.filter((id): id is string => typeof id === 'string')
      : []
  } catch {
    return []
  }
}

function favoriteResponse(ids: string[]) {
  const savedIds = new Set(ids)
  return HttpResponse.json<FavoritesResponse>({
    items: readCatalog().nfts.filter((nft) => savedIds.has(nft.id)),
  })
}

function withFavorites(request: Request, run: (userId: string) => Response) {
  return navigator.locks.request(storageKey, () => {
    const userId = getMockUserId()
    const expectedUser = request.headers.get('X-Favorites-User')

    if (userId === undefined) {
      return HttpResponse.json({ code: 'AUTH_REQUIRED' }, { status: 401 })
    }

    if (expectedUser !== null && userId !== expectedUser) {
      return HttpResponse.json(
        { code: 'FAVORITES_SESSION_CHANGED' },
        { status: 409 },
      )
    }

    return run(userId)
  })
}

function updateFavorites(request: Request, nftId: unknown, saved: boolean) {
  return withFavorites(request, (userId) => {
    if (
      typeof nftId !== 'string' ||
      !readCatalog().nfts.some((nft) => nft.id === nftId)
    ) {
      return HttpResponse.json({ code: 'NFT_NOT_FOUND' }, { status: 404 })
    }

    if (localStorage.getItem(failNextKey) === 'true') {
      localStorage.removeItem(failNextKey)
      return HttpResponse.json(
        { code: 'FAVORITES_UNAVAILABLE' },
        { status: 503 },
      )
    }

    const ids = new Set(readFavorites(userId))

    if (saved) ids.add(nftId)
    else ids.delete(nftId)

    const next = [...ids]
    localStorage.setItem(`${storageKey}:${userId}`, JSON.stringify(next))

    return favoriteResponse(next)
  })
}

export const favoritesHandlers = [
  http.get('/api/favorites', async ({ request }) => {
    await delay(150)
    return withFavorites(request, (userId) =>
      favoriteResponse(readFavorites(userId)),
    )
  }),

  http.put('/api/favorites/:nftId', async ({ request, params }) => {
    await delay(350)
    return updateFavorites(request, params.nftId, true)
  }),

  http.delete('/api/favorites/:nftId', async ({ request, params }) => {
    await delay(350)
    return updateFavorites(request, params.nftId, false)
  }),
]
