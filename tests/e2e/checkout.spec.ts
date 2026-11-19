import { expect, test, type Page } from '@playwright/test'

const demoEmail = 'ana@kurio.example.test'
const demoPassword = 'Kurio-Ana!2026'
const walletAddress = '0x1111111111111111111111111111111111111111'
const walletNickname = 'Principal Ana'
const scenarioKey = 'kurio:mock-checkout-scenario:v1'

async function signIn(page: Page) {
  const dialog = page.getByRole('dialog', { name: 'Entrar' })
  await dialog.getByLabel('E-mail').fill(demoEmail)
  await dialog.getByLabel('Senha').fill(demoPassword)
  await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(dialog).toBeHidden()
}

async function registerWallet(page: Page) {
  await page.goto('/perfil/carteiras')
  await page.getByRole('link', { name: 'Entrar para ver as carteiras' }).click()
  await signIn(page)

  const wallet = page.getByRole('region', { name: 'Carteira principal' })
  await wallet.getByRole('button', { name: 'Adicionar carteira' }).click()
  await wallet.getByLabel('Apelido da carteira').fill(walletNickname)
  await wallet.getByLabel('Rede', { exact: true }).selectOption('ethereum')
  await wallet.getByLabel('Tipo de carteira').selectOption('metamask')
  await wallet.getByLabel('Endereço da carteira').fill(walletAddress)
  await wallet.getByRole('button', { name: 'Salvar carteira' }).click()
  await expect(wallet.getByText(walletAddress)).toBeVisible()

  await page.getByRole('button', { name: 'Sair', exact: true }).click()
  await expect(
    page.getByRole('link', { name: 'Entrar para ver as carteiras' }),
  ).toBeVisible()
}

async function seedWallet(page: Page) {
  await page.addInitScript(
    ({ nickname, address }) => {
      const key = 'kurio:wallets:v1:user-ana'
      if (localStorage.getItem(key) !== null) return

      localStorage.setItem(
        key,
        JSON.stringify({
          primary: {
            nickname,
            address,
            network: 'ethereum',
            provider: 'metamask',
            ensName: '',
            referralCode: '',
          },
          secondary: null,
        }),
      )
    },
    { nickname: walletNickname, address: walletAddress },
  )
}

async function goToCheckout(page: Page) {
  await page.goto('/nfts/0042')
  await page.getByRole('button', { name: 'Comprar', exact: true }).click()
  await page.getByRole('link', { name: 'Conectar e finalizar' }).click()
  await page.getByRole('link', { name: 'Entrar para pagar' }).click()
  await signIn(page)
  await expect(page).toHaveURL(/\/pagamento$/)
}

async function reviewPurchase(page: Page) {
  await page
    .getByRole('button', { name: 'Conectar carteira', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Revisar compra', exact: true })
    .click()
  return page.getByRole('button', { name: 'Confirmar compra', exact: true })
}

function waitForOrderSubmission(page: Page, status: number) {
  return page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      new URL(response.url()).pathname === '/api/orders' &&
      response.status() === status,
  )
}

async function setScenario(
  page: Page,
  scenario:
    | 'refused'
    | 'timeout'
    | 'quote-changed'
    | 'connection-refused'
    | 'disconnected',
) {
  await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
    key: scenarioKey,
    value: scenario,
  })
}

test('finishes a guest purchase after sign-in and restores the confirmed receipt', async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date('2026-01-01T12:00:00Z'))
  await registerWallet(page)
  await goToCheckout(page)
  await expect(page.getByLabel('Nome de exibição')).toHaveValue('Ana Demo')

  const submissions: string[] = []
  page.on('request', (request) => {
    if (
      request.method() === 'POST' &&
      new URL(request.url()).pathname === '/api/orders'
    ) {
      submissions.push(request.headers()['idempotency-key'])
    }
  })

  const confirm = await reviewPurchase(page)
  const pendingResponse = waitForOrderSubmission(page, 201)
  await confirm.dblclick()
  const response = await pendingResponse
  const created = await response.json()
  expect(created).toMatchObject({
    status: 'pending',
    quote: {
      totalEth: '1.206',
      items: [expect.objectContaining({ nftId: '0042', quantity: 1 })],
    },
    wallet: { address: walletAddress },
  })

  await expect(page).toHaveURL(
    (url) => url.searchParams.get('pedido') === created.id,
  )
  await expect(
    page.getByRole('heading', { name: 'Pedido pendente' }),
  ).toBeVisible()
  await page.clock.setFixedTime(new Date('2026-01-01T12:31:00Z'))
  await page.reload()
  await expect(
    page.getByText('Sua sessão expirou. Entre novamente.'),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Pedido pendente' }),
  ).toBeHidden()
  await page.getByRole('link', { name: 'Entrar para pagar' }).click()
  await signIn(page)
  await expect(page).toHaveURL(
    (url) => url.searchParams.get('pedido') === created.id,
  )
  await expect(
    page.getByRole('heading', { name: 'Pedido confirmado' }),
  ).toBeVisible()
  await expect(page.getByText('Emerald Ape #042')).toBeVisible()
  await expect(page.getByRole('main')).toContainText('1,206 ETH')
  expect(submissions).toEqual([expect.any(String)])

  await page.getByRole('link', { name: 'Voltar ao carrinho' }).click()
  await expect(page.getByText('Seu carrinho está vazio.')).toBeVisible()
})

