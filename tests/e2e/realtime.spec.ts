import { errors, expect, test, type Page } from '@playwright/test'
import { signOutFromHeader } from './account-menu.js'

type DemoAction =
  | {
      action: 'change-nft'
      nftId: string
      priceEth?: string
      editionId?: string
      availableQuantity?: number
    }
  | { action: 'replay-nft'; nftId: string; stale?: boolean }
  | { action: 'delay-next-order' | 'disconnect'; durationMs: number }

type RealtimeFrame = {
  name: string
  payload: Record<string, unknown>
}

const nftId = '0042'
const editionId = 'limited-10'

async function observeSocketFrames(page: Page) {
  await page.addInitScript(() => {
    // MSW supplies a WebSocket in the browser. Observe incoming protocol
    // frames without substituting the transport or dispatching events.
    const state = globalThis as typeof globalThis & {
      __testRealtimeFrames?: RealtimeFrame[]
    }
    state.__testRealtimeFrames = []
    const dispatch = EventTarget.prototype.dispatchEvent
    EventTarget.prototype.dispatchEvent = function (event: Event) {
      if (
        event instanceof MessageEvent &&
        event.type === 'message' &&
        /^wss?:/.test(event.origin) &&
        event.origin.includes('/socket.io/') &&
        typeof event.data === 'string' &&
        event.data.startsWith('42[')
      ) {
        const [name, payload] = JSON.parse(event.data.slice(2)) as [
          string,
          Record<string, unknown>,
        ]
        state.__testRealtimeFrames?.push({ name, payload })
      }
      return dispatch.call(this, event)
    }
  })
}

async function readFrames(page: Page, name: string) {
  return page.evaluate((eventName) => {
    const state = globalThis as typeof globalThis & {
      __testRealtimeFrames?: RealtimeFrame[]
    }
    return (
      state.__testRealtimeFrames?.filter((entry) => entry.name === eventName) ??
      []
    )
  }, name)
}

