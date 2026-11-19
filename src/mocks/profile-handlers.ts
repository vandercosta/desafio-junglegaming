import { delay, http, HttpResponse } from 'msw'
import {
  avatarMaxBytes,
  avatarTypes,
  type PasswordErrors,
  type PasswordInput,
  type Profile,
  type ProfileErrors,
  type ProfileInput,
} from '@/features/profile/profile-api'
import { getMockUserId } from './auth-handlers'
import { cartStorageLock } from './cart-store'
import {
  createPasswordVerifier,
  derivePasswordVerifier,
  listUsers,
  saveUser,
  toSessionUser,
  userStorageKey,
  type MockUser,
} from './user-store'

function toProfile(user: MockUser): Profile {
  return {
    id: user.id,
    displayName: user.displayName,
    username: user.username,
    email: user.email,
    ensName: user.ensName ?? '',
    walletNickname: user.walletNickname ?? '',
    avatarUrl: user.avatarUrl ?? null,
  }
}

function withProfile(
  request: Request,
  run: (user: MockUser) => Response | Promise<Response>,
) {
  return navigator.locks.request(cartStorageLock, () =>
    navigator.locks.request(userStorageKey, () => {
      const userId = getMockUserId()
      const user = listUsers().find((candidate) => candidate.id === userId)
      const expected = request.headers.get('X-Profile-User')

      if (!user)
        return HttpResponse.json({ code: 'AUTH_REQUIRED' }, { status: 401 })
      if (expected !== null && expected !== user.id) {
        return HttpResponse.json(
          { code: 'PROFILE_SESSION_CHANGED' },
          { status: 409 },
        )
      }

      return run(user)
    }),
  )
}

function validAvatar(value: unknown): value is string | null {
  if (value === null) return true
  if (
    typeof value !== 'string' ||
    value.length > 4 * Math.ceil(avatarMaxBytes / 3) + 32
  )
    return false

  const match = /^data:([^;]+);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value)
  if (!match) return false
  const [, mime, encoded] = match
  if (!avatarTypes.some((type) => type === mime)) return false

  try {
    const bytes = atob(encoded)
    if (bytes.length > avatarMaxBytes) return false
    if (mime === 'image/png') return bytes.startsWith('\x89PNG\r\n\x1a\n')
    if (mime === 'image/jpeg') return bytes.startsWith('\xff\xd8\xff')
    return bytes.startsWith('RIFF') && bytes.slice(8, 12) === 'WEBP'
  } catch {
    return false
  }
}

function validationError(fields: ProfileErrors | PasswordErrors) {
  return HttpResponse.json(
    { code: 'VALIDATION_ERROR', fields },
    { status: 422 },
  )
}

function persist(user: MockUser) {
  try {
    saveUser(user)
  } catch {
    return HttpResponse.json(
      { code: 'PROFILE_STORAGE_UNAVAILABLE' },
      { status: 503 },
    )
  }
}

function field(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

export const profileHandlers = [
  http.get('/api/profile', async ({ request }) => {
    await delay(150)
    return withProfile(request, (user) => HttpResponse.json(toProfile(user)))
  }),

  http.put('/api/profile', async ({ request }) => {
    await delay(300)
    const input = (await request.json().catch(() => null)) as Partial<
      Record<keyof ProfileInput, unknown>
    > | null

    return withProfile(request, (user) => {
      const displayName = field(input?.displayName)
      const username = field(input?.username).toLowerCase()
      const email = field(input?.email).toLowerCase()
      const ensName = field(input?.ensName).toLowerCase()
      const walletNickname = field(input?.walletNickname)
      const avatarUrl = input?.avatarUrl
      const fields: ProfileErrors = {}

      if (displayName.length < 2 || displayName.length > 60) {
        fields.displayName = 'Use de 2 a 60 caracteres no nome de exibição.'
      }
      if (!/^[a-z0-9_]{3,24}$/.test(username)) {
        fields.username = 'Use de 3 a 24 letras, números ou sublinhados.'
      }
      if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        fields.email = 'Informe um e-mail válido.'
      }
      if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(ensName)) {
        fields.ensName =
          'Informe o nome ENS usando letras, números ou hífens internos.'
      }
      if (walletNickname.length < 2 || walletNickname.length > 60) {
        fields.walletNickname =
          'Use de 2 a 60 caracteres no apelido da carteira.'
      }
      if (!validAvatar(avatarUrl)) {
        fields.avatarUrl =
          'Escolha uma imagem PNG, JPEG ou WebP de até 512 KiB.'
      }
      if (Object.keys(fields).length > 0) return validationError(fields)

      const others = listUsers().filter((candidate) => candidate.id !== user.id)
      if (others.some((candidate) => candidate.username === username)) {
        fields.username = 'Este nome de usuário já está em uso.'
      }
      if (others.some((candidate) => candidate.email === email)) {
        fields.email = 'Este e-mail já está cadastrado.'
      }
      if (Object.keys(fields).length > 0) {
        return HttpResponse.json(
          { code: 'ACCOUNT_CONFLICT', fields },
          { status: 409 },
        )
      }

      const next = {
        ...user,
        displayName,
        username,
        email,
        ensName,
        walletNickname,
        avatarUrl: avatarUrl as string | null,
      }
      const failure = persist(next)
      if (failure) return failure

      return HttpResponse.json({
        profile: toProfile(next),
        user: toSessionUser(next),
      })
    })
  }),

  http.put('/api/profile/password', async ({ request }) => {
    await delay(300)
    const input = (await request
      .json()
      .catch(() => null)) as Partial<PasswordInput> | null

    return withProfile(request, async (user) => {
      const currentPassword = input?.currentPassword
      const newPassword =
        typeof input?.newPassword === 'string' ? input.newPassword : ''
      const fields: PasswordErrors = {}

      if (
        typeof currentPassword !== 'string' ||
        !currentPassword ||
        currentPassword.length > 128
      ) {
        fields.currentPassword = 'Informe a senha atual.'
      } else if (
        (await derivePasswordVerifier(currentPassword, user.salt)) !==
        user.verifier
      ) {
        fields.currentPassword = 'A senha atual está incorreta.'
      }

      if (newPassword.length < 8 || newPassword.length > 128) {
        fields.newPassword = 'Use uma senha de 8 a 128 caracteres.'
      } else if (currentPassword === newPassword) {
        fields.newPassword = 'A nova senha deve ser diferente da atual.'
      }
      if (Object.keys(fields).length > 0) return validationError(fields)

      const credentials = await createPasswordVerifier(newPassword)
      // O cálculo do verificador pode terminar após a expiração da sessão.
      if (getMockUserId() !== user.id) {
        return HttpResponse.json({ code: 'AUTH_REQUIRED' }, { status: 401 })
      }

      return (
        persist({ ...user, ...credentials }) ??
        new HttpResponse(null, { status: 204 })
      )
    })
  }),
]
