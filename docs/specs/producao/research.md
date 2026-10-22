# Research: producao

Fontes: `scripts/deploy-n8n.py`, `scripts/_vps.py`, `scripts/backup-bancos.py`, `config/ambientes/*.json`, `config/vps/`,
`docs/infra.md`, `docs/plano-proximas-features.md` seção E e as decisões do owner de 2026-10-21. Nenhum NEEDS CLARIFICATION restante.

## Decision 1: criar workflows de PROD pelo próprio `deploy-n8n.py`
**Decision**: permitir `--criar NOME` em `producao` sob a mesma trava (`BV_DEPLOY_PRODUCAO_AUTORIZADO=sim`), gravando o id em
`producao.json`. Hoje a linha `if a.criar: "--criar so em integracao"` recusa, e a trava exige `--confirmar-id` igual a um
id já presente em `workflows`, o que é impossível antes da primeira criação. Para a criação, a confirmação passa a ser o
próprio `--criar NOME` com a trava. `criar()` já recusa nome duplicado na instância.
**Rationale**: reaproveita o caminho validado no TESTE em vez de criar workflows à mão.
**Alternatives**: criar pelo MCP do n8n (perde a renderização `{{BV:...}}`); descartado.

## Decision 2: workflows que hoje são só do TESTE
**Decision**: (a) `bv-vigia` e `bv-verificacao` trocam `[TESTE]` por `[{{BV:rotulo}}]` no nome; (b) o path do webhook de
`bv-verificacao` (fixo `bv-verificacao`) vira parametrizado por `verificacao.path` para não colidir com o do TESTE; (c)
`bv-captura` continua só do TESTE (a recusa em `deploy-n8n.py` fica); (d) `INATIVOS_PROD` (`bv-mensagens`, `bv_confirmacao`)
deixa de bloquear, porque o owner quer as features 1 a 6 em PROD; a segurança passa a ser `mensagens.ativo=false` até o ok
(regra de `verificar-repo.py` muda de "sem ids" para "`mensagens.ativo` falso").
**Rationale**: FR-004 exige ids de vigia e verificação em PROD; FR-015 mantém `mensagens.ativo` desligado.
**Verificar na implementação**: se `bv-mensagens` publicado em PROD com `mensagens.ativo=false` não envia nada (o `mensagens.ativo`
aparece só em `bv-recepcao.json`, 1 ocorrência). Se a varredura do `bv-mensagens` não respeitar a flag, o workflow é publicado
e deixado **inativo** (despublicado) até o ok, e isso vira task própria.

## Decision 3: chaves faltantes em `producao.json`
**Decision**: preencher `postgres.credencial_id`, `credenciais.{redis,openai,graces,chatmaster,verificacao}`, `webhook.path`
e `webhook.webhook_id` (gerados na criação do workflow, UUID novo), `chatmaster.whatsapp_id` = `145` (decisão do owner: mesma
conexão), `workflows.{bv-recepcao,bv-vigia,bv-verificacao,bv-mensagens}`, `workflows_sub.*` e `midia.hosts_imagem`.
`midia.hosts_imagem`: `object.ce1.eveo.com.br`, o mesmo host validado no TESTE (rodada 17/17); fonte: `integracao.json`.
Cada id vem do retorno do n8n2 ou de `criar-credenciais-n8n`; nenhum é digitado de memória.

## Decision 4: backup diário às 03:30, 14 dias
**Decision**: cron em `/etc/cron.d/` chamando `backup-bancos.py` com retenção 14 (o script já faz a rotação por
`ls -1t | tail -n +N`). Como o script roda do lado do agente via SSH e a VPS não tem o repositório, o cron na VPS usa o
mesmo comando `pg_dump` do `_vps.cmd_pg_dump` em shell; ver Decision 5 para o desenho único. **Restore verificável**:
`--validar` (`pg_restore --list`) mais um restore de teste em banco descartável `barbearia_vila_restore` criado e apagado
no mesmo passo.
**Rationale**: o owner delegou a recomendação (diário, 14 dias).

## Decision 5: limpeza de mensagens com mais de 12 meses
**Decision**: script novo `scripts/limpar-mensagens.py --alvo producao` que roda um único
`DELETE FROM mensagens WHERE criado_em < now() - interval '12 months'` (coluna `criado_em`, tabela `mensagens`; fonte:
`db/migrations/0001_esquema_inicial.sql` linhas 11 e 20), sem tocar `contatos` nem agendamentos; imprime a contagem apagada.
Idempotente (VII). Agendado diariamente junto do backup, **depois** dele (03:30 backup, 03:45 limpeza). A VPS não tem o
repositório: o cron chama `docker exec ... psql` com o mesmo SQL (texto fixo, sem entrada externa).
**Verificar**: que nenhuma tabela depende de `mensagens` por chave estrangeira com `ON DELETE` que apague contato.
**Base legal**: art. 7º, V, escolha do owner, sem parecer jurídico (registrar em `docs/infra.md` P7).

## Decision 6: VPS
**Decision**: `config/vps/barbearia-limpar-midia.cron` ganha uma segunda linha com o id do `interpretar-midia` de PROD
(vem de `producao.json` depois da criação). Container: `n8n-n8n-1` (já no cron do TESTE e confirmado em `_vps.py` para o
postgres `n8n-postgres-1`). Hook de guarda: o de `docs/infra.md` (8.1.3), que recusa comandos do agente com
`BV_DEPLOY_PRODUCAO_AUTORIZADO`; a aplicação em `.claude/settings.json` do projeto-alvo é do owner. Como o deploy de PROD exige
essa variável, a execução do deploy precisa dela no ambiente do operador autorizado: ver o risco R1.

## Decision 7: webhook único da 145
**Decision**: depois do deploy, alterar o webhook da conexão 145 no ChatMaster para a URL da recepção de PROD (`webhook.path`
de PROD). O TESTE segue por disparos diretos ao seu path, com contatos simulados. `scripts/capturar-webhook.py` já faz
`anotar` (URL vigente, modo 600, idempotente) e `restaurar`, mas `trocar` aponta só para o `bv-captura` e o script recusa
`producao`. Por isso entra uma ação nova mínima (`trocar --destino recepcao-producao`, sob a trava de PROD) que reaproveita
`anotar`/`restaurar` como rollback. A URL antiga é anotada antes da troca.
**Alternativa descartada**: segunda conexão (o owner decidiu reaproveitar a 145).

## Riscos
- **R1**: a variável `BV_DEPLOY_PRODUCAO_AUTORIZADO` é recusada pelo hook de guarda proposto. O owner já autorizou o deploy;
  se o hook estiver ativo no ambiente, o passo 6 usa o terminal do owner ou pede a ele para exportar a variável (bloqueio humano).
- **R2**: o Graces em PROD é real; qualquer fluxo de escrita no quickstart abre bloqueio humano (FR-014).
- **R3**: webhook compartilhado: entre o passo 7 e o fim, mensagens da 145 caem em PROD. Como ninguém atende nela hoje e só o
  número do owner é autorizado (`mensagens.ativo=false`, sem liberação), o impacto é nulo.
