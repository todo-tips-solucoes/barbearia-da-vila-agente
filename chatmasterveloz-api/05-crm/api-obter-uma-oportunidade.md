---
title: "API Obter uma Oportunidade"
slug: api-obter-uma-oportunidade
category: "CRM"
plan: Todas
method: GET
endpoint: https://api.chatmasterveloz.com/api/crm/v2/oportunidades/{oportunidadeId}
source: https://clihelper.chatmasterveloz.com/docs/api-obter-uma-oportunidade
fetched: 2026-10-14
---
# API Obter uma Oportunidade  `Todas`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-obter-uma-oportunidade> · [Voltar ao índice](../README.md)

🧩 Obter **uma oportunidade** do CRM, com tudo o que está ligado a ela.

**API:** Todas

### Endpoint

```
https://api.chatmasterveloz.com/api/crm/v2/oportunidades/{oportunidadeId}
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

➡️ **“oportunidadeId”:** ID da oportunidade — no lugar de `{oportunidadeId}`. **Obrigatório.**

◽ Vem o registro completo com o contato e a foto, o atendimento e a conexão por onde a conversa corre, o responsável, as etiquetas, o funil e a raia.

◽ Quando o card nasceu do encadeamento de outro funil, vem também a oportunidade que o originou.

◽ Id que não existe e id de outra empresa respondem a mesma coisa: não encontrado. A chamada não confirma quais ids existem no sistema.

⚠️ **A empresa precisa estar com o CRM novo ativado.**

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X GET 'https://api.chatmasterveloz.com/api/crm/v2/oportunidades/{oportunidadeId}' \
  -H 'Authorization: Bearer {seutokenaqui}'
```
