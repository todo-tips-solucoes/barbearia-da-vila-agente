# Infraestrutura - Barbearia da Vila

Sem segredos. Atualizado a cada fase de `infra-base`. Segredos vivem no servidor (`/root/barbearia_vila/infra.env`, modo 600) e em `.env.*` fora do repo.

## Ambiente

Desde a migracao de 2026-10-23 (plano e andamento em `docs/migracao-vps.md`):

- Servidor proprio `srv1726158` (`2.25.163.213`), o mesmo onde rodam as sessoes do Claude. Docker Swarm de 1 no; a stack `bv` (`infra/stack-bv.yml`) tem Traefik v3, n8n 2.43.5, Postgres 17 e Redis 7.2, e a stack `portainer` (`infra/stack-portainer.yml`) o Portainer CE. Segredos da stack sao docker secrets criados por `infra/criar-segredos.sh`.
- Instancia n8n: `https://n8nv.todo-tips.com`; Portainer: `https://portainerv.todo-tips.com`. Certificados Let's Encrypt pelo Traefik (HTTP-01).
- `scripts/_vps.py` (lista fechada de operacoes) roda local e acha o container pelo servico do Swarm (`bv_postgres`, `bv_redis`, `bv_n8n`; o nome do container e sorteado). A senha do Redis vem de `REDIS_PASSWORD` no `infra.env`. Postgres e Redis ficam so na rede interna `bv_bv`; para o n8n, os hosts sao `postgres` e `redis`.
- Desde a F6 (2026-10-24, 12:16 UTC) a PROD tambem roda aqui: banco `barbearia_vila` local e workflows [PROD] no n8nv; a conexao 145 aponta para `https://n8nv.todo-tips.com/webhook/bv-recepcao-680eee2d-…`. A origem (VPS `178.156.134.167`, stack `n8n`, `https://n8n2.todo-tips.com`, containers `n8n-postgres-1`, `n8n-redis-1`, `n8n-n8n-1`) foi desativada na F8 (2026-10-27): workflows arquivados, crons desligados, dump final em `/root/barbearia_vila/final-origem/` neste servidor (ver `docs/migracao-vps.md`). As secoes abaixo sao o historico dessa origem.
- Guarda de PROD: hook `PreToolUse` local (`.claude/hooks/guarda-prod.sh`, fora do git) recusa comandos do agente com `BV_DEPLOY_PRODUCAO_AUTORIZADO`; so o owner libera PROD.

### TESTE no n8nv (recriado em 2026-10-23, F4)

Recriado pelo repo, sem copiar segredos da origem: banco `barbearia_vila_teste` novo (migracoes 0001-0010), `REVOKE CONNECT ON DATABASE n8n FROM PUBLIC` (aqui a stack e so da Barbearia), credenciais por `criar-credenciais-n8n.py` e workflows por `deploy-n8n.sh integracao --criar`. O deploy completo numa instancia vazia exige os sub-workflows publicados antes de quem os chama; por isso `workflows_sub` esta em ordem de dependencia nos configs.

| Item | Id |
|---|---|
| Credencial Postgres TESTE | `n75mQT1Mp61R2eQb` |
| Credencial Redis | `635v0i1zcY8h3jDM` |
| Credencial Verificacao | `VVbK8DkOhfW3nRg2` |
| Credencial OpenAI | `tVRedGvpa2XF0gX1` |
| Credencial OpenAI do TESTE (chave própria, owner 2026-11-18) | `zm8LmmbPm1BzU4ym` |
| Credencial Graces | `lSsJYIq9jbpkmYlr` |
| Credencial Chat Master (TESTE, conexao 145) | `Gt9C67GDkOEnB4BZ` |
| `bv-verificacao` | `mAKBRCHQ1Bd78S7R` |
| `bv-captura` | `KV66loTQW9KHtW86` |
| `bv-recepcao` | `n2Dy8IyVnDHQ6KyF` |
| `bv-vigia` | `ehT7ludsTLu6y9z5` |
| `bv-mensagens` | `ePWSZ6XnAUztQDrC` |
| `bv_graces` | `OHmvqZrPix6fJnpP` |
| `interpretar_midia` | `y71ufji64xT2cTaW` |
| `bv_confirmacao` | `OPRyWyAE8WNELPOt` |
| `entregar_rajada` | `N25Ka2Lp6x6TNQKU` |

