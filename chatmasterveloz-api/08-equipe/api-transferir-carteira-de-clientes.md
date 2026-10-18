---
title: "API Transferir Carteira de Clientes"
slug: api-transferir-carteira-de-clientes
category: "Equipe"
plan: Todas
method: POST
endpoint: https://api.chatmasterveloz.com/api/contacts/changecarteira
source: https://clihelper.chatmasterveloz.com/docs/api-transferir-carteira-de-clientes
fetched: 2026-10-14
---
# API Transferir Carteira de Clientes  `Todas`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-transferir-carteira-de-clientes> · [Voltar ao índice](../README.md)

🧩 Transfere toda a **Carteira de Clientes** de um membro da Equipe para outro.

**API:** Todas

### Endpoint

```
https://api.chatmasterveloz.com/api/contacts/changecarteira
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
    "OLD_carteiraId":39,
    "NEW_carteiraId":40
  }
```

➡️ **“OLD_carteiraId”:** ID do usuário da Equipe que entrega a carteira. **Obrigatório.**

➡️ **“NEW_carteiraId”:** ID do usuário da Equipe que recebe a carteira. **Obrigatório.**

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X POST 'https://api.chatmasterveloz.com/api/contacts/changecarteira' \
  -H 'Authorization: Bearer {seutokenaqui}' \
  -H 'Content-Type: application/json' \
  --data '{"OLD_carteiraId":39,"NEW_carteiraId":40}'
```
