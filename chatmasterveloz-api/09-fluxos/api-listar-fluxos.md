---
title: "API Listar Fluxos"
slug: api-listar-fluxos
category: "Fluxos"
plan: Todas
method: GET
endpoint: https://api.chatmasterveloz.com/api/flowbuilder
source: https://clihelper.chatmasterveloz.com/docs/api-listar-fluxos
fetched: 2026-10-14
---
# API Listar Fluxos  `Todas`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-listar-fluxos> · [Voltar ao índice](../README.md)

🧩 Listar **fluxos** do Flowbuilder da empresa.

**API:** Todas

### Endpoint

```
https://api.chatmasterveloz.com/api/flowbuilder
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
// sem payload
```

➡️ Esta chamada não tem payload.

◽ Cada fluxo vem com o id, o nome, a categoria, quem criou e se está ativo — **sem** o desenho dos blocos, que é a parte pesada.

◽ Serve para montar um seletor e guardar o id do fluxo que outra chamada vai pedir.

◽ A categoria vem vazia quando o fluxo não tem nenhuma, e o autor vem vazio quando não dá para saber quem criou.

◽ A lista vem ordenada por nome.

◽ Só leitura: esta chamada não cria, não edita e não dispara fluxo.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X GET 'https://api.chatmasterveloz.com/api/flowbuilder' \
  -H 'Authorization: Bearer {seutokenaqui}'
```
