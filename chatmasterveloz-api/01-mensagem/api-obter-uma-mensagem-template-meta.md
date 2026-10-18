---
title: "API Obter uma Mensagem Template Meta"
slug: api-obter-uma-mensagem-template-meta
category: "Mensagem"
plan: Oficial
method: GET
endpoint: https://api.chatmasterveloz.com/api/waba-templates/{id}
source: https://clihelper.chatmasterveloz.com/docs/api-obter-uma-mensagem-template-meta
fetched: 2026-10-14
---
# API Obter uma Mensagem Template Meta  `Oficial`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-obter-uma-mensagem-template-meta> · [Voltar ao índice](../README.md)

🧩 Obter **um template específico** — é por aqui que se acompanha a aprovação da Meta.

**API:** Oficial

### Endpoint

```
https://api.chatmasterveloz.com/api/waba-templates/{id}
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
// sem payload — o id vai no endereço
```

➡️ **“id”:** o id **local** do template, que vai no próprio endereço, no lugar de `{id}`. **Obrigatório.**

◽ É o `id` que vem na resposta da criação e na lista de templates — não o `apiTemplateId`, que é o id do template na Meta.

⚠️ **Não consulte em laço curto.** A análise da Meta leva de minutos a horas: uma consulta a cada poucos minutos resolve, e de segundo em segundo só gasta requisição.

⚠️ Volta **404** quando o template não é da conexão da chamada — a dona do token, quando se usa o token da Conexão, ou a informada quando se usa o Token da Empresa —, inclusive quando ele existe, mas em outra conexão.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X GET 'https://api.chatmasterveloz.com/api/waba-templates/{id}' \
  -H 'Authorization: Bearer {seutokenaqui}'
```
