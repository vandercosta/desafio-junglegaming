import { useQuery } from '@tanstack/react-query'
import { Link, useParams, useSearch } from '@tanstack/react-router'
import { useState, type ReactNode } from 'react'
import { Star } from 'lucide-react'
import { Tabs } from 'radix-ui'
import NftGallery from './nft-gallery'
import FavoriteButton from '@/features/favorites/favorite-button'
import { Button } from '@/components/ui/button'
import { getNft } from './catalog-api'
import type { NftEdition } from './catalog-api'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import axios from 'axios'
import {
  addCartItem,
  cartQueryKey,
  type CartScope,
  type CartSelection,
} from '@/features/cart/cart-api'
import { updateCartCache, useCartScope } from '@/features/cart/cart-session'
import type { CatalogSearch } from './catalog-search'

type EditionPickerProps = {
  nftId: string
  scope: CartScope | undefined
  editions: NftEdition[]
  search: CatalogSearch
  favorite: ReactNode
  priceEth: string
}

function EditionPicker({
  nftId,
  editions,
  search,
  scope,
  favorite,
  priceEth,
}: EditionPickerProps) {
  const [editionId, setEditionId] = useState(
    () => editions.find((edition) => edition.availableQuantity > 0)?.id ?? '',
  )
  const [quantity, setQuantity] = useState(1)

  const edition = editions.find((item) => item.id === editionId)
  const available = edition?.availableQuantity ?? 0
  const selectedQuantity = Math.min(quantity, available)

  const queryClient = useQueryClient()
  const navigate = useNavigate({ from: '/nfts/$nftId' })

  const addItem = useMutation({
    mutationKey: scope === undefined ? undefined : cartQueryKey(scope),
    mutationFn: (selection: CartSelection) => {
      if (scope === undefined)
        throw new Error('A sessão ainda está sendo verificada')
      return addCartItem(scope, selection)
    },
    retry: false,
    scope: { id: scope ?? 'guest' },
    onSuccess: async (cart) => {
      if (scope !== undefined) await updateCartCache(queryClient, scope, cart)
    },
  })

  const errorMessage = axios.isAxiosError<{ message?: string }>(addItem.error)
    ? addItem.error.response?.data?.message
    : undefined

  return (
    <section aria-label="Edição e quantidade" className="grid gap-3">
      <div role="group" aria-label="Edição" className="flex flex-wrap gap-2">
        {editions.map((item) => (
          <Button
            key={item.id}
            type="button"
            variant={item.id === editionId ? 'outline-primary' : 'outline'}
            aria-pressed={item.id === editionId}
            disabled={item.availableQuantity === 0}
            title={item.availableQuantity === 0 ? 'Edição esgotada' : undefined}
            onClick={() => {
              setEditionId(item.id)
              setQuantity(1)
            }}
            className="rounded-full uppercase"
          >
            {item.label}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex w-full items-center gap-3 lg:w-auto">
          <span className="text-sm text-muted-foreground lg:hidden">Qtd.</span>
          <Button
            type="button"
            aria-label="Diminuir quantidade"
            disabled={selectedQuantity <= 1}
            onClick={() => setQuantity(Math.max(1, selectedQuantity - 1))}
            className="h-[49.5px] w-[33px] rounded-full text-xl"
          >
            −
          </Button>
          <output aria-label="Quantidade selecionada">
            {selectedQuantity}
          </output>
          <Button
            type="button"
            aria-label="Aumentar quantidade"
            disabled={selectedQuantity >= available}
            onClick={() =>
              setQuantity(Math.min(available, selectedQuantity + 1))
            }
            className="h-[49.5px] w-[33px] rounded-full text-xl"
          >
            +
          </Button>
          <p className="ml-auto text-lg font-bold text-text-accent lg:hidden">
            {priceEth} ETH
          </p>
        </div>
        <div className="flex flex-wrap items-start gap-2 lg:[&_[data-slot=button]]:h-10 lg:[&_[data-slot=button]]:w-[130px] lg:[&_[data-slot=button]]:rounded-md">
          <Button
            type="button"
            className="h-11 min-w-[130px] max-lg:rounded-full"
            disabled={
              scope === undefined ||
              !edition ||
              selectedQuantity === 0 ||
              addItem.isPending
            }
            onClick={() =>
              addItem.mutate(
                { nftId, editionId, quantity: selectedQuantity },
                {
                  onSuccess: () => {
                    void navigate({ to: '/carrinho', search })
                  },
                },
              )
            }
          >
            {addItem.isPending ? 'Adicionando…' : 'Comprar'}
          </Button>

          {favorite}
        </div>
      </div>
      {addItem.isError && (
        <p role="alert">
          {errorMessage ?? 'Não foi possível adicionar o NFT ao carrinho.'}
        </p>
      )}
    </section>
  )
}

export default function NftDetailPage() {
  const { nftId } = useParams({ from: '/nfts/$nftId' })
  const search = useSearch({ from: '/nfts/$nftId' })

  const detail = useQuery({
    queryKey: ['nfts', 'detail', nftId],
    queryFn: ({ signal }) => getNft(nftId, signal),
    retry: false,
  })

  const scope = useCartScope()
  const nft = detail.data
  const reviews = nft?.reviews ?? []
  const average = reviews.length
    ? (
        reviews.reduce((total, review) => total + review.rating, 0) /
        reviews.length
      ).toFixed(1)
    : null

  return (
    <main className="page-shell relative grid gap-6 py-6">
      <nav
        aria-label="Caminho de navegação"
        className="flex min-h-10 items-center gap-2 text-sm font-semibold lg:min-h-0"
      >
        <Link to="/" search={search} className="hover:underline">
          Início
        </Link>
        <span aria-hidden="true">/</span>
        <Link
          to="/"
          hash="catalogo"
          search={search}
          className="hover:underline"
        >
          Mercado
        </Link>
      </nav>

      {detail.isPending && <p role="status">Carregando detalhes do NFT…</p>}

      {detail.isError && (
        <div>
          <p role="alert">Não foi possível carregar os detalhes do NFT.</p>
          <Button
            type="button"
            disabled={detail.isFetching}
            onClick={() => void detail.refetch()}
          >
            Tentar novamente
          </Button>
        </div>
      )}

      {nft === null && !detail.isError && (
        <h1 className="text-2xl font-semibold">NFT não encontrado</h1>
      )}

      {nft && (
        <>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.04fr)] lg:items-start lg:gap-8">
            <NftGallery key={nft.id} src={nft.imageUrl} name={nft.name} />
            <div className="grid min-w-0 gap-4 rounded-3xl bg-surface-card p-4 lg:rounded-none lg:bg-transparent lg:p-0">
              <div className="flex items-start justify-between gap-2">
                <h1 className="text-xl font-bold lg:text-[28px]/none">
                  {nft.name}
                </h1>
                <p
                  aria-label={
                    average
                      ? `Nota ${average} de 5, ${reviews.length} avaliações`
                      : 'Sem avaliações'
                  }
                  className="flex h-[27px] shrink-0 items-center gap-1 rounded-full border border-primary px-2 text-sm lg:hidden"
                >
                  <Star
                    aria-hidden="true"
                    className="size-3.5 fill-primary text-primary"
                  />
                  {average ?? '—'}
                  <span className="text-muted-foreground">
                    ({reviews.length})
                  </span>
                </p>
              </div>
              <div className="hidden flex-wrap items-center justify-between gap-2 border-b pb-3 lg:flex">
                <p className="text-[22px] font-bold text-text-accent">
                  {nft.priceEth} ETH
                </p>
                <span className="flex items-center gap-1 text-sm">
                  <Star
                    aria-hidden="true"
                    className="size-4 fill-primary text-primary"
                  />
                  {(nft.reviews ?? []).length} avaliações de colecionadores
                </span>
              </div>
              <section aria-labelledby="nft-about" className="grid gap-2">
                <h2 id="nft-about" className="font-bold">
                  Sobre este NFT
                </h2>
                <p className="text-sm/6 text-muted-foreground">
                  {nft.description}
                </p>
              </section>
              <div className="grid gap-2">
                <p className="font-bold">Edição</p>
                <EditionPicker
                  key={`${nft.id}:${scope}`}
                  scope={scope}
                  nftId={nft.id}
                  editions={nft.editions}
                  search={search}
                  favorite={
                    <div className="max-lg:absolute max-lg:top-6 max-lg:right-0 max-lg:[&_[data-favorite-label]]:sr-only max-lg:[&_[data-variant=outline-primary]]:size-10 max-lg:[&_[data-variant=outline-primary]]:rounded-full">
                      <FavoriteButton nft={nft} />
                    </div>
                  }
                  priceEth={nft.priceEth}
                />
              </div>
              <dl className="grid gap-3 text-sm text-metadata-foreground">
                <div>
                  <dt className="inline">ID do token: </dt>
                  <dd className="inline">#{nft.id}</dd>
                </div>
                <div>
                  <dt className="inline">Coleção: </dt>
                  <dd className="inline">{nft.collectionName}</dd>
                </div>
                <div>
                  <dt className="inline">Atributos: </dt>
                  <dd className="inline">{nft.attributes.join(', ')}</dd>
                </div>
              </dl>
            </div>
          </div>

          <Tabs.Root
            key={nft.id}
            defaultValue="details"
            className="mt-4 lg:mt-16"
          >
            <Tabs.List
              aria-label="Informações do NFT"
              className="flex flex-wrap gap-x-6 border-b"
            >
              <Tabs.Trigger
                value="details"
                className="min-h-11 cursor-pointer border-b-2 border-transparent text-sm focus-visible:outline-2 focus-visible:outline-ring data-[state=active]:border-primary data-[state=active]:font-bold data-[state=active]:text-text-accent lg:text-[17px]"
              >
                Detalhes do NFT
              </Tabs.Trigger>
              <Tabs.Trigger
                value="reviews"
                className="min-h-11 cursor-pointer border-b-2 border-transparent text-sm focus-visible:outline-2 focus-visible:outline-ring data-[state=active]:border-primary data-[state=active]:font-bold data-[state=active]:text-text-accent lg:text-[17px]"
              >
                Avaliações de colecionadores ({nft.reviews?.length ?? 0})
              </Tabs.Trigger>
            </Tabs.List>
            <Tabs.Content
              value="details"
              className="mt-4 grid gap-5 text-sm/6 text-muted-foreground"
            >
              {nft.details.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              <dl className="grid gap-4">
                <div>
                  <dt className="font-bold text-foreground">Rede</dt>
                  <dd>{nft.details.network}</dd>
                </div>
                <div>
                  <dt className="font-bold text-foreground">Contrato</dt>
                  <dd>{nft.details.contract}</dd>
                </div>
                <div>
                  <dt className="font-bold text-foreground">
                    Direitos autorais
                  </dt>
                  <dd>{nft.details.royalties}</dd>
                </div>
              </dl>
            </Tabs.Content>
            <Tabs.Content
              value="reviews"
              className="mt-4 text-sm/6 text-muted-foreground"
            >
              {nft.reviews?.length ? (
                <ul className="grid gap-4">
                  {nft.reviews.map((review) => (
                    <li
                      key={review.id}
                      className="rounded-md bg-surface-card p-4"
                    >
                      <p className="font-bold text-foreground">
                        {review.author}
                      </p>
                      <p className="text-text-accent">
                        Nota {review.rating} de 5
                      </p>
                      <p>{review.comment}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>Ainda não há avaliações para este NFT.</p>
              )}
            </Tabs.Content>
          </Tabs.Root>

          <section aria-labelledby="related-title" className="my-8 lg:my-16">
            <h2
              id="related-title"
              className="border-b pb-2 text-lg font-bold text-text-accent"
            >
              Mais desta coleção
            </h2>
            {nft.relatedNfts?.length ? (
              <ul className="mt-6 flex gap-4 overflow-x-auto px-1 py-2 lg:gap-6">
                {nft.relatedNfts.map((item) => (
                  <li
                    key={item.id}
                    className="w-[44%] max-w-[220px] shrink-0 lg:w-[calc((100%-6rem)/5)]"
                  >
                    <Link
                      to="/nfts/$nftId"
                      params={{ nftId: item.id }}
                      search={search}
                      className="group block focus-visible:outline-2 focus-visible:outline-ring"
                    >
                      <div className="grid aspect-[258/300] items-center bg-surface-card px-1">
                        <img
                          src={item.imageUrl}
                          alt=""
                          width={250}
                          height={250}
                          loading="lazy"
                          className="aspect-square w-full rounded-xl object-cover"
                        />
                      </div>
                      <h3 className="mt-2 text-sm group-hover:underline">
                        {item.name}
                      </h3>
                    </Link>
                    <p className="font-bold text-text-accent">
                      {item.priceEth} ETH
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                Nenhum outro NFT nesta coleção.
              </p>
            )}
          </section>
        </>
      )}
    </main>
  )
}
