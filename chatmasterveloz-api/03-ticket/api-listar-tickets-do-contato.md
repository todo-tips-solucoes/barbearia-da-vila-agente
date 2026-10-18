---
title: "API Listar Tickets do Contato"
slug: api-listar-tickets-do-contato
category: "Ticket"
plan: Todas
method: GET
endpoint: https://api.chatmasterveloz.com/api/contacts/alltickets
source: https://clihelper.chatmasterveloz.com/docs/api-listar-tickets-do-contato
fetched: 2026-10-14
---
# API Listar Tickets do Contato  `Todas`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-listar-tickets-do-contato> · [Voltar ao índice](../README.md)

🧩 Listar **todos os tickets de um contato**, em todas as conexões. Lembre-se de que um ticket é uma conversa entre um contato e uma conexão.

**API:** Todas

### Endpoint

```
https://api.chatmasterveloz.com/api/contacts/alltickets
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

```json
{
    "number":"5511955892164"
}
```

➡️ **“number”:** telefone do contato no formato ddi ddd numero (somente números).

◽ O número precisa ter a **mesma quantidade de dígitos** que está cadastrada na plataforma.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X GET 'https://api.chatmasterveloz.com/api/contacts/alltickets' \
  -H 'Authorization: Bearer {seutokenaqui}' \
  -H 'Content-Type: application/json' \
  --data '{"number":"5511955892164"}'
```
