import axios from 'axios'

export type NftSummary = {
  id: string
  name: string
  priceEth: string
}

export type NftListResponse = {
  items: NftSummary[]
}

const catalogApi = axios.create({
  baseURL: '/api',
  headers: { Accept: 'application/json' },
  timeout: 5000,
})

export async function listNfts(signal: AbortSignal): Promise<NftListResponse> {
  const { data } = await catalogApi.get<NftListResponse>('/nfts', { signal })

  if (!Array.isArray(data?.items)) {
    throw new Error('A API retornou uma lista de NFTs inválida')
  }

  return data
}
