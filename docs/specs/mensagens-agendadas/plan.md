# Plano de implementação: mensagens-agendadas

**Feature**: `mensagens-agendadas` | **Data**: 2026-10-20 | **Spec**: [spec.md](spec.md) | **Base**: `regras-negocio-agenda`, `agente-conversacional-graces`, `recepcao-buffer`, `audio-imagem`

## Summary

Quando o agente agenda, reagenda ou cancela na Graces, o `bv-graces` grava (ou cancela) em `mensagens_agendadas`
a confirmação (véspera 18:00), o lembrete (início − 2 h) e o pós-atendimento (término + 1 h). Um workflow novo,
`bv-mensagens`, roda a cada minuto, revalida cada mensagem vencida na Graces e a envia: a confirmação como
**lista** (`sendListPRO`, decisão do owner dec-007) com as opções "Confirmar presença" e "Não vou poder", o resto
como texto. Cancelar ou reagendar é só atualizar o registro local, porque nada é agendado no Chat Master
(dec-008). A seleção da lista chega à recepção em dois eventos (medido): `from_internal` com o `selectedRowID` (caminho primário) e `start` só com o título (fallback); a recepção a entrega a um sub-workflow
novo, `bv-confirmacao`, que chama `POST /agenda/confirmacao` e responde com naturalidade. Texto livre ("vou sim")
vai pelo agente, com uma ferramenta nova. A cada 15 min, o `bv-mensagens` reconcilia com `GET /agenda/completa`.
Só TESTE. Desenho e fontes em [research.md](research.md).

## Technical Context

- **Plataforma**: n8n 2.43.5 self-hosted em `https://n8n2.todo-tips.com`, Postgres 17 (`barbearia_vila_teste`),
  só TESTE (XIII). Fonte: `docs/specs/audio-imagem/plan.md`.
- **Linguagem**: JSON de workflow + JS nos Code nodes (`workflows/shared/*.js` por `{{BV:INCLUDE:...}}`), SQL
  na migração, Python 3 stdlib nos scripts.
- **Dependências externas**: Graces (`/agenda/agendamentos`, `/agenda/confirmacao`, `/agenda/completa`),
  Chat Master (`sendListPRO`, `send`, `sendTextPROLid`). Nenhum pacote novo.
- **Armazenamento**: `mensagens_agendadas` (migração 0010, [data-model.md](data-model.md)), `falhas_agente`
  (`tipo='mensagem'`), `conversas.pedido`, `mensagens` (saídas).
- **Testes**: `node tests/mensagens.test.js` (novo), `python3 -I -m unittest discover -s tests`
  (`test_workflows_mensagens.py` novo, `test_esquema.py`, `test_capturar_webhook.py`), `node tests/rajada.test.js`;
  `scripts/smoke-mensagens.py` no TESTE ([quickstart.md](quickstart.md)).
- **Desempenho**: varredura de 1 min → envio até ~1 min depois do horário; SC-003 (≤ 30 s) no caminho título
  sem espera; com o caminho id ativo, a espera de 10 s cabe no orçamento.
- **Pendências**: nenhum eixo estrutural novo. P1 (status inicial do `POST /agenda`), P2 (efeito em ticket de
  handoff), P3 (formato do evento de seleção de lista — o pai captura uma seleção real), P4 (exibição da lista de
  2 linhas). Ver research "Pendências".

## Constitution Check

| Princípio | Status | Notas |
|-----------|--------|-------|
| II / II-bis trilha e registro | PASS | artefatos em `docs/specs/mensagens-agendadas/`; PR pelo owner |
| III validação estática | PASS | testes node/unittest, `verificar-repo.py`, `varrer-segredos.py` |
| IV / IV-bis dependências | PASS | nada novo |
| V fonte oficial | PASS | campos de Graces/Chat Master citados das docs locais e da sonda; formato da seleção marcado `[A MEDIR]` |
| VI pt-BR | PASS | |
| VII idempotência | PASS | 0010 idempotente; índice único parcial; claim por `UPDATE ... WHERE resposta IS NULL`; `--criar` recusa repetir |
| VIII parametrização fora do rito | PASS | horários e textos em `config/ambientes/*.json` |
| IX Graces fonte da verdade | PASS | revalida antes de enviar e reconcilia a cada 15 min |
| X conversa humanizada | PASS | múltipla escolha como lista (X, constituição 2.0.0) por decisão do owner; textos humanizados |
| XI escrita segura | PASS | só `/agenda/confirmacao` (não libera horário); TESTE só barbeiro de teste |
| XII skills e validação n8n | PASS | `validate_node_config` antes, `get_workflow_details` depois; Schedule Trigger e Execute Workflow nativos |
| XIII isolamento TESTE/PROD | PASS | PROD com ids vazios, deploy recusa |
| XIV segredos e dado mínimo | PASS | `dados` só serviço/barbeiro/fim; motivos sem PII; execução do `bv-confirmacao` não salva dados |
| XV teste antes de produção | PASS | smoke no TESTE com número do owner e barbeiro de teste, limpando tudo |
| XVI zero fabricação | PASS | nenhum campo de evento de lista afirmado sem fixture; P3 fecha com captura real |

