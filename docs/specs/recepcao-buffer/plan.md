# Plano de implementação: recepcao-buffer

**Feature**: `recepcao-buffer` | **Spec**: [spec.md](spec.md) | **Referência**: feature homônima do Gold (`/home/projetos/goldincision_licienciados/docs/specs/recepcao-buffer/`)

## Resumo

Primeiro capturar eventos reais da conexão 145 (webhook temporário, URL original anotada e
restaurada) e escrever o contrato do payload só com o que foi observado. Depois, no padrão já
validado no Gold: workflow `bv-recepcao` (autentica, filtra, normaliza, grava no Postgres), buffer
"última mensagem vence" de 8 s com teto de 60 s, posse por contato no Redis e entrega do turno ao
sub-workflow substituível `entregar-rajada`. TESTE completo; PROD parametrizado e inativo.
Decisões em [research.md](research.md).

## Technical Context

- **Plataforma**: n8n 2.43.5 em `https://n8n2.todo-tips.com`; Postgres 17 (`barbearia_vila_teste` / `barbearia_vila`); Redis 7.2 DB 2, prefixos `bv:teste:` / `bv:prod:` (versões: stack `n8n` compartilhada, `/home/projetos/goldincision_licienciados/docs/infra.md` "Serviços: n8n (2.43.5), postgres (17), redis (7.2)" e `docs/specs/infra-base/plan.md`; DB 2 e prefixos: `docs/infra.md` e `config/ambientes/*.json`).
- **Linguagem**: JavaScript nos Code nodes (`workflows/shared/`), Python 3 stdlib nos scripts, SQL nas migrações — já usados na infra-base.
- **Canal**: Chat Master Veloz QR Pro, `whatsappId` 145, token da empresa (`docs/decisoes-pre-00c.md`).
- **Testes**: `python3 -I -m unittest discover -s tests` + `node tests/rajada.test.js` (CI, sem rede); `scripts/smoke-recepcao.py` contra o TESTE; `validate_workflow` do MCP do n8n.
- **Restrições**: payload só do capturado (XVI); nenhum segredo no repo (XIV, token por hash); deploy só no TESTE (XIII).
- **Desempenho**: entrega 8–10 s após a última mensagem (SC-002); 50 mensagens concorrentes (SC-003).
- **NEEDS CLARIFICATION**: nenhum de design. Pendências de execução que viram bloqueio humano: mensagens do owner na captura (research D3) e, se a API não devolver, a URL atual do webhook da 145 (D2).

## Constitution Check

| Princípio | Status | Notas |
|-----------|--------|-------|
| II / II-bis trilha e registro da frente | PASS | artefatos em `docs/specs/recepcao-buffer/`; PR pelo owner |
| III validação estática | PASS | JSON, `verificar-repo.py`, `varrer-segredos.py`, unittest no `CMD_LINT` |
| IV / IV-bis dependências e identidade | PASS | nada copiado; nenhum pacote novo |
| V fonte oficial | PASS | toda afirmação sobre Chat Master cita `chatmasterveloz-api/…`; lacunas marcadas |
| VI pt-BR | PASS | |
| VII scripts idempotentes e contidos | PASS | migração `IF NOT EXISTS`; `capturar-webhook.py` com passos idempotentes e restauração repetível |
| VIII parametrização fora do rito | N/A | sem prompt de agente nesta feature |
| IX–XI Graces e conversa | N/A | atuam na feature 3 |
| XII skills e validação n8n | PASS | workflows validados pelo MCP antes do commit; sem Agent de primeira classe |
| XIII isolamento TESTE/PROD | PASS | path, webhookId, banco e prefixo próprios; PROD inativo; captura recusada em PROD |
| XIV segredos e dado mínimo | PASS | token só como SHA-256; telefone fora de chaves/logs; eventos brutos apagados; mídia com expiração |
| XV teste antes de produção | PASS | smoke no TESTE cobre todos os cenários; PROD não é ativado |
| XVI zero fabricação | PASS | contrato do payload `PENDENTE DE CAPTURA`; contratos internos marcados `[PROPOSTA]` |

