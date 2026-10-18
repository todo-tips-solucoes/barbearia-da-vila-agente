---
title: "API Obter o Status de uma Tarefa"
slug: api-obter-o-status-de-uma-tarefa
category: "Tarefas"
plan: Todas
method: GET
endpoint: https://api.chatmasterveloz.com/api/tasks/{tarefaId}/status
source: https://clihelper.chatmasterveloz.com/docs/api-obter-o-status-de-uma-tarefa
fetched: 2026-10-14
---
# API Obter o Status de uma Tarefa  `Todas`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-obter-o-status-de-uma-tarefa> · [Voltar ao índice](../README.md)

🧩 Obter o **resumo de uma tarefa**: em que pé ela está, para quem é e até quando.

**API:** Todas

### Endpoint

```
https://api.chatmasterveloz.com/api/tasks/{tarefaId}/status
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
// sem payload — a tarefa vai no endereço
```

➡️ **“tarefaId”:** ID da tarefa — vai no próprio endereço, no lugar de `{tarefaId}`. **Obrigatório.**

◽ A resposta traz o título, a situação, a prioridade, o prazo, quem criou e quem é o responsável.

◽ Só leitura: esta chamada não altera nada.

◽ Tarefa que não existe, ou de outra empresa, responde **erro de servidor** — e não "não encontrada". É assim mesmo: não é sinal de que a plataforma está com problema.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X GET 'https://api.chatmasterveloz.com/api/tasks/{tarefaId}/status' \
  -H 'Authorization: Bearer {seutokenaqui}'
```
