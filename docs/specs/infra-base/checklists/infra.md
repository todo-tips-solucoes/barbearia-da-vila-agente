# Infra/Security Checklist: infra-base

**Purpose**: qualidade dos requisitos de banco, Redis, deploy, config e segredos.
**Created**: 2026-10-18
**Feature**: [spec.md](../spec.md)

## Banco e isolamento

- [x] CHK001 - Os dois bancos, seus donos e o Postgres alvo (stack n8n) estao nomeados? [Completude, Spec §FR-001] {auto}
- [x] CHK002 - O isolamento entre usuarios e testavel (acesso cruzado negado)? [Mensurabilidade, Spec §FR-002, §SC-002] {auto}
- [x] CHK003 - As quatro estruturas de dados tem atributos minimos descritos? [Completude, Spec §FR-003, Key Entities] {auto}
- [ ] CHK004 - Colunas/tipos/indices estao definidos? [Gap] Spec delega ao plan (Assumptions); confirmar cobertura em data-model.md na etapa create-tasks. {auto}
- [x] CHK005 - O requisito de minimizacao de dados (LGPD) e verificavel? [Clareza, Spec §FR-004, Edge Cases] {auto}
- [x] CHK006 - Estados parciais (banco/usuario existente, senha ja definida) tem comportamento definido? [Cobertura, Spec §Edge Cases, §FR-005] {auto}

## Redis

- [x] CHK007 - Prefixos e database logico estao especificados e disjuntos? [Consistencia, Spec §FR-008, §FR-019] {auto}
- [ ] CHK008 - DB 2 esta confirmado livre? [Assumption] Spec exige sondagem somente leitura antes do uso; ainda pendente. {auto}
- [x] CHK009 - A proibicao de limpeza global e mensuravel? [Mensurabilidade, Spec §FR-007, §SC-007] {auto}
- [ ] CHK010 - Aceita-se isolamento apenas por prefixo (sem ACL)? [Risco, Plan §Seguranca] {humano}

## Deploy

- [x] CHK011 - Ordem update->publish e condicao de falha estao definidas? [Clareza, Spec §FR-009, §FR-010] {auto}
- [x] CHK012 - Idempotencia do deploy tem criterio numerico? [Mensurabilidade, Spec §SC-004] {auto}
- [x] CHK013 - A confirmacao exigida para PROD e a restricao do agente autonomo estao inequivocas? [Clareza, Spec §FR-011, §SC-005] {auto}
- [x] CHK014 - Comportamento com id de workflow inexistente esta definido? [Cobertura, Spec §Edge Cases, §FR-010] {auto}
- [ ] CHK015 - Ha requisito de rollback/versao anterior do workflow apos publish com falha parcial? [Gap] Spec nao cobre; avaliar em create-tasks. {auto}

## Config, segredos e backup

- [x] CHK016 - O conteudo do arquivo de config por ambiente esta enumerado? [Completude, Spec §FR-012] {auto}
- [x] CHK017 - Localizacao dos segredos na VPS e local esta especificada sem expor valores? [Completude, Spec §FR-013, §FR-020] {auto}
- [x] CHK018 - A ausencia de segredos e verificavel por varredura? [Mensurabilidade, Spec §SC-006, §FR-018] {auto}
- [x] CHK019 - Backup tem formato e escopo definidos? [Completude, Spec §FR-021] {auto}
- [ ] CHK020 - Frequencia e retencao do backup estao definidas? [Gap] Spec: pendente do owner. {humano}
- [ ] CHK021 - Os nomes/ids das credenciais n8n estao com fonte rastreavel? [Assumption, Spec §FR-017] Depende de sondagem na instancia. {auto}

## Notes

- Gate requirement-coverage.sh: 21/21 FRs cobertos, 0 findings.
- Gaps: CHK004, CHK015 -> /create-tasks; CHK008, CHK021 -> tarefas de sondagem; CHK010, CHK020 -> owner.
