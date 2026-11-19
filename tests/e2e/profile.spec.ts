import { Buffer } from 'node:buffer'
import { expect, test, type Page } from '@playwright/test'
import { accountAvatar } from './account-menu.js'

const demoEmail = 'ana@kurio.example.test'
const demoPassword = 'Kurio-Ana!2026'

async function submitLogin(page: Page, email: string, password: string) {
  const dialog = page.getByRole('dialog', { name: 'Entrar' })
  await dialog.getByLabel('E-mail').fill(email)
  await dialog.getByLabel('Senha').fill(password)
  await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()
  return dialog
}

async function openProfile(page: Page) {
  await page.goto('/perfil')
  await expect(page.getByLabel('Nome de exibição')).toBeHidden()
  await page.getByRole('link', { name: 'Entrar para ver o perfil' }).click()
  await expect(await submitLogin(page, demoEmail, demoPassword)).toBeHidden()
  await expect(page).toHaveURL(/\/perfil$/)
  await expect(
    page.getByRole('link', { name: 'Dados do perfil' }),
  ).toHaveAttribute('aria-current', 'page')
}

test('updates the collector profile and avatar, and restores both after reload', async ({
  page,
}) => {
  await openProfile(page)
  await page.getByLabel('Nome de exibição').fill('Ana Colecionadora')
  await page.getByLabel('Nome ENS').fill('ana-kurio')
  await page.getByLabel('Apelido da carteira').fill('Principal')
  const email = page.getByLabel('E-mail')
  await email.fill('bruno@kurio.example.test')
  const save = page.getByRole('button', { name: 'Salvar perfil' })
  await save.click()
  await expect(email).toHaveAccessibleDescription(
    'Este e-mail já está cadastrado.',
  )
  await email.fill('ana.colecionadora@kurio.example.test')

  const avatar = page.getByLabel('Selecionar arquivo de avatar')
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByRole('button', { name: 'Alterar avatar' }).click(),
  ])
  await chooser.setFiles({
    name: 'avatar.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('not an image'),
  })
  await expect(avatar).toHaveAccessibleDescription(/Escolha uma imagem PNG/)
  await avatar.setInputFiles({
    name: 'avatar.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aKX0AAAAASUVORK5CYII=',
      'base64',
    ),
  })
  const preview = page.getByRole('img', { name: 'Avatar do colecionador' })
  await expect(preview).toBeVisible()
  await save.click()
  await expect(page.getByText('Perfil atualizado.')).toBeVisible()
  const headerAvatar = accountAvatar(page, 'Ana Colecionadora').locator('img')
  await expect(headerAvatar).toHaveAttribute('src', /^data:image\/png;base64,/)

  await page.reload()
  await expect(page.getByLabel('Nome de exibição')).toHaveValue(
    'Ana Colecionadora',
  )
  await expect(email).toHaveValue('ana.colecionadora@kurio.example.test')
  await expect(page.getByLabel('Nome ENS')).toHaveValue('ana-kurio')
  await expect(preview).toBeVisible()
  await expect(headerAvatar).toHaveAttribute('src', /^data:image\/png;base64,/)
  await page.getByRole('button', { name: 'Remover avatar' }).click()
  await save.click()
  await expect(page.getByText('Perfil atualizado.')).toBeVisible()
  await expect(headerAvatar).toHaveAttribute(
    'src',
    /avatar\.svg|^data:image\/svg\+xml/,
  )
  await page.reload()
  await expect(email).toHaveValue('ana.colecionadora@kurio.example.test')
  await expect(preview).toBeHidden()
  await expect(headerAvatar).toHaveAttribute(
    'src',
    /avatar\.svg|^data:image\/svg\+xml/,
  )

  await page.getByRole('button', { name: 'Sair', exact: true }).click()
  await page.getByRole('link', { name: 'Entrar para ver o perfil' }).click()
  await expect(
    await submitLogin(page, 'bruno@kurio.example.test', 'Kurio-Bruno!2026'),
  ).toBeHidden()
  await expect(page.getByLabel('Nome de exibição')).toHaveValue('Bruno Demo')
  await expect(email).toHaveValue('bruno@kurio.example.test')

  await page.getByRole('button', { name: 'Sair', exact: true }).click()
  await page.getByRole('link', { name: 'Entrar para ver o perfil' }).click()
  await expect(
    await submitLogin(
      page,
      'ana.colecionadora@kurio.example.test',
      demoPassword,
    ),
  ).toBeHidden()
  await expect(page.getByLabel('Nome de exibição')).toHaveValue(
    'Ana Colecionadora',
  )
})

test('validates the current password and accepts the new password on the next login', async ({
  page,
}) => {
  await openProfile(page)
  const current = page.getByLabel('Senha atual')
  const nextPassword = 'Kurio-Ana!New-2026'
  await current.fill('wrong-password')
  await page.getByRole('button', { name: 'Mostrar senha atual' }).click()
  await expect(current).toHaveAttribute('type', 'text')
  await page.getByRole('button', { name: 'Ocultar senha atual' }).click()
  await expect(current).toHaveAttribute('type', 'password')
  await page.getByLabel('Nova senha', { exact: true }).fill(nextPassword)
  const confirmation = page.getByLabel('Confirmar nova senha')
  await confirmation.fill('different-password')
  const save = page.getByRole('button', { name: 'Salvar nova senha' })
  await save.click()
  await expect(confirmation).toHaveAccessibleDescription(
    'As senhas precisam ser iguais.',
  )
  await confirmation.fill(nextPassword)
  await save.click()
  await expect(current).toHaveAccessibleDescription(
    'A senha atual está incorreta.',
  )
  await current.fill(demoPassword)
  await save.click()
  await expect(page.getByText('Senha alterada.')).toBeVisible()
  await expect(current).toHaveValue('')

  await page.getByRole('button', { name: 'Sair', exact: true }).click()
  await page.getByRole('link', { name: 'Entrar para ver o perfil' }).click()
  const dialog = await submitLogin(page, demoEmail, demoPassword)
  await expect(dialog.getByRole('alert')).toHaveText(
    'E-mail ou senha incorretos.',
  )
  await expect(await submitLogin(page, demoEmail, nextPassword)).toBeHidden()
  await expect(page.getByLabel('Nome de exibição')).toHaveValue('Ana Demo')
})
