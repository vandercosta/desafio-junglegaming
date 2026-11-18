import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Outlet, useLocation, useNavigate } from '@tanstack/react-router'
import axios from 'axios'
import { Dialog } from 'radix-ui'
import { useRef, type SubmitEvent } from 'react'
import { Button } from '@/components/ui/button'
import {
  getSession,
  sessionQueryKey,
  signIn,
  signOut,
  type Session,
  type SessionState,
} from './auth-api'

export default function SessionLayout() {
  const loginRequested = useLocation({
    select: (location) => location.search.auth === 'entrar',
  })
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const brandRef = useRef<HTMLParagraphElement>(null)
  const entryRef = useRef<HTMLButtonElement>(null)

  const sessionQuery = useQuery({
    queryKey: sessionQueryKey,
    queryFn: ({ signal }) => getSession(signal),
    retry: false,
  })

  const user = sessionQuery.data?.session?.user

  function setLoginOpen(open: boolean) {
    void navigate({
      to: '.',
      search: (previous) => ({
        ...previous,
        auth: open ? 'entrar' : undefined,
      }),
      hash: true,
      replace: !open,
      resetScroll: false,
    })
  }

  async function updateSession(session: Session | null) {
    await queryClient.cancelQueries({
      queryKey: sessionQueryKey,
      exact: true,
    })

    queryClient.setQueryData<SessionState>(sessionQueryKey, {
      session,
      expired: false,
    })
  }

  const login = useMutation({
    mutationFn: signIn,
    retry: false,
    gcTime: 0,
    onSuccess: async (session) => {
      await updateSession(session)
      setLoginOpen(false)
    },
  })

  const logout = useMutation({
    mutationFn: signOut,
    retry: false,
    onSuccess: async () => {
      await updateSession(null)
      if (loginRequested) setLoginOpen(false)
    },
  })

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (login.isPending) return

    const fields = new FormData(event.currentTarget)

    login.mutate({
      email: String(fields.get('email') ?? ''),
      password: String(fields.get('password') ?? ''),
    })
  }

  function preventDismissWhilePending(event: Event) {
    if (login.isPending) event.preventDefault()
  }

  const invalidCredentials =
    axios.isAxiosError<{ code?: string }>(login.error) &&
    login.error.response?.data?.code === 'INVALID_CREDENTIALS'

  return (
    <Dialog.Root
      open={loginRequested && !user && sessionQuery.data !== undefined}
      onOpenChange={(open) => {
        if (login.isPending) return
        login.reset()
        setLoginOpen(open)
      }}
    >
      <header className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-4">
        <p ref={brandRef} tabIndex={-1} className="font-semibold">
          Kurio
        </p>

        {sessionQuery.isPending && <p role="status">Verificando sessão…</p>}

        {sessionQuery.isError && (
          <div>
            <p role="alert">Não foi possível consultar a sessão.</p>
            <Button
              type="button"
              disabled={sessionQuery.isFetching}
              onClick={() => void sessionQuery.refetch()}
            >
              Tentar novamente
            </Button>
          </div>
        )}

        {sessionQuery.data?.expired && (
          <p role="alert">Sua sessão expirou. Entre novamente.</p>
        )}

        {user ? (
          <div className="flex items-center gap-3">
            <p>{user.displayName}</p>
            <Button
              type="button"
              disabled={logout.isPending}
              onClick={() => logout.mutate()}
            >
              {logout.isPending ? 'Saindo…' : 'Sair'}
            </Button>
          </div>
        ) : sessionQuery.data !== undefined ? (
          <Dialog.Trigger asChild>
            <Button ref={entryRef} type="button">
              Entrar
            </Button>
          </Dialog.Trigger>
        ) : null}

        {logout.isError && <p role="alert">Não foi possível sair da conta.</p>}
      </header>

      <Outlet />

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/70" />

        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 grid max-h-[calc(100dvh_-_2rem)] w-[calc(100%_-_2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 gap-4 overflow-y-auto rounded-lg border bg-card p-6 text-card-foreground"
          onEscapeKeyDown={preventDismissWhilePending}
          onInteractOutside={preventDismissWhilePending}
          onCloseAutoFocus={(event) => {
            if (!entryRef.current) {
              event.preventDefault()
              brandRef.current?.focus()
            }
          }}
        >
          <Dialog.Title className="text-xl font-semibold">Entrar</Dialog.Title>
          <Dialog.Description>
            Entre na sua conta de colecionador.
          </Dialog.Description>

          <form onSubmit={handleSubmit} className="grid gap-3">
            <label htmlFor="login-email">E-mail</label>
            <input
              id="login-email"
              name="email"
              type="email"
              autoComplete="username"
              required
              readOnly={login.isPending}
              className="rounded-md border p-2"
            />

            <label htmlFor="login-password">Senha</label>
            <input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              readOnly={login.isPending}
              className="rounded-md border p-2"
            />

            {login.isError && (
              <p role="alert">
                {invalidCredentials
                  ? 'E-mail ou senha incorretos.'
                  : 'Não foi possível entrar. Tente novamente.'}
              </p>
            )}

            <div className="flex flex-wrap justify-end gap-2">
              <Dialog.Close asChild>
                <Button
                  type="button"
                  variant="outline"
                  disabled={login.isPending}
                >
                  Cancelar
                </Button>
              </Dialog.Close>

              <Button type="submit" disabled={login.isPending}>
                {login.isPending ? 'Entrando…' : 'Entrar'}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
