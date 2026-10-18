# Research: agente-conversacional-graces

Fontes: `G` = `graces-api/`, `C` = `chatmasterveloz-api/`, `GOLD` = `/home/projetos/goldincision_licienciados/`.
Valor sem fonte rastreável aparece como `[PROPOSTA]` (Princípio XVI) e é medido ou confirmado
numa sonda antes de virar fato. Nenhum NEEDS CLARIFICATION estrutural: plataforma (n8n), nó AI
Agent + sub-workflows, Postgres/Redis da stack e OpenAI `gpt-5.6-luna` já foram decididos pelo owner
(`docs/decisoes-pre-00c.md` linhas 9, 31; constituição XII).

## Decision 1: o agente ocupa o lugar do stub `entregar-rajada`

**Decision**: `workflows/sub/entregar-rajada.json` (id TESTE `ilzXqBWGtcczlGEu`) deixa de ser stub e
passa a conter o agente. Mesmo gatilho (`executeWorkflowTrigger` 1.1, passthrough), mesma entrada e
mesma saída do contrato `docs/specs/recepcao-buffer/contracts/entrega-turno.md`. As operações da
Graces ficam num sub-workflow novo, `workflows/sub/bv-graces.json`, exposto ao agente por vários nós
`@n8n/n8n-nodes-langchain.toolWorkflow` 2.2, um por ferramenta, cada um com a `operacao` fixa.

**Rationale**: é o mesmo desenho do GOLD (`workflows/sub/entregar-rajada.json:215-305`: agente dentro
do sub chamado pela recepção, ferramenta sub-workflow com entradas fixas vindas do fluxo e só as
variáveis da conversa via `$fromAI`). Manter o id e o contrato evita mexer no `bv-recepcao`
(FR-001). Um sub-workflow só para a Graces mantém um único lugar para autenticação, filtro do
barbeiro de teste e tratamento de `code`.

**Alternatives considered**: um sub-workflow por ferramenta (9 arquivos repetindo auth e filtros);
o Agent de primeira classe do n8n (proibido pela constituição XII).

## Decision 2: histórico e estado do pedido no Postgres, sem nó de memória

**Decision**: o nó AI Agent roda sem nó de memória. O fluxo monta o contexto de cada turno a partir do
Postgres do ambiente: últimas `agente.mensagens_contexto` mensagens de `mensagens` (entrada e saída)
desde o início da sessão, mais o estado do pedido em `conversas.pedido` e as opções oferecidas em
`conversas.opcoes`. Sessão nova quando a última mensagem do cliente tem mais de
`conversa.janela_recencia_min` (120) minutos: o histórico antigo não entra e o pedido antigo vai ao
modelo só como "pedido abandonado, não retome sem o cliente pedir".

**Rationale**: FR-019 pede persistência no banco do ambiente e só o necessário; FR-011 fica
determinístico (o corte por recência é código, não instrução). O GOLD também usa o Postgres como
fonte única do estado do funil (`docs/specs/agente-mapa-mestre/research.md` D4) e só usa a memória
Redis para o diálogo. Aqui as mensagens de entrada já estão em `mensagens` (recepção) e as de saída
passam a ser gravadas lá; um nó de memória duplicaria esse histórico em outro lugar.

**Alternatives considered**: `@n8n/n8n-nodes-langchain.memoryRedisChat` 1.5 como no GOLD
(histórico fora do banco do ambiente, sessão por chave versionada); nó de memória Postgres (tipo não
verificado nas fontes, Princípio XVI).

## Decision 3: confirmação em duas fases imposta pelas ferramentas de escrita

**Decision**: `agendar`, `reagendar` e `cancelar` funcionam em duas fases. Na primeira chamada a
ferramenta valida, revalida o horário (para agendar/reagendar), grava uma `proposta` pendente com o
`turno_id` corrente e devolve o resumo (serviço, barbeiro, dia, hora, valor) que o agente deve mostrar.
A escrita na Graces só acontece numa chamada posterior com o `proposta_id`, e só se a proposta está
pendente, não venceu (`proposta.validade_min`) e foi criada num turno **anterior** do mesmo contato.
Proposta nova do contato substitui a pendente anterior. Troca de serviço = uma proposta composta
(criar o novo, depois cancelar o antigo) com uma confirmação.