test('recovers from wallet connection failures and keeps the items after payment refusal', async ({
  page,
}) => {
  await seedWallet(page)
  await goToCheckout(page)

  const connect = page.getByRole('button', {
    name: 'Conectar carteira',
    exact: true,
  })
  const failures = [
    {
      scenario: 'connection-refused',
      status: 'refused',
      message: /conexão com a carteira foi recusada/i,
    },
    {
      scenario: 'disconnected',
      status: 'disconnected',
      message: /desconectada/i,
    },
  ] as const

  for (const { scenario, status, message } of failures) {
    await setScenario(page, scenario)
    const connecting = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        new URL(response.url()).pathname === '/api/checkout/connection',
    )
    await connect.click()
    expect(await (await connecting).json()).toMatchObject({ status })
    await expect(page.getByText(message)).toBeVisible()
  }

  await connect.click()
  const disconnect = page.getByRole('button', { name: 'Desconectar carteira' })
  const disconnecting = page.waitForResponse(
    (response) =>
      response.request().method() === 'DELETE' &&
      new URL(response.url()).pathname === '/api/checkout/connection',
  )
  await disconnect.click()
  expect((await disconnecting).status()).toBe(204)
  await expect(
    page.getByRole('button', { name: 'Revisar compra', exact: true }),
  ).toBeDisabled()

  await setScenario(page, 'refused')

  const confirm = await reviewPurchase(page)
  await confirm.click()

  await expect(
    page.getByRole('heading', { name: 'Pagamento recusado' }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Pedido confirmado' }),
  ).toBeHidden()
  await page.getByRole('link', { name: 'Voltar ao carrinho' }).click()
  await expect(
    page.getByRole('heading', { name: 'Emerald Ape #042' }),
  ).toBeVisible()
})

test('retries a timed-out request after reload with the same idempotency key', async ({
  page,
}) => {
  await seedWallet(page)
  await goToCheckout(page)
  await setScenario(page, 'timeout')

  const confirm = await reviewPurchase(page)
  const failedResponse = waitForOrderSubmission(page, 504)
  await confirm.click()
  const failed = await failedResponse
  expect(await failed.json()).toMatchObject({ code: 'ORDER_RESPONSE_TIMEOUT' })

  const retry = page.getByRole('button', { name: 'Tentar enviar novamente' })
  await expect(retry).toBeVisible()
  await page.reload()
  await expect(retry).toBeVisible()

  const recoveredResponse = waitForOrderSubmission(page, 200)
  await retry.click()
  const recovered = await recoveredResponse
  const idempotencyKey = failed.request().headers()['idempotency-key']
  const submitted = failed.request().postDataJSON()
  expect(recovered.request().headers()['idempotency-key']).toBe(idempotencyKey)
  expect(recovered.request().postDataJSON()).toEqual(submitted)
  const existingOrder = await recovered.json()
  await expect(page).toHaveURL(
    (url) => url.searchParams.get('pedido') === existingOrder.id,
  )
  await expect(
    page.getByRole('heading', { name: 'Pedido confirmado' }),
  ).toBeVisible()

  await page.getByRole('link', { name: 'Voltar ao carrinho' }).click()
  await expect(page.getByText('Seu carrinho está vazio.')).toBeVisible()

  await page.goto('/nfts/0042')
  await page.getByRole('button', { name: 'Comprar', exact: true }).click()
  const quantity = page.getByLabel(/^Quantidade de Emerald Ape/)
  await expect(quantity).toHaveText('1')

  // A terminal replay must neither create another order nor deduct the new item.
  const { replay, conflict } = await page.evaluate(
    async ({ key, input }) => {
      async function submit(body: typeof input) {
        const response = await fetch('/api/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': key,
            'X-Checkout-User': 'user-ana',
          },
          body: JSON.stringify(body),
        })
        return { status: response.status, body: await response.json() }
      }

      return {
        replay: await submit(input),
        conflict: await submit({
          ...input,
          collector: { ...input.collector, note: 'Changed input' },
        }),
      }
    },
    { key: idempotencyKey, input: submitted },
  )
  expect(replay).toMatchObject({
    status: 200,
    body: { id: existingOrder.id, status: 'confirmed' },
  })
  expect(conflict).toMatchObject({
    status: 409,
    body: { code: 'IDEMPOTENCY_CONFLICT' },
  })
  await page.reload()
  await expect(quantity).toHaveText('1')
})

test('requires a new review before accepting a changed quote', async ({
  page,
}) => {
  await seedWallet(page)
  await goToCheckout(page)

  const confirm = await reviewPurchase(page)
  await expect(page.getByRole('main')).toContainText('1,206 ETH')
  await setScenario(page, 'quote-changed')
  const conflictResponse = waitForOrderSubmission(page, 409)
  await confirm.click()
  const conflict = await conflictResponse
  expect(await conflict.json()).toMatchObject({ code: 'QUOTE_CHANGED' })

  await expect(page.getByRole('alert')).toContainText('A cotação mudou')
  await expect(page.getByRole('main')).toContainText('1,306 ETH')
  await expect(confirm).toBeHidden()
  await expect(page).toHaveURL(/\/pagamento$/)

  await page
    .getByRole('button', { name: 'Revisar compra', exact: true })
    .click()
  const reviewedResponse = waitForOrderSubmission(page, 201)
  await confirm.click()
  const reviewed = await reviewedResponse
  expect(reviewed.request().headers()['idempotency-key']).not.toBe(
    conflict.request().headers()['idempotency-key'],
  )
  expect(await reviewed.json()).toMatchObject({ quote: { totalEth: '1.306' } })
  await expect(
    page.getByRole('heading', { name: 'Pedido confirmado' }),
  ).toBeVisible()
})
