export const catalogOptions = {
  collection: {
    'arte-digital': 'Arte digital',
    'arte-3d': 'Arte 3D',
    musica: 'Música',
  },
  network: {
    ethereum: 'Ethereum',
    polygon: 'Polygon',
    solana: 'Solana',
  },
  sort: {
    'price-asc': 'Menor preço',
    'price-desc': 'Maior preço',
  },
} as const

export type CatalogSearch = {
  q?: string
  collection?: keyof typeof catalogOptions.collection
  network?: keyof typeof catalogOptions.network
  minEth?: string
  maxEth?: string
  sort?: keyof typeof catalogOptions.sort
  page?: number
}

function readOption<T extends Record<string, string>>(
  value: unknown,
  options: T,
): keyof T | undefined {
  return typeof value === 'string' && Object.hasOwn(options, value)
    ? (value as keyof T)
    : undefined
}

function readEth(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined

  const decimal = value.trim().replace(',', '.')
  return /^\d+(\.\d{1,18})?$/.test(decimal) ? decimal : undefined
}

export function parseCatalogSearch(
  raw: Record<string, unknown>,
): CatalogSearch {
  const page =
    typeof raw.page === 'string' && /^\d+$/.test(raw.page)
      ? Number(raw.page)
      : raw.page

  return {
    q: typeof raw.q === 'string' ? raw.q.trim() || undefined : undefined,
    collection: readOption(raw.collection, catalogOptions.collection),
    network: readOption(raw.network, catalogOptions.network),
    minEth: readEth(raw.minEth),
    maxEth: readEth(raw.maxEth),
    sort: readOption(raw.sort, catalogOptions.sort),
    page:
      typeof page === 'number' && Number.isSafeInteger(page) && page > 0
        ? page
        : undefined,
  }
}
