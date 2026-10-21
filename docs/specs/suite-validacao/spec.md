# Feature Specification: Suíte de validação por conversas roteirizadas

**Feature**: `suite-validacao`
**Created**: 2026-10-21
**Status**: Draft
**Depende de**: features 1 a 6 e `recepcao-robustez` (em `develop`); PR #15 (`mensagens-agendadas` E2E)
**Origem**: roadmap 8; princípio XV da constituição (suíte antes de qualquer promoção a PROD); `docs/roteiros-atendimento.md` (R1 a R17, K1 a K7); `docs/plano-proximas-features.md` seção A.
**Escopo de ambiente**: somente TESTE; nada é publicado em PROD.

## User Scenarios & Testing

### User Story 1 - Rodar os roteiros e receber um veredito por roteiro (Priority: P1)

O dev executa um comando e a suíte conduz cada roteiro (R1 a R17) como um cliente simulado, falando com o agente do TESTE por contatos simulados. Ao final recebe um relatório com, por roteiro, a transcrição, a nota de cada critério (K1 a K7) e o veredito aprovado/reprovado.

**Why this priority**: sem isso o princípio XV não pode ser cumprido e a produção segue bloqueada.

**Independent Test**: rodar só o R2 (preço) e verificar que o relatório traz transcrição, notas K1 a K7 e veredito.

**Acceptance Scenarios**:

1. **Given** os roteiros versionados, **When** a suíte roda, **Then** cada roteiro usa um contato simulado próprio e gera transcrição, notas e veredito.
2. **Given** um roteiro com nota menor que 4 em algum K1 a K6, **When** o relatório é gerado, **Then** o roteiro consta como reprovado com a justificativa da avaliadora.
3. **Given** um K4 (dado inventado) reprovado, **When** o relatório é gerado, **Then** o roteiro reprova mesmo que as demais notas sejam altas.
4. **Given** o roteiro R2, **When** o agente oferece o pacote "4 serviços com 20%", **Then** o roteiro reprova em K4.
5. **Given** R16, **When** a suíte roda, **Then** a cobertura vem dos cenários m2, m3 e m7 do smoke de mensagens, sem duplicar a lógica.
6. **Given** R15 e R17, **When** a suíte roda, **Then** a expectativa é só o contato da loja (comportamento anterior ao handoff).

---

### User Story 2 - A Graces e o TESTE ficam limpos, mesmo se a suíte falhar (Priority: P1)

Tudo o que a suíte cria na agenda (Graces) usa só o profissional de teste e é cancelado/apagado no fim, inclusive quando um roteiro ou a suíte inteira falha ou é interrompida.

**Why this priority**: a Graces só existe em produção; resíduo é dano real.

**Independent Test**: forçar uma falha no meio de um roteiro com agendamento e verificar que a agenda do profissional de teste não tem resíduo.

**Acceptance Scenarios**:

1. **Given** um roteiro que cria agendamento, **When** ele termina com falha, **Then** o agendamento é cancelado.
2. **Given** qualquer roteiro, **When** a suíte roda, **Then** nenhuma escrita atinge profissional diferente do de teste.
3. **Given** qualquer transcrição, **When** a avaliadora checa K6, **Then** o profissional de teste nunca foi oferecido ao cliente.
4. **Given** contatos simulados, **When** a suíte roda, **Then** só os roteiros que agendam usam índice >= 520 (cliente de teste autorizado), `teste.contatos_escrita` segue vazio e nenhum envio real sai.

---

### User Story 3 - Latência e custo medidos e limitados (Priority: P2)

A suíte mede o tempo de cada turno (da última mensagem do cliente à primeira resposta, incluindo a espera da rajada) e os tokens gastos pelo agente e pela avaliadora. Reporta p50 e p95 e respeita o teto de custo.

**Why this priority**: K7 é critério de aprovação e o custo precisa de teto.

**Independent Test**: rodar com teto artificialmente baixo e ver o relatório parcial; rodar um roteiro e ver p50/p95.

**Acceptance Scenarios**:

1. **Given** uma rodada, **When** ela termina, **Then** o relatório traz p50 e p95 por turno e global.
2. **Given** um turno acima de 25 s, **When** o roteiro termina, **Then** ele reprova em K7.
3. **Given** p50 acima de 15 s ou p95 acima de 25 s no conjunto, **When** o relatório é gerado, **Then** K7 fica reprovado para a rodada.
4. **Given** o teto de tokens atingido, **When** um roteiro está em curso, **Then** ele termina, nenhum outro começa e o relatório sai como parcial listando os roteiros pendentes.
5. **Given** uma execução seguinte, **When** há roteiros pendentes, **Then** só eles rodam.

---

### User Story 4 - Smokes sem duplicação (Priority: P2)

Os helpers repetidos entre os smokes (telefone simulado, POST ao webhook, checagem, leitura de ambiente, SQL, chamadas à Graces) passam a viver num módulo único, importado pelos três smokes e pela suíte, sem mudar o comportamento deles. A leitura de ambiente funciona numa worktree sem copiar segredos.

