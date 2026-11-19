import { users } from './fixtures/users'
import type { Session } from '@/features/auth/auth-api'

export const userStorageKey = 'kurio:mock-users:v1'

export type MockUser = (typeof users)[number] & {
  ensName?: string
  walletNickname?: string
  avatarUrl?: string | null
}

export function toSessionUser({
  id,
  displayName,
  email,
  avatarUrl,
}: MockUser): Session['user'] {
  return {
    id,
    displayName,
    email,
    avatarUrl: typeof avatarUrl === 'string' ? avatarUrl : null,
  }
}

const userFields = [
  'id',
  'username',
  'displayName',
  'email',
  'salt',
  'verifier',
] as const

function isMockUser(value: unknown): value is MockUser {
  if (typeof value !== 'object' || value === null) return false

  const user = value as Partial<MockUser>

  return userFields.every((field) => typeof user[field] === 'string')
}

function readRegisteredUsers(): MockUser[] {
  try {
    const data: unknown = JSON.parse(
      localStorage.getItem(userStorageKey) ?? '[]',
    )

    return Array.isArray(data) ? data.filter(isMockUser) : []
  } catch {
    return []
  }
}

export function listUsers(): MockUser[] {
  const savedUsers = readRegisteredUsers()
  const savedIds = new Set(savedUsers.map((user) => user.id))
  return [...users.filter((user) => !savedIds.has(user.id)), ...savedUsers]
}

export function saveUser(user: MockUser) {
  const savedUsers = readRegisteredUsers().filter(
    (saved) => saved.id !== user.id,
  )
  localStorage.setItem(userStorageKey, JSON.stringify([...savedUsers, user]))
}

export async function derivePasswordVerifier(
  password: string,
  encodedSalt: string,
): Promise<string> {
  const salt = Uint8Array.from(atob(encodedSalt), (char) => char.charCodeAt(0))

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

  return btoa(String.fromCharCode(...new Uint8Array(bits)))
}

export async function createPasswordVerifier(password: string) {
  const saltBytes = crypto.getRandomValues(new Uint8Array(16))
  const salt = btoa(String.fromCharCode(...saltBytes))
  return { salt, verifier: await derivePasswordVerifier(password, salt) }
}
