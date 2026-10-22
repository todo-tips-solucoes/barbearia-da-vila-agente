# Operacao/Seguranca de deploy Checklist: Producao

**Purpose**: Qualidade dos requisitos de levar as features 1 a 6 a PROD (dados, deploy, webhook, liberacao).
**Created**: 2026-10-21
**Feature**: [spec.md](../spec.md)

## Completude

- [x] CHK001 - Existe requisito para criar banco e aplicar migracoes 0001 a 0010 sem alterar dados existentes? [Completude, Spec §FR-001] {auto}
- [x] CHK002 - Backup tem horario (03:30), retencao (14 dias) e restore verificavel definidos? [Completude, Spec §FR-003, Plan Decision 4] {auto}
- [x] CHK003 - A retencao de mensagens (12 meses), a limpeza diaria e o que e preservado (contato, agendamentos) estao definidos? [Completude, Spec §FR-011] {auto}
- [x] CHK004 - Esta definido o requisito de ordem deploy -> webhook, e sub-workflows -> recepcao? [Completude, Spec §FR-005, §FR-009, Edge Cases] {auto}
- [x] CHK005 - O alerta fora de banda (Postgres fora, cota OpenAI) tem destino e gatilhos? [Completude, Spec §FR-016] {auto}
- [x] CHK006 - [Gap] Falta requisito de rollback por passo na spec (so no plan, tabela de fases); rollback do webhook 145 e do banco criado estao so no plan. [Gap, Plan Fases] {auto} Resolvido: spec FR-017 e US4 cenário 4.
- [x] CHK007 - [Gap] Nao ha requisito explicito sobre o que bv-mensagens publicado com mensagens.ativo=false faz (verificacao so no research, "Verificar na implementacao"). [Gap, Research Decision 2] {auto} Resolvido: spec FR-018; plan "Decisões da implementação".

## Clareza

- [x] CHK008 - "Hosts de imagem", "ids de todos os workflows" e "chaves exigidas" tem fonte e lista concreta? [Clareza, Spec §FR-004, Research Decision 3] {auto}
- [x] CHK009 - [Ambiguity] "hook de guarda de PROD ativo" (FR-010) e de responsabilidade do owner no projeto-alvo e nao esta instalado; criterio de aceite da US4.3 conflita com o contexto. [Ambiguity, Spec §US4, Research R1] {auto} Resolvido: spec FR-010 e US4 cenário 3 (hook documental, instalação do owner).
- [x] CHK010 - "Valores [PROPOSTA] iguais aos do TESTE" e verificavel (rodada 17/17 citada)? [Mensurabilidade, Spec §FR-012] {auto}

## Consistencia

- [x] CHK011 - Plan e spec concordam sobre n8n2 exclusivo e [PROD] no nome? [Consistencia, Spec §FR-006, §FR-007; Plan Summary] {auto}
- [x] CHK012 - [Conflict] Spec FR-006 "nao alterar workflows [TESTE] alem do necessario" vs Plan Decision 2 que renomeia bv-vigia/bv-verificacao (rotulo) e parametriza path; confirmar que o TESTE continua com o mesmo nome/path via rotulo. [Conflict, Plan Decision 2] {auto} Resolvido: plan "Decisões da implementação"; tests/test_producao.py.

## Criterios de aceite e cenarios

- [x] CHK013 - Todo FR tem cenario associado (gate de cobertura: 16/16)? [Cobertura, requirement-coverage.sh] {auto}
- [x] CHK014 - SC-001..SC-006 sao mensuraveis (contagens 0/100%, 17/17)? [Mensurabilidade, Spec §Success Criteria] {auto}
- [x] CHK015 - Edge cases cobrem banco existente, migracao parcial, webhook antes do deploy, falha de alerta? [Edge Cases, Spec §Edge Cases] {auto}

## Seguranca e dados

- [x] CHK016 - Proibicao de escrita em agenda real e o bloqueio humano estao definidos? [Seguranca, Spec §FR-014] {auto}
- [x] CHK017 - Regras de segredos (nunca impressos, versionados ou copiados) estao especificadas? [Seguranca, Spec §FR-002, Edge Cases, SC-006] {auto}
- [ ] CHK018 - A base legal LGPD (art. 7o V, sem parecer juridico) e prazo de 12 meses refletem o apetite de risco do owner? [Risco, Spec §FR-011] {humano}
- [ ] CHK019 - O criterio de liberar a todos (ok explicito do owner) e suficiente como gate de release? [Risco, Spec §FR-015] {humano}

## Notes

- Gaps CHK006/CHK007/CHK009/CHK012 viram tasks de codigo/teste (create-tasks); CHK018/CHK019 aguardam o owner no bloqueio final.
