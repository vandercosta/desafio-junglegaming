import { createFileRoute } from '@tanstack/react-router'
import CartPage from '@/features/cart/cart-page'
import { parseCatalogSearch } from '@/features/catalog/catalog-search'

export const Route = createFileRoute('/carrinho')({
  validateSearch: parseCatalogSearch,
  component: CartPage,
})
