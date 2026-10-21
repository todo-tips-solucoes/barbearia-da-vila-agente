# Research: suite-validacao

Fontes lidas: `docs/roteiros-atendimento.md`, `docs/plano-proximas-features.md` §A, `scripts/smoke-agente.py`,
`scripts/smoke-mensagens.py`, `scripts/smoke-recepcao.py`, `scripts/_vps.py`, `workflows/shared/graces.js`,
`workflows/sub/entregar-rajada.json`, `workflows/sub/interpretar-midia.json`, `config/ambientes/integracao.json`,
`db/migrations/0001_esquema_inicial.sql`, `db/migrations/0006_agente.sql`. `docs/referencia.md` não foi lido.

Nenhum eixo estrutural está em aberto: linguagem (Python 3 stdlib, como os smokes), persistência (Postgres do TESTE
já existente) e ambiente (n8n2 TESTE) vêm do projeto.

## Decision 1: saída lida em `mensagens`, nunca envio real (revoga a Q4 do clarify)

- **Decision**: a suíte não toca em `teste.contatos_escrita`; recusa rodar se ele não estiver vazio, se
  `teste.redirecionar_escrita` não for `true` ou se o `entregar-rajada` implantado tiver lista de envio real
  (reusa `verificar_implantado()` do smoke-agente). A resposta do agente é lida em `mensagens` (`direcao='saida'`,
  `mensagem_id_canal LIKE 'out-<turno_id>-%'`), exatamente como `turno()` do smoke-agente.
- **Rationale**: `scripts/smoke-agente.py:2` documenta que nenhum envio real acontece porque `contatos_escrita` fica
  vazio; liberar números simulados faria o Chat Master tentar WhatsApp real para números que podem ser de terceiros.
- **Alternatives considered**: liberar temporariamente os contatos `< 520` e restaurar no fim (Q4 original) —
  rejeitada por risco de envio a terceiros; mock do Chat Master — rejeitada, não testaria o caminho real.

## Decision 2: roteiros que agendam reusam o mecanismo do smoke-agente

- **Decision**: R1, R5, R6, R7, R8, R9 e R11 usam índice `>= 520`: `tel(n)` devolve o cliente de teste autorizado
  (`PAULO_TEL`), `novo_paulo(n)`/`ini(n)` zeram e semeiam o contato, e a escrita vai ao profissional ZZ TESTE por
  `teste.redirecionar_escrita` (trava `bvgEscritaPermitida`, `workflows/shared/graces.js:84`; destino
  `cfg.testeId`, linha 259). R7–R9 semeiam o agendamento prévio com `_semear_agendamento()`. A limpeza é o
  `encerrar()` do smoke-agente (cancela propostas executadas, tudo do cliente de teste no barbeiro de teste, apaga
  contatos e chaves Redis), num `try/finally`.
- **Rationale**: mecanismo já validado (roteiros r1–r10 do smoke-agente); nada novo a provar nem a manter.
- **Consequência**: esses roteiros compartilham um telefone e rodam **em série** numa fila própria.
- **Alternatives considered**: um cliente Graces por roteiro — exigiria cadastrar clientes reais, sem endpoint de
  exclusão conhecido.

## Decision 3: módulo `scripts/_smoke.py` só com o que está duplicado

- **Decision**: extrair para `scripts/_smoke.py` apenas o que é cópia hoje: `_env` (idêntico em smoke-agente e
  smoke-recepcao), `post` (mesmo corpo, smoke-recepcao aceita `raw`), carga de `CFG`/`URL`, `checar` (parametrizado
  pela lista de falhas de cada smoke) e `sql` via `_vps.psql`. `tel` fica em cada smoke (faixas e regras diferentes:
  `+55000000` 4 dígitos na recepção, `+5500000000` 3 dígitos e `>= 520` no agente), só o formatador comum vai ao
  módulo. smoke-mensagens continua importando o smoke-agente (reusa domínio, não só helpers).
- **Rationale**: FR-014 sem mudar comportamento; o que não é cópia não muda de lugar.
- **Alternatives considered**: pacote com classes de cenário — mais código e risco de regressão sem ganho.

## Decision 4: leitura de segredos com fallback no checkout principal

- **Decision**: `_env` procura cada arquivo (`.env.smoke`, `.env.n8n`) primeiro em `RAIZ` (raiz da worktree) e, se
  ausente, em `dirname(git rev-parse --path-format=absolute --git-common-dir)`. Usa `os.environ.setdefault`,
  não copia arquivo, não imprime valor.
- **Rationale**: nesta worktree os dois arquivos não existem; no checkout principal existem (verificado só pelos
  nomes das chaves). O `.gitignore` já cobre `.env.smoke` e `.env.n8n`.
