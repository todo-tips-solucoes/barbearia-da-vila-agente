# Workflows n8n

Fonte versionada dos workflows. Os JSON usam placeholders `{{BV:...}}` (config do ambiente, `{{BV:INCLUDE:shared/rajada.js}}`, `{{BV:TOKEN_SHA256}}`); `scripts/deploy-n8n.sh <integracao|producao>` renderiza e publica. Ids em `config/ambientes/*.json` e `docs/infra.md`.

| Workflow | Arquivo | TESTE (id) | PROD |
|----------|---------|------------|------|
| bv-recepcao | `bv-recepcao.json` | `iaUbATlT7xkZArVd` | nao criado (config vazio) |
| entregar-rajada (stub) | `sub/entregar-rajada.json` | `ilzXqBWGtcczlGEu` | nao criado |
| bv-captura | `bv-captura.json` | `wXcRwAdqRnGgRzA9` | nunca (deploy recusa) |
| bv-verificacao | `bv-verificacao.json` | `uoDF0RFEgzAtKUay` | nao criado |

## bv-recepcao

Webhook `POST` com auth por SHA-256 de `body.token_origin` (401), normalizacao (400 malformado, 200 descartado/aceito), grava em `mensagens`, espera `buffer.janela_s`, entrega o turno (um por contato, posse no Redis) a `entregar-rajada` e marca `processada_em`. Contrato: `docs/specs/recepcao-buffer/contracts/entrega-turno.md`. O stub atrasa `teste.atraso_entrega_s`; a feature 3 o substitui.

Smoke no TESTE: `python3 -I scripts/smoke-recepcao.py` (contatos `+55000000xxxx`, limpa Postgres/Redis de TESTE no fim; `teto` roda a parte, ~80 s).

## Notas

- PROD fica inativo: sem `BV_DEPLOY_PRODUCAO_AUTORIZADO=sim` + `--confirmar-id` o deploy recusa (exit 2); `webhook.path` de PROD esta vazio.
- Texto do canal nao traz id de mensagem: duplicata so e barrada para midia (id = fileUrl). Pendente com o owner.
