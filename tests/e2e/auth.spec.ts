import { expect, test, type Page } from '@playwright/test'
import {
  accountAvatar,
  openAccountMenu,
  signOutFromHeader,
} from './account-menu.js'

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
  await expect(accountAvatar(page, 'Ana Demo')).toBeVisible()

  await page.reload()
  await expect(accountAvatar(page, 'Ana Demo')).toBeVisible()

  const trigger = accountAvatar(page, 'Ana Demo')
  await expect(trigger.locator('img')).toHaveAttribute(
    'src',
    /avatar\.svg|^data:image\/svg\+xml/,
  )
  const menu = await openAccountMenu(page)
  await expect(menu.getByText('Ana Demo', { exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(menu).toBeHidden()
  await expect(trigger).toBeFocused()
  await signOutFromHeader(page)
  await expect(
    page.getByRole('button', { name: 'Entrar', exact: true }),
  ).toBeVisible()

  await page.reload()
  await expect(
    page.getByRole('button', { name: 'Entrar', exact: true }),
  ).toBeVisible()

  await signIn(page, 'bruno@kurio.example.test', 'Kurio-Bruno!2026')
  await expect(accountAvatar(page, 'Bruno Demo')).toBeVisible()
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

  const passwordInput = dialog.getByLabel('Senha', { exact: true })
  await dialog.getByRole('button', { name: 'Mostrar senha' }).click()
  await expect(passwordInput).toHaveAttribute('type', 'text')
  await dialog.getByRole('button', { name: 'Ocultar senha' }).click()
  await expect(passwordInput).toHaveAttribute('type', 'password')

  await passwordInput.fill('Kurio-Ana!2026')
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
  await expect(accountAvatar(page, 'Ana Demo')).toBeVisible()

  await page.clock.setFixedTime(new Date('2026-01-01T12:31:00Z'))
  await page.reload()

  await expect(page.getByRole('alert')).toHaveText(
    'Sua sessão expirou. Entre novamente.',
  )
  await expect(
    page.getByRole('button', { name: 'Entrar', exact: true }),
  ).toBeVisible()
})
