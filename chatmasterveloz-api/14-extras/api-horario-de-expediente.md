---
title: "API Horário de Expediente"
slug: api-horario-de-expediente
category: "Extras"
plan: Todas
method: POST
endpoint: https://api.chatmasterveloz.com/api/queue
source: https://clihelper.chatmasterveloz.com/docs/api-horario-de-expediente
fetched: 2026-10-14
---
# API Horário de Expediente  `Todas`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-horario-de-expediente> · [Voltar ao índice](../README.md)

🧩 Verifica o **horário de expediente de um Setor**. Dentro do horário a resposta traz `"isOpen": true`; fora dele, `"isOpen": false`.

**API:** Todas

### Endpoint

```
https://api.chatmasterveloz.com/api/queue
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
    "queueId": 1
  }
```

➡️ **“queueId”:** ID do Setor.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X POST 'https://api.chatmasterveloz.com/api/queue' \
  -H 'Authorization: Bearer {seutokenaqui}' \
  -H 'Content-Type: application/json' \
  --data '{"queueId":1}'
```
