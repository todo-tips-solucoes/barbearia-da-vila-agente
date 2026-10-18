---
title: "API Atualizar Oportunidade V1"
slug: api-atualizar-oportunidade-v1
category: "CRM"
plan: Todas
method: PUT
endpoint: https://api.chatmasterveloz.com/api/oportunidade
source: https://clihelper.chatmasterveloz.com/docs/api-atualizar-oportunidade-v1
fetched: 2026-10-14
---
# API Atualizar Oportunidade V1  `Todas`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-atualizar-oportunidade-v1> · [Voltar ao índice](../README.md)

🧩 Atualiza **uma oportunidade** em um ticket — só o que vier no corpo muda.

**API:** Todas

### Endpoint

```
https://api.chatmasterveloz.com/api/oportunidade
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
  "id": 148,
  "message": "Enviamos a Proposta em PDF",
  "etapadofunil": "Proposta Enviada",
  "produto": "Plano Pro",
  "productId": 12,
  "origemVendaId": 70,
  "valor": "3000.00",
  "free1": "Adicional 1",
  "free2": "Adicional 2",
  "free3": "Adicional 3",
  "free4": "Adicional 4",
  "tagIds": [1, 3, 5]
}
```

➡️ **“id”:** ID da oportunidade a ser atualizada. **Obrigatório.**

➡️ **“message”:** informações adicionais sobre a oportunidade.

➡️ **“etapadofunil”:** nome da Etapa do Funil.

◽ Ao mudar para o nome de uma etapa de **ganho**, a oportunidade é marcada como ganha; ao sair dela, a marcação é desfeita.

➡️ **“produto”:** nome do produto, em texto.

➡️ **“productId”:** ID do produto do catálogo. Mande `0` para limpar.

➡️ **“origemVendaId”:** ID da origem da venda. Mande `0` para limpar.

➡️ **“valor”:** valor em formato decimal, com os centavos depois do **ponto** — por exemplo, `2500.00`.

➡️ **“free1”:** informações do Campo Livre 1.

➡️ **“free2”:** informações do Campo Livre 2.

➡️ **“free3”:** informações do Campo Livre 3.

➡️ **“free4”:** informações do Campo Livre 4.

➡️ **“tagIds”:** array com os IDs das Tags de CRM. **Substitui todas** as etiquetas da oportunidade.

◽ **O nome, o contato, o atendimento e o atendente responsável não mudam por aqui.** Enviar esses campos não dá erro, mas também não muda nada.

⚠️ **A empresa precisa estar no CRM antigo.** Se já estiver no CRM novo, esta chamada é recusada — o registro não apareceria em quadro nenhum.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X PUT 'https://api.chatmasterveloz.com/api/oportunidade' \
  -H 'Authorization: Bearer {seutokenaqui}' \
  -H 'Content-Type: application/json' \
  --data '{"id":148,"message":"Enviamos a Proposta em PDF","etapadofunil":"Proposta Enviada","produto":"Plano Pro","productId":12,"origemVendaId":70,"valor":"3000.00","free1":"Adicional 1","free2":"Adicional 2","free3":"Adicional 3","free4":"Adicional 4","tagIds":[1,3,5]}'
```
