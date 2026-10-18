---
title: "API Oficial Digitando"
slug: api-oficial-digitando
category: "Mensagem"
plan: Oficial
method: POST
endpoint: https://api.chatmasterveloz.com/api/messages/typing
source: https://clihelper.chatmasterveloz.com/docs/api-oficial-digitando
fetched: 2026-10-14
---
# API Oficial Digitando  `Oficial`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-oficial-digitando> · [Voltar ao índice](../README.md)

🧩 Altera o status para **Digitando...** por 25 segundos ou até que uma mensagem seja enviada.

**API:** Oficial

### Endpoint

```
https://api.chatmasterveloz.com/api/messages/typing
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
    "ticketId": 700,
    "status": "on"
}
```

➡️ **“ticketId”:** o atendimento. Informe este ou o `number`.

➡️ **“number”:** o número do cliente. Informe este ou o `ticketId`.

➡️ **“status”:** `on` **Obrigatório.**

⚠️ **Ligar o indicador marca como lida** a última mensagem do cliente — ela fica com o visto azul.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X POST 'https://api.chatmasterveloz.com/api/messages/typing' \
  -H 'Authorization: Bearer {seutokenaqui}' \
  -H 'Content-Type: application/json' \
  --data '{"ticketId":700,"status":"on"}'
```
