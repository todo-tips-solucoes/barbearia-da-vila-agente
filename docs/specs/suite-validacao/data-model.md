# Data Model: suite-validacao

Nenhuma tabela nova. A suíte lê `contatos`, `turnos`, `mensagens`, `conversas`, `propostas` e `falhas_agente` do
banco `barbearia_vila_teste` (esquema em `db/migrations/`) e grava só arquivos locais.

## Entity: Roteiro

Arquivo `tests/roteiros/rNN.json`, versionado. Formato `[PROPOSTA — a validar na implementação]`.

| Campo | Tipo | Regra |
|---|---|---|
| `id` | texto | `R1`..`R17`, único |
| `situacao` | texto | resumo de `docs/roteiros-atendimento.md` |
| `falas` | lista | falas fixas do cliente, em ordem; item pode ser `{"tocar": 1}` (toque no item N da lista) ou `{"midia": "audio"\|"imagem"}` |
| `expectativas` | lista de texto | "O que se espera" do roteiro |
| `criterios` | lista | subconjunto de `K1`..`K6` avaliado pela LLM (K7 sempre) |
| `agenda` | bool | `true` ⇒ fila `>= 520` com o cliente de teste |
| `preparo` | texto opcional | `agendamento_previo` (R7–R9) ou `coleta_abandonada` (R10) |
| `delegado` | texto opcional | `smoke-mensagens:m2,m3,m7` (R16) |
| `antes_da_c` | bool | R15/R17: espera só o contato da loja |

Validação (teste unitário): nenhum dígito de telefone, CPF ou e-mail nas falas (FR-020); ids únicos; `criterios` ⊆ K1–K6.

## Entity: Execução do roteiro

Em memória; vai ao relatório.

| Campo | Tipo | Regra |
|---|---|---|
| `id` | texto | do roteiro |
| `contato_n` | int | 500–519 se `agenda=false`; `>= 520` se `true` |
| `turnos` | lista | `{fala, saidas[], latencia_s, turno_id, estado}` |
| `tokens` | objeto | `{agente: int\|"não medido", avaliadora: int}` |
| `notas` | objeto | `K1`..`K6` → `{nota 1–5, justificativa}` |
| `deterministicas` | lista | falhas de K2/K6/"2ª vez"/pacote |
| `status` | enum | `aprovado`, `reprovado`, `erro_infra`, `pendente` |

Transições: `pendente → executando → (aprovado | reprovado | erro_infra)`; teto atingido ⇒ quem não começou
fica `pendente`. Regra de veredito: `reprovado` se alguma nota < 4, K4 < 4 (eliminatório), alguma falha
determinística ou turno > 25 s; `erro_infra` se HTTP ≠ 200, turno sem fim no limite ou avaliadora indisponível.

## Entity: Relatório da rodada

`relatorios/suite-validacao/<AAAAMMDD-HHMMSS>.json` e `.md`, fora do git (`.gitignore`).

| Campo | Tipo |
|---|---|
| `inicio`, `fim` | ISO 8601 |
| `completo` | bool (falso se o teto parou a rodada) |
| `roteiros` | lista de Execução |
| `latencia` | `{n, p50, p95, k7_ok}` |
| `tokens` | `{total, teto, proximo_teto: 2 × medido}` |
| `pendencias` | lista `{item, resultado \| "não medido", motivo}` (FR-018) |
| `limpeza` | `{ok, restantes, acao_manual?}` |

Nunca contém valor de segredo, telefone ou nome do cliente de teste.
