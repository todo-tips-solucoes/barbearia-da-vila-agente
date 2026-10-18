---
title: "API Criar Mensagens Template Meta"
slug: api-criar-mensagens-template-meta
category: "Mensagem"
plan: Oficial
method: POST
endpoint: https://api.chatmasterveloz.com/api/waba-templates
source: https://clihelper.chatmasterveloz.com/docs/api-criar-mensagens-template-meta
fetched: 2026-10-14
---
# API Criar Mensagens Template Meta  `Oficial`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-criar-mensagens-template-meta> · [Voltar ao índice](../README.md)

🧩 Cria **um template da API Oficial** e já o envia para análise da Meta.

**API:** Oficial

### Endpoint

```
https://api.chatmasterveloz.com/api/waba-templates
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
    "name": "confirmacao_pedido",
    "category": "UTILITY",
    "language": "pt_BR",
    "header": "Seu pedido",
    "body": "Olá {{1}}, seu pedido {{2}} foi confirmado.",
    "footer": "Equipe de Atendimento",
    "bodyExamples": ["Maria", "12345"],
    "buttons": [
      { "type": "URL", "text": "Acompanhar", "url": "https://exemplo.com/pedido" }
    ]
  }
```

➡️ **“name”:** nome do template — letras minúsculas, números e `_`. **Obrigatório.**

◽ Se a conexão já tiver um template com esse nome, a plataforma acrescenta `_1`, `_2`… e devolve o nome final na resposta.

➡️ **“category”:** `MARKETING`, `UTILITY` ou `AUTHENTICATION`. **Obrigatório.**

➡️ **“language”:** código de idioma da Meta — `pt_BR`, `en_US`, `es_ES`… **Obrigatório.**

➡️ **“body”:** o texto da mensagem, com as variáveis escritas como `{{1}}`, `{{2}}`. **Obrigatório.**

➡️ **“bodyExamples”:** um exemplo para cada variável do `body`, na ordem. **Obrigatório quando o `body` tem variável** — a Meta recusa template com `{{1}}` sem exemplo.

➡️ **“header”:** cabeçalho opcional. Pode ser só o texto, como no exemplo, ou um objeto de mídia: `{ "type": "IMAGE", "media": "https://exemplo.com/banner.jpg" }`.

◽ O `type` aceita `TEXT`, `IMAGE`, `VIDEO`, `DOCUMENT` ou `LOCATION`.

◽ Limites da Meta para a mídia de exemplo: imagem JPEG ou PNG até 5 MB, vídeo MP4 ou 3GPP até 16 MB, documento PDF até 100 MB.

➡️ **“mediaSample”:** opcional — o endereço público da mídia de exemplo do cabeçalho.

➡️ **“footer”:** rodapé opcional — texto curto, sem variáveis.

➡️ **“buttons”:** lista opcional de botões. Cada um tem `type` e `text`:

◽ `QUICK_REPLY` — só o texto.

◽ `URL` — com o campo `url`, que aceita variável: `https://exemplo.com/{{1}}`.

◽ `PHONE_NUMBER` — com o campo `phone_number`, no formato `+5511999998888`.

⚠️ A chamada **já envia o template para análise da Meta** — não existe criar sem enviar. A resposta volta com `"status": "PENDING"` e o `id` do template — guarde-o para acompanhar a aprovação. Quem aprova é a Meta, e isso leva de minutos a horas.

⚠️ O template nasce **na conexão da chamada**: a dona do token, quando se usa o token da Conexão, ou a informada quando se usa o Token da Empresa. Um `wabaConnectionId` enviado no corpo é ignorado. Essa conexão precisa ser **oficial da Meta** — com uma conexão por QR Code, a chamada volta com erro 400 dizendo isso.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X POST 'https://api.chatmasterveloz.com/api/waba-templates' \
  -H 'Authorization: Bearer {seutokenaqui}' \
  -H 'Content-Type: application/json' \
  --data '{"name":"confirmacao_pedido","category":"UTILITY","language":"pt_BR","header":"Seu pedido","body":"Olá {{1}}, seu pedido {{2}} foi confirmado.","footer":"Equipe de Atendimento","bodyExamples":["Maria","12345"],"buttons":[{"type":"URL","text":"Acompanhar","url":"https://exemplo.com/pedido"}]}'
```
