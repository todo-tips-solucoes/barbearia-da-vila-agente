---
title: "API Enviar Status de Texto"
slug: api-enviar-status-de-texto
category: "Extras"
plan: Pro
method: POST
endpoint: https://api.chatmasterveloz.com/api/messages/whatsmeow/sendTextStatus
source: https://clihelper.chatmasterveloz.com/docs/api-enviar-status-de-texto
fetched: 2026-10-14
---
# API Enviar Status de Texto  `Pro`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-enviar-status-de-texto> · [Voltar ao índice](../README.md)

🧩 Envia um **status de texto**.

**API:** Pro

### Endpoint

```
https://api.chatmasterveloz.com/api/messages/whatsmeow/sendTextStatus
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
    "body": "Testando",
    "color": 4294967295,
    "backgroundcolor": 4285408638,
    "font": 10
  }
```

➡️ **“body”:** a mensagem de texto do status.

➡️ **“color”:** cor do texto.

➡️ **“backgroundcolor”:** cor do fundo.

➡️ **“font”:** tamanho da fonte.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X POST 'https://api.chatmasterveloz.com/api/messages/whatsmeow/sendTextStatus' \
  -H 'Authorization: Bearer {seutokenaqui}' \
  -H 'Content-Type: application/json' \
  --data '{"body":"Testando","color":4294967295,"backgroundcolor":4285408638,"font":10}'
```
