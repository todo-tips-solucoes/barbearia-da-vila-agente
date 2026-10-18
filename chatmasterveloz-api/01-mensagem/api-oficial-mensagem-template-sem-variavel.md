---
title: "API Oficial Mensagem Template sem variável"
slug: api-oficial-mensagem-template-sem-variavel
category: "Mensagem"
plan: Oficial
method: POST
endpoint: https://api.chatmasterveloz.com/api/messages/sendMetaCustom
source: https://clihelper.chatmasterveloz.com/docs/api-oficial-mensagem-template-sem-variavel
fetched: 2026-10-14
---
# API Oficial Mensagem Template sem variável  `Oficial`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-oficial-mensagem-template-sem-variavel> · [Voltar ao índice](../README.md)

🧩 Envia uma **mensagem template pela API oficial,** estando previamente aprovada.

**API:** Oficial

### Endpoint

```
https://api.chatmasterveloz.com/api/messages/sendMetaCustom
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
    "name": "vars_001",
    "language": "pt_BR",
    "openTicket": 1,
    "queueId": 100,
    "template": []
}
```

➡️ **“number”:** telefone do destinatário no formato ddi ddd numero (somente números).

➡️ **“name”:** nome do template.

➡️ **“language”:** idioma.

➡️ **“openTicket”:** `0` não abre ticket e `1` abre. Para abrir é obrigatório informar um Setor em `queueId`, e a conversa vai para **Aguardando** mesmo que já esteja em atendimento.

➡️ **“queueId”:** ID do Setor desejado (só funciona quando `"openTicket": "1"`).

➡️ **“template”:** `array vazio`, porque este template não tem variável.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X POST 'https://api.chatmasterveloz.com/api/messages/sendMetaCustom' \
  -H 'Authorization: Bearer {seutokenaqui}' \
  -H 'Content-Type: application/json' \
  --data '{"number":"5511955892164","name":"vars_001","language":"pt_BR","openTicket":1,"queueId":100,"template":[]}'
```
