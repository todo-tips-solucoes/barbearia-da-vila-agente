# Plano de implementação: regras-negocio-agenda

**Feature**: `regras-negocio-agenda` | **Spec**: [spec.md](spec.md) | **Base**: `agente-conversacional-graces` (F3)

## Summary

Estende o agente da F3 sem peça nova de arquitetura: as regras de negócio entram em
`workflows/shared/graces.js` e `agente.js` (código puro, testado por `node tests/*.test.js`) e são
impostas pelas ferramentas do `bv-graces`, não pelo prompt (FR-013). Oferta de horários sem corte e
enviada em várias listas pelo `Compor`; pacote consultado em código antes de cada proposta, com a
pergunta obrigatória por lista; "2ª vez" recusado também na escrita; terceiros por busca de nome com
confirmação em turno posterior e cadastro em duas fases (desligado no TESTE); terceiro ou nome de
primeiro contato já cadastrado com outro celular é encaminhado à equipe, sem agendar nem cadastrar
(block-003); encadeamento só com
inícios presentes nas grades de cada serviço; erros decididos pelo `code`; escrita incerta verificada
pelo próprio `bv-graces` antes de no máximo uma repetição. Para caber os estágios extras, o
`bv-graces` passa a ter um laço de estágios com teto, medido na sonda S3 (fallback desenrolado).
Só TESTE. Decisões em [research.md](research.md).

## Technical Context

**Language/Version**: JSON de workflow n8n + JS nos Code nodes (`workflows/shared/*.js`), SQL na
migração, Python 3 stdlib nos scripts (herdado da F3).
**Primary Dependencies**: n8n 2.43.5 (AI Agent 3, `lmChatOpenAi` 1.3, `toolWorkflow` 2.2; F3
research "Resultado da sonda S0"), OpenAI `gpt-5.6-luna`, Graces `public/v1`, Chat Master QR Pro.
Nenhum pacote novo.
**Storage**: Postgres `barbearia_vila_teste`; migração `0007` só amplia `CHECK` de `propostas`
([data-model.md](data-model.md)).
**Testing**: `node tests/graces.test.js` (u1–u20), `node tests/agente.test.js`, unittest
(`tests/test_workflows_agente.py`, `tests/test_esquema.py`), `scripts/smoke-agente.py` roteiros r1–r10,
MCP `get_workflow_details` após deploy no TESTE ([quickstart.md](quickstart.md)).
**Target Platform**: `https://n8n2.todo-tips.com`, só TESTE; PROD parametrizado e inativo (fonte: briefing, `docs/decisoes-pre-00c.md` e spec, escopo de ambiente).
**Project Type**: workflows n8n + scripts.
**Performance Goals**: manter p90 ≤ 20 s até a primeira mensagem (meta da F3, medida em `docs/infra.md:112`) nos roteiros de um
serviço; medir encadeamento.
**Constraints**: FR-014 (barbeiro de teste, cliente Paulo, limpeza, sem cadastro real); limite de 4
mensagens (constituição X); sem PII em `falhas_agente`.
**Scale/Scope**: uma loja; até 3 serviços encadeados; até 40 inícios por turno.
**NEEDS CLARIFICATION**: nenhum. Desconhecidos factuais viram sondas: S3 (laço de estágios no n8n) e
S4 (4 listas seguidas, humano). Pendência P3 (cliente de teste com pacote) só limita o teste real
do caminho `pacote`.

## Constitution Check

| Princípio | Status | Notas |
|-----------|--------|-------|
| II / II-bis trilha e registro | PASS | artefatos em `docs/specs/regras-negocio-agenda/`; PR pelo owner |
| III validação estática | PASS | `CMD_LINT` do `cockpit.config` cobre os testes novos |
| IV / IV-bis dependências e identidade | PASS | nenhum pacote novo |
| V fonte oficial | PASS | endpoints citam `graces-api/`; ciclo no n8n medido em S3, não afirmado |
| VI pt-BR | PASS | |
| VII idempotência | PASS | migração com `DROP CONSTRAINT IF EXISTS`/`ADD`; trava de proposta inalterada |
| VIII parametrização | PASS | limites novos em config ([contracts/config-regras.md](contracts/config-regras.md)) |
| IX Graces fonte da verdade | PASS | inícios e sequências só das grades; "2ª vez" fora da oferta e da escrita; barbeiro de teste filtrado |
| X conversa humanizada | PASS | toda escolha nova (pacote, pessoa, modo) por lista; listas contam no limite de 4 mensagens |
| XI escrita segura | PASS | confirmação em turno posterior para escrita e cadastro; `code`; verificação antes de repetir; pacote sempre perguntado |
| XII skills e validação n8n | PASS | mesmo nó AI Agent; conferência pelo MCP após deploy no TESTE |
| XIII isolamento | PASS | só TESTE; deploy de PROD continua recusando `teste.*` |
| XIV segredos e dado mínimo | PASS | busca de pessoa mostra só nome; celular do terceiro só em `propostas.dados` até terminar |
| XV teste antes de produção | PASS | roteiros r1–r10 com barbeiro de teste e limpeza no `finally` |
| XVI zero fabricação | PASS | S3/S4 medem o que a fonte não diz; regras de pacote citam G `04`:148-168 |