async function controlRealtime(page: Page, input: DemoAction) {
  const response = await page.evaluate(async (body) => {
    const response = await fetch('/api/demo/realtime', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    return { status: response.status, body: await response.text() }
  }, input)

  expect(response.status, response.body).toBe(
    input.action === 'change-nft' || input.action === 'replay-nft' ? 200 : 204,
  )
}

function connectionStatus(page: Page) {
  return page.getByRole('status', { name: 'Conexão em tempo real' })
}

async function openCart(page: Page, quantity = 1) {
  await page.goto(`/nfts/${nftId}`)
  if (quantity > 1) {
    await page.getByRole('button', { name: 'Aumentar quantidade' }).click()
  }
  await page.getByRole('button', { name: 'Comprar', exact: true }).click()
  await expect(page).toHaveURL(/\/carrinho$/)
  await expect(connectionStatus(page)).toHaveText('Tempo real conectado.')
}

async function seedWallet(page: Page) {
  await page.addInitScript(() => {
    const key = 'kurio:wallets:v1:user-ana'
    if (localStorage.getItem(key) !== null) return

    localStorage.setItem(
      key,
      JSON.stringify({
        primary: {
          nickname: 'Principal Ana',
          address: '0x1111111111111111111111111111111111111111',
          network: 'ethereum',
          provider: 'metamask',
          ensName: '',
          referralCode: '',
        },
        secondary: null,
      }),
    )
  })
}

async function signInFromCheckout(
  page: Page,
  { email, password, userId } = {
    email: 'ana@kurio.example.test',
    password: 'Kurio-Ana!2026',
    userId: 'user-ana',
  },
) {
  await page.getByRole('link', { name: 'Entrar para pagar' }).click()
  const dialog = page.getByRole('dialog', { name: 'Entrar' })
  await dialog.getByLabel('E-mail').fill(email)
  await dialog.getByLabel('Senha').fill(password)
  await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(dialog).toBeHidden()
  await expect
    .poll(async () => (await readFrames(page, 'realtime.subscribed')).at(-1))
    .toMatchObject({ payload: { userId } })
}

async function reviewCheckout(page: Page) {
  await page.getByRole('link', { name: 'Conectar e finalizar' }).click()
  await signInFromCheckout(page)
  await page
    .getByRole('button', { name: 'Conectar carteira', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Revisar compra', exact: true })
    .click()
  const confirm = page.getByRole('button', {
    name: 'Confirmar compra',
    exact: true,
  })
  await expect(confirm).toBeEnabled()
  return confirm
}

function waitForOrder(page: Page, status: number) {
  return page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      new URL(response.url()).pathname === '/api/orders' &&
      response.status() === status,
  )
}

test('updates the visible cart total and stock, without replaying duplicate or stale events', async ({
  page,
}) => {
  await observeSocketFrames(page)
  await openCart(page, 2)
  const walletSummary = page.getByRole('complementary', {
    name: 'Resumo da carteira',
  })
  await expect(walletSummary.getByText('2,396 ETH')).toBeVisible()

  const cartUpdating = page.waitForResponse(
    (response) =>
      response.request().method() === 'GET' &&
      new URL(response.url()).pathname === '/api/cart' &&
      response.ok(),
  )
  await controlRealtime(page, {
    action: 'change-nft',
    nftId,
    priceEth: '1.40',
    editionId,
    availableQuantity: 1,
  })
  await cartUpdating
  await expect
    .poll(async () => (await readFrames(page, 'nft.updated')).at(-1))
    .toMatchObject({
      name: 'nft.updated',
      payload: { nftId, version: expect.any(Number) },
    })
  await expect(walletSummary.getByText('2,816 ETH')).toBeVisible()
  await expect(
    page.getByRole('status').filter({
      hasText:
        'O carrinho foi atualizado. Confira o preço e a disponibilidade de Emerald Ape #042.',
    }),
  ).toBeVisible()
  await expect(
    page.getByText(/O estoque de um ou mais NFTs mudou/),
  ).toBeVisible()

  const events = await readFrames(page, 'nft.updated')
  const latest = events.at(-1)?.payload
  const nextCartRequest = page
    .waitForRequest(
      (request) =>
        request.method() === 'GET' &&
        new URL(request.url()).pathname === '/api/cart',
      { timeout: 1_000 },
    )
    .then(
      () => true,
      (error: unknown) => {
        if (!(error instanceof errors.TimeoutError)) throw error
        return false
      },
    )

  await controlRealtime(page, { action: 'replay-nft', nftId })
  await controlRealtime(page, { action: 'replay-nft', nftId, stale: true })
  await expect
    .poll(async () => (await readFrames(page, 'nft.updated')).length)
    .toBeGreaterThanOrEqual(events.length + 2)
  const packets = await readFrames(page, 'nft.updated')
  expect(packets[events.length].payload).toMatchObject({
    eventId: latest?.eventId,
    version: latest?.version,
  })
  expect(Number(packets[events.length + 1].payload.version)).toBeLessThan(
    Number(latest?.version),
  )
  expect(await nextCartRequest).toBe(false)
  await expect(walletSummary.getByText('2,816 ETH')).toBeVisible()
  await expect(
    page.getByText(/O estoque de um ou mais NFTs mudou/),
  ).toBeVisible()
})

test('requires a new review after a Socket.IO quote update and settles via the order event', async ({
  page,
}) => {
  await observeSocketFrames(page)
  await seedWallet(page)
  await openCart(page)
  const confirm = await reviewCheckout(page)
  await expect(page.getByRole('main')).toContainText('1,206 ETH')

  await controlRealtime(page, { action: 'change-nft', nftId, priceEth: '1.40' })
  await expect
    .poll(async () => (await readFrames(page, 'nft.updated')).at(-1))
    .toMatchObject({ payload: { nftId } })
  await expect(page.getByRole('alert')).toContainText('A cotação mudou.')
  await expect(page.getByRole('main')).toContainText('1,416 ETH')
  await expect(confirm).toBeDisabled()

  await page.getByRole('button', { name: 'Voltar à revisão' }).click()
  await page
    .getByRole('button', { name: 'Revisar compra', exact: true })
    .click()
  const submitted = waitForOrder(page, 201)
  await confirm.click()
  const order = await (await submitted).json()
  expect(order).toMatchObject({
    status: 'pending',
    quote: { totalEth: '1.416' },
  })

  await expect
    .poll(async () => (await readFrames(page, 'order.updated')).at(-1))
    .toMatchObject({
      payload: {
        orderId: order.id,
        userId: 'user-ana',
        status: 'confirmed',
        version: 2,
      },
    })
  await expect(
    page.getByRole('heading', { name: 'Pedido confirmado' }),
  ).toBeVisible()
  await expect(page.getByRole('main')).toContainText('1,416 ETH')
})

test('reconciles the same pending order from REST after a Socket.IO reconnect', async ({
  page,
}) => {
  await observeSocketFrames(page)
  await seedWallet(page)
  await openCart(page)
  const confirm = await reviewCheckout(page)

  await controlRealtime(page, { action: 'delay-next-order', durationMs: 1_800 })
  let orderSubmissions = 0
  page.on('request', (request) => {
    if (
      request.method() === 'POST' &&
      new URL(request.url()).pathname === '/api/orders'
    ) {
      orderSubmissions += 1
    }
  })
  const submitted = waitForOrder(page, 201)
  await confirm.click()
  const order = await (await submitted).json()
  expect(order.status).toBe('pending')
  await expect(
    page.getByRole('heading', { name: 'Pedido pendente' }),
  ).toBeVisible()
  await expect(page).toHaveURL(
    (url) => url.searchParams.get('pedido') === order.id,
  )

  const initialPrivateSubscriptions = (
    await readFrames(page, 'realtime.subscribed')
  ).filter((frame) => frame.payload.userId === 'user-ana').length
  await controlRealtime(page, { action: 'disconnect', durationMs: 2_500 })
  await expect(connectionStatus(page)).toContainText('Tempo real desconectado.')
  await expect(
    page.getByRole('heading', { name: 'Pedido pendente' }),
  ).toBeVisible()

  const restoredOrder = page.waitForResponse(
    async (response) =>
      response.request().method() === 'GET' &&
      new URL(response.url()).pathname === `/api/orders/${order.id}` &&
      response.ok() &&
      (await response.json()).status === 'confirmed',
  )
  await expect(connectionStatus(page)).toHaveText('Tempo real conectado.')
  await expect
    .poll(
      async () =>
        (await readFrames(page, 'realtime.subscribed')).filter(
          (frame) => frame.payload.userId === 'user-ana',
        ).length,
    )
    .toBeGreaterThan(initialPrivateSubscriptions)
  expect(await (await restoredOrder).json()).toMatchObject({
    id: order.id,
    status: 'confirmed',
  })
  await expect(
    page.getByRole('heading', { name: 'Pedido confirmado' }),
  ).toBeVisible()
  const orderFrames = await readFrames(page, 'order.updated')
  expect(
    orderFrames.some(
      ({ payload }) =>
        payload.orderId === order.id && payload.status === 'confirmed',
    ),
  ).toBe(false)

  await page.reload()
  await expect(page).toHaveURL(
    (url) => url.searchParams.get('pedido') === order.id,
  )
  await expect(
    page.getByRole('heading', { name: 'Pedido confirmado' }),
  ).toBeVisible()
  expect(orderSubmissions).toBe(1)
})

test('keeps a terminal order event private after switching accounts', async ({
  page,
}) => {
  await observeSocketFrames(page)
  await seedWallet(page)
  await openCart(page)
  const confirm = await reviewCheckout(page)

  await controlRealtime(page, { action: 'delay-next-order', durationMs: 4_500 })
  const submitted = waitForOrder(page, 201)
  await confirm.click()
  const order = await (await submitted).json()
  await expect(
    page.getByRole('heading', { name: 'Pedido pendente' }),
  ).toBeVisible()
  await signOutFromHeader(page)
  await signInFromCheckout(page, {
    email: 'bruno@kurio.example.test',
    password: 'Kurio-Bruno!2026',
    userId: 'user-bruno',
  })
  await expect(page.getByText('Pedido não encontrado.')).toBeVisible()

  // Stock changes are public, so they prove the order settled while the other
  // account was connected. Its terminal order event must remain private.
  await expect
    .poll(async () => (await readFrames(page, 'nft.updated')).at(-1))
    .toMatchObject({ payload: { nftId } })
  expect(
    (await readFrames(page, 'order.updated')).some(
      ({ payload }) =>
        payload.orderId === order.id && payload.status === 'confirmed',
    ),
  ).toBe(false)
  await expect(
    page.getByRole('heading', { name: 'Pedido confirmado' }),
  ).toBeHidden()

  await signOutFromHeader(page)
  await signInFromCheckout(page)
  await expect(
    page.getByRole('heading', { name: 'Pedido confirmado' }),
  ).toBeVisible()
})
