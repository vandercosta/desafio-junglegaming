import { delay, http, HttpResponse } from 'msw'
import type { LoginInput, Session } from '@/features/auth/auth-api'
import { users } from './fixtures/users'

const storageKey = 'kurio:mock-session:v1'
const sessionDurationMs = 30 * 60 * 1000

type StoredSession = {
  userId: string
  expiresAt: number
}

function readSession(): StoredSession | null {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(storageKey) ?? 'null')
    if (typeof raw !== 'object' || raw === null) return null

    const { userId, expiresAt } = raw as Partial<StoredSession>

    return typeof userId === 'string' &&
      typeof expiresAt === 'number' &&
      Number.isFinite(expiresAt)
      ? { userId, expiresAt }
      : null
  } catch {
    return null
  }
}

async function verifyPassword(
  password: string,
  user: (typeof users)[number],
): Promise<boolean> {
  const salt = Uint8Array.from(atob(user.salt), (char) => char.charCodeAt(0))
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )

  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 600_000 },
    key,
    256,
  )

  return btoa(String.fromCharCode(...new Uint8Array(bits))) === user.verifier
}

function toSession(
  { id, displayName, email }: (typeof users)[number],
  expiresAt: number,
): Session {
  return {
    user: { id, displayName, email },
    expiresAt: new Date(expiresAt).toISOString(),
  }
}

export const authHandlers = [
  http.post('/api/auth/login', async ({ request }) => {
    await delay(250)

    const input = (await request
      .json()
      .catch(() => null)) as Partial<LoginInput> | null

    if (
      typeof input?.email !== 'string' ||
      typeof input.password !== 'string'
    ) {
      return HttpResponse.json({ code: 'INVALID_INPUT' }, { status: 400 })
    }

    const email = input.email.trim().toLowerCase()
    const user = users.find((candidate) => candidate.email === email)

    if (!user || !(await verifyPassword(input.password, user))) {
      return HttpResponse.json({ code: 'INVALID_CREDENTIALS' }, { status: 401 })
    }

    const expiresAt = Date.now() + sessionDurationMs

    localStorage.setItem(
      storageKey,
      JSON.stringify({ userId: user.id, expiresAt }),
    )

    return HttpResponse.json({ session: toSession(user, expiresAt) })
  }),

  http.get('/api/auth/session', async () => {
    await delay(150)

    const stored = readSession()
    const user = users.find((candidate) => candidate.id === stored?.userId)

    if (!stored || !user) return HttpResponse.json({ session: null })

    if (stored.expiresAt <= Date.now()) {
      return HttpResponse.json({ code: 'SESSION_EXPIRED' }, { status: 401 })
    }

    return HttpResponse.json({ session: toSession(user, stored.expiresAt) })
  }),

  http.delete('/api/auth/session', async () => {
    await delay(150)

    localStorage.removeItem(storageKey)

    return new HttpResponse(null, { status: 204 })
  }),
]
