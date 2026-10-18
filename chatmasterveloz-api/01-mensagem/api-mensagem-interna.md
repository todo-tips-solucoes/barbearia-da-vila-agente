---
title: "API Mensagem Interna"
slug: api-mensagem-interna
category: "Mensagem"
plan: Todas
method: POST
endpoint: https://api.chatmasterveloz.com/api/messages/internal/send
source: https://clihelper.chatmasterveloz.com/docs/api-mensagem-interna
fetched: 2026-10-14
---
# API Mensagem Interna  `Todas`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-mensagem-interna> · [Voltar ao índice](../README.md)

🧩 Envia uma **mensagem de comunicação interna (whisper)**, sendo visível somente dentro do sistema.

**API:** Todas

### Endpoint

```
https://api.chatmasterveloz.com/api/messages/internal/send
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
    "ticketId": "33461",
    "body": "Lead precisa de retorno no pedido"
  }
```

➡️ **“ticketId”:** ID do Ticket — o número entre parênteses no cabeçalho da conversa.

◽ Em **João da Silva (52) | #25678**, o `ticketId` é **52**.

◽ O número depois do **#** é o protocolo (25678, no exemplo) e não serve nesta API.

➡️ **“body”:** mensagem interna.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X POST 'https://api.chatmasterveloz.com/api/messages/internal/send' \
  -H 'Authorization: Bearer {seutokenaqui}' \
  -H 'Content-Type: application/json' \
  --data '{"ticketId":"33461","body":"Lead precisa de retorno no pedido"}'
```
