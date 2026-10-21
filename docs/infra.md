# Infraestrutura - Barbearia da Vila

Sem segredos. Atualizado a cada fase de `infra-base`. Segredos vivem na VPS (`/root/barbearia_vila/infra.env`) e em `.env.*` fora do repo.

## Ambiente

- VPS `178.156.134.167` (acesso por `scripts/_vps.py`, lista fechada de operacoes). Hospeda outros servicos: mexer so na stack `n8n`.
- Instancia n8n: `https://n8n2.todo-tips.com`. Containers usados: `n8n-postgres-1`, `n8n-redis-1`.

## Sondagens read-only (2026-10-18)

| Item | Resultado | Fonte |
|------|-----------|-------|
| Redis DB 2 (CHK008/P1) | **LIVRE**: `DBSIZE=0`; keyspace so tem db0 (4 chaves) e db1 (7 chaves), de outros projetos | `scripts/verificar-infra.py --redis` |
| `CONNECT` no database `n8n` (P2) | **ABERTO ao PUBLIC**: `datacl` nulo (privilegio padrao). Qualquer role nova conecta em `n8n` ate o owner decidir restringir; a feature nao altera a stack sozinha | `scripts/verificar-infra.py --acesso` |
| Backup existente (P3) | Nenhuma rotina para os bancos do n8n. Existe cron de outro projeto (`pgbackrest`, HDD) e `/root/backups` sem relacao | `scripts/verificar-infra.py --backup` |
| Rotas da API publica | `/credentials`, `/credentials/{id}`, `/credentials/schema/{tipo}` presentes no `openapi.yml` da instancia | `GET /api/v1/openapi.yml` |

## Credenciais n8n

Credenciais da instancia (47) listadas por `GET /api/v1/credentials`: **nenhuma** especifica da Barbearia da Vila na data da consulta (fase 1). Criadas na fase 4 por `scripts/criar-credenciais-n8n.py`.

| Credencial | Tipo | Id (saida do script, 2026-10-18) |
|---|---|---|
| `Barbearia Vila Postgres TESTE` | postgres | `X3WoZnCScCKqBdg2` |
| `Barbearia Vila Redis` (DB 2) | redis | `chtScO4j08LclN89` |
| `Barbearia Vila Postgres PROD` | postgres | nao criada (PROD exige a trava) |
| `Barbearia Vila Verificacao` (header `X-BV-Token`; token so em `infra.env` na VPS) | httpHeaderAuth | `i7qS8QNvswOIbepF` |
| `Barbearia Vila OpenAI` | openAiApi | `3e2ki13KTZskEv7O` |
| `Barbearia Vila Graces` (header `X-Api-Key`) | httpHeaderAuth | `NCWLnCOpE4DgIUVU` |
| `Barbearia Vila Chat Master` (header `Authorization`) | httpHeaderAuth | `FKqysWSzX8p4X1re` |

Campos do schema da API (`GET /credentials/schema/{tipo}`):

- `postgres`: host, database, user, password, maxConnections, allowUnauthorizedCerts, ssl, port, sshTunnel (+ campos ssh); nenhum obrigatorio no schema.
- `redis`: password, user, host, port, database, ssl, disableTlsVerification.
- `httpHeaderAuth`: name, value, allowedDomains (+ useCustomAuth).

## Pendencias do owner

- (resolvida 2026-10-18, decisao do owner, dec-025) `REVOKE CONNECT ON DATABASE n8n FROM PUBLIC` aplicado, com `GRANT CONNECT` ao role `n8n` (superusuario e unico que conectava; `goldincision*` conectam so nos proprios databases). `datacl` agora `{=T/n8n,n8n=CTc/n8n}`; n8n e containers seguem Up, sem erros de conexao nos logs. Reversao: `GRANT CONNECT ON DATABASE n8n TO PUBLIC`.

## Bancos da Barbearia (fase 2)

- `barbearia_vila_teste` (role homonimo) preparado por `scripts/preparar-bancos.py --alvo teste`; migracao `0001` aplicada por `scripts/migrar.py`; reexecucao = 0 alteracoes (`verificar-infra.py --idempotencia`). Acesso cruzado do role TESTE a `n8n` negado; a `barbearia_vila` (PROD ainda nao criado) a conexao falha por database inexistente.

## Redis (fase 3)

