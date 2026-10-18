---
title: "API Oficial Enviar Documento por URL"
slug: api-oficial-enviar-documento-por-url
category: "Mídias"
plan: Oficial
method: POST
endpoint: https://api.chatmasterveloz.com/api/messages/official/sendMediaByURL
source: https://clihelper.chatmasterveloz.com/docs/api-oficial-enviar-documento-por-url
fetched: 2026-10-14
---
# API Oficial Enviar Documento por URL  `Oficial`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-oficial-enviar-documento-por-url> · [Voltar ao índice](../README.md)

🧩 Envia um **documento a partir de uma URL**, estando com a Janela de Atendimento ao Cliente **aberta**.

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
  "type": "document",
  "caption": "Aqui vai minha legenda",
  "fileName": "algumnome.pdf",
  "body": "https://suite.chatmasterveloz.com/api/document.pdf"
}
```

➡️ **“number”:** telefone do destinatário no formato ddi ddd numero (somente números).

➡️ **“type”:** `document`.

➡️ **“caption”:** legenda exibida junto do arquivo.

➡️ **“fileName”:** nome do arquivo.

➡️ **“body”:** URL do arquivo.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X POST 'https://api.chatmasterveloz.com/api/messages/official/sendMediaByURL' \
  -H 'Authorization: Bearer {seutokenaqui}' \
  -H 'Content-Type: application/json' \
  --data '{"number":"5511955892164","type":"document","caption":"Aqui vai minha legenda","fileName":"algumnome.pdf","body":"https://suite.chatmasterveloz.com/api/document.pdf"}'
```
