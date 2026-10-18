---
title: "API Listar Configurações da Empresa"
slug: api-listar-configuracoes-da-empresa
category: "Extras"
plan: Todas
method: GET
endpoint: https://api.chatmasterveloz.com/api/companies/{companyId}/settings
source: https://clihelper.chatmasterveloz.com/docs/api-listar-configuracoes-da-empresa
fetched: 2026-10-14
---
# API Listar Configurações da Empresa  `Todas`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-listar-configuracoes-da-empresa> · [Voltar ao índice](../README.md)

🧩 Listar as **Configurações da empresa** — as mesmas chaves da tela.

**API:** Todas

### Endpoint

```
https://api.chatmasterveloz.com/api/companies/{companyId}/settings
```

### Método

```
GET
```

### Autenticação

```
Bearer {seutokenaqui}
```

### Payload

```
// sem payload — a empresa vai no endereço
```

➡️ **“companyId”:** ID da **sua** empresa — vai no próprio endereço, no lugar de `{companyId}`. **Obrigatório.**

◽ O id da sua empresa aparece no campo `companyId` das respostas das outras chamadas.

◽ Vêm as chaves da tela **Configurações** — avaliação, fuso horário, carteira, roteador, tipo de bot, webhooks e as demais —, em ordem alfabética, cada uma com o valor e a data da última alteração.

◽ Todo valor vem como **texto**, mesmo o que na tela é sim ou não.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X GET 'https://api.chatmasterveloz.com/api/companies/{companyId}/settings' \
  -H 'Authorization: Bearer {seutokenaqui}'
```