**Why this priority**: evita a terceira cópia e é garantia declarada no plano.

**Independent Test**: rodar os testes existentes dos smokes e o `--help`/modo seco de cada um antes e depois; resultado idêntico.

**Acceptance Scenarios**:

1. **Given** a refatoração, **When** os testes existentes rodam, **Then** passam sem alteração de expectativa.
2. **Given** uma worktree sem arquivos de segredo, **When** o ambiente é lido, **Then** busca primeiro na raiz da worktree e, na falta, no checkout principal; nunca copia nem imprime valores.

---

### User Story 5 - Execução paralela por contato (Priority: P3)

Roteiros independentes rodam em paralelo, cada um com seu contato, com limite de concorrência configurável.

**Independent Test**: rodar 4 roteiros com concorrência 1 e 4; mesmos vereditos, tempo total menor.

**Acceptance Scenarios**:

1. **Given** concorrência N, **When** a suíte roda, **Then** no máximo N roteiros ativos simultâneos.
2. **Given** roteiros paralelos, **When** terminam, **Then** as transcrições não se misturam.

---

### User Story 6 - Fechar as pendências conhecidas (Priority: P2)

A suíte exercita e registra o resultado de: toque na lista voltando ao agente; `cadastrar_cliente` real; busca por nome devolvendo vazio; `contato_falhou` ao vivo; e o timeout de 300 s.

**Independent Test**: o relatório lista as 5 pendências com resultado medido (ok/falhou/não medido e motivo).

**Acceptance Scenarios**:

1. **Given** uma rodada completa, **When** o relatório sai, **Then** traz uma seção "pendências" com um resultado por item.
2. **Given** um item que não pode ser exercido sem risco, **When** isso ocorre, **Then** consta "não medido" com o motivo, nunca omitido.

### Edge Cases

- Chave da avaliadora ausente: a suíte avisa e não roda (sem fallback para outra chave).
- Avaliadora devolve resposta fora do formato: o critério fica "não avaliado", o roteiro não aprova.
- Webhook do TESTE fora do ar: o roteiro reprova com causa de infraestrutura, distinta de reprovação de conteúdo.
- Interrupção (Ctrl+C) no meio da rodada: limpeza da Graces ainda ocorre.
- Roteiros de áudio/imagem sem o arquivo local de mídia real: ficam "pulados" com motivo.
- Transcrição com dado pessoal real: proibido; os roteiros usam só dados fictícios.

## Clarifications

### Session 2026-10-21

- Q: Falas do cliente simulado fixas ou geradas por LLM? → A: Fixas e deterministicas do roteiro; o LLM so avalia (FR-001, FR-003).
- Q: Regra de aprovacao da rodada com pulados/pendentes/falha de infra? → A: Aprovada somente com 17/17 aprovados; pulado, pendente ou falha de infra => saida diferente de zero.
- Q: Reexecucao automatica de roteiro reprovado? → A: Nao; o dev reexecuta manualmente pendentes/reprovados.
- ~~Q: Escrita dos contatos simulados e falha de restauracao? → A: Libera so os contatos simulados usados (<520) e restaura teste.contatos_escrita ao final, inclusive em Ctrl+C; se a restauracao falhar, sai com erro e imprime a acao manual (FR-012).~~ **Revogada na etapa plan (Decision registrada na onda-003):** liberar numeros simulados em `teste.contatos_escrita` faria o Chat Master tentar WhatsApp real para numeros que podem ser de terceiros, contrariando o padrao seguro de `scripts/smoke-agente.py` (saida conferida em `mensagens`, `contatos_escrita` vazio).
- Correcao (plan, 2026-10-21): a suite NUNCA adiciona numero a `teste.contatos_escrita` e exige que ele esteja vazio antes de rodar; a resposta do agente e lida em `mensagens` (direcao `saida`). Roteiros que agendam reusam exatamente o mecanismo do smoke-agente: contato de indice >= 520 (`tel(n)` devolve o cliente de teste autorizado `+5511967296849`, semeado por `novo_paulo(n)`), escrita redirecionada ao profissional ZZ TESTE por `teste.redirecionar_escrita` (trava `bvgEscritaPermitida` em `workflows/shared/graces.js`, incluida no `bv-graces`), sem envio real. Como esses roteiros compartilham o mesmo telefone, rodam em serie. Envio real so para `5511967296849` e so se um roteiro exigir (nenhum previsto; R16 ja coberto pelo smoke-mensagens) (FR-002, FR-012, FR-016).

## Requirements

### Functional Requirements

