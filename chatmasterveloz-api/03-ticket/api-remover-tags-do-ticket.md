---
title: "API Remover Tags do Ticket"
slug: api-remover-tags-do-ticket
category: "Ticket"
plan: Todas
method: DELETE
endpoint: https://api.chatmasterveloz.com/api/tickets/{ticketId}/tags
source: https://clihelper.chatmasterveloz.com/docs/api-remover-tags-do-ticket
fetched: 2026-10-14
---
# API Remover Tags do Ticket  `Todas`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-remover-tags-do-ticket> · [Voltar ao índice](../README.md)

🧩 Remove **só as tags informadas** de um atendimento e deixa as outras.

**API:** Todas

### Endpoint

```
https://api.chatmasterveloz.com/api/tickets/{ticketId}/tags
```

### Método

```
DELETE
```

### Autenticação

```
Bearer {seutokenaqui}
```

### Payload

```json
{
    "tags": [12, "VIP"]
}
```

➡️ **“ticketId”:** ID do Ticket — vai no próprio endereço, no lugar de `{ticketId}`. **Obrigatório.**

➡️ **“tags”:** lista de ids ou de nomes das tags a tirar. **Obrigatório.**

◽ Nome não diferencia maiúsculas de minúsculas. Aceita `[12, "VIP"]` e `"12,31"`.

◽ Remover uma tag que o atendimento não tem não faz nada.

◽ Tag que não existe na empresa faz a chamada falhar inteira, sem alterar nada.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X DELETE 'https://api.chatmasterveloz.com/api/tickets/{ticketId}/tags' \
  -H 'Authorization: Bearer {seutokenaqui}' \
  -H 'Content-Type: application/json' \
  --data '{"tags":[12,"VIP"]}'
```