**Rationale**: FR-007 exige que a ferramenta recuse escrita sem confirmação; exigir turno anterior
garante em código que o cliente viu o resumo e respondeu depois dele (SC-002). A confirmação em si
("sim") é interpretada pelo modelo; o código garante a ordem. Criar antes de cancelar na troca evita
deixar o cliente sem horário se a criação falhar.

**Alternatives considered**: citação literal do "sim" como evidência (padrão do GOLD,
`research.md` D6), mais frágil; botão de confirmação obrigatório (a constituição X reserva Quick Reply
para a confirmação de presença, não para esta).

## Decision 4: filtros da Graces em código, antes do modelo

**Decision**: o `bv-graces` remove, antes de devolver ao agente: o profissional
`1cee0bb9-e58b-4428-9e9b-1db184db7943` e qualquer `apelido`/`nomeCompleto` com "TESTE" (sem
acento/caixa); serviços cuja `descricaoAgenda` contenha "2º vez"/"2ª vez"; serviços sem
profissional real; serviços inativos (`ativo`). `apelido` passa por `trim()`. "Qualquer barbeiro" =
consulta de `horarios-livres` para cada profissional real do serviço e união. As ferramentas de
escrita recusam o id de teste vindo do modelo. O `Compor` aplica o mesmo filtro de novo no texto e
nas opções de saída.

**Rationale**: FR-012 exige filtro antes do modelo. Fontes: id e regra de filtrar por id em
G `06-dados-da-loja.md:65-67`; aparece em todos os serviços (G `01`:69); `trim()` (G `01`:68);
"2º vez" só existe no texto de `descricaoAgenda`, sem campo próprio (G `06`:21-38, 54); serviços só
com o barbeiro de teste (G `06`:52); "qualquer barbeiro" é por profissional (G `03`:44).

**Alternatives considered**: filtro só por instrução de prompt (proibido por FR-012).

## Decision 5: múltipla escolha como lista Pro validada contra o que a Graces devolveu

**Decision**: as ferramentas que listam (serviços, barbeiros, horários, agendamentos) gravam em
`conversas.opcoes` o que ofereceram, com um id curto por opção. O modelo termina a resposta com um bloco
`OPCOES:` (`id | título`), padrão do GOLD (`workflows/shared/funil.js:504`, `giExtrairOpcoes`). O
`Compor` só aceita ids presentes em `conversas.opcoes` do contato; opção desconhecida é descartada e,
se sobrar menos de 2, a mensagem vai como texto com a pergunta aberta. A lista sai por
`POST /api/messages/whatsmeow/sendListPRO` (C `01-mensagem/api-mensagem-de-lista-pro.md:22`), corpo
`{number, openTicket, queueId, body:{Desc, ButtonText, TopText, List:[{RowId, title, desc}]}}`
(:40-65), com `openTicket` 1 e `queueId` 0 para manter o status do ticket (:71-77). Respostas
escritas e toques são interpretados pelo modelo à luz de `conversas.opcoes`; o toque chega como o
`title` da opção (:15).

**Limites**: a documentação Pro não traz limite de itens nem de tamanho (:95). Valores
`lista.max_itens` = 10 e `lista.max_titulo` = 24 são `[PROPOSTA]` (24 vem do erro Meta #131009 visto
no GOLD na API Oficial, não na Pro) e são medidos na sonda S2. Acima do limite, o `Compor` manda as
primeiras opções (já ordenadas pela ferramenta: horários mais próximos, barbeiro de preferência) e o
texto diz que há mais.

**Unknown**: o formato exato da resposta de um toque no webhook do QR Pro não está documentado
(só "o título é a resposta"). A sonda S2 captura um toque real com o `bv-captura` existente.

