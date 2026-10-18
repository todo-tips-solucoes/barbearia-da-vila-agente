---
title: "API Enviar Status de Vídeo"
slug: api-enviar-status-de-video
category: "Extras"
plan: Pro
method: POST
endpoint: https://api.chatmasterveloz.com/api/messages/whatsmeow/sendVideoStatus
source: https://clihelper.chatmasterveloz.com/docs/api-enviar-status-de-video
fetched: 2026-10-14
---
# API Enviar Status de Vídeo  `Pro`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-enviar-status-de-video> · [Voltar ao índice](../README.md)

🧩 Envia um **status de vídeo**.

**API:** Pro

### Endpoint

```
https://api.chatmasterveloz.com/api/messages/whatsmeow/sendVideoStatus
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
    "body": "data:video/mp4;base64,Akd9300...",
    "caption": "Teste"
  }
```

➡️ **“body”:** o vídeo em `base64`.

➡️ **“caption”:** legenda do status.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X POST 'https://api.chatmasterveloz.com/api/messages/whatsmeow/sendVideoStatus' \
  -H 'Authorization: Bearer {seutokenaqui}' \
  -H 'Content-Type: application/json' \
  --data '{"body":"data:video/mp4;base64,Akd9300...","caption":"Teste"}'
```