Re-check pós-design: PASS. Peças novas: uma migração (só `CHECK`), três ferramentas no mesmo
`bv-graces` e a ligação de volta no laço. Nenhum serviço, credencial ou workflow novo.

## Project Structure

```text
docs/specs/regras-negocio-agenda/{plan,research,data-model,quickstart}.md, contracts/
workflows/shared/graces.js        # pacote, 2ª vez na escrita, terceiros, encadeamento, verificação, code
workflows/shared/agente.js        # Compor com várias listas, prompt, textos novos
workflows/sub/bv-graces.json      # laço de estágios (Planejar -> Tem chamada? -> Graces -> Passo -> volta)
workflows/sub/entregar-rajada.json  # ferramentas buscar_pessoa, escolher_pessoa, cadastrar_terceiro; campos novos
db/migrations/0007_regras_agenda.sql
config/ambientes/{integracao,producao}.json   # chaves de contracts/config-regras.md
scripts/smoke-agente.py           # roteiros r1–r10, limpeza de itens de conjunto
tests/graces.test.js, tests/agente.test.js, tests/test_workflows_agente.py, tests/test_esquema.py
docs/infra.md, workflows/README.md  # laço, limites e política de teste
```

## Fluxo do `bv-graces` (novo laço)

```text
Gatilho -> Normalizar -> Entrada valida? -> Contexto (reivindica proposta) -> Planejar
  -> Tem chamada? -sim-> Graces (HTTP, neverError, timeout) -> Passo (bvGPasso, estagio+1) -> Tem chamada?
                 -não-> Efeitos -> Substituir pendente -> Persistir -> Saida
```

Fase 2 de `agendar` (um serviço): revalidação + linha de base → POST → [incerta → leitura → repetição
→ leitura] → final. Conjunto: revalidação de todos + linha de base → POST item 1 → … → item n, cada
um com o mesmo ramo de verificação.

## Convenções de Borda

| Camada | Estilo | Validação | Fonte da verdade |
|--------|--------|-----------|------------------|
| Colunas Postgres | snake_case | migração + `test_esquema.py` | `db/migrations/0006_agente.sql`, `0007_regras_agenda.sql` |
| Payload Graces | camelCase da API (`idClienteItemPacote`, `secoes`, `busca`) | `bvGPasso` | `graces-api/` |
| Entradas/saídas das ferramentas | snake_case (`id_opcao_pagamento`, `id_opcoes_servicos`) | `bvGNormalizar` recusa campo desconhecido | [contracts/ferramentas-graces-regras.md](contracts/ferramentas-graces-regras.md) |
| jsonb `pedido`/`opcoes`/`dados` | chaves mistas herdadas da F3 (ids da Graces em camelCase, controle em snake_case) | só escritos pelo `bv-graces` | [data-model.md](data-model.md) |
| Config | snake_case | `verificar-repo.py` | [contracts/config-regras.md](contracts/config-regras.md) |
| Datas | `AAAA-MM-DD`, `HH:mm`, `AAAA-MM-DDTHH:mm:ss` sem offset | `bvGNormalizar` | G `05`:108 |

Mapper: `bvGPasso` traduz a Graces para opções `{id, rotulo, valor}`; o modelo nunca vê nem envia id
da Graces (F3). SQL só parametrizado.

## Complexity Tracking

Sem violações.

## Riscos

Ver [research.md](research.md#riscos): turno longo no pior caso de verificação, latência do
encadeamento com "qualquer barbeiro", caminho `pacote` sem teste real até P3, nomes de homônimos
exibidos na busca de pessoa.
