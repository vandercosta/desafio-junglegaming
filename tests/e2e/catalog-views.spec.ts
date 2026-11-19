import { expect, test } from '@playwright/test'

test('filters catalog views and preserves other filters in the URL', async ({
  page,
}) => {
  await page.goto('/?collection=arte-digital&page=2')

  const all = page.getByRole('button', { name: 'Todos os NFTs' })
  const recent = page.getByRole('button', { name: 'Novos lançamentos' })
  const trending = page.getByRole('button', { name: 'Em alta' })
  const cosmic = page.getByRole('link', {
    name: 'Cosmic Bloom #118',
    exact: true,
  })
  const emerald = page.getByRole('link', {
    name: 'Emerald Ape #042',
    exact: true,
  })

  await expect(all).toHaveAttribute('aria-pressed', 'true')
  await recent.click()
  await expect(page).toHaveURL(
    (url) =>
      url.searchParams.get('view') === 'new' &&
      url.searchParams.get('collection') === 'arte-digital' &&
      !url.searchParams.has('page'),
  )
  await expect(cosmic).toBeVisible()
  await expect(emerald).toBeHidden()

  await trending.click()
  await expect(emerald).toBeVisible()
  await expect(cosmic).toBeHidden()
  await page.reload()
  await expect(trending).toHaveAttribute('aria-pressed', 'true')
  await expect(emerald).toBeVisible()

  await page.goBack()
  await expect(recent).toHaveAttribute('aria-pressed', 'true')
  await expect(cosmic).toBeVisible()
})
