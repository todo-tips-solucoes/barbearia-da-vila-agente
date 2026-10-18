# Plano de implementação: recepcao-robustez

**Feature**: `recepcao-robustez` | **Spec**: [spec.md](spec.md) | **Base**: `recepcao-buffer` (em `develop`)

## Summary

Quatro consertos no código existente, só no TESTE: (1) o `bv-recepcao` responde ao Chat Master só
depois de gravar e devolve 500 com falha registrada quando a gravação falha; (2) dedupe por
conteúdo de texto sem id no mesmo statement da gravação, no Postgres; (3) todas as operações
Redis passam por um sub-workflow `redis-op` com tempo máximo, e o erro vira registro em
`falhas_recepcao`; (4) `deploy-n8n.py --criar` grava o id do sub-workflow em `workflows_sub`.
Decisões e a hipótese a medir em [research.md](research.md).

## Technical Context

**Target Platform**: n8n 2.43.5 self-hosted em `https://n8n2.todo-tips.com` (stack `n8n` da VPS), só TESTE (fonte: briefing e `docs/decisoes-pre-00c.md`).

- **Plataforma**: n8n 2.43.5, Postgres 17, Redis 7.2 DB 2 (fonte: `docs/specs/recepcao-buffer/plan.md`).
- **Linguagem**: JSON de workflow + JS nos Code nodes, SQL na migração, Python 3 stdlib nos scripts.
- **Testes**: `python3 -I -m unittest discover -s tests`, `node tests/rajada.test.js` (CI);
  `scripts/smoke-recepcao.py` no TESTE; `validate_workflow` do MCP do n8n.
- **Restrições**: deploy só TESTE (XIII); sem PII em falha ou marca (XIV); valores sem fonte como
  `[PROPOSTA]` (V, XVI).
- **Desempenho**: execução com Redis fora termina em ≤ `redis.timeout_s + 2` s (SC-002).
- **NEEDS CLARIFICATION**: nenhum de design. Hipótese não medida (timeout de sub-workflow) vira
  sonda na primeira tarefa e bloqueio humano se falhar (research D3).

## Constitution Check

| Princípio | Status | Notas |
|-----------|--------|-------|
| II / II-bis trilha e registro | PASS | artefatos em `docs/specs/recepcao-robustez/`; PR pelo owner |
| III validação estática | PASS | unittest, `verificar-repo.py`, `varrer-segredos.py` |
| IV / IV-bis dependências e identidade | PASS | nenhum pacote novo |
| V fonte oficial | PASS | timeout do n8n cita docs.n8n.io; caso sub-workflow marcado não medido; reenvio do Chat Master marcado sem fonte |
| VI pt-BR | PASS | |
| VII idempotência | PASS | migração 0004 idempotente; `--criar` recusa repetição |
| VIII parametrização fora do rito | N/A | sem prompt |
| IX–XI Graces e conversa | N/A | |
| XII skills e validação n8n | PASS | workflows validados pelo MCP antes do commit |
| XIII isolamento TESTE/PROD | PASS | só TESTE publicado; PROD só recebe chaves parametrizadas |
| XIV segredos e dado mínimo | PASS | marca guarda hash e `contato_id`; falha guarda código; credenciais inválidas temporárias criadas pela API e apagadas no `finally` |
| XV teste antes de produção | PASS | smoke S0–S6 no TESTE; PROD não ativado |
| XVI zero fabricação | PASS | 500 e 5 s como `[PROPOSTA]`; hipótese D3 medida antes de afirmar |

Re-check pós-design: PASS. O sub-workflow novo é a única peça nova e existe porque o nó Redis do
n8n não tem tempo máximo próprio (evidência no smoke do `recepcao-buffer`).

## Project Structure

```text
docs/specs/recepcao-robustez/{plan,research,data-model,quickstart}.md, contracts/
workflows/bv-recepcao.json                 # resposta após gravar, 500, dedupe, 7 nós Redis -> redis-op, Limpar marcas
workflows/sub/redis-op.json                # novo: get/set/incr/delete com prefixo e executionTimeout
db/migrations/0004_recepcao_robustez.sql   # novo: CHECK 'gravacao', marcas_conteudo
config/ambientes/{integracao,producao}.json  # redis.timeout_s, dedup.conteudo_janela_s, workflows_sub.redis_op
scripts/deploy-n8n.py                      # criar() na seção certa
scripts/smoke-recepcao.py                  # S0–S4
tests/{test_workflows_recepcao,test_deploy_n8n,test_esquema}.py
docs/infra.md, workflows/README.md         # id do redis-op, limites medidos
```

## Fluxo novo do `bv-recepcao` (trecho alterado)

```text
Roteador[aceita] -> Upsert contato -(erro)-> Registrar falha gravacao -> Responder 500
                 -> Inserir mensagem (CTE marca + insert) -(erro)-> Registrar falha gravacao
                 -> Gravada? -não-> Responder 200 descartada
                             -sim-> Responder 200 aceita -> Limpar marcas -> Marcar ultima (redis-op) -> ... (buffer inalterado)
cada redis-op -(erro)-> Registrar falha Redis (motivo em código) -> Fim Redis indisponivel
```

As três `Liberar posse` também viram `redis-op`; o erro delas segue `continueRegularOutput`, como
hoje (a posse expira por `lock.ttl_s`).

## Convenções de Borda

| Camada | Estilo | Validação | Fonte da verdade |
|--------|--------|-----------|------------------|
| Colunas Postgres | snake_case | migração | `db/migrations/*.sql` |
| Entrada/saída do `redis-op` | snake_case | Code node do sub + teste estático | `contracts/recepcao-robustez.md` |
| Códigos de `falhas_recepcao.motivo` | snake_case | teste estático do workflow | `data-model.md` |
| Config | snake_case com unidade no nome | `verificar-repo.py` | `contracts/config-robustez.md` |

## Complexity Tracking

Sem violações.

## Riscos

- Timeout de sub-workflow não aplicado (research D3): sonda primeiro, bloqueio humano se falhar.
- Postgres fora do ar: o 500 sai, mas o registro em `falhas_recepcao` também falha; sem alerta
  fora de banda (fora de escopo pela spec, Clarifications). Achado M2 do gate de segurança.
- Hash da marca sem sal: texto curto ("ok") é adivinhável pelo hash; aceito porque o texto já está
  em `mensagens` e a marca vive só na janela. Achado L1 do gate de segurança.
- Nós Postgres depois da resposta (`Idade da rajada`, `Montar turno` etc.) seguem sem saída de
  erro; a mensagem fica pendente e vai no turno seguinte. Fora do escopo desta feature.
- Cada operação Redis vira uma execução de sub-workflow (até `lock.tentativas` no laço de posse):
  custo de latência a medir na sonda.
