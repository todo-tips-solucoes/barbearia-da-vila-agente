# Feature Specification: Agente conversacional de atendimento com a Graces

**Feature**: `agente-conversacional-graces`
**Created**: 2026-10-18
**Status**: Draft
**Depende de**: `recepcao-buffer` e `recepcao-robustez` (entrega do turno), `infra-base`
**Origem**: roadmap (feature 3), `docs/decisoes-pre-00c.md`, constituição 2.0.0 (princípios IX–XVI) e feedback do dono em `alteracoes_clientes/transcricoes.md`.
**Escopo de ambiente**: somente TESTE; PROD fica parametrizado e inativo (decisão do owner).

> Decisões de infraestrutura: N/A além do já entregue por `infra-base`/`recepcao-*` (esta feature não cria agendador, rotação de chave nem backup). Idempotência é tratada em FR-018.

## User Scenarios & Testing

### User Story 1 - Conversar e agendar um serviço (Priority: P1)

O cliente escreve pelo WhatsApp ("oi, queria marcar um corte") e o assistente virtual da barbearia, que se apresenta como IA, conduz a conversa até um agendamento confirmado na Graces: reconhece o cliente pelo número (ou cadastra, pedindo o nome), entende o serviço, pergunta se há preferência de barbeiro, entende o dia ("amanhã", "sábado"), oferece horários livres e só agenda depois do "sim" explícito.

**Why this priority**: é o núcleo do produto; sem agendar não há atendimento.

**Independent Test**: roteiro de conversa no TESTE com o barbeiro de teste, do "oi" à confirmação; conferir o agendamento na Graces e cancelá-lo ao final.

**Acceptance Scenarios**:

1. **Given** um número já cadastrado na Graces, **When** o cliente pede um serviço, **Then** o assistente o cumprimenta pelo nome cadastrado e segue sem pedir de novo o que já sabe.
2. **Given** um número não cadastrado, **When** o cliente quer agendar, **Then** o assistente pede o nome, cadastra o cliente e segue o fluxo.
3. **Given** serviço, barbeiro e dia definidos, **When** o assistente oferece horários, **Then** todos os horários oferecidos vieram da consulta de horários livres feita naquela conversa.
4. **Given** o resumo (serviço, barbeiro, dia, hora, valor), **When** o cliente responde "sim", **Then** o horário é revalidado e o agendamento é criado; se o horário foi tomado nesse meio-tempo, o assistente avisa e oferece outras opções.
5. **Given** o cliente ainda não confirmou, **When** a conversa segue, **Then** nada é criado na Graces.
6. **Given** vários clientes com o mesmo celular (ex.: pai e filho), **When** o cliente se identifica, **Then** o assistente pergunta para quem é o atendimento.

---

### User Story 2 - Escolhas por botão de lista com texto humano (Priority: P1)

Sempre que o assistente oferece opções (serviços, barbeiros, horários, qual agendamento mexer), envia uma mensagem de lista com botão, acompanhada de um texto curto e humano. O cliente pode tocar na opção ou simplesmente escrever ("quero com o Pedro", "o das 15h"), e o assistente entende do mesmo jeito.

**Why this priority**: regra explícita do owner (constituição X); define a experiência de toda escolha.

**Independent Test**: provocar cada tipo de escolha e verificar o envio de lista com texto; repetir respondendo em texto livre.

**Acceptance Scenarios**:

1. **Given** o assistente precisa que o cliente escolha entre opções, **When** envia a pergunta, **Then** vai como mensagem de lista com texto humano, nunca como lista numerada em texto puro.
2. **Given** uma lista enviada, **When** o cliente responde escrevendo a opção em palavras próprias, **Then** o assistente a reconhece e segue.
3. **Given** a resposta escrita é ambígua ou não bate com nenhuma opção, **When** isso ocorre, **Then** o assistente pergunta de novo de forma natural, sem inventar a escolha.
4. **Given** o cliente toca numa opção da lista, **When** a resposta chega, **Then** o assistente a trata como a escolha do cliente.
5. **Given** o canal limita a quantidade de itens de uma lista, **When** há mais opções que o limite, **Then** o assistente oferece o subconjunto mais útil e diz que há mais.

