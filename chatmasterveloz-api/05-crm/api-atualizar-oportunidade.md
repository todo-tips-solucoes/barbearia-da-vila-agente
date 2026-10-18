---
title: "API Atualizar Oportunidade"
slug: api-atualizar-oportunidade
category: "CRM"
plan: Todas
method: PUT
endpoint: https://api.chatmasterveloz.com/api/crm/v2/oportunidades/{oportunidadeId}
source: https://clihelper.chatmasterveloz.com/docs/api-atualizar-oportunidade
fetched: 2026-10-14
---
# API Atualizar Oportunidade  `Todas`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-atualizar-oportunidade> · [Voltar ao índice](../README.md)

🧩 Atualizar **uma oportunidade** do CRM — só o que vier no corpo muda.

**API:** Todas

### Endpoint

```
https://api.chatmasterveloz.com/api/crm/v2/oportunidades/{oportunidadeId}
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
    "valor": 15000,
    "userId": 5,
    "message": "Cliente pediu desconto"
}
```

➡️ **“oportunidadeId”:** ID da oportunidade — vai no próprio endereço, no lugar de `{oportunidadeId}`. **Obrigatório.**

➡️ **“valor”:** valor em formato decimal, com os centavos depois do **ponto**.

➡️ **“userId”:** ID do novo responsável, que precisa ser usuário da mesma empresa.

➡️ **“message”:** observações.

◽ Aceitam também alteração: `name`, `produto`, `productId`, `motivoPerdaId`, `origemVendaId`, `previsaoFechamento`, `fonte`, `campanha` e os campos livres `free1` a `free4`.

◽ Os campos de viagem entram do mesmo jeito: `origem`, `destino`, `datadeida` e `datadevolta`.

◽ Em `productId`, `motivoPerdaId` e `origemVendaId`, mande `null`, `""` ou `0` para limpar.

◽ **“tagIds” substitui TODAS as etiquetas** da oportunidade pela lista enviada.

◽ **O funil, o contato e o atendimento não mudam por aqui** — uma oportunidade não troca de funil.

◽ O `laneId` pode vir, mas só uma raia do funil em que a oportunidade já está; ao trocar de raia, a situação é recalculada.

◽ A chamada opera com a credencial da empresa: pode trocar o responsável, reabrir venda fechada e alterar valor ou produto de venda já ganha. As travas que valem para o operador no painel não valem aqui.

◽ Id que não existe e id de outra empresa respondem a mesma coisa: não encontrado. A chamada não confirma quais ids existem no sistema.

⚠️ **A empresa precisa estar com o CRM novo ativado.**

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X PUT 'https://api.chatmasterveloz.com/api/crm/v2/oportunidades/{oportunidadeId}' \
  -H 'Authorization: Bearer {seutokenaqui}' \
  -H 'Content-Type: application/json' \
  --data '{"valor":15000,"userId":5,"message":"Cliente pediu desconto"}'
```
