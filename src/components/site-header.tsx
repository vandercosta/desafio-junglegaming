import { skipToken, useQuery } from '@tanstack/react-query'
import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import { cn } from 'cn'
import searchIcon from '@/assets/icons/search.svg'
import cartIcon from '@/assets/icons/cart.svg'
import { useId, type MouseEvent, type ReactNode, type Ref } from 'react'
import {
  cartQueriesKey,
  cartQueryKey,
  getCart,
  type CartScope,
} from '@/features/cart/cart-api'
import {
  catalogFiltersHash,
  parseCatalogSearch,
} from '@/features/catalog/catalog-search'

type Props = {
  brandRef: Ref<HTMLAnchorElement>
  account: ReactNode
  status: ReactNode
  mobileCatalog: ReactNode
  cartScope: CartScope | undefined
}

const catalogDestination = {
  to: '/',
  hash: 'catalogo',
  search: parseCatalogSearch,
} as const

const sectionActiveOptions = {
  exact: true,
  includeHash: true,
  includeSearch: false,
}

const searchDestination = { ...catalogDestination, hash: catalogFiltersHash }

const focusStyle =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'
const navigationLinkStyle =
  'flex items-center whitespace-nowrap border-b-[3px] border-transparent hover:text-primary'
const activeNavigationStyle = 'border-primary font-semibold text-primary'
const iconLinkStyle =
  'relative grid size-10 shrink-0 place-items-center rounded-md hover:text-primary'

export default function SiteHeader({
  brandRef,
  account,
  status,
  mobileCatalog,
  cartScope,
}: Props) {
  const pathname = useLocation({ select: (location) => location.pathname })
  const hash = useLocation({ select: (location) => location.hash })
  const navigate = useNavigate()
  const quantityId = useId()
  const { data: quantity } = useQuery({
    queryKey: cartScope ? cartQueryKey(cartScope) : cartQueriesKey,
    queryFn: cartScope ? ({ signal }) => getCart(cartScope, signal) : skipToken,
    retry: false,
    select: (cart) =>
      cart.items.reduce((total, item) => total + item.quantity, 0),
  })

  const inCatalog =
    pathname === '/' &&
    (hash === catalogDestination.hash || hash === catalogFiltersHash)
  const inMarketRoute =
    pathname.startsWith('/nfts/') ||
    pathname === '/carrinho' ||
    pathname === '/pagamento'
  const onHome = pathname === '/' && !inCatalog
  const showQuantity = quantity !== undefined && quantity > 0

  function handleSearchClick(event: MouseEvent<HTMLAnchorElement>) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey
    ) {
      return
    }

    event.preventDefault()
    void navigate(searchDestination).then(() => {
      document.getElementById('catalog-search')?.focus()
    })
  }

  return (
    <header className="page-shell">
      {mobileCatalog}

      <div className="flex min-h-16 items-center justify-between gap-x-3 border-b lg:grid lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:gap-x-4">
        <Link
          ref={brandRef}
          to="/"
          search={parseCatalogSearch}
          activeOptions={sectionActiveOptions}
          className={cn(
            'w-fit rounded-sm font-semibold tracking-widest',
            focusStyle,
          )}
        >
          KURIO
        </Link>

        <nav
          aria-label="Navegação principal"
          className="hidden items-stretch gap-[40px] self-stretch lg:flex"
        >
          <Link
            to="/"
            search={parseCatalogSearch}
            activeOptions={sectionActiveOptions}
            aria-current={onHome ? 'page' : undefined}
            className={cn(
              navigationLinkStyle,
              focusStyle,
              onHome && activeNavigationStyle,
            )}
          >
            Início
          </Link>
          <Link
            {...catalogDestination}
            activeOptions={sectionActiveOptions}
            aria-current={inMarketRoute ? 'true' : undefined}
            className={cn(
              navigationLinkStyle,
              focusStyle,
              (inCatalog || inMarketRoute) && activeNavigationStyle,
            )}
          >
            Mercado
          </Link>
          <span className="flex items-center border-b-[3px] border-transparent">
            Criadores
          </span>
          <span className="flex items-center border-b-[3px] border-transparent">
            Aprenda
          </span>
        </nav>

        <div className="flex min-w-0 flex-wrap items-center justify-end gap-x-2 gap-y-1 py-2">
          <Link
            {...searchDestination}
            aria-label="Buscar NFTs"
            activeOptions={sectionActiveOptions}
            onClick={handleSearchClick}
            className={cn(iconLinkStyle, focusStyle, 'hidden lg:grid')}
          >
            <img src={searchIcon} alt="" className="size-5 shrink-0" />
          </Link>
          <Link
            to="/carrinho"
            search={parseCatalogSearch}
            aria-label="Carrinho"
            aria-describedby={showQuantity ? quantityId : undefined}
            activeOptions={{ exact: true, includeSearch: false }}
            className={cn(iconLinkStyle, focusStyle)}
          >
            <img src={cartIcon} alt="" className="size-6 shrink-0" />
            {showQuantity && (
              <>
                <span
                  aria-hidden="true"
                  className="absolute top-0 right-0 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-xs leading-4 font-semibold text-primary-foreground tabular-nums lg:top-[9px]"
                >
                  {quantity}
                </span>
                <span id={quantityId} className="sr-only">
                  {quantity} {quantity === 1 ? 'edição' : 'edições'} no carrinho
                </span>
              </>
            )}
          </Link>
          {account}
        </div>
      </div>

      {status && (
        <div className="grid gap-2 pt-2 text-sm empty:hidden">{status}</div>
      )}
    </header>
  )
}
