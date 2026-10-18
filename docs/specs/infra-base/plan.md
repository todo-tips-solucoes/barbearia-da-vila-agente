# Implementation Plan: Infraestrutura base do agente da Barbearia da Vila

**Feature**: `infra-base` | **Date**: 2026-10-18 | **Spec**: [spec.md](./spec.md)

## Summary

Preparar, na stack `n8n` da VPS `178.156.134.167`, os bancos `barbearia_vila` (PROD) e
`barbearia_vila_teste` (TESTE) com esquema mínimo (contatos, mensagens, mensagens agendadas,
handoffs), prefixos Redis disjuntos (`bv:prod:` / `bv:teste:`), credenciais do n8n, configuração por
ambiente sem segredos e um deploy pela API pública do n8n que atualiza e publica sem nunca criar às
cegas. Abordagem: replicar o padrão de scripts do projeto de referência `goldincision_licienciados`
(`_vps.py` com lista fechada de operações, `migrar.py`, `deploy-n8n.sh/.py`, `varrer-segredos.py`,
`verificar-repo.py`), corrigindo dois pontos: prefixos Redis disjuntos e deploy sem POST implícito.

## Technical Context

**Language/Version**: Python 3 (`python3 -I`, só stdlib) + bash (wrapper `deploy-n8n.sh`) — padrão do Gold
**Primary Dependencies**: `ssh` (chave `/root/.ssh/id_ed25519_n8n_vps`), `docker exec` na VPS, API pública do n8n
**Storage**: Postgres 17 `n8n-postgres-1` (databases da barbearia); Redis 7.2 `n8n-redis-1`, DB 2 proposto (a sondar)
**Testing**: `unittest` (stdlib) em `tests/`, no CI (Princípio III ligado); sondagens reais por `verificar-infra.py`
**Target Platform**: VPS Ubuntu da stack n8n; scripts rodam na máquina do mantenedor (Linux)
**Project Type**: cli (scripts de infraestrutura) + 1 workflow n8n de verificação
**Performance Goals**: N/A (operações manuais pontuais)
**Constraints**: só stack `n8n`; nenhum segredo no repo/log; PROD só com trava do owner; idempotência
**Scale/Scope**: 2 bancos, 5 tabelas, 2 arquivos de config, ~10 scripts, 1 workflow

## Constitution Check

*GATE: Deve passar antes do Phase 0. Re-checado após Phase 1 (abaixo: mantém PASS).*

| Princípio | Status | Notas |
|-----------|--------|-------|
| III. Validação estática no CI | PASS | testes `unittest` e lint só no CI |
| V. Fonte oficial antes de afirmar | PASS | rotas da API do n8n reconfirmadas no `openapi.yml` antes de codificar (research P4/P5) |
| VI. Português do Brasil | PASS | artefatos, nomes de tabelas e mensagens em PT-BR |
| VII. Scripts portáveis, idempotentes e contidos | PASS | stdlib; escopo declarado por script (contracts/scripts-cli.md); 2ª execução = 0 alterações |
| XII. Skills e validação de n8n | PASS | `bv-verificacao.json` validado com as skills de n8n antes do commit |
| XIII. Isolamento TESTE/PROD e da VPS | PASS | bancos e prefixos próprios; `_vps.py` restringe à stack `n8n`; PROD com trava; agente só TESTE |
| XIV. Sem segredos; dados mínimos | PASS | segredos em `infra.env`/`.env.n8n`/credenciais; esquema sem dados sensíveis |
| XV. Teste antes de produção | PASS | tudo exercitado em TESTE; PROD é passo do owner |
| XVI. Zero fabricação | PASS | ids/DB/backup sem fonte ficam `[PENDENTE]` (research, tabela de pendências) |
| IX, X, XI (Graces/conversa/agenda) | N/A | sem lógica de atendimento nesta feature |

## Project Structure

### Documentation (this feature)

```text
docs/specs/infra-base/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    ├── config-ambiente.md
    └── scripts-cli.md
```

### Source Code (repository root)

Diretórios novos (o repositório ainda não tem código):

