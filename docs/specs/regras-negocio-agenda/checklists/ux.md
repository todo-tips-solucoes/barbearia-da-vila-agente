# UX/Conversa Checklist: Regras de negócio sobre a agenda da Graces

**Purpose**: Qualidade dos requisitos de interação conversacional (botões de lista, confirmações)
**Created**: 2026-10-19
**Feature**: [spec.md](../spec.md)

## Escolhas e confirmações

- [x] CHK016 - Toda múltipla escolha exigida é por botão de lista (pacote/avulso, pessoa, barbeiros)? [Consistência, Spec §FR-003, US4-3, §FR-012] {auto}
- [x] CHK017 - Está definido que nada é criado antes do "sim" no encadeamento? [Spec §FR-008, Edge Cases] {auto}
- [x] CHK018 - A pergunta pacote/avulso tem condição de disparo e de não disparo? [Clareza, Spec §FR-003, SC-002] {auto}
- [x] CHK019 - O comportamento para pedido de serviço "2ª vez" (oferecer equivalente sem prometer desconto) é explícito? [Spec §FR-005] {auto}
- [x] CHK020 - Homônimo do remetente e várias pessoas na busca têm requisito de confirmação? [Edge case, Spec §Edge Cases, US4-3] {auto}
- [x] CHK021 - O comportamento ao cliente quando o terceiro tem outro celular (encaminhar à equipe, sem agendar) consta na spec (US4/FR-007/Edge Cases)? [Gap, Spec §US4; plan.md, research.md Decision 6] {auto} Resolvido: spec FR-006/007/009/011/016-018, SC-009-011.
- [x] CHK022 - O comportamento de primeiro contato cujo nome já existe com outro celular consta na spec? [Gap, Spec §FR-007; quickstart u23] {auto} Resolvido: spec FR-006/007/009/011/016-018, SC-009-011.
- [x] CHK023 - O critério de "mais cedo possível" com muitas opções é definido? [Spec §Edge Cases] {auto}
- [ ] CHK024 - O tom/redação das mensagens de encaminhamento à equipe é adequado à persona humanizada? [Assumption, contracts/config-regras.md] {humano}
- [ ] CHK025 - O que o cliente vê quando o handoff completo ainda não existe (crm-etiquetas-handoff pendente) está definido? [Gap, plan.md] {humano}

## Notes

- CHK021/CHK022: o plan/research/contracts incorporaram block-003, mas spec.md ainda não; vira [Conflict] de rastreabilidade para /clarify ou tarefa de atualização da spec.