- **FR-001**: A suíte MUST manter os roteiros R1 a R17 versionados no repositório, cada um com falas do cliente, expectativas e critérios aplicáveis.
- **FR-002**: A suíte MUST executar cada roteiro contra o webhook do TESTE com um contato simulado de índice menor que 520; roteiros que agendam MUST usar o mecanismo do smoke-agente (índice >= 520, cliente de teste autorizado, escrita redirecionada ao profissional de teste).
- **FR-003**: A suíte MUST avaliar cada roteiro por LLM avaliadora (`gpt-5.6-luna`) nos critérios K1 a K6 com nota de 1 a 5 e justificativa, recebendo apenas a transcrição simulada e as expectativas.
- **FR-004**: A chave da avaliadora MUST vir do ambiente local fora do repositório e nunca ser impressa nem gravada em relatório.
- **FR-005**: Um roteiro MUST ser aprovado só com nota maior ou igual a 4 em K1 a K6 e K7 dentro do limite; K4 reprovado MUST reprovar o roteiro.
- **FR-006**: O pacote "4 serviços com 20%" MUST ser tratado como dado inventado enquanto o owner não o confirmar.
- **FR-007**: A suíte MUST medir a latência de cada turno (última mensagem do cliente até a primeira resposta, incluindo a janela de rajada) e reportar p50 e p95; turno acima de 25 s reprova o roteiro; p50 acima de 15 s ou p95 acima de 25 s reprova K7 da rodada.
- **FR-008**: A suíte MUST contabilizar tokens do agente e da avaliadora e respeitar um teto configurável (padrão 3.000.000 na 1ª rodada; nas seguintes, 2 vezes o medido); ao atingir, termina o roteiro em curso, não inicia outro e emite relatório parcial com os pendentes.
- **FR-009**: Uma execução seguinte MUST poder rodar só os roteiros pendentes.
- **FR-010**: A suíte MUST escrever na Graces somente com o profissional de teste e cancelar/apagar tudo que criou ao final, mesmo em falha ou interrupção.
- **FR-011**: A suíte MUST verificar (K6) que o profissional de teste não aparece para o cliente.
- **FR-012**: A suíte MUST NOT alterar `teste.contatos_escrita` (nem temporariamente) e MUST recusar rodar se ele não estiver vazio; a saída do agente MUST ser lida na tabela `mensagens` (direção `saida`), sem envio real ao Chat Master.
- **FR-013**: R16 MUST reaproveitar os cenários m2, m3 e m7 do smoke de mensagens; R15 e R17 MUST esperar apenas o contato da loja.
- **FR-014**: Os helpers comuns dos smokes MUST ficar num módulo único importado por `smoke-recepcao`, `smoke-agente`, `smoke-mensagens` e pela suíte, sem mudar o comportamento dos smokes.
- **FR-015**: A leitura de ambiente MUST procurar primeiro na raiz da worktree e, em fallback, no checkout principal; MUST NOT copiar nem imprimir valores de segredo.
- **FR-016**: A suíte MUST executar roteiros em paralelo, um contato por roteiro, com concorrência configurável (padrão conservador); roteiros que usam o cliente de teste (índice >= 520) MUST rodar em série entre si.
- **FR-017**: O relatório MUST trazer por roteiro: transcrição, notas, veredito, latências, tokens; e global: p50/p95, tokens totais, parcial ou completo.
- **FR-018**: O relatório MUST incluir a seção de pendências (toque na lista voltando ao agente; `cadastrar_cliente` real; busca por nome vazia; `contato_falhou`; timeout de 300 s), cada uma com resultado ou "não medido" e motivo.
- **FR-019**: Falha de infraestrutura MUST ser distinguida de reprovação de conteúdo no relatório.
- **FR-020**: Os roteiros MUST NOT conter dados reais de clientes.

> Decisões de infraestrutura: N/A (ferramenta de teste sem scheduler, sessão persistente ou rotação de chave; idempotência da limpeza coberta por FR-010).

### Key Entities

- **Roteiro**: identificador, situação, falas do cliente, expectativas, critérios aplicáveis, tipo (conversa, mídia, reuso de smoke).
- **Execução do roteiro**: contato simulado, transcrição, latências por turno, tokens, notas, veredito.
- **Rodada**: conjunto de execuções, teto de tokens, estado (completa/parcial), pendentes.

## Success Criteria

### Measurable Outcomes

- **SC-001**: 17 de 17 roteiros têm veredito em uma rodada completa (ou os pendentes listados em rodada parcial).
- **SC-002**: Após qualquer rodada, 0 agendamentos residuais do profissional de teste na Graces.
- **SC-003**: 0 ocorrências do profissional de teste oferecido ao cliente nas transcrições aprovadas.
- **SC-004**: p50 por turno de até 15 s e p95 de até 25 s na rodada aprovada.
- **SC-005**: Tokens totais da 1ª rodada de até 3.000.000.
- **SC-006**: Os testes dos três smokes passam sem alteração de expectativa após a extração dos helpers.
- **SC-007**: As 5 pendências constam no relatório com resultado ou motivo.

## Delta Requirements

**Skip**: ferramenta de teste e documentação, sem alterar comportamento ativo documentado em `docs/specs/current/` — agente feature-00c, 2026-10-21
