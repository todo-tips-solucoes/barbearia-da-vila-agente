---
title: "API Importar Sessão"
slug: api-importar-sessao
category: "Conexões"
plan: Pro
method: POST
endpoint: https://api.chatmasterveloz.com/api/whatsapp/importSession
source: https://clihelper.chatmasterveloz.com/docs/api-importar-sessao
fetched: 2026-10-14
---
# API Importar Sessão  `Pro`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-importar-sessao> · [Voltar ao índice](../README.md)

🧩 Restaura **uma sessão exportada** em uma conexão, sem precisar ler o QR Code.

**API:** Pro

### Endpoint

```
https://api.chatmasterveloz.com/api/whatsapp/importSession
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
    "dump": {
        "device": {
            "id": "5511999999999:[email protected]",
            "noiseKey": "…",
            "identityKey": "…"
        },
        "appStateSyncKeys": [],
        "appStateVersions": {}
    }
}
```

➡️ **“dump”:** o conteúdo da sessão exportada — as chaves do aparelho e o estado da conta. **Obrigatório.**

◽ Pode ir como objeto ou como texto JSON. Também são aceitos o nome `session` no lugar de `dump`, ou o próprio conteúdo solto na raiz do corpo.

➡️ **“whatsappId”:** ID da conexão que vai receber a sessão.

⚠️ **Só funciona em conexão do canal Pro.** Em outro canal a chamada é recusada, e nada muda.

◽ A subida da sessão acontece em segundo plano: a chamada volta e a tela de conexões é avisada quando o servidor responder.

◽ Conteúdo ausente, texto que não é JSON válido ou JSON que não é um objeto são recusados antes de qualquer coisa acontecer.

◽ Se o servidor da sessão não responder a tempo, a resposta diz isso — a espera padrão é de 2 minutos.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X POST 'https://api.chatmasterveloz.com/api/whatsapp/importSession' \
  -H 'Authorization: Bearer {seutokenaqui}' \
  -H 'Content-Type: application/json' \
  --data '{"whatsappId":12,"dump":{"device":{"id":"5511999999999:12@s.whatsapp.net","noiseKey":"…","identityKey":"…"},"appStateSyncKeys":[],"appStateVersions":[]}}'
```
