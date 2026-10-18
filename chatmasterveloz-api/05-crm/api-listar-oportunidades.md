---
title: "API Listar Oportunidades"
slug: api-listar-oportunidades
category: "CRM"
plan: Todas
method: GET
endpoint: https://api.chatmasterveloz.com/api/crm/v2/oportunidades?status=OPEN&pageNumber=1&pageSize=20
source: https://clihelper.chatmasterveloz.com/docs/api-listar-oportunidades
fetched: 2026-10-14
---
# API Listar Oportunidades  `Todas`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-listar-oportunidades> · [Voltar ao índice](../README.md)

🧩 Listar **oportunidades** do CRM, com filtros e páginas.

**API:** Todas

### Endpoint

```
https://api.chatmasterveloz.com/api/crm/v2/oportunidades?status=OPEN&pageNumber=1&pageSize=20
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
// sem payload — os filtros vão na própria URL
```

➡️ Esta chamada não tem payload. Os filtros são informados como **query** na URL, por exemplo `?pipelineId=7&status=OPEN`.

◽ **“pipelineId”:** só as de um funil. **“laneId”:** só as de uma raia.

◽ **“userId”:** só as de um responsável. **“contactId”:** só as de um contato.

◽ **“status”:** `OPEN`, `WON` ou `LOST`. Aceita minúsculas.

◽ **“dataInicial”** e **“dataFinal”:** cortam pela **data de criação**, no formato `AAAA-MM-DD`; o fim inclui o dia inteiro. Outro formato responde erro.

◽ **“searchParam”:** procura no título, no produto, nas observações e no nome e número do contato.

◽ **“pageNumber”** e **“pageSize”:** página e quantos por página. Padrão `1` e `20`; o teto é `100`.

◽ A lista traz a empresa inteira. Para recortar por operador, use o `userId` — a chamada não tem usuário por trás.

◽ Cada linha vem com o contato, o atendimento, o responsável, o funil, a raia, o motivo de perda e a origem. As **etiquetas não vêm aqui**: elas aparecem quando você consulta uma oportunidade pelo id.

◽ A ordem é do id mais novo para o mais antigo, estável para sincronização.

⚠️ **A empresa precisa estar com o CRM novo ativado.**

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X GET 'https://api.chatmasterveloz.com/api/crm/v2/oportunidades?status=OPEN&pageNumber=1&pageSize=20' \
  -H 'Authorization: Bearer {seutokenaqui}'
```
