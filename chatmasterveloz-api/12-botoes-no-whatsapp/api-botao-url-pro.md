---
title: "API Botão URL"
slug: api-botao-url-pro
category: "Botões no WhatsApp"
plan: Pro
method: POST
endpoint: https://api.chatmasterveloz.com/api/messages/whatsmeow/sendButtonsPRO
source: https://clihelper.chatmasterveloz.com/docs/api-botao-url-pro
fetched: 2026-10-14
---
# API Botão URL  `Pro`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-botao-url-pro> · [Voltar ao índice](../README.md)

🧩 Envia uma mensagem com **botões que abrem um link**.

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
        "title": "Visite nosso site",
        "body": "Conheça nossos serviços",
        "footer": "Escolha uma opção",
        "buttons": [
         {
           "type": "url",
           "text": "Produtos",
           "url": "https://www.meusite.com.br/produtos"
         },
         {
           "type": "url",
           "text": "Consultoria",
           "url": "https://www.meusite.com.br/consultoria"
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

◽ **“type”:** `url`.

◽ **“text”:** o rótulo que aparece no botão.

◽ **“url”:** o endereço que abre quando o cliente toca.

◽ A mensagem fica gravada no atendimento com uma descrição legível do que foi oferecido: título, texto, rodapé e o rótulo de cada botão entre colchetes.

⚠️ **Resposta de sucesso não garante que o cliente recebeu.** Se o motor recusar o envio — por exemplo com a conexão fora do ar — a recusa vira **nota interna** no atendimento e a resposta ainda volta como sucesso.

##### 📌 Opcional repetir até 3 botões.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X POST 'https://api.chatmasterveloz.com/api/messages/whatsmeow/sendButtonsPRO' \
  -H 'Authorization: Bearer {seutokenaqui}' \
  -H 'Content-Type: application/json' \
  --data '{"openTicket":0,"queueId":0,"body":[{"phone":"5511955892164","title":"Visite nosso site","body":"Conheça nossos serviços","footer":"Escolha uma opção","buttons":[{"type":"url","text":"Produtos","url":"https://www.meusite.com.br/produtos"},{"type":"url","text":"Consultoria","url":"https://www.meusite.com.br/consultoria"}]}]}'
```