- **Alternatives considered**: symlink na worktree — cria artefato que pode vazar em `git add`; copiar — proibido.

## Decision 5: avaliadora pela API Responses da OpenAI

- **Decision**: `POST https://api.openai.com/v1/responses`, modelo `gpt-5.6-luna` (o mesmo de
  `config/ambientes/integracao.json` e do nó `Descrever` do `interpretar-midia`), chave `OPENAI_API_KEY` de
  `.env.smoke`, saída estruturada em JSON Schema (`text.format` do tipo `json_schema`) com nota 1–5 e justificativa
  por K1–K6. Tokens da avaliadora vêm de `usage` da resposta. Fonte:
  https://platform.openai.com/docs/api-reference/responses/create.
- **Entrada**: só a transcrição simulada (nome do cliente de teste trocado por `<cliente>`, sem telefone), as
  expectativas do roteiro e os fatos de referência (serviços/preços lidos da Graces na rodada e `loja` da config).
- **Rationale**: FR-003/FR-004; os fatos de referência são o que torna o K4 julgável.
- **Alternatives considered**: avaliar por regex só — não mede tom (K1/K5).

## Decision 6: checagens determinísticas antes da LLM

- **Decision**: K6 (`"TESTE"` em saídas e ofertas, `tem_teste()`), K2 (no máximo 4 mensagens por turno), "2ª vez"
  oferecida e pacote "20%" ofertado reprovam o roteiro sem depender da nota da LLM.
- **Rationale**: são regras exatas da Constituição IX/X; LLM não deve poder aprová-las.

## Decision 7: latência por turno com relógio do banco

- **Decision**: latência = `min(criado_em)` da primeira saída do turno − `max(criado_em)` da última entrada do
  cliente antes dele (mesmo relógio do Postgres, inclui a janela de rajada). Turno > 25 s reprova o roteiro;
  p50/p95 da rodada decidem o K7 (≤ 15 s / ≤ 25 s). O `turno()` do smoke-agente mede a partir de
  `turnos.iniciado_em` (fim da rajada), por isso a suíte calcula a sua própria métrica a partir do `turno_id`.
- **Alternatives considered**: relógio local do script — sujeito a deriva com a VPS.

## Decision 8: tokens do agente — sonda antes de afirmar

- **Decision**: a 1ª tarefa da implementação sonda se a execução do `entregar-rajada` (nó
  `@n8n/n8n-nodes-langchain.lmChatOpenAi`) traz uso de tokens nos dados da execução lidos pela API do n8n2. Se
  trouxer, a suíte soma por turno; se não, o relatório marca tokens do agente como "não medido" e o teto vale só para
  o que foi medido, com o aviso no relatório. Não há estimativa.
- **Rationale**: o banco não guarda tokens (`db/migrations` não tem coluna de uso); Constituição V.

- **Resultado da sonda (2026-10-21)**: `GET /executions?workflowId=<id>&includeData=true` para `entregar-rajada` e os demais
  workflows devolve lista vazia (ou execução sem `runData`), então não há uso de tokens do agente pela API do n8n2:
  tokens do agente = "não medido"; o teto de 3.000.000 conta só os tokens da avaliadora, com o aviso no relatório.

## Decision 9: paralelismo

- **Decision**: `concurrent.futures.ThreadPoolExecutor` com `--concorrencia` (padrão 2) para os roteiros sem
  agendamento (contatos 500–519, um por roteiro); a fila `>= 520` roda numa única thread em série. Cada roteiro só
  lê linhas do seu `contato_id`, então transcrições não se misturam.
- **Rationale**: stdlib; padrão conservador para não disputar a OpenAI e a Graces.

## Decision 10: R16, R15/R17 e pendências

- **R16**: roda `python3 -I scripts/smoke-mensagens.py m2 m3 m7` como subprocesso e usa o código de saída; sem
  avaliação por LLM.
- **R15/R17**: antes da feature C, esperam só o contato da loja (`loja` da config).
- **Pendências (FR-018)**: toque na lista medido com o evento de lista do smoke-mensagens (`evento_lista`); busca
  por nome `?busca=` medida com o nome do cliente de teste, registrando só se o id dele voltou; `cadastrar_cliente`
  real, `contato_falhou` ao vivo e timeout de 300 s ficam "não medido" na 1ª rodada (exigiriam criar cliente real
  sem exclusão conhecida ou forçar falha de infraestrutura).

## Decision 11: sem mudança de workflow

- **Decision**: a feature não altera workflows; não há deploy. Se um achado exigir, o deploy é só no TESTE via
  `scripts/deploy-n8n.sh integracao --so <nome>`, com `validate_node_config` antes e `get_workflow_details` depois.
