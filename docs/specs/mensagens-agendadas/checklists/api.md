# API Checklist: Mensagens agendadas

**Purpose**: qualidade dos requisitos de integração (Graces, Chat Master, evento de seleção da lista) e de confiabilidade (idempotência, retentativa, reconciliação)
**Created**: 2026-10-20
**Feature**: [spec.md](../spec.md)

Suposições (execução autônoma do feature-00c): profundidade Standard, público revisor de PR. Gate de cobertura
`requirement-coverage.sh`: 21/21 FRs com cenário, 0 erros.

## Chat Master (envio)

- [x] CHK001 - O mecanismo de envio da confirmação está definido com endpoint e shape reais, sem campo suposto? [Completude, Spec §FR-005; contracts/envio-chatmaster.md; dec-007] {auto}
- [x] CHK002 - A escolha de não usar `/api/schedules` está justificada por evidência medida? [Dependências, research D1; sonda-botao.md (a)] {auto}
- [x] CHK003 - O efeito de `openTicket` está definido para lista e texto? [Clareza, contracts/envio-chatmaster.md; research D10] {auto}
- [ ] CHK004 - O efeito do envio em ticket de handoff aberto está especificado? [Gap, research P2 — a medir no smoke] {auto}
- [ ] CHK005 - A exibição de uma lista de 2 linhas na QR Pro está comprovada? [Assumption, research P4] {auto}
- [x] CHK006 - A decisão por resultado HTTP (2xx / 4xx-5xx / 0) está definida para cada caso? [Clareza, Spec §FR-015; contracts/envio-chatmaster.md "Decisão pelo resultado"] {auto}

## Resposta do cliente

- [x] CHK007 - O formato do evento de seleção de lista no webhook QR Pro está definido por fixture real? [Gap, research D6/P3; contracts/bv-confirmacao.md] {auto}
- [x] CHK008 - A vinculação da resposta ao agendamento com duas confirmações abertas está definida sem ambiguidade? [Cobertura, Spec §FR-007, Edge Cases; research D6 (cai no agente com 2+)] {auto}
- [x] CHK009 - A dedupe dos dois eventos de um mesmo toque está especificada? [Consistência, research D6; contracts/bv-confirmacao.md passo 4] {auto}
- [x] CHK010 - O texto livre equivalente tem janela e responsável definidos? [Clareza, Spec §FR-009, Clarify Q2; research D8] {auto}
- [x] CHK011 - A recepção mantém intacto o fluxo de mensagens normais (buffer, mídia, listas do agente)? [Cobertura, Spec §FR-019; contracts/bv-confirmacao.md "Reconhecimento"] {auto}

## Graces

- [x] CHK012 - O endpoint de confirmação, seu pré-requisito de status e o erro 409 estão citados da fonte? [Completude, Spec §FR-006; contracts/bv-confirmacao.md passo 6; graces-api/04-agendamentos.md:130-144] {auto}
- [ ] CHK013 - O status inicial de um agendamento criado pela API está documentado? [Gap, research D11/P1] {auto}
- [x] CHK014 - "Não vou poder" está definido como não liberar o horário? [Clareza, Spec §FR-006; research D7] {auto}
- [x] CHK015 - A reconciliação usa endpoint com janela compatível (±7 dias)? [Consistência, Spec Clarify Q5; research D9] {auto}

## Confiabilidade

- [x] CHK016 - A idempotência por agendamento e tipo está definida também para reagendamento com mensagem já enviada? [Consistência, Spec §FR-002/FR-012; data-model.md índice parcial] {auto}
- [x] CHK017 - A política de retentativa está quantificada e o caso incerto excluído de reenvio? [Clareza, Spec Clarify Q4, SC-007; research D5] {auto}
- [x] CHK018 - A revalidação antes do envio cobre cancelamento feito pela equipe entre reconciliações? [Cobertura, Spec US3-6; research D2] {auto}
- [x] CHK019 - O tratamento de atraso da varredura (n8n fora) está definido para não enviar em atraso? [Cobertura, Spec §FR-003; plan.md §Riscos `mensagens.atraso_max_min`] {auto}
- [ ] CHK020 - A tolerância de atraso aceitável (`mensagens.atraso_max_min`) reflete o que o owner considera "em atraso"? [Risco, plan.md §Riscos] {humano}

## Notes

- Gaps CHK004, CHK005, CHK007, CHK013 viram tarefas de sonda no backlog (create-tasks).
- CHK020 aguarda o owner; default `[PROPOSTA]` de 30 min.
