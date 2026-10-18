---
title: "API Digitando…"
slug: api-digitando
category: "Mensagem"
plan: Básica
method: POST
endpoint: https://api.chatmasterveloz.com/api/messages/isTyping
source: https://clihelper.chatmasterveloz.com/docs/api-digitando
fetched: 2026-10-14
---
# API Digitando…  `Básica`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-digitando> · [Voltar ao índice](../README.md)

🧩 Altera o status para **Digitando...** por um tempo definido.

**API:** Básica

### Endpoint

```
https://api.chatmasterveloz.com/api/messages/isTyping
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
curl -X POST 'https://api.chatmasterveloz.com/api/messages/isTyping' \
  -H 'Authorization: Bearer {seutokenaqui}' \
  -H 'Content-Type: application/json' \
  --data '{"number":"5511955892164","tempo":5000}'
```