- DB 2 da stack `n8n-redis-1`, prefixos `bv:teste:` e `bv:prod:` (disjuntos). `scripts/limpar-redis.py` apaga so chaves do prefixo do alvo (`SCAN MATCH` + `DEL` em lote; nunca `FLUSHDB`/`FLUSHALL`); PROD exige a trava `BV_DEPLOY_PRODUCAO_AUTORIZADO=sim`. `verificar-infra.py --redis` faz `SET/GET/DEL` so sob `bv:teste:verif:` (validado em 2026-10-18).
- CHK010 / task 3.2.1 (resolvida pelo owner, dec-030, 2026-10-18): isolamento **so por prefixo** no DB 2, sem ACL propria (modelo do Gold). **Risco aceito**: qualquer cliente com a senha da stack le/escreve em qualquer prefixo e DB; o isolamento depende da disciplina dos workflows e de `limpar-redis.py`.

## Deploy de workflows (fase 5)

- `scripts/deploy-n8n.sh integracao [--so NOME]` faz GET -> PUT -> publish por id do config; nunca POST. `--criar NOME` cria uma unica vez (so TESTE) e grava o id no config. PROD exige `BV_DEPLOY_PRODUCAO_AUTORIZADO=sim` e `--confirmar-id`.
- Rollback (CHK015): antes do PUT o JSON atual vai para um arquivo temporario fora do git (modo 600). Se o publish falhar apos o PUT, o script tenta restaurar o JSON anterior por PUT, informa o estado final (restaurado ou nao, e o caminho da copia) e sai com exit 1. Copia removida so no sucesso.
- Workflow `bv-verificacao` (TESTE): id `uoDF0RFEgzAtKUay`, webhook `POST /webhook/bv-verificacao` com Header Auth; responde so `{ok: true}`. Validado em 2026-10-18: 3 execucoes de deploy = 1 workflow ativo; chamada sem token = 403.
- Workflow `bv-captura` (somente TESTE): id `wXcRwAdqRnGgRzA9`, webhook de captura temporaria da feature recepcao-buffer; nunca vai a PROD (deploy recusa).
- Workflow `bv-recepcao` (TESTE): id `iaUbATlT7xkZArVd`, webhook `POST /webhook/<webhook.path do config>`; auth por SHA-256 de `body.token_origin` (hash em `.env.n8n`, nao versionado; premissa: `token_origin` = `CHATMASTER_TOKEN_TESTE`, confirmar com evento real). Sem historico de execucoes salvo (FR-019). Smoke sintetico em 2026-10-18: sem token = 401, com token = 200, mensagem gravada e marcada `processada_em` pelo stub.
- Sub-workflow `entregar_rajada` (stub, TESTE): id `ilzXqBWGtcczlGEu`, em `workflows_sub` do config; devolve `{ok:true}` apos `teste.atraso_entrega_s`.
- Validacao pelo MCP do n8n (task 9.1.1, 2026-10-18, feita pela sessao principal): `validate_node_config` dos 2 nos (Webhook `n8n-nodes-base.webhook` v2.2 e Responder `n8n-nodes-base.respondToWebhook` v1.1, parametros identicos ao JSON) -> `valid:true` nos dois; `validate_workflow` do equivalente em Workflow SDK (webhook com credencial httpHeaderAuth `i7qS8QNvswOIbepF` -> respondToWebhook) -> `{"valid":true,"nodeCount":2}`; `get_workflow_details uoDF0RFEgzAtKUay` -> `active:true`, `versionId == activeVersionId 7df58dd2-790e-4b6b-8c7a-6b1af4b13a06`, 2 nos, 1 trigger, `POST https://n8n2.todo-tips.com/webhook/bv-verificacao` exigindo header `X-BV-Token`. Limite: a comparacao entre o publicado e o JSON do repo foi so por contagem de nos e trigger, nao campo a campo.
- A API key do n8n vem de `.env.n8n` (fora do git): raiz da worktree e, em fallback, o checkout principal (`BV_ENV_N8N` so vale para criar-credenciais-n8n e capturar-webhook).

## Backup (fase 6)

- `scripts/backup-bancos.py --alvo teste|producao|todos --retencao N [--validar]`: `pg_dump -Fc` em `/root/barbearia_vila/backups/bv-<banco>-<UTC>.dump` (modo 600, diretorio 700), arquivo novo por execucao; rotacao so de `bv-<banco>-*.dump`. PROD (inclusive em `todos`) exige a trava. Validado em 2026-10-18 para TESTE (`pg_restore --list` ok).
- `[PENDENTE-OWNER]` (CHK020/P3, task 6.1.4): frequencia e retencao do backup. Nenhum cron foi instalado e nenhum valor foi escolhido.

