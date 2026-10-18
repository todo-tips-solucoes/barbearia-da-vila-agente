# Quickstart / Cenários de teste: infra-base

**Feature**: `infra-base` | **Date**: 2026-10-18

Pré-requisitos: chave SSH `/root/.ssh/id_ed25519_n8n_vps`; `.env.n8n` (do Gold) com `N8N_API_URL` e
`N8N_API_KEY`. Testes automatizados (`python3 -I -m unittest discover tests`) rodam no CI (Princípio
III); os cenários abaixo rodam contra a VPS/instância reais, só em TESTE.

## Cenário 1: sondagens antes de escrever (happy path)

1. `python3 -I scripts/verificar-infra.py --redis --backup` → **Expected**: relata `INFO keyspace`
   (DB 2 sem chaves) e as rotinas de backup encontradas; nada é escrito. DB 2 com chaves → exit 1 e
   bloqueio humano (research P1).

## Cenário 2: preparar banco de TESTE (US1)

1. `python3 -I scripts/preparar-bancos.py --alvo teste` → 2. `python3 -I scripts/migrar.py --alvo teste`
   → **Expected**: database/role `barbearia_vila_teste` e as 5 tabelas existem; exit 0.
3. Rodar 1 e 2 de novo → **Expected**: "0 alterações", senha inalterada (SC-001).
4. `python3 -I scripts/verificar-infra.py --acesso` → **Expected**: usuário de TESTE recusado em
   `barbearia_vila` (SC-002); acesso ao `n8n` relatado (se aberto → research P2).

## Cenário 3: Redis isolado (US2)

1. `verificar-infra.py --redis` com `db_confirmado: true` grava e lê `bv:teste:verif:<ts>` e apaga →
   **Expected**: ok.
2. `scripts/limpar-redis.py --alvo teste --padrao verif:` → **Expected**: só chaves `bv:teste:verif:*`
   removidas; contagem de `bv:prod:*` e `gi:*` igual antes/depois (SC-007).

## Cenário 4: credenciais e deploy em TESTE (US3/US4)

1. `python3 -I scripts/criar-credenciais-n8n.py --alvo teste` → **Expected**: imprime `nome → id`;
   2ª execução pula todas.
2. `scripts/deploy-n8n.sh integracao --criar bv-verificacao` (uma vez) → gravar id no config.
3. `scripts/deploy-n8n.sh integracao` 3× → **Expected**: 1 workflow por id, publicado (SC-004).
4. POST no webhook de verificação com o header → **Expected**: `{ok: true}`.

## Cenário 5 (erro): PROD sem confirmação (FR-011)

1. `scripts/deploy-n8n.sh producao` → **Expected**: exit 2, nenhuma chamada ao n8n (SC-005).
2. `BV_DEPLOY_PRODUCAO_AUTORIZADO=sim scripts/deploy-n8n.sh producao --confirmar-id errado` → exit 2.

## Cenário 6 (erro): id inexistente

1. Config com id que não existe → `deploy-n8n.sh integracao` → **Expected**: exit 1 em "GET", nada
   criado nem publicado.

## Cenário 7: segredos e coerência (US4)

1. `python3 -I scripts/varrer-segredos.py` e `python3 -I scripts/verificar-repo.py` → **Expected**:
   0 achados (SC-006); prefixos disjuntos; todo id do config está em `docs/infra.md`.

## Cenário 8: backup

1. `python3 -I scripts/backup-bancos.py --alvo teste --retencao <N do owner>` → **Expected**: arquivo
   `.dump` > 0 bytes, modo 600, sob `/root/barbearia_vila/backups/`. Sem `--retencao` → exit 2.
