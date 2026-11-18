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
