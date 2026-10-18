---
title: "API Criar Contato"
slug: api-criar-contato
category: "Contatos"
plan: Todas
method: POST
endpoint: https://api.chatmasterveloz.com/api/contacts
source: https://clihelper.chatmasterveloz.com/docs/api-criar-contato
fetched: 2026-10-14
---
# API Criar Contato  `Todas`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-criar-contato> · [Voltar ao índice](../README.md)

🧩 Cria **um contato** na sua empresa.

**API:** Todas

### Endpoint

```
https://api.chatmasterveloz.com/api/contacts
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
    "name": "José Silva",
    "number": "5511955892164",
    "email": "[email protected]",
    "cpfcnpj": "000.111.222-33",
    "genero": "masculino",
    "estado": "SP",
    "cidade": "São Paulo",
    "referencia": "indicado por Lucas",
    "aniversario": "1982-11-20T07:52",
    "endereco": "Av Principal 987",
    "carteiraId": "",
    "extraInfo": [
        {
            "name": "Tamanho",
            "value": "1,80 m"
        },
        {
            "name": "Peso",
            "value": "90 kg"
        }
    ]
}
```

➡️ **“name”, “email”, “cpfcnpj”, “genero”, “estado”, “cidade”, “endereco”:** dados gerais do contato, de preenchimento livre.

➡️ **“number”:** telefone do contato no formato ddi ddd numero (somente números).

➡️ **“referencia”:** quem indicou o contato.

➡️ **“aniversario”:** data de nascimento no formato ANO-MES-DIA(letra T)HORA:MINUTO — por exemplo, `1982-11-20T07:52`.

➡️ **“carteiraId”:** ID do atendente dono da carteira, quando o recurso estiver habilitado. Deixe vazio ou `null` para não usar.

➡️ **“isValid”:** `true` marca o número como confirmado no WhatsApp. A chamada não confere nada — quem afirma é você.

➡️ **“acceptAudioMessage”:** `true` se o contato aceita receber áudio.

➡️ **“active”:** `false` cria o contato já inativo.

➡️ **“promptId”:** ID do prompt de IA ligado ao contato.

➡️ **“extraInfo”:** campos adicionais do contato, em pares de `name` e `value`. Repita o par para cada informação extra.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X POST 'https://api.chatmasterveloz.com/api/contacts' \
  -H 'Authorization: Bearer {seutokenaqui}' \
  -H 'Content-Type: application/json' \
  --data '{"name":"José Silva","number":"5511955892164","email":"email@email.com","cpfcnpj":"000.111.222-33","genero":"masculino","estado":"SP","cidade":"São Paulo","referencia":"indicado por Lucas","aniversario":"1982-11-20T07:52","endereco":"Av Principal 987","carteiraId":"","extraInfo":[{"name":"Tamanho","value":"1,80 m"},{"name":"Peso","value":"90 kg"}]}'
```
