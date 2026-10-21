# Quickstart: suite-validacao

## Cenário 1: testes locais (sem rede)

1. `node --test tests/*.test.js` → 2. `python3 -m pytest tests/`
→ **Expected**: tudo verde, incluindo `tests/test_smoke_comum.py` (fallback de ambiente, nada impresso) e
`tests/test_suite_validacao.py` (veredito com K4 eliminatório, p50/p95, teto, alocação de contatos, roteiros sem dado real).

## Cenário 2: smokes sem regressão após o `_smoke.py`

1. `python3 -I scripts/smoke-recepcao.py recepcao` → 2. `python3 -I scripts/smoke-agente.py --so c2` →
3. `python3 -I scripts/smoke-mensagens.py m1`
→ **Expected**: mesmas linhas `[ok]` e mesmo código de saída de antes da extração.

## Cenário 3: rodada completa no TESTE (roundtrip real)

1. `python3 -I scripts/suite-validacao.py` numa worktree sem `.env.smoke` → 2. aguardar o relatório
→ **Expected**: segredos lidos do checkout principal sem impressão; um veredito por roteiro; p50/p95 e tokens no
relatório; `teste.contatos_escrita` continua `[]`; 0 agendamentos futuros do cliente de teste no barbeiro de teste
(checagem SC-008 do `encerrar()`).

## Cenário 4: interrupção

1. Rodar a suíte → 2. `Ctrl+C` no meio de um roteiro que agenda
→ **Expected**: o `finally` cancela o que foi criado na Graces e apaga os contatos simulados; código de saída ≠ 0.

## Cenário 5: teto de tokens e retomada

1. `python3 -I scripts/suite-validacao.py --teto-tokens 50000` → 2. `--pendentes <relatório>`
→ **Expected**: a 1ª rodada termina o roteiro em curso, marca o resto `pendente` e o relatório diz "parcial"; a 2ª
roda só os pendentes.

## Cenário 6 (erro): pré-condição insegura

1. Com `teste.contatos_escrita` não vazio na config → rodar a suíte
→ **Expected**: sai com código 2 antes de qualquer POST, sem tocar no banco.
