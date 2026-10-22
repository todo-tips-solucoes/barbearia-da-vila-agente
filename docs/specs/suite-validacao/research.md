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

## Decision 12: converge — triagem da rodada real e correções (2026-10-21)

Rodada real `relatorios/suite-validacao/20261021-031240` deu **5/17** (R12 pulado). Triagem de cada reprovação pela transcrição:

**(a) Defeitos da suíte/avaliadora** (corrigidos em `scripts/suite-validacao.py`):
- R1: `tocar` seguia tocando "08:00" enquanto a oferta antiga continuava no estado e o agente pedia confirmação (4 confirmações repetidas → K2/K5 falsos). Agora o toque só continua se o turno trouxe lista nova (`nova_oferta`) e a transcrição só mostra a lista enviada naquele turno.
- K4 falso em R1/R7/R8/R9: a avaliadora não tinha fonte para horários livres, barbeiros e agendamentos do cliente. As linhas `Agente (lista)` passam a ser declaradas fonte (montadas pelo código com a resposta da Graces), a referência ganha barbeiros reais, funcionamento (`GET /agenda/configuracao`), loja e a data de hoje, e a transcrição informa a escrita executada (propostas `executada`).
- K6 falso em R7/R8: "Pedro Henrique" é barbeiro real (GET `/agenda/agendamentos?idCliente=<Paulo>&proximos=true` traz agendamentos recorrentes reais dele com `a7ec6dd6…`). A referência agora nomeia o barbeiro de teste exato (`ZZ TESTE INTEGRACAO - NAO AGENDAR`, lido de `/servicos/profissionais`); a K6 determinística segue valendo.
- K5 aplicado a turno de condução (R4/R5/R6): a instrução diz que K5 vale para dúvida informativa; e as `<expectativas>` prevalecem.
- R7/R8: a semente caía em "amanhã" e a fala diz "sexta". `preparo_dia_semana: 4` semeia na próxima sexta (`proximo_dia`; `_semear_agendamento(..., dia=)` com padrão inalterado para o smoke).
- R13/R14/R15/R17: `sanitizar` mascarava o telefone público da loja como `<telefone>` (K4 falso). O telefone da `loja` não é mais mascarado; o do cliente segue mascarado.
- `rotulos_oferta` quebrava (SQL com `contato_id=` vazio) antes da 1ª fala de contato novo → erro_infra; agora devolve `[]`.

**Variância da avaliadora**: sonda de 2026-10-21 na API Responses com `gpt-5.6-luna`: `temperature` → HTTP 400 "is not supported with this model"; `seed` → HTTP 400 "Unknown parameter". Não há como fixar amostragem; o pedido fixa `reasoning.effort = "medium"` e a variância é reduzida por regras explícitas (listas são fonte, alcance do K5, barbeiro de teste nomeado, expectativas prevalecem) e pelas regras determinísticas (K2/K6/2ª vez/pacote 20%).

**(b) Defeitos reais do agente** (corrigidos na fonte e publicados só no TESTE: `bv_graces`, `entregar_rajada`, `interpretar_midia` por `scripts/deploy-n8n.sh integracao --so <nome>`; `validate_node_config` antes e `get_workflow_details` depois de cada publicação: ativos, rascunho = publicado, 19/76/18 nós, `executionTimeout` como no repositório):
- Config `loja` nunca chegava ao prompt (R3 sem endereço, R13 inventou "Aceitamos Pix", R17 prometeu chamar humano sem handoff). `Preparar` passa `cfg.loja`; o prompt traz endereço/contatos como DADO, manda dizer "não tenho essa informação" + contatos para o resto, e no pedido de humano passa os contatos sem prometer transferência (antes da C).
- Sem horário de funcionamento: nova ferramenta `funcionamento` (só leitura de `GET /agenda/configuracao`, `workflows/shared/graces.js` + nó `Ferramenta funcionamento`).
- K5: convite leve para agendar depois de dúvida respondida; K1: saudação na 1ª resposta e empatia com cliente apressado/irritado.
- K4: nome de serviço exatamente como a ferramenta devolveu ("corte adulto" virava "cabelo adulto", R11).
- `bvFrases` partia frases em `contato@barbeariadavila.com.br` → "barbeariadavila. com. br"; pontuação colada no texto seguinte não fecha mais frase.
- K3: pedir escolha de serviço/barbeiro/horário com a ferramenta e lista, não em texto aberto.

