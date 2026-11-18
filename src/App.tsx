import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { listNfts } from '@/features/catalog/catalog-api'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import CatalogFilters from '@/features/catalog/catalog-filters'

export default function App() {
  const search = useSearch({ from: '/' })
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

  function goToPage(nextPage: number) {
    void navigate({
      search: (previous) => ({
        ...previous,
        page: nextPage === 1 ? undefined : nextPage,
      }),
    })
  }

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="text-2xl font-semibold">Catálogo de NFTs</h1>

      <CatalogFilters
        search={search}
        onApply={(nextSearch) => void navigate({ search: nextSearch })}
      />

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
              <h2>
                <Link
                  to="/nfts/$nftId"
                  params={{ nftId: nft.id }}
                  search={search}
                  className="underline"
                >
                  {nft.name}
                </Link>
              </h2>
              <p>{nft.priceEth.replace('.', ',')} ETH</p>
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
    </main>
  )
}
