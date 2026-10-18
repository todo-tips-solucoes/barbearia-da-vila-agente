---
title: "API Atualizar Ticket"
slug: api-atualizar-ticket
category: "Ticket"
plan: Todas
method: POST
endpoint: https://api.chatmasterveloz.com/api/tickets/updateAPI
source: https://clihelper.chatmasterveloz.com/docs/api-atualizar-ticket
fetched: 2026-10-14
---
# API Atualizar Ticket  `Todas`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-atualizar-ticket> · [Voltar ao índice](../README.md)

🧩 Atualiza **um ticket**, alterando seu status, Setor, atendente ou campos personalizados.

**API:** Todas

### Endpoint

```
https://api.chatmasterveloz.com/api/tickets/updateAPI
```

### Método

```
POST
```

### Autenticação

```
Bearer {seutokenaqui}
```

### Payload

```json
{
    "ticketId": "1067",
    "status": "pending",
    "userId": "13",
    "queueId": "34",
    "typebot_sessionId": "CAMPO LIVRE LETRAS E NÚMEROS",
    "customA": "CAMPO LIVRE LETRAS E NÚMEROS",
    "customB": "CAMPO LIVRE LETRAS E NÚMEROS",
    "customC": {"origem": "site"},
    "customD": {"pedido": 4471}
}
```

➡️ **“ticketId”:** ID do Ticket.

◽ É o número entre parênteses no cabeçalho da conversa. Em **João da Silva (52) | #25678**, o ticketId é o **52**.

◽ O **25678** é o protocolo, e não serve nesta chamada.

➡️ **“status”:** `open`, `pending` ou `closed`.

➡️ **“userId”:** ID do atendente, ou `null`.

➡️ **“queueId”:** ID do Setor, ou `null`.

➡️ **“typebot_sessionId”:** ID da sessão do Typebot. Campo livre, letras e números.

➡️ **“customA”:** informação livre A.

➡️ **“customB”:** informação livre B.

➡️ **“customC”:** informação livre C, em JSON.

➡️ **“customD”:** informação livre D, em JSON.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X POST 'https://api.chatmasterveloz.com/api/tickets/updateAPI' \
  -H 'Authorization: Bearer {seutokenaqui}' \
  -H 'Content-Type: application/json' \
  --data '{"ticketId":"1067","status":"pending","userId":"13","queueId":"34","typebot_sessionId":"CAMPO LIVRE LETRAS E NÚMEROS","customA":"CAMPO LIVRE LETRAS E NÚMEROS","customB":"CAMPO LIVRE LETRAS E NÚMEROS","customC":{"origem":"site"},"customD":{"pedido":4471}}'
```
