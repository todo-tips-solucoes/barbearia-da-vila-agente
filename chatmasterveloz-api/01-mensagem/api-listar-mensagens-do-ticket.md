---
title: "API Listar Mensagens do Ticket"
slug: api-listar-mensagens-do-ticket
category: "Mensagem"
plan: Todas
method: GET
endpoint: https://api.chatmasterveloz.com/api/tickets/{ticketId}/messages?limit=50&pageNumber=1
source: https://clihelper.chatmasterveloz.com/docs/api-listar-mensagens-do-ticket
fetched: 2026-10-14
---
# API Listar Mensagens do Ticket  `Todas`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-listar-mensagens-do-ticket> · [Voltar ao índice](../README.md)

🧩 Listar as **mensagens de um ticket** — do atendimento inteiro, com limite e paginação.

**API:** Todas

### Endpoint

```
https://api.chatmasterveloz.com/api/tickets/{ticketId}/messages?limit=50&pageNumber=1
```

### Método

```
GET
```

### Autenticação

```
Bearer {seutokenaqui}
```

### Payload

```
// sem payload — o ticketId vai no endereço e os filtros na própria URL
```

➡️ **“ticketId”:** ID do Ticket — vai no próprio endereço, no lugar de `{ticketId}`. **Obrigatório.**

◽ É o número entre parênteses no cabeçalho da conversa. Em **João da Silva (52) | #25678**, o ticketId é o **52**.

◽ O **25678** é o protocolo, e não serve nesta chamada.

➡️ **“limit”:** quantas mensagens trazer. Padrão **50**, máximo **200**. Um valor maior não dá erro: ele é reduzido para 200, e a resposta informa em `limit` o que foi aplicado.

◽ O `limit` recorta as **últimas** mensagens do atendimento, não as primeiras — e elas vêm em ordem cronológica, a mais antiga primeiro.

➡️ **“pageNumber”:** padrão `1`, com as mensagens mais recentes. `2` traz o bloco anterior, e assim por diante.

⚠️ As páginas andam **para trás no tempo**: a 1 é a mais recente. Para montar o histórico inteiro, repita a chamada com `pageNumber` 2, 3… enquanto a resposta trouxer `"hasMore": true`, e junte as páginas de trás para a frente.

◽ **A resposta traz o atendimento junto com as mensagens** — o contato, o operador e a conexão com id, nome e canal. Numa chamada só você sabe de quem é a conversa e por onde ela corre, sem precisar consultar o ticket à parte.

◽ Cada mensagem vem com o contato, o operador e a mensagem citada, e o `mediaUrl` já como endereço completo.

⚠️ **A nota interna vem no meio das mensagens**, com o `mediaType` igual a `internal` — é o que o operador escreveu para dentro, e o cliente nunca viu. Quem monta histórico para uma automação pode querer separar essas linhas.

◽ O atendimento vale o inteiro, sem depender de protocolo: um que abriu e fechou cinco vezes vem numa requisição só.

◽ A conexão vem enxuta de propósito: nenhum token nem credencial aparece na resposta.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X GET 'https://api.chatmasterveloz.com/api/tickets/{ticketId}/messages?limit=50&pageNumber=1' \
  -H 'Authorization: Bearer {seutokenaqui}'
```
