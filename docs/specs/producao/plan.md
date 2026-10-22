# Implementation Plan: Producao (features 1 a 6 em PROD)

**Feature**: `producao` | **Date**: 2026-10-21 | **Spec**: [spec.md](spec.md)

## Summary

Levar as features 1 a 6 ao PROD usando os scripts que já existem (`preparar-bancos`, `migrar`, `criar-credenciais-n8n`,
`backup-bancos`, `deploy-n8n.sh`), com o mínimo de código novo. O que falta nos scripts hoje (achado na leitura do código,
ver research.md): (a) `deploy-n8n.py` recusa `--criar` em PROD e recusa `bv-mensagens`/`bv_confirmacao`; (b) os workflows
`bv-vigia` e `bv-verificacao` têm `[TESTE]` fixo no nome e a verificação tem path fixo; (c) não existe rotina de limpeza das
mensagens com mais de 12 meses nem cron de backup; (d) o cron de mídia só cobre o id do TESTE; (e) a troca do webhook da 145 só aponta para o `bv-captura`. O restante é execução
operacional ordenada, com rollback por passo e bloqueio humano no fim.

## Technical Context

**Language/Version**: Python 3 (scripts, `python3 -I`), JavaScript (testes `node tests/*.test.js`), JSON de workflow n8n
**Primary Dependencies**: biblioteca padrão do Python; n8n2 via API/MCP; `_vps.py` (SSH + `docker exec`)
**Storage**: PostgreSQL `barbearia_vila` na stack `n8n` da VPS; Redis DB 2, prefixo `bv:prod:`
**Testing**: `node tests/*.test.js`; `python3 -I -m unittest discover -s tests`; `scripts/verificar-repo.py`; `scripts/suite-validacao.py` (17/17 no TESTE)
**Target Platform**: VPS (stack n8n) e instância n8n2
**Project Type**: scripts de operação + workflows n8n
**Performance Goals**: N/A (sem mudança de caminho quente); a suíte no TESTE mantém seus limites
**Constraints**: só stack `n8n` da VPS; PROD só com trava `BV_DEPLOY_PRODUCAO_AUTORIZADO=sim` + `--confirmar-id`; nada de escrita em agenda real
**Scale/Scope**: 1 banco, 9 workflows de PROD (4 sub + recepção + vigia + verificação + mensagens + confirmação), 1 contato autorizado até o ok

## Constitution Check

| Princípio | Status | Notas |
|-----------|--------|-------|
| II / II-bis trilha e registro na PR | PASS | trilha completa; artefatos em `docs/specs/producao/`; PR base `develop`, sem merge pelo agente |
| VII scripts idempotentes e contidos | PASS | script novo de limpeza escreve só em `mensagens` do alvo; segunda execução não muda o estado |
| IX / XI Graces fonte da verdade, escrita segura | PASS | quickstart não escreve em agenda real (FR-014) |
| XII skills de n8n e validação | PASS | `validate_node_config` antes e `get_workflow_details` depois de cada publicação |
| XIII isolamento TESTE/PROD e VPS | PASS | `barbearia_vila`, `bv:prod:`, path próprio; só stack n8n; PROD com aprovação do owner (registrada) |
| XIV sem segredos, dados mínimos | PASS | credenciais só no n8n e `.env`; retenção de 12 meses reduz dado guardado |
| XV teste antes de produção | PASS | suíte 17/17 no TESTE (rodada 20261021-133335) antes do deploy; repetir se o TESTE for tocado |
| XVI veracidade de dados | PASS | ids, paths e hosts só de fonte real (n8n2, VPS, TESTE validado); sem valor inventado |

Re-check pós-design: sem novo serviço nem camada; mudanças de código limitadas a 3 scripts e 3 JSON. Continua PASS.

## Project Structure

### Documentation
```
docs/specs/producao/  spec.md plan.md research.md data-model.md quickstart.md
```