---

### User Story 3 - Cancelar sugerindo remarcar, e reagendar (Priority: P1)

Ao ouvir "quero cancelar", o assistente lista os próximos agendamentos do cliente, pergunta qual e **sempre sugere remarcar** antes de cancelar. Só cancela após confirmação explícita. Reagendar mantém serviço e duração, troca dia/hora (e barbeiro, se o cliente quiser), com confirmação "de X para Y". Depois de cancelar, "vamos marcar outro" inicia um agendamento novo, usando o contexto da conversa.

**Why this priority**: feedback direto do dono; cancelar e remarcar são metade do uso da agenda.

**Independent Test**: criar agendamento de teste, pedir cancelamento, verificar a sugestão de remarcar, aceitar remarcação e depois cancelar; repetir recusando a remarcação.

**Acceptance Scenarios**:

1. **Given** o cliente pede para cancelar, **When** o assistente responde, **Then** pergunta qual agendamento (se houver mais de um) e oferece remarcar antes de qualquer cancelamento.
2. **Given** o cliente recusa remarcar e confirma, **When** o assistente cancela, **Then** o horário é liberado na Graces e o assistente confirma, oferecendo marcar outro quando quiser.
3. **Given** o cliente acabou de cancelar, **When** diz "vamos marcar outro horário", **Then** o assistente inicia um agendamento reaproveitando o que já sabe (serviço, barbeiro de preferência), sem dizer que não encontrou agendamento.
4. **Given** o cliente aceita remarcar, **When** escolhe novo horário e confirma "de X para Y", **Then** o agendamento é movido preservando serviço e duração.
5. **Given** o cliente quer trocar de serviço, **When** pede, **Then** o assistente explica que é cancelar e criar outro e pede uma única confirmação para os dois passos.
6. **Given** o cliente não tem agendamentos futuros, **When** pede cancelar ou reagendar, **Then** o assistente informa isso e oferece marcar um novo.

---

### User Story 4 - Tom humano, cadência de pessoa e identidade de IA (Priority: P2)

O assistente se apresenta como assistente virtual (IA) da Barbearia da Vila, com tom caloroso e natural. Responde com até 4 mensagens curtas, com "digitando…" proporcional ao tamanho de cada mensagem, no máximo uma pergunta por mensagem, enviadas pelo Chat Master pela conexão do ambiente.

**Why this priority**: diferencial de produto e queixa do dono sobre chatbot impessoal; depende das histórias P1 para ter o que dizer.

**Independent Test**: conversar e medir número, tamanho e perguntas por mensagem, e conferir a indicação de digitação antes de cada envio.

**Acceptance Scenarios**:

1. **Given** qualquer turno, **When** o assistente responde, **Then** envia no máximo 4 mensagens, cada uma curta, com no máximo uma pergunta.
2. **Given** várias mensagens a enviar, **When** são enviadas em sequência, **Then** cada uma é precedida por "digitando…" de duração proporcional ao seu tamanho, e a ordem é preservada.
3. **Given** o cliente pergunta "você é um robô?", **When** o assistente responde, **Then** assume que é IA, sem negar nem evitar.
4. **Given** a resposta do modelo excede 4 mensagens ou tem várias perguntas, **When** vai ser enviada, **Then** é condensada para respeitar os limites.

---

### User Story 5 - Um "Oi" não retoma coleta antiga (Priority: P2)

Quando o cliente volta depois de um tempo e manda só "Oi", o assistente cumprimenta e pergunta como ajudar, sem retomar uma coleta de agendamento abandonada. Só continua o fluxo antigo se o cliente pedir ou se a conversa anterior for recente e o novo texto for continuação evidente.

**Why this priority**: bug observado na versão anterior; afeta a primeira impressão.

**Independent Test**: deixar um agendamento pela metade, esperar além da janela de recência, mandar "Oi".

**Acceptance Scenarios**:

1. **Given** uma coleta abandonada há mais que a janela de recência, **When** o cliente manda só "Oi", **Then** o assistente recomeça com uma saudação e pergunta aberta.
2. **Given** a coleta abandonada, **When** o cliente diz "quero marcar hoje" ou algo que inicia um pedido novo, **Then** o assistente trata como pedido novo, sem exigir dados antigos.
3. **Given** conversa em andamento e recente, **When** o cliente responde a uma pergunta pendente, **Then** o assistente continua normalmente.

