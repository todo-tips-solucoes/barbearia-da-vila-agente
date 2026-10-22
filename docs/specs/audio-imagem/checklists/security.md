# Security Checklist: Entrada de áudio e imagem

**Purpose**: qualidade dos requisitos de segurança e dado mínimo (download de mídia, injeção, retenção, segredos)
**Created**: 2026-10-19
**Feature**: [spec.md](../spec.md)

Suposições (execução autônoma do feature-00c, sem operador): profundidade Standard, público
revisor de PR, foco nos dois clusters de maior risco do gate `owasp-security` (SSRF/download e
injeção via mídia) mais retenção.

## Download e SSRF

- [x] CHK001 - A origem permitida da mídia está definida como lista de hosts por tipo, só https, sem redirecionamento? [Completude, Spec §FR-006, contracts/config-midia.md `midia.hosts_*`] {auto}
- [x] CHK002 - O comportamento para host de imagem ainda não observado está definido (falha fechada com resposta natural)? [Cobertura, Spec §FR-006, Clarifications dec-009] {auto}
- [x] CHK003 - O critério de validação da URL está especificado de forma verificável (regex ancorada, igualdade de host, casos negativos)? [Clareza, plan.md §Segurança H1] {auto}
- [x] CHK004 - As chaves `midia.prefixos_*` e `midia.descricao_max_chars`, citadas nas mitigações H1/H2, constam no contrato de config com valor e regra do `verificar-repo.py`? [Conflict, plan.md §Segurança vs contracts/config-midia.md: ausentes na tabela] {auto} Resolvido: `contracts/config-midia.md` (chaves `midia.prefixos_*`, `midia.descricao_max_chars`).
- [x] CHK005 - O limite de tamanho de FR-006 é exigível contra o binário real, e não só contra o `fileLength` declarado pelo evento? [Gap, Spec §FR-006; plan.md §Segurança H4 aceito: teto de bytes depende de opção do nó HTTP não medida] {auto} Resolvido: camadas (evento, timeout de execucao, tamanho real no Conferir), research.md §2.4.
- [x] CHK006 - O destino da verificação do teto de bytes no nó HTTP está definido como tarefa bloqueante se não suportado? [Dependência, plan.md §Segurança H4, dec-015] {auto}

## Injeção via mídia

- [x] CHK007 - Está explícito que conteúdo de áudio/imagem é dado do cliente e nunca instrução? [Completude, Spec §FR-010, Edge Cases] {auto}
- [x] CHK008 - Estão definidas as defesas concretas (teto de caracteres da descrição, neutralização de delimitadores, confirmação antes de escrita na agenda) e a fixture de injeção? [Clareza, plan.md §Segurança H2, Constitution Check XI] {auto}
- [ ] CHK009 - O risco residual de injeção (mitigada, não eliminada) tem apetite aceito pelo owner? [Risco, plan.md §Riscos "Injeção via áudio/imagem"] {humano}

## Dado mínimo, logs e segredos

- [x] CHK010 - Os registros de falha excluem arquivo, transcrição, descrição, telefone e segredo? [Completude, Spec §FR-008, US4-3; data-model.md Falha de mídia] {auto}
- [x] CHK011 - Está definido que a URL não vai para log e o host recusado é gravado só como host? [Clareza, plan.md §Segurança M4, L3] {auto}
- [x] CHK012 - A chave OpenAI fica restrita à credencial do n8n, fora de logs e artefatos? [Completude, Spec §FR-013; contracts/config-midia.md `credenciais.openai`] {auto}
- [x] CHK013 - A não retenção do binário em disco tem verificação definida (`saveData*`=`none`, sonda D7 bloqueante)? [Mensurabilidade, contracts/interpretar-midia.md §Chamada; plan.md §Technical Context; §Segurança M6] {auto}

## Retenção

- [x] CHK014 - O prazo de 24 h está quantificado com pior caso explícito (`retencao_h` 23.9 + intervalo de 5 min do vigia)? [Mensurabilidade, Spec §FR-009/SC-004; data-model.md §Retenção] {auto}
- [x] CHK015 - Os campos apagados pela retenção estão enumerados (incluindo a URL virando hash)? [Completude, data-model.md tabela `mensagens`] {auto}
- [x] CHK016 - As cópias fora da limpeza (respostas de saída, retenção da OpenAI, backups) estão registradas como risco aceito? [Risco, plan.md §Segurança H3 aceito, block-002/dec-015] {auto}
- [x] CHK017 - SC-004 ("nenhum conteúdo existe mais de 24 h") é consistente com as cópias aceitas em H3 (respostas do agente, backups) ou precisa ser reescrito como "nas tabelas de mídia"? [Conflict, Spec §SC-004 vs plan.md §Segurança H3] {auto} Resolvido: spec.md SC-004 reescrito "nas tabelas de mídia do banco do atendimento".

## Notes

- Items `{auto}` já vêm resolvidos (`[x]` com citação) ou marcados `[Gap]`/`[Conflict]`.
- Items `{humano}` ficam `[ ]` aguardando o owner.
- Gate `requirement-coverage.sh`: 16/16 FRs com cenário (sem item adicional).
