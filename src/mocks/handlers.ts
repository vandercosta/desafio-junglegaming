import { delay, http, HttpResponse } from 'msw'
import type {
  CatalogFacets,
  NftDetail,
  NftListResponse,
} from '@/features/catalog/catalog-api'
import {
  catalogOptions,
  parseCatalogSearch,
} from '@/features/catalog/catalog-search'
import { readCatalog } from './catalog-state'
import { toWei } from '@/lib/eth'
import { cartHandlers } from './cart-handlers'
import { authHandlers } from './auth-handlers'
import { favoritesHandlers } from './favorites-handlers'
import { profileHandlers } from './profile-handlers'
import { walletHandlers } from './wallet-handlers'
import { checkoutHandlers } from './checkout-handlers'
import { realtimeHandlers } from './realtime-handlers'
import { catalogViewIds } from './fixtures/nfts'

const PAGE_SIZE = 3

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
    const viewIds =
      search.view && search.view !== 'all'
        ? catalogViewIds[search.view]
        : undefined
    const min = search.minEth === undefined ? undefined : toWei(search.minEth)
    const max = search.maxEth === undefined ? undefined : toWei(search.maxEth)

    const nfts = scenario === 'empty' ? [] : readCatalog().nfts
    const facets: CatalogFacets = { collections: {}, networks: {} }
    for (const { collection, network } of nfts) {
      facets.collections[collection] = (facets.collections[collection] ?? 0) + 1
      facets.networks[network] = (facets.networks[network] ?? 0) + 1
    }

    const matches = nfts.filter((nft) => {
      const price = toWei(nft.priceEth)

      return (
        (!viewIds || viewIds.includes(nft.id)) &&
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
      facets,
    })
  }),
  http.get('/api/nfts/:nftId', async ({ params }) => {
    await delay(350)

    if (import.meta.env.VITE_MOCK_CATALOG === 'error') {
      return HttpResponse.json(
        { message: 'Detalhe temporariamente indisponível' },
        { status: 503 },
      )
    }

    const catalog = readCatalog()
    const nft = catalog.nfts.find((item) => item.id === params.nftId)

    if (!nft) {
      return HttpResponse.json({ code: 'NFT_NOT_FOUND' }, { status: 404 })
    }

    const networkName = catalogOptions.network[nft.network]

    return HttpResponse.json<NftDetail>({
      ...nft,
      relatedNfts: catalog.nfts.filter(
        (item) => item.id !== nft.id && item.collection === nft.collection,
      ),
      reviews:
        nft.id === '0042'
          ? [
              {
                id: '1',
                author: 'Ana Demo',
                rating: 5,
                comment:
                  'A composição e os detalhes da obra são o destaque da coleção.',
              },
              {
                id: '2',
                author: 'Bruno Demo',
                rating: 4,
                comment: 'Gostei das cores e da expressão do personagem.',
              },
            ]
          : [],
      description: `${nft.name} é um colecionável digital da Kurio, com arte desbloqueável e acesso para colecionadores.`,
      collectionName: 'Kurio Apes',
      attributes:
        nft.id === '0042'
          ? ['Óculos', 'Esmeralda', 'Raro']
          : [catalogOptions.collection[nft.collection]],
      details: {
        paragraphs: [
          `${nft.name} faz parte da coleção Kurio Apes e explora identidade, movimento e luz na arte digital.`,
          'A coleção inclui arte em alta resolução e lançamentos exclusivos para colecionadores.',
        ],
        network: `Cunhado na rede ${networkName}, com metadados armazenados no IPFS.`,
        contract:
          nft.network === 'ethereum'
            ? '0x7A42…19E8 · Contrato inteligente ERC-721 simulado.'
            : `Referência de contrato simulada na rede ${networkName}.`,
        royalties:
          'O criador recebe 5% de direitos autorais nas vendas secundárias.',
      },
      editions: catalog.editionsFor(nft.id),
    })
  }),
  ...cartHandlers,
  ...authHandlers,
  ...favoritesHandlers,
  ...profileHandlers,
  ...walletHandlers,
  ...checkoutHandlers,
  ...realtimeHandlers,
]
