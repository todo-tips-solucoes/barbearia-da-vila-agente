---
title: "API Listar Motivos de Perda"
slug: api-listar-motivos-de-perda
category: "CRM"
plan: Todas
method: GET
endpoint: https://api.chatmasterveloz.com/api/crm/v2/motivos-perda
source: https://clihelper.chatmasterveloz.com/docs/api-listar-motivos-de-perda
fetched: 2026-10-14
---
# API Listar Motivos de Perda  `Todas`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-listar-motivos-de-perda> · [Voltar ao índice](../README.md)

🧩 Listar os **motivos de perda** cadastrados.

**API:** Todas

### Endpoint

```
https://api.chatmasterveloz.com/api/crm/v2/motivos-perda
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

◽ Use o id em `motivoPerdaId` ao mover uma oportunidade para uma raia de perda.

◽ Vêm os motivos globais, que valem em todos os funis, e os de cada funil — os globais primeiro.

◽ Vêm só os motivos ativos.

⚠️ **A empresa precisa estar com o CRM novo ativado.**

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X GET 'https://api.chatmasterveloz.com/api/crm/v2/motivos-perda' \
  -H 'Authorization: Bearer {seutokenaqui}'
```
