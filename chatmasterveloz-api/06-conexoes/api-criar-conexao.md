---
title: "API Criar Conexão"
slug: api-criar-conexao
category: "Conexões"
plan: Pro
method: POST
endpoint: https://api.chatmasterveloz.com/api/nova-conexao
source: https://clihelper.chatmasterveloz.com/docs/api-criar-conexao
fetched: 2026-10-14
---
# API Criar Conexão  `Pro`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-criar-conexao> · [Voltar ao índice](../README.md)

🧩 Cria **uma nova conexão** na sua empresa.

**API:** Pro

### Endpoint

```
https://api.chatmasterveloz.com/api/nova-conexao
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
    "name": "principal",
    "isDefault": false,
    "token": "tokenaleatorio213",
    "webhook": null,
    "webhookb": null
  }
```

➡️ **“name”:** nome da conexão. **Obrigatório.**

➡️ **“isDefault”:** define se ela é a conexão padrão — `true` ou `false`. **Obrigatório.**

◽ O campo é exigido, mas não decide nada: só a primeira conexão da empresa nasce como padrão.

➡️ **“token”:** defina um token, ou deixe `""` para a plataforma gerar.

➡️ **“webhook”:** `null`, ou a URL do seu webhook.

➡️ **“webhookb”:** `null`, ou a URL do seu webhook secundário.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X POST 'https://api.chatmasterveloz.com/api/nova-conexao' \
  -H 'Authorization: Bearer {seutokenaqui}' \
  -H 'Content-Type: application/json' \
  --data '{"name":"principal","isDefault":false,"token":"tokenaleatorio213","webhook":null,"webhookb":null}'
```
