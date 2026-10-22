# Quickstart: mensagens-agendadas (só TESTE)

Pré-requisitos: migração 0010 aplicada no `barbearia_vila_teste` (`python3 -I scripts/migrar.py --alvo teste`);
`bv-mensagens` e `bv-confirmacao` criados (`scripts/deploy-n8n.sh integracao --criar bv-mensagens` e
`--criar bv_confirmacao`) e `bv-recepcao`, `bv-graces`, `entregar-rajada` republicados; número do owner
(5511967296849) em `teste.contatos_escrita` só durante o smoke. Sempre o barbeiro de teste
(`1cee0bb9-e58b-4428-9e9b-1db184db7943`); cancele tudo ao fim.

## Unitários (sem rede)

1. `node tests/mensagens.test.js` → **Expected**: horários véspera 18:00 / −2 h / +1 h em São Paulo, virada de
   mês, "já passou" sem linha, agendamento de amanhã antes das 18 h com confirmação hoje 18:00, decisão por HTTP
   (2xx/4xx/0), parser do título.
2. `python3 -I -m unittest discover -s tests` → **Expected**: estrutura dos workflows novos (Schedule 1 min,
   `sendListPRO` com `RowId` `bvc:`, `openTicket` "1"), migração idempotente, capturar-webhook sem sobrescrever.

## Smoke no TESTE (`python3 -I scripts/smoke-mensagens.py`)

3. Programar: agendar pelo agente (contato simulado `+55000000005xx`, n < 520 como no `smoke-agente.py`) para
   amanhã → **Expected**: 3 linhas `pendente` com os horários certos; reprocessar a proposta → continuam 3 (SC-001, SC-007).
4. Mesmo dia: agendar para daqui a 90 min → **Expected**: sem confirmação e sem lembrete (`ja_passou`), só pós.
5. Reagendar → **Expected**: as 3 antigas `cancelada`, 3 novas `pendente`. Cancelar → zero `pendente` (SC-002).
6. Fora da lista: contato simulado → **Expected**: nada enviado, motivo `fora_da_lista` (FR-018).
7. Envio real ao owner: agendamento do barbeiro de teste com `previsto_para` forçado para agora (só no smoke) →
   **Expected**: lista de 2 opções chega no aparelho (P4); status inicial lido na Graces (P1).
8. Seleção: o owner toca "Confirmar presença" → **Expected**: Graces status 3 em ≤ 30 s, texto
   `confirmacao_ok`, nenhum turno do agente (SC-003). Tocar de novo → `confirmacao_repetida`, Graces intacta.
9. "Não vou poder" em outro agendamento → **Expected**: status 10, horário não liberado, texto oferece remarcar
   ou cancelar; o turno seguinte do agente conduz.
10. Texto livre "vou sim" com uma confirmação aberta → **Expected**: agente usa `confirmar_presenca`.
11. Órfã: cancelar na Graces direto (barbeiro de teste) → **Expected**: na reconciliação seguinte, pendentes
    `cancelada/orfa`; criar direto na Graces → faltantes criadas (SC-006).
12. Falha do canal: credencial inválida só no workflow de TESTE → **Expected**: 3 tentativas e `falhou`;
    nenhuma mensagem de erro ao cliente; credencial restaurada (SC-005).
13. Handoff (P2): com handoff aberto, envio do lembrete → **Expected**: ticket continua aberto.
14. Limpeza → **Expected**: agendamentos do teste cancelados na Graces, linhas apagadas, número do owner fora
    de `teste.contatos_escrita`.

## Captura (P3, antes da tarefa do caminho id)

O pai aponta o webhook da 145 para o `bv-captura`, envia uma lista de confirmação ao owner, o owner seleciona
uma opção, e a captura vira `tests/fixtures/chatmaster/evento-26.json`+ pelo `capturar-webhook.py` corrigido;
depois o webhook volta para a recepção do TESTE e é conferido.