Re-check pós-design: PASS. Camadas novas (workflow de captura, tabela `midias_recebidas`
condicional) são exigidas pela spec (US1, FR-008) e removíveis.

## Estrutura

```text
docs/specs/recepcao-buffer/{plan,research,data-model,quickstart}.md, contracts/
workflows/bv-captura.json              # novo, só TESTE: webhook 200, guarda execução
workflows/bv-recepcao.json             # novo: auth, filtro, normalização, buffer, posse, entrega
workflows/sub/entregar-rajada.json     # novo: stub no TESTE, substituído pela feature 3
workflows/shared/rajada.js             # novo: normalizar, deveEntregar, consolidar (pós-captura)
db/migrations/0002_recepcao_buffer.sql # novo
config/ambientes/{integracao,producao}.json  # + chaves de contracts/config-recepcao.md
scripts/deploy-n8n.py                  # + placeholders, include, sub antes, recusa captura em PROD
scripts/capturar-webhook.py            # novo: anotar/trocar/restaurar/fixtures (apaga execuções)
scripts/smoke-recepcao.py              # novo: cenários C2–C5 + limpeza
scripts/verificar-repo.py              # + path TESTE ≠ PROD
tests/fixtures/chatmaster/*.json       # novo: eventos anonimizados
tests/{rajada.test.js,test_fixtures.py,test_deploy_n8n.py,test_esquema.py}
docs/infra.md, workflows/README.md     # ids e notas
.gitignore                             # + .captura-145.url
```

## Fluxo do `bv-recepcao`

Webhook (POST, path/webhookId do ambiente) → Autenticar (Crypto SHA-256 do token recebido vs
`{{BV:webhook.token_sha256}}`; falha → 401) → Normalizar (`rajada.js`; malformado → 400; não
mensagem de cliente / tipo não suportado / grupo → 200 e fim, log sem PII) → Responder 200 →
Upsert contato → Inserir mensagem `ON CONFLICT DO NOTHING` (sem linha → fim) [→ mídia em
`midias_recebidas` se aplicável] → `SET ultima:<contato_id>` → Wait `buffer.janela_s` → Ler
`ultima` + idade da pendente mais antiga → Decidir (última ou teto) → [não: fim] → Posse
(`GET`/`INCR`+`EXPIRE`; negado: Wait `lock.espera_s`, até `lock.tentativas`) → Ler pendentes
(vazio: liberar, fim) → Marcar `turno_id`/`turno_em` → Execute `entregar-rajada` → [ok: marcar
`processada_em`] [falha: desmarcar turno] → `DEL lock` → falha termina em Stop and Error.

## Regra do instante de vencimento

Decidida em `spec.md` (FR-024): ordem do `SET ultima`; o turno é marcado por um único UPDATE atômico
sobre as pendentes; quem chega depois forma o turno seguinte. Redis indisponível: FR-025.

## Ordem de entrega

1. Captura e contrato (US1) — bloqueia o resto; inclui bloqueio humano para as mensagens do owner.
2. Migração 0002, config e extensão do deploy (pode correr em paralelo ao item 1).
3. `rajada.js` + testes com fixtures; `bv-recepcao` e `entregar-rajada` (US2–US4).
4. Smoke no TESTE (C2–C5) e verificação de PROD inativo (US5).

## Convenções de Borda

| Camada | Estilo | Validação | Fonte da verdade |
|--------|--------|-----------|------------------|
| Payload do Chat Master | como recebido | `rajada.js` (normalizar) + fixtures | `contracts/webhook-chatmaster.md` (pós-captura) |
| Colunas Postgres | snake_case | migração | `db/migrations/*.sql` |
| Entrega do turno | snake_case | teste do stub | `contracts/entrega-turno.md` |
| Config | snake_case com unidade no nome | `verificar-repo.py` | `contracts/config-recepcao.md` |

Mapeamento payload → mensagem normalizada: um único lugar (`rajada.js`, `bvNormalizar`).

## Complexity Tracking

Sem violações.
