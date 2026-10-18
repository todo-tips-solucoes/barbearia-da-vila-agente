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

Credenciais da instancia (47) listadas por `GET /api/v1/credentials`: **nenhuma** especifica da Barbearia da Vila (`Barbearia Vila Postgres TESTE/PROD`, `Barbearia Vila Redis`, `Barbearia Vila Verificacao` estao **inexistentes**; serao criadas na fase 4).

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
- CHK010 / task 3.2.1 `[PENDENTE-OWNER]`: isolamento por ACL Redis (`~bv:teste:*`) nao decidido; vale o isolamento so por prefixo (modelo do Gold). Risco: qualquer cliente com a senha da stack le/escreve em qualquer prefixo.
