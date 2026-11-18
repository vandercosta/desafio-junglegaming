import axios from 'axios'
import { api } from '@/lib/api'

export type LoginInput = {
  email: string
  password: string
}

export type Session = {
  user: {
    id: string
    displayName: string
    email: string
  }
  expiresAt: string
}

export type SessionState = {
  session: Session | null
  expired: boolean
}

type SessionResponse = { session: Session | null }

export const sessionQueryKey = ['session'] as const

export async function getSession(signal: AbortSignal): Promise<SessionState> {
  try {
    const { data } = await api.get<SessionResponse>('/auth/session', { signal })

    if (!data || typeof data !== 'object' || !('session' in data)) {
      throw new Error('Resposta de sessão inválida')
    }

    return { session: data.session, expired: false }
  } catch (error) {
    if (
      axios.isAxiosError<{ code?: string }>(error) &&
      error.response?.status === 401 &&
      error.response.data?.code === 'SESSION_EXPIRED'
    ) {
      return { session: null, expired: true }
    }

    throw error
  }
}

export async function signIn(input: LoginInput): Promise<Session> {
  const { data } = await api.post<SessionResponse>('/auth/login', input)

  if (!data?.session) throw new Error('A API não retornou a sessão')

  return data.session
}

export async function signOut(): Promise<void> {
  await api.delete('/auth/session')
}
