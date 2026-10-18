---
title: "API Obter um Contato"
slug: api-obter-um-contato
category: "Contatos"
plan: Todas
method: GET
endpoint: https://api.chatmasterveloz.com/api/contacts/single
source: https://clihelper.chatmasterveloz.com/docs/api-obter-um-contato
fetched: 2026-10-14
---
# API Obter um Contato  `Todas`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-obter-um-contato> · [Voltar ao índice](../README.md)

🧩 Obtém as informações de um contato da sua empresa.

**API:** Todas

### Endpoint

```
https://api.chatmasterveloz.com/api/contacts/single
```

### Método

```
GET
```

### Autenticação

```
Bearer {seutokenaqui}
```

### Payload

```json
{
    "number": "5511955892164"
  }
```

➡️ **“number”:** telefone do contato no formato ddi ddd numero (somente números).

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X GET 'https://api.chatmasterveloz.com/api/contacts/single' \
  -H 'Authorization: Bearer {seutokenaqui}' \
  -H 'Content-Type: application/json' \
  --data '{"number":"5511955892164"}'
```
