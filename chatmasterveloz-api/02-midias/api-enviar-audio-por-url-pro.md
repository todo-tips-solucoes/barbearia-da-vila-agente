---
title: "API Enviar Áudio por URL"
slug: api-enviar-audio-por-url-pro
category: "Mídias"
plan: Pro
method: POST
endpoint: https://api.chatmasterveloz.com/api/messages/whatsmeow/sendUrlFilesWhatsmeowPRO
source: https://clihelper.chatmasterveloz.com/docs/api-enviar-audio-por-url-pro
fetched: 2026-10-14
---
# API Enviar Áudio por URL  `Pro`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-enviar-audio-por-url-pro> · [Voltar ao índice](../README.md)

🧩 Envia um **áudio a partir de uma URL**, com opções de abrir um ticket e atribuir a conversa a um Setor.

**API:** Pro

### Endpoint

```
https://api.chatmasterveloz.com/api/messages/whatsmeow/sendUrlFilesWhatsmeowPRO
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
  "type": "audio",
  "openTicket": "1",
  "queueId": "44",
  "body": "https://suite.chatmasterveloz.com/api/audio.mp3"
}
```

➡️ **“number”:** telefone do destinatário no formato ddi ddd numero (somente números).

➡️ **“type”:** `audio`.

➡️ **“openTicket”:** `0` não abre ticket e `1` abre. Para abrir é obrigatório informar um Setor em `queueId`, e a conversa vai para **Aguardando** mesmo que já esteja em atendimento.

➡️ **“queueId”:** ID do Setor desejado (só funciona quando `"openTicket": "1"`).

➡️ **“body”:** URL do arquivo.

➡️ **“caption”:** legenda do áudio — é também o texto que fica gravado na conversa.

➡️ **“fileName”:** nome do arquivo que o cliente vê.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X POST 'https://api.chatmasterveloz.com/api/messages/whatsmeow/sendUrlFilesWhatsmeowPRO' \
  -H 'Authorization: Bearer {seutokenaqui}' \
  -H 'Content-Type: application/json' \
  --data '{"number":"5511955892164","type":"audio","openTicket":"1","queueId":"44","body":"https://suite.chatmasterveloz.com/api/audio.mp3"}'
```
