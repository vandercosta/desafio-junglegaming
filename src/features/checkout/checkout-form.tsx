import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useSearch } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { parseCatalogSearch } from '@/features/catalog/catalog-search'
import {
  getProfile,
  profileQueryKey,
  type Profile,
} from '@/features/profile/profile-api'
import ProfileField from '@/features/profile/profile-field'
import {
  getWallets,
  walletNetworks,
  walletProviders,
  walletsQueryKey,
  type Wallet,
  type Wallets,
} from '@/features/wallets/wallets-api'
import { Button } from '@/components/ui/button'
import {
  checkoutQueryKey,
  connectCheckoutWallet,
  disconnectCheckoutWallet,
  getCheckoutQuote,
  type CheckoutErrorResponse,
  type CheckoutQuote,
  type CheckoutWalletSlot,
  type CollectorInput,
  type OrderInput,
} from './checkout-api'
import {
  readCheckoutDraft,
  saveCheckoutDraft,
  type CheckoutDraft,
} from './checkout-storage'
import CheckoutSummary from './checkout-summary'
import { refreshCheckoutSession } from './checkout-session'

type Failure = CheckoutErrorResponse | null
type WalletOption = { slot: CheckoutWalletSlot; label: string; wallet: Wallet }

type FormProps = {
  userId: string
  failure: Failure
  onConfirm: (input: OrderInput) => void
  onClearFailure: () => void
}

function walletOptions({ primary, secondary }: Wallets): WalletOption[] {
  const options: WalletOption[] = []
  if (primary)
    options.push({
      slot: 'principal',
      label: 'Carteira principal',
      wallet: primary,
    })
  const alternate =
    secondary?.kind === 'independent' ? secondary.wallet : primary
  if (secondary && alternate) {
    options.push({
      slot: 'secundaria',
      label: 'Carteira secundária',
      wallet: alternate,
    })
  }
  return options
}

function initialDraft(
  userId: string,
  profile: Profile,
  options: WalletOption[],
): CheckoutDraft {
  const stored = readCheckoutDraft(userId)
  if (stored) return stored

  const first = options[0]
  return {
    collector: {
      displayName: profile.displayName,
      username: profile.username,
      profileName: profile.displayName,
      email: profile.email,
      ensName: profile.ensName,
      referralCode: first?.wallet.referralCode ?? '',
      note: '',
    },
    walletSlot: first?.slot ?? '',
    network: first?.wallet.network ?? '',
  }
}

export default function CheckoutForm(props: FormProps) {
  const { userId } = props
  const queryClient = useQueryClient()
  const search = useSearch({ from: '/pagamento' })
  const cartSearch = parseCatalogSearch(search)
  const profile = useQuery({
    queryKey: profileQueryKey(userId),
    queryFn: ({ signal }) => getProfile(userId, signal),
    retry: false,
  })
  const wallets = useQuery({
    queryKey: walletsQueryKey(userId),
    queryFn: ({ signal }) => getWallets(userId, signal),
    retry: false,
  })
  const quote = useQuery({
    queryKey: checkoutQueryKey(userId, 'quote'),
    queryFn: ({ signal }) => getCheckoutQuote(userId, signal),
    retry: false,
  })
  const error = profile.error ?? wallets.error ?? quote.error

  useEffect(() => {
    refreshCheckoutSession(error, queryClient)
  }, [error, queryClient])

  if (!profile.data || !wallets.data || !quote.data) {
    if (error) {
      return (
        <section className="grid justify-items-start gap-3">
          <p role="alert">Não foi possível carregar os dados do pagamento.</p>
          <Button
            type="button"
            disabled={
              profile.isFetching || wallets.isFetching || quote.isFetching
            }
            onClick={() => {
              if (!profile.data) void profile.refetch()
              if (!wallets.data) void wallets.refetch()
              if (!quote.data) void quote.refetch()
            }}
          >
            Tentar novamente
          </Button>
        </section>
      )
    }

    return <p role="status">Carregando dados do pagamento…</p>
  }

  if (quote.data.cart.items.length === 0 || quote.data.cart.hasStockConflict) {
    return (
      <section className="grid justify-items-start gap-3">
        <p role="status">
          {quote.data.cart.items.length === 0
            ? 'Seu carrinho está vazio.'
            : 'A disponibilidade mudou. Ajuste as quantidades no carrinho para continuar.'}
        </p>
        <Link to="/carrinho" search={cartSearch} className="underline">
          Voltar ao carrinho
        </Link>
      </section>
    )
  }

  const options = walletOptions(wallets.data)

  if (options.length === 0) {
    return (
      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section className="grid content-start justify-items-start gap-3 rounded-md border p-4">
          <h2 className="text-lg font-semibold">Carteira e rede</h2>
          <p>Cadastre uma carteira na sua conta para continuar.</p>
          <Button asChild>
            <Link to="/perfil/carteiras">Cadastrar carteira</Link>
          </Button>
        </section>
        <CheckoutSummary cart={quote.data.cart} label="Seus NFTs" />
      </div>
    )
  }

  return (
    <>
      {quote.isError && (
        <div className="grid justify-items-start gap-3">
          <p role="alert">Não foi possível conferir a cotação atual.</p>
          <Button
            type="button"
            disabled={quote.isFetching}
            onClick={() => void quote.refetch()}
          >
            Atualizar cotação
          </Button>
        </div>
      )}
      <CheckoutComposer
        {...props}
        profile={profile.data}
        options={options}
        quote={quote.data}
        checkingQuote={quote.isFetching || quote.isError}
      />
    </>
  )
}

