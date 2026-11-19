import { useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { useState, type ChangeEvent, type SubmitEvent } from 'react'
import { sessionQueryKey, type SessionState } from '@/features/auth/auth-api'
import { Button } from '@/components/ui/button'
import {
  avatarMaxBytes,
  avatarTypes,
  changePassword,
  profileQueryKey,
  saveProfile,
  type PasswordErrors,
  type Profile,
  type ProfileErrors,
  type ProfileInput,
} from './profile-api'
import ProfileField from './profile-field'

function fieldErrors<T>(error: unknown) {
  return axios.isAxiosError<{ fields?: T }>(error)
    ? error.response?.data?.fields
    : undefined
}

function sessionChanged(error: unknown) {
  return (
    axios.isAxiosError<{ code?: string }>(error) &&
    (error.response?.status === 401 ||
      error.response?.data?.code === 'PROFILE_SESSION_CHANGED')
  )
}

const profileFields = [
  { name: 'displayName', label: 'Nome de exibição', autoComplete: 'nickname' },
  { name: 'username', label: 'Nome de usuário', autoComplete: 'username' },
  { name: 'email', label: 'E-mail', type: 'email', autoComplete: 'email' },
  { name: 'ensName', label: 'Nome ENS', suffix: '.eth' },
  { name: 'walletNickname', label: 'Apelido da carteira' },
] as const

function readImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export function ProfileForm({ profile }: { profile: Profile }) {
  const [draft, setDraft] = useState<ProfileInput>(profile)
  const [readingAvatar, setReadingAvatar] = useState(false)
  const [avatarError, setAvatarError] = useState('')
  const queryClient = useQueryClient()
  const queryKey = profileQueryKey(profile.id)

  const save = useMutation({
    mutationKey: queryKey,
    mutationFn: (input: ProfileInput) => saveProfile(profile.id, input),
    retry: false,
    onSuccess: async ({ profile: next, user }) => {
      const previous = queryClient.getQueryData<SessionState>(sessionQueryKey)
      if (previous?.session?.user.id !== profile.id) return

      await Promise.all([
        queryClient.cancelQueries({ queryKey, exact: true }),
        queryClient.cancelQueries({ queryKey: sessionQueryKey, exact: true }),
      ])
      const current = queryClient.getQueryData<SessionState>(sessionQueryKey)
      if (current?.session?.user.id !== profile.id) return

      queryClient.setQueryData(queryKey, next)
      queryClient.setQueryData(sessionQueryKey, {
        ...current,
        session: { ...current.session, user },
      })
      setDraft(next)
    },
    onError: (error) => {
      if (sessionChanged(error))
        void queryClient.invalidateQueries({ queryKey: sessionQueryKey })
    },
  })

  const errors = fieldErrors<ProfileErrors>(save.error)
  const avatarMessage = avatarError || errors?.avatarUrl
  const pending = save.isPending || readingAvatar

  function updateField<K extends keyof ProfileInput>(
    key: K,
    value: ProfileInput[K],
  ) {
    setDraft((current) => ({ ...current, [key]: value }))
    save.reset()
  }

  async function selectAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (!file) return

    setAvatarError('')
    save.reset()
    if (
      !avatarTypes.some((type) => type === file.type) ||
      file.size > avatarMaxBytes ||
      file.size === 0
    ) {
      setAvatarError('Escolha uma imagem PNG, JPEG ou WebP de até 512 KiB.')
      return
    }

    setReadingAvatar(true)
    try {
      const url = await readImage(file)
      const image = new Image()
      image.src = url
      await image.decode()
      updateField('avatarUrl', url)
    } catch {
      setAvatarError('Não foi possível ler esta imagem.')
    } finally {
      setReadingAvatar(false)
    }
  }

  return (
    <form
      className="grid gap-5"
      onSubmit={(event) => {
        event.preventDefault()
        if (!pending && !avatarError) {
          const {
            displayName,
            username,
            email,
            ensName,
            walletNickname,
            avatarUrl,
          } = draft
          save.mutate({
            displayName,
            username,
            email,
            ensName,
            walletNickname,
            avatarUrl,
          })
        }
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {profileFields.map(({ name, label, ...options }) => (
          <ProfileField
            key={name}
            id={`profile-${name}`}
            label={label}
            {...options}
            required
            readOnly={pending}
            value={draft[name]}
            message={errors?.[name]}
            onChange={(event) => updateField(name, event.currentTarget.value)}
          />
        ))}

        <div className="grid content-start gap-2">
          <label htmlFor="profile-avatar">Alterar avatar</label>
          {draft.avatarUrl && (
            <img
              src={draft.avatarUrl}
              alt="Avatar do colecionador"
              width="64"
              height="64"
              className="size-16 rounded-full object-cover"
            />
          )}
          <input
            id="profile-avatar"
            type="file"
            accept={avatarTypes.join(',')}
            disabled={pending}
            onChange={(event) => void selectAvatar(event)}
            aria-invalid={Boolean(avatarMessage)}
            aria-describedby={
              avatarMessage ? 'avatar-error avatar-formats' : 'avatar-formats'
            }
            className="w-full rounded-md border p-2 text-sm file:mr-2 focus-visible:outline-2 focus-visible:outline-ring"
          />
          <p id="avatar-formats" className="text-sm text-muted-foreground">
            PNG, JPEG ou WebP de até 512 KiB.
          </p>
          {avatarMessage && (
            <p
              id="avatar-error"
              role="alert"
              className="text-sm text-destructive"
            >
              {avatarMessage}
            </p>
          )}
          {(draft.avatarUrl || avatarMessage) && (
            <Button
              type="button"
              variant="outline"
              className="w-fit"
              disabled={pending}
              onClick={() => {
                setAvatarError('')
                updateField('avatarUrl', avatarMessage ? draft.avatarUrl : null)
              }}
            >
              {avatarMessage ? 'Descartar seleção' : 'Remover avatar'}
            </Button>
          )}
        </div>
      </div>
      {save.isSuccess && <p role="status">Perfil atualizado.</p>}
      {save.isError && !errors && (
        <p role="alert">Não foi possível salvar o perfil. Tente novamente.</p>
      )}
      <Button
        type="submit"
        disabled={pending || Boolean(avatarError)}
        className="w-fit"
      >
        {save.isPending ? 'Salvando…' : 'Salvar perfil'}
      </Button>
    </form>
  )
}

export function PasswordForm({ userId }: { userId: string }) {
  const [confirmationError, setConfirmationError] = useState('')
  const queryClient = useQueryClient()
  const change = useMutation({
    mutationKey: profileQueryKey(userId),
    mutationFn: ({
      currentPassword,
      newPassword,
    }: {
      currentPassword: string
      newPassword: string
    }) => changePassword(userId, { currentPassword, newPassword }),
    retry: false,
    gcTime: 0,
    onError: (error) => {
      if (sessionChanged(error))
        void queryClient.invalidateQueries({ queryKey: sessionQueryKey })
    },
  })
  const errors = fieldErrors<PasswordErrors>(change.error)

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (change.isPending) return
    const form = event.currentTarget
    const data = new FormData(form)
    const currentPassword = String(data.get('currentPassword') ?? '')
    const newPassword = String(data.get('newPassword') ?? '')

    if (newPassword !== data.get('confirmation')) {
      setConfirmationError('As senhas precisam ser iguais.')
      return
    }

    setConfirmationError('')
    try {
      await change.mutateAsync({ currentPassword, newPassword })
      form.reset()
    } catch {
      // A mutation exibe os erros nos campos.
    }
  }

  return (
    <form
      className="grid max-w-md gap-4"
      onSubmit={(event) => void submit(event)}
      onChange={() => {
        setConfirmationError('')
        if (change.isError || change.isSuccess) change.reset()
      }}
    >
      <h2 className="text-lg font-semibold">Alterar senha</h2>
      <ProfileField
        id="current-password"
        name="currentPassword"
        label="Senha atual"
        type="password"
        autoComplete="current-password"
        required
        readOnly={change.isPending}
        message={errors?.currentPassword}
      />
      <ProfileField
        id="new-password"
        name="newPassword"
        label="Nova senha"
        type="password"
        autoComplete="new-password"
        required
        readOnly={change.isPending}
        message={errors?.newPassword}
      />
      <ProfileField
        id="confirm-password"
        name="confirmation"
        label="Confirmar nova senha"
        type="password"
        autoComplete="new-password"
        required
        readOnly={change.isPending}
        message={confirmationError}
      />
      {change.isSuccess && <p role="status">Senha alterada.</p>}
      {change.isError && !errors && (
        <p role="alert">Não foi possível alterar a senha. Tente novamente.</p>
      )}
      <Button type="submit" disabled={change.isPending} className="w-fit">
        {change.isPending ? 'Alterando…' : 'Salvar nova senha'}
      </Button>
    </form>
  )
}