## Verificacao do repositorio e CI (fase 7)

- `scripts/verificar-repo.py` (regras de `contracts/config-ambiente.md` + todo id do config consta neste arquivo) e `scripts/varrer-segredos.py` (`git ls-files`, so `arquivo:linha`) rodam no CI junto de `python3 -I -m unittest discover -s tests` (sem rede), via `CMD_LINT` do `cockpit.config` e passo Lint do `ci.yml`.
- Editar `ci.yml`/`.cockpit/LEIAME.md` a mao diverge de `.cockpit/manifesto.sha256`; ao rodar `configurar.sh --atualizar`, o `CMD_LINT` do `cockpit.config` (ja atualizado) regenera ambos.

## Pendencias abertas

- CHK010: isolamento Redis so por prefixo (risco aceito, dec-030; ver secao Redis).
- CHK020/P3: frequencia e retencao de backup (owner decide; sem cron instalado).
- P7: retencao do historico de mensagens e base legal/aviso de tratamento (LGPD; CHK008/CHK009) `[PENDENTE-OWNER]`: o owner decidiu em 2026-10-18 que esta fora do escopo por agora; o historico fica "apagado junto com o contato", sem expurgo e sem job de limpeza, e nenhuma base legal e afirmada ate nova decisao.
- `CONNECT` no database `n8n`: fechado em 2026-10-18 (REVOKE FROM PUBLIC, dec-025); nada aberto.
- PROD: `preparar-bancos`, `migrar`, `criar-credenciais-n8n` e backup com `--alvo producao` sao do owner (trava `BV_DEPLOY_PRODUCAO_AUTORIZADO`).
- Checar o cron do Gold (~03:00 de 19/10) apos o REVOKE no database `n8n`.

## Recomendacao: hook de guarda de PROD (task 8.1.3, NAO aplicada)

Sugestao de hook `PreToolUse` (Bash) em `.claude/settings.json` que recuse comandos do agente contendo a string `BV_DEPLOY_PRODUCAO_AUTORIZADO`, para que so o owner (em terminal proprio) possa liberar PROD. Aplicar depende de aprovacao do owner.
- Sub-workflow `entregar-rajada` (stub, TESTE): id `ilzXqBWGtcczlGEu`, chamado pelo `bv-recepcao`; atraso `teste.atraso_entrega_s`. Smoke C2-C5 (`scripts/smoke-recepcao.py`) em 2026-10-18: premissa `token_origin` = `CHATMASTER_TOKEN_TESTE` confirmada (200 com o token); rajada entregue 8,1-8,7 s apos a ultima; 50 mensagens em 10 contatos sem sobreposicao de turnos; teto ~60 s.

## Robustez da recepcao: medicoes (feature `recepcao-robustez`, TESTE, 2026-10-18)

- Migracao `0004_recepcao_robustez.sql` aplicada so em `barbearia_vila_teste` (tipo `gravacao` em `falhas_recepcao`; tabela `marcas_conteudo`); PROD intocado.
- Sonda 1.1 (sub-workflow com `executionTimeout=5` e no Redis com credencial invalida, chamado por Execute Workflow): o pai nao recebeu erro em 60 s; timeout de sub-workflow NAO encerra a chamada. Com credencial valida a chamada custou 0,16-0,20 s. Desenho `redis-op` descartado (dec-020).
- Sonda 2 (workflow raiz com `executionTimeout=5`, no Redis invalido, `errorWorkflow` configurado): execucao `canceled` em <= 7 s; o error workflow NAO foi disparado em 34 s. Resolvido (dec-025, block-003): `bv-recepcao` abre uma linha em `tentativas_recepcao` (so `mensagem_id` + instante, migracao 0005) depois de gravar e a fecha em todo fim normal; o workflow `bv-vigia` (TESTE `fzJA2yWESqiPXyib`, a cada 5 min) registra em `falhas_recepcao` (`redis_indisponivel|tempo_esgotado`) as que passaram de `execucao.timeout_s` + 30 s. A mensagem fica pendente e sai no turno seguinte. Latencia do registro: ate ~5 min + margem. PROD: nao criado.
- `bv-recepcao` (TESTE) publicado com `executionTimeout` = 300 s (`execucao.timeout_s`, `[PROPOSTA]`: maior que `buffer.teto_s` + `lock.espera_s` x `lock.tentativas` + `buffer.janela_s`). Smoke: `gravacao` e `dedupe` verdes; regressao (`recepcao duplicidade limite rajada posse concorrencia falha`) verde.
- Nao medido: cenario `contato_falhou` ao vivo (so teste estatico) e o cancelamento por timeout de 300 s no workflow real.


