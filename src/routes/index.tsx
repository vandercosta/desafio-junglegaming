import { createFileRoute } from '@tanstack/react-router'
import App from '@/App'
import { parseCatalogSearch } from '@/features/catalog/catalog-search'

export const Route = createFileRoute('/')({
  validateSearch: parseCatalogSearch,
  component: App,
})
