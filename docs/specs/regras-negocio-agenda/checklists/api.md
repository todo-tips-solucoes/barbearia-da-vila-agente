# API Checklist: Regras de negócio sobre a agenda da Graces

**Purpose**: Qualidade dos requisitos de contrato com a Graces e ferramentas de escrita
**Created**: 2026-10-19
**Feature**: [spec.md](../spec.md)

## Contrato e erros

- [x] CHK001 - A reação a cada `code` de erro está enumerada e há fallback para `code` desconhecido? [Completude, Spec §FR-009] {auto}
- [x] CHK002 - Está explícito que a decisão usa `code` e nunca `detail`? [Clareza, Spec §FR-009, SC-007] {auto}
- [x] CHK003 - O comportamento após timeout/5xx em escrita é definido (verificar, depois no máximo 1 repetição)? [Completude, Spec §FR-010, SC-006] {auto}
- [x] CHK004 - A falha parcial do encadeamento define o que informar, o que não recriar e o que repetir? [Cobertura, Spec §FR-011] {auto}
- [x] CHK005 - A origem dos inícios ofertados (consulta de horários livres da mesma conversa) é exigida? [Rastreabilidade, Spec §FR-001, SC-001] {auto}
- [x] CHK006 - O tamanho máximo de lista do canal e o envio em múltiplas listas estão tratados? [Edge case, Spec §FR-001] {auto}
- [x] CHK007 - A spec define o desfecho da escrita quando o `code` indica `CONFLITO` no meio de um encadeamento já parcialmente criado? [Gap, Spec §FR-009/§FR-011] {auto} Resolvido: spec FR-006/007/009/011/016-018, SC-009-011.
- [x] CHK008 - O contrato de saída `encaminhar_equipe` (`motivo`) é requisito da spec, e não só do plan/contracts? [Gap, Spec §FR-006/§FR-007 vs contracts/ferramentas-graces-regras.md 11c] {auto} Resolvido: spec FR-006/007/009/011/016-018, SC-009-011.
- [x] CHK009 - O ponto de integração com `crm-etiquetas-handoff` tem fronteira declarada (mínimo aqui: saída, texto, registro; handoff completo na outra feature)? [Dependência, plan.md/research.md Decision 6] {auto}
- [x] CHK010 - O registro de `falhas_agente` para `encaminhar_equipe` exclui nome e celular? [Consistência, research.md Decision 6, data-model.md] {auto}

## Dependências e premissas

- [x] CHK011 - As regras valem nas ferramentas de escrita, não só no prompt? [Completude, Spec §FR-013] {auto}
- [x] CHK012 - Implantação restrita ao TESTE e recusa de alteração em PROD estão especificadas? [Spec §FR-015] {auto}
- [x] CHK013 - A premissa "Graces só em produção" está tratada via barbeiro/cliente de teste e cancelamento garantido? [Assumption, Spec §FR-014, SC-008] {auto}
- [ ] CHK014 - A regra "primeira seção devolvida pela Graces" (FR-004) é aceita pela barbearia? [Assumption, Spec §FR-004] {humano}
- [ ] CHK015 - A redação `[PROPOSTA]` de `textos.encaminhar_equipe` foi aprovada pelo dono? [Assumption, contracts/config-regras.md] {humano}

## Notes

- Cobertura de cenários (requirement-coverage.sh): 15/15 FRs cobertos, 0 findings.
- Gaps: CHK007 e CHK008 viram tarefas de requisito (create-tasks).