### Validação pelo MCP do n8n (recepcao-robustez, 2026-10-18)

Feita pela sessão coordenadora com `get_workflow_details`:

| Workflow | Id | Nós (n8n = repo) | `executionTimeout` | Ativo | Versão publicada = rascunho |
|---|---|---|---|---|---|
| Barbearia Vila - Recepcao [TESTE] | `iaUbATlT7xkZArVd` | 49 = 49 | 300 | sim | sim |
| Barbearia Vila - Vigia da recepcao [TESTE] | `fzJA2yWESqiPXyib` | 2 = 2 | — | sim | sim |

## Agente: ids, ordem do fluxo e politica de teste (feature `agente-conversacional-graces`, TESTE, 2026-10-18)

- Ids (TESTE): `bv-graces` `mjhd7O0AzrqNVrf0`; `entregar-rajada` `ilzXqBWGtcczlGEu` (mesmo id do stub). PROD: nada criado (`config/ambientes/producao.json` sem workflows; REST conferida em 2026-10-18: os 6 workflows `bv-*` existentes terminam em `[TESTE]`).
- Ordem do fluxo: Chat Master -> `bv-recepcao` (buffer 8 s, lock) -> `entregar-rajada` (`Registrar turno` -> contexto -> agente `gpt-5.6-luna` -> ferramentas `bv-graces` -> `Compor` -> ate 4 saidas) -> Chat Master. Sem historico de execucao salvo (`saveData*Execution=none`), entao o diagnostico de falha exige ligar `saveDataErrorExecution` temporariamente e restaurar pelo deploy.
- Politica de teste: `python3 -I scripts/smoke-agente.py [--so c2 c3 c5 c9 c10 c11 c14 c15 c12 c13 r1 ... r10]` (r1-r10: roteiros da feature regras-negocio-agenda, chamada direta ao `bv-graces`, escrita real so no barbeiro de teste com o Paulo; tudo cancelado no `finally`). So contatos simulados; `teste.contatos_escrita` vazio (conferido tambem no workflow implantado); chamador temporario (webhook de path aleatorio, apagado no `finally`) para chamar `bv-graces`/`entregar-rajada` direto; c12/c13 trocam a credencial so no TESTE e restauram pelo deploy; ao fim, SC-010 (nenhuma proposta `executada` fica sem cancelar na Graces) e limpeza de Postgres/Redis.
- Limites medidos: c14 (pergunta longa) = 2 mensagens, ate 1 "?" por mensagem, <= 700 caracteres. S1/S2 (lista renderizada e formato do toque) continuam dependentes do contato de teste real (P2). `falhas_agente` do agente que falha = `agente|agente_falhou` (nao distingue modelo de ferramenta).
- Limite do smoke sem P1: telefone simulado nao tem cliente na Graces e `cadastrar_cliente` e vedado, entao o funil completo (resumo -> `executada`) so roda em 7.2.1; a fase 1/2 e coberta por chamada direta (c3).
- Rodada P1/P2 (onda-013): cliente de teste = Paulo (5511967296849, ja existia na Graces; nenhum cadastro feito), sempre no barbeiro de teste, tudo cancelado em `encerrar()`. `python3 -I scripts/smoke-agente.py --so c1 c4 c6 c7` (escrita real na Graces via redirecionamento ao barbeiro de teste, telefone do Paulo, sem envio real) passou; latencia SC-009 medida do inicio do turno a primeira mensagem: n=22, p50 6,7 s, p90 10,7 s (<= 20 s). `--so p2` exige `teste.contatos_escrita` = `["+5511967296849"]` no config e redeploy do `entregar_rajada` (envio real ao Paulo pela conexao 145); rodou uma vez e o config foi restaurado a `[]`.
- Defeitos achados e corrigidos nessa rodada (so TESTE): (1) a fase 2 nunca executava porque o modelo nao via o `proposta_id` do turno anterior; `Ler contexto` passou a ler a proposta pendente e `Preparar` a injeta no prompt; (2) `horarios_livres` trocava a oferta e o reagendar perdia o agendamento escolhido; `meus_agendamentos` agora guarda `pedido.agendamentos` e `bvgResolver` o usa; (3) prompt: oferecer marcar outro apos cancelar e roteiro de reagendar. PROD segue sem deploy.
- Limites S2 (itens/titulo) e formato do toque: a API aceitou 1/10/11 itens e titulos de 24/25 caracteres com `200`, sem recusar; o limite real de exibicao e o RowId do toque dependem de o owner olhar/tocar no aparelho (tarefas 1.3.1-1.3.3 seguem abertas).

