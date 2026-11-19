import { useQueryClient, type Query } from '@tanstack/react-query'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { Socket } from 'socket.io-client'
import { sessionQueryKey, type SessionState } from '@/features/auth/auth-api'
import { cartScopeForUser } from '@/features/cart/cart-api'
import { checkoutQueryKey, type Order } from '@/features/checkout/checkout-api'
import {
  realtimePath,
  type NftUpdatedEvent,
  type OrderUpdatedEvent,
  type RealtimeClientEvents,
  type RealtimeServerEvents,
  type RealtimeSubscription,
} from './realtime-contract'
import {
  RealtimeContext,
  realtimeInitialState,
  type RealtimeStatus,
} from './realtime-context'

type ScopedState = {
  userId: string | null | undefined
  status: RealtimeStatus
  lastNftUpdate: NftUpdatedEvent | null
}

function validVersion(version: number) {
  return Number.isSafeInteger(version) && version > 0
}

function validNftEvent(event: NftUpdatedEvent) {
  return (
    typeof event?.eventId === 'string' &&
    event.eventId.length > 0 &&
    typeof event.nftId === 'string' &&
    event.nftId.length > 0 &&
    validVersion(event.version) &&
    typeof event.priceEth === 'string' &&
    /^\d+(?:\.\d{1,18})?$/.test(event.priceEth) &&
    Array.isArray(event.editions) &&
    event.editions.every(
      (edition) =>
        typeof edition?.id === 'string' &&
        typeof edition.label === 'string' &&
        Number.isSafeInteger(edition.availableQuantity) &&
        edition.availableQuantity >= 0,
    )
  )
}

function validOrderEvent(event: OrderUpdatedEvent) {
  return (
    typeof event?.eventId === 'string' &&
    event.eventId.length > 0 &&
    typeof event.orderId === 'string' &&
    event.orderId.length > 0 &&
    typeof event.userId === 'string' &&
    validVersion(event.version) &&
    (event.status === 'pending' ||
      event.status === 'confirmed' ||
      event.status === 'refused')
  )
}

