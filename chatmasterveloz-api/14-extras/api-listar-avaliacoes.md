---
title: "API Listar Avaliações"
slug: api-listar-avaliacoes
category: "Extras"
plan: Todas
method: GET
endpoint: https://api.chatmasterveloz.com/api/ratings?dateStart=2026-09-01&dateEnd=2026-09-30&pageNumber=1&pageSize=20
source: https://clihelper.chatmasterveloz.com/docs/api-listar-avaliacoes
fetched: 2026-10-14
---
# API Listar Avaliações  `Todas`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-listar-avaliacoes> · [Voltar ao índice](../README.md)

🧩 Listar as **respostas das pesquisas de satisfação**, com as estatísticas do período.

**API:** Todas

### Endpoint

```
https://api.chatmasterveloz.com/api/ratings?dateStart=2026-09-01&dateEnd=2026-09-30&pageNumber=1&pageSize=20
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

➡️ Esta chamada não tem payload. Os filtros são informados como **query** na URL, por exemplo `?dateStart=2026-09-01&userId=31`.

◽ **“dateStart”** e **“dateEnd”:** período, no formato `AAAA-MM-DD`, incluindo o dia inteiro.

◽ **“searchParam”:** busca por nome ou número do contato, ou por nome do operador.

◽ **“ratingId”:** só as respostas de um modelo de pesquisa.

◽ **“userId”:** só as respostas dos atendimentos de um operador.

◽ **“queueId”:** só as respostas dos atendimentos de um Setor.

◽ **“pageNumber”** e **“pageSize”:** página e quantos itens por página. Padrão `1` e `20`; o teto é `200`.

◽ Cada resposta vem com a nota, a opção marcada, o atendimento com o contato e o Setor, o operador e o modelo de pesquisa.

◽ A lista vem das mais recentes para as mais antigas, e acompanha as estatísticas do recorte: total, média das notas e quantas respostas por opção.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X GET 'https://api.chatmasterveloz.com/api/ratings?dateStart=2026-09-01&dateEnd=2026-09-30&pageNumber=1&pageSize=20' \
  -H 'Authorization: Bearer {seutokenaqui}'
```
