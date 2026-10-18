---
title: "API Mensagem de Lista"
slug: api-mensagem-de-lista-pro
category: "Mensagem"
plan: Pro
method: POST
endpoint: https://api.chatmasterveloz.com/api/messages/whatsmeow/sendListPRO
source: https://clihelper.chatmasterveloz.com/docs/api-mensagem-de-lista-pro
fetched: 2026-10-14
---
# API Mensagem de Lista  `Pro`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-mensagem-de-lista-pro> · [Voltar ao índice](../README.md)

🧩 Envia uma **mensagem com uma Lista de opções**, para o usuário escolher uma resposta. O título da opção é a resposta devolvida quando o lead escolhe.

**API:** Pro

### Endpoint

```
https://api.chatmasterveloz.com/api/messages/whatsmeow/sendListPRO
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
  "openTicket": 1,
  "queueId": 100,
  "body": {
    "Desc": "Selecione a melhor opção:",
    "ButtonText": "Abrir lista de opções",
    "TopText": "Escolha uma das opções",
    "List": [
      {
        "RowId": "1",
        "title": "Título A",
        "desc": "Descrição A"
      },
      {
        "RowId": "2",
        "title": "Título B",
        "desc": "Descrição B"
      },
      {
        "RowId": "3",
        "title": "Título C",
        "desc": "Descrição C"
      }
    ]
  }
}
```

➡️ **“number”:** telefone do destinatário no formato ddi ddd numero (somente números).

➡️ **“openTicket”:** decide o que acontece com o ticket:

◽ `0` — o ticket é encerrado.

◽ `1` com `"queueId": 0` — o status do ticket permanece como estava.

◽ `1` com um Setor em `queueId` — o status muda para **Aguardando**.

➡️ **“queueId”:** ID do Setor desejado (só funciona quando `"openTicket": "1"`).

➡️ **“Desc”:** texto logo acima do botão.

➡️ **“ButtonText”:** texto do botão que, ao ser clicado, exibe as opções da lista.

➡️ **“TopText”:** texto logo acima das opções.

➡️ **“List”:** cada opção da lista, sendo que:

◽ `RowId`: define o id da opção.

◽ `title`: título da opção.

◽ `desc`: descrição da opção.

Adicione mais opções se desejar.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X POST 'https://api.chatmasterveloz.com/api/messages/whatsmeow/sendListPRO' \
  -H 'Authorization: Bearer {seutokenaqui}' \
  -H 'Content-Type: application/json' \
  --data '{"number":"5511955892164","openTicket":1,"queueId":100,"body":{"Desc":"Selecione a melhor opção:","ButtonText":"Abrir lista de opções","TopText":"Escolha uma das opções","List":[{"RowId":"1","title":"Título A","desc":"Descrição A"},{"RowId":"2","title":"Título B","desc":"Descrição B"},{"RowId":"3","title":"Título C","desc":"Descrição C"}]}}'
```
