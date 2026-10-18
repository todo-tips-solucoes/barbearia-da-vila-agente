---
title: "API Editar Mensagem no Painel"
slug: api-editar-mensagem-no-painel
category: "Mensagem"
plan: Todas
method: POST
endpoint: https://api.chatmasterveloz.com/api/messages/edit
source: https://clihelper.chatmasterveloz.com/docs/api-editar-mensagem-no-painel
fetched: 2026-10-14
---
# API Editar Mensagem no Painel  `Todas`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-editar-mensagem-no-painel> · [Voltar ao índice](../README.md)

🧩 Troca o **texto de uma mensagem no painel** e avisa na hora a tela de quem está com o atendimento aberto.

**API:** Todas

### Endpoint

```
https://api.chatmasterveloz.com/api/messages/edit
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
    "message_id": 98765,
    "body": "🎙️ Transcrição: bom dia, quero um orçamento"
}
```

➡️ **“message_id”:** ID da mensagem **no painel**. Informe este ou o `wid`.

◽ É o `mensagem.id` que chega no webhook da conexão, e o `id` de cada item da lista de mensagens do atendimento.

➡️ **“body”:** o texto novo. **Obrigatório.**

➡️ **“ticketId”:** opcional. Estreita a busca: a mensagem precisa ser desse atendimento.

⚠️ **Isto não é a edição de mensagem do WhatsApp.** O cliente não vê nada: só a linha do painel muda. Serve para gravar no balão a transcrição de um áudio ou a descrição de uma imagem ou de um PDF.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X POST 'https://api.chatmasterveloz.com/api/messages/edit' \
  -H 'Authorization: Bearer {seutokenaqui}' \
  -H 'Content-Type: application/json' \
  --data '{"message_id":98765,"body":"🎙️ Transcrição: bom dia, quero um orçamento"}'
```
