---
title: "API Criar Tarefa"
slug: api-criar-tarefa
category: "Tarefas"
plan: Todas
method: POST
endpoint: https://api.chatmasterveloz.com/api/tasks/create
source: https://clihelper.chatmasterveloz.com/docs/api-criar-tarefa
fetched: 2026-10-14
---
# API Criar Tarefa  `Todas`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-criar-tarefa> · [Voltar ao índice](../README.md)

🧩 Cria **uma tarefa** na empresa.

**API:** Todas

### Endpoint

```
https://api.chatmasterveloz.com/api/tasks/create
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
    "createdBy": 1,
    "title": "Nova tarefa via API",
    "description": "Descrição da tarefa",
    "priority": "high",
    "assignedTo": 4,
    "ticketId": 700,
    "dueDate": "2028-12-30T23:59:59.000Z"
  }
```

➡️ **“createdBy”:** ID do atendente que está criando a tarefa. **Obrigatório.**

◽ Este campo **não é conferido** contra a empresa: um id de outra empresa é gravado do mesmo jeito. Informe um atendente da sua.

➡️ **“title”:** título da tarefa. **Obrigatório.**

➡️ **“description”:** descrição da tarefa.

➡️ **“priority”:** `high`, `medium` ou `low`. Sem informar, entra como `medium`.

➡️ **“assignedTo”:** ID do atendente a quem a tarefa foi designada.

◽ Ele é avisado na hora, por notificação e pela tela, como numa tarefa criada pelo painel.

➡️ **“ticketId”:** ID do Ticket ao qual a tarefa fica vinculada.

➡️ **“dueDate”:** data de vencimento, no formato ISO 8601 — `AAAA-MM-DDTHH:mm:ss.sssZ`.

◽ Também aceita só a data, `AAAA-MM-DD`: nesse caso ela é gravada ao meio-dia UTC, para não escorregar um dia por causa do fuso.

◽ A tarefa nasce como **pendente**.

◽ Qualquer falha responde **erro de servidor** — inclusive título vazio ou `createdBy` ausente. Não é sinal de que a plataforma está com problema.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X POST 'https://api.chatmasterveloz.com/api/tasks/create' \
  -H 'Authorization: Bearer {seutokenaqui}' \
  -H 'Content-Type: application/json' \
  --data '{"createdBy":1,"title":"Nova tarefa via API","description":"Descrição da tarefa","priority":"high","assignedTo":4,"ticketId":700,"dueDate":"2028-12-30T23:59:59.000Z"}'
```
