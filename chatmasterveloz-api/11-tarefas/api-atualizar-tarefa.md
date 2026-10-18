---
title: "API Atualizar Tarefa"
slug: api-atualizar-tarefa
category: "Tarefas"
plan: Todas
method: PUT
endpoint: https://api.chatmasterveloz.com/api/tasks/{tarefaId}
source: https://clihelper.chatmasterveloz.com/docs/api-atualizar-tarefa
fetched: 2026-10-14
---
# API Atualizar Tarefa  `Todas`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-atualizar-tarefa> · [Voltar ao índice](../README.md)

🧩 Atualiza **uma tarefa** — só o que vier no corpo muda.

**API:** Todas

### Endpoint

```
https://api.chatmasterveloz.com/api/tasks/{tarefaId}
```

### Método

```
PUT
```

### Autenticação

```
Bearer {seutokenaqui}
```

### Payload

```json
{
    "title": "Retornar ligação do cliente",
    "description": "Cliente pediu retorno à tarde",
    "priority": "high",
    "assignedTo": 4,
    "dueDate": "2028-12-30T23:59:59.000Z"
}
```

➡️ **“tarefaId”:** ID da tarefa — vai no próprio endereço, no lugar de `{tarefaId}`. **Obrigatório.**

➡️ **“title”:** novo título da tarefa.

➡️ **“description”:** nova descrição.

➡️ **“priority”:** `high`, `medium` ou `low`.

➡️ **“assignedTo”:** ID do atendente responsável. Mande `0` para deixar a tarefa sem responsável.

➡️ **“dueDate”:** prazo, no formato ISO 8601 — `AAAA-MM-DDTHH:mm:ss.sssZ`. Mande `null` para tirar o prazo.

➡️ **“status”:** `pending` para a tarefa em aberto, `completed` para concluída.

➡️ **“ticketId”:** ID do atendimento vinculado. Mande `0` ou `null` para desvincular.

◽ Os campos que você não enviar ficam como estão.

◽ Quando a tarefa está sincronizada com a agenda do Google, o evento de lá acompanha a mudança.

◽ A resposta traz a tarefa com quem criou, o responsável e o atendimento vinculado.

◽ Tarefa que não existe, ou de outra empresa, responde **erro de servidor** — e não "não encontrada". É assim mesmo: não é sinal de que a plataforma está com problema.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X PUT 'https://api.chatmasterveloz.com/api/tasks/{tarefaId}' \
  -H 'Authorization: Bearer {seutokenaqui}' \
  -H 'Content-Type: application/json' \
  --data '{"title":"Retornar ligação do cliente","description":"Cliente pediu retorno à tarde","priority":"high","assignedTo":4,"dueDate":"2028-12-30T23:59:59.000Z"}'
```
