# Kurio — Marketplace de NFTs

Aplicação frontend desenvolvida para o desafio técnico da Jungle Gaming. A Kurio permite explorar um catálogo de NFTs, consultar os detalhes de uma obra e adicionar edições ao carrinho de visitante. Os dados deste fluxo são servidos por uma API REST simulada com Mock Service Worker.

[Enunciado do desafio](https://github.com/junglegaming/frontend-challenge) · [Layout no Figma](https://www.figma.com/design/Ff0SksUi7UFtPWUO8kyNtw/Frontend-Challenge?node-id=0-1)

## Funcionalidades atuais

- Catálogo com busca por nome ou ID, filtros combináveis por coleção, rede e faixa de preço, ordenação e paginação. A URL guarda os filtros aplicados e a página.
- Detalhe com acesso direto por URL, descrição da obra, coleção, atributos, rede, contrato, direitos autorais, seleção de edição e controle de quantidade por estoque.
- Carrinho de visitante com inclusão, alteração de quantidade, remoção e persistência após atualizar a página.
- Cotação do carrinho pela API simulada, com subtotal, desconto, taxa de rede e total. O cupom aplicado é mantido após atualizar a página.
- Remoção otimista no carrinho. A linha some enquanto a solicitação está pendente e reaparece se a API rejeitar a operação.
- Estados de carregamento, lista vazia, erro e recurso inexistente.

A próxima etapa é a autenticação, com cadastro, login, logout e preservação do carrinho de visitante ao entrar. Favoritos, perfil, carteiras, checkout, eventos em tempo real e refinamento visual fazem parte da entrega em andamento.

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
| `/carrinho`         | Carrinho de visitante.                                    |

Um exemplo de URL compartilhável do catálogo é `/?q=Golden&collection=musica&sort=price-asc`. Você pode atualizar a página ou usar o histórico do navegador para recuperar os valores aplicados.

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

### Restaurar o cenário padrão e limpar o carrinho

Para restaurar as respostas padrão, reinicie o servidor com `npm run dev:mocks`, sem as variáveis de cenário.

O mock guarda as linhas do carrinho e o cupom ativo no `localStorage` da origem atual. Para apagar os dois e voltar ao carrinho vazio, execute no console do navegador:

```js
localStorage.removeItem('kurio:guest-cart:v1')
location.reload()
```

O servidor de desenvolvimento e o preview usam portas diferentes. Limpe a chave na origem que estiver usando.

## Contratos REST atuais

| Método   | Endpoint                  | Comportamento                                                                                                                |
| -------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `GET`    | `/api/nfts`               | Lista NFTs. Aceita `q`, `collection`, `network`, `minEth`, `maxEth`, `sort` e `page`. Retorna `items`, `total` e `pageSize`. |
| `GET`    | `/api/nfts/:nftId`        | Retorna o detalhe e o estoque por edição. Um ID inexistente retorna HTTP `404` com o código `NFT_NOT_FOUND`.                 |
| `GET`    | `/api/cart`               | Retorna os itens e a cotação do carrinho de visitante, com subtotal, desconto, taxa de rede e total.                         |
| `POST`   | `/api/cart/items`         | Recebe `nftId`, `editionId` e `quantity`. Soma à quantidade quando já existe uma linha para o mesmo NFT e edição.            |
| `PATCH`  | `/api/cart/items/:itemId` | Recebe `{ quantity }` e define a quantidade final da linha.                                                                  |
| `DELETE` | `/api/cart/items/:itemId` | Remove a linha e retorna o carrinho atualizado.                                                                              |
| `PUT`    | `/api/cart/coupon`        | Recebe `{ code }`, aplica o cupom válido e retorna o carrinho com a cotação atualizada.                                      |
| `DELETE` | `/api/cart/coupon`        | Remove o cupom e retorna o carrinho com a cotação atualizada.                                                                |

Cada linha do carrinho representa um par de NFT e edição. O mock persiste os IDs, as quantidades e o código aplicado e consulta as fixtures para montar os preços e o estoque. A cotação é recalculada quando a quantidade, os itens ou o cupom mudam. As quantidades são inteiras. Os valores em ETH trafegam como strings decimais, e os cálculos de preço usam `BigInt` em wei.

## Organização e cache

```text
src/
  features/
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

O TanStack Query usa os filtros validados como parte da chave da listagem, o ID como parte da chave do detalhe e `['cart', 'guest']` para o carrinho de visitante. As consultas passam o `AbortSignal` ao Axios. Os fluxos atuais oferecem nova tentativa pela interface quando uma consulta falha.

As mutações do carrinho atualizam o cache com a resposta da API. Se uma edição falhar, o carrinho é consultado novamente para reconciliar o estado exibido com o mock.

## Testes e verificações

Instale o navegador usado pelo Playwright:

```bash
npx playwright install chromium
```

Execute os testes:

```bash
npm run test:e2e
```

O Playwright inicia o Vite com mocks na porta `4175` e executa os casos em Chromium desktop (`1440 × 900`) e mobile (`390 × 844`). A cobertura atual verifica acesso direto ao detalhe, NFT inexistente, persistência após refresh, adição, alteração de quantidade e remoção no carrinho, recálculo da cotação, aplicação e remoção de cupom e rejeição de cupons inválidos ou expirados.

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
