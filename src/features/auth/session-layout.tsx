import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Link,
  Outlet,
  useLocation,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'
import axios from 'axios'
import loginIcon from '@/assets/icons/login.svg'
import { X } from 'lucide-react'
import { Dialog, Tabs } from 'radix-ui'
import { useEffect, useRef, type SubmitEvent, useState } from 'react'
import SiteHeader from '@/components/site-header'
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
import AuthField from './auth-field'
import AuthSocialOptions from './auth-social-options'
import CatalogMobileControls from '@/features/catalog/catalog-mobile-controls'
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
  const isHome = useLocation({
    select: (location) => location.pathname === '/',
  })
  const router = useRouter()
  const [registeredEmail, setRegisteredEmail] = useState('')
  const [authNotice, setAuthNotice] = useState<{
    kind: 'recovery' | 'social'
    message: string
  }>()

  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const brandRef = useRef<HTMLAnchorElement>(null)
  const entryRef = useRef<HTMLButtonElement>(null)
  const authContentRef = useRef<HTMLDivElement>(null)
  const mobileTitleRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    if (authContentRef.current) authContentRef.current.scrollTop = 0
    const title = mobileTitleRef.current
    if (title?.getClientRects().length) title.focus({ preventScroll: true })
  }, [authMode])

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
      hashScrollIntoView: false,
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
      setAuthNotice(undefined)
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

  const creatingAccount = authMode === 'cadastrar'

  function changeAuthMode(value: string) {
    if (authPending || (value !== 'entrar' && value !== 'cadastrar')) return

    login.reset()
    registration.reset()
    setRegisteredEmail('')
    setAuthNotice(undefined)
    setAuthMode(value)
  }

  return (
    <Dialog.Root
      open={authMode !== undefined && !user && sessionQuery.data !== undefined}
      onOpenChange={(open) => {
        if (authPending) return

        login.reset()
        registration.reset()
        setRegisteredEmail('')
        setAuthNotice(undefined)
        setAuthMode(open ? 'entrar' : undefined, !open)
      }}
    >
      <SiteHeader
        brandRef={brandRef}
        cartScope={cartScope}
        mobileCatalog={isHome ? <CatalogMobileControls /> : null}
        account={
          user ? (
            <div className="flex min-w-0 flex-wrap items-center justify-end gap-x-3 gap-y-1 text-sm">
              <p className="max-w-full truncate">{user.displayName}</p>
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
              <Button
                ref={entryRef}
                type="button"
                size="lg"
                className="px-3 lg:ml-4 lg:h-[35px] lg:w-[100px] lg:text-base/none lg:font-medium"
              >
                <img
                  src={loginIcon}
                  alt=""
                  className="size-4 shrink-0 lg:size-5"
                />
                Entrar
              </Button>
            </Dialog.Trigger>
          ) : null
        }
        status={
          <>
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

            {logout.isError && (
              <p role="alert">Não foi possível sair da conta.</p>
            )}
          </>
        }
      />

      <RealtimeProvider
        userId={
          sessionQuery.data === undefined ? undefined : (user?.id ?? null)
        }
      >
        <Outlet />
      </RealtimeProvider>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/20" />

        <Dialog.Content
          ref={authContentRef}
          className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-background px-7 pt-[max(2.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] font-mono text-foreground lg:inset-auto lg:top-1/2 lg:left-1/2 lg:max-h-[calc(100dvh-2rem)] lg:w-[500px] lg:-translate-1/2 lg:rounded-lg lg:border-b-[10px] lg:border-primary lg:bg-surface-card lg:px-0 lg:pt-12 lg:pb-[65px]"
          onEscapeKeyDown={preventDismissWhilePending}
          onInteractOutside={preventDismissWhilePending}
          onCloseAutoFocus={(event) => {
            if (!entryRef.current) {
              event.preventDefault()
              brandRef.current?.focus()
            }
          }}
        >
          <Dialog.Close asChild>
            <button
              type="button"
              aria-label="Fechar"
              disabled={authPending}
              className="absolute top-[max(0.5rem,env(safe-area-inset-top))] right-2 grid size-10 cursor-pointer place-items-center rounded-md text-text-accent focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50 lg:top-1 lg:right-1"
            >
              <X aria-hidden="true" className="size-5" strokeWidth={1.5} />
            </button>
          </Dialog.Close>
          <Dialog.Title className="sr-only">
            {creatingAccount ? 'Criar conta' : 'Entrar'}
          </Dialog.Title>
          <div className="mx-auto max-w-[358px] pt-[clamp(1rem,calc(15dvh-2.5rem),6rem)] text-center lg:hidden">
            <p className="text-[32px]/none font-bold tracking-[0.12em]">
              KURIO
            </p>
            <h2
              ref={mobileTitleRef}
              tabIndex={-1}
              className="mt-[clamp(2rem,10dvh,5.5rem)] text-lg/5 font-bold outline-none"
            >
              {creatingAccount ? 'Criar perfil de colecionador' : 'Entrar'}
            </h2>
          </div>

          <Tabs.Root
            value={authMode ?? 'entrar'}
            activationMode="manual"
            onValueChange={changeAuthMode}
          >
            <Tabs.List
              aria-label="Acesso à conta"
              className="hidden items-center justify-center gap-2 text-xl/5 font-medium lg:flex"
            >
              <Tabs.Trigger
                value="entrar"
                disabled={authPending}
                className="cursor-pointer focus-visible:outline-2 focus-visible:outline-primary data-[state=active]:text-text-accent"
              >
                Entrar
              </Tabs.Trigger>
              <span aria-hidden="true" className="h-5 w-px bg-primary" />
              <Tabs.Trigger
                value="cadastrar"
                disabled={authPending}
                className="cursor-pointer focus-visible:outline-2 focus-visible:outline-primary data-[state=active]:text-text-accent"
              >
                Criar conta
              </Tabs.Trigger>
            </Tabs.List>

            <Dialog.Description className="sr-only lg:not-sr-only lg:mx-auto lg:mt-10 lg:mb-6 lg:max-w-[420px] lg:px-2 lg:text-center lg:text-[13px]/4">
              {creatingAccount
                ? 'Crie seu perfil de colecionador e conecte uma carteira quando quiser.'
                : 'Entre para gerenciar sua carteira, coleção e perfil de criador.'}
            </Dialog.Description>

            <Tabs.Content
              value="entrar"
              className="mx-auto mt-9 max-w-[358px] lg:mt-0 lg:max-w-[340px]"
            >
              {registeredEmail && (
                <p role="status" className="mb-3">
                  Conta criada. Entre com a sua senha.
                </p>
              )}
              <form onSubmit={handleSubmit} className="grid gap-3">
                <AuthField
                  id="login-email"
                  name="email"
                  label="E-mail"
                  placeholder="contato@email.com"
                  type="email"
                  autoComplete="username"
                  defaultValue={registeredEmail}
                  required
                  readOnly={login.isPending}
                />

                <AuthField
                  id="login-password"
                  name="password"
                  label="Senha"
                  placeholder="Senha"
                  type="password"
                  autoComplete="current-password"
                  required
                  readOnly={login.isPending}
                />

                <button
                  type="button"
                  disabled={authPending}
                  onClick={() =>
                    setAuthNotice({
                      kind: 'recovery',
                      message:
                        'A recuperação de senha está indisponível nesta demonstração.',
                    })
                  }
                  className="cursor-pointer justify-self-end text-right text-sm text-text-accent hover:underline focus-visible:outline-2 focus-visible:outline-primary"
                >
                  Esqueceu a senha?
                </button>

                {authNotice?.kind === 'recovery' && (
                  <p
                    role="status"
                    className="text-right text-[13px] text-muted-foreground"
                  >
                    {authNotice.message}
                  </p>
                )}

                {login.isError && (
                  <p role="alert" className="text-sm text-destructive">
                    {invalidCredentials
                      ? 'E-mail ou senha incorretos.'
                      : 'Não foi possível entrar. Tente novamente.'}
                  </p>
                )}

                <Button
                  type="submit"
                  disabled={login.isPending}
                  className="mt-7 h-[60px] w-full cursor-pointer rounded-[10px] text-base font-bold lg:mt-3 lg:h-[45px] lg:rounded-[5px]"
                >
                  {login.isPending ? 'Entrando…' : 'Entrar'}
                </Button>
              </form>
            </Tabs.Content>

            <Tabs.Content
              value="cadastrar"
              className="mx-auto mt-9 max-w-[358px] lg:mt-0 lg:max-w-[340px]"
            >
              <RegisterForm
                pending={registration.isPending}
                errors={registrationErrors}
                hasError={registration.isError}
                onSubmit={(input) => registration.mutate(input)}
              />
            </Tabs.Content>
          </Tabs.Root>
          <AuthSocialOptions
            onSelect={(provider) =>
              setAuthNotice({
                kind: 'social',
                message: `O acesso com ${provider} está indisponível nesta demonstração.`,
              })
            }
          />
          {authNotice?.kind === 'social' && (
            <p
              role="status"
              className="mx-auto mt-4 max-w-[340px] text-center text-[13px] text-muted-foreground"
            >
              {authNotice.message}
            </p>
          )}
          <p className="mt-[clamp(1.5rem,calc(24dvh-11rem),2.5rem)] text-center text-sm text-muted-foreground lg:hidden">
            {creatingAccount ? 'Já tem uma conta? ' : 'Novo na Kurio? '}
            <button
              type="button"
              disabled={authPending}
              onClick={() =>
                changeAuthMode(creatingAccount ? 'entrar' : 'cadastrar')
              }
              className="cursor-pointer hover:underline focus-visible:outline-2 focus-visible:outline-primary"
            >
              {creatingAccount ? 'Entre' : 'Crie uma conta'}
            </button>
          </p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
