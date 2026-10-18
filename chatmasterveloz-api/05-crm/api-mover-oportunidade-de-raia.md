---
title: "API Mover Oportunidade de Raia"
slug: api-mover-oportunidade-de-raia
category: "CRM"
plan: Todas
method: PUT
endpoint: https://api.chatmasterveloz.com/api/crm/v2/oportunidades/{oportunidadeId}/mover
source: https://clihelper.chatmasterveloz.com/docs/api-mover-oportunidade-de-raia
fetched: 2026-10-14
---
# API Mover Oportunidade de Raia  `Todas`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-mover-oportunidade-de-raia> · [Voltar ao índice](../README.md)

🧩 Move **uma oportunidade** para outra raia (lane / coluna) do mesmo funil.

**API:** Todas

### Endpoint

```
https://api.chatmasterveloz.com/api/crm/v2/oportunidades/{oportunidadeId}/mover
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
    "laneId": 33,
    "motivoPerdaId": 60
}
```

➡️ **“oportunidadeId”:** ID da oportunidade — vai no próprio endereço, no lugar de `{oportunidadeId}`. **Obrigatório.**

➡️ **“laneId”:** ID da raia de destino, do **mesmo funil** da oportunidade. **Obrigatório.**

➡️ **“motivoPerdaId”:** opcional. Grava o motivo na mesma chamada — pensado para a raia de perda, para a perda não ficar registrada sem porquê.

➡️ **“posicao”:** opcional. Posição dentro da raia, começando em `0` no topo. Sem ela, a oportunidade vai para o topo.

◽ A situação vem da raia de destino: raia de ganho marca a venda como ganha, raia de perda como perdida, e raia em andamento **reabre** a oportunidade.

◽ Mover para a raia em que a oportunidade já está apenas reordena a coluna.

◽ A chamada pode reabrir venda fechada — no painel isso é só de administrador.

◽ Id que não existe e id de outra empresa respondem a mesma coisa: não encontrado. A chamada não confirma quais ids existem no sistema.

⚠️ **A empresa precisa estar com o CRM novo ativado.**

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X PUT 'https://api.chatmasterveloz.com/api/crm/v2/oportunidades/{oportunidadeId}/mover' \
  -H 'Authorization: Bearer {seutokenaqui}' \
  -H 'Content-Type: application/json' \
  --data '{"laneId":33,"motivoPerdaId":60}'
```
