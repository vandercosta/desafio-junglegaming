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
