# Feature Specification: Mensagens agendadas (confirmação, lembrete e pós-atendimento)

**Feature**: `mensagens-agendadas`
**Created**: 2026-10-20
**Status**: Draft
**Depende de**: `regras-negocio-agenda`, `agente-conversacional-graces`, `infra-base`, `recepcao-buffer`
**Origem**: roadmap item 6 e `docs/decisoes-pre-00c.md` (seção "Mensagens agendadas").
**Escopo de ambiente**: somente TESTE (conexão 145, banco `_teste`). PROD segue parametrizado e inativo.

## User Scenarios & Testing

### User Story 1 - Cliente que agendou recebe confirmação na véspera, lembrete e agradecimento (Priority: P1)

Quando o agente agenda um serviço na Graces, o cliente passa a receber, sem fazer nada, três mensagens no WhatsApp: a confirmação na véspera às 18:00, o lembrete 2 h antes do horário e o pós-atendimento 1 h depois do término.

**Why this priority**: reduz faltas e é item do MVP.

**Independent Test**: agendar, pelo número de teste 5511967296849, um serviço com o barbeiro de teste; verificar que as três mensagens ficam registradas com os horários corretos e, ao chegar a hora, são entregues uma única vez.

**Acceptance Scenarios**:

1. **Given** um agendamento confirmado na Graces para o dia seguinte, **When** o agente conclui o agendamento, **Then** existem três mensagens programadas (confirmação, lembrete, pós-atendimento) com os horários: véspera 18:00, início menos 2 h, término mais 1 h, no fuso de São Paulo.
2. **Given** o mesmo agendamento processado duas vezes (reentrega de evento), **When** a programação roda de novo, **Then** continuam exatamente três mensagens, sem duplicar.
3. **Given** um agendamento feito para o mesmo dia, **When** algum dos horários calculados já passou, **Then** a mensagem cujo horário passou não é programada (nada é enviado em atraso) e as demais seguem.
4. **Given** um agendamento com vários serviços encadeados, **When** a programação é feita, **Then** cada agendamento da Graces tem o seu conjunto próprio de mensagens, e o pós-atendimento usa o término do respectivo serviço.
5. **Given** a confirmação programada, **When** o cliente a recebe, **Then** o texto é humanizado, cita serviço, barbeiro, dia e hora e traz um botão de resposta rápida para confirmar presença.
6. **Given** a falha do canal ao programar uma mensagem, **When** o agendamento já está feito na Graces, **Then** o agendamento é mantido, a falha é registrada sem dados pessoais e há nova tentativa; o cliente nunca é informado de erro técnico.

---

### User Story 2 - Resposta ao botão de confirmação atualiza a Graces (Priority: P1)

O cliente toca no botão da confirmação. A resposta vira a confirmação (ou a não confirmação) do agendamento na Graces, e o agente responde com naturalidade.

**Why this priority**: sem isso a confirmação não tem efeito na agenda da loja.

**Independent Test**: do número de teste, tocar o botão da confirmação de um agendamento do barbeiro de teste; conferir o estado na Graces e a resposta recebida; cancelar o agendamento ao fim.

**Acceptance Scenarios**:

1. **Given** a confirmação enviada para um agendamento pendente de confirmação, **When** o cliente toca em "confirmar", **Then** o agendamento fica confirmado na Graces e o cliente recebe um agradecimento breve.
2. **Given** a mesma confirmação, **When** o cliente toca em "não vou poder", **Then** o agendamento é marcado como não confirmado na Graces, o horário NÃO é liberado e o agente oferece remarcar ou cancelar, conduzindo a conversa normal.
3. **Given** o cliente já confirmou, **When** toca no botão de novo, **Then** nada é alterado na Graces e a resposta é cordial, sem repetir a confirmação.
4. **Given** o agendamento já foi cancelado ou remarcado, **When** o cliente toca em botão de uma confirmação antiga, **Then** a Graces não é alterada e o agente explica com naturalidade a situação atual.
5. **Given** o cliente responde por texto livre ("vou sim", "não consigo") em vez de tocar, **When** a mensagem chega logo após a confirmação, **Then** é tratada com o mesmo efeito do botão correspondente.
6. **Given** a Graces recusa a confirmação (agendamento fora do estado que admite confirmar), **When** o cliente toca, **Then** o cliente recebe resposta natural sem erro técnico e a falha é registrada.

