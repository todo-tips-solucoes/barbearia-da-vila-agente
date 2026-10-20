# Contrato: envio das mensagens agendadas (bv-mensagens → Chat Master)

Fontes: `docs/specs/agente-conversacional-graces/contracts/saida-chatmaster.md` (formato real em uso pelo
`entregar-rajada`, nó `Saidas`), `chatmasterveloz-api/01-mensagem/api-mensagem-de-texto.md`,
`api-mensagem-de-lista-pro.md`. Credencial `httpHeaderAuth` do Chat Master já existente (`credenciais.chatmaster`).
`whatsappId` = `{{BV:chatmaster.whatsapp_id}}` (145 no TESTE) em toda chamada.

## Confirmação (véspera): lista

`POST https://api.chatmasterveloz.com/api/messages/whatsmeow/sendListPRO`

```json
{ "number": "<dígitos do contato>", "openTicket": "1", "queueId": "0", "whatsappId": "145",
  "body": { "Desc": "<texto humanizado: serviço, barbeiro, dia, hora>",
            "ButtonText": "{{BV:textos.lista_botao}}", "TopText": "{{BV:textos.lista_topo}}",
            "List": [ { "RowId": "bvc:<id>:s", "title": "{{BV:mensagens.titulo_sim}}", "desc": "" },
                      { "RowId": "bvc:<id>:n", "title": "{{BV:mensagens.titulo_nao}}", "desc": "" } ] } }
```

Mesmo shape do `sendListPRO` do agente (contrato de referência acima). `openTicket: "1"` + `queueId: "0"` mantém o
status do ticket (`0` encerraria). Decisão do owner (dec-007): lista, nunca `sendButtonsPRO`, na QR Pro.
`[A MEDIR]` P4: exibição da lista de 2 linhas no aparelho do owner.

## Lembrete e pós-atendimento: texto

`POST /api/messages/send` `{"number","openTicket":"0","queueId":"0","whatsappId","body":"<texto>"}`; contato
`@lid` usa `/api/messages/whatsmeow/sendTextPROLid` com o valor intacto, igual ao `Saidas`.

## Decisão pelo resultado

| HTTP | Efeito |
|------|--------|
| 2xx | `situacao='enviada'`, `enviada_em=now()`; texto gravado em `mensagens` como `saida` |
| 4xx/5xx com resposta | `tentativas+1`; < 3 → `proxima_tentativa_em` = +1/5/15 min; 3ª → `falhou` (`recusada_canal`) |
| 0 / timeout | `falhou` (`incerto`), sem reenvio (SC-007) |

Toda falha → `falhas_agente` (`tipo='mensagem'`), sem número nem texto.

## Resposta do cliente (entrada)

Ver [bv-confirmacao.md](bv-confirmacao.md). O formato do evento de seleção de lista é `[A MEDIR]` (research P3).
