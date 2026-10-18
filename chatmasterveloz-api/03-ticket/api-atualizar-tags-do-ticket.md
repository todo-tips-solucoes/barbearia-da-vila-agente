---
title: "API Atualizar Tags do Ticket"
slug: api-atualizar-tags-do-ticket
category: "Ticket"
plan: Todas
method: POST
endpoint: https://api.chatmasterveloz.com/api/tags/add
source: https://clihelper.chatmasterveloz.com/docs/api-atualizar-tags-do-ticket
fetched: 2026-10-14
---
# API Atualizar Tags do Ticket  `Todas`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-atualizar-tags-do-ticket> · [Voltar ao índice](../README.md)

🧩 Define as **Tags de um ticket**.

⚠️ Esta chamada **substitui** as Tags do ticket: as que já estavam vinculadas são removidas e ficam valendo apenas as que você enviar no código. Para manter alguma, inclua o ID dela junto.

**API:** Todas

### Endpoint

```
https://api.chatmasterveloz.com/api/tags/add
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
    "ticketId": 383,
    "tags": [
      {
        "id": 100
      },
      {
        "id": 98
      }
    ]
}
```

➡️ **“ticketId”:** ID do Ticket.

◽ É o número entre parênteses no cabeçalho da conversa. Em **João da Silva (52) | #25678**, o ticketId é o **52**.

◽ O **25678** é o protocolo, e não serve nesta chamada.

➡️ **“tags.id”:** ID de cada Tag que deve ficar no ticket.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X POST 'https://api.chatmasterveloz.com/api/tags/add' \
  -H 'Authorization: Bearer {seutokenaqui}' \
  -H 'Content-Type: application/json' \
  --data '{"ticketId":383,"tags":[{"id":100},{"id":98}]}'
```
