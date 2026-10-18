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

- CONNECT publico no database `n8n` (aberto): restringir (`REVOKE CONNECT ... FROM PUBLIC`) altera a stack compartilhada; so com decisao do owner.
