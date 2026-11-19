import { expect, test, type Page } from '@playwright/test'

const favoriteName = 'Favoritar Emerald Ape #042'

async function signIn(page: Page, email: string, password: string) {
  const dialog = page.getByRole('dialog', { name: 'Entrar' })
  await dialog.getByLabel('E-mail').fill(email)
  await dialog.getByLabel('Senha').fill(password)
  await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(dialog).toBeHidden()
}

test('preserves the current NFT at login and keeps favorites isolated by account', async ({
  page,
}) => {
  await page.goto('/nfts/0042?q=Golden&page=2')
  await page
    .getByRole('link', { name: 'Entrar para favoritar Emerald Ape #042' })
    .click()
  await signIn(page, 'ana@kurio.example.test', 'Kurio-Ana!2026')
  await expect(page).toHaveURL(/\/nfts\/0042\?q=Golden&page=2$/)

  const toggle = page.getByRole('button', { name: favoriteName })
  await expect(toggle).toHaveAttribute('aria-pressed', 'false')
  const savedResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/favorites/0042') &&
      response.request().method() === 'PUT' &&
      response.ok(),
  )
  await toggle.click()
  await savedResponse
  await expect(toggle).toBeEnabled()
  await expect(toggle).toHaveAttribute('aria-pressed', 'true')

  await page.reload()
  await expect(toggle).toHaveAttribute('aria-pressed', 'true')

  await page.getByRole('link', { name: 'Lista de interesse' }).click()
  const item = page.getByRole('link', { name: 'Emerald Ape #042' })
  await expect(item).toBeVisible()

  await page.getByRole('button', { name: 'Sair', exact: true }).click()
  const enter = page.getByRole('link', { name: 'Entrar para ver favoritos' })
  await expect(enter).toBeVisible()
  await expect(item).toBeHidden()
  await enter.click()
  await signIn(page, 'bruno@kurio.example.test', 'Kurio-Bruno!2026')
  await expect(page.getByText('Você ainda não tem favoritos.')).toBeVisible()

  await page.getByRole('button', { name: 'Sair', exact: true }).click()
  await enter.click()
  await signIn(page, 'ana@kurio.example.test', 'Kurio-Ana!2026')
  await expect(item).toBeVisible()
  await toggle.click()
  await expect(page.getByText('Você ainda não tem favoritos.')).toBeVisible()

  await page.reload()
  await expect(page.getByText('Você ainda não tem favoritos.')).toBeVisible()
})

test('rolls back a failed favorite and allows a retry from the catalog', async ({
  page,
}) => {
  await page.goto('/')
  await page
    .getByRole('link', { name: 'Entrar para favoritar Emerald Ape #042' })
    .click()
  await signIn(page, 'ana@kurio.example.test', 'Kurio-Ana!2026')

  await page.evaluate(() =>
    localStorage.setItem('kurio:mock-favorites-fail-next:v1', 'true'),
  )
  const toggle = page.getByRole('button', { name: favoriteName })
  const failedResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/favorites/0042') &&
      response.request().method() === 'PUT' &&
      response.status() === 503,
  )

  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-pressed', 'true')
  await failedResponse
  const error = page.getByRole('alert')
  await expect(error).toHaveText(
    'Não foi possível atualizar o favorito. Tente novamente.',
  )
  await expect(toggle).toHaveAttribute('aria-pressed', 'false')

  await toggle.click()
  await expect(toggle).toBeEnabled()
  await expect(toggle).toHaveAttribute('aria-pressed', 'true')
  await expect(error).toBeHidden()
})
