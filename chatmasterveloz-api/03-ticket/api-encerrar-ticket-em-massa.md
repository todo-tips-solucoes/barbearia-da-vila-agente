---
title: "API Encerrar Ticket em Massa"
slug: api-encerrar-ticket-em-massa
category: "Ticket"
plan: Todas
method: POST
endpoint: https://api.chatmasterveloz.com/api/tickets/closestatus
source: https://clihelper.chatmasterveloz.com/docs/api-encerrar-ticket-em-massa
fetched: 2026-10-14
---
# API Encerrar Ticket em Massa  `Todas`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-encerrar-ticket-em-massa> · [Voltar ao índice](../README.md)

🧩 Encerra **um grupo de tickets** de uma vez, a partir do status e do Setor.

**API:** Todas

### Endpoint

```
https://api.chatmasterveloz.com/api/tickets/closestatus
```

### Método

```
POST
```

### Autenticação

```
Bearer {seutokenaqui}
```

### Payload

```json
{
    "status": "open",
    "all": false,
    "queueId": null
  }
```

➡️ **“status”:** status dos tickets a encerrar — `open`, `pending` ou `both`.

➡️ **“all”:** define o alcance entre as conexões.

◽ `false` — somente a conexão do token usado na chamada.

◽ `true` — todas as conexões.

➡️ **“queueId”:** ID do Setor cujos tickets serão encerrados. Deixe `null` para encerrar os de todos os Setores.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X POST 'https://api.chatmasterveloz.com/api/tickets/closestatus' \
  -H 'Authorization: Bearer {seutokenaqui}' \
  -H 'Content-Type: application/json' \
  --data '{"status":"open","all":false,"queueId":null}'
```
