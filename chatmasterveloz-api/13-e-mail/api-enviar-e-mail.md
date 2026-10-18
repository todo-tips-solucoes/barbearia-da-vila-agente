---
title: "API Enviar E-mail"
slug: api-enviar-e-mail
category: "E-mail"
plan: Todas
method: POST
endpoint: https://api.chatmasterveloz.com/api/email/send
source: https://clihelper.chatmasterveloz.com/docs/api-enviar-e-mail
fetched: 2026-10-14
---
# API Enviar E-mail  `Todas`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-enviar-e-mail> · [Voltar ao índice](../README.md)

🧩 Envia um **e-mail** por uma conta de e-mail da empresa.

**API:** Todas

### Endpoint

```
https://api.chatmasterveloz.com/api/email/send
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
    "to": "[email protected]",
    "subject": "Sua proposta",
    "text": "Olá! Segue a proposta que combinamos.",
    "cc": ["[email protected]"],
    "bcc": ["[email protected]"],
    "accountId": 2
}
```

➡️ **“to”:** endereço de quem recebe. **Obrigatório.**

➡️ **“subject”:** o assunto. **Obrigatório.**

➡️ **“text”:** o e-mail em texto simples. Informe este ou o `html`.

➡️ **“html”:** o e-mail em HTML. Informe este ou o `text`.

➡️ **“cc”:** opcional. Lista de endereços em cópia.

➡️ **“bcc”:** opcional. Lista de endereços em cópia oculta.

➡️ **“accountId”:** opcional. A conta de e-mail que envia. Sem ele, vale a **primeira conta ativa** da empresa.

◽ A conta precisa ser da empresa do token e estar ativa.

◽ O e-mail sai com a assinatura da conta e fica guardado em **Enviados**, como qualquer e-mail do painel.

⚠️ **Anexo não disponível.** Esta chamada envia só o texto do e-mail.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X POST 'https://api.chatmasterveloz.com/api/email/send' \
  -H 'Authorization: Bearer {seutokenaqui}' \
  -H 'Content-Type: application/json' \
  --data '{"to":"cliente@exemplo.com","subject":"Sua proposta","text":"Olá! Segue a proposta que combinamos.","cc":["gerente@exemplo.com"],"bcc":["diretoria@exemplo.com"],"accountId":2}'
```
