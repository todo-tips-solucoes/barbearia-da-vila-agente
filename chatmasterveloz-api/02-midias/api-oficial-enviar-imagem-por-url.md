---
title: "API Oficial Enviar Imagem por URL"
slug: api-oficial-enviar-imagem-por-url
category: "Mídias"
plan: Oficial
method: POST
endpoint: https://api.chatmasterveloz.com/api/messages/official/sendMediaByURL
source: https://clihelper.chatmasterveloz.com/docs/api-oficial-enviar-imagem-por-url
fetched: 2026-10-14
---
# API Oficial Enviar Imagem por URL  `Oficial`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-oficial-enviar-imagem-por-url> · [Voltar ao índice](../README.md)

🧩 Envia uma **imagem a partir de uma URL**, estando com a Janela de Atendimento ao Cliente **aberta**.

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
  "type": "image",
  "caption": "Aqui vai minha legenda",
  "fileName": "algumnome.jpeg",
  "body": "https://suite.chatmasterveloz.com/api/image.jpg"
}
```

➡️ **“number”:** telefone do destinatário no formato ddi ddd numero (somente números).

➡️ **“type”:** `image`.

➡️ **“caption”:** legenda exibida junto do arquivo.

➡️ **“fileName”:** nome do arquivo.

➡️ **“body”:** URL do arquivo.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X POST 'https://api.chatmasterveloz.com/api/messages/official/sendMediaByURL' \
  -H 'Authorization: Bearer {seutokenaqui}' \
  -H 'Content-Type: application/json' \
  --data '{"number":"5511955892164","type":"image","caption":"Aqui vai minha legenda","fileName":"algumnome.jpeg","body":"https://suite.chatmasterveloz.com/api/image.jpg"}'
```
