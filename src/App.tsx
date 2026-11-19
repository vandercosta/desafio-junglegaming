import { useQuery } from '@tanstack/react-query'
import FavoriteButton from '@/features/favorites/favorite-button'
import HomeCarousel from '@/components/home-carousel'
import { Button } from '@/components/ui/button'
import { listNfts } from '@/features/catalog/catalog-api'
import {
  Link,
  useLocation,
  useNavigate,
  useSearch,
} from '@tanstack/react-router'
import CatalogFilters from '@/features/catalog/catalog-filters'
import {
  catalogFiltersHash,
  parseCatalogSearch,
  type CatalogSearch,
} from '@/features/catalog/catalog-search'

export default function App() {
  const showFilters = useLocation({
    select: ({ hash }) => hash === catalogFiltersHash,
  })
  const search = useSearch({ from: '/', select: parseCatalogSearch })
  const navigate = useNavigate({ from: '/' })
  const page = search.page ?? 1

  const catalog = useQuery({
    queryKey: ['nfts', search],
    queryFn: ({ signal }) => listNfts(search, signal),
    retry: false,
  })

  const items = catalog.data?.items
  const pageCount = catalog.data
    ? Math.ceil(catalog.data.total / catalog.data.pageSize)
    : 0

  function applyFilters(nextSearch: CatalogSearch) {
    void navigate({
      search: (previous) => ({ ...previous, ...nextSearch }),
      hash: true,
      hashScrollIntoView: false,
      resetScroll: false,
    })
  }

  function goToPage(nextPage: number) {
    void navigate({
      search: (previous) => ({
        ...previous,
        page: nextPage === 1 ? undefined : nextPage,
      }),
      hash: true,
    })
  }

  return (
    <main className="page-shell py-6">
      <HomeCarousel />
      <section
        id="catalogo"
        aria-labelledby="catalog-title"
        className="scroll-mt-4"
      >
        <h2 id="catalog-title" className="text-2xl font-semibold">
          Catálogo de NFTs
        </h2>

        {showFilters && (
          <div id={catalogFiltersHash} className="hidden lg:block">
            <CatalogFilters
              search={search}
              onApply={applyFilters}
              searchInputId="catalog-search"
            />
          </div>
        )}

        {catalog.isPending && <p role="status">Carregando NFTs…</p>}

        {catalog.isError && (
          <div>
            <p role="alert">Não foi possível carregar os NFTs.</p>
            <Button
              type="button"
              disabled={catalog.isFetching}
              onClick={() => void catalog.refetch()}
            >
              Tentar novamente
            </Button>
          </div>
        )}

        {items?.length === 0 && <p>Nenhum NFT encontrado.</p>}

        {items && items.length > 0 && (
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((nft) => (
              <li key={nft.id} className="rounded-md border p-4">
                <h3>
                  <Link
                    to="/nfts/$nftId"
                    params={{ nftId: nft.id }}
                    search={search}
                    className="underline"
                  >
                    {nft.name}
                  </Link>
                </h3>
                <p>{nft.priceEth.replace('.', ',')} ETH</p>
                <div className="mt-3">
                  <FavoriteButton nft={nft} />
                </div>
              </li>
            ))}
          </ul>
        )}

        {pageCount > 0 && (
          <nav
            aria-label="Paginação do catálogo"
            className="mt-4 flex items-center gap-3"
          >
            {page > pageCount ? (
              <Button type="button" onClick={() => goToPage(1)}>
                Voltar à primeira página
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  disabled={page === 1}
                  onClick={() => goToPage(page - 1)}
                >
                  Anterior
                </Button>
                <p>
                  Página {page} de {pageCount}
                </p>
                <Button
                  type="button"
                  disabled={page === pageCount}
                  onClick={() => goToPage(page + 1)}
                >
                  Próxima
                </Button>
              </>
            )}
          </nav>
        )}
      </section>
    </main>
  )
}
