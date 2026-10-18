---
title: "API Deletar Oportunidade V1"
slug: api-deletar-oportunidade-v1
category: "CRM"
plan: Todas
method: DELETE
endpoint: https://api.chatmasterveloz.com/api/oportunidade
source: https://clihelper.chatmasterveloz.com/docs/api-deletar-oportunidade-v1
fetched: 2026-10-14
---
# API Deletar Oportunidade V1  `Todas`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-deletar-oportunidade-v1> · [Voltar ao índice](../README.md)

🧩 Apaga **uma oportunidade** permanentemente.

**API:** Todas

### Endpoint

```
https://api.chatmasterveloz.com/api/oportunidade
```

### Método

```
DELETE
```

### Autenticação

```
Bearer {seutokenaqui}
```

### Payload

```json
{
  "id": 147
}
```

➡️ **“id”:** ID da oportunidade. **Obrigatório.**

⚠️ **Não há como desfazer.** A exclusão é permanente.

⚠️ **A empresa precisa estar no CRM antigo.** Se já estiver no CRM novo, esta chamada é recusada — o registro não apareceria em quadro nenhum.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X DELETE 'https://api.chatmasterveloz.com/api/oportunidade' \
  -H 'Authorization: Bearer {seutokenaqui}' \
  -H 'Content-Type: application/json' \
  --data '{"id":147}'
```
