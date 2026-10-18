---
title: "API Enviar Áudio por URL"
slug: api-enviar-audio-por-url
category: "Mídias"
plan: Básica
method: POST
endpoint: https://api.chatmasterveloz.com/api/messages/sendURLAudio
source: https://clihelper.chatmasterveloz.com/docs/api-enviar-audio-por-url
fetched: 2026-10-14
---
# API Enviar Áudio por URL  `Básica`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-enviar-audio-por-url> · [Voltar ao índice](../README.md)

🧩 Envia um **áudio a partir de uma URL**.

**API:** Básica

### Endpoint

```
https://api.chatmasterveloz.com/api/messages/sendURLAudio
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
    "number": "5511955892164",
    "body": "https://suite.chatmasterveloz.com/api/audio.mp3",
    "mimeType": "audio/mpeg",
    "fileName": "audio.mp3",
    "ptt": true
  }
```

➡️ **“number”:** telefone do destinatário no formato ddi ddd numero (somente números).

➡️ **“body”:** URL do arquivo.

➡️ **“fileName”:** nome do arquivo que o cliente vê.

➡️ **“mimeType”:** tipo do arquivo no formato MIME — aqui `audio/mpeg`.

➡️ **“ptt”:** `true` para o áudio chegar como mensagem de voz.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X POST 'https://api.chatmasterveloz.com/api/messages/sendURLAudio' \
  -H 'Authorization: Bearer {seutokenaqui}' \
  -H 'Content-Type: application/json' \
  --data '{"number":"5511955892164","body":"https://suite.chatmasterveloz.com/api/audio.mp3","mimeType":"audio/mpeg","fileName":"audio.mp3","ptt":true}'
```
