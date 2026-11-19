import { Link } from '@tanstack/react-router'
import walletIcon from '@/assets/icons/wallet.svg'
import {
  walletNetworks,
  walletProviders,
  type Wallet,
} from '@/features/wallets/wallets-api'
import type { CheckoutWalletSlot } from './checkout-api'

export type WalletOption = { slot: CheckoutWalletSlot; wallet: Wallet }

const providers = ['walletconnect', 'metamask', 'coinbase'] as const
const providerMark = { walletconnect: 'W', metamask: 'M', coinbase: '' }
const radioStyle =
  'size-4 shrink-0 appearance-none rounded-full border border-primary/40 checked:border-primary checked:bg-primary checked:shadow-[inset_0_0_0_2px_var(--surface-card)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

function walletIdentifier(wallet: Wallet) {
  if (wallet.ensName) return `${wallet.ensName}.eth`
  return wallet.address.length > 16
    ? `${wallet.address.slice(0, 6)}…${wallet.address.slice(-4)}`
    : wallet.address
}

export default function CheckoutWalletOptions({
  options,
  selected,
  disabled,
  error,
  connected,
  onSelect,
}: {
  options: WalletOption[]
  selected: WalletOption | undefined
  disabled: boolean
  error?: string
  connected: boolean
  onSelect: (option: WalletOption) => void
}) {
  return (
    <div className="grid gap-4">
      <fieldset disabled={disabled} className="grid min-w-0 gap-3">
        <legend className="sr-only">Carteira cadastrada</legend>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-bold">
            {connected ? 'Carteira conectada' : 'Carteira selecionada'}
          </h2>
          <Link
            to="/perfil/carteiras"
            className="text-sm font-bold text-text-accent hover:underline"
          >
            Trocar carteira
          </Link>
        </div>
        <div className="grid gap-4 lg:gap-2">
          {options.map((option) => (
            <label
              key={option.slot}
              className="flex min-h-[93px] cursor-pointer items-center gap-4 rounded-[14px] bg-surface-card px-[18px] py-3 shadow-[0_10px_20px_#0a060440] has-disabled:cursor-default lg:min-h-0 lg:gap-3 lg:rounded-md lg:border lg:px-3 lg:py-2 lg:shadow-none lg:has-checked:border-primary"
            >
              <input
                type="radio"
                name="checkout-wallet"
                className={radioStyle}
                checked={selected?.slot === option.slot}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? 'checkout-wallet-error' : undefined}
                onChange={() => onSelect(option)}
              />
              <span className="grid min-w-0 gap-1">
                <span className="wrap-anywhere text-base font-bold lg:text-sm">
                  {option.wallet.nickname}
                </span>
                <span className="wrap-anywhere text-sm text-muted-foreground">
                  {walletIdentifier(option.wallet)}
                </span>
                <span className="text-sm text-muted-foreground">
                  Rede {walletNetworks[option.wallet.network]}
                </span>
              </span>
            </label>
          ))}
        </div>
        {error && (
          <p
            id="checkout-wallet-error"
            role="alert"
            className="text-sm text-destructive"
          >
            {error}
          </p>
        )}
      </fieldset>

      <fieldset disabled={disabled} className="grid min-w-0 gap-4">
        <legend className="mb-3 text-base font-bold lg:text-center">
          Carteira e rede
        </legend>
        {providers.map((provider) => {
          const option = options.find(
            ({ wallet }) => wallet.provider === provider,
          )
          return (
            <label
              key={provider}
              className="flex min-h-[65px] cursor-pointer items-center gap-3 rounded-[15px] bg-surface-card px-3.5 py-2 text-sm shadow-[0_0_40px_#0a060473] has-disabled:cursor-default has-disabled:text-muted-foreground lg:min-h-[45px] lg:flex-row-reverse lg:justify-end lg:rounded-[3px] lg:border lg:bg-transparent lg:px-3 lg:shadow-none lg:has-checked:border-primary"
            >
              <span
                aria-hidden="true"
                className="grid size-10 shrink-0 place-items-center rounded-full border bg-[#2f1d15] font-bold text-text-accent lg:hidden"
              >
                {provider === 'coinbase' ? (
                  <img src={walletIcon} alt="" className="size-5" />
                ) : (
                  providerMark[provider]
                )}
              </span>
              <span>{walletProviders[provider]}</span>
              <input
                type="radio"
                name="checkout-provider"
                className={`${radioStyle} ml-auto lg:ml-0`}
                disabled={!option}
                checked={selected?.wallet.provider === provider}
                onChange={() => {
                  if (option) onSelect(option)
                }}
              />
            </label>
          )
        })}
      </fieldset>
    </div>
  )
}
