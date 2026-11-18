import { expect, test, type Page } from '@playwright/test'

async function signIn(page: Page, email: string, password: string) {
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()

  const dialog = page.getByRole('dialog', { name: 'Entrar' })
  await dialog.getByLabel('E-mail').fill(email)
  await dialog.getByLabel('Senha').fill(password)
  await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()

  return dialog
}

test('restores the session after reload and allows switching accounts', async ({
  page,
}) => {
  await page.goto('/')
  await signIn(page, 'ana@kurio.example.test', 'Kurio-Ana!2026')
  await expect(page.getByText('Ana Demo', { exact: true })).toBeVisible()

  await page.reload()
  await expect(page.getByText('Ana Demo', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Sair', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Entrar', exact: true }),
  ).toBeVisible()

  await page.reload()
  await expect(
    page.getByRole('button', { name: 'Entrar', exact: true }),
  ).toBeVisible()

  await signIn(page, 'bruno@kurio.example.test', 'Kurio-Bruno!2026')
  await expect(page.getByText('Bruno Demo', { exact: true })).toBeVisible()
})

test('rejects invalid credentials and preserves the current NFT URL after sign-in', async ({
  page,
}) => {
  await page.goto('/nfts/0042?q=Golden&page=2')

  const dialog = await signIn(
    page,
    'ana@kurio.example.test',
    'incorrect-password',
  )

  await expect(dialog.getByRole('alert')).toHaveText(
    'E-mail ou senha incorretos.',
  )

  await dialog.getByLabel('Senha').fill('Kurio-Ana!2026')
  await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()

  await expect(dialog).toBeHidden()
  await expect(page).toHaveURL(
    (url) =>
      url.pathname === '/nfts/0042' &&
      url.searchParams.get('q') === 'Golden' &&
      url.searchParams.get('page') === '2' &&
      !url.searchParams.has('auth'),
  )
})

test('asks the user to sign in again after the mock session expires', async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date('2026-01-01T12:00:00Z'))
  await page.goto('/')

  await signIn(page, 'ana@kurio.example.test', 'Kurio-Ana!2026')
  await expect(page.getByText('Ana Demo', { exact: true })).toBeVisible()

  await page.clock.setFixedTime(new Date('2026-01-01T12:31:00Z'))
  await page.reload()

  await expect(page.getByRole('alert')).toHaveText(
    'Sua sessão expirou. Entre novamente.',
  )
  await expect(
    page.getByRole('button', { name: 'Entrar', exact: true }),
  ).toBeVisible()
})
