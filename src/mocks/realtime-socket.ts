import { toSocketIo } from '@mswjs/socket.io-binding'
import { ws } from 'msw'
import {
  realtimePath,
  type NftUpdatedEvent,
  type OrderUpdatedEvent,
  type RealtimeSubscription,
} from '@/features/realtime/realtime-contract'
import type { Order } from '@/features/checkout/checkout-api'
import { getMockUserId } from './auth-handlers'
import {
  cartStorageLock,
  readCheckoutStore,
  type CheckoutStore,
} from './cart-store'
import { nftEvent } from './catalog-state'

// MSW removes Socket.IO's transport prefix before matching the handler URL.
const socketLink = ws.link(window.location.origin)

type Peer = {
  io: ReturnType<typeof toSocketIo>
  userId?: RealtimeSubscription['userId']
  close: () => void
}

const peers = new Set<Peer>()
let offlineUntil = 0

export function publishNft(event: NftUpdatedEvent) {
  for (const peer of peers) {
    if (peer.userId !== undefined) peer.io.client.emit('nft.updated', event)
  }
}

export function publishNftChanges(
  checkout: CheckoutStore,
  nftIds: readonly string[],
) {
  for (const nftId of nftIds) {
    const event = nftEvent(nftId, checkout)
    if (event) publishNft(event)
  }
}

export function publishOrder(userId: string, order: Order) {
  if (getMockUserId() !== userId) return

  const event: OrderUpdatedEvent = {
    eventId: `order:${order.id}:${order.version}`,
    userId,
    orderId: order.id,
    version: order.version,
    status: order.status,
  }

  for (const peer of peers) {
    if (peer.userId === userId) peer.io.client.emit('order.updated', event)
  }
}

export function disconnectMockSockets(durationMs: number) {
  offlineUntil = Math.max(offlineUntil, Date.now() + durationMs)
  for (const peer of peers) peer.close()
}

export function createRealtimeSocketHandler(
  resumeOrders: (userId: string) => void,
) {
  // The writing tab publishes directly. Other tabs observe the same REST snapshot.
  window.addEventListener('storage', (event) => {
    if (event.key !== cartStorageLock || peers.size === 0) return

    const checkout = readCheckoutStore()
    let previous: Partial<CheckoutStore> = {}
    try {
      previous = JSON.parse(event.oldValue ?? 'null')?.$checkout ?? {}
    } catch {
      // A new snapshot still contains the authoritative versions.
    }

    publishNftChanges(
      checkout,
      Object.keys(checkout.nftVersions).filter(
        (id) => checkout.nftVersions[id] > (previous.nftVersions?.[id] ?? 1),
      ),
    )

    const userId = getMockUserId()
    if (!userId) return
    for (const { order } of checkout.orders[userId] ?? []) {
      const old = previous.orders?.[userId]?.find(
        (record) => record.order.id === order.id,
      )
      if (order.version > (old?.order.version ?? 0)) publishOrder(userId, order)
    }
  })

  return socketLink.addEventListener('connection', (connection) => {
    const pathname = new URL(connection.client.url).pathname.replace(/\/$/, '')
    if (pathname !== realtimePath) {
      connection.server.connect()
      return
    }

    if (Date.now() < offlineUntil) {
      connection.client.close(1012, 'Reconexão simulada')
      return
    }

    const io = toSocketIo(connection)
    const heartbeat = window.setInterval(() => io.rawClient.send('2'), 20_000)
    function cleanup() {
      window.clearInterval(heartbeat)
      peers.delete(peer)
    }

    const peer: Peer = {
      io,
      close() {
        cleanup()
        io.rawClient.close(1012, 'Reconexão simulada')
      },
    }
    peers.add(peer)
    io.rawClient.addEventListener('close', cleanup, { once: true })

    io.client.on(
      'realtime.subscribe',
      (_event, expected?: RealtimeSubscription) => {
        const userId = getMockUserId() ?? null
        if (!expected || expected.userId !== userId) {
          peer.close()
          return
        }

        peer.userId = userId
        io.client.emit('realtime.subscribed', { userId })
        if (userId) resumeOrders(userId)
      },
    )
  })
}
