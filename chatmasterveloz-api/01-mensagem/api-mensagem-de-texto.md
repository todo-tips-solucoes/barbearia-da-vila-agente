---
title: "API Mensagem de Texto"
slug: api-mensagem-de-texto
category: "Mensagem"
plan: Básica
method: POST
endpoint: https://api.chatmasterveloz.com/api/messages/send
source: https://clihelper.chatmasterveloz.com/docs/api-mensagem-de-texto
fetched: 2026-10-14
---
# API Mensagem de Texto  `Básica`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-mensagem-de-texto> · [Voltar ao índice](../README.md)

🧩 Envia uma **mensagem de texto**, com opções de abrir um ticket e atribuir a conversa a um Setor.

**API:** Básica, Pro

### Endpoint

```
https://api.chatmasterveloz.com/api/messages/send
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
    "openTicket": "1",
    "queueId": "16",
    "body": "Bem vindo Lead"
  }
```

➡️ **“number”:** telefone do destinatário no formato ddi ddd numero (somente números).

➡️ **“openTicket”:** `0` não abre ticket e `1` abre. Para abrir é obrigatório informar um Setor em `queueId`, e a conversa vai para **Aguardando** mesmo que já esteja em atendimento.

➡️ **“queueId”:** ID do Setor desejado (só funciona quando `"openTicket": "1"`).

➡️ **“body”:** mensagem.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X POST 'https://api.chatmasterveloz.com/api/messages/send' \
  -H 'Authorization: Bearer {seutokenaqui}' \
  -H 'Content-Type: application/json' \
  --data '{"number":"5511955892164","openTicket":"1","queueId":"16","body":"Bem vindo Lead"}'
```
