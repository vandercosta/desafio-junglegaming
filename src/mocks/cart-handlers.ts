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
    isQuantity(quantity)
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

function cartItemId(selection: CartSelection): string {
  return `${selection.nftId}:${selection.editionId}`
}

function isQuantity(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
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
        id: cartItemId(selection),
        nftName: nft.name,
        editionLabel: edition.label,
        unitPriceEth: nft.priceEth,
        lineTotalEth: fromWei(lineTotal),
        availableQuantity: edition.availableQuantity,
      },
    ]
  })

  return { items, subtotalEth: fromWei(subtotal) }
}

function persistCart(selections: CartSelection[]) {
  const cart = buildCart(selections)
  localStorage.setItem(storageKey, JSON.stringify(selections))
  return HttpResponse.json(cart)
}

function simulatedEditFailure() {
  if (import.meta.env.VITE_MOCK_CART_EDITS === 'error') {
    return HttpResponse.json(
      { message: 'O carrinho está temporariamente indisponível.' },
      { status: 503 },
    )
  }
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

    return persistCart(selections)
  }),

  http.patch('/api/cart/items/:itemId', async ({ params, request }) => {
    await delay(350)

    const failure = simulatedEditFailure()
    if (failure) return failure

    const body: unknown = await request.json().catch(() => null)
    const quantity =
      typeof body === 'object' && body !== null && 'quantity' in body
        ? body.quantity
        : undefined

    if (!isQuantity(quantity)) {
      return HttpResponse.json(
        { message: 'Informe uma quantidade inteira maior que zero.' },
        { status: 400 },
      )
    }

    const selections = readSelections()
    const item = selections.find(
      (selection) => cartItemId(selection) === params.itemId,
    )
    const edition = nftEditions.find(
      (candidate) => candidate.id === item?.editionId,
    )

    if (!item || !edition) {
      return HttpResponse.json(
        { message: 'Item do carrinho não encontrado.' },
        { status: 404 },
      )
    }

    if (quantity > edition.availableQuantity) {
      return HttpResponse.json(
        { message: 'A quantidade ultrapassa o estoque desta edição.' },
        { status: 409 },
      )
    }

    return persistCart(
      selections.map((selection) =>
        selection === item ? { ...selection, quantity } : selection,
      ),
    )
  }),

  http.delete('/api/cart/items/:itemId', async ({ params }) => {
    await delay(350)

    const failure = simulatedEditFailure()
    if (failure) return failure

    return persistCart(
      readSelections().filter(
        (selection) => cartItemId(selection) !== params.itemId,
      ),
    )
  }),
]
