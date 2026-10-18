---
title: "API Deletar Tarefa"
slug: api-deletar-tarefa
category: "Tarefas"
plan: Todas
method: DELETE
endpoint: https://api.chatmasterveloz.com/api/tasks/{tarefaId}
source: https://clihelper.chatmasterveloz.com/docs/api-deletar-tarefa
fetched: 2026-10-14
---
# API Deletar Tarefa  `Todas`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-deletar-tarefa> · [Voltar ao índice](../README.md)

🧩 Apaga **uma tarefa**.

**API:** Todas

### Endpoint

```
https://api.chatmasterveloz.com/api/tasks/{tarefaId}
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

```
// sem payload — a tarefa vai no endereço
```

➡️ **“tarefaId”:** ID da tarefa — vai no próprio endereço, no lugar de `{tarefaId}`. **Obrigatório.**

⚠️ **Não há como desfazer.**

◽ Antes de apagar, o evento correspondente sai da agenda do Google, quando existe.

◽ Tarefa que não existe, ou de outra empresa, responde **erro de servidor** — e não "não encontrada". É assim mesmo: não é sinal de que a plataforma está com problema.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X DELETE 'https://api.chatmasterveloz.com/api/tasks/{tarefaId}' \
  -H 'Authorization: Bearer {seutokenaqui}'
```
