---
title: "API Buscar Tickets por Filtro"
slug: api-buscar-tickets-por-filtro
category: "Ticket"
plan: Todas
method: POST
endpoint: https://api.chatmasterveloz.com/api/tickets/search
source: https://clihelper.chatmasterveloz.com/docs/api-buscar-tickets-por-filtro
fetched: 2026-10-14
---
# API Buscar Tickets por Filtro  `Todas`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-buscar-tickets-por-filtro> · [Voltar ao índice](../README.md)

🧩 Obter a **lista de atendimentos** que casam com um filtro de tags, situação, Setor e tempo parado.

**API:** Todas

### Endpoint

```
https://api.chatmasterveloz.com/api/tickets/search
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
    "tagIds": [3, 8],
    "statuses": ["open", "pending"],
    "queueIds": [4],
    "connectionId": 3,
    "updatedBeforeMinutes": 60,
    "limit": 50
}
```

➡️ **“tagIds”:** ids das tags. O atendimento entra se tiver **qualquer** uma delas. Aceita também `"3,8"`.

➡️ **“statuses”:** situação do atendimento — `open`, `pending` ou `closed`. Aceita também `"open,pending"`.

➡️ **“queueIds”:** ids dos Setores. Aceita também `"4,5"`.

➡️ **“connectionId”:** id da conexão. Traz só os atendimentos dela.

➡️ **“updatedBeforeMinutes”:** só os atendimentos parados há mais de X minutos.

◽ Conta como movimento qualquer mensagem e qualquer troca de situação, de Setor ou de operador.

➡️ **“limit”:** quantos atendimentos trazer. Padrão `50`, teto `200`.

➡️ **“offset”:** opcional. De qual atendimento começar, para paginar.

◽ Todos os campos são opcionais: sem filtro nenhum, vêm os atendimentos da empresa.

◽ A lista vem com os parados há mais tempo primeiro.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X POST 'https://api.chatmasterveloz.com/api/tickets/search' \
  -H 'Authorization: Bearer {seutokenaqui}' \
  -H 'Content-Type: application/json' \
  --data '{"tagIds":[3,8],"statuses":["open","pending"],"queueIds":[4],"connectionId":3,"updatedBeforeMinutes":60,"limit":50}'
```
