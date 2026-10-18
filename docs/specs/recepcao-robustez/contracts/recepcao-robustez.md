# Contrato: resposta ao Chat Master, `redis-op` e `--criar`

`[PROPOSTA — a validar na implementacao]` Contratos internos novos; o payload de entrada do
Chat Master segue `docs/specs/recepcao-buffer/contracts/webhook-chatmaster.md`, inalterado.

## Resposta do webhook `bv-recepcao`

| Situação | Status | Quando sai |
|----------|--------|------------|
| token inválido | 401 | inalterado |
| payload inválido | 400 | inalterado |
| evento ignorado (não é mensagem suportada) | 200 | inalterado |
| mensagem gravada | 200 | só depois de `Inserir mensagem` devolver `id` (FR-001) |
| duplicada por id ou por conteúdo | 200 | depois da query, sem gravação |
| falha de contato ou de mensagem no Postgres | 500 `[PROPOSTA]` | depois de tentar registrar a falha, mesmo se o registro falhar (FR-002, FR-004) |
| falha do Redis | — | não altera a resposta, que já saiu (FR-009) |

O reenvio do canal diante de 5xx não está documentado em `chatmasterveloz-api/`; não é premissa.

## Dedupe por conteúdo

Texto sem `idCanal`: mesmo `contato_id` e mesmo `sha256(texto)` em menos de
`dedup.conteudo_janela_s` desde a última aceitação → descartado. Mídia e mensagem com `idCanal`
ficam fora (FR-011). **Risco aceito pelo owner**: um "ok" repetido de propósito dentro da janela é
descartado (FR-012). Nenhum texto ou telefone é guardado na marca.

## Sub-workflow `redis-op`

Entrada (Execute Workflow, passthrough): `{ "op": "get|set|incr|delete", "chave": "<prefixo>…",
"valor": "<string, só set>", "ttl_s": <inteiro, só set> }`. Saída: `{ "valor": <string|null> }`
para `get`, `{ "valor": <inteiro> }` para `incr`, `{ "ok": true }` para `set`/`delete`. Chave fora
de `redis.prefixo` → erro (o chamador registra como `indisponivel`, sem expor a chave).
`settings.executionTimeout = redis.timeout_s`; política de chamador restrita ao `bv-recepcao` do
mesmo ambiente. Comportamento do timeout em sub-workflow: não
medido (research D3); a sonda decide.

## `scripts/deploy-n8n.sh integracao --criar NOME`

| Caso | Resultado |
|------|-----------|
| `NOME` em `workflows_sub` com id vazio | cria, grava id em `workflows_sub.NOME` |
| `NOME` em `workflows` (ou ausente de `workflows_sub`) com id vazio | cria, grava id em `workflows.NOME` (inalterado) |
| id já preenchido na seção do nome | exit 1, recusa |
| nome do workflow já existe na instância | exit 1, recusa |
| `producao` | exit 2, recusa |
