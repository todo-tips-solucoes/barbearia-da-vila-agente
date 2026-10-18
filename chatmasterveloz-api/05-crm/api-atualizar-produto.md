---
title: "API Atualizar Produto"
slug: api-atualizar-produto
category: "CRM"
plan: Todas
method: PUT
endpoint: https://api.chatmasterveloz.com/api/products
source: https://clihelper.chatmasterveloz.com/docs/api-atualizar-produto
fetched: 2026-10-14
---
# API Atualizar Produto  `Todas`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-atualizar-produto> · [Voltar ao índice](../README.md)

🧩 Atualiza os dados de **um produto existente** no catálogo — só o que vier no corpo muda.

**API:** Todas

### Endpoint

```
https://api.chatmasterveloz.com/api/products
```

### Método

```
PUT
```

### Autenticação

```
Bearer {seutokenaqui}
```

### Payload

```json
{
  "id": 9,
  "name": "Consultoria Premium",
  "price": 1800.00,
  "description": "Consultoria personalizada para empresas - versão 2026",
  "details": "Inclui 10 horas mensais, relatórios detalhados e acompanhamento semanal.",
  "imageUrl": "https://meusite.com/imagens/consultoria.jpg"
}
```

➡️ **“id”:** ID do produto a ser atualizado. **Obrigatório.**

➡️ **“name”:** novo nome do produto.

➡️ **“price”:** novo preço em formato decimal, com os centavos depois do **ponto** — por exemplo, `1800.00`.

➡️ **“description”:** nova descrição curta do produto.

➡️ **“details”:** novos detalhes ou especificações do produto.

➡️ **“imageUrl”:** novo endereço público da imagem do produto.

◽ Os campos que você não enviar ficam como estão.

◽ Mudar o preço vale para as propostas feitas dali em diante. As que já foram emitidas **não** são recalculadas.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X PUT 'https://api.chatmasterveloz.com/api/products' \
  -H 'Authorization: Bearer {seutokenaqui}' \
  -H 'Content-Type: application/json' \
  --data '{"id":9,"name":"Consultoria Premium","price":1800,"description":"Consultoria personalizada para empresas - versão 2026","details":"Inclui 10 horas mensais, relatórios detalhados e acompanhamento semanal.","imageUrl":"https://meusite.com/imagens/consultoria.jpg"}'
```
