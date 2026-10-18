---
title: "API Deletar Agendamento"
slug: api-deletar-agendamento
category: "Mensagem"
plan: Todas
method: POST
endpoint: https://api.chatmasterveloz.com/api/schedules/delete
source: https://clihelper.chatmasterveloz.com/docs/api-deletar-agendamento
fetched: 2026-10-14
---
# API Deletar Agendamento  `Todas`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-deletar-agendamento> · [Voltar ao índice](../README.md)

🧩 Deleta uma **mensagem agendada via API**.

**API:** Todas

### Endpoint

```
https://api.chatmasterveloz.com/api/schedules/delete
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
    "scheduleId":"55"
}
```

➡️ **“scheduleId”:** ID do agendamento realizado via API.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X POST 'https://api.chatmasterveloz.com/api/schedules/delete' \
  -H 'Authorization: Bearer {seutokenaqui}' \
  -H 'Content-Type: application/json' \
  --data '{"scheduleId":"55"}'
```
