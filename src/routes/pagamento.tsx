import { createFileRoute } from '@tanstack/react-router'
import {
  parseCatalogSearch,
  type CatalogSearch,
} from '@/features/catalog/catalog-search'
import CheckoutPage from '@/features/checkout/checkout-page'

export const Route = createFileRoute('/pagamento')({
  validateSearch: (
    search: Record<string, unknown>,
  ): CatalogSearch & { pedido?: string } => ({
    ...parseCatalogSearch(search),
    pedido:
      typeof search.pedido === 'string' &&
      /^[a-zA-Z0-9_-]{1,100}$/.test(search.pedido)
        ? search.pedido
        : undefined,
  }),
  component: CheckoutPage,
})
