---
title: "API Botão Carrossel"
slug: api-botao-carrossel
category: "Botões no WhatsApp"
plan: Pro
method: POST
endpoint: https://api.chatmasterveloz.com/api/messages/whatsmeow/sendCarousel
source: https://clihelper.chatmasterveloz.com/docs/api-botao-carrossel
fetched: 2026-10-14
---
# API Botão Carrossel  `Pro`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-botao-carrossel> · [Voltar ao índice](../README.md)

🧩 Envia um **carrossel de cartões**, cada um com imagem, texto e botões próprios.

**API:** Pro

### Endpoint

```
https://api.chatmasterveloz.com/api/messages/whatsmeow/sendCarousel
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
    "openTicket": 0,
    "queueId": 0,
    "cards": [
        {
          "title": "Produto 1",
          "body": "Descrição do produto",
          "footer": "R$ 99,90",
          "imageUrl": "https://picsum.photos/400/400",
          "buttons": [
            {"id": "comprar_1", "text": "Comprar"},
            {"id": "info_1", "text": "Mais info"}
          ]
        },
        {
          "title": "Produto 2",
          "body": "Outro produto incrível",
          "footer": "R$ 149,90",
          "imageUrl": "https://picsum.photos/401/401",
          "buttons": [
            {"id": "comprar_2", "text": "Comprar"}
          ]
        }
    ]
}
```

➡️ **“number”:** telefone do destinatário no formato ddi ddd numero (somente números).

➡️ **“openTicket”:** `0` não abre ticket e `1` abre. Para abrir é obrigatório informar um Setor em `queueId`, e a conversa vai para **Aguardando** mesmo que já esteja em atendimento.

➡️ **“queueId”:** ID do Setor desejado (só funciona quando `"openTicket": "1"`).

➡️ **“cards”:** a lista de cartões do carrossel. **Obrigatório**, com pelo menos um.

◽ **“title”** e **“body”:** obrigatórios em **cada** cartão — sem um deles a chamada é recusada inteira.

◽ **“footer”:** texto do rodapé do cartão.

◽ **“imageUrl”:** endereço público da imagem do cartão.

◽ **“buttons”:** os botões daquele cartão, cada um com `id` e `text`.

◽ O `caption` e o `footer` do nível de cima são aceitos, mas **não chegam ao cliente**: só o que está dentro de cada cartão é enviado.

◽ A mensagem fica gravada no atendimento como **Carrossel Enviado**.

⚠️ **Resposta de sucesso não garante que o cliente recebeu.** Se o motor recusar o envio — por exemplo com a conexão fora do ar — a recusa vira **nota interna** no atendimento e a resposta ainda volta como sucesso.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X POST 'https://api.chatmasterveloz.com/api/messages/whatsmeow/sendCarousel' \
  -H 'Authorization: Bearer {seutokenaqui}' \
  -H 'Content-Type: application/json' \
  --data '{"number":"5511955892164","openTicket":0,"queueId":0,"cards":[{"title":"Produto 1","body":"Descrição do produto","footer":"R$ 99,90","imageUrl":"https://picsum.photos/400/400","buttons":[{"id":"comprar_1","text":"Comprar"},{"id":"info_1","text":"Mais info"}]},{"title":"Produto 2","body":"Outro produto incrível","footer":"R$ 149,90","imageUrl":"https://picsum.photos/401/401","buttons":[{"id":"comprar_2","text":"Comprar"}]}]}'
```