---

### User Story 6 - Nunca expor o barbeiro de teste (Priority: P1)

O barbeiro de teste (nome com "TESTE", id `1cee0bb9-e58b-4428-9e9b-1db184db7943`) nunca aparece em listas, sugestões, textos nem agendamentos de clientes reais.

**Why this priority**: regra inegociável (constituição IX); a versão anterior o exibia a clientes.

**Independent Test**: pedir barbeiros e horários de todos os serviços e inspecionar listas, textos e a consulta de horários feita pelo assistente.

**Acceptance Scenarios**:

1. **Given** a Graces devolve o barbeiro de teste entre os profissionais, **When** o assistente monta qualquer lista ou texto, **Then** ele não aparece.
2. **Given** o cliente pede o barbeiro de teste pelo nome, **When** o assistente responde, **Then** age como se não existisse e não agenda com ele.
3. **Given** o cliente aceita "qualquer barbeiro", **When** o assistente busca horários, **Then** o barbeiro de teste não entra na busca nem nas ofertas.
4. **Given** uma execução de teste automatizado, **When** a suíte precisa agendar, **Then** o barbeiro de teste é usado somente por mecanismo explícito do teste, nunca por conversa de cliente real.

---

### User Story 7 - Erros e indisponibilidades sem estrago (Priority: P2)

Quando a Graces falha, demora ou recusa, o assistente trata pelo código de erro, explica em linguagem simples, oferece alternativa ou encaminha para uma pessoa; nunca repete uma escrita às cegas.

**Why this priority**: protege a agenda real contra duplicidade e o cliente contra respostas confusas.

**Independent Test**: simular cada família de erro e timeout em uma escrita e verificar a mensagem e a ausência de repetição.

**Acceptance Scenarios**:

1. **Given** a Graces responde que o horário está lotado ou fora do funcionamento, **When** o assistente informa, **Then** sugere outro dia ou barbeiro.
2. **Given** timeout ou erro de servidor numa escrita, **When** o assistente reage, **Then** consulta os agendamentos para saber se a escrita foi aplicada antes de qualquer nova tentativa.
3. **Given** falha de configuração (chave recusada, loja fora de escopo), **When** ocorre, **Then** o assistente diz ao cliente que uma pessoa vai ajudar e a falha fica registrada sem expor detalhes técnicos.
4. **Given** o assistente não consegue concluir o turno (falha do modelo, por exemplo), **When** o turno termina, **Then** o cliente recebe uma resposta curta de contingência e o turno não fica silencioso.

---

### Edge Cases

- Turno com várias mensagens juntadas (rajada): o assistente responde ao conjunto, não a cada mensagem.
- Turno repetido pela recepção após expirar a posse (mesmo `turno_id`): efeitos não se repetem, nem resposta duplicada nem escrita duplicada.
- Cliente muda de ideia no meio ("na verdade, sábado"): usa o dado novo sem recomeçar.
- Serviço citado de forma informal ("corte e barba"): ligado ao serviço da Graces por comparação sem acento/caixa; na dúvida, lista de opções.
- Serviço cujos barbeiros são só o de teste, ou sem barbeiro real: não é oferecido.
- Serviços "2ª vez": nunca oferecidos nem agendados.
- Data no passado, fora do prazo ou loja fechada: o assistente explica e sugere outra data.
- Mensagem de áudio ou imagem: tratamento completo é da feature `audio-imagem`; aqui, resposta natural pedindo que o cliente escreva.
- Pergunta fora do escopo (preço, endereço, assunto alheio): responde só com dados vindos da Graces ou da configuração da loja; do contrário diz que não sabe e oferece chamar uma pessoa.
- Cliente pede para falar com humano: o handoff completo é da feature `crm-etiquetas-handoff`; aqui, o assistente reconhece o pedido e informa que uma pessoa dará retorno.
- Falha ao enviar uma das mensagens de uma sequência: as seguintes não são enviadas fora de ordem e a falha é registrada.
- Implantação dos workflows no TESTE pela API REST do n8n com as credenciais do `.env.n8n`: o resultado é validado pelo MCP do n8n, e uma implantação que alteraria PROD é recusada.

