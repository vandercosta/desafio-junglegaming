import { expect, test, type Locator, type Page } from '@playwright/test'

const principalAddress = '0x11111111111111111111111111111111111111aA'
const secondaryAddress = 'So11111111111111111111111111111111111111112'

async function signIn(
  page: Page,
  email = 'ana@kurio.example.test',
  password = 'Kurio-Ana!2026',
) {
  const dialog = page.getByRole('dialog', { name: 'Entrar' })
  await dialog.getByLabel('E-mail').fill(email)
  await dialog.getByLabel('Senha').fill(password)
  await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(dialog).toBeHidden()
}

async function fillWallet(section: Locator, nickname: string, address: string) {
  await section.getByLabel('Apelido da carteira').fill(nickname)
  await section.getByLabel('Rede', { exact: true }).selectOption('ethereum')
  await section.getByLabel('Tipo de carteira').selectOption('metamask')
  await section.getByLabel('Endereço da carteira').fill(address)
}

test('validates addresses, saves independent wallets and isolates them by account', async ({
  page,
}) => {
  await page.goto('/perfil/carteiras')
  const entry = page.getByRole('link', { name: 'Entrar para ver as carteiras' })
  await expect(entry).toBeVisible()
  expect(
    await page.evaluate(async () => (await fetch('/api/wallets')).status),
  ).toBe(401)
  await entry.click()
  await signIn(page)
  await expect(page).toHaveURL(/\/perfil\/carteiras$/)

  const principal = page.getByRole('region', { name: 'Carteira principal' })
  const secondary = page.getByRole('region', { name: 'Carteira secundária' })
  await principal.getByRole('button', { name: 'Adicionar carteira' }).click()
  await fillWallet(principal, 'Principal Ana', '0x123')
  const primaryAddressField = principal.getByLabel('Endereço da carteira')
  await principal.getByRole('button', { name: 'Salvar carteira' }).click()
  await expect(primaryAddressField).toHaveAccessibleDescription(
    /40 caracteres hexadecimais/,
  )
  await primaryAddressField.fill(principalAddress)
  await principal.getByLabel('Nome ENS (opcional)').fill('ana-demo')
  await principal.getByRole('button', { name: 'Salvar carteira' }).click()
  await expect(principal.getByText('ana-demo.eth')).toBeVisible()

  await secondary.getByRole('button', { name: 'Adicionar carteira' }).click()
  await fillWallet(secondary, 'Reserva Ana', principalAddress.toLowerCase())
  const secondaryAddressField = secondary.getByLabel('Endereço da carteira')
  await secondary.getByRole('button', { name: 'Salvar carteira' }).click()
  await expect(secondaryAddressField).toHaveAccessibleDescription(
    /já está salvo na outra carteira/,
  )

  await secondary.getByLabel('Rede', { exact: true }).selectOption('solana')
  await secondary.getByLabel('Tipo de carteira').selectOption('coinbase')
  await secondary.getByRole('button', { name: 'Salvar carteira' }).click()
  await expect(secondaryAddressField).toHaveAccessibleDescription(
    /Solana válido em Base58/,
  )
  await secondaryAddressField.fill(secondaryAddress)
  await secondary.getByRole('button', { name: 'Salvar carteira' }).click()
  await expect(secondary.getByText(secondaryAddress)).toBeVisible()
  await secondary.getByRole('button', { name: 'Editar carteira' }).click()
  await secondary.getByLabel('Apelido da carteira').fill('Reserva alterada')
  await secondary.getByRole('button', { name: 'Salvar carteira' }).click()
  await expect(secondary.getByText('Reserva alterada')).toBeVisible()

  await page.reload()
  await expect(principal.getByText(principalAddress)).toBeVisible()
  await expect(secondary.getByText('Reserva alterada')).toBeVisible()
  await expect(secondary.getByText(secondaryAddress)).toBeVisible()

  await page.getByRole('button', { name: 'Sair', exact: true }).click()
  await entry.click()
  await signIn(page, 'bruno@kurio.example.test', 'Kurio-Bruno!2026')
  await expect(
    principal.getByText('Nenhuma carteira cadastrada.'),
  ).toBeVisible()
  await expect(
    secondary.getByText('Nenhuma carteira cadastrada.'),
  ).toBeVisible()
})

test('links the secondary wallet to the primary and reflects later edits', async ({
  page,
}) => {
  await page.goto('/perfil')
  await page.getByRole('link', { name: 'Entrar para ver o perfil' }).click()
  await signIn(page)
  await page.getByRole('link', { name: 'Carteiras', exact: true }).click()

  const principal = page.getByRole('region', { name: 'Carteira principal' })
  const secondary = page.getByRole('region', { name: 'Carteira secundária' })
  await principal.getByRole('button', { name: 'Adicionar carteira' }).click()
  await fillWallet(principal, 'Principal Ana', principalAddress)
  await principal.getByRole('button', { name: 'Salvar carteira' }).click()

  await secondary.getByRole('button', { name: 'Adicionar carteira' }).click()
  await secondary.getByLabel('Igual à carteira principal').check()
  await secondary.getByRole('button', { name: 'Salvar carteira' }).click()
  await expect(
    secondary.getByText('Usando os dados da carteira principal.'),
  ).toBeVisible()
  await expect(secondary.getByText(principalAddress)).toBeVisible()

  await principal.getByRole('button', { name: 'Editar carteira' }).click()
  const editedAddress = '0x2222222222222222222222222222222222222222'
  await principal.getByLabel('Endereço da carteira').fill(editedAddress)
  await principal.getByRole('button', { name: 'Salvar carteira' }).click()
  await expect(secondary.getByText(editedAddress)).toBeVisible()

  await page.reload()
  await expect(
    secondary.getByText('Usando os dados da carteira principal.'),
  ).toBeVisible()
  await expect(secondary.getByText(editedAddress)).toBeVisible()
})
