---
title: "API Botão Copia e Cola"
slug: api-botao-copia-e-cola-pro
category: "Botões no WhatsApp"
plan: Pro
method: POST
endpoint: https://api.chatmasterveloz.com/api/messages/whatsmeow/sendButtonsPRO
source: https://clihelper.chatmasterveloz.com/docs/api-botao-copia-e-cola-pro
fetched: 2026-10-14
---
# API Botão Copia e Cola  `Pro`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-botao-copia-e-cola-pro> · [Voltar ao índice](../README.md)

🧩 Envia uma mensagem com **botões que copiam um código** ao serem tocados.

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
        "title": "Seu cupom exclusivo",
        "body": "Escolha um cupom conforme seu pedido",
        "footer": "Oferta válida até hoje",
        "buttons": [
            {
            "type": "copy",
            "text": "10% em compras até R$ 100",
            "code": "CUPOM10"
            },
            {
            "type": "copy",
            "text": "20% em compras até R$ 200",
            "code": "CUPOM20"
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

◽ **“type”:** `copy`.

◽ **“text”:** o rótulo que aparece no botão.

◽ **“code”:** o texto que vai para a área de transferência do cliente quando ele toca.

◽ A mensagem fica gravada no atendimento com uma descrição legível do que foi oferecido: título, texto, rodapé e o rótulo de cada botão entre colchetes.

⚠️ **Resposta de sucesso não garante que o cliente recebeu.** Se o motor recusar o envio — por exemplo com a conexão fora do ar — a recusa vira **nota interna** no atendimento e a resposta ainda volta como sucesso.

##### 📌 Opcional repetir até 3 botões.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X POST 'https://api.chatmasterveloz.com/api/messages/whatsmeow/sendButtonsPRO' \
  -H 'Authorization: Bearer {seutokenaqui}' \
  -H 'Content-Type: application/json' \
  --data '{"openTicket":0,"queueId":0,"body":[{"phone":"5511955892164","title":"Seu cupom exclusivo","body":"Escolha um cupom conforme seu pedido","footer":"Oferta válida até hoje","buttons":[{"type":"copy","text":"10% em compras até R$ 100","code":"CUPOM10"},{"type":"copy","text":"20% em compras até R$ 200","code":"CUPOM20"}]}]}'
```
