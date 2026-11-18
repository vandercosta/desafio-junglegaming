import type { SubmitEvent } from 'react'
import { Button } from '@/components/ui/button'
import { catalogOptions, parseCatalogSearch } from './catalog-search'
import type { CatalogSearch } from './catalog-search'

const selects = [
  { name: 'collection', label: 'Coleção', empty: 'Todas as coleções' },
  { name: 'network', label: 'Rede', empty: 'Todas as redes' },
  { name: 'sort', label: 'Ordenar por', empty: 'Listados recentemente' },
] as const

const prices = [
  { name: 'minEth', label: 'Preço mínimo em ETH' },
  { name: 'maxEth', label: 'Preço máximo em ETH' },
] as const

type Props = {
  search: CatalogSearch
  onApply: (search: CatalogSearch) => void
}

export default function CatalogFilters({ search, onApply }: Props) {
  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    onApply(parseCatalogSearch(Object.fromEntries(fields)))
  }

  return (
    <form onSubmit={handleSubmit} className="my-4 grid gap-4 sm:grid-cols-2">
      <label className="grid gap-1">
        Buscar NFTs
        <input
          key={search.q ?? ''}
          type="search"
          name="q"
          defaultValue={search.q}
          className="rounded-md border p-2"
        />
      </label>

      {selects.map(({ name, label, empty }) => (
        <label key={name} className="grid gap-1">
          {label}
          <select
            key={search[name] ?? ''}
            name={name}
            defaultValue={search[name] ?? ''}
            className="rounded-md border p-2"
          >
            <option value="">{empty}</option>
            {Object.entries(catalogOptions[name]).map(([value, text]) => (
              <option key={value} value={value}>
                {text}
              </option>
            ))}
          </select>
        </label>
      ))}

      {prices.map(({ name, label }) => (
        <label key={name} className="grid gap-1">
          {label}
          <input
            key={search[name] ?? ''}
            name={name}
            inputMode="decimal"
            pattern="[0-9]+([.,][0-9]{1,18})?"
            defaultValue={search[name]}
            className="rounded-md border p-2"
          />
        </label>
      ))}

      <Button type="submit">Aplicar</Button>
    </form>
  )
}