### Source Code (caminhos existentes)
```
scripts/deploy-n8n.py            # liberar --criar e mensagens em PROD sob a trava (Decision 1, 2)
scripts/capturar-webhook.py      # trocar --destino recepcao-producao (Decision 7)
scripts/limpar-mensagens.py      # NOVO: expurgo de mensagens > 12 meses (Decision 5)
scripts/backup-bancos.py         # já pronto; só ganha cron (Decision 4)
scripts/verificar-repo.py        # regra "mensagens inativas em PROD" passa a checar só mensagens.ativo falso
config/ambientes/producao.json   # completar chaves (Decision 3)
config/vps/barbearia-limpar-midia.cron   # incluir id de PROD (Decision 6)
config/vps/barbearia-backup-limpeza.cron # NOVO: backup 03:30 + limpeza
workflows/bv-vigia.json, workflows/bv-verificacao.json   # nome com {{BV:rotulo}} (Decision 2)
tests/test_deploy_n8n.py, tests/test_limpar_mensagens.py (NOVO), tests/test_verificacoes_repo.py
docs/infra.md, docs/rito-dev.md  # registrar P3 e P7 resolvidos e rollbacks
```

## Convencoes de Borda

N/A — sem borda backend/frontend. Convenção de ambiente: TESTE e PROD diferem só por `config/ambientes/*.json`
(banco, prefixo Redis, path, ids, rótulo); os JSON de workflow são os mesmos, com `{{BV:...}}`.

## Decisões da implementação (FASE 2)

- **bv-vigia / bv-verificacao (CHK012):** nome com `[{{BV:rotulo}}]` e path/webhookId de `verificacao.*`; no TESTE `verificacao` mantém `bv-verificacao` e o webhookId de antes, e `tests/test_producao.py` confere que o render do TESTE é idêntico ao da develop `00a0688`.
- **mensagens.ativo (CHK007, tasks 2.7):** só `bv-recepcao` e `bv-graces` leem a flag. A reconciliação do `bv-mensagens` programa envios para todo contato com agenda na Graces sem olhar a flag. Por isso o `deploy-n8n` deixa o `bv-mensagens` fora de PROD enquanto `mensagens.ativo` não for `true` (ok do owner); `bv_confirmacao` vai desligado.
- **Backup e limpeza:** um job só, `config/vps/barbearia-backup-limpeza.sh` às 03:30, com `set -eu`: a limpeza de 12 meses só roda depois de um backup ok.

## Fases de execução (cada passo com rollback)

| # | Passo | Comando/fonte | Rollback |
|---|-------|---------------|----------|
| 1 | Banco e migrações | `preparar-bancos --alvo producao`; `migrar --alvo producao` (0001 a 0010), antes com `--dry-run` | `DROP DATABASE`/role só se o banco foi criado nesta execução e sem dado; migração parcial: parar e restaurar do backup |
| 2 | Credenciais | `criar-credenciais-n8n --alvo producao` | apagar as credenciais criadas (nome `[PROD]`) no n8n2 |
| 3 | Backup + limpeza + cron | `backup-bancos --alvo producao --retencao 14 --validar` manual; instalar cron 03:30 | remover o arquivo de `/etc/cron.d/` |
| 4 | Config PROD | completar `producao.json` com ids/paths reais | `git checkout` do arquivo |
| 5 | Código de deploy | ajustes de Decision 1 e 2 com testes | reverter commit |
| 6 | Deploy | sub-workflows → recepção (e vigia, verificação, mensagens, confirmação), `[PROD]` | despublicar o workflow criado; JSON anterior já é guardado por `implantar` |
| 7 | Webhook 145 | apontar para a recepção de PROD só depois do passo 6 | repor o webhook anterior (path de TESTE) |
| 8 | VPS | cron de mídia com id de PROD, container, hook de guarda | remover linha/arquivo |
| 9 | Quickstart | número do owner apenas; resultado ao WhatsApp dele | desligar o webhook para PROD |
| 10 | Bloqueio humano final | ok do owner para liberar a todos e `mensagens.ativo` | manter desligado |
