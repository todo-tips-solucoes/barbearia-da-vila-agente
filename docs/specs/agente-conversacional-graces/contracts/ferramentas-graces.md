# Contrato: ferramentas do agente (`bv-graces`)

`[PROPOSTA — a validar na implementação]` para a interface das ferramentas (nomes, campos de
entrada e saída). Os endpoints da Graces abaixo são **reais** e citam a fonte em `graces-api/`.

## Chamada

Cada ferramenta é um nó `@n8n/n8n-nodes-langchain.toolWorkflow` 2.2 no `entregar-rajada`, apontando
para `{{BV:workflows_sub.bv_graces}}` com `workflowInputs.mappingMode:"defineBelow"` (padrão GOLD
`sub/entregar-rajada.json:285-305`). Entradas **fixas** (vindas do fluxo, nunca do modelo):
`operacao`, `contato_id`, `telefone`, `turno_id`, `ambiente`. Entradas do modelo via `$fromAI`.
O gatilho do `bv-graces` é `executeWorkflowTrigger` 1.1 com `inputSource:"workflowInputs"`.

Base `https://{{BV:graces.host}}/public/v1`, header `X-Api-Key` por credencial Header Auth
(G `00-autenticacao-e-erros.md:13`, `:34`). Datas de São Paulo sem offset (G `05`:108).

Saída comum: `{ ok: true, ... }` ou `{ ok: false, code, orientacao }`, onde `orientacao` é uma frase
para o agente (ex.: "dia fechado, sugira outro dia"). Nunca devolve telefone de outro cliente,
`traceId` ou detalhe técnico ao modelo.

## Ferramentas

| Ferramenta | Entrada do modelo | Graces | Saída ao modelo |
|------------|-------------------|--------|-----------------|
| `identificar_cliente` | — (usa `telefone` fixo) | `GET /agenda/clientes?celular=` (G `02`:17-26) | `{clientes:[{id, nome}]}` 0, 1 ou vários (G `05`:36) |
| `cadastrar_cliente` | `nome` | `POST /agenda/clientes` `{nomeCliente, ddiCelular:"55", celular}` (G `02`:54-66, `06`:94) | `{idCliente}` |
| `escolher_cliente` | `id_opcao` | — | grava `pedido.idCliente` a partir de `conversas.opcoes` |
| `listar_servicos` | `texto?` | `GET /agenda/servicos[?texto=]` (G `01`:16-22) | opções: serviço + `valorPadrao` (sem "2º vez", inativos ou sem barbeiro real) |
| `listar_barbeiros` | `id_opcao_servico` | `GET /servicos/profissionais?idServico=` (G `01`:43-61) | opções: `apelido` com `trim()`, sem o de teste |
| `horarios_livres` | `id_opcao_servico`, `id_opcao_barbeiro` ou `qualquer`, `data` (AAAA-MM-DD) | `GET /agenda/horarios-livres?idServico=&idProfissional=&data=` (G `03`:21-34), um por barbeiro real se `qualquer` | opções `HH:mm` (+ barbeiro), `minutos`; `[]` = lotado |
| `meus_agendamentos` | — | `GET /agenda/agendamentos?idCliente=&proximos=true` (G `04`:33-49) | opções: `idAgenda`, serviço, barbeiro, início |
| `agendar` | fase 1: `id_opcao_horario`; fase 2: `proposta_id` | fase 2: revalida `horarios-livres`, `POST /agenda` `{idCliente, idServico, idProfissional, data, horaInicio, idIntegracao}` (G `04`:56-81) | fase 1: `{proposta_id, resumo}`; fase 2: `{ok, idAgenda}` |
| `reagendar` | fase 1: `id_opcao_agendamento`, `id_opcao_horario`; fase 2: `proposta_id` | fase 2: revalida, `PUT /agenda/{idAgenda}` `{horaInicioOriginal, horaInicioNovo, idProfissional}` (`AAAA-MM-DDTHH:mm:ss`, G `04`:86-105) | idem |
| `cancelar` | fase 1: `id_opcao_agendamento`; fase 2: `proposta_id` | fase 2: `DELETE /agenda/{idAgenda}` (+`?data=` se `recorrente`, G `04`:110-121) | fase 1 inclui `sugerir_remarcar:true` |

`trocar_servico` é `agendar` com `substitui_id_opcao_agendamento`: uma proposta, escrita = `POST`
do novo e depois `DELETE` do antigo (US3-5).

## Regras impostas em código

1. `id_opcao_*` só resolve contra `conversas.opcoes` do contato; id desconhecido → `ok:false`,
   `orientacao:"opção não oferecida, pergunte de novo"` (US2-3).
2. Qualquer `idProfissional` = `{{BV:graces.barbeiro_teste_id}}` vindo do modelo é recusado
   (FR-012). Em TESTE a escrita troca para o barbeiro de teste (research Decision 10).
3. Fase 2 só executa se a proposta está `pendente`, é do mesmo contato, foi criada num turno
   anterior ao corrente e está dentro de `proposta.validade_min` (FR-007).
4. `agendar`/`reagendar` fase 2: se o horário não está mais em `horarios-livres`, a proposta vira
   `falhou` e a saída traz novas opções do mesmo dia (US1-4).
5. `idCliente` usado é sempre `conversas.pedido.idCliente` ou o encontrado pelo `telefone` fixo, nunca
   um id do modelo (FR-020). `GET /agenda/completa` não é usado (G `04`:186-203, `05`:106).
6. Erros: decisão por `code` (G `00`:57-61, `05`:89-97); timeout/5xx na escrita → `incerta` e
   verificação por `meus_agendamentos` antes de qualquer nova tentativa (research Decision 9).
