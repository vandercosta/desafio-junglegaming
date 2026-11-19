import { expect, test } from '@playwright/test'

test('adds an NFT edition to the guest cart and keeps it after reload', async ({
  page,
}) => {
  await page.goto('/nfts/0042')
  await page.getByRole('button', { name: 'Aumentar quantidade' }).click()
  await page.getByRole('button', { name: 'Comprar', exact: true }).click()

  await expect(page).toHaveURL(/\/carrinho(?:\?|$)/)

  const summary = page.getByRole('complementary', {
    name: 'Resumo da carteira',
  })
  const row = page.locator('li').filter({
    has: page.getByRole('heading', { name: 'Emerald Ape #042' }),
  })
  await expect(row.locator('img').first()).toHaveJSProperty('naturalWidth', 250)
  await expect(
    row.getByRole('button', { name: /^Remover Emerald Ape/ }),
  ).toBeVisible()
  await expect(summary.getByText('2,38 ETH', { exact: true })).toBeVisible()

  await page.reload()

  await expect(
    page.getByRole('heading', { name: 'Emerald Ape #042' }),
  ).toBeVisible()
  await expect(summary.getByText('2,38 ETH', { exact: true })).toBeVisible()
})
test('updates and removes an NFT edition from the guest cart', async ({
  page,
}) => {
  await page.goto('/nfts/0042')
  await page.getByRole('button', { name: 'Comprar', exact: true }).click()

  const summary = page.getByRole('complementary', {
    name: 'Resumo da carteira',
  })
  const increase = page.getByRole('button', {
    name: /^Aumentar quantidade de Emerald Ape/,
  })
  const decrease = page.getByRole('button', {
    name: /^Diminuir quantidade de Emerald Ape/,
  })

  await expect(summary.getByText('1,19 ETH', { exact: true })).toBeVisible()
  await expect(decrease).toBeDisabled()

  await increase.click()
  await expect(summary.getByText('2,38 ETH', { exact: true })).toBeVisible()

  await page.reload()
  await expect(summary.getByText('2,38 ETH', { exact: true })).toBeVisible()
  await expect(increase).toBeDisabled()

  await decrease.click()
  await expect(summary.getByText('1,19 ETH', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: /^Remover Emerald Ape/ }).click()
  await expect(page.getByText('Seu carrinho está vazio.')).toBeVisible()

  await page.reload()
  await expect(page.getByText('Seu carrinho está vazio.')).toBeVisible()
})

test('applies and removes a coupon, preserving the quote across reloads', async ({
  page,
}) => {
  await page.goto('/nfts/0042')
  await page.getByRole('button', { name: 'Comprar', exact: true }).click()

  const summary = page.getByRole('complementary', {
    name: 'Resumo da carteira',
  })
  const coupon = summary.getByLabel('Código promocional', { exact: true })
  const appliedCoupon = summary.getByText('Cupom aplicado: KURIO10', {
    exact: true,
  })

  await expect(summary.getByText('0,016 ETH', { exact: true })).toBeVisible()
  await expect(summary.getByText('1,206 ETH', { exact: true })).toBeVisible()

  await coupon.fill(' kurio10 ')
  await summary.getByRole('button', { name: 'Aplicar', exact: true }).click()
  await expect(appliedCoupon).toBeVisible()
  await expect(summary.getByText('−0,119 ETH', { exact: true })).toBeVisible()
  await expect(summary.getByText('1,087 ETH', { exact: true })).toBeVisible()

  await page.reload()
  await expect(appliedCoupon).toBeVisible()
  await expect(summary.getByText('1,087 ETH', { exact: true })).toBeVisible()

  await page
    .getByRole('button', { name: /^Aumentar quantidade de Emerald Ape/ })
    .click()
  await expect(summary.getByText('2,38 ETH', { exact: true })).toBeVisible()
  await expect(summary.getByText('−0,238 ETH', { exact: true })).toBeVisible()
  await expect(summary.getByText('2,158 ETH', { exact: true })).toBeVisible()

  await summary.getByRole('button', { name: 'Remover cupom' }).click()
  await expect(appliedCoupon).not.toBeVisible()
  await expect(summary.getByText('2,396 ETH', { exact: true })).toBeVisible()

  await page.reload()
  await expect(summary.getByText('2,396 ETH', { exact: true })).toBeVisible()
  await expect(appliedCoupon).not.toBeVisible()
})

test('rejects invalid and expired coupons without changing the active quote', async ({
  page,
}) => {
  await page.goto('/nfts/0042')
  await page.getByRole('button', { name: 'Comprar', exact: true }).click()

  const summary = page.getByRole('complementary', {
    name: 'Resumo da carteira',
  })
  const coupon = summary.getByLabel('Código promocional', { exact: true })
  const applyCoupon = summary.getByRole('button', {
    name: 'Aplicar',
    exact: true,
  })
  const appliedCoupon = summary.getByText('Cupom aplicado: KURIO10', {
    exact: true,
  })
  const discountedTotal = summary.getByText('1,087 ETH', { exact: true })

  await coupon.fill('KURIO10')
  await applyCoupon.click()
  await expect(appliedCoupon).toBeVisible()

  await coupon.fill('INVALIDO')
  await applyCoupon.click()
  await expect(summary.getByRole('alert')).toHaveText('Cupom inválido.')
  await expect(appliedCoupon).toBeVisible()
  await expect(discountedTotal).toBeVisible()

  await coupon.fill('EXPIRADO10')
  await applyCoupon.click()
  await expect(summary.getByRole('alert')).toHaveText('Cupom expirado.')
  await expect(appliedCoupon).toBeVisible()
  await expect(discountedTotal).toBeVisible()
})

