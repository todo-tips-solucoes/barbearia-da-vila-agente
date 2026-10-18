---
title: "API Criar Produto"
slug: api-criar-produto
category: "CRM"
plan: Todas
method: POST
endpoint: https://api.chatmasterveloz.com/api/products
source: https://clihelper.chatmasterveloz.com/docs/api-criar-produto
fetched: 2026-10-14
---
# API Criar Produto  `Todas`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-criar-produto> · [Voltar ao índice](../README.md)

🧩 Cria **um novo produto** no catálogo da empresa.

**API:** Todas

### Endpoint

```
https://api.chatmasterveloz.com/api/products
```

### Método

```
POST
```

### Autenticação

```
Bearer {seutokenaqui}
```

### Payload

```json
{
  "name": "Consultoria Premium",
  "price": 1500.00,
  "description": "Consultoria personalizada para empresas",
  "details": "Inclui 10 horas mensais, relatórios detalhados e acompanhamento semanal.",
  "imageUrl": "https://meusite.com/imagens/consultoria.jpg"
}
```

➡️ **“name”:** nome do produto. **Obrigatório.**

➡️ **“price”:** preço em formato decimal, com os centavos depois do **ponto** — por exemplo, `1500.00`. **Obrigatório.**

➡️ **“description”:** descrição curta do produto.

➡️ **“details”:** detalhes completos ou especificações do produto.

➡️ **“imageUrl”:** endereço público da imagem do produto.

◽ Campos fora desta lista são descartados.

◽ O produto passa a aparecer nos seletores do painel: na oportunidade e na proposta do CRM, nas regras de encadeamento e nos comandos da IA.

◽ A chamada não envia nada a contato nenhum e não cria atendimento.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X POST 'https://api.chatmasterveloz.com/api/products' \
  -H 'Authorization: Bearer {seutokenaqui}' \
  -H 'Content-Type: application/json' \
  --data '{"name":"Consultoria Premium","price":1500,"description":"Consultoria personalizada para empresas","details":"Inclui 10 horas mensais, relatórios detalhados e acompanhamento semanal.","imageUrl":"https://meusite.com/imagens/consultoria.jpg"}'
```
