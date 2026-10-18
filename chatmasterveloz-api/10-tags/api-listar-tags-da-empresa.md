---
title: "API Listar Tags da Empresa"
slug: api-listar-tags-da-empresa
category: "Tags"
plan: Todas
method: GET
endpoint: https://api.chatmasterveloz.com/api/tags?todas=&tipo=
source: https://clihelper.chatmasterveloz.com/docs/api-listar-tags-da-empresa
fetched: 2026-10-14
---
# API Listar Tags da Empresa  `Todas`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-listar-tags-da-empresa> · [Voltar ao índice](../README.md)

🧩 Listar **Tags** de uma empresa.

**API:** Todas

### Endpoint

```
https://api.chatmasterveloz.com/api/tags?todas=&tipo=
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

➡️ Esta chamada não tem payload — os dois filtros vão na própria URL.

◽ **todas:** `1` traz também as tags inativas. Sem ele, só as ativas.

◽ **tipo:** traz só um tipo — `Atendimento`, `Encerramento` ou `CRM`. Maiúsculas não importam, e um tipo inventado é recusado.

◽ Sem os dois, vêm todas as tags ativas da empresa, em ordem de nome.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X GET 'https://api.chatmasterveloz.com/api/tags?todas=&tipo=' \
  -H 'Authorization: Bearer {seutokenaqui}'
```
