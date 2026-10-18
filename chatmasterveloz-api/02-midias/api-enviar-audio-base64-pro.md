---
title: "API Enviar Áudio Base64"
slug: api-enviar-audio-base64-pro
category: "Mídias"
plan: Pro
method: POST
endpoint: https://api.chatmasterveloz.com/api/messages/whatsmeow/sendBase64AudioWhatsmeowPRO
source: https://clihelper.chatmasterveloz.com/docs/api-enviar-audio-base64-pro
fetched: 2026-10-14
---
# API Enviar Áudio Base64  `Pro`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-enviar-audio-base64-pro> · [Voltar ao índice](../README.md)

🧩 Envia um **áudio a partir do formato base64**, com opções de abrir um ticket e atribuir a conversa a um Setor.

**API:** Pro

### Endpoint

```
https://api.chatmasterveloz.com/api/messages/whatsmeow/sendBase64AudioWhatsmeowPRO
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
    "openTicket": "1",
    "queueId": "44",
    "body": "data:audio/ogg;base64,iVBORw0a",
    "ptt": true,
    "caption": "Aqui você pode colocar a TRANSCRIÇÃO DO ÁUDIO - Uma vez que o cliente não recebe áudio com caption, utilize para registrar o conteúdo enviado na plataforma"
  }
```

➡️ **“number”:** telefone do destinatário no formato ddi ddd numero (somente números).

➡️ **“openTicket”:** `0` não abre ticket e `1` abre. Para abrir é obrigatório informar um Setor em `queueId`, e a conversa vai para **Aguardando** mesmo que já esteja em atendimento.

➡️ **“queueId”:** ID do Setor desejado (só funciona quando `"openTicket": "1"`).

➡️ **“body”:** o áudio em `string base64`.

➡️ **“ptt”:** `true` para o áudio chegar como mensagem de voz.

➡️ **“caption”:** legenda. O cliente não recebe legenda em áudio, então use este campo para registrar a transcrição do que foi enviado — ela fica visível na plataforma.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X POST 'https://api.chatmasterveloz.com/api/messages/whatsmeow/sendBase64AudioWhatsmeowPRO' \
  -H 'Authorization: Bearer {seutokenaqui}' \
  -H 'Content-Type: application/json' \
  --data '{"number":"5511955892164","openTicket":"1","queueId":"44","body":"data:audio/ogg;base64,iVBORw0a","ptt":true,"caption":"Aqui você pode colocar a TRANSCRIÇÃO DO ÁUDIO - Uma vez que o cliente não recebe áudio com caption, utilize para registrar o conteúdo enviado na plataforma"}'
```
