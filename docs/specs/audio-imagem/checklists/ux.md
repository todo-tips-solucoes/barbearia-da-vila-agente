# UX (conversa WhatsApp) Checklist: Entrada de áudio e imagem

**Purpose**: qualidade dos requisitos de conversa quando o cliente manda áudio ou imagem
**Created**: 2026-10-19
**Feature**: [spec.md](../spec.md)

Suposições: o "UX" aqui é a conversa (sem tela). Profundidade Standard, público revisor de PR.

## Respostas naturais

- [x] CHK001 - A resposta para mídia não compreendida é única por turno e sem jargão técnico? [Completude, Spec §FR-007, US3-2, SC-003] {auto}
- [x] CHK002 - O caso de mídia ilegível junto de texto compreensível está definido (atende o texto, cita só a parte não compreendida)? [Cobertura, Spec US3-3] {auto}
- [x] CHK003 - Há texto distinto para áudio longo ou arquivo grande (pedir mais curto ou por escrito)? [Clareza, Spec Edge Cases; contracts/config-midia.md `textos.midia_grande`] {auto}
- [x] CHK004 - Está definido qual texto vence quando a mesma rajada tem uma mídia `grande` e outra `host_recusado` (só uma resposta por turno)? [Ambiguity, Spec §FR-007; plan.md §Fluxo "Compor midia (nao_entendida | grande)"] {auto} Resolvido: `contracts/interpretar-midia.md` §Precedência: vence `textos.midia_grande`.
- [ ] CHK005 - O texto final de `textos.midia_nao_entendida` e `textos.midia_grande` (tom, persona IA) está aprovado pelo owner? [Tom, contracts/config-midia.md exemplo] {humano}

## Áudio e imagem

- [x] CHK006 - Está definido que o áudio é tratado como texto digitado, sem mencionar a transcrição salvo quando útil? [Clareza, Spec US1] {auto}
- [x] CHK007 - A imagem fora de contexto tem resposta definida (breve, reconduz a agendar/reagendar/cancelar)? [Cobertura, Spec US2-3] {auto}
- [x] CHK008 - O idioma da resposta está definido para áudio em outra língua? [Edge Case, Spec Edge Cases] {auto}
- [ ] CHK009 - A 3ª mídia de uma rajada (`excedente` de `max_por_turno` = 2) virar "não entendi" é aceitável para o cliente? [Risco, contracts/interpretar-midia.md §Chamada; contracts/config-midia.md `max_por_turno`] {humano}
- [ ] CHK010 - É aceitável que toda imagem receba "não entendi" até o owner confirmar o host real (US2 indisponível até lá)? [Risco, Spec §FR-006; plan.md §Riscos] {humano}

## Critérios de aceite

- [x] CHK011 - SC-001 e SC-003 são mensuráveis com o roteiro de teste no TESTE? [Mensurabilidade, Spec §SC-001/SC-003; plan.md §Technical Context quickstart] {auto}
- [x] CHK012 - O alvo de SC-005 (30 s, 95%) tem quantidade mínima de testes para medir o percentil? [Gap, Spec §SC-005 `[PROPOSTA]`] {auto} Resolvido: spec.md SC-005 (n ≥ 20) e quickstart 11.

## Notes

- Items `{auto}` já vêm resolvidos (`[x]` com citação) ou marcados `[Gap]`/`[Ambiguity]`.
- Items `{humano}` ficam `[ ]` aguardando o owner antes do `execute-task`.
