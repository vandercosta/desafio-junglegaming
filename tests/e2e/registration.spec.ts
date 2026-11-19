import { expect, test } from '@playwright/test'

test('registers a collector and restores the session after reload', async ({
  page,
}) => {
  await page.goto('/nfts/0042?q=Golden&page=2')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await page
    .getByRole('tab', { name: 'Criar conta', exact: true })
    .or(page.getByRole('button', { name: 'Crie uma conta', exact: true }))
    .click()

  const registerDialog = page.getByRole('dialog', { name: 'Criar conta' })
  await registerDialog.getByLabel('Nome de usuário').fill('luna_demo')
  await registerDialog.getByLabel('E-mail').fill('luna@kurio.example.test')
  await registerDialog
    .getByLabel('Senha', { exact: true })
    .fill('Kurio-Luna!2026')
  await registerDialog.getByLabel('Confirmar senha').fill('Kurio-Luna!2026')
  await registerDialog
    .getByRole('button', { name: /^Criar (conta|perfil)$/ })
    .click()

  const loginDialog = page.getByRole('dialog', { name: 'Entrar' })
  await expect(loginDialog.getByRole('status')).toHaveText(
    'Conta criada. Entre com a sua senha.',
  )
  await expect(loginDialog.getByLabel('E-mail')).toHaveValue(
    'luna@kurio.example.test',
  )

  await loginDialog.getByLabel('Senha').fill('Kurio-Luna!2026')
  await loginDialog.getByRole('button', { name: 'Entrar', exact: true }).click()

  await expect(loginDialog).toBeHidden()
  await expect(page).toHaveURL(
    (url) =>
      url.pathname === '/nfts/0042' &&
      url.searchParams.get('q') === 'Golden' &&
      url.searchParams.get('page') === '2' &&
      !url.searchParams.has('auth'),
  )

  await page.reload()
  await expect(page.getByText('luna_demo', { exact: true })).toBeVisible()
})

test('validates password confirmation and shows registration conflicts', async ({
  page,
}) => {
  await page.goto('/?auth=cadastrar')

  const dialog = page.getByRole('dialog', { name: 'Criar conta' })
  await dialog.getByLabel('Nome de usuário').fill('ANA_DEMO')
  await dialog.getByLabel('E-mail').fill('ANA@KURIO.EXAMPLE.TEST')
  await dialog.getByLabel('Senha', { exact: true }).fill('OutraSenha!2026')
  await dialog.getByLabel('Confirmar senha').fill('SenhaDiferente!2026')
  const submit = dialog.getByRole('button', { name: /^Criar (conta|perfil)$/ })
  await submit.click()

  await expect(
    dialog.getByLabel('Confirmar senha'),
  ).toHaveAccessibleDescription('As senhas precisam ser iguais.')

  await dialog.getByLabel('Confirmar senha').fill('OutraSenha!2026')
  await submit.click()

  await expect(dialog.getByLabel('E-mail')).toHaveAccessibleDescription(
    'Este e-mail já está cadastrado.',
  )
  await expect(
    dialog.getByLabel('Nome de usuário'),
  ).toHaveAccessibleDescription('Este nome de usuário já está em uso.')
  await expect(dialog).toBeVisible()
})
