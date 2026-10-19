# API Checklist: Entrada de áudio e imagem

**Purpose**: qualidade dos requisitos de integração (evento Chat Master, contrato `interpretar-midia`, OpenAI, deploy)
**Created**: 2026-10-19
**Feature**: [spec.md](../spec.md)

Suposições: profundidade Standard, público revisor de PR. Graces fica fora (a feature não muda
chamadas à Graces, Constitution Check IX).

## Evento de entrada (Chat Master)

- [x] CHK001 - O reconhecimento de áudio e imagem está definido pelos campos das fixtures reais, sem campo suposto? [Completude, Spec §FR-001/FR-002, Edge Cases] {auto}
- [x] CHK002 - A divergência extensão `.mp3` x MIME ogg/opus está resolvida por regra explícita (decide `fileMimeType`)? [Clareza, Spec §FR-003] {auto}
- [x] CHK003 - O tratamento de tipo de mídia sem suporte está definido (gravado como `outro`, nunca descartado)? [Cobertura, Spec US3-4; plan.md §Summary] {auto}
- [x] CHK004 - A deduplicação de mídia está definida e a dedupe por conteúdo excluída? [Consistência, Spec §FR-011; data-model.md `mensagem_id_canal`] {auto}
- [ ] CHK005 - A deduplicação após a limpeza de 24 h (URL vira hash, reenvio não deduplicado) é comportamento aceito? [Risco, plan.md §Riscos "Reenvio do canal após a limpeza"] {humano}

## Contrato `interpretar-midia`

- [x] CHK006 - Entrada e saída estão especificadas com cardinalidade e ordem (um resultado por item, mesma ordem, `texto` ⇔ `motivo` nulo)? [Clareza, contracts/interpretar-midia.md §Saída] {auto}
- [x] CHK007 - Os códigos de falha estão enumerados com condição de disparo? [Completude, data-model.md Falha de mídia; contracts/interpretar-midia.md `excedente`] {auto}
- [x] CHK008 - O comportamento quando o sub falha ou não devolve saída está definido? [Cobertura, contracts/interpretar-midia.md §Saída: todos `interpretacao`] {auto}
- [x] CHK009 - Os timeouts estão quantificados e cabem no `lock.ttl_s`? [Mensurabilidade, contracts/config-midia.md `download/openai/execucao_timeout_s`; plan.md §Technical Context] {auto}
- [ ] CHK010 - O tempo do agente depois da mídia (que pode estourar `lock.ttl_s`) tem requisito ou critério de medida, além de "a medir no TESTE"? [Gap, plan.md §Riscos "Orçamento de tempo", §Segurança M5] {auto}

## OpenAI

- [x] CHK011 - Os modelos de transcrição e de imagem estão definidos com fonte? [Completude, Spec §FR-005; contracts/config-midia.md `transcricao_modelo`, `agente.modelo`] {auto}
- [x] CHK012 - As premissas não medidas (Ogg aceito D3, forma da chamada de imagem D4) estão marcadas como sondas bloqueantes? [Dependência, plan.md §Technical Context; §Riscos] {auto}
- [ ] CHK013 - O formato da chamada de imagem (nó nativo ou HTTP) está fixado no contrato, ou só depois da sonda D4? [Ambiguity, contracts/interpretar-midia.md §Cadeia "ver research D4"] {auto}

## Deploy e ambiente

- [x] CHK014 - A ordem de deploy e a criação do id do sub estão definidas? [Completude, plan.md §Fluxo "Deploy"; Spec §FR-015] {auto}
- [x] CHK015 - O isolamento TESTE/PROD está especificado (PROD com chaves e ids vazios, inativo)? [Consistência, Spec §FR-016; contracts/config-midia.md] {auto}

## Notes

- Items `{auto}` já vêm resolvidos (`[x]` com citação) ou marcados `[Gap]`/`[Ambiguity]`.
- Items `{humano}` ficam `[ ]` aguardando o owner.
