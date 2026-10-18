---
title: "API Atualizar Contato"
slug: api-atualizar-contato
category: "Contatos"
plan: Todas
method: POST
endpoint: https://api.chatmasterveloz.com/api/contact/update
source: https://clihelper.chatmasterveloz.com/docs/api-atualizar-contato
fetched: 2026-10-14
---
# API Atualizar Contato  `Todas`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-atualizar-contato> · [Voltar ao índice](../README.md)

🧩 Atualiza **um contato** da sua empresa pelo ID.

**API:** Todas

### Endpoint

```
https://api.chatmasterveloz.com/api/contact/update
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
    "id": "31",
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

➡️ **“id”:** ID do contato cadastrado na plataforma.

➡️ **“name”, “email”, “cpfcnpj”, “genero”, “estado”, “cidade”, “endereco”:** dados gerais do contato, de preenchimento livre.

➡️ **“number”:** telefone do contato no formato ddi ddd numero (somente números).

➡️ **“referencia”:** quem indicou o contato.

➡️ **“aniversario”:** data de nascimento no formato ANO-MES-DIA(letra T)HORA:MINUTO — por exemplo, `1982-11-20T07:52`.

➡️ **“carteiraId”:** ID do atendente dono da carteira, quando o recurso estiver habilitado. Deixe vazio ou `null` para não usar.

➡️ **“acceptAudioMessage”:** `true` se o contato aceita receber áudio.

➡️ **“active”:** `false` bloqueia o contato.

➡️ **“disableBot”:** `true` desliga o robô para este contato.

➡️ **“compartilhado”:** `true` faz o contato aparecer para todos na lista de **Enviar contato**.

➡️ **“promptId”:** ID do prompt de IA ligado ao contato.

➡️ **“extraInfo”:** campos adicionais do contato, em pares de `name` e `value`. Repita o par para cada informação extra.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X POST 'https://api.chatmasterveloz.com/api/contact/update' \
  -H 'Authorization: Bearer {seutokenaqui}' \
  -H 'Content-Type: application/json' \
  --data '{"id":"31","name":"José Silva","number":"5511955892164","email":"email@email.com","cpfcnpj":"000.111.222-33","genero":"masculino","estado":"SP","cidade":"São Paulo","referencia":"indicado por Lucas","aniversario":"1982-11-20T07:52","endereco":"Av Principal 987","carteiraId":"","extraInfo":[{"name":"Tamanho","value":"1,80 m"},{"name":"Peso","value":"90 kg"}]}'
```
