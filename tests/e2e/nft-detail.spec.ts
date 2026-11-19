import { expect, test } from '@playwright/test'

test('switches gallery views, opens zoom and browses the same collection', async ({
  page,
  isMobile,
}) => {
  await page.goto('/nfts/0042')
  const gallery = page.getByRole('region', { name: 'Galeria do NFT' })
  if (isMobile) {
    await expect(
      gallery.getByRole('button', { name: 'Detalhe central' }),
    ).toBeHidden()
    await expect(
      page.getByRole('link', { name: /Entrar para favoritar/ }),
    ).toBeVisible()
  } else {
    await expect(gallery.locator('button[aria-pressed]')).toHaveCount(4)
    await gallery.getByRole('button', { name: 'Detalhe central' }).click()
    await expect(
      gallery.getByRole('img', { name: /detalhe central/i }),
    ).toBeVisible()
  }
  const zoom = gallery.getByRole('button', { name: 'Ampliar imagem' })
  await zoom.locator('img').click()
  const dialog = page.getByRole('dialog', { name: 'Imagem ampliada' })
  await expect(dialog.getByRole('img')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(zoom).toBeFocused()

  await page.getByRole('tab', { name: /Avaliações de colecionadores/ }).click()
  await expect(page.getByRole('tabpanel')).toContainText('Nota 5 de 5')
  const related = page.getByRole('region', { name: 'Mais desta coleção' })
  await expect(
    related.getByRole('link', { name: 'Golden Beat #207' }),
  ).toHaveCount(0)
  await related.getByRole('link', { name: 'Sage Nomad #009' }).click()
  await expect(
    page.getByRole('heading', { name: 'Sage Nomad #009' }),
  ).toBeVisible()
  await expect(
    page.getByRole('tab', { name: 'Detalhes do NFT', selected: true }),
  ).toBeVisible()
})

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
