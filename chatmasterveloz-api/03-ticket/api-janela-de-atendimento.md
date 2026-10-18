---
title: "API Janela de Atendimento"
slug: api-janela-de-atendimento
category: "Ticket"
plan: Todas
method: GET
endpoint: https://api.chatmasterveloz.com/api/tickets/{ticketId}/janela
source: https://clihelper.chatmasterveloz.com/docs/api-janela-de-atendimento
fetched: 2026-10-14
---
# API Janela de Atendimento  `Todas`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-janela-de-atendimento> · [Voltar ao índice](../README.md)

🧩 Obter em que ponto da **janela de atendimento** está um atendimento.

**API:** Todas

### Endpoint

```
https://api.chatmasterveloz.com/api/tickets/{ticketId}/janela
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
// sem payload — o ticketId vai no endereço
```

➡️ **“ticketId”:** ID do Ticket — vai no próprio endereço, no lugar de `{ticketId}`. **Obrigatório.**

◽ É o número entre parênteses no cabeçalho da conversa. Em **João da Silva (52) | #25678**, o ticketId é o **52**.

◽ O **25678** é o protocolo, e não serve nesta chamada.

◽ A resposta diz se a janela está **aberta**, quanto tempo falta para ela fechar e se o envio exige mensagem de template.

◽ A regra muda por canal: na API oficial são 24 horas contadas da última mensagem **do cliente**; no Messenger e no Instagram são 24 horas livres e mais alguns dias só com atendimento humano; nos demais canais não existe janela, e a resposta vem sempre aberta.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X GET 'https://api.chatmasterveloz.com/api/tickets/{ticketId}/janela' \
  -H 'Authorization: Bearer {seutokenaqui}'
```
