---
title: "API Deletar Oportunidade"
slug: api-deletar-oportunidade
category: "CRM"
plan: Todas
method: DELETE
endpoint: https://api.chatmasterveloz.com/api/crm/v2/oportunidades/{oportunidadeId}
source: https://clihelper.chatmasterveloz.com/docs/api-deletar-oportunidade
fetched: 2026-10-14
---
# API Deletar Oportunidade  `Todas`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-deletar-oportunidade> · [Voltar ao índice](../README.md)

🧩 Apaga **uma oportunidade** do CRM.

**API:** Todas

### Endpoint

```
https://api.chatmasterveloz.com/api/crm/v2/oportunidades/{oportunidadeId}
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

➡️ **“oportunidadeId”:** ID da oportunidade — vai no próprio endereço, no lugar de `{oportunidadeId}`. **Obrigatório.**

⚠️ **Não há como desfazer.** O histórico de eventos da oportunidade é apagado junto.

◽ Id que não existe e id de outra empresa respondem a mesma coisa: não encontrado. A chamada não confirma quais ids existem no sistema.

⚠️ **A empresa precisa estar com o CRM novo ativado.**

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X DELETE 'https://api.chatmasterveloz.com/api/crm/v2/oportunidades/{oportunidadeId}' \
  -H 'Authorization: Bearer {seutokenaqui}'
```