test('merges the guest cart once and keeps each account cart isolated', async ({
  page,
}) => {
  const summary = page.getByRole('complementary', {
    name: 'Resumo da carteira',
  })
  const nft = page.getByRole('heading', { name: 'Emerald Ape #042' })
  const emptyCart = page.getByText('Seu carrinho está vazio.')
  const signOut = page.getByRole('button', { name: 'Sair', exact: true })

  async function buyEdition() {
    await page.goto('/nfts/0042')
    await page.getByRole('button', { name: 'Comprar', exact: true }).click()
    await expect(nft).toBeVisible()
  }

  async function signIn(email: string, password: string, displayName: string) {
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Entrar' })
    await dialog.getByLabel('E-mail').fill(email)
    await dialog.getByLabel('Senha').fill(password)
    await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(page.getByText(displayName, { exact: true })).toBeVisible()
  }

  await buyEdition()
  await summary.getByLabel('Código promocional').fill('KURIO10')
  await summary.getByRole('button', { name: 'Aplicar', exact: true }).click()
  await expect(summary.getByText('Cupom aplicado: KURIO10')).toBeVisible()

  await signIn('ana@kurio.example.test', 'Kurio-Ana!2026', 'Ana Demo')
  await expect(summary.getByText('1,087 ETH', { exact: true })).toBeVisible()
  await signOut.click()
  await expect(emptyCart).toBeVisible()

  await signIn('bruno@kurio.example.test', 'Kurio-Bruno!2026', 'Bruno Demo')
  await expect(emptyCart).toBeVisible()
  await expect(nft).toBeHidden()
  await buyEdition()
  await expect(summary.getByText('1,206 ETH', { exact: true })).toBeVisible()
  await signOut.click()
  await expect(
    page.getByRole('button', { name: 'Entrar', exact: true }),
  ).toBeVisible()

  await buyEdition()
  await signIn('ana@kurio.example.test', 'Kurio-Ana!2026', 'Ana Demo')
  await expect(summary.getByText('2,158 ETH', { exact: true })).toBeVisible()

  await page.reload()
  await expect(summary.getByText('2,158 ETH', { exact: true })).toBeVisible()
  await signOut.click()
  await expect(emptyCart).toBeVisible()

  await signIn('ana@kurio.example.test', 'Kurio-Ana!2026', 'Ana Demo')
  await expect(summary.getByText('2,158 ETH', { exact: true })).toBeVisible()
  await signOut.click()
  await expect(emptyCart).toBeVisible()
  await signIn('bruno@kurio.example.test', 'Kurio-Bruno!2026', 'Bruno Demo')
  await expect(summary.getByText('1,206 ETH', { exact: true })).toBeVisible()
})

test('keeps quantities visible when merging exceeds the available stock', async ({
  page,
}) => {
  // Restore the legacy visitor cart to cover existing demo data.
  await page.addInitScript(() => {
    if (localStorage.getItem('kurio:carts:v1') === null) {
      localStorage.setItem(
        'kurio:guest-cart:v1',
        JSON.stringify([
          { nftId: '0042', editionId: 'limited-10', quantity: 2 },
        ]),
      )
    }
  })

  await page.goto('/carrinho')
  const summary = page.getByRole('complementary', {
    name: 'Resumo da carteira',
  })
  await expect(summary.getByText('2,38 ETH', { exact: true })).toBeVisible()

  async function signInAsAna() {
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Entrar' })
    await dialog.getByLabel('E-mail').fill('ana@kurio.example.test')
    await dialog.getByLabel('Senha').fill('Kurio-Ana!2026')
    await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(page.getByText('Ana Demo', { exact: true })).toBeVisible()
  }

  await signInAsAna()
  await expect(summary.getByText('2,38 ETH', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Sair', exact: true }).click()
  await expect(page.getByText('Seu carrinho está vazio.')).toBeVisible()

  await page.goto('/nfts/0042')
  await page.getByRole('button', { name: 'Comprar', exact: true }).click()
  await expect(summary.getByText('1,19 ETH', { exact: true })).toBeVisible()

  await signInAsAna()
  await expect(page.getByRole('alert')).toContainText(
    'O estoque de um ou mais NFTs mudou.',
  )
  await expect(page.getByLabel(/^Quantidade de Emerald Ape/)).toHaveText('3')

  await page
    .getByRole('button', { name: /^Diminuir quantidade de Emerald Ape/ })
    .click()
  await expect(page.getByLabel(/^Quantidade de Emerald Ape/)).toHaveText('2')
  await expect(page.getByRole('alert')).toBeHidden()
})
