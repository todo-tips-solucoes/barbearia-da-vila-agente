---
title: "API Encerrar Tickets por \"Dias de Inatividade\""
slug: api-encerrar-tickets-por-dias-de-inatividade
category: "Ticket"
plan: Todas
method: POST
endpoint: https://api.chatmasterveloz.com/api/tickets/closeforced
source: https://clihelper.chatmasterveloz.com/docs/api-encerrar-tickets-por-dias-de-inatividade
fetched: 2026-10-14
---
# API Encerrar Tickets por "Dias de Inatividade"  `Todas`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-encerrar-tickets-por-dias-de-inatividade> · [Voltar ao índice](../README.md)

🧩 Encerra **todos os tickets sem atividade** há um número de dias que você define, alterando o status deles.

**API:** Todas

São **dois endereços**: um encerra os tickets da **conexão atual**, outro encerra os de **todas as conexões** da empresa.

### Endpoint A — encerra os tickets apenas da conexão atual

```
https://api.chatmasterveloz.com/api/tickets/closeforced
```

### Endpoint B — encerra os tickets de todas as conexões da empresa

```
https://api.chatmasterveloz.com/api/tickets/closeforcedAll
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
    "days":10
}
```

➡️ **“days”:** quantidade de dias sem atividade.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X POST 'https://api.chatmasterveloz.com/api/tickets/closeforced' \
  -H 'Authorization: Bearer {seutokenaqui}' \
  -H 'Content-Type: application/json' \
  --data '{"days":10}'
```
