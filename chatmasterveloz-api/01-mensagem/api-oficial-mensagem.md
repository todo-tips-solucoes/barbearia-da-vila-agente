---
title: "API Oficial Mensagem"
slug: api-oficial-mensagem
category: "Mensagem"
plan: Oficial
method: POST
endpoint: https://api.chatmasterveloz.com/api/messages/sendOfficialData
source: https://clihelper.chatmasterveloz.com/docs/api-oficial-mensagem
fetched: 2026-10-14
---
# API Oficial Mensagem  `Oficial`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-oficial-mensagem> · [Voltar ao índice](../README.md)

🧩 Envia uma **mensagem de texto pela API oficial,** estando com a Janela de Atendimento ao Cliente **aberta**.

**API:** Oficial

### Endpoint

```
https://api.chatmasterveloz.com/api/messages/sendOfficialData
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
    "text": "Texto API OFICIAL"
}
```

➡️ **“number”:** telefone do destinatário no formato ddi ddd numero (somente números).

➡️ **“text”:** texto da mensagem.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X POST 'https://api.chatmasterveloz.com/api/messages/sendOfficialData' \
  -H 'Authorization: Bearer {seutokenaqui}' \
  -H 'Content-Type: application/json' \
  --data '{"number":"5511955892164","text":"Texto API OFICIAL"}'
```
