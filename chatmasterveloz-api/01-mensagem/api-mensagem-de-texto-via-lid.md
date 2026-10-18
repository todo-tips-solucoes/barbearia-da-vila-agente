---
title: "API Mensagem de Texto via LID"
slug: api-mensagem-de-texto-via-lid
category: "Mensagem"
plan: Pro
method: POST
endpoint: https://api.chatmasterveloz.com/api/messages/whatsmeow/sendTextPROLid
source: https://clihelper.chatmasterveloz.com/docs/api-mensagem-de-texto-via-lid
fetched: 2026-10-14
---
# API Mensagem de Texto via LID  `Pro`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-mensagem-de-texto-via-lid> · [Voltar ao índice](../README.md)

🧩 Envia uma **mensagem de texto via LID (em vez de número do telefone)**, com opções de abrir um ticket e atribuir a conversa a um Setor.

**API:** Pro

### Endpoint

```
https://api.chatmasterveloz.com/api/messages/whatsmeow/sendTextPROLid
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
    "number": "903280432480329@lid",
    "openTicket": "1",
    "queueId": "16",
    "body": "Bem vindo Lead"
  }
```

➡️ **“number”:** LID do destinatário.

➡️ **“openTicket”:** `0` não abre ticket e `1` abre. Para abrir é obrigatório informar um Setor em `queueId`, e a conversa vai para **Aguardando** mesmo que já esteja em atendimento.

➡️ **“queueId”:** ID do Setor desejado (só funciona quando `"openTicket": "1"`).

➡️ **“body”:** mensagem.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X POST 'https://api.chatmasterveloz.com/api/messages/whatsmeow/sendTextPROLid' \
  -H 'Authorization: Bearer {seutokenaqui}' \
  -H 'Content-Type: application/json' \
  --data '{"number":"903280432480329@lid","openTicket":"1","queueId":"16","body":"Bem vindo Lead"}'
```