---

### User Story 3 - Cancelar apaga e reagendar recria as mensagens (Priority: P1)

Quando o agendamento é cancelado, as mensagens pendentes deixam de existir; quando é reagendado, as antigas são apagadas e novas são criadas para o novo horário.

**Why this priority**: mensagem de lembrete de um horário que não existe mais é um defeito grave de atendimento.

**Independent Test**: agendar, reagendar e cancelar com o barbeiro de teste, conferindo a cada passo o conjunto de mensagens programadas.

**Acceptance Scenarios**:

1. **Given** um agendamento com três mensagens pendentes, **When** o cliente cancela, **Then** as três são apagadas no canal e marcadas como canceladas no registro local.
2. **Given** um agendamento com mensagens pendentes, **When** é reagendado, **Then** as antigas são apagadas e três novas são criadas com base no novo horário, sem sobrar nenhuma antiga.
3. **Given** uma mensagem já enviada, **When** o agendamento é cancelado ou reagendado, **Then** a mensagem enviada permanece registrada como enviada e só as pendentes são apagadas.
4. **Given** a mensagem já não existe no canal (apagada à mão ou já enviada), **When** a exclusão é tentada, **Then** isso é tratado como sucesso e o registro local é atualizado.
5. **Given** a falha ao apagar no canal, **When** o cancelamento já foi feito na Graces, **Then** o cancelamento é mantido, a exclusão fica pendente de nova tentativa e a mensagem não é enviada ao cliente (a exclusão é conferida antes do envio quando possível; ver Edge Cases).
6. **Given** um cancelamento ou reagendamento feito diretamente na Graces pela equipe, **When** o conjunto de mensagens fica divergente da agenda, **Then** uma verificação periódica corrige a divergência (apaga as órfãs, cria as faltantes).

---

### User Story 4 - Rastreabilidade e segurança de testes (Priority: P2)

Cada mensagem programada fica registrada localmente (tipo, horário previsto, agendamento da Graces, identificador no canal, situação), e os testes não alcançam clientes reais.

**Why this priority**: sustenta apagar/recriar com confiabilidade e protege clientes reais.

**Independent Test**: consultar o registro após cada operação da US1 e US3; tentar programar para um número fora da lista liberada.

**Acceptance Scenarios**:

1. **Given** qualquer mensagem programada, **When** consultado o registro, **Then** consta tipo, horário previsto, agendamento da Graces, identificador no canal e situação (pendente, enviada ou cancelada).
2. **Given** ambiente TESTE com a lista de contatos liberados para escrita vazia, **When** o agente agenda para um contato de teste simulado, **Then** nada é programado no canal e o motivo fica registrado.
3. **Given** o número liberado do owner, **When** o teste programa mensagens, **Then** somente esse número é destinatário e tudo o que for criado é apagado ao fim do teste.
4. **Given** agendamento do barbeiro de teste, **When** qualquer teste confirma/cancela na Graces, **Then** nenhum agendamento de outro barbeiro é tocado.

---

### Edge Cases

- Agendamento marcado com menos de 2 h de antecedência: sem lembrete; sem confirmação se a véspera 18:00 já passou.
- Agendamento para o dia seguinte antes das 18:00 do dia atual: a confirmação ainda é programada para as 18:00 de hoje.
- Cliente sem contato cadastrado no canal: a mensagem não é programada, o motivo é registrado e o agendamento segue.
- O cliente já cancelou pelo atendimento humano na Graces: a verificação periódica apaga as pendentes.
- O botão tocado depois do horário do atendimento: nenhuma alteração na Graces, resposta cordial.
- Envio de mensagem programada que o canal recusa (conexão fora do ar): situação continua pendente com registro da falha; sem reenvio duplicado.
- Cliente que responde "não vou poder" e depois pede para remarcar: segue o fluxo normal de reagendar, que recria as mensagens.
- Duas confirmações pendentes do mesmo cliente (dois serviços): a resposta é associada ao agendamento a que o botão pertence, nunca ao outro.
- Mudança de horário de verão ou virada de dia/mês no cálculo dos horários: sempre no horário local de São Paulo.

