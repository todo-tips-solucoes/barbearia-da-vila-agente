---
title: "API Validar Contato"
slug: api-validar-contato
category: "Contatos"
plan: Básica
method: POST
endpoint: https://api.chatmasterveloz.com/api/isValid
source: https://clihelper.chatmasterveloz.com/docs/api-validar-contato
fetched: 2026-10-14
---
# API Validar Contato  `Básica`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-validar-contato> · [Voltar ao índice](../README.md)

🧩 Verifica **se um número é válido no WhatsApp**. Quando é, o número volta já formatado com a quantidade certa de dígitos — 8 ou 9.

**API:** Básica, Pro

### Endpoint

```
https://api.chatmasterveloz.com/api/isValid
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
    "number": "5511955892164"
}
```

⚠️ A validação só funciona com duas condições atendidas: no menu **Configurações → Ignorar Validação de Contatos?** o valor precisa ser **Não**, e no menu **Conexões** precisa haver uma Conexão marcada como **Padrão**.

➡️ **“number”:** telefone do contato no formato ddi ddd numero (somente números).

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X POST 'https://api.chatmasterveloz.com/api/isValid' \
  -H 'Authorization: Bearer {seutokenaqui}' \
  -H 'Content-Type: application/json' \
  --data '{"number":"5511955892164"}'
```
