# Implementation Plan: suite-validacao

**Spec**: [spec.md](spec.md) | **Research**: [research.md](research.md) | **Data model**: [data-model.md](data-model.md)
| **Contrato**: [contracts/cli.md](contracts/cli.md) | **Quickstart**: [quickstart.md](quickstart.md)

## Summary

Um script Python stdlib, `scripts/suite-validacao.py`, conduz os roteiros R1–R17 (`tests/roteiros/*.json`) contra o
webhook do TESTE reusando o smoke-agente (`turno`, `evento`, `semear`, `novo_paulo`, `encerrar`,
`verificar_implantado`), lê as respostas em `mensagens` (nunca envia WhatsApp real: `teste.contatos_escrita` vazio),
avalia K1–K6 com a `gpt-5.6-luna` pela API Responses, mede latência por turno no relógio do banco e grava um
relatório local. Os helpers duplicados dos três smokes vão para `scripts/_smoke.py`.

## Technical Context

**Target Platform**: Linux da máquina do dev (script local) contra o n8n2 TESTE e o Postgres `barbearia_vila_teste` na VPS (fonte: briefing; dec-016; `config/ambientes/integracao.json`)

| Campo | Valor |
|---|---|
| Linguagem | Python 3 (stdlib), como os smokes; `python3 -I` |
| Dependências | nenhuma nova; `scripts/_vps.py` (psql/Redis via SSH), `scripts/limpar-redis.py`, `scripts/deploy-n8n.py` (API n8n, já usado por `verificar_implantado`) |
| Armazenamento | leitura do Postgres `barbearia_vila_teste`; relatório em `relatorios/suite-validacao/` (fora do git) |
| Testes | `node --test tests/*.test.js` + `python3 -m pytest tests/` |
| Plataforma | n8n2 TESTE (`config/ambientes/integracao.json`); Graces de produção só com o profissional ZZ TESTE |
| Desempenho | p50 ≤ 15 s, p95 ≤ 25 s por turno; concorrência padrão 2 |
| Custo | teto 3.000.000 tokens medidos na 1ª rodada |
| Escopo de escrita | Postgres TESTE (contatos simulados e cliente de teste), Redis `bv:teste:`, Graces só no ZZ TESTE, arquivos em `relatorios/` |

## Constitution Check

| Princípio | Status | Notas |
|---|---|---|
| II / II-bis trilha e registro na PR | PASS | worktree `feature/suite-validacao`, artefatos em `docs/specs/suite-validacao/`, PR base `develop`, sem merge pelo agente |
| IV dependências | PASS | nenhuma dependência nova |
| IV-bis identidade | PASS | conferir `git var` antes de commitar (rito) |
| V fonte oficial | PASS | API Responses citada; tokens do agente só após sonda (research D8) |
| VI pt-BR | PASS | prosa e commits em português |
| VII idempotente e contido | PASS | `encerrar()` idempotente; `--limpar` repetível; escreve só no escopo declarado |
| VIII parametrização fora do rito | N/A | não altera parâmetros de agente |
| IX Graces fonte da verdade | PASS | K4 e K6 checados; escrita só no barbeiro de teste via `redirecionar_escrita` |
| X conversa humanizada | PASS | K1–K3 avaliados |
| XI escrita segura | PASS | roteiros confirmam antes de agendar; pacote não ofertado é reprovação |
| XII skills de n8n | N/A | sem mudança de workflow (research D11); se surgir, `validate_node_config` + `get_workflow_details` |

## Arquitetura

```mermaid
flowchart LR
  R[tests/roteiros/*.json] --> S[suite-validacao.py]
  S -->|importlib| A[smoke-agente.py]
  A --> C[_smoke.py]
  S --> C
  A -->|POST webhook| N[n8n2 TESTE]
  N --> G[(Graces: só ZZ TESTE)]
  N --> P[(Postgres TESTE: mensagens saída)]
  S -->|lê turnos/mensagens| P
  S -->|transcrição sem PII| O[OpenAI Responses gpt-5.6-luna]
  S --> J[relatorios/suite-validacao/*.json|md]
```

Fluxo por roteiro: alocar contato (500–519 ou fila `>= 520`) → preparar (semear, agendamento prévio, coleta
abandonada) → para cada fala, `turno()` e latência → checagens determinísticas → avaliadora → veredito. A rodada
inteira fica num `try/finally` que chama `encerrar()` e confere `teste.contatos_escrita == []`.

## Garantias

- **Segurança**: pré-condições do contrato antes de qualquer POST; `carregar_env` não imprime nem copia; a
  avaliadora recebe transcrição com o nome do cliente de teste trocado por `<cliente>` e sem telefone; relatório sem
  segredo/telefone; `docs/referencia.md` não é lido; nada em PROD do n8n.
- **Desempenho**: latência no relógio do Postgres (research D7); turno > 25 s reprova; p50/p95 no relatório.
- **Escalabilidade**: pool de threads configurável; fila serial para o cliente de teste; roteiro novo = arquivo JSON.
- **Deduplicação**: `_smoke.py` com os helpers copiados hoje (research D3); a suíte importa o smoke-agente, não o
  reescreve.

### Controles do gate de segurança (owasp-security, onda-003)

- **LLM01/LLM05**: a transcrição vai à avaliadora delimitada como dado, nunca como instrução; a resposta só é aceita se
  passar no JSON Schema e cada nota for inteiro 1–5 (senão `erro_infra`); K2, K6, "2ª vez" e pacote são
  determinísticos e não dependem da LLM.
- **LLM10**: além do teto de tokens, cada chamada à avaliadora tem `max_output_tokens` e timeout; a suíte não
  reenvia em laço (1 tentativa, depois `erro_infra`).
- **A05**: texto de roteiro nunca entra em SQL; o SQL só interpola inteiros e telefones gerados por `tel()`; o
  subprocesso do R16 usa lista de argumentos, sem shell.
- **A06**: a escrita na Graces depende de `redirecionar_escrita=true` (pré-condição); a limpeza é o `encerrar()`
  existente, que só cancela agendamentos dos contatos da rodada e do cliente de teste no barbeiro de teste.

## Project Structure

```text
scripts/_smoke.py                 # novo: helpers comuns (carregar_env, CFG/URL, post, checar, sql)
scripts/smoke-agente.py           # passa a importar _smoke (aliases, comportamento igual)
scripts/smoke-recepcao.py         # idem
scripts/smoke-mensagens.py        # usa sa._env já reexportado; sem outra mudança
scripts/suite-validacao.py        # novo
tests/roteiros/r01.json..r17.json # novos
tests/test_smoke_comum.py         # novo
tests/test_suite_validacao.py     # novo
.gitignore                        # + relatorios/
docs/roteiros-atendimento.md      # "Como roda": trocar "n < 520" pela regra da Decision 2
```

## Convenções de Borda

N/A — single-layer (script local que lê o banco e chama APIs já existentes; nenhum contrato novo entre camadas).

## Riscos

| Risco | Mitigação |
|---|---|
| Tokens do agente não expostos pela execução do n8n | sonda na 1ª tarefa; senão "não medido", sem estimativa |
| Avaliadora instável (nota variando) | critério determinístico para K2/K6; reexecução via `--so` |
| Fila serial deixa a rodada longa | 7 roteiros na fila × ~6 turnos × ≤ 25 s ≈ 18 min no pior caso |

## Complexity Tracking

Sem violações.
