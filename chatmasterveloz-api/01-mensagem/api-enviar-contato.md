---
title: "API Enviar Contato"
slug: api-enviar-contato
category: "Mensagem"
plan: Básica
method: POST
endpoint: https://api.chatmasterveloz.com/api/messages/sendContact
source: https://clihelper.chatmasterveloz.com/docs/api-enviar-contato
fetched: 2026-10-14
---
# API Enviar Contato  `Básica`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-enviar-contato> · [Voltar ao índice](../README.md)

🧩 Envia **um cartão de contato** para adicionar ou iniciar uma conversa.

**API:** Básica

### Endpoint

```
https://api.chatmasterveloz.com/api/messages/sendContact
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
  "body": "Nome do contato",
  "optionList": {
    "phone": "5511888888888",
    "company": "Empresa do contato",
    "address": "Endereço do contato, 999"
  }
}
```

➡️ **“number”:** telefone do destinatário no formato ddi ddd numero (somente números).

➡️ **“body”:** nome do contato.

➡️ **“optionList”:** dados extras sobre o contato, sendo que:

◽ `phone`: telefone.

◽ `company`: empresa.

◽ `address`: endereço.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X POST 'https://api.chatmasterveloz.com/api/messages/sendContact' \
  -H 'Authorization: Bearer {seutokenaqui}' \
  -H 'Content-Type: application/json' \
  --data '{"number":"5511955892164","body":"Nome do contato","optionList":{"phone":"5511888888888","company":"Empresa do contato","address":"Endereço do contato, 999"}}'
```
