---
title: "API Chat Externo Enviar Link"
slug: api-chat-externo-enviar-link
category: "Mensagem"
plan: Oficial
method: POST
endpoint: https://api.chatmasterveloz.com/api/chat-externo/enviar-link
source: https://clihelper.chatmasterveloz.com/docs/api-chat-externo-enviar-link
fetched: 2026-10-14
---
# API Chat Externo Enviar Link  `Oficial`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-chat-externo-enviar-link> · [Voltar ao índice](../README.md)

🧩 Envia ao cliente, **pelo canal do atendimento**, o **link** da página do Chat Externo.

**API:** Oficial

### Endpoint

```
https://api.chatmasterveloz.com/api/chat-externo/enviar-link
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
    "mensagem": "Continue a conversa pelo navegador: {link}",
    "textoDoBotao": "Abrir chat"
}
```

➡️ **“ticketId”:** ID do Ticket. **Obrigatório.**

◽ É o número entre parênteses no cabeçalho da conversa. Em **João da Silva (52) | #25678**, o ticketId é o **52**.

➡️ **“mensagem”:** opcional. Texto que acompanha o link. Escreva `{link}` onde o endereço deve entrar; sem o marcador, o link vai no fim.

◽ Sem este campo vale o texto cadastrado na conexão e, na falta dele, o padrão do sistema.

➡️ **“textoDoBotao”:** opcional. Rótulo do botão, até 20 caracteres.

◽ Sem este campo vale o rótulo cadastrado na conexão e, na falta dele, **Abrir chat**.

⚠️ **A conexão do atendimento precisa estar em Modo Alternativo (Chat Externo por Link).** Fora dele a mensagem é enviada, mas o cliente recebe um link que responde erro ao abrir.

◽ O link dá acesso à conversa — trate como segredo.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X POST 'https://api.chatmasterveloz.com/api/chat-externo/enviar-link' \
  -H 'Authorization: Bearer {seutokenaqui}' \
  -H 'Content-Type: application/json' \
  --data '{"ticketId":700,"mensagem":"Continue a conversa pelo navegador: {link}","textoDoBotao":"Abrir chat"}'
```
