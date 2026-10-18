---
title: "API Deletar Produto"
slug: api-deletar-produto
category: "CRM"
plan: Todas
method: DELETE
endpoint: https://api.chatmasterveloz.com/api/products
source: https://clihelper.chatmasterveloz.com/docs/api-deletar-produto
fetched: 2026-10-14
---
# API Deletar Produto  `Todas`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-deletar-produto> · [Voltar ao índice](../README.md)

🧩 Apaga **um produto** do catálogo permanentemente.

**API:** Todas

### Endpoint

```
https://api.chatmasterveloz.com/api/products
```

### Método

```
DELETE
```

### Autenticação

```
Bearer {seutokenaqui}
```

### Payload

```json
{
  "id": 31
}
```

➡️ **“id”:** ID do produto a ser removido. **Obrigatório.**

⚠️ **Não há como desfazer.** A exclusão é permanente e não existe lixeira.

◽ As oportunidades e as propostas que já usam o produto continuam como estão.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X DELETE 'https://api.chatmasterveloz.com/api/products' \
  -H 'Authorization: Bearer {seutokenaqui}' \
  -H 'Content-Type: application/json' \
  --data '{"id":31}'
```