**Alternatives considered**: `sendInteractive`/`sections` (é da API Oficial,
`api-oficial-mensagem-de-lista.md:54, 105`, descartada); lista numerada em texto (proibida pela
constituição X).

## Decision 6: envio, digitação e a conexão com token da empresa

**Decision**: texto por `POST /api/messages/send` (C `api-mensagem-de-texto.md:17-54`, corpo
`{number, openTicket, queueId, body}`, `openTicket` "0" para não abrir ticket), digitação por
`POST /api/messages/whatsmeow/sendComposingPRO` com `{number, body:"composing", caption:""}`
(C `api-digitando-pro.md:22, 40-51`), seguida de espera proporcional e do envio. Duração:
`clamp(chars × digitando.ms_por_char, digitando.min_ms, digitando.max_ms)` com 40 ms/char, 800 ms e
4000 ms `[PROPOSTA]`. Credencial Header Auth `Authorization: Bearer …` (C `README.md:8-10`).

**Unknown bloqueante para envio real**: o token é da empresa e precisa informar a conexão em cada
chamada (C `00-introducao/estrutura-de-api.md:115`), mas nenhuma página de envio diz como
(`whatsappId` só aparece em agendamentos, APIs de conexão e `08-equipe/api-criar-usuario.md`). Sonda S1 (primeira tarefa): enviar a um
contato de teste real, por cada endpoint, com `whatsappId` = `chatmaster.whatsapp_id` (145) no corpo, e
registrar a resposta. Se nenhuma forma for aceita ou documentada, bloqueio humano (perguntar ao owner
ou usar token da conexão 145). Até lá, o caminho de envio é implementado e testado só com envio
simulado.

## Decision 7: sequência de até 4 mensagens

**Decision**: sequência desenrolada em até 4 posições fixas (IF "há mensagem i?" → digitando → Wait →
enviar → gravar saída), com tipos já usados nas fontes (`n8n-nodes-base.if`, `httpRequest` 4.2,
`wait` 1.1, `postgres` 2.5). Falha de envio numa posição interrompe as seguintes e registra a falha.
Se a sonda S0 confirmar pelo MCP do n8n (consulta de tipos de nó; medido na onda-007, ver "Resultado da sonda S0", `search_nodes` citado em GOLD `docs/specs/infra-base/research.md:54`) um nó de laço por item, ele pode
substituir o desenrolado, sem mudar o contrato.

**Rationale**: no n8n cada nó processa todos os itens antes do próximo; para "digitando → espera →
envio" por mensagem é preciso laço. O limite de 4 (FR-015) torna o desenrolado pequeno e sem tipo de
nó não verificado (Princípio XVI).

## Decision 8: idempotência por `turno_id`

**Decision**: (a) na entrada, `INSERT INTO turnos … ON CONFLICT DO NOTHING`; se o turno já existe e
está `concluido`, devolve `{ok:true}` sem efeitos; se está `em_andamento` e é mais novo que
`lock.ttl_s`, devolve falha (a recepção mantém as mensagens pendentes). (b) Cada mensagem de saída é
gravada em `mensagens` com `mensagem_id_canal = 'out-<turno_id>-<n>'` (coluna já `UNIQUE`,
`db/migrations/0001_esquema_inicial.sql:14`) **antes** do envio, por `INSERT … ON CONFLICT DO NOTHING
RETURNING`; só envia quem inseriu. (c) A execução de uma proposta é um
`UPDATE propostas SET estado='executando' WHERE id=… AND estado='pendente' RETURNING`; quem não
pega a linha não escreve. (d) `POST /agenda` leva `idIntegracao` = id da proposta (G `04`:56-69,
`05`:58).

**Rationale**: FR-018 e SC-006; o contrato da recepção já avisa do turno duplicado após `lock.ttl_s`
(`entrega-turno.md`, "Semântica de posse"). Gravar antes de enviar troca o risco de mensagem
duplicada pelo de mensagem perdida, que a contingência cobre.