### PROD no n8nv (F6, 2026-10-24)

Banco criado por `preparar-bancos.py --alvo producao` e preenchido pelo dump final da origem (`scripts/janela-prod.py dump-origem` + `restaurar`: 12 tabelas do role `barbearia_vila`, migracoes 0001-0010). Credencial Postgres por `criar-credenciais-n8n.py --alvo producao`; as demais reusam as do TESTE (como no n8n2). Workflows por `deploy-n8n.sh producao --criar`, em ordem de dependencia, e publicados por `--confirmar-id`. `bv-mensagens` e `bv-captura` nao vao a PROD. Crons (`barbearia-backup-limpeza`, `barbearia-limpar-midia`) instalados aqui por `_vps.py instalar-crons`; 1o backup manual: rc 0, 12 tabelas, limpeza apagou 0. Teste do owner: "oi" do 5511967296849 gravado e respondido em 11 s. Rollback: `capturar-webhook.py restaurar --destino recepcao-producao` (URL do n8n2 em `.webhook-145-antes-prod.url`) e `janela-prod.py religar-origem`.

| Item | Id |
|---|---|
| Credencial Postgres PROD | `bnAZiTa3htEORYRD` |
| `bv-verificacao` | `FQ8W178X7MUx1JDK` |
| `bv-recepcao` | `CgCUXOfOxc6GWDJR` |
| `bv-vigia` | `uAPtIcqw4wyorff5` |
| `bv-alerta` (7 nos desde 2026-11-21: tambem alerta o WhatsApp da loja fora do ar, pela conexao reserva; ver `docs/melhorias-atendimento.md`) | `N62lndxe74YZqZwm` |
| `bv_graces` | `co2i51aDgVHHHYF8` |
| `interpretar_midia` | `jzov64mQwqxBmyy9` |
| `bv_confirmacao` | `Hc8MjSFbzYJXEQOJ` |
| `entregar_rajada` | `xvz6ujFMpbVKXY6I` |

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
| `Barbearia Vila Postgres PROD` | postgres | `lKwTwGxPO9zHbthQ` (criada em 2026-10-21; database `barbearia_vila`) |
| `Barbearia Vila Redis` (DB 2) | redis | `chtScO4j08LclN89` |
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
- CHK020/P3 resolvido (owner, 2026-10-21): diario 03:30 de Sao Paulo, 14 dias; cron instalado em 2026-10-22 (secao Producao).

## Verificacao do repositorio e CI (fase 7)

- `scripts/verificar-repo.py` (regras de `contracts/config-ambiente.md` + todo id do config consta neste arquivo) e `scripts/varrer-segredos.py` (`git ls-files`, so `arquivo:linha`) rodam no CI junto de `python3 -I -m unittest discover -s tests` (sem rede), via `CMD_LINT` do `cockpit.config` e passo Lint do `ci.yml`.
- Editar `ci.yml`/`.cockpit/LEIAME.md` a mao diverge de `.cockpit/manifesto.sha256`; ao rodar `configurar.sh --atualizar`, o `CMD_LINT` do `cockpit.config` (ja atualizado) regenera ambos.

## Pendencias abertas

- CHK010: isolamento Redis so por prefixo (risco aceito, dec-030; ver secao Redis).
- P7 resolvido (owner, 2026-10-21): mensagens guardadas 12 meses com limpeza diaria apos o backup (contato e agendamentos ficam), base legal art. 7o V; o aviso de tratamento ao cliente segue a cargo do owner.
- `CONNECT` no database `n8n`: fechado em 2026-10-18 (REVOKE FROM PUBLIC, dec-025); nada aberto.
- PROD: `preparar-bancos`, `migrar`, `criar-credenciais-n8n`, backup e `instalar-crons` exigem a trava `BV_DEPLOY_PRODUCAO_AUTORIZADO` (o agente executa; owner autorizou ponta a ponta em 2026-10-22).
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

