---
title: "API Criar Oportunidade"
slug: api-criar-oportunidade
category: "CRM"
plan: Todas
method: POST
endpoint: https://api.chatmasterveloz.com/api/crm/v2/oportunidades
source: https://clihelper.chatmasterveloz.com/docs/api-criar-oportunidade
fetched: 2026-10-14
---
# API Criar Oportunidade  `Todas`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-criar-oportunidade> · [Voltar ao índice](../README.md)

🧩 Cria **uma oportunidade** em um funil do CRM.

**API:** Todas

### Endpoint

```
https://api.chatmasterveloz.com/api/crm/v2/oportunidades
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
    "pipelineId": 7,
    "laneId": 30,
    "contactId": 9,
    "userId": 4,
    "name": "Contrato ACME",
    "message": "Veio pelo formulário do site",
    "produto": "Plano Pro",
    "valor": 12000.50,
    "origemVendaId": 70,
    "previsaoFechamento": "2026-10-15",
    "tagIds": [3, 4]
}
```

➡️ **“pipelineId”:** ID do funil onde a oportunidade entra. **Obrigatório.**

➡️ **“laneId”:** opcional. ID da raia. Sem ele, a oportunidade entra na **primeira raia** do funil; com ele, a raia precisa ser desse mesmo funil.

➡️ **“contactId”:** opcional. ID do contato ligado à oportunidade.

➡️ **“userId”:** opcional. ID do responsável, que precisa ser usuário da mesma empresa.

➡️ **“name”:** opcional. Título do card.

➡️ **“message”:** opcional. Observações.

➡️ **“produto”:** opcional. O que está sendo vendido.

➡️ **“valor”:** opcional. Valor em formato decimal, com os centavos depois do **ponto** — por exemplo, `12000.50`.

➡️ **“origemVendaId”:** opcional. ID da origem de venda.

➡️ **“previsaoFechamento”:** opcional. Data prevista, no formato `AAAA-MM-DD`.

➡️ **“tagIds”:** opcional. Lista de ids das etiquetas. Aceita `[3, 4]` e `"3,4"`.

◽ A oportunidade entra no **topo** da raia.

◽ A situação vem da raia: criada direto numa raia de ganho, a oportunidade já nasce ganha.

◽ A empresa vem do token, e todo id é conferido contra ela antes de gravar — funil, raia, motivo, origem e responsável.

⚠️ **A empresa precisa estar com o CRM novo ativado.**

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X POST 'https://api.chatmasterveloz.com/api/crm/v2/oportunidades' \
  -H 'Authorization: Bearer {seutokenaqui}' \
  -H 'Content-Type: application/json' \
  --data '{"pipelineId":7,"laneId":30,"contactId":9,"userId":4,"name":"Contrato ACME","message":"Veio pelo formulário do site","produto":"Plano Pro","valor":12000.5,"origemVendaId":70,"previsaoFechamento":"2026-10-15","tagIds":[3,4]}'
```
