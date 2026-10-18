---
title: "API Oficial Mensagem de Lista"
slug: api-oficial-mensagem-de-lista
category: "Mensagem"
plan: Oficial
method: POST
endpoint: https://api.chatmasterveloz.com/api/messages/sendInteractive
source: https://clihelper.chatmasterveloz.com/docs/api-oficial-mensagem-de-lista
fetched: 2026-10-14
---
# API Oficial Mensagem de Lista  `Oficial`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-oficial-mensagem-de-lista> · [Voltar ao índice](../README.md)

🧩 Envia uma **mensagem com uma Lista de opções**, estando com a Janela de Atendimento ao Cliente **aberta,** para o usuário escolher uma resposta. O título da opção é a resposta devolvida quando o lead escolhe.

**API:** Oficial

### Endpoint

```
https://api.chatmasterveloz.com/api/messages/sendInteractive
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
    "type": "list",
    "header": {
        "type": "text",
        "text": "Texto do Header"
    },
    "body": {
        "text": "Texto do Body"
    },
    "footer": {
        "text": "Rodapé"
    },
    "action": {
        "sections": [
            {
                "title": "Titulo da lista A",
                "rows": [
                    {
                        "id": 1,
                        "title": "Linha 01 - lista A",
                        "description": "descricao 01 - lista A"
                    },
                    {
                        "id": 2,
                        "title": "Linha 02 - lista A",
                        "description": "descricao 02 - lista A"
                    }
                ]
            },
            {
                "title": "Titulo da lista B",
                "rows": [
                    {
                        "id": 3,
                        "title": "Linha 03 - lista B",
                        "description": "descricao 03 - lista B"
                    },
                    {
                        "id": 4,
                        "title": "Linha 04 - lista B",
                        "description": "descricao 04 - lista B"
                    }
                ]
            }
        ],
        "button": "Lista de opções"
    },
    "openTicket": 1,
    "queueId": 1
}
```

➡️ **“number”:** telefone do destinatário no formato ddi ddd numero (somente números).

➡️ **“type”:** `list`.

➡️ **“header”:** cabeçalho opcional, no campo `text`.

➡️ **“body”:** sua mensagem, no campo `text` (máximo de 1024 caracteres).

➡️ **“footer”:** rodapé opcional, no campo `text`.

➡️ **“action”:** o conteúdo da lista, sendo que:

◽ `sections`: cada seção da lista, com `title` (título da seção) e `rows` (as opções dela).

◽ cada opção dentro de `rows` tem `id`, `title` e `description`.

◽ `button`: texto do botão que, ao ser clicado, exibe as opções da lista.

Adicione mais seções e opções se desejar.

➡️ **“openTicket”:** `1` deixa a conversa em **Aguardando** no Setor de `queueId`.

➡️ **“queueId”:** ID do Setor para onde a conversa vai quando `"openTicket": 1`.

⚠️ **Aqui o `openTicket` não funciona como nas outras chamadas:** `1` deixa a conversa em **Aguardando** no Setor de `queueId`; **qualquer outro valor — inclusive não enviar o campo — ENCERRA o atendimento** depois do envio.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X POST 'https://api.chatmasterveloz.com/api/messages/sendInteractive' \
  -H 'Authorization: Bearer {seutokenaqui}' \
  -H 'Content-Type: application/json' \
  --data '{"number":"5511955892164","type":"list","header":{"type":"text","text":"Texto do Header"},"body":{"text":"Texto do Body"},"footer":{"text":"Rodapé"},"action":{"sections":[{"title":"Titulo da lista A","rows":[{"id":1,"title":"Linha 01 - lista A","description":"descricao 01 - lista A"},{"id":2,"title":"Linha 02 - lista A","description":"descricao 02 - lista A"}]},{"title":"Titulo da lista B","rows":[{"id":3,"title":"Linha 03 - lista B","description":"descricao 03 - lista B"},{"id":4,"title":"Linha 04 - lista B","description":"descricao 04 - lista B"}]}],"button":"Lista de opções"},"openTicket":1,"queueId":1}'
```
