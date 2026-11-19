import axios from 'axios'
import type { CatalogSearch } from './catalog-search'
import { api } from '@/lib/api'

export type NftSummary = {
  id: string
  name: string
  imageUrl: string
  priceEth: string
  collection: NonNullable<CatalogSearch['collection']>
  network: NonNullable<CatalogSearch['network']>
}

export type NftEdition = {
  id: string
  label: string
  availableQuantity: number
}

export type NftDetail = NftSummary & {
  reviews?: { id: string; author: string; rating: number; comment: string }[]
  relatedNfts?: NftSummary[]
  description: string
  collectionName: string
  attributes: string[]
  details: {
    paragraphs: string[]
    network: string
    contract: string
    royalties: string
  }
  editions: NftEdition[]
}

export type CatalogFacets = {
  collections: Partial<Record<NftSummary['collection'], number>>
  networks: Partial<Record<NftSummary['network'], number>>
}

export type NftListResponse = {
  items: NftSummary[]
  total: number
  pageSize: number
  facets?: CatalogFacets
}

export async function listNfts(
  search: CatalogSearch,
  signal: AbortSignal,
): Promise<NftListResponse> {
  const { data } = await api.get<NftListResponse>('/nfts', {
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

export async function getNft(
  nftId: string,
  signal: AbortSignal,
): Promise<NftDetail | null> {
  try {
    const { data } = await api.get<NftDetail>(
      `/nfts/${encodeURIComponent(nftId)}`,
      { signal },
    )

    if (
      data?.id !== nftId ||
      typeof data.description !== 'string' ||
      typeof data.collectionName !== 'string' ||
      !Array.isArray(data.attributes) ||
      !Array.isArray(data.details?.paragraphs) ||
      typeof data.details.network !== 'string' ||
      typeof data.details.contract !== 'string' ||
      typeof data.details.royalties !== 'string' ||
      !Array.isArray(data.editions)
    ) {
      throw new Error('A API retornou um detalhe de NFT inválido')
    }

    return data
  } catch (error) {
    if (
      axios.isAxiosError<{ code?: string }>(error) &&
      error.response?.status === 404 &&
      error.response.data?.code === 'NFT_NOT_FOUND'
    ) {
      return null
    }

    throw error
  }
}
