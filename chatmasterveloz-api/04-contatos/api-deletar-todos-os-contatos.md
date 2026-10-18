---
title: "API Deletar TODOS os Contatos"
slug: api-deletar-todos-os-contatos
category: "Contatos"
plan: Todas
method: DELETE
endpoint: https://api.chatmasterveloz.com/contacts-delete
source: https://clihelper.chatmasterveloz.com/docs/api-deletar-todos-os-contatos
fetched: 2026-10-14
---
# API Deletar TODOS os Contatos  `Todas`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-deletar-todos-os-contatos> · [Voltar ao índice](../README.md)

🧩 Apaga **todos os contatos** da sua empresa.

⚠️ **Faça por sua conta e risco, e de preferência fora do horário comercial.** A chamada precisa ser repetida quantas vezes forem necessárias até que todos sejam excluídos, e o processo pode levar horas, dependendo da quantidade de mensagens e tickets.

**API:** Todas

### Endpoint

```
https://api.chatmasterveloz.com/contacts-delete
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
// sem payload
```

➡️ Esta chamada não tem payload. Repita a chamada até que todos os contatos tenham sido apagados.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X DELETE 'https://api.chatmasterveloz.com/contacts-delete' \
  -H 'Authorization: Bearer {seutokenaqui}'
```
