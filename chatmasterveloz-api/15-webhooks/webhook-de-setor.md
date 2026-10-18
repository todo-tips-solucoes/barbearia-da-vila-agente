---
title: "Webhook do Setor"
slug: webhook-de-setor
category: "Webhooks"
source: https://clihelper.chatmasterveloz.com/docs/webhook-de-setor
fetched: 2026-10-14
---
# Webhook do Setor

> Fonte: <https://clihelper.chatmasterveloz.com/docs/webhook-de-setor> · [Voltar ao índice](../README.md)

🧩 O **Webhook do Setor** avisa o seu sistema sobre o que acontece nos atendimentos de **um Setor**. É o recorte de quem só se interessa por uma parte da operação — a triagem, o time de vendas, o financeiro — e não quer o canal inteiro.

O aviso é enviado toda vez que um atendimento daquele Setor:

◽ **recebe** uma mensagem.

◽ **envia** uma mensagem.

◽ é **aberto ou encerrado**.

◽ tem uma **tag** alterada.

⚠️ **Com o webhook da Conexão ligado ao mesmo tempo, o aviso sai duas vezes.** Enquanto o atendimento está no Setor escolhido, os dois disparam; fora dele, só o da Conexão. Se o seu sistema processa a mesma mensagem duas vezes, é aqui que se olha primeiro.

### Onde ligar

Acesse o menu **Setores & Chatbot → editar o Setor** e preencha o campo **URL do Webhook** com o endereço do seu sistema.

Esse endereço precisa aceitar **POST** com corpo em JSON.

⚠️ **Estes avisos carregam o token da Conexão** (nos campos `token_origin`, `connection_token` e `ticketData.whatsapp.token`), além do telefone e do nome do contato. Aponte apenas para endereços seus, sob HTTPS, e não registre o corpo inteiro em log acessível a terceiros.

### O campo que separa um aviso do outro

Tudo chega no mesmo endereço, e é o **`acao`** que diz o que aconteceu:

| `acao` | O que aconteceu |
|---|---|
| `start` | chegou uma mensagem — é o aviso do conteúdo como ele veio |
| `from_internal` | a mensagem foi gravada no atendimento — canal **Oficial** |
| `fila-data` | a mensagem foi gravada no atendimento — canais por **QR Code** |
| `open` · `closed` | o atendimento abriu ou foi encerrado |
| `tag-sync` | as tags do atendimento mudaram |

⚠️ **No aviso de tag a chave se chama `action`**, e não `acao`. Quem verifica apenas `acao` deixa de reconhecê-lo.

📌 **Os campos abaixo não são a lista completa do payload.** Cada aviso traz dezenas de campos, e eles mudam de uma versão da plataforma para outra.

### Exemplo de payload de Mensagem

Uma mensagem **recebida** gera **dois avisos**, com um segundo de diferença: primeiro o `start`, com o conteúdo como veio; depois o que grava a mensagem no atendimento — `from_internal` no canal Oficial, `fila-data` nos canais por QR Code. A mensagem **enviada** costuma gerar só o segundo.

É esse segundo aviso que vale a pena tratar: ele traz o texto final e o identificador da mensagem.

```json
{
  "acao": "from_internal",
  "sender": "554199999999",
  "name": "José Cliente",
  "chamadoId": 15321,
  "queueId": 5,
  "fromMe": false,
  "isGroup": false,
  "companyId": 8,
  "defaultWhatsapp_x": 27,
  "backendURL": "https://backend_url.com.br",
  "token_origin": "SEU_TOKEN_DA_CONEXAO",
  "mensagem": {
    "id": 1669479,
    "wid": "wamid.HBgMNTU0MTk5OTk5OTk5FQIAEhggQTUwOTY3QTAw",
    "body": "Está faltando acento no glúten",
    "fromMe": false,
    "userId": null,
    "fromApp": false,
    "mediaType": null,
    "mediaUrl": null
  },
  "ticketData": { "id": 15321, "status": "open", "protocolo": "54212" }
}
```

◽ `queueId` — o Setor do atendimento. É ele que decide se este aviso sai.

◽ `sender` — o número do cliente, sempre.

◽ `name` — muda de conteúdo conforme a direção: quando a mensagem foi **recebida**, traz o nome do cliente; quando foi **enviada**, traz o celular dele.

◽ `chamadoId` — o identificador do atendimento (número do ticket). É a chave para amarrar mensagens da mesma conversa.

◽ `fromMe` — **é o campo que diz a direção**: `false` quando o cliente mandou, `true` quando a mensagem saiu daqui.

◽ `backendURL` — o endereço do backend da sua instalação.

◽ `mensagem` — **muda de formato conforme o aviso.** No `from_internal` é um **objeto** com a mensagem já gravada. No `start` é uma **lista** com as partes do conteúdo. Nos canais por QR Code o texto está em `msg.message`, e não aqui.

◽ `mensagem.body` — o texto da mensagem. Quando o cliente manda um áudio e a transcrição está ligada, é aqui que o texto transcrito aparece.

◽ `mensagem.wid` — o identificador da mensagem no canal. É por ele que se evita processar a mesma mensagem duas vezes.

◽ `mensagem.userId` e `mensagem.fromApp` — dizem **quem** enviou, quando `fromMe` é `true`: `userId` preenchido é um atendente pela tela; `fromApp` é alguém pelo celular da conta.

◽ `ticketData` — o retrato do atendimento no momento do evento. Vale a pena guardar `ticketData.status` (`open`, `pending` ou `closed`), `ticketData.protocolo` (o número que o cliente enxerga), `ticketData.userId` e `ticketData.contact.number`.

##### ❔Dúvidas Comuns

**Como sei se a mensagem foi enviada ou recebida?** Pelo campo `fromMe`: `false` é do cliente para você, `true` é de você para o cliente. Não use o campo `name` para isso — ele muda de conteúdo conforme a direção.