## Decision 9: erros da Graces e escrita incerta

**Decision**: o `bv-graces` devolve ao agente `{ok:false, code, motivo_cliente}` e grava em
`falhas_agente` só `operacao`, `code`, `status`, `traceId` e `contato_id`. Mapa: `401 NAO_AUTENTICADO`
e `403 LOJA_FORA_ESCOPO`/`ACESSO_NEGADO` → "uma pessoa vai te ajudar" (G `00`:58-59, `05`:89-97);
`409 CONFLITO` → recarregar a grade; `400` em `horarios-livres` → dia fechado, fora da janela ou
barbeiro não faz o serviço (G `03`:43); `200 horarios:[]` → dia lotado (G `03`:42). Timeout
(`graces.timeout_ms` 15000 `[PROPOSTA]`) ou 5xx numa escrita: proposta vai a `incerta`, o
`bv-graces` consulta `GET /agenda/agendamentos?idCliente=` (G `04`:33-49) e compara serviço,
profissional e início; achou → `executada`; não achou → `falhou` e o agente oferece tentar de novo,
o que gera proposta nova (nunca repete a mesma chamada).

**Rationale**: FR-017, constituição XI; idempotência do `POST /agenda` é desconhecida
(G `README.md:63-67`, `04`:84). Decidir só por `code` (G `00`:75).

## Decision 10: TESTE contra a Graces de produção

**Decision**: em TESTE (`teste.redirecionar_escrita` = true), toda escrita de agendamento usa o barbeiro
de teste, qualquer que seja o barbeiro conversado: a proposta guarda o barbeiro escolhido (para o
texto) e o de teste (para a escrita), e a revalidação é feita no de teste. Escrita é recusada para
telefone fora de `teste.contatos_escrita`. Telefones de `teste.contatos_simulados` rodam o agente
inteiro com envio simulado (padrão GOLD `workflows/README.md:65`). A suíte cancela, no `finally`,
toda proposta `executada` que ela criou e confere que nada ficou ativo no barbeiro de teste (SC-010).
Em PROD as chaves `teste.*` não existem e a escrita usa o barbeiro escolhido.

**Rationale**: FR-024, constituição XV; a chave só funciona em produção (G `README.md:10`). Listas e
textos nunca mostram o barbeiro de teste (SC-001); só a escrita vai para ele.

**Pendências do owner** (não bloqueiam o plano; bloqueiam as tarefas que dependem delas):

- **P1 cliente de teste na Graces**: `POST /agenda/clientes` cria um cliente real em produção e não há
  endpoint de exclusão documentado (G `02`:15). Proposta: o owner autoriza criar **um** cliente de
  teste fixo, cujo `idCliente` vai para `teste.cliente_teste_id`; em TESTE, `cadastrar_cliente` e
  `identificar_cliente` de contatos de teste devolvem esse cliente sem chamar a Graces, exceto num
  roteiro único e explícito de cadastro, se o owner autorizar.
- **P2 contato de teste real** para envios reais (lista renderizada, sondas S1/S2): número de quem o
  owner indicar, em `teste.contatos_escrita`.

## Decision 11: modelo e prompt

**Decision**: `@n8n/n8n-nodes-langchain.agent` 3 com `promptType:"define"`, `text` = turno montado,
`options.systemMessage` = prompt montado em código e `maxIterations` = `agente.iteracoes_max` (6);
`@n8n/n8n-nodes-langchain.lmChatOpenAi` 1.3, `model` = `gpt-5.6-luna`, `responsesApiEnabled: true`,
`reasoningEffort` = `low` (GOLD `entregar-rajada.json:215-250`, `config/ambientes/integracao.json:52-53`).
`minimal` é recusado com 400 pelo luna (GOLD `docs/specs/estabilizar-agente/tasks.md:50`). Credencial
`openAiApi` nova, da barbearia. Prompt versionado em `workflows/shared/agente.js` (incluído por
`{{BV:INCLUDE:...}}`): parte estável primeiro (identidade de IA, regras de lista, uma pergunta,
confirmação, nunca inventar dado), depois data/hora de São Paulo, estado do pedido e histórico
marcados como dado, não instrução.

