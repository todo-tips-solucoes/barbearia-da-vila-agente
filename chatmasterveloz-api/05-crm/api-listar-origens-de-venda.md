---
title: "API Listar Origens de Venda"
slug: api-listar-origens-de-venda
category: "CRM"
plan: Todas
method: GET
endpoint: https://api.chatmasterveloz.com/api/crm/v2/origens
source: https://clihelper.chatmasterveloz.com/docs/api-listar-origens-de-venda
fetched: 2026-10-14
---
# API Listar Origens de Venda  `Todas`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-listar-origens-de-venda> · [Voltar ao índice](../README.md)

🧩 Listar as **origens de venda** cadastradas — de onde o negócio surgiu.

**API:** Todas

### Endpoint

```
https://api.chatmasterveloz.com/api/crm/v2/origens
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
// sem payload
```

➡️ Esta chamada não tem payload.

◽ Use o id em `origemVendaId` ao criar ou ao alterar uma oportunidade.

◽ Vêm só as origens ativas, na ordem do cadastro.

⚠️ **A empresa precisa estar com o CRM novo ativado.**

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X GET 'https://api.chatmasterveloz.com/api/crm/v2/origens' \
  -H 'Authorization: Bearer {seutokenaqui}'
```
