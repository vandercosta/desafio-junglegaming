# Kurio — Marketplace de NFTs

Aplicação frontend desenvolvida para o desafio técnico da Jungle Gaming. A Kurio permite explorar um catálogo de NFTs, consultar os detalhes de uma obra, gerenciar um carrinho como visitante ou com uma conta e entrar com uma conta de demonstração. Os dados são servidos por uma API REST simulada com Mock Service Worker.

[Enunciado do desafio](https://github.com/junglegaming/frontend-challenge) · [Layout no Figma](https://www.figma.com/design/Ff0SksUi7UFtPWUO8kyNtw/Frontend-Challenge?node-id=0-1)

## Funcionalidades atuais

- Catálogo com busca por nome ou ID, filtros combináveis por coleção, rede e faixa de preço, ordenação e paginação. A URL guarda os filtros aplicados e a página.
- Detalhe com acesso direto por URL, descrição da obra, coleção, atributos, rede, contrato, direitos autorais, seleção de edição e controle de quantidade por estoque.
- Carrinho de visitante com inclusão, alteração de quantidade, remoção e persistência após atualizar a página.
- Carrinhos por conta, com transferência dos itens de visitante no login e isolamento ao trocar de usuário.
- Cotação do carrinho pela API simulada, com subtotal, desconto, taxa de rede e total. O cupom aplicado é mantido após atualizar a página.
- Remoção otimista no carrinho. A linha some enquanto a solicitação está pendente e reaparece se a API rejeitar a operação.
- Login e logout simulados, com recuperação da sessão após atualizar a página e aviso de expiração. O diálogo de login preserva a rota e os filtros atuais.
- Cadastro de colecionadores com validação por campo, tratamento de conflitos e persistência das contas de demonstração.
- Favoritos no catálogo e no detalhe, com lista de interesse persistida por conta e retorno ao estado anterior em caso de falha.
- Perfil do colecionador com edição de dados, avatar e alteração de senha.
- Cadastro e edição de carteiras principal e secundária, com validação por rede e persistência por conta.
- Estados de carregamento, lista vazia, erro e recurso inexistente.

Checkout, eventos em tempo real e refinamento visual fazem parte da entrega em andamento.

## Tecnologias

- **Interface e build** — React, TypeScript, Vite, Tailwind CSS e shadcn/ui.
- **Navegação e dados** — TanStack Router, TanStack Query e Axios.
- **API simulada** — Mock Service Worker.
- **Qualidade** — Oxlint, Prettier, Playwright e Lighthouse.

## Executar localmente

Use a versão de Node registrada em `.nvmrc`, atualmente `24.22.3`. Os comandos abaixo usam npm e, para selecionar a versão de Node, nvm.

Em um checkout novo:

```bash
git clone --branch develop https://github.com/vandercosta/desafio-junglegaming.git
cd desafio-junglegaming
nvm install
nvm use
npm ci
npm run dev:mocks
```

Abra a URL exibida pelo Vite, geralmente `http://localhost:5173`.

O modo `demo` carrega `.env.demo`. A aplicação aguarda a inicialização do Service Worker antes de montar o React, para que o MSW intercepte a primeira consulta.

### Build de demonstração

```bash
npm run build:demo
npm run preview
```

O preview geralmente fica em `http://localhost:4173`. O Vite incorpora as variáveis do modo de demonstração durante o build. Para gerar um preview com um cenário específico, defina a variável ao executar `build:demo`.

## Rotas

| Rota                | Descrição                                                 |
| ------------------- | --------------------------------------------------------- |
| `/`                 | Catálogo com busca, filtros, ordenação e paginação.       |
| `/nfts/0042`        | Detalhe do Emerald Ape #042.                              |
| `/nfts/inexistente` | Exemplo de NFT inexistente em uma rota de detalhe válida. |
| `/carrinho`         | Carrinho de visitante ou da conta autenticada.            |

Um exemplo de URL compartilhável do catálogo é `/?q=Golden&collection=musica&sort=price-asc`. Você pode atualizar a página ou usar o histórico do navegador para recuperar os valores aplicados.

## Autenticação simulada

Use uma destas contas fictícias no modo `demo`.

| Conta      | E-mail                     | Senha de demonstração |
| ---------- | -------------------------- | --------------------- |
| Ana Demo   | `ana@kurio.example.test`   | `Kurio-Ana!2026`      |
| Bruno Demo | `bruno@kurio.example.test` | `Kurio-Bruno!2026`    |

1. Abra `/nfts/0042?q=Golden&page=2` e clique em **Entrar**. O diálogo abre na rota atual com `auth=entrar` na URL.
2. Entre com uma das contas. O cabeçalho mostra o nome da conta e a opção **Sair**. O diálogo fecha e a URL preserva o NFT, a busca e a página.
3. Atualize a página para conferir a recuperação da sessão. Use **Sair** para encerrá-la e testar a segunda conta.

O MSW verifica as senhas com PBKDF2 e salt. A sessão simulada dura 30 minutos, e o armazenamento local guarda o ID do usuário e a expiração.

### Criar uma conta

1. Execute `npm run dev:mocks`, abra **Entrar** e selecione a aba **Criar conta**. Você também pode abrir o cadastro com `/?auth=cadastrar`.
2. Use um nome de usuário fictício, como `luna_demo`, e um e-mail fictício, como `luna@kurio.example.test`. Informe uma senha de 8 a 128 caracteres e confirme-a.
3. Após **Criar conta**, a aba **Entrar** abre com o e-mail preenchido. Digite a senha para entrar e recarregue a página para verificar a restauração da sessão.

O nome de usuário aceita de 3 a 24 letras de `a` a `z`, números ou sublinhados. O mock normaliza o nome de usuário e o e-mail para minúsculas, remove espaços nas extremidades e verifica duplicidades nas fixtures e nas contas já cadastradas. As novas contas persistem no navegador com sal individual e verificador PBKDF2.

Para reproduzir um erro de formulário, informe senhas diferentes nos campos de senha e confirmação. Para reproduzir HTTP `409`, tente cadastrar `ana_demo` e `ana@kurio.example.test` com uma senha válida e confirmada. O diálogo exibe uma mensagem abaixo de cada campo em conflito.

### Carrinho ao entrar e sair

Adicione uma edição como visitante e entre com **Ana Demo** na própria página do carrinho. Os itens devem aparecer na conta. Saia e confirme que o carrinho de visitante está vazio. Ao entrar com **Bruno Demo**, você verá o carrinho dele. Entre novamente com Ana para recuperar os itens, inclusive após recarregar a página.

O mock soma quantidades da mesma edição do mesmo NFT. Se a soma ultrapassar o estoque, o carrinho mantém a quantidade e pede um ajuste. O carrinho mesclado usa o cupom da conta quando houver um aplicado. Caso contrário, usa o cupom do visitante. A API recalcula a cotação e a validade do cupom.

### Reproduzir uma falha de login ou uma sessão expirada

Para testar credenciais inválidas, use um dos e-mails da tabela com uma senha diferente. A interface mostra **E-mail ou senha incorretos.** e permite reenviar o formulário.

Para simular expiração manualmente, entre com uma conta, abra o armazenamento local no DevTools e altere `expiresAt` para `0` no valor da chave `kurio:mock-session:v1`. Ao atualizar a página, a interface mostra **Sua sessão expirou. Entre novamente.** O teste automatizado reproduz esse comportamento avançando o relógio do navegador.

## Favoritos

Em qualquer card do catálogo ou no detalhe de um NFT, clique em **Favoritar**. Como visitante, a ação abre **Entrar** e preserva a página. Após o login, clique em **Favoritar** novamente para salvar o NFT. Use **Lista de interesse** no cabeçalho ou abra `/favoritos` para consultar e remover os itens salvos.

Para conferir o isolamento, salve um NFT com Ana, recarregue a página, saia e entre com Bruno. O favorito fica disponível na conta de Ana.

### Simular uma falha ao favoritar

Já autenticado, abra o console do navegador e execute o comando abaixo.

```js
localStorage.setItem('kurio:mock-favorites-fail-next:v1', 'true')
```

Clique em **Favoritar**. O próximo pedido de inclusão ou remoção válido recebe HTTP `503`. A interface volta ao estado anterior e mostra uma mensagem de erro. Clique novamente para concluir a operação.

## Perfil do colecionador

Entre com uma conta de demonstração e selecione **Meu perfil** no cabeçalho ou abra `/perfil`. Você pode alterar nome de exibição, nome de usuário, e-mail, nome ENS e apelido da carteira. Digite apenas o nome ENS no campo. O sufixo `.eth` aparece ao lado.

- O avatar aceita PNG, JPEG ou WebP de até 512 KiB. Escolher ou remover a imagem altera a prévia. **Salvar perfil** confirma as mudanças junto com os demais campos.
- Para reproduzir um conflito, entre com Ana, preencha os campos obrigatórios e tente salvar o e-mail de Bruno. O formulário mostra o erro no campo.
- Em **Alterar senha**, informe a senha atual e confirme a nova senha. Para testar a rejeição, use uma senha atual incorreta e mantenha os demais campos válidos. Após salvar, a sessão atual continua ativa. Use o e-mail e a senha atualizados no próximo login.
- O reset abaixo restaura as credenciais e os dados originais das contas de demonstração.

## Carteiras

Entre com uma conta de demonstração e abra **Meu perfil → Carteiras** ou acesse `/perfil/carteiras`. Em **Carteira principal**, clique em **Adicionar carteira**, informe apelido, rede, tipo de carteira e endereço público e salve. Nome ENS e código de indicação são opcionais. Nome e e-mail do colecionador ficam no perfil.

- Em **Carteira secundária**, você pode cadastrar outro endereço ou marcar **Igual à carteira principal**. A segunda opção acompanha alterações futuras da principal.
- Para testar a validação de Ethereum ou Polygon, envie `0x123`. Depois, teste o formato esperado com `0x1111111111111111111111111111111111111111`. Na rede Solana, a API aceita endereços Base58 que decodificam para 32 bytes.
- Para verificar conflito, tente cadastrar como secundária o mesmo endereço e rede da principal. O formulário preserva os dados digitados e mostra o erro no campo de endereço.
- Recarregue a página e troque de conta para verificar a persistência e o isolamento. O cadastro armazena dados simulados de endereços públicos.

## Cenários da API simulada

| Variável               | Valor   | Comportamento                                             |
| ---------------------- | ------- | --------------------------------------------------------- |
| `VITE_ENABLE_MOCKS`    | `true`  | Inicia o MSW. O valor já está em `.env.demo`.             |
| `VITE_MOCK_CATALOG`    | `empty` | A listagem retorna uma lista vazia.                       |
| `VITE_MOCK_CATALOG`    | `error` | A listagem e o detalhe retornam HTTP `503`.               |
| `VITE_MOCK_CART_EDITS` | `error` | Alterar a quantidade e remover itens retornam HTTP `503`. |

Encerre o servidor atual antes de iniciar cada cenário. Os exemplos abaixo usam a sintaxe de Bash ou Zsh.

```bash
# Catálogo vazio
VITE_MOCK_CATALOG=empty npm run dev:mocks

# Falha na listagem ou no detalhe
VITE_MOCK_CATALOG=error npm run dev:mocks

# Falha ao alterar ou remover um item do carrinho
VITE_MOCK_CART_EDITS=error npm run dev:mocks
```

### Reproduzir um conflito de estoque

1. Abra `/nfts/0042`.
2. Na edição `1/10`, selecione duas unidades e clique em **Comprar**. O subtotal do carrinho será `2,38 ETH`.
3. Volte ao detalhe e tente comprar mais uma unidade da mesma edição.
4. A API retorna HTTP `409` e o carrinho mantém as duas unidades.

### Reproduzir o rollback de remoção

1. Adicione um item ao carrinho no cenário padrão.
2. Reinicie o servidor com `VITE_MOCK_CART_EDITS=error` e use o mesmo host e porta.
3. Abra `/carrinho` e clique na lixeira.
4. A linha some enquanto a operação está pendente. Após o HTTP `503`, a linha volta e a interface mostra o erro.

### Reproduzir a cotação e os cupons

1. Com o carrinho vazio, abra `/nfts/0042` e clique em **Comprar** com uma unidade na edição `1/10`.
2. No carrinho, confirme o subtotal de `1,19 ETH`, a taxa de rede simulada de `0,016 ETH` e o total de `1,206 ETH`.
3. Digite `KURIO10` em **Código promocional** e clique em **Aplicar**. O cupom concede 10% de desconto no subtotal, e o total passa a `1,087 ETH`.
4. Atualize a página e aumente a quantidade para duas unidades. O total com desconto passa a `2,158 ETH`.
5. Experimente `INVALIDO` ou `EXPIRADO10`. A API rejeita cada código com HTTP `422` e mantém o cupom aplicado. A interface informa se o código é inválido ou expirou.
6. Clique em **Remover cupom** para voltar ao total de `2,396 ETH`.

### Restaurar o cenário padrão e limpar os dados

Para restaurar as respostas padrão, reinicie o servidor com `npm run dev:mocks`, sem as variáveis de cenário.

O mock guarda a sessão, as contas cadastradas, as alterações de perfil e senha, as carteiras, os favoritos, as linhas do carrinho e o cupom ativo no `localStorage` da origem atual. Execute o trecho abaixo no console do navegador para limpar esses dados e voltar às contas de demonstração originais.

```js
localStorage.removeItem('kurio:guest-cart:v1')
localStorage.removeItem('kurio:carts:v1')
localStorage.removeItem('kurio:mock-session:v1')
localStorage.removeItem('kurio:mock-users:v1')
localStorage.removeItem('kurio:mock-favorites-fail-next:v1')
for (const key of Object.keys(localStorage)) {
  if (
    key.startsWith('kurio:favorites:v1:') ||
    key.startsWith('kurio:wallets:v1:')
  ) {
    localStorage.removeItem(key)
  }
}
location.reload()
```

O servidor de desenvolvimento e o preview usam portas diferentes. Limpe as chaves na origem que estiver usando.

## Contratos REST atuais

| Método   | Endpoint                  | Comportamento                                                                                                                                                                                                                   |
| -------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET`    | `/api/nfts`               | Lista NFTs. Aceita `q`, `collection`, `network`, `minEth`, `maxEth`, `sort` e `page`. Retorna `items`, `total` e `pageSize`.                                                                                                    |
| `GET`    | `/api/nfts/:nftId`        | Retorna o detalhe e o estoque por edição. Um ID inexistente retorna HTTP `404` com o código `NFT_NOT_FOUND`.                                                                                                                    |
| `GET`    | `/api/cart`               | Retorna os itens e a cotação do carrinho da sessão atual, com subtotal, desconto, taxa de rede e total.                                                                                                                         |
| `POST`   | `/api/cart/items`         | Recebe `nftId`, `editionId` e `quantity`. Soma à quantidade quando já existe uma linha para o mesmo NFT e edição.                                                                                                               |
| `PATCH`  | `/api/cart/items/:itemId` | Recebe `{ quantity }` e define a quantidade final da linha.                                                                                                                                                                     |
| `DELETE` | `/api/cart/items/:itemId` | Remove a linha e retorna o carrinho atualizado.                                                                                                                                                                                 |
| `PUT`    | `/api/cart/coupon`        | Recebe `{ code }`, aplica o cupom válido e retorna o carrinho com a cotação atualizada.                                                                                                                                         |
| `DELETE` | `/api/cart/coupon`        | Remove o cupom e retorna o carrinho com a cotação atualizada.                                                                                                                                                                   |
| `GET`    | `/api/favorites`          | Retorna `{ items }` com os NFTs salvos pela conta autenticada.                                                                                                                                                                  |
| `PUT`    | `/api/favorites/:nftId`   | Salva o NFT de forma idempotente e retorna a lista atualizada.                                                                                                                                                                  |
| `DELETE` | `/api/favorites/:nftId`   | Remove o NFT de forma idempotente e retorna a lista atualizada.                                                                                                                                                                 |
| `GET`    | `/api/wallets`            | Retorna `{ primary, secondary }` para a conta autenticada.                                                                                                                                                                      |
| `PUT`    | `/api/wallets/principal`  | Cadastra ou substitui os dados da carteira principal e retorna as duas posições.                                                                                                                                                |
| `PUT`    | `/api/wallets/secundaria` | Recebe `{ kind: 'independent', wallet }` ou `{ kind: 'same-as-primary' }` e retorna as duas posições.                                                                                                                           |
| `GET`    | `/api/profile`            | Retorna os dados e o avatar da conta autenticada.                                                                                                                                                                               |
| `PUT`    | `/api/profile`            | Atualiza dados e avatar e retorna `{ profile, user }`. Conflitos de e-mail ou nome de usuário retornam HTTP `409`.                                                                                                              |
| `PUT`    | `/api/profile/password`   | Recebe `{ currentPassword, newPassword }` e retorna HTTP `204`. Senha incorreta ou inválida retorna HTTP `422` com mensagens por campo.                                                                                         |
| `POST`   | `/api/auth/login`         | Recebe `{ email, password }`, transfere o carrinho de visitante para a conta e retorna a sessão. Dados inválidos retornam HTTP `400` com `INVALID_INPUT`. Credenciais incorretas retornam HTTP `401` com `INVALID_CREDENTIALS`. |
| `POST`   | `/api/auth/register`      | Recebe `{ username, email, password }` e retorna HTTP `201` com `{ email }`. Responde com `422 VALIDATION_ERROR` ou `409 ACCOUNT_CONFLICT`, ambos com mensagens em `fields`.                                                    |
| `GET`    | `/api/auth/session`       | Retorna a sessão atual ou `{ session: null }`. Sessão expirada retorna HTTP `401` com `SESSION_EXPIRED`.                                                                                                                        |
| `DELETE` | `/api/auth/session`       | Encerra a sessão e retorna HTTP `204`.                                                                                                                                                                                          |

O mock resolve o carrinho a partir da sessão. O cliente envia `X-Cart-Scope` para indicar o carrinho que espera encontrar. Se a sessão tiver mudado, a API retorna HTTP `409` com `CART_SCOPE_CHANGED`. A fusão grava o carrinho da conta e esvazia o carrinho de visitante na mesma atualização do armazenamento. O mock ainda lê dados da chave legada `kurio:guest-cart:v1` até a primeira gravação no formato novo.

Os endpoints de favoritos exigem sessão válida. O mock usa a sessão para resolver a conta e confere o cabeçalho `X-Favorites-User` para recusar operações emitidas sob outra sessão. A API retorna HTTP `401` sem sessão, `409` quando a conta mudou e `404` em operações para um NFT inexistente.

Os endpoints de perfil exigem sessão válida e usam `X-Profile-User` para recusar pedidos cujo usuário esperado difere da sessão. O mock persiste atualizações por ID e guarda apenas sal e verificador PBKDF2 para a senha.

Os endpoints de carteiras exigem sessão. O mock confere `X-Wallets-User` com a conta ativa. A API responde com HTTP `422` para dados inválidos e `409` para endereço duplicado na mesma rede, sessão trocada ou referência à principal ainda indisponível.

Cada linha do carrinho representa um par de NFT e edição. O mock persiste os IDs, as quantidades e o código aplicado e consulta as fixtures para montar os preços e o estoque. A cotação é recalculada quando a quantidade, os itens ou o cupom mudam. As quantidades são inteiras. Os valores em ETH trafegam como strings decimais, e os cálculos de preço usam `BigInt` em wei.

## Organização e cache

```text
src/
  features/
    auth/       Cliente REST de sessão, cabeçalho e diálogo de login
    catalog/    Contratos, filtros e tela de detalhe
    cart/       Contrato e tela do carrinho
  lib/          Cliente Axios e conversões de ETH
  mocks/        Handlers REST e fixtures
  routes/       Rotas do TanStack Router
public/
  mockServiceWorker.js
tests/
  e2e/          Cenários Playwright
```

O TanStack Query usa os filtros validados como parte da chave da listagem, o ID como parte da chave do detalhe e uma chave por carrinho, `['cart', 'guest']` ou `['cart', 'user:<id>']`. As consultas passam o `AbortSignal` ao Axios. Os fluxos atuais oferecem nova tentativa pela interface quando uma consulta falha.

As mutações do carrinho atualizam o cache com a resposta da API. Se uma edição falhar, o carrinho é consultado novamente para reconciliar o estado exibido com o mock.

Favoritos usam `['favorites', userId]`. O botão mostra a inclusão ou remoção enquanto a API responde. Uma falha devolve o botão ao estado confirmado. A resposta bem-sucedida atualiza a lista da conta ativa, e as consultas e mutations de favoritos da conta anterior são removidas do cache na troca de sessão.

O perfil usa `['profile', userId]`. Ao salvar, o cache recebe o perfil confirmado e o nome e o e-mail são atualizados na sessão. Na troca de conta, o cache do perfil anterior é removido.

As carteiras usam `['wallets', userId]`. A API retorna o estado completo após salvar. Na troca de conta, as consultas e mutations do usuário anterior saem do cache.

A sessão usa a chave `['session']`. Na troca de carrinho, as queries e mutations em cache do carrinho anterior são removidas. Após login ou logout, as consultas de sessão pendentes são canceladas e o cache recebe o estado confirmado pela API.

## Testes e verificações

Instale o navegador usado pelo Playwright:

```bash
npx playwright install chromium
```

Execute os testes:

```bash
npm run test:e2e
```

O Playwright inicia o Vite com mocks na porta `4175` e executa os casos em Chromium desktop (`1440 × 900`) e mobile (`390 × 844`). A cobertura inclui detalhe e NFT inexistente, carrinho e persistência, recálculo da cotação e cupons. Os testes de autenticação cobrem sessão após atualizar a página, credenciais incorretas, logout, troca de conta, expiração e preservação da URL do NFT ao entrar.

Os testes de carrinho também cobrem a fusão durante o login, o isolamento entre contas, a persistência e a correção de quantidades acima do estoque após a fusão.

Os testes de cadastro verificam o preenchimento do e-mail na aba **Entrar**, a recuperação da sessão da nova conta após recarregar e os erros de confirmação de senha e de conflito de cadastro. Execute as suítes de login e cadastro com o comando abaixo.

```bash
npm run test:e2e -- auth.spec.ts registration.spec.ts
```

Para verificar a persistência, a troca de conta e a recuperação de falha dos favoritos, execute a suíte abaixo.

```bash
npm run test:e2e -- favorites.spec.ts
```

Para verificar a edição do perfil, o avatar, a troca de conta e a alteração de senha, execute a suíte abaixo.

```bash
npm run test:e2e -- profile.spec.ts
```

Para verificar as carteiras, execute a suíte de validação, persistência e isolamento.

```bash
npm run test:e2e -- wallets.spec.ts
```

Abra o relatório HTML com:

```bash
npx playwright show-report
```

O relatório fica em `playwright-report/`. Os traces das falhas ficam em `test-results/`.

| Comando                                 | Finalidade                                    |
| --------------------------------------- | --------------------------------------------- |
| `npm run dev:mocks`                     | Iniciar o desenvolvimento com a API simulada. |
| `npm run build:demo`                    | Gerar o build otimizado com mocks.            |
| `npm run preview`                       | Servir o último build gerado.                 |
| `npm run typecheck`                     | Verificar a tipagem TypeScript.               |
| `npm run lint`                          | Executar o Oxlint.                            |
| `npm run format`                        | Formatar o projeto com Prettier.              |
| `npm run format:check`                  | Verificar a formatação.                       |
| `npm run test:e2e`                      | Executar os testes Playwright.                |
| `npm run audit:lighthouse -- --version` | Conferir a versão local do Lighthouse.        |

## Lighthouse

Para uma auditoria local, tenha o Google Chrome instalado. Gere o build com mocks e deixe o preview em execução:

```bash
npm run build:demo
npm run preview -- --host 127.0.0.1 --port 4173 --strictPort
```

Em outro terminal, audite o catálogo e gere os relatórios HTML e JSON:

```bash
mkdir -p reports/lighthouse

npm run audit:lighthouse -- http://127.0.0.1:4173/ \
  --chrome-flags=--headless \
  --output=html --output=json \
  --output-path=./reports/lighthouse/catalogo-mobile
```

O perfil padrão é mobile. Use `--preset=desktop` e outro nome de saída para auditar em desktop. As medições finais serão feitas nas páginas de início e detalhe com o layout da entrega.
