---
title: "API Enviar Documento por URL"
slug: api-enviar-documento-por-url
category: "Mídias"
plan: Básica
method: POST
endpoint: https://api.chatmasterveloz.com/api/messages/sendURLDocument
source: https://clihelper.chatmasterveloz.com/docs/api-enviar-documento-por-url
fetched: 2026-10-14
---
# API Enviar Documento por URL  `Básica`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-enviar-documento-por-url> · [Voltar ao índice](../README.md)

🧩 Envia um **documento a partir de uma URL**, com opção de legenda.

**API:** Básica

### Endpoint

```
https://api.chatmasterveloz.com/api/messages/sendURLDocument
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
    "body": "https://suite.chatmasterveloz.com/api/document.pdf",
    "fileName": "TESTE DE NOME",
    "mimeType": "application/pdf",
    "caption": "Caption"
  }
```

➡️ **“number”:** telefone do destinatário no formato ddi ddd numero (somente números).

➡️ **“body”:** URL do arquivo.

➡️ **“fileName”:** nome do arquivo.

➡️ **“mimeType”:** tipo do arquivo no formato MIME — aqui `application/pdf`.

➡️ **“caption”:** legenda exibida junto do arquivo.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X POST 'https://api.chatmasterveloz.com/api/messages/sendURLDocument' \
  -H 'Authorization: Bearer {seutokenaqui}' \
  -H 'Content-Type: application/json' \
  --data '{"number":"5511955892164","body":"https://suite.chatmasterveloz.com/api/document.pdf","fileName":"TESTE DE NOME","mimeType":"application/pdf","caption":"Caption"}'
```
