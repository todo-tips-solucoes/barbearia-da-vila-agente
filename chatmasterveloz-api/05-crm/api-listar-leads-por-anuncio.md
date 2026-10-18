---
title: "API Listar Leads por Anúncio"
slug: api-listar-leads-por-anuncio
category: "CRM"
plan: Todas
method: GET
endpoint: https://api.chatmasterveloz.com/api/anuncios/leads?anuncioId=&dataInicio=2026-09-01&dataFim=2026-09-30
source: https://clihelper.chatmasterveloz.com/docs/api-listar-leads-por-anuncio
fetched: 2026-10-14
---
# API Listar Leads por Anúncio  `Todas`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-listar-leads-por-anuncio> · [Voltar ao índice](../README.md)

🧩 Listar **leads** que entraram por anúncio.

**API:** Todas

### Endpoint

```
https://api.chatmasterveloz.com/api/anuncios/leads?anuncioId=&dataInicio=2026-09-01&dataFim=2026-09-30
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

➡️ Esta chamada não tem payload. Os filtros são informados como **query** na URL, por exemplo `?anuncioId=120210000000000000&dataInicio=2026-09-01`.

◽ **“anuncioId”:** só os leads daquele anúncio. Com `__sem_id__` vêm os que chegaram sem identificação de anúncio.

◽ **“dataInicio”** e **“dataFim”:** período de entrada do lead, no formato `AAAA-MM-DD`. Sem as duas, valem os últimos 30 dias.

◽ Cada lead vem com o contato, a conexão e o atendimento que nasceram do clique, a data de entrada, as tags daquele atendimento e se converteu.

◽ A **origem** (Facebook, Instagram) só aparece quando o canal informa: o `whatsapp_whatsmeow_pro` informa, a API oficial não.

◽ Lead antigo pode vir sem conexão, porque ela só passou a ser gravada depois.

◽ A consulta traz até 500 leads. Acima disso a resposta avisa que veio cortada — estreite por anúncio e por período.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X GET 'https://api.chatmasterveloz.com/api/anuncios/leads?anuncioId=&dataInicio=2026-09-01&dataFim=2026-09-30' \
  -H 'Authorization: Bearer {seutokenaqui}'
```
