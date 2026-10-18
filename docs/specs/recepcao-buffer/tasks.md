# Tarefas Barbearia da Vila - recepcao-buffer

Escopo: recepcao do webhook do Chat Master Veloz (conexao 145), buffer "ultima mensagem vence" de 8 s com teto de 60 s, posse por contato e contrato de entrega do turno; TESTE completo, PROD parametrizado e inativo. Nenhum campo de payload e suposto: o contrato do webhook so existe apos a captura (Constitution XVI).

**Legenda de status:**
- `[ ]` Pendente
- `[~]` Em andamento
- `[x]` Concluido
- `[!]` Bloqueado

**Legenda de criticidade:**
- `[C]` Critico - Impacto financeiro direto ou bloqueante
- `[A]` Alto - Funcionalidade essencial
- `[M]` Medio - Necessario mas sem urgencia imediata

---

## FASE 1 - Fechamento de gaps de requisitos (checklist)

### 1.1 Cobertura da captura e limites de payload (CHK004, CHK012) `[A]`

Ref: checklists/api-seguranca-confiabilidade.md CHK004, CHK012; spec.md FR-002, FR-006

- [x] 1.1.1 Ajustar spec.md FR-002 para exigir na captura tambem eventos "enviada pela loja", "nao mensagem" (status etc.) e "grupo", quando o canal os emitir
- [x] 1.1.2 Acrescentar ao roteiro de captura (quickstart.md) o pedido desses eventos ao owner, sem supor como serao identificados
- [x] 1.1.3 Acrescentar requisito de limite de tamanho do payload/midia (valor `[PROPOSTA]` em config, sem inventar fonte) em spec.md e contracts/webhook-chatmaster.md
- [x] 1.1.4 Reexecutar o gate de requisitos e marcar CHK004 e CHK012 no checklist

### 1.2 Deduplicacao e instante de vencimento (CHK017, CHK018) `[A]`

Ref: checklists/api-seguranca-confiabilidade.md CHK017, CHK018; spec.md FR-014, Edge Cases

- [x] 1.2.1 Definir em contracts/config-recepcao.md a chave e o valor default da janela de deduplicacao (FR-014)
- [x] 1.2.2 Especificar a regra deterministica para mensagem no instante do vencimento dos 8 s (corrente ou seguinte) em spec.md e plan.md
- [x] 1.2.3 Escrever o criterio de aceite testavel de ambos como cenarios em spec.md
- [x] 1.2.4 Marcar CHK017 e CHK018 no checklist

### 1.3 Redis indisponivel e posse expirada (CHK019, CHK022) `[A]`

Ref: checklists/api-seguranca-confiabilidade.md CHK019, CHK022; spec.md FR-013, SC-007; contracts/entrega-turno.md

- [x] 1.3.1 Definir o comportamento com Redis reiniciado/indisponivel durante a espera (sem perda silenciosa; mensagens ja gravadas no Postgres) em spec.md
- [x] 1.3.2 Definir em contracts/entrega-turno.md o que ocorre se a feature 3 exceder o TTL da posse (turno duplicado) e o dever de idempotencia da entrega
- [x] 1.3.3 Acrescentar cenarios de teste correspondentes ao plano de smoke
- [x] 1.3.4 Marcar CHK019 e CHK022 no checklist

### 1.4 Retencao de midia e eventos brutos (CHK026, pendencia do owner) `[M]`

Ref: checklists/api-seguranca-confiabilidade.md CHK026; contracts/config-recepcao.md `midia.retencao_h`

- [x] 1.4.1 Registrar a pergunta ao owner (retencao de midia 24 h e de eventos brutos capturados aceitavel?) sem assumir resposta
- [x] 1.4.2 Manter `midia.retencao_h` como `[PROPOSTA]` ate a resposta; se a resposta bloquear a tarefa 4.2, registrar bloqueio humano ao executa-la
- [!] 1.4.3 (aguarda owner) Ao receber a resposta, ajustar config/contrato e marcar CHK026

---

## FASE 2 - Captura real e contrato do webhook (US1)

### 2.1 Script de captura e workflow bv-captura `[A]`

Ref: spec.md FR-001, FR-002, FR-003; plan.md "Estrutura"

