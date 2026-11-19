import { readCheckoutStore } from './cart-store'
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
    editionsFor(nftId: string) {
      return nftEditions.map((edition) => ({
        ...edition,
        availableQuantity: Math.max(
          0,
          edition.availableQuantity - (sold.get(`${nftId}:${edition.id}`) ?? 0),
        ),
      }))
    },
  }
}
