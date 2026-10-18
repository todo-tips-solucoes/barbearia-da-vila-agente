# Feature Specification: Robustez da recepção do WhatsApp

**Feature**: `recepcao-robustez`
**Created**: 2026-10-18
**Status**: Draft
**Depende de**: `recepcao-buffer` (já em `develop`), `infra-base`
**Origem**: decisões do owner em `docs/decisoes-pre-00c.md` ("Robustez da recepção" e "Duplicadas de texto"), a corrigir antes da feature 3.
**Escopo de ambiente**: somente TESTE; PROD segue parametrizado e inativo.

## User Scenarios & Testing

### User Story 1 - Nenhuma mensagem se perde em silêncio (Priority: P1)

Quando o Chat Master envia uma mensagem de cliente, a recepção só confirma o recebimento depois de a mensagem estar gravada de forma durável. Se a gravação falhar, o Chat Master recebe uma resposta de erro (para poder reenviar) e a falha fica registrada e sinalizada, sem texto nem telefone do cliente.

**Why this priority**: perder uma mensagem do cliente sem ninguém saber é o pior defeito da recepção.

**Independent Test**: simular banco indisponível e enviar uma mensagem válida; verificar resposta de erro, falha registrada e nenhuma confirmação de sucesso. Repetir com banco saudável e verificar confirmação só após a gravação.

**Acceptance Scenarios**:

1. **Given** banco saudável, **When** chega mensagem válida, **Then** a confirmação ao Chat Master ocorre somente após a mensagem estar gravada.
2. **Given** a gravação falha, **When** chega mensagem válida, **Then** o Chat Master recebe resposta de erro (não de sucesso) e a falha é registrada com motivo e momento, sem conteúdo pessoal.
3. **Given** a gravação falha e o próprio registro da falha também falha, **When** isso ocorre, **Then** a resposta de erro ainda é devolvida ao Chat Master (a perda nunca é confirmada como sucesso).
4. **Given** o Chat Master reenvia a mesma mensagem após o erro, **When** a gravação agora funciona, **Then** a mensagem é gravada uma única vez.

---

### User Story 2 - Armazenamento temporário fora do ar não trava a recepção (Priority: P1)

Se o armazenamento temporário usado no buffer estiver indisponível, lento ou recusar a credencial, a recepção não fica pendurada: tem um tempo máximo de espera, segue por um caminho de erro, registra a falha e a mensagem já gravada permanece pendente para ser entregue no turno seguinte.

**Why this priority**: uma dependência auxiliar fora do ar não pode derrubar a entrada do agente.

**Independent Test**: com o armazenamento temporário inacessível e depois com credencial inválida, enviar mensagem e medir tempo de resposta e registro da falha.

**Acceptance Scenarios**:

1. **Given** armazenamento temporário inacessível, **When** chega mensagem já gravada, **Then** a execução termina dentro do tempo máximo configurado, sem ficar travada.
2. **Given** credencial do armazenamento temporário recusada, **When** chega mensagem, **Then** o mesmo caminho de erro é seguido e a falha é registrada como tal.
3. **Given** qualquer das falhas acima, **When** o registro é consultado, **Then** consta uma entrada com tipo da falha e momento, sem texto, telefone ou segredo.
4. **Given** a mensagem foi gravada antes da falha, **When** o armazenamento volta, **Then** a mensagem pendente é entregue no turno seguinte, sem perda e sem duplicidade.
5. **Given** a falha ocorre após a gravação, **When** a resposta é devolvida, **Then** o Chat Master não recebe erro por causa disso.

---

### User Story 3 - Descartar texto repetido em poucos segundos (Priority: P2)

Mensagens de texto sem identificador próprio no canal hoje não podem ser deduplicadas pelo identificador. Passam a ser deduplicadas por conteúdo: mensagem igual (mesmo contato e mesmo texto) recebida em até cerca de 10 segundos da anterior é descartada. O owner aceitou o risco de um "ok" repetido de propósito ser descartado.

**Why this priority**: evita turno duplicado por reenvio do canal, mas só afeta o caso sem identificador.

**Independent Test**: enviar o mesmo texto duas vezes em menos de 10 s, depois após mais de 10 s, e com textos diferentes ou contatos diferentes.

