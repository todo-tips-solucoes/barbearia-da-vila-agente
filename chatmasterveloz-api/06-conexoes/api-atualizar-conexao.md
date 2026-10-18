---
title: "API Atualizar Conexão"
slug: api-atualizar-conexao
category: "Conexões"
plan: Todas
method: POST
endpoint: https://api.chatmasterveloz.com/api/whatsapp/update
source: https://clihelper.chatmasterveloz.com/docs/api-atualizar-conexao
fetched: 2026-10-14
---
# API Atualizar Conexão  `Todas`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-atualizar-conexao> · [Voltar ao índice](../README.md)

🧩 Atualiza os dados de **uma conexão** — só o que vier no corpo muda.

**API:** Todas

### Endpoint

```
https://api.chatmasterveloz.com/api/whatsapp/update
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
    "whatsappId": 12,
    "name": "Comercial",
    "greetingMessage": "Olá! Em que podemos ajudar?",
    "queueIds": [3, 16],
    "webhook": "https://minha-automacao.com.br/hook"
}
```

➡️ **“whatsappId”:** ID da conexão a editar.

◽ Com o token de uma conexão, sem este campo, edita a **própria** conexão do token; com ele, dá para editar outra conexão **da mesma empresa**.

➡️ **“name”:** nome da conexão, com pelo menos 2 caracteres.

➡️ **“greetingMessage”:** a saudação ao abrir o atendimento. É obrigatória quando a conexão tem 2 ou mais Setores.

➡️ **“queueIds”:** IDs dos Setores da conexão. **Substitui a lista inteira** — o que não vier sai.

➡️ **“webhook”:** endereço do webhook principal.

◽ Os campos que você não enviar ficam como estão.

◽ Campo fora da lista não é gravado e volta na resposta como ignorado. A resposta também diz o que foi de fato alterado.

◽ **Outras mensagens automáticas:** `complationMessage`, `outOfHoursMessage`, `ratingMessage`, `closeMessage`, `newFollowerMessage`.

◽ **Comportamento do atendimento:** `inatividade` e `inatividadeNQ` (minutos para encerrar, com e sem Setor), `selectedInterval` e `selectedMoveQueueId` (mover depois de um tempo), `reopenAsNewTicket`, `transferAsNewTicket`, `respostaNaVoltaBot`, `markasread`, `allowEcho`, `blockgroupatconnection`, `importmessages`, `ignoreNumbers`.

◽ **Chat Externo:** `alternativeMode`, `textoBotaoLink`, `mensagemBotaoLink`, `chatExternoAutenticado`.

◽ **Integrações:** `webhookb`, `token` (o token de API da conexão, único na instalação), `iframe`, `expandDrawer`, `iframeFirst`, `excluded` (CRM), `excludedwpw` (Pixel da Meta), `ixcrandom`.

◽ **Canal e infraestrutura:** `telegram_token`, `bloquearForaDaJanela` (barra mensagem comum fora da janela, na API oficial), `selectedCommentQueueId` (Setor dos comentários do Instagram), `proxyAddress`, `proxyUsername`, `proxyPassword`, `whavoip_token`, `voipPrefix`, `sipConfig`.

◽ **Aparência:** `isDefault` (torna esta a conexão padrão e desmarca a anterior) e `coverImage`.

◽ A senha do proxy e a configuração SIP **não voltam** na resposta.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X POST 'https://api.chatmasterveloz.com/api/whatsapp/update' \
  -H 'Authorization: Bearer {seutokenaqui}' \
  -H 'Content-Type: application/json' \
  --data '{"whatsappId":12,"name":"Comercial","greetingMessage":"Olá! Em que podemos ajudar?","queueIds":[3,16],"webhook":"https://minha-automacao.com.br/hook"}'
```
