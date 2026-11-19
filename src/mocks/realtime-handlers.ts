import { http, HttpResponse } from 'msw'
import { fromWei, toWei } from '@/lib/eth'
import {
  cartStorageLock,
  readCheckoutStore,
  writeCheckoutStore,
} from './cart-store'
import { bumpNftVersions, nftEvent, readCatalog } from './catalog-state'
import { delayNextMockOrder, resumeMockOrders } from './checkout-handlers'
import {
  createRealtimeSocketHandler,
  disconnectMockSockets,
  publishNft,
} from './realtime-socket'

function isDuration(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isSafeInteger(value) &&
    value >= 0 &&
    value <= 30_000
  )
}

function invalidAction() {
  return HttpResponse.json({ code: 'INVALID_REALTIME_ACTION' }, { status: 422 })
}

export const realtimeHandlers = [
  createRealtimeSocketHandler(resumeMockOrders),
  http.post('/api/demo/realtime', async ({ request }) => {
    const input: unknown = await request.json().catch(() => null)
    if (!input || typeof input !== 'object' || !('action' in input))
      return invalidAction()

    if (input.action === 'disconnect' || input.action === 'delay-next-order') {
      if (!('durationMs' in input) || !isDuration(input.durationMs))
        return invalidAction()

      if (input.action === 'disconnect') disconnectMockSockets(input.durationMs)
      else delayNextMockOrder(input.durationMs)
      return new HttpResponse(null, { status: 204 })
    }

    const { nftId, priceEth, editionId, availableQuantity, stale } =
      input as Record<string, unknown>
    if (typeof nftId !== 'string') return invalidAction()

    return navigator.locks.request(cartStorageLock, () => {
      const checkout = readCheckoutStore()
      const catalog = readCatalog(checkout)
      const current = nftEvent(nftId, checkout, catalog)
      if (!current)
        return HttpResponse.json({ code: 'NFT_NOT_FOUND' }, { status: 404 })

      if (input.action === 'replay-nft') {
        const event = stale === true ? checkout.previousNfts[nftId] : current
        if (!event)
          return HttpResponse.json(
            { code: 'NO_PREVIOUS_EVENT' },
            { status: 409 },
          )
        publishNft(event)
        return HttpResponse.json(event)
      }

      if (input.action !== 'change-nft') return invalidAction()

      const changingStock =
        editionId !== undefined || availableQuantity !== undefined
      if (
        (priceEth === undefined && !changingStock) ||
        (priceEth !== undefined &&
          (typeof priceEth !== 'string' ||
            !/^\d{1,12}(?:\.\d{1,18})?$/.test(priceEth))) ||
        (changingStock &&
          (typeof editionId !== 'string' ||
            !current.editions.some((edition) => edition.id === editionId) ||
            typeof availableQuantity !== 'number' ||
            !Number.isSafeInteger(availableQuantity) ||
            availableQuantity < 0 ||
            availableQuantity > 10_000))
      )
        return invalidAction()

      const next = bumpNftVersions(
        checkout,
        {
          ...checkout,
          prices:
            typeof priceEth === 'string'
              ? { ...checkout.prices, [nftId]: fromWei(toWei(priceEth)) }
              : checkout.prices,
          stock:
            typeof editionId === 'string' &&
            typeof availableQuantity === 'number'
              ? {
                  ...checkout.stock,
                  [nftId]: {
                    ...checkout.stock[nftId],
                    [editionId]:
                      availableQuantity +
                      catalog.soldQuantity(nftId, editionId),
                  },
                }
              : checkout.stock,
        },
        [nftId],
      )

      writeCheckoutStore(next)
      const event = nftEvent(nftId, next)
      if (event) publishNft(event)
      return HttpResponse.json(event)
    })
  }),
]
