---
title: "API Enviar Status de Imagem"
slug: api-enviar-status-de-imagem
category: "Extras"
plan: Pro
method: POST
endpoint: https://api.chatmasterveloz.com/api/messages/whatsmeow/sendImageStatus
source: https://clihelper.chatmasterveloz.com/docs/api-enviar-status-de-imagem
fetched: 2026-10-14
---
# API Enviar Status de Imagem  `Pro`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-enviar-status-de-imagem> · [Voltar ao índice](../README.md)

🧩 Envia um **status de imagem**.

**API:** Pro

### Endpoint

```
https://api.chatmasterveloz.com/api/messages/whatsmeow/sendImageStatus
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
    "body": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAABHNCSVQICAgIfAhk...",
    "caption": "Teste"
  }
```

➡️ **“body”:** a imagem em `base64`.

➡️ **“caption”:** legenda do status.

◽ O valor de `body` aqui aparece encurtado — na chamada real vai a imagem inteira em base64.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X POST 'https://api.chatmasterveloz.com/api/messages/whatsmeow/sendImageStatus' \
  -H 'Authorization: Bearer {seutokenaqui}' \
  -H 'Content-Type: application/json' \
  --data '{"body":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAABHNCSVQICAgIfAhk...","caption":"Teste"}'
```