## Requirements

### Functional Requirements

- **FR-001**: O sistema MUST substituir o stub `entregar-rajada` da recepção por um fluxo conversacional que recebe o turno no mesmo contrato de entrada e saída já definido pela recepção (turno com itens em ordem, retorno de sucesso só quando o turno foi tratado).
- **FR-002**: O sistema MUST usar um nó AI Agent do n8n (não o Agent de primeira classe) com o modelo `gpt-5.6-luna` e credencial própria da barbearia, e as operações da Graces expostas como sub-workflows usados como ferramentas.
- **FR-003**: O sistema MUST oferecer ferramentas para: identificar cliente pelo celular, cadastrar cliente, listar serviços, listar barbeiros de um serviço, consultar horários livres, listar agendamentos futuros do cliente, agendar, reagendar e cancelar.
- **FR-004**: O sistema MUST identificar o cliente pelo número do remetente antes de qualquer agendamento, tratar 0, 1 e vários resultados conforme o fluxo documentado em `graces-api/05-fluxos-do-agente.md`, e cadastrar pedindo o nome quando não existir.
- **FR-005**: O sistema MUST oferecer apenas horários, serviços, barbeiros e preços obtidos da Graces na própria conversa; MUST NOT usar `informacaoes_barbearia.txt` para sobrepor a Graces.
- **FR-006**: O sistema MUST revalidar o horário na Graces imediatamente antes de criar ou mover um agendamento.
- **FR-007**: O sistema MUST obter confirmação explícita do cliente, com resumo (serviço, barbeiro, dia, hora, valor), antes de agendar, reagendar ou cancelar; as ferramentas de escrita MUST rejeitar chamada sem a confirmação registrada no turno.
- **FR-008**: Toda múltipla escolha oferecida ao cliente MUST ser enviada como mensagem de lista da biblioteca Pro do Chat Master, acompanhada de texto curto e humano; respostas escritas livres MUST ser entendidas como escolha equivalente.
- **FR-009**: O sistema MUST sugerir remarcar toda vez que o cliente pedir cancelamento, antes de cancelar.
- **FR-010**: O sistema MUST usar o contexto da conversa para continuar um pedido (ex.: "vamos marcar outro" logo após cancelar) reaproveitando serviço e preferência já ditos.
- **FR-011**: O sistema MUST NOT retomar uma coleta antiga a partir de um "Oi" ou saudação isolada quando a atividade anterior estiver fora da janela de recência. [NEEDS CLARIFICATION: qual a janela de recência a partir da qual uma coleta é considerada antiga? Default adotado até resposta: 2 horas sem mensagem, alinhado ao follow-up de 2 h do roadmap.]
- **FR-012**: O sistema MUST NOT expor, listar, sugerir nem agendar com o barbeiro de teste (identificado pelo id fixo e por "TESTE" no nome), e MUST filtrá-lo antes de os dados chegarem ao modelo, não apenas por instrução de prompt.
- **FR-013**: O sistema MUST NOT oferecer nem agendar serviços "2ª vez".
- **FR-014**: O sistema MUST assumir que é IA (assistente virtual da Barbearia da Vila) com tom humanizado, e MUST responder com verdade se perguntado.
- **FR-015**: O sistema MUST limitar cada resposta a no máximo 4 mensagens curtas, com no máximo uma pergunta por mensagem, e MUST impor esse limite na saída (condensando ou truncando), não só no prompt.
- **FR-016**: O sistema MUST enviar as respostas pelo Chat Master, pela conexão do ambiente (parametrizada), em ordem, com indicação "digitando…" de duração proporcional ao tamanho de cada mensagem antes de cada envio.
- **FR-017**: O sistema MUST tratar erros da Graces pelo campo `code`, MUST registrar `code` e `traceId` sem dados pessoais, e MUST NOT repetir escrita às cegas após timeout ou erro 5xx: antes de nova tentativa MUST consultar os agendamentos para verificar se a escrita foi aplicada.
- **FR-018**: O sistema MUST tratar `turno_id` como chave de idempotência: um turno já tratado MUST NOT reenviar resposta nem repetir escrita na Graces.
- **FR-019**: O sistema MUST manter, por contato, o histórico recente da conversa e o estado do pedido em andamento (serviço, barbeiro, dia), suficiente para FR-010 e FR-011, persistidos no banco do ambiente, guardando apenas o necessário (LGPD).
- **FR-020**: O sistema MUST mostrar ao cliente somente dados dele; MUST NOT usar consultas que tragam dados de outros clientes.
- **FR-021**: O sistema MUST, quando o turno não puder ser concluído, enviar uma resposta curta de contingência e registrar a falha, sem silêncio e sem expor detalhes técnicos.
- **FR-022**: O sistema MUST manter a chave da Graces, a chave da OpenAI e o token do Chat Master apenas em credenciais do n8n e `.env` fora do repositório, nunca em prompt, log ou workflow versionado.
- **FR-023**: Nesta feature o sistema MUST agendar sempre como avulso, com o serviço escolhido; uso de pacote, agendamento para terceiros, encadeamento de vários serviços e oferta de todos os inícios possíveis ficam com `regras-negocio-agenda`, áudio e imagem com `audio-imagem`, CRM/etiquetas/handoff com `crm-etiquetas-handoff`.
- **FR-024**: Testes que escrevem na Graces MUST usar somente o barbeiro de teste e MUST cancelar tudo o que criarem, inclusive em caso de falha do teste; envios de WhatsApp em teste MUST ir apenas a contatos de teste.
- **FR-025**: Os workflows MUST ser gerados e implantados no TESTE pela API REST do n8n com as credenciais do `.env.n8n` (como no projeto de referência), validados pelo MCP do n8n, com ids e parâmetros de ambiente injetados, sem alterar PROD.

