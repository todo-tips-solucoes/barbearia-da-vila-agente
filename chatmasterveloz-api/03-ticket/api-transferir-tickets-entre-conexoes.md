---
title: "API Transferir Tickets entre Conexões"
slug: api-transferir-tickets-entre-conexoes
category: "Ticket"
plan: Todas
method: POST
endpoint: https://api.chatmasterveloz.com/api/tickets/changeconnection
source: https://clihelper.chatmasterveloz.com/docs/api-transferir-tickets-entre-conexoes
fetched: 2026-10-14
---
# API Transferir Tickets entre Conexões  `Todas`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-transferir-tickets-entre-conexoes> · [Voltar ao índice](../README.md)

🧩 Transfere **todos os tickets de uma conexão** para outra.

**API:** Todas

### Endpoint

```
https://api.chatmasterveloz.com/api/tickets/changeconnection
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
    "OLD_connectionId":158,
    "NEW_connectionId":159
  }
```

➡️ **“OLD_connectionId”:** ID da conexão que entrega os tickets. **Obrigatório.**

➡️ **“NEW_connectionId”:** ID da conexão que recebe os tickets. **Obrigatório.**

◽ A resposta diz quantos tickets foram migrados e quantos foram pulados.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X POST 'https://api.chatmasterveloz.com/api/tickets/changeconnection' \
  -H 'Authorization: Bearer {seutokenaqui}' \
  -H 'Content-Type: application/json' \
  --data '{"OLD_connectionId":158,"NEW_connectionId":159}'
```
