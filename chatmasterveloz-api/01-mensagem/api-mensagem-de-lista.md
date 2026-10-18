---
title: "API Mensagem de Lista"
slug: api-mensagem-de-lista
category: "Mensagem"
plan: Básica
method: POST
endpoint: https://api.chatmasterveloz.com/api/messages/sendList
source: https://clihelper.chatmasterveloz.com/docs/api-mensagem-de-lista
fetched: 2026-10-14
---
# API Mensagem de Lista  `Básica`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-mensagem-de-lista> · [Voltar ao índice](../README.md)

🧩 Envia uma **mensagem com uma Lista de opções**, para o usuário escolher uma resposta. O título da opção é a resposta devolvida quando o lead escolhe.

**API:** Básica

### Endpoint

```
https://api.chatmasterveloz.com/api/messages/sendList
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
  "body": "Selecione a melhor opção:",
  "optionList": {
    "buttonLabel": "Abrir lista de opções",
    "options": [
      {
        "id": "1",
        "title": "Título A",
        "description": "Descrição A"
      },
      {
        "id": "2",
        "title": "Título B",
        "description": "Descrição B"
      }
    ]
  }
}
```

➡️ **“number”:** telefone do destinatário no formato ddi ddd numero (somente números).

➡️ **“body”:** texto logo acima do botão.

➡️ **“buttonLabel”:** texto do botão que, ao ser clicado, exibe as opções da lista.

➡️ **“options”:** cada opção da lista, sendo que:

◽ `id`: define o id da opção.

◽ `title`: título da opção.

◽ `description`: descrição da opção.

Adicione mais opções se desejar.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X POST 'https://api.chatmasterveloz.com/api/messages/sendList' \
  -H 'Authorization: Bearer {seutokenaqui}' \
  -H 'Content-Type: application/json' \
  --data '{"number":"5511955892164","body":"Selecione a melhor opção:","optionList":{"buttonLabel":"Abrir lista de opções","options":[{"id":"1","title":"Título A","description":"Descrição A"},{"id":"2","title":"Título B","description":"Descrição B"}]}}'
```
