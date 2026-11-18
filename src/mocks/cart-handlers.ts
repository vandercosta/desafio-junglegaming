import { delay, http, HttpResponse } from 'msw'
import type { CartResponse, CartSelection } from '@/features/cart/cart-api'
import { fromWei, toWei } from '@/lib/eth'
import { nftEditions, nfts } from './fixtures/nfts'

const storageKey = 'kurio:guest-cart:v1'

function isCartSelection(value: unknown): value is CartSelection {
  if (typeof value !== 'object' || value === null) return false

  const { nftId, editionId, quantity } = value as Partial<CartSelection>

  return (
    typeof nftId === 'string' &&
    typeof editionId === 'string' &&
    typeof quantity === 'number' &&
    Number.isSafeInteger(quantity) &&
    quantity > 0
  )
}

function readSelections(): CartSelection[] {
  const stored = localStorage.getItem(storageKey)
  if (!stored) return []

  try {
    const data: unknown = JSON.parse(stored)
    return Array.isArray(data) ? data.filter(isCartSelection) : []
  } catch {
    return []
  }
}

function buildCart(selections: CartSelection[]): CartResponse {
  let subtotal = 0n

  const items = selections.flatMap((selection) => {
    const nft = nfts.find((item) => item.id === selection.nftId)
    const edition = nftEditions.find((item) => item.id === selection.editionId)

    if (!nft || !edition) return []

    const lineTotal = toWei(nft.priceEth) * BigInt(selection.quantity)
    subtotal += lineTotal

    return [
      {
        ...selection,
        id: `${selection.nftId}:${selection.editionId}`,
        nftName: nft.name,
        editionLabel: edition.label,
        unitPriceEth: nft.priceEth,
        lineTotalEth: fromWei(lineTotal),
      },
    ]
  })

  return { items, subtotalEth: fromWei(subtotal) }
}

export const cartHandlers = [
  http.get('/api/cart', () => {
    return HttpResponse.json(buildCart(readSelections()))
  }),

  http.post('/api/cart/items', async ({ request }) => {
    await delay(350)

    const input: unknown = await request.json().catch(() => null)

    if (!isCartSelection(input)) {
      return HttpResponse.json(
        { message: 'Informe um NFT, uma edição e uma quantidade válida.' },
        { status: 400 },
      )
    }

    const nft = nfts.find((item) => item.id === input.nftId)
    const edition = nftEditions.find((item) => item.id === input.editionId)

    if (!nft || !edition) {
      return HttpResponse.json(
        { message: 'NFT ou edição não encontrada.' },
        { status: 404 },
      )
    }

    const selections = readSelections()
    const index = selections.findIndex(
      (item) =>
        item.nftId === input.nftId && item.editionId === input.editionId,
    )
    const currentQuantity = selections[index]?.quantity ?? 0
    const quantity = currentQuantity + input.quantity

    if (quantity > edition.availableQuantity) {
      return HttpResponse.json(
        { message: 'O carrinho ultrapassaria o limite desta edição.' },
        { status: 409 },
      )
    }

    const next = { ...input, quantity }
    if (index === -1) selections.push(next)
    else selections[index] = next

    const cart = buildCart(selections)
    localStorage.setItem(storageKey, JSON.stringify(selections))

    return HttpResponse.json(cart)
  }),
]
