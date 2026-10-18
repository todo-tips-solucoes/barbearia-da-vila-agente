# Security Checklist: agente-conversacional-graces

**Purpose**: requisitos de segurança e privacidade do agente.
**Created**: 2026-10-18
**Feature**: [spec.md](../spec.md)

## Dados, segredos e IA

- [x] CHK001 - Segredos só em credenciais n8n/.env, nunca em prompt/log/repo? [Completude, Spec §FR-022] {auto}
- [x] CHK002 - Isolamento de dados entre clientes especificado? [Spec §FR-020] {auto}
- [x] CHK003 - Resistência a injeção de prompt tem requisito próprio? [Gap resolvido: adicionado Spec §FR-026; plan research.md Decision 11] {auto}
- [x] CHK004 - Regras duras (barbeiro de teste, 2ª vez, confirmação) impostas fora do prompt? [Spec §FR-007, FR-012, FR-013] {auto}
- [x] CHK005 - Logs de falha sem PII? [Spec §FR-017, FR-021; plan.md Constitution XIV] {auto}
- [x] CHK006 - Isolamento de ambiente (só TESTE, PROD recusa) especificado? [Spec §FR-025; plan Constitution XIII] {auto}
- [x] CHK007 - Escritas de teste restritas ao barbeiro de teste e com limpeza? [Spec §FR-024, SC-010] {auto}
- [ ] CHK008 - Prazo de retenção do histórico de conversa (LGPD) está definido? [Gap, data-model.md: hoje "apagado junto com o contato"; política de limpeza por idade fica em aberto] {humano}
- [ ] CHK009 - Aviso/base legal de tratamento dos dados do cliente (número, nome, mensagens) aprovado? [Assumption, Spec §FR-019] {humano}

## Notes
- CHK008/CHK009 são decisões do owner; registradas como pendências, sem bloqueio.