const collectorFields = [
  {
    name: 'displayName',
    label: 'Nome de exibição',
    autoComplete: 'name',
    minLength: 2,
    maxLength: 60,
    required: true,
  },
  {
    name: 'username',
    label: 'Nome de usuário',
    autoComplete: 'username',
    minLength: 3,
    maxLength: 24,
    required: true,
  },
  {
    name: 'profileName',
    label: 'Nome do perfil',
    minLength: 2,
    maxLength: 60,
    required: true,
  },
  {
    name: 'email',
    label: 'E-mail',
    autoComplete: 'email',
    type: 'email',
    maxLength: 254,
    required: true,
  },
  {
    name: 'ensName',
    label: 'Nome ENS (opcional)',
    maxLength: 63,
    suffix: '.eth',
  },
  {
    name: 'referralCode',
    label: 'Código de indicação (opcional)',
    maxLength: 32,
  },
] satisfies Array<{
  name: Exclude<keyof CollectorInput, 'note'>
  label: string
  autoComplete?: string
  type?: string
  minLength?: number
  maxLength: number
  required?: boolean
  suffix?: string
}>

type Review = { input: OrderInput; quote: CheckoutQuote; wallet: Wallet }

function CheckoutComposer({
  userId,
  failure,
  onConfirm,
  onClearFailure,
  profile,
  options,
  quote,
  checkingQuote,
}: FormProps & {
  profile: Profile
  options: WalletOption[]
  quote: CheckoutQuote
  checkingQuote: boolean
}) {
  const queryClient = useQueryClient()
  const search = useSearch({ from: '/pagamento' })
  const cartSearch = parseCatalogSearch(search)
  const [draft, setDraft] = useState(() =>
    initialDraft(userId, profile, options),
  )
  const [review, setReview] = useState<Review | null>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const [connectionWallet, setConnectionWallet] = useState<Wallet | null>(null)
  const selected = options.find((option) => option.slot === draft.walletSlot)
  const canConnect = Boolean(
    selected && draft.network === selected.wallet.network,
  )
  const connection = useMutation({
    mutationKey: checkoutQueryKey(userId, 'connect'),
    mutationFn: connectCheckoutWallet.bind(null, userId),
    retry: false,
    onError: (error) => refreshCheckoutSession(error, queryClient),
  })
  const disconnect = useMutation({
    mutationKey: checkoutQueryKey(userId, 'disconnect'),
    mutationFn: disconnectCheckoutWallet.bind(null, userId),
    retry: false,
    onSuccess: () => {
      connection.reset()
      setConnectionWallet(null)
    },
    onError: (error) => refreshCheckoutSession(error, queryClient),
  })
  const changingConnection = connection.isPending || disconnect.isPending
  const needsConnection =
    failure?.code === 'WALLET_CHANGED' ||
    failure?.code === 'WALLET_NOT_CONNECTED'
  const connectionAccepted =
    !needsConnection &&
    canConnect &&
    connection.data?.status === 'connected' &&
    connectionWallet?.address === selected?.wallet.address &&
    connectionWallet?.provider === selected?.wallet.provider &&
    connectionWallet?.network === selected?.wallet.network
  const reviewedQuoteChanged = Boolean(
    review && review.quote.quoteId !== quote.quoteId,
  )

  useEffect(() => {
    if (review) headingRef.current?.focus()
  }, [review])

  function updateDraft(next: CheckoutDraft) {
    setDraft(next)
    saveCheckoutDraft(userId, next)
  }

  function connect() {
    if (
      !selected ||
      draft.network !== selected.wallet.network ||
      changingConnection
    )
      return

    if (needsConnection) onClearFailure()
    disconnect.reset()
    setConnectionWallet(selected.wallet)
    connection.mutate({
      walletSlot: selected.slot,
      network: selected.wallet.network,
    })
  }

  const genericFailure =
    failure && !failure.fields ? failure.message : undefined
  const connectionFailure =
    connection.data?.status === 'refused'
      ? 'A conexão com a carteira foi recusada. Tente novamente.'
      : connection.data?.status === 'disconnected'
        ? 'A carteira foi desconectada. Conecte novamente para continuar.'
        : connection.isError
          ? 'Não foi possível conectar a carteira. Tente novamente.'
          : undefined

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <div className="grid min-w-0 content-start gap-4">
        {genericFailure && (
          <p role="alert" className="text-destructive">
            {genericFailure}
          </p>
        )}
        {review ? (
          <section
            aria-labelledby="review-title"
            className="grid content-start gap-4"
          >
            <h2
              id="review-title"
              ref={headingRef}
              tabIndex={-1}
              className="text-lg font-semibold"
            >
              Revisar compra
            </h2>
            {reviewedQuoteChanged && (
              <p role="alert" className="text-destructive">
                A cotação mudou. Revise o novo total antes de confirmar a
                compra.
              </p>
            )}
            <dl className="grid gap-3 rounded-md border p-4 sm:grid-cols-2">
              <div className="min-w-0">
                <dt className="text-sm text-muted-foreground">Colecionador</dt>
                <dd className="wrap-anywhere">
                  {review.input.collector.displayName}
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="text-sm text-muted-foreground">E-mail</dt>
                <dd className="wrap-anywhere">
                  {review.input.collector.email}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">
                  Carteira e rede
                </dt>
                <dd className="wrap-anywhere">
                  {review.wallet.nickname} ·{' '}
                  {walletProviders[review.wallet.provider]} ·{' '}
                  {walletNetworks[review.wallet.network]}
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="text-sm text-muted-foreground">Endereço</dt>
                <dd className="wrap-anywhere">{review.wallet.address}</dd>
              </div>
              {review.input.collector.note && (
                <div className="min-w-0 sm:col-span-2">
                  <dt className="text-sm text-muted-foreground">Observação</dt>
                  <dd className="wrap-anywhere whitespace-pre-wrap">
                    {review.input.collector.note}
                  </dd>
                </div>
              )}
            </dl>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={reviewedQuoteChanged || checkingQuote}
                onClick={() => {
                  setReview(null)
                  onConfirm(review.input)
                }}
              >
                Confirmar compra
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setReview(null)}
              >
                {reviewedQuoteChanged ? 'Voltar à revisão' : 'Editar dados'}
              </Button>
            </div>
          </section>
        ) : (
          <form
            className="grid min-w-0 gap-6"
            onSubmit={(event) => {
              event.preventDefault()
              if (
                !selected ||
                connection.data?.status !== 'connected' ||
                !connectionAccepted ||
                checkingQuote
              )
                return

              onClearFailure()
              setReview({
                quote,
                wallet: selected.wallet,
                input: {
                  quoteId: quote.quoteId,
                  connectionId: connection.data.connectionId,
                  walletSlot: selected.slot,
                  network: selected.wallet.network,
                  collector: draft.collector,
                },
              })
            }}
          >
            <section aria-labelledby="collector-title" className="grid gap-4">
              <h2 id="collector-title" className="text-lg font-semibold">
                Perfil do colecionador
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {collectorFields.map(({ name, ...props }) => (
                  <ProfileField
                    {...props}
                    key={name}
                    id={`checkout-${name}`}
                    value={draft.collector[name]}
                    message={failure?.fields?.[name]}
                    onChange={(event) =>
                      updateDraft({
                        ...draft,
                        collector: {
                          ...draft.collector,
                          [name]: event.currentTarget.value,
                        },
                      })
                    }
                  />
                ))}
              </div>
              <div className="grid gap-1">
                <label htmlFor="checkout-note">
                  Observação do colecionador (opcional)
                </label>
                <textarea
                  id="checkout-note"
                  value={draft.collector.note}
                  maxLength={500}
                  rows={3}
                  aria-invalid={Boolean(failure?.fields?.note)}
                  aria-describedby={
                    failure?.fields?.note ? 'checkout-note-error' : undefined
                  }
                  onChange={(event) =>
                    updateDraft({
                      ...draft,
                      collector: {
                        ...draft.collector,
                        note: event.currentTarget.value,
                      },
                    })
                  }
                  className="min-w-0 rounded-md border bg-background p-2 focus-visible:outline-2 focus-visible:outline-ring"
                />
                {failure?.fields?.note && (
                  <p
                    id="checkout-note-error"
                    role="alert"
                    className="text-sm text-destructive"
                  >
                    {failure.fields.note}
                  </p>
                )}
              </div>
            </section>

            <section
              aria-labelledby="wallet-title"
              className="grid gap-3 border-t pt-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 id="wallet-title" className="text-lg font-semibold">
                  Carteira e rede
                </h2>
                <Link to="/perfil/carteiras" className="text-sm underline">
                  Gerenciar carteiras
                </Link>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid min-w-0 content-start gap-1">
                  <label htmlFor="checkout-wallet">Carteira</label>
                  <select
                    id="checkout-wallet"
                    required
                    value={draft.walletSlot}
                    disabled={changingConnection}
                    aria-invalid={Boolean(failure?.fields?.walletSlot)}
                    aria-describedby={
                      failure?.fields?.walletSlot
                        ? 'checkout-wallet-error'
                        : undefined
                    }
                    onChange={(event) => {
                      const option = options.find(
                        (entry) => entry.slot === event.currentTarget.value,
                      )
                      connection.reset()
                      disconnect.reset()
                      updateDraft({
                        ...draft,
                        walletSlot: option?.slot ?? '',
                        network: option?.wallet.network ?? '',
                      })
                    }}
                    className="min-w-0 rounded-md border bg-background p-2 focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    <option value="">Selecione uma carteira</option>
                    {options.map(({ slot, label, wallet }) => (
                      <option key={slot} value={slot}>
                        {label} · {wallet.nickname}
                      </option>
                    ))}
                  </select>
                  {failure?.fields?.walletSlot && (
                    <p
                      id="checkout-wallet-error"
                      role="alert"
                      className="text-sm text-destructive"
                    >
                      {failure.fields.walletSlot}
                    </p>
                  )}
                </div>
                <div className="grid min-w-0 content-start gap-1">
                  <label htmlFor="checkout-network">Rede</label>
                  <select
                    id="checkout-network"
                    required
                    value={draft.network}
                    disabled={changingConnection}
                    aria-invalid={Boolean(failure?.fields?.network)}
                    aria-describedby={
                      failure?.fields?.network
                        ? 'checkout-network-error'
                        : undefined
                    }
                    onChange={(event) => {
                      connection.reset()
                      disconnect.reset()
                      updateDraft({
                        ...draft,
                        network: event.currentTarget
                          .value as CheckoutDraft['network'],
                      })
                    }}
                    className="min-w-0 rounded-md border bg-background p-2 focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    <option value="">Selecione uma rede</option>
                    {Object.entries(walletNetworks).map(([id, label]) => (
                      <option key={id} value={id}>
                        {label}
                      </option>
                    ))}
                  </select>
                  {failure?.fields?.network && (
                    <p
                      id="checkout-network-error"
                      role="alert"
                      className="text-sm text-destructive"
                    >
                      {failure.fields.network}
                    </p>
                  )}
                </div>
              </div>
              {selected && (
                <p className="wrap-anywhere text-sm text-muted-foreground">
                  {walletProviders[selected.wallet.provider]} ·{' '}
                  {selected.wallet.address}
                </p>
              )}
              {selected && !canConnect && (
                <p className="text-sm">
                  Selecione {walletNetworks[selected.wallet.network]} para
                  conectar esta carteira.
                </p>
              )}
              {connectionFailure && (
                <p role="alert" className="text-destructive">
                  {connectionFailure}
                </p>
              )}
              {disconnect.isError && (
                <p role="alert" className="text-destructive">
                  Não foi possível desconectar a carteira. Tente novamente.
                </p>
              )}
              {connectionAccepted ? (
                <div className="flex flex-wrap items-center gap-3">
                  <p role="status">Carteira conectada na simulação.</p>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={changingConnection}
                    onClick={() => {
                      if (
                        connection.data?.status === 'connected' &&
                        !changingConnection
                      ) {
                        disconnect.mutate(connection.data.connectionId)
                      }
                    }}
                  >
                    {disconnect.isPending
                      ? 'Desconectando carteira…'
                      : 'Desconectar carteira'}
                  </Button>
                </div>
              ) : (
                <Button
                  className="w-fit"
                  variant="outline"
                  type="button"
                  disabled={!canConnect || changingConnection}
                  onClick={connect}
                >
                  {connection.isPending
                    ? 'Conectando carteira…'
                    : 'Conectar carteira'}
                </Button>
              )}
            </section>

            <Button
              type="submit"
              className="w-fit"
              disabled={
                !connectionAccepted || changingConnection || checkingQuote
              }
            >
              Revisar compra
            </Button>
          </form>
        )}
      </div>
      <aside className="grid min-w-0 content-start gap-3 rounded-md border p-4">
        <CheckoutSummary cart={quote.cart} label="Seus NFTs" />
        <Link to="/carrinho" search={cartSearch} className="text-sm underline">
          Editar itens ou código promocional
        </Link>
      </aside>
    </div>
  )
}
