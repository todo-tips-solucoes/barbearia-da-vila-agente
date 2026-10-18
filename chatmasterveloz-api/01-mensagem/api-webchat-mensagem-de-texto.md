---
title: "API WebChat Mensagem de Texto"
slug: api-webchat-mensagem-de-texto
category: "Mensagem"
plan: Webchat
method: POST
endpoint: https://api.chatmasterveloz.com/api/webchat/messages/send
source: https://clihelper.chatmasterveloz.com/docs/api-webchat-mensagem-de-texto
fetched: 2026-10-14
---
# API WebChat Mensagem de Texto  `Webchat`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-webchat-mensagem-de-texto> · [Voltar ao índice](../README.md)

🧩 Enviar uma **mensagem de texto** para um visitante ativo no widget WebChat, identificado pelo **sessionId**.

**API:** WebChat

### Endpoint

```
https://api.chatmasterveloz.com/api/webchat/messages/send
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
  "sessionId": "session_1745772400000_abc123",
  "body": "Olá! Em que posso te ajudar?"
}
```

➡️ **“sessionId”:** identificador único da sessão do visitante no widget. É gerado pelo widget e pode ser obtido via webhook, pela mensagem-marcador do ticket ou pela página de visitantes ao vivo.

➡️ **“body”:** conteúdo da mensagem que será entregue ao visitante em tempo real.

⚠️ O ticket precisa estar **aberto** ou **pendente**. Tickets fechados não recebem mensagens.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X POST 'https://api.chatmasterveloz.com/api/webchat/messages/send' \
  -H 'Authorization: Bearer {seutokenaqui}' \
  -H 'Content-Type: application/json' \
  --data '{"sessionId":"session_1745772400000_abc123","body":"Olá! Em que posso te ajudar?"}'
```
