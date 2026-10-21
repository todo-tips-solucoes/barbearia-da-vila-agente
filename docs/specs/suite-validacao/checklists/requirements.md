# Requirements Checklist: Suite de validacao por conversas roteirizadas

**Purpose**: Qualidade dos requisitos da spec (completude, clareza, consistencia, mensurabilidade)
**Created**: 2026-10-21
**Feature**: [spec.md](../spec.md)

## Completude

- [x] CHK001 - Os roteiros R1-R17 e os criterios K1-K7 tem fonte versionada definida? [Completude, Spec §FR-001, Origem] {auto}
- [x] CHK002 - Ha requisito de limpeza da Graces tambem em falha/interrupcao? [Completude, Spec §FR-010, US2.1] {auto}
- [x] CHK003 - Ha requisito de relatorio parcial e de retomada so dos pendentes? [Completude, Spec §FR-008, FR-009, US3.4-3.5] {auto}
- [x] CHK004 - As 5 pendencias do relatorio estao enumeradas? [Completude, Spec §FR-018, SC-007] {auto}
- [x] CHK005 - Esta definido que a saida do agente e lida em `mensagens` e que `contatos_escrita` nao e tocada? [Completude, Spec §FR-012] {auto}
- [x] CHK006 - Esta coberto o que acontece com falha de infraestrutura vs reprovacao de conteudo? [Completude, Spec §FR-019] {auto}
- [ ] CHK007 - Esta definido o comportamento quando a avaliadora (LLM) falha ou devolve nota invalida/fora de 1-5? [Gap, Spec §FR-003] {auto}

## Clareza

- [ ] CHK008 - "Concorrencia padrao conservador" e quantificado (numero)? [Ambiguity, Spec §FR-016] {auto}
- [x] CHK009 - Os limiares de latencia (turno 25 s; p50 15 s; p95 25 s) sao numericos e a janela de medicao e definida? [Clareza, Spec §FR-007] {auto}
- [x] CHK010 - O criterio de aprovacao (>=4 em K1-K6, K4 eliminatorio) e inequivoco? [Clareza, Spec §FR-005] {auto}
- [ ] CHK011 - Esta explicito como "2 vezes o medido" do teto de tokens e calculado (total, por roteiro, qual rodada de referencia)? [Ambiguity, Spec §FR-008] {auto}
- [x] CHK012 - O pacote "4 servicos com 20%" tem tratamento definido como dado inventado? [Clareza, Spec §FR-006, US1.4] {auto}

## Consistencia

- [ ] CHK013 - K7 por roteiro (turno >25 s) e K7 da rodada (p50/p95) sao compativeis com "aprovado so com K7 dentro do limite" no FR-005 (qual escopo vale para o veredito do roteiro)? [Ambiguity, Spec §FR-005 vs FR-007] {auto}
- [x] CHK014 - Indice de contato <520 (sem escrita) vs >=520 (agenda) e consistente entre US2.4 e FR-002? [Consistencia, Spec §FR-002, US2.4] {auto}
- [x] CHK015 - R15/R17 e R16 sao tratados igual em US1 e FR-013? [Consistencia, Spec §US1.5-1.6, FR-013] {auto}
- [x] CHK016 - Paralelismo (FR-016) e compativel com serie dos roteiros >=520 e com uma agenda unica de teste? [Consistencia, Spec §FR-016, FR-002] {auto}

## Criterios de aceite e mensurabilidade

- [x] CHK017 - Cada FR tem criterio de aceite ou SC mensuravel (cobertura do gate = 20/20)? [Mensurabilidade, gate requirement-coverage] {auto}
- [x] CHK018 - SC-002/003 (0 residuos, 0 ofertas do profissional de teste) sao objetivamente verificaveis? [Mensurabilidade, Spec §SC-002, SC-003] {auto}
- [x] CHK019 - SC-006 (smokes sem mudar expectativa) e verificavel por testes existentes? [Mensurabilidade, Spec §SC-006, US4] {auto}

## Nao-funcionais, seguranca e edge cases

- [x] CHK020 - Segredos: chave da avaliadora fora do repo, nunca impressa; fallback sem copiar segredos? [Seguranca, Spec §FR-004, FR-015] {auto}
- [x] CHK021 - Ha vedacao de dados reais de clientes nos roteiros? [Seguranca, Spec §FR-020] {auto}
- [ ] CHK022 - Esta definido o comportamento de interrupcao do processo (SIGINT/kill) alem de falha de roteiro, e de residuo deixado por kill -9? [Gap, Spec §FR-010] {auto}
- [ ] CHK023 - Esta definido o comportamento quando nenhuma resposta chega no turno (timeout por turno vs pendencia de 300 s)? [Gap, Spec §FR-018] {auto}

## Premissas e decisoes de produto

- [ ] CHK024 - O teto de 3.000.000 tokens e o limiar >=4/5 refletem o apetite de custo/qualidade do owner? [Assumption, Spec §FR-005, FR-008] {humano}
- [ ] CHK025 - Aceitar relatorio parcial como evidencia suficiente para o principio XV (promocao a PROD) e decisao do owner? [Assumption, Spec §Origem] {humano}

## Notes

- Gate `requirement-coverage.sh`: requirements=20 covered=20 errors=0 (nenhum FR sem cenario).
- Gaps/ambiguidades abertos (CHK007, 008, 011, 013, 022, 023): resolver no plan/create-tasks como decisoes de design ou tarefas "definir X"; nenhum impede o avanco.
- `{humano}` (CHK024, 025): defaults do contexto fixo (>=4/5, 3M tokens) ja ratificados pelo owner; sem bloqueio.