```text
config/ambientes/integracao.json      # TESTE, sem segredos
config/ambientes/producao.json        # PROD, sem segredos
db/migrations/0001_esquema_inicial.sql
scripts/_vps.py                       # acesso único à VPS, lista fechada
scripts/preparar-bancos.py
scripts/migrar.py
scripts/criar-credenciais-n8n.py
scripts/deploy-n8n.sh                 # já referenciado em cockpit.config
scripts/deploy-n8n.py
scripts/backup-bancos.py
scripts/limpar-redis.py
scripts/verificar-infra.py            # sondagens read-only
scripts/varrer-segredos.py
scripts/verificar-repo.py
workflows/bv-verificacao.json         # só TESTE
tests/test_*.py                       # unittest, sem rede (mocks de SSH/HTTP)
docs/infra.md                         # FR-014
```

**Structure Decision**: espelha o layout do Gold (`config/`, `db/migrations/`, `scripts/`, `workflows/`,
`tests/`), que é a referência declarada pelo owner. O CI (`.github/workflows/ci.yml`) ganha a execução
de `python3 -I -m unittest discover tests`, `varrer-segredos.py` e `verificar-repo.py`; a forma exata
(passo novo ou extensão de `CMD_LINT` em `cockpit.config`) é decidida na task, respeitando que o
`ci.yml` é gerado pelo cockpit.

## Fluxo de preparação (ordem)

1. `verificar-infra.py --redis --backup --acesso` (somente leitura) → resolve P1/P2/P3 ou bloqueia.
2. `preparar-bancos.py --alvo teste` → `migrar.py --alvo teste`.
3. Confirmar DB Redis (`db_confirmado: true`) → `verificar-infra.py --redis` (escrita sob `bv:teste:verif:`).
4. `criar-credenciais-n8n.py --alvo teste` → ids no config e em `docs/infra.md`.
5. `deploy-n8n.sh integracao --criar bv-verificacao` (uma vez) → `deploy-n8n.sh integracao`.
6. PROD (passos 2, 4 e backup com `--alvo producao`): **só o owner**, com `BV_DEPLOY_PRODUCAO_AUTORIZADO=sim`.

## Convenções de Borda

| Camada | Case style | Validação | Fonte da verdade |
|--------|------------|-----------|------------------|
| Colunas Postgres | snake_case PT-BR | CHECK + migração | `db/migrations/*.sql` |
| Config por ambiente (JSON) | snake_case PT-BR | `verificar-repo.py` | `contracts/config-ambiente.md` |
| Chaves Redis | `<prefixo><dominio>:<id>` | `verificar-repo.py` (prefixos disjuntos) | `config/ambientes/*.json` (`redis.prefixo`) |
| API do n8n | camelCase (da API) | resposta HTTP | `<N8N_API_URL>/api/v1/openapi.yml` |

Mapper DB↔workflow: N/A nesta feature (os workflows de atendimento definem o seu na `recepcao-buffer`).

## Segurança (gate owasp-security, 2026-10-18)

Sem findings critical/high. Mitigações incorporadas ao design:

| Sev. | Risco | Mitigação |
|------|-------|-----------|
| medium | Injeção em comando remoto (SSH → `docker exec psql/redis-cli`) | `_vps.py` aceita só bancos/DBs do config e comandos Redis de allowlist; SQL e senhas por stdin; argumentos com `shlex.quote`; `subprocess` sem `shell=True` local |
| medium | Isolamento Redis só por prefixo: a credencial Redis do n8n acessa todos os DBs | risco aceito (mesmo modelo do Gold, spec FR-007/FR-019); ACL por prefixo no Redis (`~bv:teste:*`) altera a config compartilhada da stack → só com decisão do owner `[PENDENTE-OWNER]` |
| medium | Agente autônomo definir a trava de PROD (`BV_DEPLOY_PRODUCAO_AUTORIZADO`) | trava dupla (variável + `--confirmar-id`); o agente nunca a define (Princípio XIII); recomenda-se hook de guarda no `.claude/` bloqueando a string em comandos do agente |
| low | Senha visível em `ps` na VPS | senha lida do `infra.env` pelo shell remoto e passada por stdin/arquivo, nunca como argumento |
| low | Backup com dados de clientes | modo 600 sob `/root/barbearia_vila/backups/`, sem cópia fora da VPS nesta feature |
| low | Webhook de verificação público | Header Auth; responde só `{ok: true}`; só TESTE |
| low | SSH sem verificação de host | manter `StrictHostKeyChecking` padrão (known_hosts), `BatchMode=yes` |

## Complexity Tracking

Sem violações de constituição. Desvio consciente do Gold: deploy não cria workflow por POST implícito
(FR-010) e prefixos Redis disjuntos (FR-008) — ambos reduzem risco, não adicionam camada.
