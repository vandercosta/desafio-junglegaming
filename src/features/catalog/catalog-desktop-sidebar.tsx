import { Slider } from 'radix-ui'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { fromWei, toWei } from '@/lib/eth'
import type { CatalogFacets } from './catalog-api'
import { catalogOptions, type CatalogSearch } from './catalog-search'

type Props = {
  search: CatalogSearch
  facets?: CatalogFacets
  onApply: (patch: CatalogSearch) => void
}

const defaultMin = toWei('0.02')
const defaultMax = toWei('12.30')

function formatPrice(value: string) {
  const [whole, fraction = ''] = value.split('.')
  return `${BigInt(whole).toLocaleString('pt-BR')},${fraction.padEnd(2, '0')}`
}

function PriceRange({ search, onApply }: Pick<Props, 'search' | 'onApply'>) {
  const minWei = search.minEth === undefined ? defaultMin : toWei(search.minEth)
  const maxWei = search.maxEth === undefined ? defaultMax : toWei(search.maxEth)
  const largest = [defaultMax, minWei, maxWei].reduce((a, b) => (a > b ? a : b))
  // Keep Radix's numeric positions small even for ranges linked from mobile.
  const stepWei = 10n ** BigInt(Math.max(16, largest.toString().length - 6))
  const min = Number((minWei < maxWei ? minWei : maxWei) / stepWei)
  const minTick = Math.min(Number(defaultMin / stepWei), min)
  const maxTick = Number((largest + stepWei - 1n) / stepWei)
  const initialMin = Number(minWei / stepWei)
  const initialMax = Math.max(
    initialMin,
    Number((maxWei + stepWei - 1n) / stepWei),
  )
  const boundsKey = `${search.minEth ?? ''}:${search.maxEth ?? ''}`
  const [draft, setDraft] = useState({
    boundsKey,
    positions: [initialMin, initialMax],
  })
  const positions =
    draft.boundsKey === boundsKey ? draft.positions : [initialMin, initialMax]
  if (draft.boundsKey !== boundsKey) setDraft({ boundsKey, positions })
  const [minPosition, maxPosition] = positions
  const priceAt = (position: number) => fromWei(BigInt(position) * stepWei)

  const minChanged = minPosition !== initialMin
  const maxChanged = maxPosition !== initialMax
  let minEth = minChanged
    ? minPosition === minTick
      ? undefined
      : priceAt(minPosition)
    : search.minEth
  let maxEth = maxChanged
    ? maxPosition === maxTick
      ? undefined
      : priceAt(maxPosition)
    : search.maxEth

  // A saved bound can be between two slider ticks. Preserve its precision
  // when the other handle reaches that same position.
  if (
    (minChanged || maxChanged) &&
    minEth &&
    maxEth &&
    toWei(minEth) > toWei(maxEth)
  ) {
    if (minChanged) minEth = maxEth
    else maxEth = minEth
  }

  const minimum = formatPrice(minEth ?? priceAt(minPosition))
  const maximum = formatPrice(maxEth ?? priceAt(maxPosition))
  const thumbClass =
    'block size-5 rounded-full border-2 border-background bg-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'

  return (
    <section aria-labelledby="catalog-price-range" className="grid gap-2">
      <h3 id="catalog-price-range" className="text-lg font-bold">
        Faixa de preço
      </h3>
      <Slider.Root
        className="relative flex h-9 w-full touch-none items-center select-none"
        value={positions}
        min={minTick}
        max={maxTick}
        onValueChange={(positions) => setDraft({ boundsKey, positions })}
      >
        <Slider.Track className="relative h-1 grow rounded-full bg-primary/45">
          <Slider.Range className="absolute h-full rounded-full bg-primary" />
        </Slider.Track>
        <Slider.Thumb
          className={thumbClass}
          aria-label="Preço mínimo em ETH"
          aria-valuetext={`${minimum} ETH`}
        />
        <Slider.Thumb
          className={thumbClass}
          aria-label="Preço máximo em ETH"
          aria-valuetext={`${maximum} ETH`}
        />
      </Slider.Root>
      <p className="break-words text-sm">
        Preço: {minimum} – {maximum} ETH
      </p>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="lg"
          className="px-4"
          onClick={() => onApply({ minEth, maxEth })}
        >
          Aplicar
        </Button>
        {(search.minEth !== undefined || search.maxEth !== undefined) && (
          <Button
            type="button"
            variant="link"
            onClick={() => onApply({ minEth: undefined, maxEth: undefined })}
          >
            Limpar faixa de preço
          </Button>
        )}
      </div>
    </section>
  )
}

function FilterChoices<Name extends 'collection' | 'network'>({
  name,
  title,
  selected,
  counts,
  onApply,
}: {
  name: Name
  title: string
  selected: CatalogSearch[Name]
  counts?: Partial<Record<string, number>>
  onApply: Props['onApply']
}) {
  return (
    <section aria-labelledby={`catalog-sidebar-${name}`} className="grid gap-2">
      <h3 id={`catalog-sidebar-${name}`} className="text-lg font-bold">
        {title}
      </h3>
      <ul className="grid gap-1">
        {Object.entries(catalogOptions[name]).map(([value, label]) => (
          <li key={value}>
            <button
              type="button"
              aria-pressed={selected === value}
              className="flex min-h-10 w-full items-center justify-between gap-3 rounded-sm px-2 text-left text-sm text-muted-foreground hover:text-text-accent focus-visible:outline-2 focus-visible:outline-ring aria-pressed:font-semibold aria-pressed:text-text-accent"
              onClick={() =>
                onApply({ [name]: selected === value ? undefined : value })
              }
            >
              {label}
              {counts?.[value] !== undefined && (
                <span className="tabular-nums">({counts[value]})</span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default function CatalogDesktopSidebar({
  search,
  facets,
  onApply,
}: Props) {
  return (
    <aside
      aria-label="Filtros do catálogo"
      className="hidden min-w-0 self-start space-y-8 bg-surface-card p-5 lg:block"
    >
      <FilterChoices
        name="collection"
        title="Coleções"
        selected={search.collection}
        counts={facets?.collections}
        onApply={onApply}
      />
      <PriceRange search={search} onApply={onApply} />
      <FilterChoices
        name="network"
        title="Rede"
        selected={search.network}
        counts={facets?.networks}
        onApply={onApply}
      />
    </aside>
  )
}
