---
title: "API Oficial Template sem variável (Hub)"
slug: api-oficial-template-sem-variavel-hub
category: "Mensagem"
plan: Oficial Hub
method: POST
endpoint: https://api.chatmasterveloz.com/api/messages/sendOfficial
source: https://clihelper.chatmasterveloz.com/docs/api-oficial-template-sem-variavel-hub
fetched: 2026-10-14
---
# API Oficial Template sem variável (Hub)  `Oficial Hub`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-oficial-template-sem-variavel-hub> · [Voltar ao índice](../README.md)

🧩 Envia uma **mensagem template SEM variável pela API oficial,** estando previamente aprovada.

**API:** Oficial

### Endpoint

```
https://api.chatmasterveloz.com/api/messages/sendOfficial
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
    "name": "vars_001",
    "language": "pt_BR"
}
```

➡️ **“number”:** telefone do destinatário no formato ddi ddd numero (somente números).

➡️ **“name”:** nome do template.

➡️ **“language”:** idioma.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X POST 'https://api.chatmasterveloz.com/api/messages/sendOfficial' \
  -H 'Authorization: Bearer {seutokenaqui}' \
  -H 'Content-Type: application/json' \
  --data '{"number":"5511955892164","name":"vars_001","language":"pt_BR"}'
```
