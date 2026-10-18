---
title: "API Status das Conexões"
slug: api-status-das-conexoes
category: "Conexões"
plan: Todas
method: POST
endpoint: https://api.chatmasterveloz.com/api/whatsapp-status
source: https://clihelper.chatmasterveloz.com/docs/api-status-das-conexoes
fetched: 2026-10-14
---
# API Status das Conexões  `Todas`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-status-das-conexoes> · [Voltar ao índice](../README.md)

🧩 Verifica o **status de todas as conexões** da empresa.

**API:** Todas

### Endpoint

```
https://api.chatmasterveloz.com/api/whatsapp-status
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

```
// sem payload
```

➡️ Esta chamada não tem payload.

◽ A resposta traz **todas as conexões da empresa** dona do token — não só a conexão usada na chamada.

◽ Cada conexão vem com o nome, o canal, o status e as mensagens automáticas configuradas nela.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X POST 'https://api.chatmasterveloz.com/api/whatsapp-status' \
  -H 'Authorization: Bearer {seutokenaqui}'
```
