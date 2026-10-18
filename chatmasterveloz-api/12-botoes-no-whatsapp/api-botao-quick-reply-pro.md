---
title: "API Botão Quick Reply"
slug: api-botao-quick-reply-pro
category: "Botões no WhatsApp"
plan: Pro
method: POST
endpoint: https://api.chatmasterveloz.com/api/messages/whatsmeow/sendButtonsPRO
source: https://clihelper.chatmasterveloz.com/docs/api-botao-quick-reply-pro
fetched: 2026-10-14
---
# API Botão Quick Reply  `Pro`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-botao-quick-reply-pro> · [Voltar ao índice](../README.md)

🧩 Envia uma mensagem com **botões de resposta rápida**: o cliente toca e a resposta volta como mensagem dele.

**API:** Pro

### Endpoint

```
https://api.chatmasterveloz.com/api/messages/whatsmeow/sendButtonsPRO
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
    "openTicket": 0,
    "queueId": 0,
    "body": [
      {
        "phone": "5511955892164",
        "title": "Confirmação",
        "body": "Podemos confirmar seu pedido?",
        "footer": "Toque em uma opção",
        "buttons": [
         {
           "type": "quick_reply",
           "text": "Sim",
           "id": "opcao_sim"
         },
         {
           "type": "quick_reply",
           "text": "Não",
           "id": "opcao_nao"
         }
        ]
      }
    ]
}
```

➡️ **“openTicket”:** `0` não abre ticket e `1` abre. Para abrir é obrigatório informar um Setor em `queueId`, e a conversa vai para **Aguardando** mesmo que já esteja em atendimento.

➡️ **“queueId”:** ID do Setor desejado (só funciona quando `"openTicket": "1"`).

➡️ **“phone”:** telefone do destinatário no formato ddi ddd numero (somente números).

➡️ **“title”:** texto do título, acima da mensagem.

➡️ **“body”:** texto principal da mensagem.

➡️ **“footer”:** texto do rodapé, abaixo da mensagem.

➡️ **“buttons”:** a lista de botões da mensagem.

◽ **“type”:** `quick_reply`.

◽ **“text”:** o rótulo que aparece no botão, e que volta como resposta do cliente.

◽ **“id”:** identificador do botão, para a sua automação saber qual foi tocado.

◽ A mensagem fica gravada no atendimento com uma descrição legível do que foi oferecido: título, texto, rodapé e o rótulo de cada botão entre colchetes.

⚠️ **Resposta de sucesso não garante que o cliente recebeu.** Se o motor recusar o envio — por exemplo com a conexão fora do ar — a recusa vira **nota interna** no atendimento e a resposta ainda volta como sucesso.

##### 📌 Opcional repetir até 3 botões.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X POST 'https://api.chatmasterveloz.com/api/messages/whatsmeow/sendButtonsPRO' \
  -H 'Authorization: Bearer {seutokenaqui}' \
  -H 'Content-Type: application/json' \
  --data '{"openTicket":0,"queueId":0,"body":[{"phone":"5511955892164","title":"Confirmação","body":"Podemos confirmar seu pedido?","footer":"Toque em uma opção","buttons":[{"type":"quick_reply","text":"Sim","id":"opcao_sim"},{"type":"quick_reply","text":"Não","id":"opcao_nao"}]}]}'
```
