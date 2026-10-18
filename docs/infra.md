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
