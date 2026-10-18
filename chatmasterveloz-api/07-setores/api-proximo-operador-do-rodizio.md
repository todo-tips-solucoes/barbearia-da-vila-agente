---
title: "API Próximo Operador do Rodízio"
slug: api-proximo-operador-do-rodizio
category: "Setores"
plan: Todas
method: POST
endpoint: https://api.chatmasterveloz.com/api/queues/{queueId}/next-user
source: https://clihelper.chatmasterveloz.com/docs/api-proximo-operador-do-rodizio
fetched: 2026-10-14
---
# API Próximo Operador do Rodízio  `Todas`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-proximo-operador-do-rodizio> · [Voltar ao índice](../README.md)

🧩 Descobrir **de quem é a vez** no rodízio de um Setor.

**API:** Todas

### Endpoint

```
https://api.chatmasterveloz.com/api/queues/{queueId}/next-user
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
    "avancar": false
}
```

➡️ **“queueId”:** ID do Setor — vai no próprio endereço, no lugar de `{queueId}`. **Obrigatório.**

➡️ **“avancar”:** `false` apenas **espia** quem seria o próximo, sem gastar a vez. Sem este campo, a vez é consumida.

◽ Setor sem ninguém disponível **não é erro**: a resposta vem sem operador e com o motivo — ninguém no Setor, ou ninguém online.

◽ A chamada responde mesmo com o rodízio desligado no Setor; a resposta informa se ele está ligado.

◽ A vez que esta chamada consome é a mesma do rodízio automático: o escolhido passa a ser "o último a receber" também para ele.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X POST 'https://api.chatmasterveloz.com/api/queues/{queueId}/next-user' \
  -H 'Authorization: Bearer {seutokenaqui}' \
  -H 'Content-Type: application/json' \
  --data '{"avancar":false}'
```
