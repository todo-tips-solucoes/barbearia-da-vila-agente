---
title: "API Listar Funis"
slug: api-listar-funis
category: "CRM"
plan: Todas
method: GET
endpoint: https://api.chatmasterveloz.com/api/crm/v2/funis
source: https://clihelper.chatmasterveloz.com/docs/api-listar-funis
fetched: 2026-10-14
---
# API Listar Funis  `Todas`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-listar-funis> · [Voltar ao índice](../README.md)

🧩 Listar os **funis do CRM** da empresa, com as raias (lanes / colunas) de cada um.

**API:** Todas

### Endpoint

```
https://api.chatmasterveloz.com/api/crm/v2/funis
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

◽ Comece por aqui: o **id do funil** e o **id da raia** (lane) são exigidos para criar e para mover oportunidades, e não há como adivinhá-los.

◽ Vêm só os funis ativos, cada um com as raias ativas, na ordem em que aparecem no quadro.

◽ Cada raia diz o tipo — em andamento, ganho ou perdido — e a probabilidade de fechar.

◽ A consulta enxerga a empresa inteira, inclusive os funis que no painel aparecem só para alguns operadores.

◽ O segredo do webhook do funil nunca vem na resposta.

⚠️ **A empresa precisa estar com o CRM novo ativado.**

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X GET 'https://api.chatmasterveloz.com/api/crm/v2/funis' \
  -H 'Authorization: Bearer {seutokenaqui}'
```
