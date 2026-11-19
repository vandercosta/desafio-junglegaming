import { useQuery } from '@tanstack/react-query'
import { Link, useParams, useSearch } from '@tanstack/react-router'
import { useState } from 'react'
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
}

function EditionPicker({ nftId, editions, search, scope }: EditionPickerProps) {
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
      <label htmlFor="nft-edition">Edição</label>
      <select
        id="nft-edition"
        value={editionId}
        onChange={(event) => {
          setEditionId(event.currentTarget.value)
          setQuantity(1)
        }}
        className="w-fit rounded-md border p-2"
      >
        <option value="" disabled>
          Selecione uma edição
        </option>
        {editions.map((item) => (
          <option
            key={item.id}
            value={item.id}
            disabled={item.availableQuantity === 0}
          >
            {item.availableQuantity === 0
              ? `${item.label} (esgotada)`
              : item.label}
          </option>
        ))}
      </select>

      <div className="flex items-center gap-3">
        <Button
          type="button"
          aria-label="Diminuir quantidade"
          disabled={selectedQuantity <= 1}
          onClick={() => setQuantity(Math.max(1, selectedQuantity - 1))}
        >
          −
        </Button>

        <output aria-label="Quantidade selecionada">{selectedQuantity}</output>

        <Button
          type="button"
          aria-label="Aumentar quantidade"
          disabled={selectedQuantity >= available}
          onClick={() => setQuantity(Math.min(available, selectedQuantity + 1))}
        >
          +
        </Button>

        <Button
          type="button"
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

        {addItem.isError && (
          <p role="alert">
            {errorMessage ?? 'Não foi possível adicionar o NFT ao carrinho.'}
          </p>
        )}
      </div>
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

  return (
    <main className="mx-auto grid max-w-5xl gap-6 p-6">
      <Link to="/" search={search} className="w-fit underline">
        Voltar ao catálogo
      </Link>

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
          <h1 className="text-2xl font-semibold">{nft.name}</h1>
          <p>{nft.priceEth.replace('.', ',')} ETH</p>
          <FavoriteButton nft={nft} />
          <section aria-labelledby="nft-about">
            <h2 id="nft-about">Sobre este NFT</h2>
            <p>{nft.description}</p>
          </section>

          <EditionPicker
            key={`${nft.id}:${scope}`}
            scope={scope}
            nftId={nft.id}
            editions={nft.editions}
            search={search}
          />

          <dl>
            <div>
              <dt>ID do token</dt>
              <dd>#{nft.id}</dd>
            </div>
            <div>
              <dt>Coleção</dt>
              <dd>{nft.collectionName}</dd>
            </div>
            <div>
              <dt>Atributos</dt>
              <dd>{nft.attributes.join(', ')}</dd>
            </div>
          </dl>

          <section aria-labelledby="nft-details">
            <h2 id="nft-details">Detalhes do NFT</h2>

            {nft.details.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}

            <dl>
              <div>
                <dt>Rede</dt>
                <dd>{nft.details.network}</dd>
              </div>
              <div>
                <dt>Contrato</dt>
                <dd>{nft.details.contract}</dd>
              </div>
              <div>
                <dt>Direitos autorais</dt>
                <dd>{nft.details.royalties}</dd>
              </div>
            </dl>
          </section>
        </>
      )}
    </main>
  )
}
