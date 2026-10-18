---
title: "API Enviar Figurinha"
slug: api-enviar-figurinha
category: "Mensagem"
plan: Pro
method: POST
endpoint: https://api.chatmasterveloz.com/api/figurinhas/enviar
source: https://clihelper.chatmasterveloz.com/docs/api-enviar-figurinha
fetched: 2026-10-14
---
# API Enviar Figurinha  `Pro`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-enviar-figurinha> · [Voltar ao índice](../README.md)

🧩 Envia uma **figurinha da biblioteca** em um atendimento.

**API:** Pro, Oficial

### Endpoint

```
https://api.chatmasterveloz.com/api/figurinhas/enviar
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
    "ticketId": 700,
    "figurinhaId": "{figurinhaId}"
}
```

➡️ **“ticketId”:** o atendimento. Informe este ou o `number`.

➡️ **“figurinhaId”:** ID da figurinha na biblioteca da empresa. **Obrigatório.**

➡️ **“queueId”:** opcional. Setor para o atendimento que ainda **não tem** Setor; o que já tem fica como está.

➡️ **“quotedMsgId”:** opcional. ID interno da mensagem deste atendimento que a figurinha vai citar. De outro atendimento, é ignorado.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X POST 'https://api.chatmasterveloz.com/api/figurinhas/enviar' \
  -H 'Authorization: Bearer {seutokenaqui}' \
  -H 'Content-Type: application/json' \
  --data '{"ticketId":700,"figurinhaId":"{figurinhaId}"}'
```
