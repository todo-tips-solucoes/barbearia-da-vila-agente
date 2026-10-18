---
title: "API Relatório de Anúncios"
slug: api-relatorio-de-anuncios
category: "CRM"
plan: Todas
method: GET
endpoint: https://api.chatmasterveloz.com/api/anuncios?dataInicio=2026-09-01&dataFim=2026-09-30
source: https://clihelper.chatmasterveloz.com/docs/api-relatorio-de-anuncios
fetched: 2026-10-14
---
# API Relatório de Anúncios  `Todas`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-relatorio-de-anuncios> · [Voltar ao índice](../README.md)

🧩 Listar, **por anúncio**, quantos leads entraram e quantos viraram venda.

**API:** Todas

### Endpoint

```
https://api.chatmasterveloz.com/api/anuncios?dataInicio=2026-09-01&dataFim=2026-09-30
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

➡️ Esta chamada não tem payload. Os filtros são informados como **query** na URL, por exemplo `?dataInicio=2026-09-01&dataFim=2026-09-30`.

◽ **“dataInicio”:** início do período, no formato `AAAA-MM-DD`. Sem as duas datas, valem os últimos 30 dias.

◽ **“dataFim”:** fim do período, no formato `AAAA-MM-DD`, incluindo o dia inteiro.

◽ O anúncio é o **Click-to-WhatsApp da Meta**, reconhecido no primeiro contato do lead.

◽ O período filtra a **chegada do lead**. A venda dele entra na conta mesmo que tenha sido fechada depois do período.

◽ Venda é a oportunidade **ganha** no CRM.

◽ A consulta traz até 5000 leads. Acima disso a resposta avisa que veio cortada — estreite o período.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X GET 'https://api.chatmasterveloz.com/api/anuncios?dataInicio=2026-09-01&dataFim=2026-09-30' \
  -H 'Authorization: Bearer {seutokenaqui}'
```
