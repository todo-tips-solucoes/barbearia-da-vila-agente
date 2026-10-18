---
title: "API Oficial Template com variável (Hub)"
slug: api-oficial-template-com-variavel-hub
category: "Mensagem"
plan: Oficial Hub
method: POST
endpoint: https://api.chatmasterveloz.com/api/messages/sendOfficial
source: https://clihelper.chatmasterveloz.com/docs/api-oficial-template-com-variavel-hub
fetched: 2026-10-14
---
# API Oficial Template com variável (Hub)  `Oficial Hub`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-oficial-template-com-variavel-hub> · [Voltar ao índice](../README.md)

🧩 Envia uma **mensagem template COM variável pela API oficial,** estando previamente aprovada.

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
    "language": "pt_BR",
    "template": [
        {
            "type": "text",
            "parameter_name": "variavel 1",
            "text": "valor 1"
        },
        {
            "type": "text",
            "parameter_name": "variavel 2",
            "text": "Valor 2"
        },
        {
            "type": "text",
            "parameter_name": "variavel 3",
            "text": "Valor 3"
        }
    ]
}
```

➡️ **“number”:** telefone do destinatário no formato ddi ddd numero (somente números).

➡️ **“name”:** nome do template.

➡️ **“language”:** idioma.

➡️ **“template”:** uma entrada por variável do template, sendo que:

◽ `type`: tipo da variável.

◽ `parameter_name`: nome da variável definido no template (key).

◽ `text`: valor da variável (value).

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X POST 'https://api.chatmasterveloz.com/api/messages/sendOfficial' \
  -H 'Authorization: Bearer {seutokenaqui}' \
  -H 'Content-Type: application/json' \
  --data '{"number":"5511955892164","name":"vars_001","language":"pt_BR","template":[{"type":"text","parameter_name":"variavel 1","text":"valor 1"},{"type":"text","parameter_name":"variavel 2","text":"Valor 2"},{"type":"text","parameter_name":"variavel 3","text":"Valor 3"}]}'
```