**Acceptance Scenarios**:

1. **Given** texto sem identificador, **When** o mesmo texto do mesmo contato chega duas vezes em menos de 10 s, **Then** só a primeira entra no buffer.
2. **Given** o mesmo texto do mesmo contato, **When** a segunda chegada ocorre depois da janela, **Then** ambas são aceitas.
3. **Given** textos diferentes do mesmo contato, ou o mesmo texto de contatos diferentes, **When** chegam em menos de 10 s, **Then** todos são aceitos.
4. **Given** mensagem com identificador do canal, **When** chega duplicada, **Then** vale a deduplicação por identificador já existente, inalterada.
5. **Given** o descarte por conteúdo, **When** ocorre, **Then** nenhum texto ou telefone é guardado além da necessidade da própria comparação, e só durante a janela.

---

### User Story 4 - Criar sub-workflows pelo deploy sem edição manual (Priority: P3)

O comando de primeira criação de um workflow auxiliar (sub-workflow) registra o identificador no lugar certo da configuração do ambiente, para que os deploys seguintes o encontrem sem o operador editar o arquivo à mão.

**Why this priority**: defeito de ferramenta de deploy, contornável manualmente.

**Independent Test**: executar a criação de um sub-workflow em TESTE e depois um deploy normal, verificando que o segundo atualiza o mesmo workflow sem erro e sem duplicá-lo.

**Acceptance Scenarios**:

1. **Given** um sub-workflow sem identificador na configuração, **When** é criado pelo deploy, **Then** o identificador é gravado na seção dos sub-workflows.
2. **Given** a criação concluída, **When** roda o deploy normal, **Then** o sub-workflow é atualizado, não recriado.
3. **Given** um workflow principal, **When** é criado pelo deploy, **Then** o comportamento atual (gravar na seção dos principais) permanece.
4. **Given** nome já com identificador ou já existente na instância, **When** a criação é pedida, **Then** continua recusada.
5. **Given** o ambiente PROD, **When** a criação é pedida, **Then** continua recusada.

### Edge Cases

- Banco indisponível e armazenamento temporário indisponível ao mesmo tempo: resposta de erro ao canal, falha registrada quando possível.
- Texto vazio ou muito curto repetido: tratado como qualquer texto sem identificador (risco aceito pelo owner).
- Mídia sem identificador: fora da deduplicação por conteúdo, que vale só para texto.
- Ambiente PROD: continua parametrizado e inativo, sem mudança de lógica na ativação; nenhuma correção é aplicada nele.
- Janela de deduplicação por conteúdo expirando durante um reenvio tardio: aceita como nova mensagem.

## Requirements

### Functional Requirements

