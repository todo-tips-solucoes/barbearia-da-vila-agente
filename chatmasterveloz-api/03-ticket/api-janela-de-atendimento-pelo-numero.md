---
title: "API Janela de Atendimento pelo Número"
slug: api-janela-de-atendimento-pelo-numero
category: "Ticket"
plan: Todas
method: GET
endpoint: https://api.chatmasterveloz.com/api/janela?number=5511955892164
source: https://clihelper.chatmasterveloz.com/docs/api-janela-de-atendimento-pelo-numero
fetched: 2026-10-14
---
# API Janela de Atendimento pelo Número  `Todas`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-janela-de-atendimento-pelo-numero> · [Voltar ao índice](../README.md)

🧩 Obter a **janela de atendimento** do atendimento mais recente de um número.

**API:** Todas

### Endpoint

```
https://api.chatmasterveloz.com/api/janela?number=5511955892164
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
// sem payload — o número vai na própria URL
```

➡️ **“number”:** telefone do destinatário no formato ddi ddd numero (somente números). **Obrigatório.**

◽ Responde pelo atendimento **mais recente** desse contato na conexão do token.

◽ A resposta diz se a janela está **aberta**, quanto tempo falta para ela fechar e se o envio exige mensagem de template.

◽ A regra muda por canal: na API oficial são 24 horas contadas da última mensagem **do cliente**; no Messenger e no Instagram são 24 horas livres e mais alguns dias só com atendimento humano; nos demais canais não existe janela, e a resposta vem sempre aberta.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X GET 'https://api.chatmasterveloz.com/api/janela?number=5511955892164' \
  -H 'Authorization: Bearer {seutokenaqui}'
```
