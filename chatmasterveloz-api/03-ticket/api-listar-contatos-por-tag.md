---
title: "API Listar Tickets por Tag"
slug: api-listar-contatos-por-tag
category: "Ticket"
plan: Todas
method: GET
endpoint: https://api.chatmasterveloz.com/api/contacts/findbytag
source: https://clihelper.chatmasterveloz.com/docs/api-listar-contatos-por-tag
fetched: 2026-10-14
---
# API Listar Tickets por Tag  `Todas`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-listar-contatos-por-tag> · [Voltar ao índice](../README.md)

🧩 Listar os **Tickets** que têm uma tag.

**API:** Todas

### Endpoint

```
https://api.chatmasterveloz.com/api/contacts/findbytag
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

```json
{
    "tagid":"56"
}
```

➡️ **“tagid”:** ID da Tag. **Obrigatório.**

◽ Para mais de uma, use uma lista: `"tagid": [56,47]`. O Ticket entra se tiver **qualquer** uma delas.

⚠️ **Sem o `tagid`, a chamada devolve TODOS os Tickets da empresa** — sem páginas e sem teto. Numa base grande, é uma resposta enorme de uma vez só.

◽ A tag é procurada em três lugares: a tag posta no Ticket, a tag de **Encerramento** escolhida ao encerrar e a tag de **CRM** da oportunidade ligada ao Ticket.

◽ Cada Ticket vem com o contato, o Setor, o operador, a conexão e as tags dele.

◽ Oportunidade que não está ligada a Ticket nenhum não aparece nesta lista.

◽ A lista vem inteira, do Ticket mexido mais recentemente para o mais antigo.

◽ Repare que é um `GET` que lê o filtro no **corpo**, e não na URL.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X GET 'https://api.chatmasterveloz.com/api/contacts/findbytag' \
  -H 'Authorization: Bearer {seutokenaqui}' \
  -H 'Content-Type: application/json' \
  --data '{"tagid":"56"}'
```
