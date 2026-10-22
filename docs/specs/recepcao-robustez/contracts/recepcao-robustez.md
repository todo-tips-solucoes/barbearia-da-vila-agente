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
| falha do Redis | — | não altera a resposta, que já saiu (FR-009); nó pendurado: execução cancelada em `execucao.timeout_s` |

O reenvio do canal diante de 5xx não está documentado em `chatmasterveloz-api/`; não é premissa.

## Dedupe por conteúdo

Texto sem `idCanal`: mesmo `contato_id` e mesmo `sha256(texto)` em menos de
`dedup.conteudo_janela_s` desde a última aceitação → descartado. Mídia e mensagem com `idCanal`
ficam fora (FR-011). **Risco aceito pelo owner**: um "ok" repetido de propósito dentro da janela é
descartado (FR-012). Nenhum texto ou telefone é guardado na marca.

## Tempo máximo da execução (substitui o sub-workflow `redis-op`, dec-020)

`settings.executionTimeout = execucao.timeout_s` no `bv-recepcao`. Medido (sonda 2, TESTE): com
credencial Redis inválida a execução vira `canceled` no tempo configurado (5 s no teste) e o
`errorWorkflow` do n8n NÃO é disparado. Os nós Redis ficam no `bv-recepcao` com
`continueErrorOutput` (erro de comando → `Registrar falha Redis`). `Liberar posse` mantém
`continueRegularOutput`: erro não é registrado, a posse expira por `lock.ttl_s` (limite aceito).
Registro do caso "nó pendurado": ver FR-008 / block-003.

## `scripts/deploy-n8n.sh integracao --criar NOME`

| Caso | Resultado |
|------|-----------|
| `NOME` em `workflows_sub` com id vazio | cria, grava id em `workflows_sub.NOME` |
| `NOME` em `workflows` (ou ausente de `workflows_sub`) com id vazio | cria, grava id em `workflows.NOME` (inalterado) |
| id já preenchido na seção do nome | exit 1, recusa |
| nome do workflow já existe na instância | exit 1, recusa |
| `producao` | exit 2, recusa |
