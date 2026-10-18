---
title: "API Encerrar Ticket"
slug: api-encerrar-ticket
category: "Ticket"
plan: Todas
method: POST
endpoint: https://api.chatmasterveloz.com/api/messages/finish
source: https://clihelper.chatmasterveloz.com/docs/api-encerrar-ticket
fetched: 2026-10-14
---
# API Encerrar Ticket  `Todas`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-encerrar-ticket> · [Voltar ao índice](../README.md)

🧩 Encerra **um ticket**, alterando seu status.

**API:** Todas

### Endpoint

```
https://api.chatmasterveloz.com/api/messages/finish
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
    "ticketId": "1067"
}
```

➡️ **“ticketId”:** ID do Ticket.

◽ É o número entre parênteses no cabeçalho da conversa. Em **João da Silva (52) | #25678**, o ticketId é o **52**.

◽ O **25678** é o protocolo, e não serve nesta chamada.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X POST 'https://api.chatmasterveloz.com/api/messages/finish' \
  -H 'Authorization: Bearer {seutokenaqui}' \
  -H 'Content-Type: application/json' \
  --data '{"ticketId":"1067"}'
```
