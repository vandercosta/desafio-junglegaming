import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Link,
  Outlet,
  useLocation,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'
import axios from 'axios'
import { Dialog, Tabs } from 'radix-ui'
import { useEffect, useRef, type SubmitEvent, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  sessionQueryOptions,
  sessionQueryKey,
  signIn,
  signOut,
  registerAccount,
  type RegisterErrors,
  type Session,
  type SessionState,
} from './auth-api'
import RegisterForm from './register-form'
import { cartQueriesKey } from '@/features/cart/cart-api'
import { getCartScope } from '@/features/cart/cart-session'
import { favoritesQueriesKey } from '@/features/favorites/favorites-api'
import { profileQueriesKey } from '@/features/profile/profile-api'
import { walletsQueriesKey } from '@/features/wallets/wallets-api'
import { checkoutQueriesKey } from '@/features/checkout/checkout-api'
import RealtimeProvider from '@/features/realtime/realtime-provider'

export default function SessionLayout() {
  const authMode = useLocation({
    select: (location) => location.search.auth,
  })
  const router = useRouter()
  const [registeredEmail, setRegisteredEmail] = useState('')

  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const brandRef = useRef<HTMLParagraphElement>(null)
  const entryRef = useRef<HTMLButtonElement>(null)

  const sessionQuery = useQuery(sessionQueryOptions)
  const session = sessionQuery.data?.session
  const user = session?.user
  const cartScope = getCartScope(sessionQuery.data)

  useEffect(() => {
    function clearOtherAccounts(
      queryKey: readonly string[],
      activeScope?: string,
    ) {
      queryClient.removeQueries({
        queryKey,
        predicate: (query) => query.queryKey[1] !== activeScope,
      })

      const mutations = queryClient.getMutationCache()
      for (const mutation of mutations.findAll({ mutationKey: queryKey })) {
        if (mutation.options.mutationKey?.[1] !== activeScope) {
          mutations.remove(mutation)
        }
      }
    }

    clearOtherAccounts(cartQueriesKey, cartScope)
    clearOtherAccounts(favoritesQueriesKey, user?.id)
    clearOtherAccounts(profileQueriesKey, user?.id)
    clearOtherAccounts(walletsQueriesKey, user?.id)
    clearOtherAccounts(checkoutQueriesKey, user?.id)
  }, [cartScope, queryClient, user?.id])

  useEffect(() => {
    if (!session) return

    const timeout = window.setTimeout(
      () => void queryClient.invalidateQueries({ queryKey: sessionQueryKey }),
      Math.max(0, Date.parse(session.expiresAt) - Date.now()),
    )

    return () => window.clearTimeout(timeout)
  }, [session, queryClient])

  function setAuthMode(
    mode: 'entrar' | 'cadastrar' | undefined,
    replace = true,
  ) {
    void navigate({
      to: '.',
      search: (previous) => ({ ...previous, auth: mode }),
      hash: true,
      replace,
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
      setAuthMode(undefined)
    },
  })

  const logout = useMutation({
    mutationFn: signOut,
    retry: false,
    onSuccess: async () => {
      await updateSession(null)
      if (authMode === 'entrar') setAuthMode(undefined)
    },
  })

  const registration = useMutation({
    mutationFn: registerAccount,
    retry: false,
    gcTime: 0,
    onSuccess: (email) => {
      if (router.state.location.search.auth !== 'cadastrar') return

      setRegisteredEmail(email)
      setAuthMode('entrar')
    },
  })

  const authPending = login.isPending || registration.isPending

  const registrationErrors = axios.isAxiosError<{ fields?: RegisterErrors }>(
    registration.error,
  )
    ? registration.error.response?.data?.fields
    : undefined

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
    if (authPending) event.preventDefault()
  }

  const invalidCredentials =
    axios.isAxiosError<{ code?: string }>(login.error) &&
    login.error.response?.data?.code === 'INVALID_CREDENTIALS'

  return (
    <Dialog.Root
      open={authMode !== undefined && !user && sessionQuery.data !== undefined}
      onOpenChange={(open) => {
        if (authPending) return

        login.reset()
        registration.reset()
        setRegisteredEmail('')
        setAuthMode(open ? 'entrar' : undefined, !open)
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
          <div className="flex flex-wrap items-center gap-3">
            <p>{user.displayName}</p>
            <Link to="/perfil" className="underline">
              Meu perfil
            </Link>
            <Link to="/favoritos" className="underline">
              Lista de interesse
            </Link>
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

      <RealtimeProvider
        userId={
          sessionQuery.data === undefined ? undefined : (user?.id ?? null)
        }
      >
        <Outlet />
      </RealtimeProvider>

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
          <Dialog.Title className="sr-only">
            {authMode === 'cadastrar' ? 'Criar conta' : 'Entrar'}
          </Dialog.Title>
          <Dialog.Description>
            {authMode === 'cadastrar'
              ? 'Crie seu perfil de colecionador.'
              : 'Entre na sua conta de colecionador.'}
          </Dialog.Description>

          <Tabs.Root
            value={authMode ?? 'entrar'}
            activationMode="manual"
            onValueChange={(value) => {
              if (authPending || (value !== 'entrar' && value !== 'cadastrar'))
                return

              login.reset()
              registration.reset()
              setRegisteredEmail('')
              setAuthMode(value)
            }}
          >
            <Tabs.List aria-label="Acesso à conta" className="mb-4 flex gap-2">
              <Tabs.Trigger value="entrar" disabled={authPending} asChild>
                <Button variant={authMode === 'entrar' ? 'default' : 'ghost'}>
                  Entrar
                </Button>
              </Tabs.Trigger>
              <Tabs.Trigger value="cadastrar" disabled={authPending} asChild>
                <Button
                  variant={authMode === 'cadastrar' ? 'default' : 'ghost'}
                >
                  Criar conta
                </Button>
              </Tabs.Trigger>
            </Tabs.List>

            <Tabs.Content value="entrar">
              {registeredEmail && (
                <p role="status" className="mb-3">
                  Conta criada. Entre com a sua senha.
                </p>
              )}
              {
                <form onSubmit={handleSubmit} className="grid gap-3">
                  <label htmlFor="login-email">E-mail</label>
                  <input
                    id="login-email"
                    name="email"
                    type="email"
                    autoComplete="username"
                    defaultValue={registeredEmail}
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
              }
            </Tabs.Content>

            <Tabs.Content value="cadastrar">
              <RegisterForm
                pending={registration.isPending}
                errors={registrationErrors}
                hasError={registration.isError}
                onSubmit={(input) => registration.mutate(input)}
              />
            </Tabs.Content>
          </Tabs.Root>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
