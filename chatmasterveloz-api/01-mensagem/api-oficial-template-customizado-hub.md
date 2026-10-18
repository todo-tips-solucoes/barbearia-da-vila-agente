---
title: "API Oficial Template Customizado (Hub)"
slug: api-oficial-template-customizado-hub
category: "Mensagem"
plan: Oficial Hub
method: POST
endpoint: https://api.chatmasterveloz.com/api/messages/sendOfficialCustom
source: https://clihelper.chatmasterveloz.com/docs/api-oficial-template-customizado-hub
fetched: 2026-10-14
---
# API Oficial Template Customizado (Hub)  `Oficial Hub`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-oficial-template-customizado-hub> · [Voltar ao índice](../README.md)

🧩 Envia uma **mensagem template customizado pela API oficial,** estando previamente aprovada.

**API:** Oficial

### Endpoint

```
https://api.chatmasterveloz.com/api/messages/sendOfficialCustom
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
                        "type": "header",
                        "parameters": [{
                                "type": "image",
                                "image": {
                                    "link": "https://URL/wp-content/uploads/2024/03/front-view-woman-holding-smartphone-removebg-preview.png"
                                }
                            }
                        ]
                    }, {
                        "type": "button",
                        "sub_type": "quick_reply",
                        "index": "0",
                        "parameters": [{
                                "type": "payload",
                                "payload": "Descadastrar"
                            }
                        ]
                    }, {
                        "type": "button",
                        "sub_type": "quick_reply",
                        "index": "1",
                        "parameters": [{
                                "type": "payload",
                                "payload": "Alterar Contato"
                            }
                        ]
                    }
                ]
}
```

➡️ **“number”:** telefone do destinatário no formato ddi ddd numero (somente números).

➡️ **“name”:** nome do template.

➡️ **“language”:** idioma.

➡️ **“template”:** os componentes do template aprovado na Meta, sendo que:

◽ `type`: o componente — `header`, `body` ou `button`.

◽ `parameters`: o conteúdo daquele componente, no formato que a Meta espera.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X POST 'https://api.chatmasterveloz.com/api/messages/sendOfficialCustom' \
  -H 'Authorization: Bearer {seutokenaqui}' \
  -H 'Content-Type: application/json' \
  --data '{"number":"5511955892164","name":"vars_001","language":"pt_BR","template":[{"type":"header","parameters":[{"type":"image","image":{"link":"https://URL/wp-content/uploads/2024/03/front-view-woman-holding-smartphone-removebg-preview.png"}}]},{"type":"button","sub_type":"quick_reply","index":"0","parameters":[{"type":"payload","payload":"Descadastrar"}]},{"type":"button","sub_type":"quick_reply","index":"1","parameters":[{"type":"payload","payload":"Alterar Contato"}]}]}'
```
