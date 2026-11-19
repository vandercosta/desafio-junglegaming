# Arquitetura da Kurio

## Tempo real

A aplicação usa `socket.io-client` com transporte WebSocket em `/socket.io/`. O MSW intercepta a conexão no modo de demonstração e `@mswjs/socket.io-binding` codifica e decodifica os eventos Socket.IO. O mock usa o namespace padrão e roteia os eventos por conexão. Toda a simulação roda no navegador. O bootstrap instala o interceptor do MSW antes de carregar o cliente Socket.IO, porque o Engine.IO captura o construtor do WebSocket quando o módulo é carregado.

| Evento                | Direção            | Dados ou efeito                                                               |
| --------------------- | ------------------ | ----------------------------------------------------------------------------- |
| `realtime.subscribe`  | Cliente → servidor | Envia `{ userId }` da sessão consultada. Visitantes enviam `null`.            |
| `realtime.subscribed` | Servidor → cliente | Confirma a assinatura após conferir a sessão.                                 |
| `nft.updated`         | Servidor → cliente | Envia `eventId`, `nftId`, `version`, `priceEth` e `editions`.                 |
| `order.updated`       | Servidor → cliente | Envia `eventId`, `userId`, `orderId`, `version` e `status` à conta do pedido. |

O cliente valida os eventos e descarta versões iguais ou inferiores para o mesmo recurso. Um evento aceito invalida as consultas afetadas. As respostas REST são a referência para preços, estoque, cotação e recibo. O cliente cancela consultas obsoletas antes de revalidar as ativas. Na reconexão, reconsulta catálogo, carrinho e os recursos ativos da sessão, incluindo o pedido aberto. A troca de conta encerra o socket anterior, remove seus listeners e separa o cache privado por ID da conta.

O mock grava preços, estoque e pedidos no mesmo estado local usado pelos endpoints REST. A transição terminal do pedido grava o recibo, o estoque e a baixa das quantidades compradas em uma atualização protegida pelo mesmo lock do carrinho. O navegador executa os temporizadores do pagamento enquanto a demonstração está aberta. Após recarga ou encerramento da aba, a assinatura e a consulta REST retomam pedidos pendentes a partir do horário persistido.

O cenário de interrupção fecha o transporte desta aba e permite que o cliente faça a reconexão automática. O modo de demonstração limita a tentativa de conexão a um segundo para que uma abertura interrompida possa ser repetida durante o cenário. As alterações persistidas podem ser observadas por outras abas da mesma origem. O cenário de instabilidade e a fila de temporizadores são locais à aba. A sincronização da demonstração se limita às abas da mesma origem no mesmo navegador.

## Checkout

O resumo usa uma cotação da API e exige nova revisão após mudança de preço, taxa, cupom ou disponibilidade. A criação do pedido recebe a cotação revisada, a conexão da carteira e uma chave de idempotência. A mesma tentativa retorna o mesmo pedido, e o recibo usa os dados gravados na criação. O formulário e a tentativa ainda em curso persistem por conta na aba, e a URL guarda o identificador para recuperar a confirmação.

O checkout usa as carteiras cadastradas pelo colecionador. Nome ENS e código de indicação permanecem opcionais, e todos os valores da demonstração são expressos em ETH. O recibo é acessado por URL para funcionar após recarga.
