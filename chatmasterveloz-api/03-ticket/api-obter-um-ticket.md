---
title: "API Obter um Ticket"
slug: api-obter-um-ticket
category: "Ticket"
plan: Todas
method: POST
endpoint: https://api.chatmasterveloz.com/api/tickets/updateAPI
source: https://clihelper.chatmasterveloz.com/docs/api-obter-um-ticket
fetched: 2026-10-14
---
# API Obter um Ticket  `Todas`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-obter-um-ticket> · [Voltar ao índice](../README.md)

🧩 Obter **um ticket específico**.

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
    "ticketId": "2003"
  }
```

➡️ **“ticketId”:** ID do Ticket.

◽ É o número entre parênteses no cabeçalho da conversa. Em **João da Silva (52) | #25678**, o ticketId é o **52**.

◽ O **25678** é o protocolo, e não serve nesta chamada.

⚠️ Esta chamada usa o **mesmo endereço da atualização de ticket**. Enviando apenas o `ticketId`, nada é alterado: o ticket só é devolvido. Qualquer outro campo que você incluir no payload **será gravado** no ticket.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X POST 'https://api.chatmasterveloz.com/api/tickets/updateAPI' \
  -H 'Authorization: Bearer {seutokenaqui}' \
  -H 'Content-Type: application/json' \
  --data '{"ticketId":"2003"}'
```