- Ids (TESTE): `bv-graces` `mjhd7O0AzrqNVrf0`; `entregar-rajada` `ilzXqBWGtcczlGEu` (mesmo id do stub). PROD: ver "Producao (2026-10-21)" abaixo.
- Ordem do fluxo: Chat Master -> `bv-recepcao` (buffer de 15 s desde 23/11, antes 8 s; lock) -> `entregar-rajada` (`Registrar turno` -> contexto -> agente `gpt-5.6-luna` -> ferramentas `bv-graces` -> `Compor` -> ate 4 saidas) -> Chat Master. Sem historico de execucao salvo (`saveData*Execution=none`), entao o diagnostico de falha exige ligar `saveDataErrorExecution` temporariamente e restaurar pelo deploy.
- Politica de teste: `python3 -I scripts/smoke-agente.py [--so c2 c3 c5 c9 c10 c11 c14 c15 c12 c13 r1 ... r10]` (r1-r10: roteiros da feature regras-negocio-agenda, chamada direta ao `bv-graces`, escrita real so no barbeiro de teste com o Paulo; tudo cancelado no `finally`). So contatos simulados; `teste.contatos_escrita` vazio (conferido tambem no workflow implantado); chamador temporario (webhook de path aleatorio, apagado no `finally`) para chamar `bv-graces`/`entregar-rajada` direto; c12/c13 trocam a credencial so no TESTE e restauram pelo deploy; ao fim, SC-010 (nenhuma proposta `executada` fica sem cancelar na Graces) e limpeza de Postgres/Redis.
- Limites medidos: c14 (pergunta longa) = 2 mensagens, ate 1 "?" por mensagem, <= 700 caracteres. S1/S2 (lista renderizada e formato do toque) continuam dependentes do contato de teste real (P2). `falhas_agente` do agente que falha = `agente|agente_falhou` (nao distingue modelo de ferramenta).
- Limite do smoke sem P1: telefone simulado nao tem cliente na Graces e `cadastrar_cliente` e vedado, entao o funil completo (resumo -> `executada`) so roda em 7.2.1; a fase 1/2 e coberta por chamada direta (c3).
- Rodada P1/P2 (onda-013): cliente de teste = Paulo (5511967296849, ja existia na Graces; nenhum cadastro feito), sempre no barbeiro de teste, tudo cancelado em `encerrar()`. `python3 -I scripts/smoke-agente.py --so c1 c4 c6 c7` (escrita real na Graces via redirecionamento ao barbeiro de teste, telefone do Paulo, sem envio real) passou; latencia SC-009 medida do inicio do turno a primeira mensagem: n=22, p50 6,7 s, p90 10,7 s (<= 20 s). `--so p2` exige `teste.contatos_escrita` = `["+5511967296849"]` no config e redeploy do `entregar_rajada` (envio real ao Paulo pela conexao 145); rodou uma vez e o config foi restaurado a `[]`.
- Defeitos achados e corrigidos nessa rodada (so TESTE): (1) a fase 2 nunca executava porque o modelo nao via o `proposta_id` do turno anterior; `Ler contexto` passou a ler a proposta pendente e `Preparar` a injeta no prompt; (2) `horarios_livres` trocava a oferta e o reagendar perdia o agendamento escolhido; `meus_agendamentos` agora guarda `pedido.agendamentos` e `bvgResolver` o usa; (3) prompt: oferecer marcar outro apos cancelar e roteiro de reagendar. PROD segue sem deploy.
- Limites S2 (itens/titulo) e formato do toque: a API aceitou 1/10/11 itens e titulos de 24/25 caracteres com `200`, sem recusar; o limite real de exibicao e o RowId do toque dependem de o owner olhar/tocar no aparelho (tarefas 1.3.1-1.3.3 seguem abertas).

