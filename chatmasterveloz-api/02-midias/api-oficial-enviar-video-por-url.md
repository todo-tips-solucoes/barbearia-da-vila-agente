---
title: "API Oficial Enviar Vídeo por URL"
slug: api-oficial-enviar-video-por-url
category: "Mídias"
plan: Oficial
method: POST
endpoint: https://api.chatmasterveloz.com/api/messages/official/sendMediaByURL
source: https://clihelper.chatmasterveloz.com/docs/api-oficial-enviar-video-por-url
fetched: 2026-10-14
---
# API Oficial Enviar Vídeo por URL  `Oficial`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-oficial-enviar-video-por-url> · [Voltar ao índice](../README.md)

🧩 Envia um **vídeo a partir de uma URL**, estando com a Janela de Atendimento ao Cliente **aberta**.

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
  "type": "video",
  "caption": "Aqui vai minha legenda",
  "fileName": "algumnome.mp4",
  "body": "https://suite.chatmasterveloz.com/api/video.mp4"
}
```

➡️ **“number”:** telefone do destinatário no formato ddi ddd numero (somente números).

➡️ **“type”:** `video`.

➡️ **“caption”:** legenda exibida junto do arquivo.

➡️ **“fileName”:** nome do arquivo.

➡️ **“body”:** URL do arquivo.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X POST 'https://api.chatmasterveloz.com/api/messages/official/sendMediaByURL' \
  -H 'Authorization: Bearer {seutokenaqui}' \
  -H 'Content-Type: application/json' \
  --data '{"number":"5511955892164","type":"video","caption":"Aqui vai minha legenda","fileName":"algumnome.mp4","body":"https://suite.chatmasterveloz.com/api/video.mp4"}'
```
