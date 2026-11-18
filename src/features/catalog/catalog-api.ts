import axios from 'axios'
import type { CatalogSearch } from './catalog-search'

export type NftSummary = {
  id: string
  name: string
  priceEth: string
  collection: NonNullable<CatalogSearch['collection']>
  network: NonNullable<CatalogSearch['network']>
}

export type NftListResponse = {
  items: NftSummary[]
  total: number
  pageSize: number
}

const catalogApi = axios.create({
  baseURL: '/api',
  headers: { Accept: 'application/json' },
  timeout: 5000,
})

export async function listNfts(
  search: CatalogSearch,
  signal: AbortSignal,
): Promise<NftListResponse> {
  const { data } = await catalogApi.get<NftListResponse>('/nfts', {
    params: search,
    signal,
  })

  if (
    !Array.isArray(data?.items) ||
    !Number.isSafeInteger(data.total) ||
    data.total < 0 ||
    !Number.isSafeInteger(data.pageSize) ||
    data.pageSize < 1
  ) {
    throw new Error('A API retornou uma lista de NFTs inválida')
  }

  return data
}
