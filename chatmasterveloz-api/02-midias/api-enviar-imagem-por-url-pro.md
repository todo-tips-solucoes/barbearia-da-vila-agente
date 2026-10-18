---
title: "API Enviar Imagem por URL"
slug: api-enviar-imagem-por-url-pro
category: "Mídias"
plan: Pro
method: POST
endpoint: https://api.chatmasterveloz.com/api/messages/whatsmeow/sendUrlFilesWhatsmeowPRO
source: https://clihelper.chatmasterveloz.com/docs/api-enviar-imagem-por-url-pro
fetched: 2026-10-14
---
# API Enviar Imagem por URL  `Pro`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-enviar-imagem-por-url-pro> · [Voltar ao índice](../README.md)

🧩 Envia uma **imagem a partir de uma URL**, com opções de abrir um ticket e atribuir a conversa a um Setor.

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
  "type": "image",
  "caption": "Aqui vai minha legenda",
  "fileName": "algumnome.jpeg",
  "openTicket": "1",
  "queueId": "44",
  "body": "https://suite.chatmasterveloz.com/api/image.jpg"
}
```

➡️ **“number”:** telefone do destinatário no formato ddi ddd numero (somente números).

➡️ **“type”:** `image`.

➡️ **“caption”:** legenda exibida junto do arquivo.

➡️ **“fileName”:** nome do arquivo.

➡️ **“openTicket”:** `0` não abre ticket e `1` abre. Para abrir é obrigatório informar um Setor em `queueId`, e a conversa vai para **Aguardando** mesmo que já esteja em atendimento.

➡️ **“queueId”:** ID do Setor desejado (só funciona quando `"openTicket": "1"`).

➡️ **“body”:** URL do arquivo.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X POST 'https://api.chatmasterveloz.com/api/messages/whatsmeow/sendUrlFilesWhatsmeowPRO' \
  -H 'Authorization: Bearer {seutokenaqui}' \
  -H 'Content-Type: application/json' \
  --data '{"number":"5511955892164","type":"image","caption":"Aqui vai minha legenda","fileName":"algumnome.jpeg","openTicket":"1","queueId":"44","body":"https://suite.chatmasterveloz.com/api/image.jpg"}'
```