**Rationale**: mesma configuração em produção no GOLD, na mesma instância n8n 2.43.5 (GOLD
`docs/infra.md:8-9`). Parte estável no início aproveita o cache de prefixo (GOLD
`agente-mapa-mestre/research.md:7`). Latência real (SC-009) é medida na suíte.

## Decision 12: limites de saída em código

**Decision**: o `Compor` (`workflows/shared/agente.js`) aplica, depois do modelo: no máximo
`saida.max_mensagens` (4) partes de até `saida.max_chars_mensagem` (700, GOLD `funil.js:493-501`
`giDividir`); no máximo uma pergunta por parte (mantém a primeira linha com "?" e corta as seguintes, como
`giUmaPergunta` no GOLD, `funil.js:480`); troca negação de IA ("não sou robô") por nada; remove o
barbeiro de teste; converte `**x**` em `*x*`.
Guarda de fatos (LLM09, FR-005): todo horário (`HH:mm`) e valor (`R$`) citado no texto precisa
estar nas opções/pedido gravados pelo `bv-graces` naquele contato; o que não estiver é removido e, se a
parte perder o sentido, vira a pergunta aberta `textos.reformular` (padrão `giFatosSemFonte` do GOLD).

**Rationale**: FR-015 pede limite imposto na saída; SC-003.

## Decision 13: o que fica fora e vira resposta fixa

**Decision**: turno só com áudio/imagem → texto fixo pedindo que escreva (`textos.midia`); pedido de
humano → texto fixo de que uma pessoa vai retornar (`textos.humano`), sem transferir (handoff é da
`crm-etiquetas-handoff`); falha do agente/modelo → `textos.contingencia` e `falhas_agente`
(`agente|erro_modelo`), com o turno respondido `{ok:true}` para não reprocessar em laço. Textos são
`[PROPOSTA]` de redação, ajustáveis pelo owner. Perguntas sobre endereço e contatos usam
`loja.*` do config, copiados de `informacaoes_barbearia.txt` (preço e horário vêm sempre da Graces).

**Rationale**: FR-021, Edge Cases da spec, FR-005. Responder `{ok:true}` na contingência evita reenvio
da mesma contingência a cada novo turno; a falha fica registrada.

## Decision 14: geração, credenciais e deploy

**Decision**: reaproveitar `scripts/deploy-n8n.sh integracao` (placeholders `{{BV:...}}`,
`--criar NOME`, recusa de PROD sem `BV_DEPLOY_PRODUCAO_AUTORIZADO=sim` + `--confirmar-id`) e
`scripts/criar-credenciais-n8n.py`, que passa a criar também `openAiApi` (chave `OPENAI_API_KEY`),
Header Auth da Graces (`X-Api-Key`, G `00`:13) e Header Auth do Chat Master (`Authorization`), lendo
os segredos de `.env.smoke` e gravando só os ids em `credenciais.*`. Validação de cada workflow
pelo MCP do n8n: `validate_workflow` valida código do Workflow SDK, não JSON, e não se aplica aos workflows em JSON deste repositório (`docs/specs/recepcao-robustez/tasks.md:113`); a validação de fato é publicar no TESTE com `scripts/deploy-n8n.sh integracao` e conferir pelo MCP `get_workflow_details` (número de nós e `executionTimeout` iguais ao repositório, ativo, versão publicada), como fez a recepcao-robustez (constituição XII). `bv-graces` entra em
`workflows_sub` e é publicado antes de `entregar-rajada` (dependência por placeholder).

## Decision 15: testes