Re-check pós-design: PASS. Um workflow agendado e um sub-workflow novos são o mínimo (o `bv-vigia` já é agendado
a cada 5 min, mas varredura de 1 min e reconciliação com a Graces não são vigilância da recepção).

## Arquitetura

```text
bv-graces (proposta executada) --Persistir+CTEs--> mensagens_agendadas (pendente)
bv-mensagens  Schedule 1 min  --> reservar vencidas --> GET /agenda/agendamentos --> sendListPRO | send --> enviada|falhou|cancelada
              Schedule 15 min --> GET /agenda/completa --> cancelar órfãs / criar faltantes (bvMProgramar)
bv-recepcao   from_internal com selectedRowID bvc:<id>:(s|n) (ou start com título, fallback) + confirmação aberta --> bv-confirmacao --> POST /agenda/confirmacao --> texto
entregar-rajada  contexto com confirmações abertas; ferramenta confirmar_presenca --> bv-confirmacao (origem=agente)
```

## Project Structure

```text
db/migrations/0010_mensagens_agendadas.sql           # novo
workflows/shared/mensagens.js                        # novo: bvMProgramar, bvMTexto, bvMLista, bvMResultadoEnvio, bvMReconciliar
workflows/shared/rajada.js                           # reconhecer selectedRowID da lista (primário) e título (fallback)
workflows/shared/graces.js                           # efeitos de programação na proposta executada
workflows/shared/agente.js                           # prompt/contexto: confirmações abertas, ferramenta confirmar_presenca
workflows/bv-mensagens.json                          # novo (varredura + reconciliação)
workflows/sub/bv-confirmacao.json                    # novo
workflows/bv-recepcao.json, workflows/sub/bv-graces.json, workflows/sub/entregar-rajada.json   # alterados
config/ambientes/integracao.json, producao.json      # mensagens.*, textos.confirmacao_*, workflows
scripts/capturar-webhook.py                          # numeração sem sobrescrever; anonimizar dataJson
scripts/smoke-mensagens.py                           # novo
tests/mensagens.test.js, tests/test_workflows_mensagens.py   # novos
tests/fixtures/chatmaster/evento-22.json, evento-24.json     # acao restaurada
workflows/README.md, docs/infra.md                   # documentação
```

## Convenções de Borda

| Camada | Case style | Validação | Fonte da verdade |
|--------|------------|-----------|------------------|
| Colunas Postgres | snake_case | CHECK + migração | `db/migrations/0010_mensagens_agendadas.sql` |
| Graces (payload) | camelCase (`idAgenda`, `horaInicio`, `idStatusAgenda`) | código HTTP + ProblemDetails `code` | `graces-api/04-agendamentos.md` |
| Chat Master (payload) | campos da API (`number`, `body.List[].RowId`, `title`) | status HTTP | `contracts/envio-chatmaster.md` |
| Config | snake_case com pontos (`mensagens.titulo_sim`) | placeholders `{{BV:...}}` no deploy | `config/ambientes/*.json` |
| JS compartilhado | camelCase, prefixo `bvM` | `tests/mensagens.test.js` | `workflows/shared/mensagens.js` |

Mapper: os Code nodes convertem Graces → linha (`horaInicio`→`inicio`, `idProfissional`→`id_profissional`).

## Riscos

| Risco | Mitigação |
|-------|-----------|
| Evento de seleção sem id (só título) com 2 confirmações do mesmo contato | cai no agente, que pergunta qual (ferramenta com `mensagem_id`) |
| Agendamento nasce "Confirmado" (P1) | MEDIDO: nasce status 2 ("A Confirmar"); 409 em repetição é tratado como já confirmado |
| Envio fecha ticket de handoff (P2) | smoke mede; se fechar, pula contato com handoff aberto |
| Varredura atrasada (n8n fora) | não envia o que passou da tolerância `mensagens.atraso_max_min`; motivo `ja_passou` |

## Complexity Tracking

Sem violações.