- [x] 2.1.1 Criar workflows/bv-captura.json (so TESTE): webhook que responde 200 e guarda a execucao, validado pelo MCP do n8n (MCP indisponivel nesta sessao: validado por deploy + sonda sintetica real, id wXcRwAdqRnGgRzA9; reconferir pelo MCP quando disponivel)
- [x] 2.1.2 Criar scripts/capturar-webhook.py com passos idempotentes: anotar URL atual da conexao 145, trocar, restaurar e gerar fixtures
- [x] 2.1.3 Guardar a URL original em `.captura-145.url` (adicionar ao .gitignore) e recusar captura em PROD
- [x] 2.1.4 Testes unitarios do script (sem rede) para recusa em PROD e idempotencia da restauracao

### 2.2 Captura com o owner (bloqueio humano) `[C]`

Ref: spec.md FR-004, Clarifications; research.md D2, D3; block-001

- [x] 2.2.1 Registrar a URL atual do webhook da 145 (via API; se nao devolver, bloqueio humano pedindo a URL)
- [x] 2.2.2 Registrar bloqueio humano com o texto exato das mensagens que o owner deve enviar do celular (texto, audio, imagem, rajada e os eventos de 1.1) e o numero de destino da conexao 145
- [~] 2.2.3 (webhook TROCADO e ativo; aguardando mensagens do owner, block pendente) Trocar o webhook para o de captura e coletar os eventos enviados pelo owner
- [ ] 2.2.4 Restaurar o webhook original e conferir consultando a conexao (SC-006); apagar execucoes brutas do n8n

### 2.3 Fixtures anonimizados e contrato do webhook `[C]`

Ref: spec.md FR-003, FR-004; contracts/webhook-chatmaster.md

