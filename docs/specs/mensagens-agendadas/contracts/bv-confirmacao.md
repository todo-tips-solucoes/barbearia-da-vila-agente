# Contrato: sub-workflow bv-confirmacao `[PROPOSTA — a validar na implementação]`

Chamado por (a) `bv-recepcao`, ao reconhecer a seleção da lista de confirmação, e (b) o agente, ferramenta
`confirmar_presenca` (texto livre, FR-009). Execute Workflow Trigger, sem salvar dados de execução
(`saveData*` = `none`), como o `interpretar-midia`.

## Entrada

| Campo | Tipo | Obrig. | Regra |
|-------|------|--------|-------|
| `contato_id` | int | sim | contato da mensagem recebida; na ferramenta do agente é injetado pelo workflow, nunca pelo modelo |
| `origem` | `titulo` \| `id` \| `agente` | sim | caminho de reconhecimento (research D6/D8) |
| `confirmado` | bool | sim | `true` = confirmar; `false` = não vou poder |
| `mensagem_id` | int | se `id`/`agente` | id de `mensagens_agendadas`; recusado se não for `confirmacao` do mesmo `contato_id` |

Reconhecimento na recepção (`shared/rajada.js`, normalização):

- `origem=titulo`: evento `start`, `fromMe` ≠ `true`, uma única mensagem de texto cujo conteúdo (trim) é igual a
  `mensagens.titulo_sim` ou `mensagens.titulo_nao`, e há confirmação `enviada` sem resposta do contato com
  início ainda no futuro. Com 0 ou 2+ candidatas, segue o fluxo normal (buffer e agente).
- `origem=id` (primário, medido em 2026-10-20): evento `from_internal`, `fromMe` ≠ `true`, com
  `mensagem.dataJson.rawData.event.Message.listResponseMessage.singleSelectReply.selectedRowID` no formato
  `bvc:<int>:(s|n)` (nunca lido do texto) e `contextInfo.stanzaID` = `wid` da lista; qualquer outro valor é
  descartado como hoje. O reenvio da mesma escolha gera evento idêntico: o claim torna o efeito idempotente.
  A seleção de confirmação não gera turno do agente.

## Processamento

1. `origem=titulo` (fallback; o evento com id é o primário): espera `mensagens.espera_texto_s`.
2. Seleciona a linha (por `mensagem_id`, ou a única candidata).
3. Linha `cancelada`/`falhou`, ou início já passou → sem Graces; texto `textos.confirmacao_desatualizada`.
   TESTE: `id_profissional` ≠ barbeiro de teste → sem claim e sem Graces, registra `mensagem|fora_do_teste`.
4. Claim (vínculo inteiro no próprio UPDATE): `UPDATE mensagens_agendadas SET resposta, respondida_em WHERE id = $1
   AND contato_id = $2 AND tipo = 'confirmacao' AND situacao = 'enviada' AND resposta IS NULL RETURNING`. Sem linha
   retornada → já respondida: `origem=titulo` com id ativo → termina em silêncio (dedupe do mesmo toque); demais →
   `textos.confirmacao_repetida`, sem Graces (FR-008).
5. `POST /public/v1/agenda/confirmacao` `{ "idAgenda": "<graces_agendamento_id>", "confirmado": <bool> }`
   (`graces-api/04-agendamentos.md:130-144`; só status 2, senão 409). Sucesso → `textos.confirmacao_ok` ou
   `textos.confirmacao_recusada` (+ `conversas.pedido.confirmacao_recusada`). Erro → `textos.confirmacao_falhou` +
   `falhas_agente` (`mensagem|graces_confirmacao`, `code` do ProblemDetails). Status 0/5xx: até 2 novas chamadas
   (1 s, 5 s). **409 (medido, P1)**: o agendamento já não está "A confirmar" ⇒ idempotente: `confirmado=true` vale `confirmada`; `confirmado=false` vale `recusada` (o agente oferece cancelar/remarcar). Não há conferência por `GET` (atalho registrado em `bvMConfAvaliar`). Falha final (`confirmacao_falhou`): o claim é **liberado** (`resposta = NULL`) para o cliente poder tentar de novo.
6. Envia o texto (só `origem` ≠ `agente`) pelo mesmo construtor de texto e grava em `mensagens` (`saida`). Só contatos de `teste.contatos_escrita` recebem de verdade; os simulados só têm a saída gravada.

Teto: `textos.confirmacao_repetida` no máximo `mensagens.repetida_max_por_hora` vezes por contato; acima disso, silêncio.

## Saída

`{ "ok": bool, "code": "confirmada|recusada|repetida|desatualizada|falhou|fora_do_teste", "texto": "<o que dizer>" }`.
Para `origem=agente`, o agente usa `texto` como orientação e responde ele mesmo.
