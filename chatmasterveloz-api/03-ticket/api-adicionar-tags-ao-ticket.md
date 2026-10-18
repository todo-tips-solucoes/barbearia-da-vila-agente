---
title: "API Adicionar Tags ao Ticket"
slug: api-adicionar-tags-ao-ticket
category: "Ticket"
plan: Todas
method: POST
endpoint: https://api.chatmasterveloz.com/api/tickets/{ticketId}/tags
source: https://clihelper.chatmasterveloz.com/docs/api-adicionar-tags-ao-ticket
fetched: 2026-10-14
---
# API Adicionar Tags ao Ticket  `Todas`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-adicionar-tags-ao-ticket> · [Voltar ao índice](../README.md)

🧩 Adiciona **tags em um atendimento,** sem tirar as que já estão.

**API:** Todas

### Endpoint

```
https://api.chatmasterveloz.com/api/tickets/{ticketId}/tags
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
    "tags": [12, "VIP"]
}
```

➡️ **“ticketId”:** ID do Ticket — vai no próprio endereço, no lugar de `{ticketId}`. **Obrigatório.**

➡️ **“tags”:** lista de ids ou de nomes das tags. **Obrigatório.**

◽ Nome não diferencia maiúsculas de minúsculas. Aceita `[12, "VIP"]` e `"12,31"`.

◽ Adicionar uma tag que o atendimento já tem não altera nada.

◽ Tag que não existe na empresa faz a chamada falhar inteira, sem alterar nada.

⚠️ **Tag de raia do Kanban é exclusiva:** um atendimento fica numa raia só, então adicionar uma tag de raia **tira a raia anterior** — igual a arrastar o card no quadro. As tags comuns não são afetadas.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X POST 'https://api.chatmasterveloz.com/api/tickets/{ticketId}/tags' \
  -H 'Authorization: Bearer {seutokenaqui}' \
  -H 'Content-Type: application/json' \
  --data '{"tags":[12,"VIP"]}'
```
