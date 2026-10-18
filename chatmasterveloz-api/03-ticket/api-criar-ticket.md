---
title: "API Criar Ticket"
slug: api-criar-ticket
category: "Ticket"
plan: Todas
method: POST
endpoint: https://api.chatmasterveloz.com/api/tickets/createTicketAPI
source: https://clihelper.chatmasterveloz.com/docs/api-criar-ticket
fetched: 2026-10-14
---
# API Criar Ticket  `Todas`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-criar-ticket> · [Voltar ao índice](../README.md)

🧩 Cria **um ticket**, para iniciar uma conversa com um cliente.

**API:** Todas

### Endpoint

```
https://api.chatmasterveloz.com/api/tickets/createTicketAPI
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
    "contactId": 9580
}
```

➡️ **“contactId”:** ID do contato cadastrado na plataforma.

◽ Se o contato **não** tiver ticket nesta conexão, abre um ticket em **Aguardando**, sem Setor.

◽ Se o contato **já** tiver ticket nesta conexão, nada acontece.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X POST 'https://api.chatmasterveloz.com/api/tickets/createTicketAPI' \
  -H 'Authorization: Bearer {seutokenaqui}' \
  -H 'Content-Type: application/json' \
  --data '{"contactId":9580}'
```
