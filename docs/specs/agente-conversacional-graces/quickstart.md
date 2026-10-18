# Quickstart: agente-conversacional-graces (só TESTE)

Pré-requisitos: `.env.n8n` e `.env.smoke` fora do repositório; migração 0006 aplicada
(`python3 -I scripts/migrar.py --alvo teste`); credenciais criadas
(`python3 -I scripts/criar-credenciais-n8n.py --alvo teste`); `scripts/deploy-n8n.sh integracao
--criar bv-graces` e depois `scripts/deploy-n8n.sh integracao`; workflows validados pelo MCP do n8n.
Pendências P1 (cliente de teste) e P2 (contato de teste real) resolvidas para os cenários que escrevem
na Graces ou enviam de verdade.

Roteiros: `python3 -I scripts/smoke-agente.py [--so NOME]`. Contatos simulados (`+5500000000xxx`) não
recebem WhatsApp; a saída é conferida em `mensagens`. No fim de cada roteiro, mesmo com falha: cancelar
toda proposta `executada` do roteiro, conferir 0 agendamentos ativos do barbeiro de teste criados pela
rodada (SC-010) e limpar Postgres/Redis de TESTE do contato.

## Sondas (antes dos roteiros)

- **S0**: MCP do n8n `get_node_types` dos tipos usados (agent 3, lmChatOpenAi 1.3, toolWorkflow 2.2) na
  instância → **Expected**: tipos e versões existem.
- **S1**: enviar texto, digitando e lista ao contato de teste real com `whatsappId` 145 → **Expected**:
  2xx e mensagem recebida; senão, bloqueio humano (research Decision 6).
- **S2**: tocar numa opção da lista; capturar com `bv-captura` → **Expected**: formato da resposta
  registrado; limites de itens/título medidos.

## Cenários

1. **Agendar, cliente conhecido** (US1): "oi, queria marcar um corte" → serviço por lista → barbeiro
   → "amanhã" → horários → escolher → resumo → "sim" → **Expected**: 1 `POST /agenda` no barbeiro de
   teste, proposta `executada`, ≤ 8 mensagens do cliente (SC-008), nenhuma lista com "TESTE" (SC-001).
2. **Agendar sem confirmar** (US1-5): parar no resumo → **Expected**: proposta `pendente`, 0 escritas.
3. **Confirmação no mesmo turno** (FR-007): forçar o modelo a chamar fase 2 no turno da proposta →
   **Expected**: ferramenta recusa, 0 escritas.
4. **Horário tomado** (US1-4): ocupar o horário no barbeiro de teste entre resumo e "sim" →
   **Expected**: aviso e novas opções; nenhum agendamento duplicado.
5. **Texto livre em vez de toque** (US2-2/3): responder "o das 15h" e depois "sei lá" → **Expected**:
   primeira reconhecida; segunda gera nova pergunta, sem escolha inventada.
6. **Cancelar sugerindo remarcar** (US3-1/2, SC-005): "quero cancelar" → **Expected**: sugestão de
   remarcar antes; após recusa e "sim", `DELETE` executado e oferta de marcar outro.
7. **Reagendar** (US3-4): aceitar remarcar → novo horário → "sim" → **Expected**: `PUT` com serviço
   preservado; resumo "de X para Y".
8. **"Vamos marcar outro"** (US3-3): logo após cancelar → **Expected**: novo agendamento sem pedir o
   serviço de novo e sem "não encontrei agendamento".
9. **"Oi" após 2 h** (US5, SC-007): coleta pela metade, `ultima_entrada_em` recuado 3 h no banco de
   TESTE, "Oi" → **Expected**: saudação e pergunta aberta, sem citar a coleta.
10. **Barbeiro de teste pedido pelo nome** (US6-2) → **Expected**: tratado como inexistente; 0 listas
    com "TESTE".
11. **Turno repetido** (FR-018, SC-006): reenviar o mesmo `turno_id` ao `entregar-rajada` →
    **Expected**: `{ok:true}`, 0 mensagens novas, 0 escritas.
12. **Erro da Graces** (US7): credencial da Graces inválida só no workflow de TESTE (restaurada no
    `finally`, como o roteiro `redis` do `smoke-recepcao.py`) → **Expected**: texto "uma pessoa vai
    ajudar", `falhas_agente` com `code` `NAO_AUTENTICADO`, sem detalhe técnico ao cliente.
13. **Falha do modelo** (US7-4): credencial OpenAI inválida no TESTE → **Expected**: contingência
    enviada, `falhas_agente` `agente|erro_modelo`, turno `concluido`.
14. **Limites de saída** (US4, SC-003): pergunta aberta longa → **Expected**: ≤ 4 mensagens, ≤ 1 "?"
    por mensagem; digitando antes de cada uma (ver log de execução no TESTE).
15. **Áudio** (Edge Case) → **Expected**: pedido para escrever.
16. **Latência** (SC-009): medir do fim do turno à primeira mensagem nos roteiros 1–14 →
    **Expected**: p90 ≤ 20 s.

## Roundtrip end-to-end

O cenário 1 com o contato de teste real (P2) exercita o caminho real Chat Master → `bv-recepcao` →
`entregar-rajada` → Graces → Chat Master, e compara o shape das respostas da Graces com
`contracts/ferramentas-graces.md` (falha a rodada se um campo citado não vier).
