import { useState, type SubmitEvent } from 'react'
import { Button } from '@/components/ui/button'
import ProfileField from '@/features/profile/profile-field'
import {
  walletNetworks,
  walletProviders,
  type Wallet,
  type WalletChange,
  type WalletErrors,
} from './wallets-api'

type Props = {
  slot: WalletChange['slot']
  wallet?: Wallet
  usesPrimary?: boolean
  hasPrimary: boolean
  pending: boolean
  errors?: WalletErrors
  error?: string
  onSave: (change: WalletChange) => void
  onCancel: () => void
}

export default function WalletForm({
  slot,
  wallet,
  usesPrimary = false,
  hasPrimary,
  pending,
  errors,
  error,
  onSave,
  onCancel,
}: Props) {
  const [same, setSame] = useState(usesPrimary)
  const [network, setNetwork] = useState<Wallet['network'] | ''>(
    wallet?.network ?? '',
  )
  const prefix = `wallet-${slot}`

  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    if (slot === 'secundaria' && same) {
      onSave({ slot, wallet: { kind: 'same-as-primary' } })
      return
    }

    const data = new FormData(event.currentTarget)
    const field = (name: string) => String(data.get(name) ?? '')
    const next = {
      nickname: field('nickname'),
      address: field('address'),
      network: field('network') as Wallet['network'],
      provider: field('provider') as Wallet['provider'],
      ensName: field('ensName'),
      referralCode: field('referralCode'),
    }

    onSave(
      slot === 'principal'
        ? { slot, wallet: next }
        : { slot, wallet: { kind: 'independent', wallet: next } },
    )
  }

  return (
    <form className="grid gap-4" onSubmit={submit}>
      <fieldset disabled={pending} className="grid min-w-0 gap-4">
        {slot === 'secundaria' && hasPrimary && (
          <label className="flex w-fit items-center gap-2">
            <input
              type="checkbox"
              checked={same}
              onChange={(event) => setSame(event.currentTarget.checked)}
            />
            Igual à carteira principal
          </label>
        )}

        <fieldset
          disabled={same}
          className={same ? 'hidden' : 'grid gap-4 sm:grid-cols-2'}
        >
          <ProfileField
            id={`${prefix}-nickname`}
            label="Apelido da carteira"
            name="nickname"
            required
            defaultValue={wallet?.nickname}
            message={!same ? errors?.nickname : undefined}
          />
          <WalletSelect
            id={`${prefix}-network`}
            name="network"
            label="Rede"
            options={walletNetworks}
            placeholder="Selecione uma rede"
            value={network}
            onChange={(value) => setNetwork(value as Wallet['network'] | '')}
            error={!same ? errors?.network : undefined}
          />
          <ProfileField
            id={`${prefix}-address`}
            label="Endereço da carteira"
            name="address"
            required
            defaultValue={wallet?.address}
            message={!same ? errors?.address : undefined}
            placeholder={
              network === 'solana'
                ? 'Endereço Base58'
                : 'Endereço 0x da carteira'
            }
            autoComplete="off"
            spellCheck={false}
          />
          <WalletSelect
            id={`${prefix}-provider`}
            name="provider"
            label="Tipo de carteira"
            options={walletProviders}
            placeholder="Selecione uma carteira"
            defaultValue={wallet?.provider ?? ''}
            error={!same ? errors?.provider : undefined}
          />
          <ProfileField
            id={`${prefix}-ens`}
            label="Nome ENS (opcional)"
            name="ensName"
            defaultValue={wallet?.ensName}
            message={!same ? errors?.ensName : undefined}
            suffix=".eth"
          />
          <ProfileField
            id={`${prefix}-referral`}
            label="Código de indicação (opcional)"
            name="referralCode"
            defaultValue={wallet?.referralCode}
            message={!same ? errors?.referralCode : undefined}
          />
        </fieldset>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button type="submit">
            {pending ? 'Salvando…' : 'Salvar carteira'}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </fieldset>
    </form>
  )
}

function WalletSelect({
  id,
  name,
  label,
  placeholder,
  options,
  value,
  defaultValue,
  onChange,
  error,
}: {
  id: string
  name: string
  label: string
  placeholder: string
  options: Readonly<Record<string, string>>
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  error?: string
}) {
  return (
    <div className="grid min-w-0 content-start gap-1">
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        name={name}
        value={value}
        defaultValue={defaultValue}
        required
        onChange={
          onChange ? (event) => onChange(event.currentTarget.value) : undefined
        }
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className="rounded-md border bg-background p-2 focus-visible:outline-2 focus-visible:outline-ring"
      >
        <option value="">{placeholder}</option>
        {Object.entries(options).map(([key, text]) => (
          <option key={key} value={key}>
            {text}
          </option>
        ))}
      </select>
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
