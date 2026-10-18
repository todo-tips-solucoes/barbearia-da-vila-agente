---
title: "API Obter QR Code"
slug: api-obter-qr-code
category: "Conexões"
plan: Pro
method: POST
endpoint: https://api.chatmasterveloz.com/api/whatsappqrcodepro
source: https://clihelper.chatmasterveloz.com/docs/api-obter-qr-code
fetched: 2026-10-14
---
# API Obter QR Code  `Pro`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-obter-qr-code> · [Voltar ao índice](../README.md)

🧩 Obter o **código do QR Code**, para fazer a leitura da conexão solicitada.

**API:** Pro

### Endpoint

```
https://api.chatmasterveloz.com/api/whatsappqrcodepro
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

```
// sem payload
```

➡️ Esta chamada não tem payload.

◽ A conexão é a do token usado na chamada.

◽ A resposta traz o QR Code como **imagem em base64**, pronta para exibir na sua tela.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X POST 'https://api.chatmasterveloz.com/api/whatsappqrcodepro' \
  -H 'Authorization: Bearer {seutokenaqui}'
```
