# Research: infra-base

**Feature**: `infra-base` | **Date**: 2026-10-18 | **Spec**: [spec.md](./spec.md)

> Fontes usadas: `docs/decisoes-pre-00c.md`, `docs/constitution.md` 1.1.0, `docs/roadmap.md` e, como
> referência de arquitetura, o projeto `/home/projetos/goldincision_licienciados` (`docs/infra.md`,
> `workflows/README.md`, `scripts/*.py`, `config/ambientes/*.json`, `db/migrations/*.sql`).
> Itens sem fonte ficam como `[PENDENTE]` / `[PENDENTE-OWNER]`; nada aqui é suposto.

## Decision 1: Linguagem e forma dos scripts

- **Decision**: scripts em `python3 -I` só com biblioteca padrão, com wrapper bash apenas onde o
  `cockpit.config` já exige (`scripts/deploy-n8n.sh integracao|producao`). Testes em `unittest`
  (stdlib), rodando no CI (Princípio III ligado).
- **Rationale**: o owner decidiu "rodar igual ao Gold" (`docs/decisoes-pre-00c.md`, linha
  "Referência"); o Gold usa exatamente esse padrão (`scripts/*.py` + `deploy-n8n.sh` →
  `deploy-n8n.py`). Não é decisão estrutural nova: stack, arquitetura e persistência foram fixadas
  pelo owner; a linguagem dos scripts de apoio segue o projeto de referência.
- **Alternatives considered**: bash puro (frágil para JSON/HTTP); Node (dependência nova sem ganho).

## Decision 2: Prefixos Redis disjuntos (resolve FR-008 × FR-019)

- **Decision**: PROD = `bv:prod:`, TESTE = `bv:teste:`. Nenhum é prefixo textual do outro; a limpeza
  de um ambiente usa `SCAN MATCH <prefixo>*` e só apaga chaves que começam com o seu prefixo.
- **Rationale**: a clarify (dec-010) havia fixado `bv:`/`bv:teste:` copiando o Gold (`gi:`/`gi:teste:`),
  mas `bv:` é prefixo de `bv:teste:`, o que viola FR-008 e faz uma limpeza de PROD por `bv:*`
  atingir o TESTE. Prefixos disjuntos eliminam a exceção em vez de documentá-la. `spec.md`
  (FR-019 e Clarifications) foi revisada no plan.
- **Verificação**: `scripts/verificar-repo.py` falha se o prefixo de um `config/ambientes/*.json` for
  prefixo do outro, ou se algum não terminar em `:`; teste dedicado em `tests/test_repo.py`.
- **Alternatives considered**: manter `bv:` e excluir `bv:teste:` no padrão de limpeza (regra frágil,
  qualquer novo script pode esquecer); DBs Redis diferentes por ambiente (gasta um DB a mais sem
  necessidade, e o Gold já compartilha DB entre ambientes).

## Decision 3: Database lógico do Redis

- **Decision**: DB 2 é **proposta**. Antes do primeiro uso, `scripts/verificar-infra.py --redis` faz
  sondagem somente leitura (`INFO keyspace` e `DBSIZE` no DB 2) via `scripts/_vps.py`. DB 2 com
  chaves → nenhum script escreve nele e a execução registra bloqueio humano pedindo outro DB.
- **Rationale**: DB 0 = n8n e DB 1 = Gold (Gold `docs/infra.md`). Que o DB 2 esteja livre não tem
  fonte; só a sondagem confirma.
- **Status**: `[PENDENTE]` até a sondagem; o valor `2` fica em `config/ambientes/*.json` marcado
  como proposto (`redis.db_confirmado: false`), e `verificar-infra.py` recusa uso enquanto `false`.

## Decision 4: Isolamento dos bancos (FR-002, US1 cenário 3)

- **Decision**: `scripts/preparar-bancos.py` cria role e database com o mesmo nome, dono = role, e
  aplica `REVOKE CONNECT ... FROM PUBLIC` + `GRANT CONNECT ... TO <dono>` **nos dois bancos da
  barbearia**. O acesso cruzado é verificado por `verificar-infra.py --acesso` (tenta conectar com o
  usuário de TESTE em `barbearia_vila` e em `n8n`; espera recusa).
- **Rationale**: no Postgres, um database novo concede `CONNECT` a `PUBLIC` por padrão; sem o REVOKE,
  o usuário de TESTE conectaria em PROD.
- **Pendência**: o database `n8n` (e o do Gold) podem ter `CONNECT` para `PUBLIC`. Alterar grants do
  banco do n8n afeta outro serviço da stack, então **não** é feito por esta feature sem decisão:
  se a sondagem mostrar acesso aberto ao `n8n`, a execução registra bloqueio humano
  `[PENDENTE-OWNER]` com a opção "REVOKE CONNECT ON DATABASE n8n FROM PUBLIC" (o dono `n8n` mantém
  acesso por ser owner) versus aceitar o risco.

## Decision 5: Senhas e idempotência

- **Decision**: senha gerada por `secrets.token_urlsafe` **somente** se a variável (`PG_PASSWORD` /
  `PG_TESTE_PASSWORD`) não existir em `/root/barbearia_vila/infra.env`; existindo, é reutilizada e
  nunca trocada (`ALTER ROLE ... PASSWORD` não roda em re-execução). A senha trafega por stdin do SSH,
  nunca por argumento de linha de comando nem em log.
- **Rationale**: FR-005 e edge case "senha já definida"; padrão do Gold (`criar-db-teste.py`).

## Decision 6: Migrações

- **Decision**: `db/migrations/NNNN_<nome>.sql` aplicadas por `scripts/migrar.py --alvo teste|producao`
  em transação única por arquivo, com controle em `schema_migrations (versao, nome, sha256,
  aplicada_em)`. Migração já aplicada com sha256 diferente → exit 1 sem aplicar nada.
