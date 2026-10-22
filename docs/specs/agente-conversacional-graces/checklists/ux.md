# UX conversacional Checklist: agente-conversacional-graces

**Purpose**: qualidade dos requisitos de conversa, listas, tom e cadência.
**Created**: 2026-10-18
**Feature**: [spec.md](../spec.md)

## Conversa e escolhas

- [x] CHK001 - "Mensagem curta" é quantificada? [Clareza, Spec §FR-015; corrigido: agora aponta `saida.max_chars_mensagem`=700 em config-agente.md] {auto}
- [x] CHK002 - Limites de 4 mensagens e 1 pergunta são mensuráveis e impostos em código? [Mensurabilidade, Spec §FR-015, SC-003] {auto}
- [x] CHK003 - "Digitando…" proporcional tem parâmetros definidos? [Clareza, Spec §FR-016; config-agente.md `digitando.ms_por_char/min_ms/max_ms`] {auto}
- [x] CHK004 - Comportamento com mais opções que o limite da lista está definido? [Cobertura, Spec §US2 cen.5; `lista.max_itens`] {auto}
- [x] CHK005 - Resposta escrita ambígua tem tratamento definido? [Cenário, Spec §US2 cen.3] {auto}
- [x] CHK006 - Cancelar→remarcar e "vamos marcar outro" pós-cancelamento estão especificados? [Cobertura, Spec §FR-009, FR-010, US3] {auto}
- [x] CHK007 - Janela de recência para "Oi" é valor definido e parametrizado? [Clareza, Spec §Clarifications, FR-011] {auto}
- [x] CHK008 - Áudio/imagem e pedido de humano têm resposta provisória definida? [Edge case, Spec §Edge Cases] {auto}
- [x] CHK009 - Falha parcial na sequência de envio está especificada? [Edge case, Spec §Edge Cases, FR-021] {auto}
- [ ] CHK010 - O texto exato da saudação/contingência/mídia e o grau de informalidade (gírias, emojis) refletem o tom desejado pelo dono? [Assumption, Spec §FR-014] {humano}

## Notes
- Mensagens fixas ficam em `textos.*` (config); revisão de tom é do owner.
