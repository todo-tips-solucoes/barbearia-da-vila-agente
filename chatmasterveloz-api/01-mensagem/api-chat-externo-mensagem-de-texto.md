---
title: "API Chat Externo Mensagem de Texto"
slug: api-chat-externo-mensagem-de-texto
category: "Mensagem"
plan: Oficial
method: POST
endpoint: https://api.chatmasterveloz.com/api/chat-externo/mensagem
source: https://clihelper.chatmasterveloz.com/docs/api-chat-externo-mensagem-de-texto
fetched: 2026-10-14
---
# API Chat Externo Mensagem de Texto  `Oficial`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-chat-externo-mensagem-de-texto> · [Voltar ao índice](../README.md)

🧩 Envia uma **mensagem de texto** que aparece apenas no Chat Externo, sem sair pelo canal.

**API:** Oficial

### Endpoint

```
https://api.chatmasterveloz.com/api/chat-externo/mensagem
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
    "ticketId": 700,
    "body": "Continuamos por aqui. Em que posso ajudar?"
}
```

➡️ **“ticketId”:** ID do Ticket. **Obrigatório.**

◽ É o número entre parênteses no cabeçalho da conversa. Em **João da Silva (52) | #25678**, o ticketId é o **52**.

➡️ **“body”:** o texto. Não pode ficar vazio. **Obrigatório.**

⚠️ **A conexão do atendimento precisa estar em Modo Alternativo (Chat Externo por Link).** Fora dele a chamada é recusada, porque a mensagem não teria como chegar ao cliente.

◽ A mensagem aparece no painel do operador e na página do cliente, e **não sai** pelo WhatsApp.

◽ Não conta para a janela de atendimento.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X POST 'https://api.chatmasterveloz.com/api/chat-externo/mensagem' \
  -H 'Authorization: Bearer {seutokenaqui}' \
  -H 'Content-Type: application/json' \
  --data '{"ticketId":700,"body":"Continuamos por aqui. Em que posso ajudar?"}'
```