**Resultado**: rodada completa `20261021-035407` 11/17 → após as correções do telefone/e-mail, re-rodada `--so` dos afetados `20261021-035821` 5/5 → rodada completa final `20261021-040704` **14/17** (R4 e R6 só por K3 = 3/2, R12 pulado), p50 11,97 s, p95 15,55 s (K7 ok), 26.792 tokens da avaliadora (teto 3M). Re-rodada `20261021-041138` de R1/R4/R5/R6 após a regra de lista: só R5 aprovou. Restam oscilações de K3/K5 entre rodadas e um defeito real: o modelo às vezes não emite o bloco `OPCOES:` depois de uma ferramenta que montou oferta nova. O cliente então não vê a lista, e "pode ser o primeiro" escolhe um item invisível (R1 em 041138). A correção precisa ser em código (`bvCompor` enviar a oferta nova mesmo sem `OPCOES`), não no prompt.

**Resíduos** após a rodada final: `teste.contatos_escrita = []`; 0 agendamentos futuros do Paulo no ZZ TESTE (SC-008), 0 criados pela rodada ativos (SC-010), Redis `bv:teste:*` limpo.

**R12** segue **pulado**: `tests/fixtures/midia-real.local.json` do checkout principal só tem áudio (sem `imagem_referencia`); a leitura com fallback para o checkout principal funciona (R11 usa o áudio de lá). A imagem fica com o owner.

**Rodada de 17/17 (2026-10-21, `20261021-133335`)**: rodada completa, **17/17 aprovados**, p50 12,8 s, p95 17,72 s (K7 ok), 28.340 tokens da avaliadora; limpeza ok. Cumpre a regra do princípio XV. O que mudou desde a 14/17:
- **R12**: imagem de referência do owner recebida pela 145 e registrada em `midia-real.local.json` (`imagem_referencia`, fora do git). A suíte reenviava o mesmo `fileUrl` (descartado pelo dedupe) com o mime mascarado do evento-13; agora usa `?smoke=`, `image/jpeg` e legenda vazia. O prompt pede descrever o estilo, sugerir o serviço real mais próximo e não prometer resultado.
- **R8 (latência)**: medido com `saveDataSuccessExecution=all` temporário no TESTE (desligado depois). As ferramentas levam de 0,2 a 0,7 s; as 5 rodadas do modelo levam de 2 a 5 s cada (cerca de 16 s). `meus_agendamentos` agora identifica o cliente no mesmo passo, e `horarios_livres` com `id_opcao_agendamento` busca os barbeiros do serviço no mesmo passo, o que poupa 3 rodadas. Resultado: o R8 caiu de 26–32 s para 16–20 s.
- **R7**: o `cancelar` fase 1 devolve as opções `Remarcar` / `Cancelar mesmo` (`decisao_cancelamento`). O agendamento continua no `pedido` para o `horarios_livres`.
- **K1/K5 determinísticos**: `bvSaudar` põe "Oi!" na 1ª resposta da sessão (histórico vazio) quando o modelo não cumprimenta. Na mensagem da lista sem pergunta, `bvCompor` acrescenta "Qual fica melhor pra você?".
- **Infra**: OpenAI devolveu 503 ("Service unavailable") em parte das re-rodadas; o turno caiu na contingência, como previsto. As rodadas com turnos de 28 a 42 s coincidiram com essa instabilidade.
