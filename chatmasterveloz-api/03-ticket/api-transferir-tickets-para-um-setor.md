---
title: "API Transferir Tickets para um Setor"
slug: api-transferir-tickets-para-um-setor
category: "Ticket"
plan: Todas
method: POST
endpoint: https://api.chatmasterveloz.com/api/tickets/changequeue
source: https://clihelper.chatmasterveloz.com/docs/api-transferir-tickets-para-um-setor
fetched: 2026-10-14
---
# API Transferir Tickets para um Setor  `Todas`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-transferir-tickets-para-um-setor> · [Voltar ao índice](../README.md)

🧩 Transfere **todos os atendimentos da conexão** para um Setor específico.

**API:** Todas

### Endpoint

```
https://api.chatmasterveloz.com/api/tickets/changequeue
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
    "NEW_queueId":94
  }
```

➡️ **“NEW_queueId”:** ID do Setor que vai receber os atendimentos. **Obrigatório.**

⚠️ **A chamada move TODOS os atendimentos da conexão do token** — em atendimento, aguardando e também os já encerrados, de qualquer Setor. Não existe filtro: não dá para transferir só os de um Setor.

◽ Não mexe no status nem no operador, e não manda nada ao cliente.

◽ Setor que não existe, ou que é de outra empresa, é recusado.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X POST 'https://api.chatmasterveloz.com/api/tickets/changequeue' \
  -H 'Authorization: Bearer {seutokenaqui}' \
  -H 'Content-Type: application/json' \
  --data '{"NEW_queueId":94}'
```
