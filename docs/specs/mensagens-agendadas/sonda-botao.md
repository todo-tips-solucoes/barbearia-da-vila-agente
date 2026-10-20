# Sonda do botão (pai, 2026-10-20)

Medido na conexão 145 (QR Pro), contato de teste do owner (Chat Master `contactId` 138449). O webhook da 145 ficou apontado para o `bv-captura` durante a sonda, foi restaurado para a recepção do TESTE e conferido depois. Agendamento 2422 apagado. Eventos anonimizados em `tests/fixtures/chatmaster/evento-21.json` a `evento-25.json`.

## (a) Mensagem agendada com `buttonValues`: sem botão

- `POST /api/schedules` com `buttonValues: ["Confirmar","Nao vou poder"]`: HTTP 200, id 2422, enviado às 00:32 (São Paulo). O eco `from_internal` traz `interativo: null` e só o texto do `body`: **o agendamento nativo não envia botões na QR Pro**. `buttonValues` só vale para template de canal oficial (doc: `chatmasterveloz-api/01-mensagem/api-criar-agendamento.md`).
- No mesmo instante chegou um evento `acao: "closed"`, sem `mensagem`: o envio agendado com `openTicket: "0"` parece fechar o atendimento. Avaliar o efeito no fluxo, já que a recepção descarta `acao != start`.

## (b) `sendButtonsPRO` com `quick_reply`: botão renderiza, e o toque chega

- `POST /api/messages/whatsmeow/sendButtonsPRO` com `buttons: [{type:"quick_reply", text:"Confirmar", id:"bv_confirmar"}, {type:"quick_reply", text:"Nao vou poder", id:"bv_nao_vou"}]` e `whatsappId: 145`: HTTP 200. O eco traz `interativo.botoes[].valor` = os ids.
- O toque do owner em "Confirmar" gerou 2 eventos:
  1. `acao: "start"`, `fromMe: false`, `mensagem: [{ "type": "text", "text": "Confirmar" }]`. **É o que a recepção processa hoje: chega como texto com o título do botão, sem o id.**
  2. `acao: "from_internal"`, `fromMe: false`, `mensagem.body: "Confirmar"`, com `mensagem.dataJson` (string JSON aninhada) contendo `rawData.event.Message.templateButtonReplyMessage`:
     - `selectedID: "bv_confirmar"`, `selectedDisplayText: "Confirmar"`, `selectedIndex: 0`;
     - `contextInfo.stanzaID` = o `wid` da mensagem de botões enviada (liga a resposta à mensagem original);
     - `contextInfo.quotedMessage.interactiveMessage.InteractiveMessage.NativeFlowMessage.buttons[].buttonParamsJSON` = `{"display_text":..., "id":...}`.

## Consequências para o plano

- A confirmação na véspera precisa sair por `sendButtonsPRO` no horário certo, com um agendador próprio no n8n (fallback já previsto na spec). O agendamento nativo do Chat Master serve só para texto, como lembrete e pós-atendimento.
- Para identificar a resposta há dois caminhos:
  - **(i)** o texto do evento `start` igual ao título do botão, com confirmação pendente para o contato;
  - **(ii)** o `selectedID` e o `stanzaID` do evento `from_internal`, que hoje é descartado pela recepção.

  O (ii) é mais robusto, porque ids únicos por agendamento (ex.: `bv_conf_<idAgenda>`) evitam ambiguidade. Mas exige aceitar esse evento e ler o `dataJson`.
- Anonimizador (`scripts/capturar-webhook.py fixtures`):
  - grava a partir de `evento-01` e sobrescreve fixtures existentes; corrigido à mão para 21 a 25;
  - não entra no `dataJson` (string), que vazou nome e lid; os campos foram mascarados à mão.

  Corrigir o script antes da próxima captura.

## Decisão do owner (2026-10-20, após a sonda)

> "o seletor de botao no qual eu fiz teste agora, apenas para api oficial. vamos evitar de usar para api qrcode. para confirmação de agendamento use o botao em lista."

O botão `quick_reply` (`sendButtonsPRO`) fica reservado para a API Oficial e não é usado na conexão QR Pro (145). A confirmação de agendamento usa o **botão em lista** (`sendListPRO`), o mesmo já usado pelo agente.