### Key Entities

- **Contato/Conversa**: pessoa identificada pelo número, com histórico recente de mensagens e estado do pedido em andamento (serviço, barbeiro, data, etapa), e marca de última atividade.
- **Turno**: conjunto de mensagens agrupadas pela recepção, identificado por `turno_id`, com estado de tratado/não tratado.
- **Cliente (Graces)**: identificado por `idCliente`, com nome e celular; pode haver vários por celular.
- **Agendamento (Graces)**: serviço, barbeiro, início e duração; pode ser criado, movido ou cancelado.
- **Opção de escolha**: item de uma mensagem de lista (serviço, barbeiro, horário, agendamento) com texto visível e identificador devolvido na resposta.
- **Registro de falha**: tipo, momento, `code`/`traceId` da Graces ou do canal, sem conteúdo pessoal.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Em 100% dos roteiros da suíte de aceite, nenhuma lista, texto ou agendamento contém o barbeiro de teste.
- **SC-002**: Em 100% dos roteiros, nenhum agendamento, reagendamento ou cancelamento é executado sem confirmação explícita anterior do cliente.
- **SC-003**: Em 100% das respostas, o número de mensagens é no máximo 4 e cada mensagem tem no máximo uma pergunta.
- **SC-004**: Em 100% das escolhas múltiplas dos roteiros, a oferta sai como mensagem de lista; e em 100% dos casos em que o cliente responde por escrito, a escolha é reconhecida corretamente.
- **SC-005**: Em 100% dos pedidos de cancelamento dos roteiros, a sugestão de remarcar aparece antes da execução.
- **SC-006**: Um turno repetido com o mesmo identificador gera 0 respostas duplicadas e 0 escritas duplicadas na Graces.
- **SC-007**: Um "Oi" após inatividade superior à janela de recência nunca retoma coleta antiga em 100% dos roteiros.
- **SC-008**: Um cliente conhecido conclui um agendamento em até 8 trocas de mensagem do cliente, nos roteiros-padrão.
- **SC-009**: Do fim do turno de entrada ao envio da primeira mensagem de resposta, o tempo é de até 20 s em 90% dos turnos do TESTE, medido sobre os roteiros (dentro do tempo de posse do contato definido pela recepção).
- **SC-010**: Ao fim de cada execução da suíte, 0 agendamentos de teste permanecem ativos na Graces.
