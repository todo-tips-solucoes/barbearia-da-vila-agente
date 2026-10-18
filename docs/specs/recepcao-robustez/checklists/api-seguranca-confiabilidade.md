# Checklist de API, segurança e confiabilidade: recepcao-robustez

**Purpose**: qualidade dos requisitos de resposta ao canal, dedupe por conteúdo, tempo máximo do Redis, `--criar` e isolamento TESTE/PROD.
**Created**: 2026-10-18
**Feature**: [spec.md](../spec.md)

Gate `requirement-coverage.sh`: 18/18 FRs com cenário (0 findings).

## Resposta ao Chat Master

- [x] CHK001 - O momento da confirmação está definido em relação à gravação? [Completude, Spec §FR-001; contracts/recepcao-robustez.md tabela "Resposta"] {auto}
- [x] CHK002 - O comportamento quando o próprio registro da falha falha está especificado? [Cobertura, Spec §FR-004, US1 cenário 3] {auto}
- [ ] CHK003 - O status de erro (500) devolvido ao canal é o adequado, dado que o reenvio do Chat Master diante de 5xx não tem fonte? [Assumption, research D1, contracts §Resposta `[PROPOSTA]`] {humano}
- [x] CHK004 - A resposta para duplicada (por id ou conteúdo) está definida e é distinguível de falha? [Clareza, contracts §Resposta: 200 sem gravação] {auto}
- [x] CHK005 - O reenvio após erro está coberto sem duplicar, para texto sem id e para mensagem com id? [Cobertura, Spec §FR-005; research D2 (rollback da marca) e `ON CONFLICT` por id] {auto}
- [x] CHK006 - O requisito evita afirmar que o canal reenvia sozinho? [Consistência, Princípio XVI; research D1 "Lacuna"] {auto}

## Dedupe por conteúdo

- [x] CHK007 - "Mesmo texto" está definido de forma objetiva (comparação exata, sem normalização)? [Clareza, Spec §FR-010; contracts §Dedupe "mesmo sha256(texto)"] {auto}
- [x] CHK008 - A janela é configurável e tem valor com fonte? [Clareza, Spec §FR-010; contracts/config-robustez.md `dedup.conteudo_janela_s` = 10, dec-031] {auto}
- [x] CHK009 - A referência da janela está definida (desde a última aceitação, não desde a última chegada)? [Clareza, data-model "Marca" transições] {auto}
- [x] CHK010 - A atomicidade frente a duas chegadas simultâneas está especificada? [Cobertura, research D2 rationale (b)] {auto}
- [x] CHK011 - A exclusão de mídia e de mensagens com id está explícita? [Completude, Spec §FR-011; contracts §Dedupe] {auto}
- [x] CHK012 - A marca não guarda texto nem telefone legíveis? [Segurança, Spec §FR-012, SC-006; data-model "Marca" (hash + contato_id)] {auto}
- [ ] CHK013 - O apetite ao risco do hash sem sal (texto curto adivinhável pelo hash) é aceitável? [Risco, plan §Riscos L1] {humano}
- [x] CHK014 - O risco aceito do "ok" repetido está documentado no contrato? [Completude, Spec §FR-012; contracts §Dedupe "Risco aceito pelo owner"] {auto}
- [x] CHK015 - O efeito de hoje todo texto chegar sem id (dedupe vale para todo texto) está explícito? [Assumption, research D2 último parágrafo; `rajada.js` shortcut] {auto}

## Redis sem travar

- [ ] CHK016 - O valor de 5 s do tempo máximo foi confirmado pelo owner? [Assumption, Spec §FR-006 `[PROPOSTA]`; contracts/config-robustez.md] {humano}
- [ ] CHK017 - O início da medição de SC-002 ("tempo máximo + 2 s") está definido (por operação Redis ou por execução, a partir de quando)? [Ambiguity, Spec §SC-002; quickstart S0/S3 medem a execução] {auto}
- [ ] CHK018 - Os três tipos de FR-008 (indisponível, credencial recusada, tempo esgotado) continuam distinguíveis se o nó pendurado só produzir timeout? [Conflict, Spec §FR-008 e US2 cenário 2 vs research D3 "Limite conhecido"] {auto}
- [x] CHK019 - Há caminho definido se a hipótese do timeout de sub-workflow falhar? [Dependências, research D3 "HIPÓTESE NÃO MEDIDA": sonda + bloqueio humano com 3 opções] {auto}
- [x] CHK020 - A falha do Redis após a gravação está especificada como não alterando a resposta? [Consistência, Spec §FR-009; contracts §Resposta] {auto}
- [ ] CHK021 - O registro de falha cobre também a liberação da posse (`Liberar posse`), que hoje segue sem registro? [Gap, Spec §FR-008 "nesse caminho" vs plan §Fluxo "erro delas segue continueRegularOutput"] {auto}
- [x] CHK022 - O acesso ao sub-workflow `redis-op` está restrito numa instância n8n compartilhada? [Segurança, research D3 política de chamador + prefixo] {auto}
- [x] CHK023 - A mensagem de erro bruta (que pode citar host) é excluída do registro? [Segurança, research D3; data-model "Falha"] {auto}
- [x] CHK024 - A entrega no turno seguinte de mensagens pendentes após o Redis voltar está especificada sem duplicidade? [Cobertura, Spec §SC-003; data-model "Mensagem"] {auto}

## `--criar` de sub-workflow

- [x] CHK025 - A seção de destino do id está definida para sub e para principal? [Clareza, Spec §FR-013; contracts §`--criar`] {auto}
- [x] CHK026 - As recusas (id preenchido, nome existente, PROD) seguem especificadas? [Completude, Spec §FR-014; contracts §`--criar`] {auto}
- [x] CHK027 - O critério "nome é sub" está definido sem ambiguidade? [Clareza, research D4: presença em `workflows_sub`] {auto}

## Isolamento e dados

- [x] CHK028 - PROD recebe só parâmetros, sem ativação nem id? [Consistência, Spec §FR-016; contracts/config-robustez.md coluna PROD] {auto}
- [x] CHK029 - O "ambiente" da falha (Key Entities) está atendido sem coluna nova? [Completude, Spec §Key Entities; ambiente implícito no banco separado por ambiente, Princípio XIII] {auto}
- [x] CHK030 - As credenciais inválidas temporárias dos testes têm destino definido (apagar no fim)? [Segurança, quickstart (restaura no `finally`); plan Constitution XIV] {auto}
- [x] CHK031 - Os testes exigidos cobrem cada cenário de aceitação e limpam o que criam? [Cobertura, Spec §FR-017; quickstart S0–S6] {auto}
- [ ] CHK032 - A falta de alerta fora de banda quando o próprio Postgres está fora é aceitável para a operação? [Risco, Spec §Clarifications; plan §Riscos M2] {humano}

## Notes

- `{auto}` resolvidos: 25 `[x]`; gaps abertos `{auto}`: CHK017 `[Ambiguity]`, CHK018 `[Conflict]`, CHK021 `[Gap]` (viram tarefa em `/create-tasks`; CHK018 só se resolve após a sonda).
- `{humano}` aguardando o owner: CHK003, CHK013, CHK016, CHK032 (não bloqueiam a implementação; ficam para a PR).
