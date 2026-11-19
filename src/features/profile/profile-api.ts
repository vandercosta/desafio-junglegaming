import type { Session } from '@/features/auth/auth-api'
import { api } from '@/lib/api'

export const profileQueriesKey = ['profile'] as const
export const avatarMaxBytes = 512 * 1024
export const avatarTypes = ['image/png', 'image/jpeg', 'image/webp'] as const

export type ProfileInput = {
  displayName: string
  username: string
  email: string
  ensName: string
  walletNickname: string
  avatarUrl: string | null
}

export type Profile = ProfileInput & { id: string }
export type PasswordInput = { currentPassword: string; newPassword: string }
export type ProfileErrors = Partial<Record<keyof ProfileInput, string>>
export type PasswordErrors = Partial<
  Record<keyof PasswordInput | 'confirmation', string>
>

function profileRequest(userId: string) {
  return { headers: { 'X-Profile-User': userId } }
}

export function profileQueryKey(userId: string) {
  return [...profileQueriesKey, userId] as const
}

export async function getProfile(userId: string, signal: AbortSignal) {
  const { data } = await api.get<Profile>('/profile', {
    ...profileRequest(userId),
    signal,
  })
  if (data?.id !== userId) throw new Error('A API retornou um perfil inválido.')
  return data
}

export async function saveProfile(userId: string, input: ProfileInput) {
  const { data } = await api.put<{ profile: Profile; user: Session['user'] }>(
    '/profile',
    input,
    profileRequest(userId),
  )
  if (data?.profile?.id !== userId || data.user?.id !== userId) {
    throw new Error('A API retornou um perfil inválido.')
  }
  return data
}

export async function changePassword(userId: string, input: PasswordInput) {
  const response = await api.put(
    '/profile/password',
    input,
    profileRequest(userId),
  )
  if (response.status !== 204)
    throw new Error('A API não confirmou a alteração da senha.')
}
