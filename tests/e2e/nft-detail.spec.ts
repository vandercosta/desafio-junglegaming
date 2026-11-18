import { expect, test } from '@playwright/test'

test('opens the NFT detail page directly and after a reload', async ({
  page,
}) => {
  await page.goto('/nfts/0042')

  const heading = page.getByRole('heading', { name: 'Emerald Ape #042' })
  await expect(heading).toBeVisible()

  await page.reload()
  await expect(heading).toBeVisible()
})

test('shows a not-found message for a missing NFT', async ({ page }) => {
  await page.goto('/nfts/inexistente')

  await expect(
    page.getByRole('heading', { name: 'NFT não encontrado' }),
  ).toBeVisible()
})
