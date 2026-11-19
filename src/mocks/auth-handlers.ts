import { delay, http, HttpResponse } from 'msw'
import type {
  LoginInput,
  RegisterErrors,
  RegisterInput,
  Session,
} from '@/features/auth/auth-api'
import {
  createPasswordVerifier,
  derivePasswordVerifier,
  listUsers,
  saveUser,
  toSessionUser,
  userStorageKey,
  type MockUser,
} from './user-store'
import { cartScopeForUser } from '@/features/cart/cart-api'
import { cartStorageLock, mergeGuestCart } from './cart-store'

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

export function getMockUserId(): string | undefined {
  const stored = readSession()
  const user =
    stored && stored.expiresAt > Date.now()
      ? listUsers().find((candidate) => candidate.id === stored.userId)
      : undefined

  return user?.id
}

export function getMockCartScope() {
  return cartScopeForUser(getMockUserId())
}

function toSession(user: MockUser, expiresAt: number): Session {
  return {
    user: toSessionUser(user),
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
    const user = listUsers().find((candidate) => candidate.email === email)

    if (
      !user ||
      (await derivePasswordVerifier(input.password, user.salt)) !==
        user.verifier
    ) {
      return HttpResponse.json({ code: 'INVALID_CREDENTIALS' }, { status: 401 })
    }

    return navigator.locks.request(cartStorageLock, () => {
      const currentUser = listUsers().find(
        (candidate) => candidate.id === user.id,
      )
      if (
        !currentUser ||
        currentUser.email !== email ||
        currentUser.salt !== user.salt ||
        currentUser.verifier !== user.verifier
      ) {
        return HttpResponse.json(
          { code: 'INVALID_CREDENTIALS' },
          { status: 401 },
        )
      }

      const expiresAt = Date.now() + sessionDurationMs
      const previous = localStorage.getItem(storageKey)

      localStorage.setItem(
        storageKey,
        JSON.stringify({ userId: user.id, expiresAt }),
      )

      try {
        mergeGuestCart(cartScopeForUser(user.id))
      } catch {
        if (previous === null) localStorage.removeItem(storageKey)
        else localStorage.setItem(storageKey, previous)

        return HttpResponse.json({ code: 'CART_MERGE_FAILED' }, { status: 503 })
      }

      return HttpResponse.json({ session: toSession(currentUser, expiresAt) })
    })
  }),

  http.get('/api/auth/session', async () => {
    await delay(150)

    const stored = readSession()
    const user = listUsers().find(
      (candidate) => candidate.id === stored?.userId,
    )

    if (!stored || !user) return HttpResponse.json({ session: null })

    if (stored.expiresAt <= Date.now()) {
      return HttpResponse.json({ code: 'SESSION_EXPIRED' }, { status: 401 })
    }

    return HttpResponse.json({ session: toSession(user, stored.expiresAt) })
  }),

  http.delete('/api/auth/session', async () => {
    await delay(150)

    return navigator.locks.request(cartStorageLock, () => {
      localStorage.removeItem(storageKey)
      return new HttpResponse(null, { status: 204 })
    })
  }),

  http.post('/api/auth/register', async ({ request }) => {
    await delay(250)

    const input = (await request.json().catch(() => null)) as Partial<
      Record<keyof RegisterInput, unknown>
    > | null

    const username =
      typeof input?.username === 'string'
        ? input.username.trim().toLowerCase()
        : ''
    const email =
      typeof input?.email === 'string' ? input.email.trim().toLowerCase() : ''
    const password = typeof input?.password === 'string' ? input.password : ''

    const fields: RegisterErrors = {}

    if (!/^[a-z0-9_]{3,24}$/.test(username)) {
      fields.username = 'Use de 3 a 24 letras, números ou sublinhados.'
    }

    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      fields.email = 'Informe um e-mail válido.'
    }

    if (password.length < 8 || password.length > 128) {
      fields.password = 'Use uma senha de 8 a 128 caracteres.'
    }

    if (Object.keys(fields).length > 0) {
      return HttpResponse.json(
        { code: 'VALIDATION_ERROR', fields },
        { status: 422 },
      )
    }

    const credentials = await createPasswordVerifier(password)

    return navigator.locks.request(userStorageKey, () => {
      const existingUsers = listUsers()
      const conflicts: RegisterErrors = {}

      if (existingUsers.some((user) => user.email === email)) {
        conflicts.email = 'Este e-mail já está cadastrado.'
      }

      if (existingUsers.some((user) => user.username === username)) {
        conflicts.username = 'Este nome de usuário já está em uso.'
      }

      if (Object.keys(conflicts).length > 0) {
        return HttpResponse.json(
          { code: 'ACCOUNT_CONFLICT', fields: conflicts },
          { status: 409 },
        )
      }

      const user: MockUser = {
        id: crypto.randomUUID(),
        username,
        displayName: username,
        email,
        ...credentials,
      }

      saveUser(user)

      return HttpResponse.json({ email }, { status: 201 })
    })
  }),
]
