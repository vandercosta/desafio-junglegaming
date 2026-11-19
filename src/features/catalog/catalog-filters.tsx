import { ChevronDown } from 'lucide-react'
import { Select } from 'radix-ui'
import { useId, type SubmitEvent } from 'react'
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

const fieldClassName =
  'min-w-0 rounded-md border border-input bg-background p-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'

export default function CatalogFilters({ search, onApply }: Props) {
  const labelId = useId()
  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    onApply(
      parseCatalogSearch({
        q: search.q,
        view: search.view,
        ...Object.fromEntries(fields),
      }),
    )
  }

  return (
    <form onSubmit={handleSubmit} className="my-4 grid gap-4 sm:grid-cols-2">
      {selects.map(({ name, label, empty }) => (
        <div key={name} className="grid min-w-0 gap-1">
          <span id={`${labelId}-${name}`}>{label}</span>
          <Select.Root
            key={search[name] ?? 'default'}
            name={name}
            defaultValue={search[name] ?? 'default'}
          >
            <Select.Trigger
              aria-labelledby={`${labelId}-${name}`}
              className={`${fieldClassName} flex min-h-11 w-full items-center justify-between gap-2 text-left`}
            >
              <Select.Value />
              <Select.Icon asChild>
                <ChevronDown className="size-4 shrink-0" />
              </Select.Icon>
            </Select.Trigger>
            <Select.Portal>
              <Select.Content
                position="popper"
                side="bottom"
                sideOffset={4}
                className="z-60 w-(--radix-select-trigger-width) max-h-(--radix-select-content-available-height) overflow-y-auto rounded-md border border-input bg-card text-card-foreground shadow-lg"
              >
                <Select.Viewport className="p-1">
                  {[
                    ['default', empty],
                    ...Object.entries(catalogOptions[name]),
                  ].map(([value, text]) => (
                    <Select.Item
                      key={value}
                      value={value}
                      className="flex min-h-11 cursor-pointer items-center rounded-sm px-3 outline-none data-highlighted:bg-accent data-[state=checked]:text-primary"
                    >
                      <Select.ItemText>{text}</Select.ItemText>
                    </Select.Item>
                  ))}
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        </div>
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
            className={fieldClassName}
          />
        </label>
      ))}

      <Button type="submit">Aplicar</Button>
    </form>
  )
}
