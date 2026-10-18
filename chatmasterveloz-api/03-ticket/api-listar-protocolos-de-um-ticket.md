---
title: "API Listar Protocolos de um Ticket"
slug: api-listar-protocolos-de-um-ticket
category: "Ticket"
plan: Todas
method: POST
endpoint: https://api.chatmasterveloz.com/api/tickets/getproto
source: https://clihelper.chatmasterveloz.com/docs/api-listar-protocolos-de-um-ticket
fetched: 2026-10-14
---
# API Listar Protocolos de um Ticket  `Todas`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-listar-protocolos-de-um-ticket> · [Voltar ao índice](../README.md)

🧩 Listar os **protocolos de um ticket**.

**API:** Todas

### Endpoint

```
https://api.chatmasterveloz.com/api/tickets/getproto
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
    "ticketId": "2003"
  }
```

➡️ **“ticketId”:** ID do Ticket.

◽ É o número entre parênteses no cabeçalho da conversa. Em **João da Silva (52) | #25678**, o ticketId é o **52**.

◽ O **25678** é o protocolo, e não serve nesta chamada.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X POST 'https://api.chatmasterveloz.com/api/tickets/getproto' \
  -H 'Authorization: Bearer {seutokenaqui}' \
  -H 'Content-Type: application/json' \
  --data '{"ticketId":"2003"}'
```
