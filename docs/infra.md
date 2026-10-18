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
- A API key do n8n vem de `.env.n8n` (do Gold, fora do git) via `BV_ENV_N8N`.

## Backup (fase 6)

- `scripts/backup-bancos.py --alvo teste|producao|todos --retencao N [--validar]`: `pg_dump -Fc` em `/root/barbearia_vila/backups/bv-<banco>-<UTC>.dump` (modo 600, diretorio 700), arquivo novo por execucao; rotacao so de `bv-<banco>-*.dump`. PROD (inclusive em `todos`) exige a trava. Validado em 2026-10-18 para TESTE (`pg_restore --list` ok).
- `[PENDENTE-OWNER]` (CHK020/P3, task 6.1.4): frequencia e retencao do backup. Nenhum cron foi instalado e nenhum valor foi escolhido.

## Verificacao do repositorio e CI (fase 7)

- `scripts/verificar-repo.py` (regras de `contracts/config-ambiente.md` + todo id do config consta neste arquivo) e `scripts/varrer-segredos.py` (`git ls-files`, so `arquivo:linha`) rodam no CI junto de `python3 -I -m unittest discover -s tests` (sem rede), via `CMD_LINT` do `cockpit.config` e passo Lint do `ci.yml`.
- Editar `ci.yml`/`.cockpit/LEIAME.md` a mao diverge de `.cockpit/manifesto.sha256`; ao rodar `configurar.sh --atualizar`, o `CMD_LINT` do `cockpit.config` (ja atualizado) regenera ambos.

## Pendencias abertas

- CHK010: isolamento Redis so por prefixo (risco aceito, dec-030; ver secao Redis).
- CHK020/P3: frequencia e retencao de backup (owner decide; sem cron instalado).
- P7: retencao do historico de mensagens (LGPD) `[PENDENTE-OWNER]`, fora desta feature.
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