- **FR-001**: A recepção MUST confirmar o recebimento ao Chat Master somente após a mensagem estar gravada de forma durável.
- **FR-002**: Se a gravação da mensagem falhar, a recepção MUST devolver resposta de erro ao Chat Master e MUST registrar a falha com tipo e momento, sem texto, telefone ou segredo (FR-019 da `recepcao-buffer`).
- **FR-003**: Falha de gravação MUST gerar sinalização que torne a perda detectável por quem opera o sistema (registro consultável em `falhas_recepcao`), de modo que nenhuma mensagem se perca em silêncio.
- **FR-004**: Se também o registro da falha falhar, a resposta de erro ao Chat Master MUST ser mantida; a perda MUST NOT ser confirmada como sucesso.
- **FR-005**: O reenvio de mensagem pelo canal após erro MUST resultar em uma única gravação (sem duplicidade).
- **FR-006**: Toda chamada ao armazenamento temporário MUST ter tempo máximo de espera configurável (default `[PROPOSTA]` 5 s, registrado em `contracts/config-recepcao.md`; sem fonte externa que o fixe).
- **FR-007**: Indisponibilidade ou recusa de credencial do armazenamento temporário MUST seguir um caminho de erro explícito que encerra a execução dentro do tempo máximo, sem travá-la.
- **FR-008**: Nesse caminho, a recepção MUST registrar a falha em `falhas_recepcao` com o tipo (indisponível, credencial recusada, tempo esgotado), sem conteúdo pessoal nem segredo.
- **FR-009**: Falha do armazenamento temporário ocorrida após a gravação MUST NOT devolver erro ao Chat Master e MUST manter a mensagem pendente para o turno seguinte (reforça FR-025 da `recepcao-buffer`).
- **FR-010**: Mensagem de texto sem identificador do canal MUST ser deduplicada por conteúdo: mesmo contato e mesmo texto recebidos em até a janela configurável (default 10 s, decisão do owner) são descartados após a primeira.
- **FR-011**: A deduplicação por conteúdo MUST NOT afetar textos diferentes, contatos diferentes, mídias, nem mensagens com identificador (que seguem FR-014/FR-023 da `recepcao-buffer`).
- **FR-012**: A deduplicação por conteúdo MUST ser descrita em contrato como risco aceito pelo owner (um "ok" repetido de propósito pode ser descartado) e MUST NOT reter texto ou telefone legíveis além da janela.
- **FR-013**: O deploy ao criar um sub-workflow MUST gravar o identificador na seção de sub-workflows da configuração do ambiente; para workflows principais MUST manter o comportamento atual.
- **FR-014**: O deploy MUST continuar recusando criar workflow que já tenha identificador, que já exista na instância pelo mesmo nome, ou em PROD.
- **FR-015**: Após criar um sub-workflow, um deploy normal MUST atualizá-lo sem recriá-lo.
- **FR-016**: Todas as correções MUST valer apenas em TESTE; PROD MUST permanecer parametrizado e inativo, sem mudança de lógica na futura ativação.
- **FR-017**: A suíte de testes MUST cobrir os cenários de aceitação acima (falha de gravação, armazenamento temporário fora do ar, credencial recusada, deduplicação por conteúdo, criação de sub-workflow) e MUST limpar o que criar.
- **FR-018**: Os workflows alterados MUST ser publicados pelo script de deploy e validados pelo MCP nativo do n8n.

> Decisões de infraestrutura: idempotência (FR-005, FR-010) e tempo máximo de espera (FR-006) declarados acima; sem scheduling, rotação de chaves ou refresh de token novos.

### Key Entities

- **Falha de recepção**: registro em `falhas_recepcao` com tipo, momento e ambiente, sem conteúdo pessoal.
- **Marca de conteúdo recente**: indicador efêmero de "mesmo contato e mesmo texto visto há menos de 10 s", expirando sozinho.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Em 100% das injeções de falha de gravação, o Chat Master recebe erro e existe registro da falha; 0 confirmações de sucesso sem mensagem gravada.
- **SC-002**: Com o armazenamento temporário fora do ar ou com credencial recusada, 100% das execuções terminam em no máximo o tempo máximo configurado mais 2 s.
- **SC-003**: 100% das mensagens gravadas antes da falha do armazenamento temporário são entregues no turno seguinte, sem perda nem duplicidade.
- **SC-004**: Em 20 pares de textos iguais enviados em menos de 10 s, exatamente 20 são descartados; em 20 pares fora da janela ou com conteúdo/contato distintos, 0 são descartados.
- **SC-005**: Criar um sub-workflow e rodar o deploy normal em seguida funciona sem nenhuma edição manual de configuração, em 100% das tentativas.
- **SC-006**: Nenhum registro de falha ou marca de conteúdo contém telefone, texto de cliente ou segredo.

## Clarifications

- Tempo máximo de espera do armazenamento temporário (FR-006) e janela de 10 s (FR-010) são políticas de design; o valor de 10 s vem do owner, o de 5 s é `[PROPOSTA]` configurável.
- "Alertar a falha" (decisão do owner, alternativa à resposta de erro) é atendido por erro ao canal mais registro consultável; notificação ativa externa fica fora de escopo.

### Sessão 2026-10-18 (clarify autônomo)

- Q: O timeout do armazenamento temporário (5 s) tem fonte em `docs/decisoes-pre-00c.md`? → A: Não. O documento só exige que o Redis indisponível não trave o nó e registre em `falhas_recepcao`. O valor de 5 s permanece como `[PROPOSTA]` explícita, configurável (FR-006), a confirmar pelo owner; não bloqueia o plan. Cabe com folga em SC-002 (5 s + 2 s).
- Q: Mensagem sem identificador e sem texto (mídia)? → A: Fora da dedupe por conteúdo (FR-011), já coberto.
