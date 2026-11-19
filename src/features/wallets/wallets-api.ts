import { catalogOptions } from '@/features/catalog/catalog-search'
import { api } from '@/lib/api'

export const walletNetworks = catalogOptions.network
export const walletProviders = {
  metamask: 'MetaMask',
  walletconnect: 'WalletConnect',
  coinbase: 'Coinbase Wallet',
} as const

export type Wallet = {
  nickname: string
  network: keyof typeof walletNetworks
  provider: keyof typeof walletProviders
  address: string
  ensName: string
  referralCode: string
}

export type SecondaryWallet =
  { kind: 'same-as-primary' } | { kind: 'independent'; wallet: Wallet }

export type Wallets = {
  primary: Wallet | null
  secondary: SecondaryWallet | null
}

export type WalletErrors = Partial<Record<keyof Wallet, string>>
export type WalletChange =
  | { slot: 'principal'; wallet: Wallet }
  | { slot: 'secundaria'; wallet: SecondaryWallet }

export const walletsQueriesKey = ['wallets'] as const

export function walletsQueryKey(userId: string) {
  return [...walletsQueriesKey, userId] as const
}

function walletRequest(userId: string) {
  return { headers: { 'X-Wallets-User': userId } }
}

function validateWallets(data: Wallets) {
  if (
    !data ||
    typeof data !== 'object' ||
    !('primary' in data) ||
    !('secondary' in data)
  ) {
    throw new Error('A API retornou uma lista de carteiras inválida.')
  }
  return data
}

export async function getWallets(userId: string, signal: AbortSignal) {
  const { data } = await api.get<Wallets>('/wallets', {
    ...walletRequest(userId),
    signal,
  })
  return validateWallets(data)
}

export async function saveWallet(userId: string, change: WalletChange) {
  const { data } = await api.put<Wallets>(
    `/wallets/${change.slot}`,
    change.wallet,
    walletRequest(userId),
  )
  return validateWallets(data)
}
