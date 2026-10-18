---
title: "API Listar Tarefas"
slug: api-listar-tarefas
category: "Tarefas"
plan: Todas
method: GET
endpoint: https://api.chatmasterveloz.com/api/tasks/list?status=&priority=medium&userId=
source: https://clihelper.chatmasterveloz.com/docs/api-listar-tarefas
fetched: 2026-10-14
---
# API Listar Tarefas  `Todas`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-listar-tarefas> · [Voltar ao índice](../README.md)

🧩 Listar **tarefas** da empresa, com filtros pela URL.

**API:** Todas

### Endpoint

```
https://api.chatmasterveloz.com/api/tasks/list?status=&priority=medium&userId=
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

```
// sem payload — os filtros vão na própria URL
```

➡️ Esta chamada não tem payload. Os filtros são informados como **query** na URL, por exemplo `?status=pending&priority=medium`.

◽ **“status”:** `pending` ou `completed`.

◽ **“priority”:** `high`, `medium` ou `low`.

◽ **“createdBy”:** só as criadas por aquele atendente.

◽ **“assignedTo”:** só as designadas para aquele atendente.

◽ **“sharedWith”:** só as compartilhadas com aquele atendente.

◽ **“userId”:** as criadas por, designadas para **ou** compartilhadas com aquele atendente.

⚠️ **Esses quatro filtros de pessoa se excluem, nesta ordem:** `createdBy`, `assignedTo`, `sharedWith`, `userId`. Se você mandar mais de um, **só o primeiro da ordem vale** e os outros são ignorados, sem aviso.

◽ **“ticketId”:** só as vinculadas àquele Ticket. Este soma-se a qualquer um dos outros.

◽ Cada tarefa vem com quem criou e quem é o responsável, das mais prioritárias e mais recentes para as demais.

◽ Não há páginas: a lista vem inteira.

◽ Qualquer falha responde **erro de servidor** — por exemplo uma prioridade fora das três.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X GET 'https://api.chatmasterveloz.com/api/tasks/list?status=&priority=medium&userId=' \
  -H 'Authorization: Bearer {seutokenaqui}'
```
