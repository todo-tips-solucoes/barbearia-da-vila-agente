---
title: "API Botão URL"
slug: botao-url-api
category: "Botões no WhatsApp"
plan: Básica
method: POST
endpoint: https://api.chatmasterveloz.com/api/messages/sendURLBTN
source: https://clihelper.chatmasterveloz.com/docs/botao-url-api
fetched: 2026-10-14
---
# API Botão URL  `Básica`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/botao-url-api> · [Voltar ao índice](../README.md)

🧩 Envia uma mensagem com **um botão que abre um link**.

**API:** Básica

### Endpoint

```
https://api.chatmasterveloz.com/api/messages/sendURLBTN
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
        "header": "Rastreio",
        "body": "Segue o nosso site",
        "name": "cta_url",
        "params": "{\"display_text\":\"Acessar\",\"id\":\"botao_site\",\"url\":\"https://meusite.com.br\",\"disabled\":false}"
    }
}
```

➡️ **“number”:** telefone do destinatário no formato ddi ddd numero (somente números).

➡️ **“body”:** o texto que aparece antes do botão.

➡️ **“header”:** título opcional, acima do texto.

➡️ **“name”:** `cta_url`.

➡️ **“params”:** os parâmetros do botão, em **texto JSON** — repare nas aspas escapadas dentro da string.

◽ **display_text:** o rótulo do botão.

◽ **url:** o endereço que abre quando o cliente toca.

◽ **id:** qualquer identificador seu.

◽ **disabled:** `false` deixa o botão clicável.

◽ O `name` aceita os quatro botões nativos da Meta: `cta_copy` (copiar código), `cta_url` (abrir link), `quick_reply` (resposta rápida) e `cta_call` (ligar). O endereço desta chamada sugere o uso, mas não limita o tipo.

⚠️ **Esta chamada não abre atendimento e não grava a mensagem no painel.** Ela confere o número e envia. Campos como `openTicket` e `queueId` são ignorados aqui.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X POST 'https://api.chatmasterveloz.com/api/messages/sendURLBTN' \
  -H 'Authorization: Bearer {seutokenaqui}' \
  -H 'Content-Type: application/json' \
  --data '{"number":"5511955892164","customData":{"header":"Rastreio","body":"Segue o nosso site","name":"cta_url","params":"{\"display_text\":\"Acessar\",\"id\":\"botao_site\",\"url\":\"https://meusite.com.br\",\"disabled\":false}"}}'
```