## Regras de negocio da agenda (feature `regras-negocio-agenda`, TESTE, 2026-10-19)

- `bv-graces` roda um laco de estagios (Planejar -> Tem chamada? -> Graces -> Passo -> volta), com teto `graces.max_estagios` (16); estourar devolve `estagios_esgotados`. Sonda S3 aprovada.
- Limites do terceiro (`terceiro.*` no config): `buscas_max_sessao` 3, `buscas_max_dia` 5, `cadastros_max_dia` 1. O "dia" vem do banco: o `Contexto` do `bv-graces` conta `falhas_agente` (`busca_pessoa`) e `propostas` `cadastrar_terceiro` executadas, no dia de Sao Paulo, por contato (SC-011).
- `cadastrar_terceiro` tem trava propria por ambiente, `terceiro.cadastro_liberado`: ligada no PROD (aprovado pelo owner, block-001); desligada no TESTE, porque o cadastro real na Graces e irreversivel. Ligar no TESTE so com mock ou nova autorizacao do owner. `cadastrar_cliente` (cadastro do proprio cliente) tem a trava `cadastro.liberado` (2026-11-14, owner): ligada nos dois ambientes; no TESTE (`redirecionar_escrita`) nada vai a Graces e a conversa vira o cliente ficticio `cadastro.cliente_teste_id`. Em PROD grava na Graces com nome e sobrenome separados, genero `M` e o celular do WhatsApp; como conheceu fica em `contatos.como_conheceu` (migracao 0011, aplicar em PROD antes do deploy).
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


## Producao (2026-10-21, feature `producao`)

Autorizacao do owner em 2026-10-21 (banco, deploy e webhook). Tudo pela n8n2; nunca `n8n.todo-tips.com`.

| Workflow [PROD] | Id | Nos |
|---|---|---|
| Ferramentas da Graces (`bv_graces`) | `K0yVUwFr5gucXRQd` | 19 |
| Interpretar midia (`interpretar_midia`) | `IiVgK4hASaCzzbVM` | 18 |
| Confirmacao de presenca (`bv_confirmacao`) | `jI5eK7tHfFYuqCJS` | 23 |
| Entregar rajada (`entregar_rajada`) | `QTP7ezx661uFp7Wj` | 76 |
| Recepcao (`bv-recepcao`) | `yUEWTZpNYMfIotdg` | 62 |
| Vigia da recepcao (`bv-vigia`) | `hbHUY1RLNS5SJ3sP` | 3 |
| Verificacao (`bv-verificacao`) | `M07jjghR3IJClmDW` | 2 |
| Alerta fora de banda (`bv-alerta`, so PROD) | `qbA6tXtfzHLZr11T` | 4 |

