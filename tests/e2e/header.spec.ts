import { expect, test } from '@playwright/test'

test('navigates the desktop marketplace header without losing catalog filters', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'Desktop navigation is only visible at desktop widths')
  await page.goto('/?q=Emerald&collection=arte-digital')

  const navigation = page.getByRole('navigation', {
    name: 'Navegação principal',
  })
  const home = navigation.getByRole('link', { name: 'Início' })
  const market = navigation.getByRole('link', { name: 'Mercado' })
  const searchbox = page.getByRole('searchbox', { name: 'Buscar NFTs' })
  await expect(searchbox).toBeHidden()
  await expect(navigation).toHaveCSS('column-gap', '40px')
  await expect(navigation.getByText('Criadores', { exact: true })).toBeVisible()
  await expect(navigation.getByText('Aprenda', { exact: true })).toBeVisible()
  await expect(navigation.getByRole('link')).toHaveCount(2)
  await expect(home).toHaveAttribute('aria-current', 'page')

  await market.click()
  await expect(page).toHaveURL(
    (url) =>
      url.pathname === '/' &&
      url.hash === '#catalogo' &&
      url.searchParams.get('q') === 'Emerald' &&
      url.searchParams.get('collection') === 'arte-digital',
  )
  await expect(market).toHaveAttribute('aria-current', 'page')
  await expect(home).not.toHaveAttribute('aria-current', 'page')

  await home.click()
  await expect(page).toHaveURL(
    (url) => !url.hash && url.searchParams.get('q') === 'Emerald',
  )

  const nft = page.getByRole('link', { name: 'Emerald Ape #042', exact: true })
  const cart = page.getByRole('link', { name: 'Carrinho', exact: true })
  await nft.click()
  await expect(market).toHaveAttribute('aria-current', 'true')
  await expect(cart).toBeVisible()
  await page.getByRole('link', { name: 'Buscar NFTs' }).click()
  await expect(searchbox).toBeFocused()
  await expect(nft).toBeVisible()

  await nft.click()
  await page.getByRole('button', { name: 'Comprar', exact: true }).click()
  await expect(cart).toHaveAccessibleDescription('1 edição no carrinho')
})

test('applies mobile catalog filters alongside search and restores query history', async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, 'The catalog filter dialog is only used on mobile')
  await page.goto('/?q=Emerald&page=2')

  const search = page.getByRole('searchbox', { name: 'Explorar coleções' })
  const openFilters = page.getByRole('button', { name: 'Abrir filtros' })
  const filters = page.getByRole('dialog', { name: 'Filtros do catálogo' })
  const collection = filters.getByLabel('Coleção')
  const network = filters.getByLabel('Rede')
  await expect(search).toHaveValue('Emerald')
  await openFilters.click()
  await collection.selectOption('arte-digital')
  await network.selectOption('ethereum')
  await filters.getByRole('button', { name: 'Aplicar' }).click()
  await expect(filters).toBeHidden()
  await expect(page).toHaveURL(
    (url) =>
      url.searchParams.get('q') === 'Emerald' &&
      url.searchParams.get('collection') === 'arte-digital' &&
      url.searchParams.get('network') === 'ethereum' &&
      !url.searchParams.has('page'),
  )

  await search.fill('Sage')
  await search.press('Enter')
  await expect(
    page.getByRole('link', { name: 'Sage Nomad #009', exact: true }),
  ).toBeVisible()
  await expect(page).toHaveURL(
    (url) =>
      url.searchParams.get('q') === 'Sage' &&
      url.searchParams.get('collection') === 'arte-digital' &&
      url.searchParams.get('network') === 'ethereum',
  )

  await page.goBack()
  await expect(search).toHaveValue('Emerald')
  await openFilters.click()
  await expect(collection).toHaveValue('arte-digital')
  await expect(network).toHaveValue('ethereum')
  await page.keyboard.press('Escape')
  await expect(filters).toBeHidden()
  await expect(openFilters).toBeFocused()
})
