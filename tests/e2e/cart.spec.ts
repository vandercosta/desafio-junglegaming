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