**Decision**: (a) `node tests/agente.test.js` para as funções puras de `agente.js` (compor, dividir,
uma pergunta, opções, filtros, recência, duração de digitação); (b) testes estáticos em
`tests/test_workflows_agente.py` (sem credencial literal, filtro do id de teste presente, escrita só
via proposta, ids por placeholder); (c) `scripts/smoke-agente.py` no TESTE: roteiros das US1–US7
contra o `bv-recepcao` de TESTE com contatos simulados, asserções determinísticas sobre `mensagens`
(saída), `propostas`, `falhas_agente` e a agenda do barbeiro de teste, com limpeza no `finally`
(cancelar o que criou, limpar Postgres/Redis de TESTE como o `smoke-recepcao.py`). Sem juiz LLM nesta
feature: as SC são verificáveis por asserção. Um roteiro por vez (marcador de rodada, lição do GOLD
`docs/specs/estabilizar-agente/rodadas.md:17`).

## Decision 16: tempo do turno

**Decision**: o turno precisa caber em `lock.ttl_s` (120 s). Orçamento `[PROPOSTA]` a medir:
primeira resposta em até 20 s (SC-009); 4 mensagens com digitação máxima somam até 16 s. Se a suíte
medir turnos acima de 90 s, a tarefa abre pedido ao owner para aumentar `lock.ttl_s`, como prevê o
contrato de entrega.

## Decision 17: segurança do agente (gate owasp-security, pós-plan)

**Decision**: (a) SQL só parametrizado (`$1…` / `queryReplacement`), nunca texto do cliente ou do
modelo concatenado; (b) ferramentas só alcançam dados do telefone do turno (entradas fixas; opções
resolvidas por id curto; sem `GET /agenda/completa`), o que limita o efeito de injeção de prompt ao
próprio cliente; (c) `cadastrar_cliente` no máximo 1 vez por sessão do contato; (d) teto de consumo
`agente.turnos_max_contato_hora` (20 `[PROPOSTA]`): acima dele o turno recebe `textos.humano` sem
chamar o modelo e registra `agente|teto_turnos` (LLM10; a cota da OpenAI já se esgotou no GOLD);
(e) prompt sem segredo nem dado de outro cliente (LLM07); histórico e estado vão marcados como dado.

## Resultado da sonda S0 (onda-007, 2026-10-18)

As tools `mcp__claude_ai_n8n__*` não estavam disponíveis ao orquestrador desta onda. Medição feita por leitura (somente leitura) dos fontes do pacote instalado na stack `n8n` (`docker exec n8n-n8n-1`, n8n 2.43.5), em `/usr/local/lib/node_modules/n8n/node_modules/@n8n/n8n-nodes-langchain/dist/nodes`:

| Tipo | Versões encontradas | Fonte |
|------|---------------------|-------|
| `@n8n/n8n-nodes-langchain.agent` | 3 e 3.1 (`defaultVersion: 3.1`) | `agents/Agent/V3/AgentV3.node.js` (`version: [3, 3.1]`), `agents/Agent/Agent.node.js` |
| `@n8n/n8n-nodes-langchain.lmChatOpenAi` | 1, 1.1, 1.2, 1.3 | `llms/LMChatOpenAi/LmChatOpenAi.node.js` (`version: [1, 1.1, 1.2, 1.3]`) |
| `@n8n/n8n-nodes-langchain.toolWorkflow` | 2.2 existe (`defaultVersion: 2.2`; pastas v1 e v2) | `tools/ToolWorkflow/ToolWorkflow.node.js` |

Nome real da tool de consulta MCP: `get_node_types` (e `search_nodes`) segue a nomenclatura citada em GOLD `docs/specs/infra-base/research.md:54`; nesta onda não foi invocada, e a conferência equivalente foi a leitura acima. Todas as versões exigidas (agent 3, lmChatOpenAi 1.3, toolWorkflow 2.2) existem; nenhum bloqueio. Pendente (não medido): aceitação do modelo `gpt-5.6-luna` pelo campo de modelo do `lmChatOpenAi` (vem de lista/ID livre da OpenAI; validar no smoke da fase 7).