- [ ] 2.3.1 Gerar tests/fixtures/chatmaster/*.json sem telefone, nome ou conteudo real, preservando estrutura e tipos
- [ ] 2.3.2 Reescrever contracts/webhook-chatmaster.md apenas com campos observados, citando o fixture de origem de cada um
- [ ] 2.3.3 Remover as "Hipoteses a confirmar" resolvidas e manter marcadas as nao observadas
- [ ] 2.3.4 Teste tests/test_fixtures.py: ausencia de telefone/nome e presenca da estrutura esperada

---

## FASE 3 - Migracao, config e deploy (US5)

### 3.1 Migracao 0002 `[A]`

Ref: data-model.md; plan.md "Estrutura"

- [ ] 3.1.1 Criar db/migrations/0002_recepcao_buffer.sql com `IF NOT EXISTS`, conforme data-model.md
- [ ] 3.1.2 Aplicar a migracao em barbearia_vila_teste via scripts/migrar.py (PROD fica sem aplicar)
- [ ] 3.1.3 Teste tests/test_esquema.py para colunas, chaves e idempotencia da migracao

### 3.2 Config de ambientes `[A]`

Ref: contracts/config-recepcao.md; spec.md FR-016, FR-017

- [ ] 3.2.1 Acrescentar as chaves de config-recepcao.md em config/ambientes/integracao.json e producao.json (PROD com path e whatsapp_id vazios)
- [ ] 3.2.2 Incluir a chave de deduplicacao (1.2) e o limite de payload/midia (1.1)
- [ ] 3.2.3 Estender scripts/verificar-repo.py: path TESTE diferente de PROD e `espera_s * tentativas >= ttl_s`
- [ ] 3.2.4 Testes da verificacao com configs validas e invalidas

### 3.3 Extensao do deploy `[A]`

Ref: spec.md FR-018; plan.md "Estrutura"

- [ ] 3.3.1 Estender scripts/deploy-n8n.py: placeholders `{{BV:...}}`, include de rajada.js, sub-workflow antes do principal
- [ ] 3.3.2 Recusar deploy de bv-captura em PROD e abortar PROD com path ou whatsapp_id vazio
- [ ] 3.3.3 Ler o hash do token de `.env.n8n`, nunca versionado
- [ ] 3.3.4 Testes em tests/test_deploy_n8n.py para as tres recusas

---

## FASE 4 - Recepcao, buffer, posse e entrega (US2, US3, US4)

### 4.1 rajada.js (normalizar, deveEntregar, consolidar) `[A]`

Ref: spec.md FR-006, FR-007, FR-008, FR-010, FR-011; contracts/webhook-chatmaster.md (pos-captura)

- [ ] 4.1.1 Implementar `bvNormalizar` em workflows/shared/rajada.js mapeando apenas campos do contrato observado
- [ ] 4.1.2 Implementar `deveEntregar` (ultima vence, teto, regra deterministica de 1.2) e `consolidar` (ordem de chegada)
- [ ] 4.1.3 Testes em tests/rajada.test.js com os fixtures: texto, audio, imagem, nao mensagem, grupo, malformado, limite de tamanho
- [ ] 4.1.4 Integrar `node tests/rajada.test.js` ao CMD_LINT/CI sem rede

### 4.2 Workflow bv-recepcao `[A]`

Ref: plan.md "Fluxo do bv-recepcao"; spec.md FR-005, FR-009, FR-012, FR-013, FR-014, FR-015, FR-019

- [ ] 4.2.1 Montar autenticacao (SHA-256 do token; 401), normalizacao (400/200) e resposta 200
- [ ] 4.2.2 Montar upsert de contato, insercao com `ON CONFLICT DO NOTHING` (dedup) e gravacao de midia conforme retencao (1.4)
- [ ] 4.2.3 Montar buffer: `SET ultima`, Wait, decisao ultima/teto, posse por contato com retentativas
- [ ] 4.2.4 Implementar tratamento de Redis indisponivel conforme 1.3 e liberacao da posse em falha
- [ ] 4.2.5 Garantir que logs e chaves nao contenham telefone/texto/segredo (FR-019)
- [ ] 4.2.6 Validar com validate_workflow do MCP do n8n e publicar via deploy no TESTE

### 4.3 Sub-workflow entregar-rajada (stub) e contrato de entrega `[A]`

Ref: contracts/entrega-turno.md; spec.md FR-020

- [ ] 4.3.1 Criar workflows/sub/entregar-rajada.json como stub com `teste.atraso_entrega_s`
- [ ] 4.3.2 Marcar `turno_id`/`turno_em` antes e `processada_em` apos sucesso; desmarcar turno em falha
- [ ] 4.3.3 Tratar excedente do TTL da posse conforme 1.3
- [ ] 4.3.4 Teste do stub contra o contrato de entrega

---

## FASE 5 - Smoke no TESTE e PROD inativo (US5)

### 5.1 Smoke de cenarios C2-C5 `[A]`

Ref: spec.md FR-021, SC-002, SC-003, SC-007; quickstart.md

- [ ] 5.1.1 Criar scripts/smoke-recepcao.py com contatos sinteticos, nunca numero real
- [ ] 5.1.2 Cobrir cenarios: mensagem isolada, rajada, reinicio da espera, dois contatos, posse, duplicidade, teto, Redis indisponivel
- [ ] 5.1.3 Medir entrega em 8-10 s (95%) e 50 mensagens concorrentes
- [ ] 5.1.4 Limpar tudo o que o smoke criar (Postgres e Redis de TESTE)

### 5.2 PROD parametrizado e inativo e fechamento `[A]`

Ref: spec.md FR-016, FR-017, SC-008

- [ ] 5.2.1 Verificar que o deploy de PROD sem autorizacoes nao ativa nada e que o endereco de PROD nao responde
- [ ] 5.2.2 Atualizar docs/infra.md e workflows/README.md com ids e notas
- [ ] 5.2.3 Rodar verificar-repo.py, varrer-segredos.py e `python3 -I -m unittest discover -s tests`

---

## Matriz de Dependencias

```mermaid
flowchart TD
    F1[Fase 1 - Gaps de requisitos]
    F2[Fase 2 - Captura e contrato]
    F3[Fase 3 - Migracao, config, deploy]
    F4[Fase 4 - Recepcao, buffer, entrega]
    F5[Fase 5 - Smoke e PROD inativo]

    F1 --> F3
    F2 --> F4
    F3 --> F4
    F1 --> F4
    F4 --> F5
```

## Resumo Quantitativo

| Fase | Tarefas | Subtarefas | Criticidade |
|------|---------|------------|-------------|
| 1 - Gaps de requisitos | 4 | 15 | A/M |
| 2 - Captura e contrato | 3 | 12 | C/A |
| 3 - Migracao, config, deploy | 3 | 11 | A |
| 4 - Recepcao, buffer, entrega | 3 | 14 | A |
| 5 - Smoke e PROD inativo | 2 | 7 | A |
| **Total** | **15** | **59** | - |

## Escopo Coberto

- US1 a US5 e FR-001 a FR-021 da spec; gaps CHK004, 012, 017, 018, 019, 022 do checklist; CHK026 como pendencia do owner.
- Tier de entrega: nao informado nos args; backlog completo.

## Escopo Excluido

- Logica de atendimento, transcricao de audio e interpretacao de imagem: feature 3.
- Ativacao de PROD: depende da conexao e autorizacao do owner.
- Custo em tokens e observabilidade de escala: nao se aplica a esta feature.