- Conferidos com `get_workflow_details` depois da publicacao: ativos, `versionId` = `activeVersionId`, mesma contagem de nos do TESTE. O `validate_node_config` rodou so no no novo (`Normalizar`, liberacao); os demais nos sao os do TESTE.
- `bv-mensagens` **nao** foi publicado: a reconciliacao dele programa envios sem consultar `mensagens.ativo` (tasks 2.7). Vai para PROD so com `mensagens.ativo` true, depois do ok do owner (`deploy-n8n` recusa antes).
- **Liberacao (2026-10-22, ok do owner):** `liberacao.contatos` = `[]`: a recepcao de PROD atende todos os numeros. Rollback: voltar a lista com os numeros de teste + deploy da recepcao.
- **Barbeiro de teste em PROD (2026-10-22, pedido do owner):** `graces.teste_contatos` (owner, `5511971634416`, `5511995164884`, `559184617250`, `554797565968`, `5511948903182`) ve o ZZ TESTE em listas e no texto e so esses numeros escrevem, e **so** na agenda dele (fase 1 recusa barbeiro real, fase 2 sempre redireciona ao de teste). Para os demais clientes o de teste segue oculto e a escrita segue desligada. Retirar: lista vazia + deploy de `bv_graces` e `entregar_rajada`.
- **Fila de atendimento humano (owner, 2026-11-16):** cada evento do Chat Master traz o `queueId` do ticket. A recepção grava em `contatos` a fila do último evento (`fila_id`) e, na fila humana (`handoff.setor_id`), a última interação e de quem foi (`fila_interacao_em`, `fila_ultima_de`). Com o ticket na fila humana o agente não responde, mesmo em sessão nova; as mensagens da equipe entram no histórico (`mensagens`, id `equipe-<id>`). O `bv-vigia` encerra o ticket (`updateAPI`, `status: closed`) depois de `handoff.encerrar_apos_min` (30) sem interação. Se a última mensagem foi do cliente, ele recebe o aviso `textos.fila_sem_resposta`, exceto quando a equipe respondeu nas últimas 24 horas, a última mensagem dela não é pergunta nem promessa de retorno e, depois dela, o cliente só agradeceu ou se despediu (`bvMSoAgradeceu`, desde 23/11): aí o chamado encerra calado. Com `handoff.encerrar_so_respondido` verdadeiro, só encerra se a última mensagem foi da equipe: cliente que ainda espera resposta continua na fila. `handoff.encerrar_ativo` fica falso no TESTE, que usa contatos simulados. `handoff.silencio_por_fila` desliga a regra da fila e volta ao silêncio só pela sessão: é a chave de segurança caso as conversas novas de PROD cheguem marcadas com a fila humana.
- **Retomada (2026-11-16):** resposta dada até `retomada.resposta_max_min` (720) depois da retomada continua a conversa; proposta com horário já passado não é retomada; quando o horário envolvido é nas próximas 6 h, a retomada sai depois de `retomada.apos_min_urgente` (20) em vez de 120.
- **Serviços mais pedidos primeiro (2026-11-16):** `graces.servicos_destaque` lista os nomes na ordem medida em `/agenda/completa` (janela de 15 dias, 294 agendamentos; o corte adulto é 55%). Nome que sair do catálogo é ignorado; serviço fora da lista aparece depois, na ordem da API. Para rever, refaça a contagem e edite o config dos dois ambientes.
- **Um lembrete por cliente e dia (2026-11-16):** `mensagens.juntar_min` (120) é a distância máxima, a partir do primeiro serviço do dia, para um serviço entrar no mesmo lembrete. A primeira linha (líder) manda o lembrete citando todos; as outras (seguidoras) não vão ao Chat Master e terminam como `cancelada`/`junto`. A resposta ao lembrete vale para todas (`bv-confirmacao`, nós `Irmas` e `Graces irmas`).
- **Agenda real em PROD (2026-11-15, pedido do owner):** `graces.escrita_liberada` true no PROD: qualquer contato agenda, remarca e cancela na agenda real de todos os barbeiros, menos o de teste (bloqueado na fase 1 e na fase 2) e os so da equipe (`graces.barbeiros_humanos`, clausula petrea). `graces.teste_contatos` vazio: o barbeiro de teste sumiu de PROD para todos. Rollback sem codigo: `escrita_liberada` false + deploy (volta o teste fechado; com a lista vazia, ninguem grava). O TESTE segue redirecionado ao barbeiro de teste.
- **Lembretes no Chat Master (2026-11-15, pedido do owner):** 24 h e 1 h antes de cada agendamento, no modulo de Agendamentos do Chat Master (visivel para a equipe). `mensagens_agendadas` segue a fonte unica (agente ao agendar, remarcar e cancelar; reconciliacao com a Graces a cada 15 min, que pega o balcao e cria o contato de quem nunca falou no WhatsApp). O ramo `A cada sincronizacao` do `bv-mensagens` (a cada `varredura_s`) so chama a API quando algo difere: cria (`POST /api/schedules`, `userId` `chatmaster.user_id`, sem abrir ticket), remarca com `PUT /api/schedules/{id}` e apaga ao cancelar. `sendAt` no fuso de Brasilia (medido). Contato do Chat Master: do webhook (`contatos.chatmaster_contato_id`) ou pela busca por numero; inexistente e criado. A varredura antiga so trata os tipos legados (confirmacao, lembrete, pos), que deixaram de ser programados. Migracao 0012 antes do deploy; o primeiro deploy do `bv-mensagens` em PROD foi com `--criar` (2026-11-15: `qzPyEQ8993y28ptr`). Confirmacao (2026-11-15): o lembrete de 24 h pede SIM/NAO; a resposta vai pelo `confirmar_presenca` (bv-confirmacao, agora tambem para `lembrete_dia`), e o sincronizador poe a etiqueta (`chatmaster.etiquetas`, PROD 534/535) no ticket do contato e a tira no horario marcado (migracao 0015). Proposta original: `docs/propostas/confirmacao-visual-chatmaster.md`.
- **Retomada de agendamento abandonado (2026-11-16, pedido do owner; roadmap feature 9):** ramo `A cada retomada` do `bv-mensagens` (a cada `retomada.varredura_min`). Reivindica, numa instrucao so, as conversas em que a ultima mensagem e do agente, tem pergunta, tem entre `apos_min` (120) e `max_min` (1080) e ha agendamento em curso (proposta pendente de agendar/remarcar, oferta aberta de barbeiro/horario ou servico escolhido), sem handoff, sem escrita concluida na sessao e com cliente cadastrado; marca `conversas.retomada_em` (uma por sessao, nunca repete) e envia um texto pelo Chat Master, so entre `hora_inicio` e `hora_fim` (PROD 08:00-20:00). A retomada conta como atividade da sessao: quem responde em ate 2 h continua de onde parou. TESTE: simulado fora de `teste.contatos_escrita`, sem janela de horario. Desligar: `retomada.ativo` false + deploy. Migracao 0016 antes do deploy.
- **Turno preso sem resposta (2026-11-16):** em PROD uma chamada a OpenAI travou (o no `Modelo` nao tinha `timeout`; o padrao do SDK passa do `executionTimeout` de 300 s) e a execucao foi morta sem contingencia: a mensagem do cliente ficou 2h25 parada. Agora `agente.modelo_timeout_ms` (45000) e `agente.modelo_retentativas` (1) fazem a chamada travada falhar rapido e cair na contingencia. Segunda camada: o `bv-vigia` (a cada 5 min), ao registrar a tentativa estourada, fecha o turno `em_andamento` como `falhou` e manda `textos.contingencia` ao cliente, so se ele nao recebeu resposta desde a mensagem e nao esta em handoff; quando ele escreve de novo, a mensagem presa e reprocessada junto (`Montar turno` ja recolhe turnos vencidos).
- **Confirmacao da vespera:** `mensagens.ativo=false` e `bv-mensagens` fora de PROD ate novo ok do owner.
- Credenciais: Postgres `lKwTwGxPO9zHbthQ`; Redis, Graces e Verificacao reaproveitam as do TESTE; a OpenAI de PROD e a `tVRedGvpa2XF0gX1` e o TESTE passou a ter a sua (`zm8LmmbPm1BzU4ym`, 2026-11-18), para a suite nao gastar o saldo de producao (Redis isolado pelo prefixo `bv:prod:`). Chat Master de PROD: `rSt9OTva2S2MwtHE` (2026-11-15, owner: conexao 159 "Conexao Recepcao", QR Pro, outra conta do Chat Master; token `CHATMASTER_TOKEN_PRODUCAO` no `.env.smoke`). Fila do agente 107 "Atendimento Agente" (`chatmaster.queue_id`) e fila humana 106 "Atendimento" (`handoff.setor_id`), confirmado pelo owner em 2026-11-15 (estavam invertidas); o TESTE segue na 145, fila 0 e setor 78. A recepcao autentica cada evento pelo hash do `token_origin` (token da conta da conexao): PROD usa `BV_WEBHOOK_TOKEN_SHA256_PRODUCAO` (hash do token da conta da 159) e o TESTE `BV_WEBHOOK_TOKEN_SHA256` (conta da 145), ambos no `.env.n8n`; sem isso a recepcao de PROD recusava todo evento da 159 com 401. Webhook da 159 na recepcao de PROD desde 2026-11-15 (`scripts/virar-conexao-prod.py`, so o owner, com a trava; confere CONNECTED antes e o webhook depois). Rollback: deploy da `main` anterior (`08fcab3`) e webhook da 145 de volta na recepcao de PROD.
- Banco `barbearia_vila`: migracoes 0001 a 0010. Backup manual e restore em banco descartavel verificados (`backup-bancos.py --restaurar-teste`).
- Backup diario: `config/vps/barbearia-backup-limpeza.{sh,cron}`, 06:30 UTC (03:30 de Sao Paulo; a VPS esta em `Etc/UTC` e o cron do Ubuntu nao tem `CRON_TZ`), 14 dias, e a limpeza LGPD de mensagens com mais de 12 meses logo apos um backup ok. Instalado em 2026-10-22 com `BV_DEPLOY_PRODUCAO_AUTORIZADO=sim python3 -I scripts/_vps.py instalar-crons` (atomico, `sh -n` antes); 1a execucao manual: rc 0, dump de 34 KB legivel por `pg_restore --list` (12 tabelas), limpeza apagou 0. Log em `/root/barbearia_vila/backup-limpeza.log`.
- Cron de midia: linha de PROD (`IiVgK4hASaCzzbVM`) em `config/vps/barbearia-limpar-midia.cron`; instalado pelo mesmo `instalar-crons`.
- Hook de guarda de PROD (proposto na secao de riscos): **nao instalado**; a instalacao e do owner.
- **Alerta fora de banda** (`bv-alerta`, FR-016): a cada 10 min consulta `falhas_agente`. Consulta com erro = "Postgres nao respondeu"; 3+ `agente_falhou` em 10 min = "pode ser cota ou gasto da OpenAI" (proxy: sem chave de admin para ler o custo); desde 2026-11-27, 1+ lista do lembrete de 24 h devida entre `alerta.repetir_min` (60) e 5 min atras que nao saiu (falhou, perdida por atraso, ou pendente e parada ha mais de 5 min; a que espera a proxima retentativa nao conta) = "lembrete(s) de 24 h nao sairam", que nao sai com a conexao da loja fora (ver `docs/melhorias-atendimento.md`). Envia pelo Chat Master, pela conexao da loja (159, `chatmaster.whatsapp_id`) e, com ela fora, pela conexao reserva (145, `alerta.reserva`), para `alerta.contato` (5511967296849), no maximo 1 por tipo por hora (staticData; o tipo `whatsapp` e um por queda). Limite: o alerta roda no mesmo n8n do atendimento (`n8nv`, processo `bv_n8n`); se ele cair, nao ha alerta. Teste em 2026-10-21: execucao com o banco no ar e 0 falhas nao enviou nada (sem execucao de erro); o envio real nao foi exercitado (inserir falhas sinteticas em PROD foi negado ao agente).

**Rollback por passo:**

| Passo | Rollback |
|---|---|
| Banco `barbearia_vila` | `DROP DATABASE barbearia_vila; DROP ROLE barbearia_vila;` (so enquanto vazio; senao restaurar o dump) |
| Credencial Postgres PROD | apagar `lKwTwGxPO9zHbthQ` no n8n2 |
| Workflows [PROD] | despublicar (`unpublish`) e arquivar pelos ids acima; os [TESTE] nao foram tocados alem da recepcao (liberacao com lista vazia) |
| Webhook da 145 | `capturar-webhook.py restaurar --destino recepcao-producao` (volta a URL anotada em `.webhook-145-antes-prod.url`) |
| Crons | remover `/etc/cron.d/barbearia-backup-limpeza` e a linha de PROD do cron de midia |
