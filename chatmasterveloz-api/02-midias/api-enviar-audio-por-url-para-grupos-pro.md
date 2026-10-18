---
title: "API Enviar Áudio por URL para Grupos"
slug: api-enviar-audio-por-url-para-grupos-pro
category: "Mídias"
plan: Pro
method: POST
endpoint: https://api.chatmasterveloz.com/api/messages/whatsmeow/sendUrlFilesWhatsmeowGroupPRO
source: https://clihelper.chatmasterveloz.com/docs/api-enviar-audio-por-url-para-grupos-pro
fetched: 2026-10-14
---
# API Enviar Áudio por URL para Grupos  `Pro`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-enviar-audio-por-url-para-grupos-pro> · [Voltar ao índice](../README.md)

🧩 Envia um **áudio a partir de uma URL para um grupo**, com opções de abrir um ticket e atribuir a conversa a um Setor.

**API:** Pro

### Endpoint

```
https://api.chatmasterveloz.com/api/messages/whatsmeow/sendUrlFilesWhatsmeowGroupPRO
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
    "number": "[email protected]",
    "type": "audio",
    "openTicket": "1",
    "queueId": "44",
    "body": "https://suite.chatmasterveloz.com/api/audio.mp3"
  }
```

➡️ **“number”:** ID do grupo, que fica no mesmo lugar do telefone em um ticket comum.

➡️ **“type”:** `audio`.

➡️ **“openTicket”:** `0` não abre ticket e `1` abre. Para abrir é obrigatório informar um Setor em `queueId`, e a conversa vai para **Aguardando** mesmo que já esteja em atendimento.

➡️ **“queueId”:** ID do Setor desejado (só funciona quando `"openTicket": "1"`).

➡️ **“body”:** URL do arquivo.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X POST 'https://api.chatmasterveloz.com/api/messages/whatsmeow/sendUrlFilesWhatsmeowGroupPRO' \
  -H 'Authorization: Bearer {seutokenaqui}' \
  -H 'Content-Type: application/json' \
  --data '{"number":"120363176602447147@g.us","type":"audio","openTicket":"1","queueId":"44","body":"https://suite.chatmasterveloz.com/api/audio.mp3"}'
```
