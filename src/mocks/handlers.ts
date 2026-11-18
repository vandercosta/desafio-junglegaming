import { delay, http, HttpResponse } from 'msw'
import type { NftListResponse } from '@/features/catalog/catalog-api'
import { parseCatalogSearch } from '@/features/catalog/catalog-search'
import { nfts } from './fixtures/nfts'

const PAGE_SIZE = 3

function toWei(decimal: string): bigint {
  const [whole = '0', fraction = ''] = decimal.split('.')
  return BigInt(`${whole}${fraction.padEnd(18, '0')}`)
}

export const handlers = [
  http.get('/api/nfts', async ({ request }) => {
    await delay(350)

    const scenario = import.meta.env.VITE_MOCK_CATALOG

    if (scenario === 'error') {
      return HttpResponse.json(
        { message: 'Catálogo temporariamente indisponível' },
        { status: 503 },
      )
    }

    const params = new URL(request.url).searchParams
    const search = parseCatalogSearch(Object.fromEntries(params))
    const query = search.q?.toLowerCase()
    const min = search.minEth === undefined ? undefined : toWei(search.minEth)
    const max = search.maxEth === undefined ? undefined : toWei(search.maxEth)

    const matches =
      scenario === 'empty'
        ? []
        : nfts.filter((nft) => {
            const price = toWei(nft.priceEth)

            return (
              (!query ||
                nft.name.toLowerCase().includes(query) ||
                nft.id.includes(query)) &&
              (!search.collection || nft.collection === search.collection) &&
              (!search.network || nft.network === search.network) &&
              (min === undefined || price >= min) &&
              (max === undefined || price <= max)
            )
          })

    if (search.sort) {
      const direction = search.sort === 'price-asc' ? 1 : -1

      matches.sort((a, b) => {
        const left = toWei(a.priceEth)
        const right = toWei(b.priceEth)
        if (left === right) return 0
        return left < right ? -direction : direction
      })
    }

    const start = ((search.page ?? 1) - 1) * PAGE_SIZE

    return HttpResponse.json<NftListResponse>({
      items: matches.slice(start, start + PAGE_SIZE),
      total: matches.length,
      pageSize: PAGE_SIZE,
    })
  }),
]
