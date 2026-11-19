import { delay, http, HttpResponse } from 'msw'
import {
  walletNetworks,
  walletProviders,
  type Wallet,
  type WalletErrors,
  type Wallets,
} from '@/features/wallets/wallets-api'
import { getMockUserId } from './auth-handlers'
import { cartStorageLock } from './cart-store'

const storagePrefix = 'kurio:wallets:v1:'
const base58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'

export function readWallets(userId: string): Wallets {
  try {
    const data = JSON.parse(
      localStorage.getItem(`${storagePrefix}${userId}`) ?? 'null',
    ) as Partial<Wallets> | null
    return {
      primary: data?.primary ?? null,
      secondary: data?.secondary ?? null,
    }
  } catch {
    return { primary: null, secondary: null }
  }
}

function withWallets(
  request: Request,
  run: (key: string, wallets: Wallets) => Response,
) {
  return navigator.locks.request(cartStorageLock, () => {
    const userId = getMockUserId()
    const expected = request.headers.get('X-Wallets-User')

    if (!userId)
      return HttpResponse.json({ code: 'AUTH_REQUIRED' }, { status: 401 })
    if (expected !== null && expected !== userId) {
      return HttpResponse.json(
        { code: 'WALLET_SESSION_CHANGED' },
        { status: 409 },
      )
    }

    const key = `${storagePrefix}${userId}`
    return run(key, readWallets(userId))
  })
}

function validAddress(address: string, network: Wallet['network']) {
  if (network !== 'solana') return /^0x[0-9a-fA-F]{40}$/.test(address)
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) return false

  let value = 0n
  for (const char of address) value = value * 58n + BigInt(base58.indexOf(char))
  const leadingZeroes = address.match(/^1*/)?.[0].length ?? 0
  const bytes = value === 0n ? 0 : Math.ceil(value.toString(16).length / 2)

  return bytes + leadingZeroes === 32
}

function readWallet(
  input: unknown,
): { wallet: Wallet } | { fields: WalletErrors } {
  const raw =
    typeof input === 'object' && input !== null
      ? (input as Partial<Record<keyof Wallet, unknown>>)
      : {}

  const nickname = typeof raw.nickname === 'string' ? raw.nickname.trim() : ''
  const address = typeof raw.address === 'string' ? raw.address.trim() : ''
  const ensName =
    typeof raw.ensName === 'string' ? raw.ensName.trim().toLowerCase() : ''
  const referralCode =
    typeof raw.referralCode === 'string' ? raw.referralCode.trim() : ''
  const network =
    typeof raw.network === 'string' &&
    Object.hasOwn(walletNetworks, raw.network)
      ? (raw.network as Wallet['network'])
      : undefined
  const provider =
    typeof raw.provider === 'string' &&
    Object.hasOwn(walletProviders, raw.provider)
      ? (raw.provider as Wallet['provider'])
      : undefined

  const fields: WalletErrors = {}
  if (nickname.length < 2 || nickname.length > 60)
    fields.nickname = 'Use de 2 a 60 caracteres no apelido.'
  if (!network) fields.network = 'Selecione uma rede.'
  if (!provider) fields.provider = 'Selecione um tipo de carteira.'
  if (!address) fields.address = 'Informe o endereço público da carteira.'
  else if (network && !validAddress(address, network)) {
    fields.address =
      network === 'solana'
        ? 'Informe um endereço Solana válido em Base58.'
        : 'Informe um endereço 0x com 40 caracteres hexadecimais.'
  }
  if (ensName && !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(ensName)) {
    fields.ensName = 'Informe apenas o nome ENS, sem o sufixo .eth.'
  }
  if (referralCode.length > 32)
    fields.referralCode = 'Use até 32 caracteres no código de indicação.'

  if (!network || !provider || Object.keys(fields).length > 0) return { fields }
  return {
    wallet: { nickname, network, provider, address, ensName, referralCode },
  }
}

function sameAddress(left: Wallet, right: Wallet | null) {
  if (!right || left.network !== right.network) return false

  return left.network === 'solana'
    ? left.address === right.address
    : left.address.toLowerCase() === right.address.toLowerCase()
}

function saveWallets(key: string, next: Wallets) {
  try {
    localStorage.setItem(key, JSON.stringify(next))
    return HttpResponse.json(next)
  } catch {
    return HttpResponse.json(
      { code: 'WALLET_STORAGE_UNAVAILABLE' },
      { status: 503 },
    )
  }
}

export const walletHandlers = [
  http.get('/api/wallets', async ({ request }) => {
    await delay(150)
    return withWallets(request, (_key, wallets) => HttpResponse.json(wallets))
  }),

  http.put('/api/wallets/:slot', async ({ request, params }) => {
    await delay(300)
    const input: unknown = await request.json().catch(() => null)

    return withWallets(request, (key, wallets) => {
      const { slot } = params
      if (slot !== 'principal' && slot !== 'secundaria') {
        return HttpResponse.json(
          { code: 'WALLET_SLOT_NOT_FOUND' },
          { status: 404 },
        )
      }

      const secondary =
        typeof input === 'object' && input !== null
          ? (input as { kind?: unknown; wallet?: unknown })
          : null

      if (slot === 'secundaria' && secondary?.kind === 'same-as-primary') {
        if (!wallets.primary) {
          return HttpResponse.json(
            {
              code: 'PRIMARY_REQUIRED',
              message:
                'Cadastre a carteira principal antes de usar os mesmos dados.',
            },
            { status: 409 },
          )
        }
        return saveWallets(key, {
          ...wallets,
          secondary: { kind: 'same-as-primary' },
        })
      }

      if (slot === 'secundaria' && secondary?.kind !== 'independent') {
        return HttpResponse.json({ code: 'VALIDATION_ERROR' }, { status: 422 })
      }

      const result = readWallet(
        slot === 'principal' ? input : secondary?.wallet,
      )
      if ('fields' in result) {
        return HttpResponse.json(
          { code: 'VALIDATION_ERROR', fields: result.fields },
          { status: 422 },
        )
      }

      const { wallet } = result
      const other =
        slot === 'principal'
          ? wallets.secondary?.kind === 'independent'
            ? wallets.secondary.wallet
            : null
          : wallets.primary
      if (sameAddress(wallet, other)) {
        return HttpResponse.json(
          {
            code: 'WALLET_ADDRESS_CONFLICT',
            fields: {
              address:
                'Este endereço já está salvo na outra carteira desta rede.',
            },
          },
          { status: 409 },
        )
      }

      return saveWallets(
        key,
        slot === 'principal'
          ? { ...wallets, primary: wallet }
          : { ...wallets, secondary: { kind: 'independent', wallet } },
      )
    })
  }),
]
