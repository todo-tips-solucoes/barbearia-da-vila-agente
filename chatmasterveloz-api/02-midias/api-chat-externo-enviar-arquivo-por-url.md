---
title: "API Chat Externo Enviar Arquivo por URL"
slug: api-chat-externo-enviar-arquivo-por-url
category: "Mídias"
plan: Oficial
method: POST
endpoint: https://api.chatmasterveloz.com/api/chat-externo/midia
source: https://clihelper.chatmasterveloz.com/docs/api-chat-externo-enviar-arquivo-por-url
fetched: 2026-10-14
---
# API Chat Externo Enviar Arquivo por URL  `Oficial`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-chat-externo-enviar-arquivo-por-url> · [Voltar ao índice](../README.md)

🧩 Envia um **arquivo por URL** que aparece apenas no **Chat Externo**, sem sair pelo canal.

**API:** Oficial

### Endpoint

```
https://api.chatmasterveloz.com/api/chat-externo/midia
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
    "url": "https://arquivos.exemplo.com/proposta.pdf",
    "filename": "proposta.pdf",
    "body": "Segue a proposta"
}
```

➡️ **“ticketId”:** ID do Ticket. **Obrigatório.**

◽ É o número entre parênteses no cabeçalho da conversa. Em **João da Silva (52) | #25678**, o ticketId é o **52**.

➡️ **“url”:** endereço público do arquivo, em `http` ou `https`. **Obrigatório.**

◽ Endereço interno é recusado. O arquivo tem até 20 MB, e a plataforma espera até 30 segundos para baixá-lo.

➡️ **“filename”:** opcional. Nome com que o arquivo é gravado. Sem ele, vale o nome que estiver no fim da URL.

➡️ **“body”:** opcional. A legenda. Sem ela, vale o nome do arquivo.

◽ `caption` funciona como sinônimo de `body`.

⚠️ **A conexão do atendimento precisa estar em Modo Alternativo (Chat Externo por Link).** Fora dele a chamada é recusada, porque a mensagem não teria como chegar ao cliente.

◽ A mensagem aparece no painel do operador e na página do cliente, e **não sai** pelo WhatsApp.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X POST 'https://api.chatmasterveloz.com/api/chat-externo/midia' \
  -H 'Authorization: Bearer {seutokenaqui}' \
  -H 'Content-Type: application/json' \
  --data '{"ticketId":700,"url":"https://arquivos.exemplo.com/proposta.pdf","filename":"proposta.pdf","body":"Segue a proposta"}'
```
