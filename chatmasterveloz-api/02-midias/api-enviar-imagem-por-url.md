---
title: "API Enviar Imagem por URL"
slug: api-enviar-imagem-por-url
category: "Mídias"
plan: Básica
method: POST
endpoint: https://api.chatmasterveloz.com/api/messages/sendURLImage
source: https://clihelper.chatmasterveloz.com/docs/api-enviar-imagem-por-url
fetched: 2026-10-14
---
# API Enviar Imagem por URL  `Básica`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-enviar-imagem-por-url> · [Voltar ao índice](../README.md)

🧩 Envia uma **imagem a partir de uma URL**, com opção de legenda.

**API:** Básica

### Endpoint

```
https://api.chatmasterveloz.com/api/messages/sendURLImage
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
    "body": "https://suite.chatmasterveloz.com/api/image.jpg",
    "mimeType": "image/jpeg",
    "caption": "teste de caption"
  }
```

➡️ **“number”:** telefone do destinatário no formato ddi ddd numero (somente números).

➡️ **“body”:** URL do arquivo.

➡️ **“mimeType”:** tipo do arquivo no formato MIME — aqui `image/jpeg`.

➡️ **“caption”:** legenda exibida junto do arquivo.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X POST 'https://api.chatmasterveloz.com/api/messages/sendURLImage' \
  -H 'Authorization: Bearer {seutokenaqui}' \
  -H 'Content-Type: application/json' \
  --data '{"number":"5511955892164","body":"https://suite.chatmasterveloz.com/api/image.jpg","mimeType":"image/jpeg","caption":"teste de caption"}'
```
