import type { NftUpdatedEvent } from '@/features/realtime/realtime-contract'
import { readCheckoutStore, type CheckoutStore } from './cart-store'
import { nftEditions, nfts } from './fixtures/nfts'

export function readCatalog(checkout = readCheckoutStore()) {
  const sold = new Map<string, number>()

  for (const records of Object.values(checkout.orders)) {
    for (const { order } of records) {
      if (order.status !== 'confirmed') continue

      for (const item of order.quote.items) {
        const key = `${item.nftId}:${item.editionId}`
        sold.set(key, (sold.get(key) ?? 0) + item.quantity)
      }
    }
  }

  return {
    nfts: nfts.map((nft) => ({
      ...nft,
      priceEth: checkout.prices[nft.id] ?? nft.priceEth,
    })),
    soldQuantity(nftId: string, editionId: string) {
      return sold.get(`${nftId}:${editionId}`) ?? 0
    },
    editionsFor(nftId: string) {
      return nftEditions.map((edition) => ({
        ...edition,
        availableQuantity: Math.max(
          0,
          (checkout.stock[nftId]?.[edition.id] ?? edition.availableQuantity) -
            (sold.get(`${nftId}:${edition.id}`) ?? 0),
        ),
      }))
    },
  }
}

export function nftEvent(
  nftId: string,
  checkout: CheckoutStore,
  catalog = readCatalog(checkout),
): NftUpdatedEvent | undefined {
  const nft = catalog.nfts.find(({ id }) => id === nftId)
  if (!nft) return undefined

  const version = checkout.nftVersions[nftId] ?? 1
  return {
    eventId: `nft:${nftId}:${version}`,
    nftId,
    version,
    priceEth: nft.priceEth,
    editions: catalog.editionsFor(nftId),
  }
}

export function bumpNftVersions(
  previous: CheckoutStore,
  next: CheckoutStore,
  nftIds: readonly string[],
): CheckoutStore {
  const catalog = readCatalog(previous)
  const nftVersions = { ...next.nftVersions }
  const previousNfts = { ...next.previousNfts }

  for (const nftId of nftIds) {
    const old = nftEvent(nftId, previous, catalog)
    if (!old) continue
    nftVersions[nftId] = old.version + 1
    previousNfts[nftId] = old
  }

  return { ...next, nftVersions, previousNfts }
}
