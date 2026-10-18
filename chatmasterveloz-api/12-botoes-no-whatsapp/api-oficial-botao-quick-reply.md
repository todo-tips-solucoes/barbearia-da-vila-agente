---
title: "API Oficial Botão Quick Reply"
slug: api-oficial-botao-quick-reply
category: "Botões no WhatsApp"
plan: Oficial
method: POST
endpoint: https://api.chatmasterveloz.com/api/messages/sendInteractive
source: https://clihelper.chatmasterveloz.com/docs/api-oficial-botao-quick-reply
fetched: 2026-10-14
---
# API Oficial Botão Quick Reply  `Oficial`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-oficial-botao-quick-reply> · [Voltar ao índice](../README.md)

🧩 Envia uma mensagem com **botões de resposta rápida**, estando com a Janela de Atendimento ao Cliente **aberta**.

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
    "type": "button",
    "header": {
      "type": "text",
      "text": "Promoção especial"
    },
    "body": {
      "text": "Temos uma oferta exclusiva para você. Como deseja prosseguir?"
    },
    "footer": {
        "text": "Válido até 31/12"
    },
    "buttons": [
      {
        "type": "reply",
        "reply": {
          "id": "ver_produtos",
          "title": "Ver produtos"
        }
      },
      {
        "type": "reply",
        "reply": {
          "id": "falar_vendedor",
          "title": "Falar com vendedor"
        }
      }
    ],
    "openTicket": 1,
    "queueId": 1
}
```

➡️ **“number”:** telefone do destinatário no formato ddi ddd numero (somente números).

➡️ **“type”:** `button`. **Obrigatório.**

➡️ **“header”:** cabeçalho opcional. Pode ser texto, imagem, vídeo ou documento, no formato da Meta.

◽ **Texto:** `{"type": "text", "text": "Meu cabeçalho"}`

◽ **Imagem:** `{"type": "image", "image": {"link": "https://meusite.com.br/foto.jpg"}}`

◽ **Vídeo:** `{"type": "video", "video": {"link": "https://meusite.com.br/video.mp4"}}`

◽ **Documento:** `{"type": "document", "document": {"link": "https://meusite.com.br/catalogo.pdf", "filename": "catalogo.pdf"}}`

◽ **Áudio não existe** no cabeçalho: a Meta não aceita.

➡️ **“body”:** o texto da mensagem, dentro de `text`. Até **1024 caracteres**. **Obrigatório.**

➡️ **“footer”:** rodapé opcional, dentro de `text`.

➡️ **“buttons”:** de 1 a **3** botões, todos do tipo `reply`. **Obrigatório.**

◽ **id:** identificador do botão, para a sua automação saber qual foi tocado.

◽ **title:** o rótulo que o cliente vê, até **20 caracteres**.

◽ Botão de link, de telefone ou de copiar código **não existe aqui** — nesta chamada todos são de resposta.

➡️ **“queueId”:** ID do Setor para onde a conversa vai quando `"openTicket": 1`.

⚠️ **Aqui o `openTicket` não funciona como nas outras chamadas:** `1` deixa a conversa em **Aguardando** no Setor de `queueId`; **qualquer outro valor — inclusive não enviar o campo — ENCERRA o atendimento** depois do envio.

◽ Só passa dentro da **janela de 24 horas**. Fora dela a Meta recusa, e o caminho é um template aprovado.

◽ A mensagem fica gravada no atendimento com o texto e os rótulos dos botões.

◽ Recusa da Meta vira mensagem de erro dentro do próprio atendimento.

##### 📌 Opcional repetir até 3 botões.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X POST 'https://api.chatmasterveloz.com/api/messages/sendInteractive' \
  -H 'Authorization: Bearer {seutokenaqui}' \
  -H 'Content-Type: application/json' \
  --data '{"number":"5511955892164","type":"button","header":{"type":"text","text":"Promoção especial"},"body":{"text":"Temos uma oferta exclusiva para você. Como deseja prosseguir?"},"footer":{"text":"Válido até 31/12"},"buttons":[{"type":"reply","reply":{"id":"ver_produtos","title":"Ver produtos"}},{"type":"reply","reply":{"id":"falar_vendedor","title":"Falar com vendedor"}}],"openTicket":1,"queueId":1}'
```
