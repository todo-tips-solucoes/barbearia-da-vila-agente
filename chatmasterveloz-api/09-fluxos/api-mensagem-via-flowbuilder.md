---
title: "API Mensagem via Flowbuilder"
slug: api-mensagem-via-flowbuilder
category: "Fluxos"
plan: Todas
method: POST
endpoint: https://api.chatmasterveloz.com/api/messages/flowbuilderStart
source: https://clihelper.chatmasterveloz.com/docs/api-mensagem-via-flowbuilder
fetched: 2026-10-14
---
# API Mensagem via Flowbuilder  `Todas`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-mensagem-via-flowbuilder> · [Voltar ao índice](../README.md)

🧩 Inicia **um fluxo do flowbuilder,** de forma passiva, ou seja, sem interação do usuário.

Nessa fase inicial, o envio é **somente** para mensagens de texto.

**API:** Todas

### Endpoint

```
https://api.chatmasterveloz.com/api/messages/flowbuilderStart
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
    "number": "5511955892164",
    "queueId": "3"
  }
```

➡️ **“number”:** telefone do destinatário no formato ddi ddd numero (somente números).

➡️ **“queueId”:** ID do Setor que está vinculado ao fluxo desejado.

⚠️ Ao chamar essa API, o ticket será transferido para o status **Aguardando**.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X POST 'https://api.chatmasterveloz.com/api/messages/flowbuilderStart' \
  -H 'Authorization: Bearer {seutokenaqui}' \
  -H 'Content-Type: application/json' \
  --data '{"number":"5511955892164","queueId":"3"}'
```
