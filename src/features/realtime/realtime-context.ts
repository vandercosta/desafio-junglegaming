import { createContext, useContext } from 'react'
import type { NftUpdatedEvent } from './realtime-contract'

export type RealtimeStatus = 'connecting' | 'online' | 'offline'

type RealtimeState = {
  status: RealtimeStatus
  lastNftUpdate: NftUpdatedEvent | null
}

export const realtimeInitialState: RealtimeState = {
  status: 'connecting',
  lastNftUpdate: null,
}

export const RealtimeContext = createContext(realtimeInitialState)

export function useRealtime() {
  return useContext(RealtimeContext)
}
