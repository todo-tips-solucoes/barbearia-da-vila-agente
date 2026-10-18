---
title: "API Listar Figurinhas"
slug: api-listar-figurinhas
category: "Mensagem"
plan: Todas
method: GET
endpoint: https://api.chatmasterveloz.com/api/figurinhas
source: https://clihelper.chatmasterveloz.com/docs/api-listar-figurinhas
fetched: 2026-10-14
---
# API Listar Figurinhas  `Todas`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-listar-figurinhas> · [Voltar ao índice](../README.md)

🧩 Listar a **biblioteca de figurinhas** da empresa, com as pastas e o ID de cada figurinha.

**API:** Todas

### Endpoint

```
https://api.chatmasterveloz.com/api/figurinhas
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

```
// sem payload
```

➡️ Esta chamada não tem payload.

◽ A resposta traz as pastas cadastradas na tela **Figurinhas** e, dentro de cada uma, as figurinhas com o `id` que o envio usa.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X GET 'https://api.chatmasterveloz.com/api/figurinhas' \
  -H 'Authorization: Bearer {seutokenaqui}'
```
