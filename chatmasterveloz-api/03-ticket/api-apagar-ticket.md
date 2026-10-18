---
title: "API Apagar Ticket"
slug: api-apagar-ticket
category: "Ticket"
plan: Todas
method: DELETE
endpoint: https://api.chatmasterveloz.com/api/tickets/{ticketId}
source: https://clihelper.chatmasterveloz.com/docs/api-apagar-ticket
fetched: 2026-10-14
---
# API Apagar Ticket  `Todas`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-apagar-ticket> · [Voltar ao índice](../README.md)

🧩 Apaga um **atendimento inteiro**, com as mensagens.

**API:** Todas

### Endpoint

```
https://api.chatmasterveloz.com/api/tickets/{ticketId}
```

### Método

```
DELETE
```

### Autenticação

```
Bearer {seutokenaqui}
```

### Payload

```
// sem payload — o ticketId vai no endereço
```

➡️ **“ticketId”:** ID do Ticket — vai no próprio endereço, no lugar de `{ticketId}`. **Obrigatório.**

◽ É o número entre parênteses no cabeçalho da conversa. Em **João da Silva (52) | #25678**, o ticketId é o **52**.

◽ O **25678** é o protocolo, e não serve nesta chamada.

◽ Antes de apagar, o atendimento é encerrado — é o que tira a linha das telas que estão abertas.

⚠️ **Não há como desfazer.** As mensagens do atendimento são apagadas junto, e não existe lixeira.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X DELETE 'https://api.chatmasterveloz.com/api/tickets/{ticketId}' \
  -H 'Authorization: Bearer {seutokenaqui}'
```
