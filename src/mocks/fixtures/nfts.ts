import type { NftEdition, NftSummary } from '@/features/catalog/catalog-api'

export const catalogViewIds = {
  new: ['0118', '0314', '0160'],
  trending: ['0042', '0552', '0207'],
}

export const nfts: NftSummary[] = [
  {
    id: '0042',
    name: 'Emerald Ape #042',
    priceEth: '1.19',
    collection: 'arte-digital',
    network: 'ethereum',
  },
  {
    id: '0009',
    name: 'Sage Nomad #009',
    priceEth: '1.69',
    collection: 'arte-digital',
    network: 'ethereum',
  },
  {
    id: '0552',
    name: 'Neon Vessel #552',
    priceEth: '1.99',
    collection: 'arte-3d',
    network: 'polygon',
  },
  {
    id: '0118',
    name: 'Cosmic Bloom #118',
    priceEth: '1.29',
    collection: 'arte-digital',
    network: 'ethereum',
  },
  {
    id: '0314',
    name: 'Violet Nomad #314',
    priceEth: '1.39',
    collection: 'arte-digital',
    network: 'ethereum',
  },
  {
    id: '0088',
    name: 'Ivory Baron #088',
    priceEth: '1.79',
    collection: 'arte-3d',
    network: 'polygon',
  },
  {
    id: '0207',
    name: 'Golden Beat #207',
    priceEth: '0.99',
    collection: 'musica',
    network: 'solana',
  },
  {
    id: '0071',
    name: 'Golden Frequency #071',
    priceEth: '0.59',
    collection: 'musica',
    network: 'ethereum',
  },
  {
    id: '0160',
    name: 'Golden Signal #160',
    priceEth: '0.39',
    collection: 'musica',
    network: 'solana',
  },
]

export const nftEditions: NftEdition[] = [
  { id: 'unique', label: '1/1', availableQuantity: 0 },
  { id: 'limited-10', label: '1/10', availableQuantity: 2 },
  { id: 'limited-50', label: '1/50', availableQuantity: 5 },
  { id: 'open', label: 'Aberta', availableQuantity: 8 },
]
