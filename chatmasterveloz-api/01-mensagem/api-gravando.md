---
title: "API Gravando…"
slug: api-gravando
category: "Mensagem"
plan: Básica
method: POST
endpoint: https://api.chatmasterveloz.com/api/messages/isRecording
source: https://clihelper.chatmasterveloz.com/docs/api-gravando
fetched: 2026-10-14
---
# API Gravando…  `Básica`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-gravando> · [Voltar ao índice](../README.md)

🧩 Altera o status para **Gravando...** por um tempo definido.

**API:** Básica

### Endpoint

```
https://api.chatmasterveloz.com/api/messages/isRecording
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
    "tempo": 5000
  }
```

➡️ **“number”:** telefone do destinatário no formato ddi ddd numero (somente números).

➡️ **“tempo”:** somente número (1000 corresponde a 1 segundo).

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X POST 'https://api.chatmasterveloz.com/api/messages/isRecording' \
  -H 'Authorization: Bearer {seutokenaqui}' \
  -H 'Content-Type: application/json' \
  --data '{"number":"5511955892164","tempo":5000}'
```
