---
title: "API Atualizar Setor"
slug: api-atualizar-setor
category: "Setores"
plan: Todas
method: POST
endpoint: https://api.chatmasterveloz.com/api/queues/update
source: https://clihelper.chatmasterveloz.com/docs/api-atualizar-setor
fetched: 2026-10-14
---
# API Atualizar Setor  `Todas`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-atualizar-setor> · [Voltar ao índice](../README.md)

🧩 Altera os dados de **um Setor** — só o que vier no corpo muda.

**API:** Todas

### Endpoint

```
https://api.chatmasterveloz.com/api/queues/update
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
    "queueId": 4,
    "name": "Suporte",
    "greetingMessage": "Você está no Suporte. Como podemos ajudar?",
    "outOfHoursMessage": "Voltamos às 8h",
    "ativarRoteador": true,
    "tempoRoteador": 5,
    "schedules": [
        {
            "weekday": "Segunda-feira",
            "weekdayEn": "monday",
            "startTime": "08:00",
            "endTime": "18:00"
        }
    ]
}
```

➡️ **“queueId”:** ID do Setor a editar. **Obrigatório.**

➡️ **“name”:** nome do Setor. Pelo menos 2 caracteres, e único entre os Setores da empresa.

➡️ **“greetingMessage”:** mensagem de saudação do Setor.

➡️ **“outOfHoursMessage”:** mensagem enviada fora do horário de funcionamento.

➡️ **“ativarRoteador”:** liga o rodízio automático de operadores.

➡️ **“tempoRoteador”:** tempo do rodízio, em minutos.

➡️ **“schedules”:** o horário de funcionamento. **Substitui a lista inteira** — o que não vier sai.

⚠️ **Mande pelo menos um campo editável** além do `queueId`. Só com o id, a chamada é recusada.

◽ Os campos que você não enviar ficam como estão.

◽ Campo fora da lista não é gravado e volta na resposta como ignorado. A resposta também diz o que foi de fato alterado.

◽ **Outros campos de atendimento:** `color`, `prioridade`, `isChatbot`, `invalidMessage`, `gatilhos`, `msgEncerramento`, `selectedMoveQueueId`, `ativarRoteadorNoti`, `isNPS`, `isTranscribe`, `categoryId`, `coverImage`, `webhookQueueURL`.

◽ **`templateGroupIds`:** ausente significa "não mexa"; uma lista vazia tira todos os grupos, e o Setor passa a mostrar todos os templates da conexão.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X POST 'https://api.chatmasterveloz.com/api/queues/update' \
  -H 'Authorization: Bearer {seutokenaqui}' \
  -H 'Content-Type: application/json' \
  --data '{"queueId":4,"name":"Suporte","greetingMessage":"Você está no Suporte. Como podemos ajudar?","outOfHoursMessage":"Voltamos às 8h","ativarRoteador":true,"tempoRoteador":5,"schedules":[{"weekday":"Segunda-feira","weekdayEn":"monday","startTime":"08:00","endTime":"18:00"}]}'
```
