import { createFileRoute } from '@tanstack/react-router'
import { parseCatalogSearch } from '@/features/catalog/catalog-search'
import NftDetailPage from '@/features/catalog/nft-detail-page'

export const Route = createFileRoute('/nfts/$nftId')({
  validateSearch: parseCatalogSearch,
  component: NftDetailPage,
})
