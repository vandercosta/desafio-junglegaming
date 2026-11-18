import { delay, http, HttpResponse } from 'msw'
import type { NftListResponse } from '@/features/catalog/catalog-api'

const nfts = [
  { id: '0042', name: 'Emerald Ape #042', priceEth: '1.19' },
  { id: '0314', name: 'Violet Nomad #314', priceEth: '1.39' },
  { id: '0088', name: 'Ivory Baron #088', priceEth: '1.79' },
] satisfies NftListResponse['items']

export const handlers = [
  http.get('/api/nfts', async () => {
    await delay(350)

    const scenario = import.meta.env.VITE_MOCK_CATALOG

    if (scenario === 'error') {
      return HttpResponse.json(
        { message: 'Catálogo temporariamente indisponível' },
        { status: 503 },
      )
    }

    return HttpResponse.json<NftListResponse>({
      items: scenario === 'empty' ? [] : nfts,
    })
  }),
]
