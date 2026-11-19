import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import axios from 'axios'
import { useState } from 'react'
import {
  sessionQueryKey,
  sessionQueryOptions,
  type SessionState,
} from '@/features/auth/auth-api'
import { Button } from '@/components/ui/button'
import WalletForm from './wallet-form'
import {
  getWallets,
  saveWallet,
  walletNetworks,
  walletProviders,
  walletsQueryKey,
  type Wallet,
  type WalletChange,
  type WalletErrors,
} from './wallets-api'

export default function WalletsPage() {
  const session = useQuery(sessionQueryOptions)
  const userId = session.data?.session?.user.id

  return (
    <section
      aria-labelledby="wallets-heading"
      className="grid min-w-0 content-start gap-6"
    >
      <h1 id="wallets-heading" className="text-2xl font-semibold">
        Carteiras
      </h1>
      {userId ? (
        <AccountWallets key={userId} userId={userId} />
      ) : session.data !== undefined ? (
        <Button asChild className="w-fit">
          <Link to="/perfil/carteiras" search={{ auth: 'entrar' }}>
            Entrar para ver as carteiras
          </Link>
        </Button>
      ) : null}
    </section>
  )
}

const slots = [
  { id: 'principal', title: 'Carteira principal' },
  { id: 'secundaria', title: 'Carteira secundária' },
] as const

function AccountWallets({ userId }: { userId: string }) {
  const [editing, setEditing] = useState<WalletChange['slot'] | null>(null)
  const queryClient = useQueryClient()
  const queryKey = walletsQueryKey(userId)
  const query = useQuery({
    queryKey,
    queryFn: ({ signal }) => getWallets(userId, signal),
    retry: false,
  })
  const save = useMutation({
    mutationKey: queryKey,
    mutationFn: (change: WalletChange) => saveWallet(userId, change),
    retry: false,
    onSuccess: async (wallets) => {
      await queryClient.cancelQueries({ queryKey, exact: true })
      if (
        queryClient.getQueryData<SessionState>(sessionQueryKey)?.session?.user
          .id !== userId
      )
        return
      queryClient.setQueryData(queryKey, wallets)
      setEditing(null)
    },
    onError: (error) => {
      if (
        axios.isAxiosError<{ code?: string }>(error) &&
        (error.response?.status === 401 ||
          error.response?.data?.code === 'WALLET_SESSION_CHANGED')
      ) {
        void queryClient.invalidateQueries({ queryKey: sessionQueryKey })
      }
    },
  })

  if (query.isPending) return <p role="status">Carregando carteiras…</p>
  if (!query.data) {
    return (
      <div className="grid gap-2">
        <p role="alert">Não foi possível carregar as carteiras.</p>
        <Button
          type="button"
          className="w-fit"
          disabled={query.isFetching}
          onClick={() => void query.refetch()}
        >
          Tentar novamente
        </Button>
      </div>
    )
  }

  const { primary, secondary } = query.data
  const failure = axios.isAxiosError<{
    fields?: WalletErrors
    message?: string
  }>(save.error)
    ? save.error.response?.data
    : undefined

  return (
    <>
      {save.isSuccess && <p role="status">Carteira salva.</p>}
      {slots.map(({ id, title }) => {
        const usesPrimary =
          id === 'secundaria' && secondary?.kind === 'same-as-primary'
        const wallet =
          id === 'principal' || usesPrimary
            ? primary
            : secondary?.kind === 'independent'
              ? secondary.wallet
              : null

        return (
          <section
            key={id}
            aria-labelledby={`wallet-heading-${id}`}
            className="grid gap-3 border-t pt-4"
          >
            <h2 id={`wallet-heading-${id}`} className="text-lg font-semibold">
              {title}
            </h2>
            {editing === id ? (
              <WalletForm
                slot={id}
                wallet={usesPrimary ? undefined : (wallet ?? undefined)}
                usesPrimary={usesPrimary}
                hasPrimary={primary !== null}
                pending={save.isPending}
                errors={failure?.fields}
                error={
                  save.isError && !failure?.fields
                    ? (failure?.message ??
                      'Não foi possível salvar a carteira. Tente novamente.')
                    : undefined
                }
                onSave={(change) => save.mutate(change)}
                onCancel={() => {
                  save.reset()
                  setEditing(null)
                }}
              />
            ) : (
              <>
                {usesPrimary && <p>Usando os dados da carteira principal.</p>}
                {wallet ? (
                  <WalletSummary wallet={wallet} />
                ) : (
                  <p>Nenhuma carteira cadastrada.</p>
                )}
                <Button
                  type="button"
                  variant="outline"
                  className="w-fit"
                  disabled={editing !== null}
                  onClick={() => {
                    save.reset()
                    setEditing(id)
                  }}
                >
                  {wallet ? 'Editar carteira' : 'Adicionar carteira'}
                </Button>
              </>
            )}
          </section>
        )
      })}
    </>
  )
}

function WalletSummary({ wallet }: { wallet: Wallet }) {
  return (
    <dl className="grid min-w-0 gap-3 rounded-md border p-3 sm:grid-cols-2">
      <div>
        <dt>Apelido da carteira</dt>
        <dd className="wrap-anywhere">{wallet.nickname}</dd>
      </div>
      <div>
        <dt>Rede</dt>
        <dd>{walletNetworks[wallet.network]}</dd>
      </div>
      <div className="min-w-0">
        <dt>Endereço da carteira</dt>
        <dd className="wrap-anywhere">{wallet.address}</dd>
      </div>
      <div>
        <dt>Tipo de carteira</dt>
        <dd>{walletProviders[wallet.provider]}</dd>
      </div>
      {wallet.ensName && (
        <div>
          <dt>Nome ENS</dt>
          <dd className="wrap-anywhere">{wallet.ensName}.eth</dd>
        </div>
      )}
      {wallet.referralCode && (
        <div>
          <dt>Código de indicação</dt>
          <dd className="wrap-anywhere">{wallet.referralCode}</dd>
        </div>
      )}
    </dl>
  )
}
