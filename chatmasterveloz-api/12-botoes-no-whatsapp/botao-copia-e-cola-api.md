---
title: "API Botão Copia e Cola"
slug: botao-copia-e-cola-api
category: "Botões no WhatsApp"
plan: Básica
method: POST
endpoint: https://api.chatmasterveloz.com/api/messages/sendCopyPaste
source: https://clihelper.chatmasterveloz.com/docs/botao-copia-e-cola-api
fetched: 2026-10-14
---
# API Botão Copia e Cola  `Básica`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/botao-copia-e-cola-api> · [Voltar ao índice](../README.md)

🧩 Envia uma mensagem com **um botão que copia um código** ao ser tocado.

**API:** Básica

### Endpoint

```
https://api.chatmasterveloz.com/api/messages/sendCopyPaste
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
        "header": "Seu código",
        "body": "Segue o nosso Pix",
        "name": "cta_copy",
        "params": "{\"display_text\":\"Copiar Pix\",\"id\":\"botao_pix\",\"copy_code\":\"[email protected]\",\"disabled\":false}"
    }
}
```

➡️ **“number”:** telefone do destinatário no formato ddi ddd numero (somente números).

➡️ **“body”:** o texto que aparece antes do botão.

➡️ **“header”:** título opcional, acima do texto.

➡️ **“name”:** `cta_copy`.

➡️ **“params”:** os parâmetros do botão, em **texto JSON** — repare nas aspas escapadas dentro da string.

◽ **display_text:** o rótulo do botão.

◽ **copy_code:** o texto que vai para a área de transferência do cliente.

◽ **id:** qualquer identificador seu.

◽ **disabled:** `false` deixa o botão clicável.

◽ O `name` aceita os quatro botões nativos da Meta: `cta_copy` (copiar código), `cta_url` (abrir link), `quick_reply` (resposta rápida) e `cta_call` (ligar). O endereço desta chamada sugere o uso, mas não limita o tipo.

⚠️ **Esta chamada não abre atendimento e não grava a mensagem no painel.** Ela confere o número e envia. Campos como `openTicket` e `queueId` são ignorados aqui.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X POST 'https://api.chatmasterveloz.com/api/messages/sendCopyPaste' \
  -H 'Authorization: Bearer {seutokenaqui}' \
  -H 'Content-Type: application/json' \
  --data '{"number":"5511955892164","customData":{"header":"Seu código","body":"Segue o nosso Pix","name":"cta_copy","params":"{\"display_text\":\"Copiar Pix\",\"id\":\"botao_pix\",\"copy_code\":\"meupix@gmail.com\",\"disabled\":false}"}}'
```