## Requirements

### Functional Requirements

- **FR-001**: O sistema MUST programar, ao concluir um agendamento na Graces, as mensagens de confirmação (véspera às 18:00), lembrete (2 h antes do início) e pós-atendimento (1 h após o término), no fuso de São Paulo, por agendamento da Graces.
- **FR-002**: A programação MUST ser idempotente por agendamento e tipo: reprocessar o mesmo agendamento não duplica mensagens.
- **FR-003**: O sistema MUST NOT programar mensagem cujo horário calculado já passou, registrando o motivo.
- **FR-004**: As mensagens MUST ser enviadas pela conexão 145 em nome do usuário "Agente IA" (id 100), com texto humanizado em português do Brasil, citando serviço, barbeiro, dia e hora.
- **FR-005**: A confirmação MUST oferecer ao cliente botão de resposta rápida com duas opções ("confirmar" e "não vou poder"); o mecanismo exato de entrega do botão MUST ser determinado empiricamente no plano (mensagem agendada com botão, ou envio do botão no horário a partir do registro local) sem alterar o comportamento observado pelo cliente.
- **FR-006**: A resposta "confirmar" MUST confirmar o agendamento na Graces; a resposta "não vou poder" MUST marcá-lo como não confirmado sem liberar o horário e iniciar a oferta de remarcar ou cancelar.
- **FR-007**: A resposta MUST ser vinculada ao agendamento da Graces a que a confirmação pertence, inclusive com mais de um agendamento pendente do mesmo cliente.
- **FR-008**: Resposta repetida, ou a agendamento já confirmado, cancelado, remarcado ou encerrado, MUST NOT alterar a Graces e MUST receber resposta cordial sem erro técnico.
- **FR-009**: Resposta em texto livre equivalente ao botão, enviada logo após a confirmação, MUST ter o mesmo efeito do botão.
- **FR-010**: Ao cancelar um agendamento, o sistema MUST apagar no canal todas as mensagens pendentes dele e marcá-las como canceladas.
- **FR-011**: Ao reagendar, o sistema MUST apagar as pendentes antigas e criar o conjunto novo para o novo horário, sem deixar mensagem antiga pendente.
- **FR-012**: Mensagens já enviadas MUST permanecer registradas como enviadas; apenas pendentes são apagadas.
- **FR-013**: Exclusão de mensagem inexistente no canal MUST ser tratada como sucesso.
- **FR-014**: Cada mensagem programada MUST ser registrada localmente com tipo, horário previsto, agendamento da Graces, identificador no canal e situação.
- **FR-015**: Falhas do canal ou da Graces nesta funcionalidade MUST NOT desfazer o agendamento/cancelamento já feito na Graces, MUST ser registradas sem dados pessoais e MUST ter nova tentativa limitada; o cliente nunca recebe erro técnico.
- **FR-016**: Uma verificação periódica MUST reconciliar mensagens programadas com a agenda: apagar órfãs de agendamentos cancelados/remarcados fora do agente e criar as faltantes dos futuros, sem duplicar.
- **FR-017**: Contato sem cadastro no canal MUST NOT impedir o agendamento; a mensagem não é programada e o motivo é registrado.
- **FR-018**: Em TESTE, o sistema MUST respeitar a lista de contatos liberados para escrita; fora dela nada é programado nem enviado. Testes reais MUST usar apenas o número do owner, o barbeiro de teste, e MUST apagar/cancelar tudo o que criarem.
- **FR-019**: O evento de resposta ao botão MUST ser recebido pela recepção existente sem prejudicar o fluxo de mensagens normais (buffer, áudio, imagem, listas).
- **FR-020**: Os horários, textos, identificadores de conexão e usuário MUST ser parametrizados por ambiente, sem valores fixos que prendam o fluxo a TESTE.
- **FR-021**: Os registros MUST NOT guardar texto de mensagens do cliente além do necessário e MUST obedecer à política de dados já vigente do projeto.

