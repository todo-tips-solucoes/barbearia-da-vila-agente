# API / Segurança / Confiabilidade Checklist: recepcao-buffer

**Purpose**: validar a qualidade dos requisitos da recepção do webhook, do buffer e da posse por contato.
**Created**: 2026-10-18
**Feature**: [spec.md](../spec.md)

## Contrato do webhook e veracidade

- [x] CHK001 - Está proibido supor nomes de campo do payload, com contrato só após captura? [Completude, Spec §FR-004, Clarifications] {auto}
- [x] CHK002 - O contrato do webhook marca explicitamente o que é hipótese de documentação versus observado? [Clareza, contracts/webhook-chatmaster.md "Hipóteses a confirmar"] {auto}
- [x] CHK003 - Estão definidos os eventos mínimos da captura (texto, áudio, imagem, rajada)? [Cobertura, Spec §FR-002] {auto}
- [ ] CHK004 - Os eventos "enviada pela loja", "não mensagem" e "grupo" são exigidos na captura, e não apenas texto/áudio/imagem/rajada? [Gap, Spec §FR-002 vs §FR-006, Edge Cases] {auto}
- [x] CHK005 - A restauração do webhook original tem critério verificável (conferir consultando a conexão)? [Mensurabilidade, Spec §FR-001, US1.2, SC-006] {auto}
- [x] CHK006 - Há destino definido se a URL atual do webhook não puder ser lida (bloqueio humano)? [Dependências, plan.md "NEEDS CLARIFICATION"] {auto}

## Recepção e segurança

- [x] CHK007 - A credencial do webhook e a resposta à falha estão especificadas (401)? [Completude, Spec §FR-005, contracts/webhook-chatmaster.md] {auto}
- [x] CHK008 - Os códigos de resposta por categoria (aceito/descartado 200, malformado 400, sem credencial 401) são distintos e sem ambiguidade? [Clareza, contracts/webhook-chatmaster.md] {auto}
- [x] CHK009 - Descartar sem erro ao remetente está distinguido de rejeitar malformado? [Consistência, Spec §FR-006 vs §FR-007] {auto}
- [x] CHK010 - O requisito de não registrar PII/segredos em logs e chaves é mensurável por varredura? [Mensurabilidade, Spec §FR-019, SC-005] {auto}
- [x] CHK011 - O token é guardado apenas como hash e fora do repositório? [Segurança, plan.md Technical Context/Constitution XIV] {auto}
- [ ] CHK012 - Há requisito de limite de tamanho do payload/mídia (base64 no webhook) para evitar abuso de memória? [Gap, contracts/webhook-chatmaster.md "Mídia na biblioteca Pro"] {auto}

## Buffer, posse e idempotência

- [x] CHK013 - Janela de 8 s com reinício e entrega única estão definidas com cenários de aceite? [Completude, Spec §FR-009/FR-010, US3] {auto}
- [x] CHK014 - O teto de espera total é quantificado e configurável? [Clareza, Spec §FR-011, Clarifications] {auto}
- [x] CHK015 - A expiração da posse do contato é especificada e coerente com o intervalo de tentativas (espera_s × tentativas ≥ ttl_s)? [Consistência, Spec §FR-013, contracts/config-recepcao.md] {auto}
- [x] CHK016 - A duplicidade de evento tem janela configurável e cenário em Edge Cases? [Cobertura, Spec §FR-014] {auto}
- [ ] CHK017 - A janela de deduplicação (FR-014) tem chave e valor default quantificados no config? [Gap, Spec §FR-014 vs contracts/config-recepcao.md] {auto}
- [ ] CHK018 - O comportamento exato para mensagem no instante do vencimento dos 8 s ("corrente ou seguinte") é determinístico e testável? [Ambiguity, Spec Edge Cases] {auto}
- [ ] CHK019 - O comportamento ao reiniciar/indisponibilizar o Redis durante a espera está definido (e não só "definido e registrado")? [Gap, Spec Edge Cases, SC-007] {auto}
- [x] CHK020 - Isolamento entre contatos está especificado e com cenário (US3.4, US4.3)? [Cobertura, Spec §FR-015] {auto}

## Entrega e ambientes

- [x] CHK021 - O contrato de entrega define entrada, saída, ordem e semântica de posse/liberação? [Completude, Spec §FR-020, contracts/entrega-turno.md] {auto}
- [ ] CHK022 - Está definido o que ocorre se a feature 3 exceder o TTL da posse (turno duplicado)? [Ambiguity, contracts/entrega-turno.md "Semântica de posse"] {auto}
- [x] CHK023 - Isolamento TESTE/PROD (path, webhookId, banco, prefixo) e PROD inativo estão especificados? [Completude, Spec §FR-016/FR-017, SC-008] {auto}
- [x] CHK024 - Os critérios de sucesso de tempo (8–10 s em 95%) e concorrência (50 mensagens) são mensuráveis? [Mensurabilidade, SC-002/SC-003] {auto}
- [x] CHK025 - Os contratos internos propostos estão marcados `[PROPOSTA]`, sem apresentá-los como fonte externa? [Assumption, contracts/*.md] {auto}
- [ ] CHK026 - O limite de retenção de mídia (24 h) e de eventos brutos capturados é aceitável para o dono do produto? [Risco, contracts/config-recepcao.md `midia.retencao_h`] {humano}

## Notes

- Gaps (CHK004, 012, 017, 018, 019, 022) viram tarefas de especificação em `/create-tasks`; nenhum bloqueia o plano.
- Gate `requirement-coverage.sh`: 21/21 FRs com cenário, 0 findings.
- Items `{humano}` ficam `[ ]` aguardando o owner.
