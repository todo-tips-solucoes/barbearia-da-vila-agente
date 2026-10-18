# Workflows n8n

Fonte versionada dos workflows. Os JSON usam placeholders `{{BV:...}}` (config do ambiente, `{{BV:INCLUDE:shared/rajada.js}}`, `{{BV:TOKEN_SHA256}}`); `scripts/deploy-n8n.sh <integracao|producao>` renderiza e publica. Ids em `config/ambientes/*.json` e `docs/infra.md`.

| Workflow | Arquivo | TESTE (id) | PROD |
|----------|---------|------------|------|
| bv-recepcao | `bv-recepcao.json` | `iaUbATlT7xkZArVd` | nao criado (config vazio) |
| entregar-rajada (stub) | `sub/entregar-rajada.json` | `ilzXqBWGtcczlGEu` | nao criado |
| bv-captura | `bv-captura.json` | `wXcRwAdqRnGgRzA9` | nunca (deploy recusa) |
| bv-verificacao | `bv-verificacao.json` | `uoDF0RFEgzAtKUay` | nao criado |
| bv-vigia | `bv-vigia.json` | `fzJA2yWESqiPXyib` | nao criado (config vazio) |

## bv-recepcao

Webhook `POST` com auth por SHA-256 de `body.token_origin` (401), normalizacao (400 malformado, 200 descartado/aceito), grava em `mensagens`, espera `buffer.janela_s`, entrega o turno (um por contato, posse no Redis) a `entregar-rajada` e marca `processada_em`. Contrato: `docs/specs/recepcao-buffer/contracts/entrega-turno.md`. O stub atrasa `teste.atraso_entrega_s`; a feature 3 o substitui.

Smoke no TESTE: `python3 -I scripts/smoke-recepcao.py` (contatos `+55000000xxxx`, limpa Postgres/Redis de TESTE no fim; `teto` (~80 s) e `ttl` (~5 min) rodam a parte; `falha` (SC-007) e `redis` (CA-4, senha invalida so na credencial do workflow de TESTE, restaurada no fim) rodam por padrao).

Falhas: `falhas_recepcao` (migracao 0003) guarda so tipo, motivo, `contato_id` e instante, para payload malformado, falha de entrega e erro de comando no Redis. Limite conhecido: o no Redis do n8n reconecta sem fim quando a conexao/autenticacao falha, entao nesse caso nada e registrado e a mensagem fica pendente (nao se perde; a proxima mensagem do contato a entrega). A posse so e liberada por quem ainda e dono (FR-012): o `DEL` depende de o turno ainda possuir as linhas (`count(*)`) ou, em turno vazio, de estar dentro de `lock.ttl_s`.

Robustez da recepcao (feature `recepcao-robustez`, so TESTE): o `200` de aceita sai so depois de `Inserir mensagem` devolver `id` (`Gravada?`); falha em `Upsert contato`/`Inserir mensagem` registra `gravacao|contato_falhou` ou `gravacao|mensagem_falhou` (sem PII) e responde `500` (mesmo se o registro falhar). Texto sem `idCanal` e deduplicado por conteudo na mesma query (`marcas_conteudo`: contato + sha256 do texto, janela `dedup.conteudo_janela_s`; `Limpar marcas` apaga as vencidas); midia e mensagem com id seguem a regra por id. Risco aceito: um "ok" repetido de proposito dentro da janela e descartado. A execucao tem `executionTimeout` = `execucao.timeout_s` (300 s `[PROPOSTA]`): medido que o n8n cancela a execucao com no Redis pendurado (status `canceled`), mas o error workflow NAO dispara no cancelamento, entao esse caso nao e registrado em `falhas_recepcao` (pendente de decisao do owner). `deploy-n8n.sh --criar NOME` grava o id em `workflows_sub` quando o nome esta la. Smoke novo: `gravacao` (S1/S2) e `dedupe` (S4).

## Notas

- PROD fica inativo: sem `BV_DEPLOY_PRODUCAO_AUTORIZADO=sim` + `--confirmar-id` o deploy recusa (exit 2); `webhook.path` de PROD esta vazio.
- Texto do canal nao traz id de mensagem: duplicata so e barrada para midia (id = fileUrl). Pendente com o owner.

## bv-vigia

Agendado a cada 5 min (TESTE). Apaga de `tentativas_recepcao` as linhas mais velhas que `execucao.timeout_s` + 30 s e registra cada uma em `falhas_recepcao` (`redis_indisponivel|tempo_esgotado`, so `contato_id`, sem PII). Cobre o no Redis pendurado, que o `executionTimeout` cancela sem disparar error workflow. A mensagem segue pendente (`processada_em` nulo) e e entregue no turno seguinte do contato. Criacao: `scripts/deploy-n8n.sh integracao --criar bv-vigia`.
