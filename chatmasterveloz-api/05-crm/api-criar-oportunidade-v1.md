---
title: "API Criar Oportunidade V1"
slug: api-criar-oportunidade-v1
category: "CRM"
plan: Todas
method: POST
endpoint: https://api.chatmasterveloz.com/api/oportunidade
source: https://clihelper.chatmasterveloz.com/docs/api-criar-oportunidade-v1
fetched: 2026-10-14
---
# API Criar Oportunidade V1  `Todas`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-criar-oportunidade-v1> · [Voltar ao índice](../README.md)

🧩 Cria **uma oportunidade** em um ticket.

**API:** Todas

### Endpoint

```
https://api.chatmasterveloz.com/api/oportunidade
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
  "contactId": 123,
  "ticketId": 456,
  "userId": 1,
  "name": "Interesse VIP",
  "message": "Cliente interessado no plano VIP",
  "etapadofunil": "Negociação",
  "produto": "Plano Premium",
  "valor": "2500.00",
  "free1": "Indicação do site",
  "free2": "Contato via whatsapp",
  "free3": "Bot Inicial",
  "free4": "Vendedor Humano",
  "tagIds": [1, 3, 5]
}
```

➡️ **“contactId”:** ID do contato na plataforma.

➡️ **“ticketId”:** ID do Ticket.

◽ É o número entre parênteses no cabeçalho da conversa. Em **João da Silva (52) | #25678**, o ticketId é o **52**.

◽ O **25678** é o protocolo, e não serve nesta chamada.

➡️ **“userId”:** ID do atendente.

➡️ **“name”:** nome da oportunidade.

◽ Sem este campo, o título vira **Oportunidade** seguido do número do ticket.

➡️ **“message”:** informações adicionais sobre a oportunidade.

➡️ **“etapadofunil”:** nome da Etapa do Funil.

◽ Se o nome for o de uma etapa de **ganho**, a oportunidade já nasce marcada como ganha.

➡️ **“produto”:** nome do produto.

➡️ **“valor”:** valor em formato decimal, com os centavos depois do **ponto** — por exemplo, `2500.00`.

➡️ **“free1”:** informações do Campo Livre 1.

➡️ **“free2”:** informações do Campo Livre 2.

➡️ **“free3”:** informações do Campo Livre 3.

➡️ **“free4”:** informações do Campo Livre 4.

➡️ **“tagIds”:** array com os IDs das Tags de CRM.

◽ O produto do catálogo e a origem da venda não entram na criação — só na alteração.

⚠️ **A empresa precisa estar no CRM antigo.** Se já estiver no CRM novo, esta chamada é recusada — o registro não apareceria em quadro nenhum.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X POST 'https://api.chatmasterveloz.com/api/oportunidade' \
  -H 'Authorization: Bearer {seutokenaqui}' \
  -H 'Content-Type: application/json' \
  --data '{"contactId":123,"ticketId":456,"userId":1,"name":"Interesse VIP","message":"Cliente interessado no plano VIP","etapadofunil":"Negociação","produto":"Plano Premium","valor":"2500.00","free1":"Indicação do site","free2":"Contato via whatsapp","free3":"Bot Inicial","free4":"Vendedor Humano","tagIds":[1,3,5]}'
```
