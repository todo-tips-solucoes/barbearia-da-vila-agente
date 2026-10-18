---
title: "API Oficial Enviar Áudio por URL"
slug: api-oficial-enviar-audio-por-url
category: "Mídias"
plan: Oficial
method: POST
endpoint: https://api.chatmasterveloz.com/api/messages/official/sendMediaByURL
source: https://clihelper.chatmasterveloz.com/docs/api-oficial-enviar-audio-por-url
fetched: 2026-10-14
---
# API Oficial Enviar Áudio por URL  `Oficial`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-oficial-enviar-audio-por-url> · [Voltar ao índice](../README.md)

🧩 Envia um **áudio a partir de uma URL**, estando com a Janela de Atendimento ao Cliente **aberta**.

**API:** Oficial

### Endpoint

```
https://api.chatmasterveloz.com/api/messages/official/sendMediaByURL
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
  "type": "audio",
  "ptt": true,
  "body": "https://suite.chatmasterveloz.com/api/audio.mp3"
}
```

➡️ **“number”:** telefone do destinatário no formato ddi ddd numero (somente números).

➡️ **“type”:** `audio`.

➡️ **“ptt”:** `true` pede que o áudio chegue como **mensagem de voz**.

➡️ **“body”:** URL do arquivo.

➡️ **“caption”:** legenda do áudio.

➡️ **“fileName”:** nome do arquivo que o cliente vê.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X POST 'https://api.chatmasterveloz.com/api/messages/official/sendMediaByURL' \
  -H 'Authorization: Bearer {seutokenaqui}' \
  -H 'Content-Type: application/json' \
  --data '{"number":"5511955892164","type":"audio","ptt":true,"body":"https://suite.chatmasterveloz.com/api/audio.mp3"}'
```
