import type { Page } from '@playwright/test'

export function accountAvatar(page: Page, name?: string) {
  return page.getByRole('button', {
    name: name ? `Conta de ${name}` : /^Conta de /,
    exact: true,
  })
}

export async function openAccountMenu(page: Page) {
  await accountAvatar(page).click()
  return page.getByRole('dialog', { name: 'Conta do usuário' })
}

export async function signOutFromHeader(page: Page) {
  const menu = await openAccountMenu(page)
  await menu.getByRole('button', { name: 'Sair', exact: true }).click()
}
