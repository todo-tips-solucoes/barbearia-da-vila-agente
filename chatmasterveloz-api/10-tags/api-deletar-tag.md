---
title: "API Deletar Tag"
slug: api-deletar-tag
category: "Tags"
plan: Todas
method: DELETE
endpoint: https://api.chatmasterveloz.com/api/tags/{tagId}
source: https://clihelper.chatmasterveloz.com/docs/api-deletar-tag
fetched: 2026-10-14
---
# API Deletar Tag  `Todas`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-deletar-tag> · [Voltar ao índice](../README.md)

🧩 Apaga **uma tag** do cadastro da empresa.

**API:** Todas

### Endpoint

```
https://api.chatmasterveloz.com/api/tags/{tagId}
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
// sem payload — a tag vai no endereço
```

➡️ **“tagId”:** ID da tag — vai no próprio endereço, no lugar de `{tagId}`. **Obrigatório.**

⚠️ **Isto não é tirar a tag de um Ticket.** A tag é apagada do cadastro da **empresa inteira** e some de todos os Tickets que a tinham.

◽ Não há como desfazer: não existe lixeira.

◽ A resposta diz quantos Tickets estavam com a tag no momento da exclusão.

◽ Tag que não existe e tag de outra empresa respondem a mesma coisa: não encontrada.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X DELETE 'https://api.chatmasterveloz.com/api/tags/{tagId}' \
  -H 'Authorization: Bearer {seutokenaqui}'
```