> Decisões de infraestrutura: FR-INFRA-SCHED — o envio no horário é feito pelo módulo de agendamento do Chat Master (e, se o plano adotar o fallback do FR-005, por um workflow agendado de varredura com intervalo de 1 min, sem duplicar envios); FR-INFRA-IDEMP — chave (agendamento da Graces, tipo) já garantida no registro local (FR-002); demais itens de infraestrutura: N/A (sem criptografia, tokens com TTL ou multi-réplica novos).

### Key Entities

- **Mensagem agendada**: tipo (confirmação, lembrete, pós-atendimento), horário previsto, agendamento da Graces, identificador no canal, situação (pendente, enviada, cancelada), contato.
- **Agendamento da Graces**: serviço, barbeiro, início, término e estado de confirmação; fonte da verdade.
- **Resposta ao botão**: evento do cliente ao tocar na confirmação, vinculado a um agendamento.

## Success Criteria

### Measurable Outcomes

- **SC-001**: 100% dos agendamentos concluídos pelo agente com horários futuros válidos têm as mensagens correspondentes programadas, sem duplicatas, nos testes.
- **SC-002**: 100% dos cancelamentos e reagendamentos feitos pelo agente deixam zero mensagens antigas pendentes.
- **SC-003**: A resposta ao botão atualiza a Graces em até 30 segundos em 95% dos casos de teste.
- **SC-004**: Zero mensagens enviadas a números fora da lista liberada; zero agendamentos de barbeiros reais alterados nos testes.
- **SC-005**: Zero mensagens de erro técnico recebidas pelo cliente em todos os cenários de falha simulados.
- **SC-006**: A verificação periódica corrige 100% das divergências plantadas (órfã e faltante) em até um ciclo.
- **SC-007**: Nenhuma mensagem é enviada em duplicidade em 100% dos cenários de reprocessamento.

## Delta Requirements

**Skip**: funcionalidade puramente nova, sem comportamento ativo em `docs/specs/current/` — agente, 2026-10-20

## Clarifications

### Session 2026-10-20

- Q: O botão Quick Reply cabe numa mensagem agendada do canal QR Pro? -> A: Desconhecido; sonda mostrou que o campo de botões é aceito e guardado, mas o render real depende de envio ao número do owner. Tratado no plano e em bloqueio humano único (FR-005).
- Q: Janela do texto livre equivalente ao botão (FR-009)? -> A: Até o início do atendimento, enquanto houver confirmação pendente do cliente e a frase for claramente equivalente (parametrizável).
- Q: Botão não renderiza em nenhum modo (FR-005)? -> A: Confirmação só em texto pedindo SIM/NÃO, tratada pelo FR-009.
- Q: Nova tentativa (FR-015)? -> A: Até 3 tentativas (1, 5 e 15 min); depois falha registrada e a verificação periódica corrige (parametrizável).
- Q: Verificação periódica (FR-016)? -> A: A cada 15 min, agendamentos dos próximos 7 dias (parametrizável).
- Q: Conteúdo do pós-atendimento? -> A: Só agradecimento humanizado e convite a voltar, sem link nem avaliação.
- Q: Mecanismo de entrega e de "apagar" (FR-005, FR-010, FR-011, FR-013, US1-5, US3, FR-INFRA-SCHED)? -> A: Decisão do owner (dec-007, 2026-10-20): na QR Pro a confirmação usa **lista** (duas opções), não botão quick reply. Desenho (dec-008): nada é agendado no Chat Master; um agendador próprio no n8n envia as três mensagens a partir do registro local, e "apagar no canal" equivale a cancelar o registro local antes do envio (nenhuma mensagem pendente sai). FR-013 fica trivialmente satisfeito.
