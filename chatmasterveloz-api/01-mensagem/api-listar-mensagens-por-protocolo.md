---
title: "API Listar Mensagens por Protocolo"
slug: api-listar-mensagens-por-protocolo
category: "Mensagem"
plan: Todas
method: GET
endpoint: https://api.chatmasterveloz.com/api/tickets/messages/{protocol}
source: https://clihelper.chatmasterveloz.com/docs/api-listar-mensagens-por-protocolo
fetched: 2026-10-14
---
# API Listar Mensagens por Protocolo  `Todas`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-listar-mensagens-por-protocolo> · [Voltar ao índice](../README.md)

🧩 Listar **todas as mensagens** de um protocolo.

**API:** Todas

### Endpoint

```
https://api.chatmasterveloz.com/api/tickets/messages/{protocol}
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

```json
{
    "protocol":"6126"
}
```

➡️ **“protocol”:** ID do protocolo — o número entra no fim do endereço, como em `/api/tickets/messages/6126`.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X GET 'https://api.chatmasterveloz.com/api/tickets/messages/{protocol}' \
  -H 'Authorization: Bearer {seutokenaqui}' \
  -H 'Content-Type: application/json' \
  --data '{"protocol":"6126"}'
```
