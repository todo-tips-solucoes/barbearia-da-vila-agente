# API/Integração Checklist: agente-conversacional-graces

**Purpose**: requisitos de integração com Graces, Chat Master e n8n.
**Created**: 2026-10-18
**Feature**: [spec.md](../spec.md)

## Graces e canal

- [x] CHK001 - Operações da Graces cobertas por ferramenta (10) com contrato de entrada/saída? [Completude, Spec §FR-003; contracts/ferramentas-graces.md] {auto}
- [x] CHK002 - Tratamento de erro por `code` e política de retry de escrita definidos? [Completude, Spec §FR-017, US7] {auto}
- [x] CHK003 - Idempotência por `turno_id` especificada? [Spec §FR-018, SC-006] {auto}
- [x] CHK004 - Revalidação antes de escrever e confirmação em duas fases estão especificadas? [Spec §FR-006, FR-007] {auto}
- [x] CHK005 - Formato de datas e fuso definido? [Clareza, plan.md "Convenções de Borda"] {auto}
- [x] CHK006 - Timeouts e latência alvo quantificados? [Mensurabilidade, Spec §SC-009; plan.md `graces.timeout_ms`] {auto}
- [x] CHK007 - Requisitos de envio (texto, lista, digitando) têm contrato? [Spec §FR-008, FR-016; contracts/saida-chatmaster.md] {auto}
- [x] CHK008 - Fronteira com features vizinhas (pacote, terceiros, áudio, CRM) explícita? [Spec §FR-023] {auto}
- [ ] CHK009 (parte S1 medida: envio 200 com `whatsappId` 145; parte S2, limites de exibicao e formato do toque, depende do aparelho do owner) - Como informar a conexão 145 (token da empresa) nos envios e o formato/limite da lista Pro estão confirmados pela doc? [Gap, plan.md Riscos: sondas S1/S2; depende do canal] {humano}
- [ ] CHK010 - Existe cliente de teste na Graces prod (P1) para os roteiros que escrevem? [Dependência, pendência do owner P1] {humano}
- [ ] CHK011 - Existe contato de teste real no WhatsApp (P2) para envio não simulado? [Dependência, pendência do owner P2] {humano}

## Notes
- P1/P2 e S1/S2 não bloqueiam create-tasks; bloqueiam só tarefas que escrevem/enviam de verdade (plan.md "Technical Context").