- **Rationale**: idêntico ao Gold (`scripts/migrar.py`), garante idempotência (SC-001) e detecta
  edição de migração já aplicada.

## Decision 7: Deploy sem criação às cegas (FR-009..FR-011)

- **Decision**: `scripts/deploy-n8n.sh <integracao|producao> [--so NOME] [--confirmar-id ID]` →
  `deploy-n8n.py`. Para cada workflow: lê o id em `config/ambientes/<amb>.json`; `GET
  /api/v1/workflows/{id}` (404 → falha sem criar); `PUT /api/v1/workflows/{id}`; só após 2xx,
  `POST /api/v1/workflows/{id}/publish`. Etapa que falhou aparece na mensagem de erro.
  Criação inicial só pelo subcomando explícito `--criar NOME`, permitido apenas em `integracao`,
  apenas quando o id do config está vazio **e** `GET /api/v1/workflows?name=` não retorna o nome;
  imprime o id para ser gravado no config.
- **Rotas**: as mesmas usadas pelo Gold, cuja docstring registra que foram confirmadas em
  `<N8N_API_URL>/api/v1/openapi.yml`. A execução MUST reconfirmar no `openapi.yml` da instância
  antes de codificar (Princípio V).
- **PROD**: exige `--confirmar-id` igual ao id de PROD do config **e** `BV_DEPLOY_PRODUCAO_AUTORIZADO=sim`
  no ambiente; faltando qualquer um, exit 2 antes de qualquer chamada. O agente autônomo nunca
  define essa variável (Princípio XIII).
- **Alternatives considered**: comportamento do Gold (POST quando não acha pelo nome) — rejeitado
  por FR-010.

## Decision 8: Credenciais do n8n

- **Decision**: `scripts/criar-credenciais-n8n.py` cria, por nome e de forma idempotente (nome
  existente → pula), as credenciais `Barbearia Vila Postgres TESTE`, `Barbearia Vila Postgres`
  (PROD), `Barbearia Vila Redis` e `Barbearia Vila Verificacao` (Header Auth do workflow de
  verificação). Lê a senha do Postgres da VPS (`infra.env`) e a do Redis do compose da stack, sem
  imprimir; imprime só `nome → id`. Os ids entram em `config/ambientes/*.json` e em `docs/infra.md`.
- **Fora do script nesta feature**: OpenAI (chave própria ainda pendente — `docs/decisoes-pre-00c.md`),
  Graces (Header Auth com `GRACES_API_KEY`) e Chat Master: registradas em `docs/infra.md` com nome e
  finalidade e id `[PENDENTE]`, criadas pelas features que as usam.
- **Pendência**: os campos exatos de cada tipo de credencial (`postgres`, `redis`, `httpHeaderAuth`)
  MUST ser lidos de `GET /api/v1/credentials/schema/{tipo}` na instância antes de codificar; não são
  afirmados aqui.

## Decision 9: Backup (FR-021)

- **Decision**: `scripts/backup-bancos.py --alvo teste|producao|todos --retencao N` executa na VPS
  `docker exec n8n-postgres-1 pg_dump -U <dono> -Fc <banco>` para
  `/root/barbearia_vila/backups/<banco>-<AAAAMMDDTHHMMSS>.dump` (modo 600), confere tamanho > 0 e
  apaga apenas arquivos do próprio padrão além dos `N` mais recentes. `--retencao` é obrigatório,
  sem default.
- **Frequência e retenção**: **sem fonte** → `[PENDENTE-OWNER]`. Esta feature não instala cron nem
  timer. Antes, `verificar-infra.py --backup` faz sondagem somente leitura (`crontab -l`,
  `systemctl list-timers`, `ls` de diretórios de backup citados nelas) para saber se uma rotina
  existente já cobre os bancos; se cobrir, o escopo do agendamento cai.
- **Rationale**: o comando `pg_dump -Fc` via `docker exec n8n-postgres-1` é o mesmo do plano de
  promoção do Gold (`docs/plano-promocao-prod.md`, passo 1).

## Decision 10: Workflow de exemplo para validar o deploy (US3)

- **Decision**: `workflows/bv-verificacao.json` (só TESTE): Webhook POST com Header Auth
  (`Barbearia Vila Verificacao`), consulta `SELECT 1` no Postgres de TESTE e um `GET` de uma chave sob
  `bv:teste:verif:` no Redis, responde `{ok: true}`. O deploy o recusa em `producao`.
- **Rationale**: prova deploy (US3) e credenciais (US4) num só artefato, como o `gi-verificacao` do Gold.
  Path e webhookId: definidos ao construir o workflow (gerados, não supostos) e registrados no config.

## Pendências consolidadas

| # | Item | Tipo | Como resolve |
|---|------|------|--------------|
| P1 | DB 2 do Redis livre | `[PENDENTE]` | sondagem `verificar-infra.py --redis` |
| P2 | `CONNECT` público no database `n8n` | `[PENDENTE-OWNER]` se aberto | sondagem `--acesso` + bloqueio humano |
| P3 | Frequência e retenção do backup | `[PENDENTE-OWNER]` | owner decide; sondagem `--backup` pode reduzir |
| P4 | Campos dos tipos de credencial do n8n | `[PENDENTE]` | `GET /api/v1/credentials/schema/{tipo}` |
| P5 | Rotas da API pública | reconfirmar | `<N8N_API_URL>/api/v1/openapi.yml` |
| P6 | Ids de credenciais e workflows | `[PENDENTE]` | impressos pelos scripts na execução |
| P7 | Retenção do histórico de mensagens (LGPD) | `[PENDENTE-OWNER]` | fora desta feature; registrado em `docs/infra.md` |
