---
title: "API Gravando…."
slug: api-gravando-pro
category: "Mensagem"
plan: Pro
method: POST
endpoint: https://api.chatmasterveloz.com/api/messages/whatsmeow/sendComposingPRO
source: https://clihelper.chatmasterveloz.com/docs/api-gravando-pro
fetched: 2026-10-14
---
# API Gravando….  `Pro`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-gravando-pro> · [Voltar ao índice](../README.md)

🧩 Altera o status para **Gravando...** até que mude para "pause" ou que envie uma mensagem.

**API:** Pro

### Endpoint

```
https://api.chatmasterveloz.com/api/messages/whatsmeow/sendComposingPRO
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

```jsonc
{
    "number": "5511955892164",
    "body": "composing", //composing, paused
    "caption": "audio"
  }
```

➡️ **“number”:** telefone do destinatário no formato ddi ddd numero (somente números).

➡️ **“body”:** `composing` para ficar gravando…, e `paused` para parar.

➡️ **“caption”:** `audio` para ficar gravando…, e **“”** para digitando…

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X POST 'https://api.chatmasterveloz.com/api/messages/whatsmeow/sendComposingPRO' \
  -H 'Authorization: Bearer {seutokenaqui}' \
  -H 'Content-Type: application/json' \
  --data '{"number":"5511955892164","body":"composing","caption":"audio"}'
```
