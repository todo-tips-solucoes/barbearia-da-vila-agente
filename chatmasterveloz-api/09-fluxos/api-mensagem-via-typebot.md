---
title: "API Mensagem via Typebot"
slug: api-mensagem-via-typebot
category: "Fluxos"
plan: Todas
method: POST
endpoint: https://api.chatmasterveloz.com/api/messages/typebotStart
source: https://clihelper.chatmasterveloz.com/docs/api-mensagem-via-typebot
fetched: 2026-10-14
---
# API Mensagem via Typebot  `Todas`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-mensagem-via-typebot> · [Voltar ao índice](../README.md)

🧩 Inicia **um fluxo de Typebot,** de forma passiva, ou seja, sem interação do usuário.

O **Setor** deve estar devidamente vinculado ao fluxo desejado.

Nessa fase inicial, o envio é **somente** para mensagens de texto.

**API:** Todas

### Endpoint

```
https://api.chatmasterveloz.com/api/messages/typebotStart
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
    "queueId": "50"
  }
```

➡️ **“number”:** telefone do destinatário no formato ddi ddd numero (somente números).

➡️ **“queueId”:** ID do Setor que está vinculado ao fluxo desejado.

📌 Ao final do fluxo iniciado, você pode enviar o lead para outro fluxo, que então será **interativo**, porque o lead será transferido para o status **Aguardando**.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X POST 'https://api.chatmasterveloz.com/api/messages/typebotStart' \
  -H 'Authorization: Bearer {seutokenaqui}' \
  -H 'Content-Type: application/json' \
  --data '{"number":"5511955892164","queueId":"50"}'
```
