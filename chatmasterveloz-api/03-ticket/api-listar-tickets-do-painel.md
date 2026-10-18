---
title: "API Listar Tickets do Painel"
slug: api-listar-tickets-do-painel
category: "Ticket"
plan: Todas
method: GET
endpoint: https://api.chatmasterveloz.com/api/tickets/get
source: https://clihelper.chatmasterveloz.com/docs/api-listar-tickets-do-painel
fetched: 2026-10-14
---
# API Listar Tickets do Painel  `Todas`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-listar-tickets-do-painel> · [Voltar ao índice](../README.md)

🧩 Listar **tickets** com os mesmos filtros da tela do painel.

**API:** Todas

### Endpoint

```
https://api.chatmasterveloz.com/api/tickets/get
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
    "pageNumber": 1,
    "status": "open",
    "showAll": "true",
    "userId": [1,4],
    "queueIds": [3,16],
    "tags": [211,216],
    "date": null,
    "updatedAt": null,
    "searchParam": null
}
```

⚠️ Esta chamada é **GET com corpo**: existem bibliotecas e servidores intermediários que descartam o corpo de uma requisição GET sem avisar. Se a resposta vier ignorando os filtros que você mandou, é quase sempre isso — use um cliente que permita enviar corpo em GET.

➡️ **“pageNumber”:** número da página (cada página traz de 30 a 40 resultados). Na resposta, `"hasMore": true` indica que ainda há páginas adiante.

➡️ **“status”:** filtra pelo Status do Ticket — `open`, `pending` ou `closed`. O valor escolhido manda nos três campos seguintes:

◽ `open` — informe o(s) `userId` e o(s) `queueIds`; `tags` é opcional.

◽ `pending` — `userId` fica `null`; informe o(s) `queueIds`; `tags` é opcional.

◽ `closed` — nada é filtrado: `userId`, `queueIds` e `tags` ficam todos `null`.

➡️ **“showAll”:** `"true"` traz os tickets de **todos os operadores**, só pelos Setores de `queueIds`.

⚠️ **Informe o `queueIds` e mais um entre `showAll` e `userId`.** Sem essa dupla a consulta falha com erro de servidor, porque o filtro padrão é "os do operador `userId`, ou os pendentes, nos Setores `queueIds`".

➡️ **“userId”:** ID do atendente.

◽ `null` quando o status for `pending` ou `closed`.

◽ Ou os IDs em array — `[1,4]` — quando o status for `open`.

➡️ **“users”:** IDs dos atendentes, em array — filtro separado do `userId`.

◽ Vale a mesma regra das tags: o ticket precisa casar com **todos** os IDs enviados.

➡️ **“queueIds”:** IDs dos Setores.

◽ `null` para trazer somente os tickets **sem Setor**.

◽ Ou os IDs em array — `[3,16]` —, que traz os desses Setores **e também** os sem Setor.

➡️ **“tags”:** IDs das Tags.

◽ `null` para não filtrar por tag, ou seja, trazer todas.

◽ Ou os IDs em array: `[211,216]`.

⚠️ **Com mais de uma tag, o ticket precisa ter TODAS elas** para entrar na lista — e não qualquer uma.

➡️ **“date”:** data de criação do ticket. `null` ou no formato ANO-MES-DIA, como `2025-11-20`.

➡️ **“updatedAt”:** data da última mexida no ticket. `null` ou no formato ANO-MES-DIA, como `2027-10-16`.

⚠️ **O `date` e o `updatedAt` substituem os outros filtros.** Com um deles preenchido, o status, o Setor e o operador deixam de valer — sobram o dia, as `tags` e os operadores. Mandar tudo junto achando que está estreitando faz o contrário.

➡️ **“withUnreadMessages”:** `"true"` traz só os tickets com mensagem não lida. Exige o `userId` e usa os Setores desse operador.

◽ Este campo também substitui os demais filtros.

➡️ **“searchParam”:** o texto procurado. Procura no nome e no número do contato **e também dentro do corpo das mensagens**.

◽ Cada ticket vem com o contato — inclusive os **campos personalizados** —, o Setor, o operador, as tags e a conexão.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X GET 'https://api.chatmasterveloz.com/api/tickets/get' \
  -H 'Authorization: Bearer {seutokenaqui}' \
  -H 'Content-Type: application/json' \
  --data '{"pageNumber":1,"status":"open","showAll":"true","userId":[1,4],"queueIds":[3,16],"tags":[211,216],"date":null,"updatedAt":null,"searchParam":null}'
```