export default function RealtimeProvider({
  userId,
  children,
}: {
  userId: string | null | undefined
  children: ReactNode
}) {
  const queryClient = useQueryClient()
  const nftVersions = useRef(new Map<string, number>())
  const hasSubscribed = useRef(false)
  const [state, setState] = useState<ScopedState>({
    userId,
    ...realtimeInitialState,
  })

  useEffect(() => {
    if (userId === undefined) return

    let socket: Socket<RealtimeServerEvents, RealtimeClientEvents> | undefined
    const orderVersions = new Map<string, number>()
    const cartScope = cartScopeForUser(userId ?? undefined)
    let disposed = false
    let subscribed = false

    function isCurrentScope() {
      const current = queryClient.getQueryData<SessionState>(sessionQueryKey)
      return (
        !disposed &&
        current !== undefined &&
        (current.session?.user.id ?? null) === userId
      )
    }

    function updateStatus(status: RealtimeStatus) {
      if (!isCurrentScope()) return
      setState((previous) => ({
        userId,
        status,
        lastNftUpdate:
          previous.userId === userId ? previous.lastNftUpdate : null,
      }))
    }

    function matchesCatalog({ queryKey }: Query, nftId?: string) {
      return (
        queryKey[0] === 'nfts' &&
        (nftId === undefined ||
          queryKey[1] !== 'detail' ||
          queryKey[2] === nftId)
      )
    }

    function matchesCart({ queryKey }: Query) {
      return queryKey[0] === 'cart' && queryKey[1] === cartScope
    }

    function matchesCheckout(
      { queryKey }: Query,
      segment: string,
      id?: string,
    ) {
      return (
        userId !== null &&
        queryKey[0] === 'checkout' &&
        queryKey[1] === userId &&
        queryKey[2] === segment &&
        (id === undefined || queryKey[3] === id)
      )
    }

    function matchesFavorites({ queryKey }: Query) {
      return (
        userId !== null && queryKey[0] === 'favorites' && queryKey[1] === userId
      )
    }

    function reconcile(predicate: (query: Query) => boolean) {
      // Cancellation also stops an initial fetch with no data yet, which
      // React Query's normal background revalidation would otherwise reuse.
      void queryClient.cancelQueries({ predicate }).then(() => {
        if (isCurrentScope()) {
          return queryClient.invalidateQueries({
            predicate,
            refetchType: 'active',
          })
        }
      })
    }

    function onConnect() {
      if (!isCurrentScope() || userId === undefined) return
      socket?.emit('realtime.subscribe', { userId })
    }

    function onSubscribed(subscription: RealtimeSubscription) {
      if (
        !isCurrentScope() ||
        !socket?.connected ||
        subscribed ||
        subscription?.userId !== userId
      )
        return

      subscribed = true
      updateStatus('online')

      const reconnection = hasSubscribed.current
      hasSubscribed.current = true

      reconcile(
        (query) =>
          matchesCheckout(query, 'order') ||
          (reconnection &&
            (matchesCatalog(query) ||
              matchesCart(query) ||
              matchesFavorites(query) ||
              matchesCheckout(query, 'quote'))),
      )
    }

    function onDisconnect() {
      subscribed = false
      updateStatus('offline')
    }

    function onNftUpdated(event: NftUpdatedEvent) {
      if (!subscribed || !isCurrentScope() || !validNftEvent(event)) return

      const previousVersion = nftVersions.current.get(event.nftId) ?? 0
      if (event.version <= previousVersion) return

      nftVersions.current.set(event.nftId, event.version)
      setState({ userId, status: 'online', lastNftUpdate: event })
      reconcile(
        (query) =>
          matchesCatalog(query, event.nftId) ||
          matchesCart(query) ||
          matchesFavorites(query) ||
          matchesCheckout(query, 'quote'),
      )
    }

    function onOrderUpdated(event: OrderUpdatedEvent) {
      if (
        !subscribed ||
        !isCurrentScope() ||
        !validOrderEvent(event) ||
        userId == null ||
        event.userId !== userId
      )
        return

      const order = queryClient.getQueryData<Order>(
        checkoutQueryKey(userId, 'order', event.orderId),
      )
      const previousVersion = orderVersions.get(event.orderId) ?? 0
      if (
        event.version <= Math.max(previousVersion, order?.version ?? 0) ||
        (order && order.status !== 'pending')
      )
        return

      orderVersions.set(event.orderId, event.version)
      reconcile(
        (query) =>
          matchesCheckout(query, 'order', event.orderId) ||
          (event.status === 'confirmed' &&
            (matchesCart(query) || matchesCheckout(query, 'quote'))),
      )
    }

    // Engine.IO captures the WebSocket constructor at module load. Import
    // after MSW has installed its interceptor in the demo bootstrap.
    void import('socket.io-client')
      .then(({ io }) => {
        if (!isCurrentScope()) return
        socket = io({
          path: realtimePath,
          transports: ['websocket'],
          autoConnect: false,
          forceNew: true,
          timeout:
            import.meta.env.VITE_ENABLE_MOCKS === 'true' ? 1_000 : 20_000,
          reconnectionDelay: 250,
          reconnectionDelayMax: 1000,
        })
        socket.on('connect', onConnect)
        socket.on('realtime.subscribed', onSubscribed)
        socket.on('disconnect', onDisconnect)
        socket.on('connect_error', onDisconnect)
        socket.on('nft.updated', onNftUpdated)
        socket.on('order.updated', onOrderUpdated)
        socket.connect()
      })
      .catch(() => updateStatus('offline'))

    return () => {
      disposed = true
      if (!socket) return
      socket.off('connect', onConnect)
      socket.off('realtime.subscribed', onSubscribed)
      socket.off('disconnect', onDisconnect)
      socket.off('connect_error', onDisconnect)
      socket.off('nft.updated', onNftUpdated)
      socket.off('order.updated', onOrderUpdated)
      socket.disconnect()
    }
  }, [queryClient, userId])

  const current = state.userId === userId ? state : realtimeInitialState

  return (
    <RealtimeContext.Provider value={current}>
      {userId !== undefined && current.status === 'offline' && (
        <p
          role="status"
          aria-label="Conexão em tempo real"
          className="page-shell text-xs text-muted-foreground"
        >
          Tempo real desconectado. Tentando reconectar…
        </p>
      )}
      {children}
    </RealtimeContext.Provider>
  )
}