## Regras de negocio da agenda (feature `regras-negocio-agenda`, TESTE, 2026-10-19)

- `bv-graces` roda um laco de estagios (Planejar -> Tem chamada? -> Graces -> Passo -> volta), com teto `graces.max_estagios` (16); estourar devolve `estagios_esgotados`. Sonda S3 aprovada.
- Limites do terceiro (`terceiro.*` no config): `buscas_max_sessao` 3, `buscas_max_dia` 5, `cadastros_max_dia` 1. O "dia" vem do banco: o `Contexto` do `bv-graces` conta `falhas_agente` (`busca_pessoa`) e `propostas` `cadastrar_terceiro` executadas, no dia de Sao Paulo, por contato (SC-011).
- `cadastrar_terceiro` tem trava propria por ambiente, `terceiro.cadastro_liberado`: ligada no PROD (aprovado pelo owner, block-001); desligada no TESTE, porque o cadastro real na Graces e irreversivel. Ligar no TESTE so com mock ou nova autorizacao do owner. `cadastrar_cliente` segue travado (`cadastroLiberado:false`).
- Escrita na Graces so no barbeiro de teste (`ZZ TESTE`); cancelar tudo o que um teste criar.
- Sonda S4 (4 listas seguidas, conexao 145): enviadas em 2026-10-19 pelo agente; confirmacao de ordem e de toque pendente do owner (block aberto). A API exige `User-Agent` de cliente comum (Cloudflare devolve `403 1010` ao padrao do `urllib`).
- Validacao pelo MCP do n8n (`validate_workflow` antes, `get_workflow_details` depois): nao disponivel na sessao do orquestrador; fica para o operador no fechamento.

## Validação pelo MCP (regras-negocio-agenda, 2026-10-19)

- `validate_node_config`: 18 nós representativos de `bv-graces`, `entregar-rajada` e `bv-recepcao` (um por tipo e formato de parâmetros, nós Code fora), todos válidos.
- `get_workflow_details` depois da publicação: `Entregar rajada (agente) [TESTE]` 71 nós, `Ferramentas da Graces [TESTE]` 19 nós, `Recepcao [TESTE]` 49 nós; todos ativos, versão publicada igual ao rascunho, timeout 300 s; contagens iguais ao repositório.
- A recepção (gravação do `ticket_id` do Chat Master no contato) só foi publicada no fechamento; o deploy exige `BV_WEBHOOK_TOKEN_SHA256` no `.env.n8n`, preenchido com o hash já em uso no TESTE.

## Mensagens agendadas (feature `mensagens-agendadas`, TESTE, 2026-10-20)

- Agendador proprio no n8n (nada e agendado no Chat Master; dec-007/dec-008): `bv-mensagens` (varredura de `mensagens.varredura_s` + reconciliacao de `mensagens.reconciliacao_min`) e sub-workflow `bv-confirmacao`. Ids no TESTE: `bv-mensagens` `0B7Fe4qIe3eWipWI`, `bv-confirmacao` `e9BYiK0G3Xs3uQ3P` (config `workflows.bv-mensagens`, `workflows_sub.bv_confirmacao`); PROD fica vazio e o deploy recusa os dois (`mensagens.ativo` falso).
- Migracao `0010_mensagens_agendadas.sql` (aplicar no TESTE antes de publicar qualquer workflow): indice unico parcial so entre pendentes, situacao `falhou`, colunas de envio/resposta, `falhas_agente.tipo = 'mensagem'`.
- Politica de teste: so o barbeiro de teste (`graces.barbeiro_teste_id`) e so contatos de `teste.contatos_escrita` recebem; contato simulado nunca vai ao Chat Master (a varredura cancela com `fora_da_lista`, o `bv-confirmacao` so grava a saida). Tolerancia de atraso `mensagens.atraso_max_min` = 30 (proposta; o owner foi informado e nao objetou).
- Medido (pai, sonda da lista e P1): a selecao da lista chega como `from_internal` com `selectedRowID` + `stanzaID` e como `start` so com o titulo; `POST /agenda` nasce `idStatusAgenda` 2; `POST /agenda/confirmacao` `{confirmado:true}` devolve 200 e status 3; repetir devolve 409 (tratado como ja confirmado). Pendente: P2 (envio x handoff aberto) e P4 (exibicao da lista de 2 linhas), no smoke da FASE 6 com o numero do owner.

