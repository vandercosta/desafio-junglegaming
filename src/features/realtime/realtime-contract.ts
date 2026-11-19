import type { NftEdition } from '@/features/catalog/catalog-api'
import type { Order } from '@/features/checkout/checkout-api'

export const realtimePath = '/socket.io'

export type NftUpdatedEvent = {
  eventId: string
  nftId: string
  version: number
  priceEth: string
  editions: NftEdition[]
}

export type OrderUpdatedEvent = {
  eventId: string
  userId: string
  orderId: string
  version: number
  status: Order['status']
}

export type RealtimeSubscription = { userId: string | null }

export type RealtimeServerEvents = {
  'realtime.subscribed': (subscription: RealtimeSubscription) => void
  'nft.updated': (event: NftUpdatedEvent) => void
  'order.updated': (event: OrderUpdatedEvent) => void
}

export type RealtimeClientEvents = {
  'realtime.subscribe': (subscription: RealtimeSubscription) => void
}
