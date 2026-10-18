---
title: "API Enviar Vídeo por URL"
slug: api-enviar-video-por-url
category: "Mídias"
plan: Básica
method: POST
endpoint: https://api.chatmasterveloz.com/api/messages/sendURLVideo
source: https://clihelper.chatmasterveloz.com/docs/api-enviar-video-por-url
fetched: 2026-10-14
---
# API Enviar Vídeo por URL  `Básica`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-enviar-video-por-url> · [Voltar ao índice](../README.md)

🧩 Envia um **vídeo a partir de uma URL**, com opção de legenda.

**API:** Básica

### Endpoint

```
https://api.chatmasterveloz.com/api/messages/sendURLVideo
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
    "body": "https://suite.chatmasterveloz.com/api/video.mp4",
    "caption": "Teste de Caption"
  }
```

➡️ **“number”:** telefone do destinatário no formato ddi ddd numero (somente números).

➡️ **“body”:** URL do arquivo.

➡️ **“caption”:** legenda exibida junto do arquivo.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X POST 'https://api.chatmasterveloz.com/api/messages/sendURLVideo' \
  -H 'Authorization: Bearer {seutokenaqui}' \
  -H 'Content-Type: application/json' \
  --data '{"number":"5511955892164","body":"https://suite.chatmasterveloz.com/api/video.mp4","caption":"Teste de Caption"}'
```
