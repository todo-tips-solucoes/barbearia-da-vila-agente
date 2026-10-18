---
title: "API Finalizar Tarefa"
slug: api-finalizar-tarefa
category: "Tarefas"
plan: Todas
method: POST
endpoint: https://api.chatmasterveloz.com/api/tasks/{tarefaId}/complete
source: https://clihelper.chatmasterveloz.com/docs/api-finalizar-tarefa
fetched: 2026-10-14
---
# API Finalizar Tarefa  `Todas`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-finalizar-tarefa> · [Voltar ao índice](../README.md)

🧩 Marca **uma tarefa como concluída**.

**API:** Todas

### Endpoint

```
https://api.chatmasterveloz.com/api/tasks/{tarefaId}/complete
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

```
// sem payload — a tarefa vai no endereço
```

➡️ **“tarefaId”:** ID da tarefa — vai no próprio endereço, no lugar de `{tarefaId}`. **Obrigatório.**

◽ Concluir pela API é o mesmo que concluir pela tela: a tarefa sai da agenda do Google, quando estava lá.

◽ A resposta traz a tarefa com quem criou e quem é o responsável.

◽ Tarefa que não existe, ou de outra empresa, responde **erro de servidor** — e não "não encontrada". É assim mesmo: não é sinal de que a plataforma está com problema.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X POST 'https://api.chatmasterveloz.com/api/tasks/{tarefaId}/complete' \
  -H 'Authorization: Bearer {seutokenaqui}'
```
