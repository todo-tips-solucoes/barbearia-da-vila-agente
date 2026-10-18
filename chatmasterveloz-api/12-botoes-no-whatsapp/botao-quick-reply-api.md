---
title: "API Botão Quick Reply"
slug: botao-quick-reply-api
category: "Botões no WhatsApp"
plan: Básica
method: POST
endpoint: https://api.chatmasterveloz.com/api/messages/sendBTN2
source: https://clihelper.chatmasterveloz.com/docs/botao-quick-reply-api
fetched: 2026-10-14
---
# API Botão Quick Reply  `Básica`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/botao-quick-reply-api> · [Voltar ao índice](../README.md)

🧩 Envia uma mensagem com **dois botões de resposta rápida**.

**API:** Básica

### Endpoint

```
https://api.chatmasterveloz.com/api/messages/sendBTN2
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
    "customData": {
        "body": "Escolha uma opção",
        "name": "quick_reply",
        "params": "{\"display_text\":\"Opção A\",\"id\":\"id_botao_A\",\"disabled\":false}",
        "nameb": "quick_reply",
        "paramsb": "{\"display_text\":\"Opção B\",\"id\":\"id_botao_B\",\"disabled\":false}"
    }
}
```

➡️ **“number”:** telefone do destinatário no formato ddi ddd numero (somente números).

➡️ **“body”:** o texto que aparece antes do botão.

➡️ **“header”:** título opcional, acima do texto.

➡️ **“name”:** o tipo do **primeiro** botão — aqui, `quick_reply`.

➡️ **“params”:** os parâmetros do botão, em **texto JSON** — repare nas aspas escapadas dentro da string.

◽ **display_text:** o rótulo do primeiro botão.

◽ **id:** identificador do primeiro botão.

➡️ **“nameb”:** o tipo do **segundo** botão.

➡️ **“paramsb”:** os parâmetros do segundo botão, também em texto JSON.

◽ Os dois botões não precisam ser do mesmo tipo: dá para juntar um link e uma resposta rápida, por exemplo.

◽ O `name` aceita os quatro botões nativos da Meta: `cta_copy` (copiar código), `cta_url` (abrir link), `quick_reply` (resposta rápida) e `cta_call` (ligar). O endereço desta chamada sugere o uso, mas não limita o tipo.

⚠️ **Esta chamada não abre atendimento e não grava a mensagem no painel.** Ela confere o número e envia. Campos como `openTicket` e `queueId` são ignorados aqui.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X POST 'https://api.chatmasterveloz.com/api/messages/sendBTN2' \
  -H 'Authorization: Bearer {seutokenaqui}' \
  -H 'Content-Type: application/json' \
  --data '{"number":"5511955892164","customData":{"body":"Escolha uma opção","name":"quick_reply","params":"{\"display_text\":\"Opção A\",\"id\":\"id_botao_A\",\"disabled\":false}","nameb":"quick_reply","paramsb":"{\"display_text\":\"Opção B\",\"id\":\"id_botao_B\",\"disabled\":false}"}}'
```
