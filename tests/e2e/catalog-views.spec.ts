import { expect, test } from '@playwright/test'

test('sorts from the toolbar on desktop and the filter panel on mobile', async ({
  page,
  isMobile,
}) => {
  await page.goto('/?view=new&page=2')
  const sort = page.getByRole('combobox', { name: 'Ordenar por' })

  if (isMobile) {
    await expect(sort).toBeHidden()
    await expect(page.getByRole('complementary')).toBeHidden()
    await page.getByRole('button', { name: 'Abrir filtros' }).click()
    await sort.selectOption('price-desc')
    await page.getByRole('button', { name: 'Aplicar' }).click()
  } else {
    await sort.selectOption('price-desc')
  }

  await expect(page).toHaveURL(
    (url) =>
      url.searchParams.get('view') === 'new' &&
      url.searchParams.get('sort') === 'price-desc' &&
      !url.searchParams.has('page'),
  )

  if (!isMobile) {
    await page.getByRole('link', { name: 'Buscar NFTs' }).click()
    await expect(sort).toHaveCount(1)
    await page
      .getByRole('complementary')
      .getByRole('button', { name: /Arte digital/ })
      .click()
    await expect(page).toHaveURL(
      (url) =>
        url.searchParams.get('collection') === 'arte-digital' &&
        url.searchParams.get('sort') === 'price-desc',
    )
    await expect(sort).toHaveValue('price-desc')
  }
})

test('combines desktop sidebar filters and applies a keyboard-selected price range', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'The sidebar is only visible on desktop')
  await page.goto('/?page=2')

  const sidebar = page.getByRole('complementary')
  const collection = sidebar.getByRole('button', { name: /Arte digital/ })
  const network = sidebar.getByRole('button', { name: /Ethereum/ })
  await collection.click()
  await expect(page).toHaveURL(
    (url) =>
      url.searchParams.get('collection') === 'arte-digital' &&
      !url.searchParams.has('page'),
  )
  await network.click()
  await expect(page).toHaveURL(
    (url) =>
      url.searchParams.get('collection') === 'arte-digital' &&
      url.searchParams.get('network') === 'ethereum',
  )

  await page.getByRole('button', { name: 'Próxima' }).click()
  await expect(page).toHaveURL((url) => url.searchParams.get('page') === '2')

  await sidebar
    .getByRole('slider', { name: 'Preço mínimo em ETH' })
    .press('ArrowRight')
  await sidebar
    .getByRole('slider', { name: 'Preço máximo em ETH' })
    .press('ArrowLeft')
  await expect(page).toHaveURL(
    (url) =>
      url.searchParams.get('page') === '2' &&
      !url.searchParams.has('minEth') &&
      !url.searchParams.has('maxEth'),
  )
  await sidebar.getByRole('button', { name: 'Aplicar', exact: true }).click()
  await expect(page).toHaveURL(
    (url) =>
      url.searchParams.get('collection') === 'arte-digital' &&
      url.searchParams.get('network') === 'ethereum' &&
      Number(url.searchParams.get('minEth')) === 0.03 &&
      Number(url.searchParams.get('maxEth')) === 12.29 &&
      !url.searchParams.has('page'),
  )
  await expect(
    page.getByRole('link', { name: 'Emerald Ape #042', exact: true }),
  ).toBeVisible()

  await page.goBack()
  await expect(page).toHaveURL(
    (url) =>
      url.searchParams.get('page') === '2' &&
      !url.searchParams.has('minEth') &&
      !url.searchParams.has('maxEth'),
  )
  await expect(
    page.getByRole('link', { name: 'Violet Nomad #314', exact: true }),
  ).toBeVisible()
})

test('searches while typing on desktop without discarding active filters', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'Desktop search opens from the header icon')
  await page.goto('/?collection=arte-digital&network=ethereum&page=2')

  await page.getByRole('link', { name: 'Buscar NFTs' }).click()
  const searchbox = page.getByRole('searchbox', { name: 'Buscar NFTs' })
  await expect(searchbox).toBeFocused()
  await searchbox.fill('Cosmic')

  await expect(page).toHaveURL(
    (url) =>
      url.searchParams.get('q') === 'Cosmic' &&
      url.searchParams.get('collection') === 'arte-digital' &&
      url.searchParams.get('network') === 'ethereum' &&
      !url.searchParams.has('page'),
  )
  await expect(
    page.getByRole('link', { name: 'Cosmic Bloom #118', exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'Violet Nomad #314', exact: true }),
  ).toBeHidden()

  await page.reload()
  await expect(searchbox).toHaveValue('Cosmic')

  await page.goBack()
  await expect(searchbox).toHaveValue('')
  await expect(page).toHaveURL(
    (url) => !url.searchParams.has('q') && url.searchParams.get('page') === '2',
  )
})

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
