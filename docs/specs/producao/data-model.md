# Data Model: producao

Nenhuma tabela nova. Entidades da spec e onde vivem.

## Entity: Ambiente PROD
| Campo | Fonte |
|-------|-------|
| banco `barbearia_vila` | `config/ambientes/producao.json` `postgres.database` |
| prefixo Redis `bv:prod:` (DB 2) | `redis.prefixo` |
| credenciais, ids de workflow, webhook | `producao.json`, preenchidos a partir do n8n2 |
Estado: `inexistente -> banco+migracoes -> credenciais -> workflows publicados -> webhook apontado -> liberado`.

## Entity: Backup
Arquivo `bv-barbearia_vila-<UTC>.dump` (modo 600) em `/root/barbearia_vila/backups/`. Regra: no máximo 14 por banco; rotação
em `backup-bancos.py`. Estado: `criado -> validado (pg_restore --list) -> removido ao passar de 14`.

## Entity: Mensagem
Tabela existente `mensagens` (`contato_id`, `criado_em`; índice `mensagens_contato_criado_idx`). Regra nova: linhas com
`criado_em` mais antigo que 12 meses são apagadas pela limpeza diária. `contatos` e agendamentos não são tocados.

## Entity: Liberação
Dois controles, ambos desligados até o ok do owner: a lista de contatos autorizados (somente 5511967296849 durante o
quickstart) e `mensagens.ativo` (`false` em PROD).
