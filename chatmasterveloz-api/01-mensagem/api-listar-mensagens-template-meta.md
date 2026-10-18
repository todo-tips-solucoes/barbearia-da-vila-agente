---
title: "API Listar Mensagens Template Meta"
slug: api-listar-mensagens-template-meta
category: "Mensagem"
plan: Oficial
method: GET
endpoint: https://api.chatmasterveloz.com/api/waba-templates?status=APPROVED&category=UTILITY
source: https://clihelper.chatmasterveloz.com/docs/api-listar-mensagens-template-meta
fetched: 2026-10-14
---
# API Listar Mensagens Template Meta  `Oficial`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-listar-mensagens-template-meta> · [Voltar ao índice](../README.md)

🧩 Obter a **lista de templates** da conexão, com filtro opcional por situação e categoria.

**API:** Oficial

### Endpoint

```
https://api.chatmasterveloz.com/api/waba-templates?status=APPROVED&category=UTILITY
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

➡️ **“status”:** opcional — `PENDING`, `APPROVED`, `REJECTED`, `PAUSED` ou `DISABLED`.

➡️ **“category”:** opcional — `MARKETING`, `UTILITY` ou `AUTHENTICATION`.

◽ Sem nenhum dos dois, a lista vem completa: basta chamar `https://api.chatmasterveloz.com/api/waba-templates`.

⚠️ A lista traz **apenas os templates da conexão da chamada** — a dona do token, quando se usa o token da Conexão, ou a informada quando se usa o Token da Empresa.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X GET 'https://api.chatmasterveloz.com/api/waba-templates?status=APPROVED&category=UTILITY' \
  -H 'Authorization: Bearer {seutokenaqui}'
```
