import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { listNfts } from '@/features/catalog/catalog-api'

export default function App() {
  const catalog = useQuery({
    queryKey: ['nfts'],
    queryFn: ({ signal }) => listNfts(signal),
    retry: false,
  })

  const items = catalog.data?.items

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="text-2xl font-semibold">Catálogo de NFTs</h1>

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
              <h2>{nft.name}</h2>
              <p>{nft.priceEth.replace('.', ',')} ETH</p>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
