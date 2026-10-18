---
title: "API Mensagem para Grupos"
slug: api-mensagem-para-grupos
category: "Mensagem"
plan: Básica
method: POST
endpoint: https://api.chatmasterveloz.com/api/messages/sendGroup
source: https://clihelper.chatmasterveloz.com/docs/api-mensagem-para-grupos
fetched: 2026-10-14
---
# API Mensagem para Grupos  `Básica`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-mensagem-para-grupos> · [Voltar ao índice](../README.md)

🧩 Envia uma **mensagem de texto para um Grupo**, com opções de abrir um ticket e atribuir a conversa a um Setor.

**API:** Básica

### Endpoint

```
https://api.chatmasterveloz.com/api/messages/sendGroup
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

```jsonc
{
    "number": "34324434543543212", //ID do grupo
    "openTicket": "1",
    "queueId": "23",
    "body": "Olá pessoal"
  }
```

➡️ **“number”:** ID do grupo, que fica no mesmo lugar do telefone em um ticket comum.

➡️ **“openTicket”:** `0` não abre ticket e `1` abre. Para abrir é obrigatório informar um Setor em `queueId`, e a conversa vai para **Aguardando** mesmo que já esteja em atendimento.

➡️ **“queueId”:** ID do Setor desejado (só funciona quando `"openTicket": "1"`).

➡️ **“body”:** mensagem.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X POST 'https://api.chatmasterveloz.com/api/messages/sendGroup' \
  -H 'Authorization: Bearer {seutokenaqui}' \
  -H 'Content-Type: application/json' \
  --data '{"number":"34324434543543212","openTicket":"1","queueId":"23","body":"Olá pessoal"}'
```
