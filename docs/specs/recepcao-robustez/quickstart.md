# Quickstart: cenários de teste da recepcao-robustez

Só TESTE (`barbearia_vila_teste`, prefixo `bv:teste:`, contatos sintéticos `+55000000xxxx`).
Cenários novos em `scripts/smoke-recepcao.py`; cada um limpa o que criou e restaura o workflow
versionado no `finally`, no padrão do cenário `redis()` existente.

## S0 - Sonda do timeout do sub-workflow (pré-requisito de US2)

1. Publicar `redis-op` com `executionTimeout = redis.timeout_s` → 2. trocar só a credencial Redis
do `redis-op` por uma credencial temporária com senha inválida → 3. postar texto sintético →
**Expected**: execução do `bv-recepcao` termina em ≤ `redis.timeout_s + 2` s, linha em
`falhas_recepcao` (`redis_indisponivel`, motivo em código), mensagem pendente. Diferente disso →
bloqueio humano (research D3).

## S1 - Confirmação só após gravar (US1, happy path)

1. Postar texto válido → **Expected**: 200; ao receber o 200 a linha já existe em `mensagens`.

## S2 - Falha de gravação (US1, erro)

1. Trocar só a credencial do nó `Inserir mensagem` por uma inválida temporária → 2. postar texto
→ **Expected**: 500; `falhas_recepcao` com `gravacao|mensagem_falhou`; 0 linhas em `mensagens`.
3. Trocar também a credencial de `Registrar falha gravacao` → **Expected**: 500 mesmo assim (FR-004).
4. Restaurar e reenviar o mesmo texto → **Expected**: 200 e exatamente 1 linha (FR-005).

## S3 - Redis fora (US2)

1. Credencial Redis inválida no `redis-op` → 2. postar texto → **Expected**: 200 (gravou antes);
execução termina em ≤ `timeout + 2` s; falha registrada sem PII. 3. Restaurar e postar novo texto
do mesmo contato → **Expected**: as duas mensagens no mesmo turno, entregues uma vez (SC-003).

## S4 - Dedupe por conteúdo (US3)

1. 20 pares do mesmo texto/contato com < 10 s → **Expected**: 20 descartadas (200, sem linha).
2. 20 pares fora da janela, com texto diferente ou contato diferente → **Expected**: 0 descartadas.
3. Mídia repetida → **Expected**: regra por id inalterada. 4. `marcas_conteudo` sem texto/telefone;
marcas vencidas somem após a próxima mensagem.

## S5 - `--criar` de sub-workflow (US4)

Unitário em `tests/test_deploy_n8n.py` (API fake): sub com id vazio → id em `workflows_sub`;
deploy normal seguinte faz GET/PUT no mesmo id; principal inalterado; id já preenchido, nome
existente e PROD recusados. Real: `deploy-n8n.sh integracao --criar redis_op` uma vez, depois
`deploy-n8n.sh integracao` sem edição manual.

## S6 - Regressão

Suíte inteira do smoke (`recepcao`, `duplicidade`, `rajada`, `posse`, `concorrencia`, `falha`),
`python3 -I -m unittest discover -s tests`, `node tests/rajada.test.js` e `validate_workflow` do
MCP do n8n nos workflows alterados.
