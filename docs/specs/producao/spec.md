# Feature Specification: Producao (features 1 a 6 em PROD)

**Feature**: `producao`
**Created**: 2026-10-21
**Status**: Draft

Fonte: `docs/plano-proximas-features.md` secao E e os insumos do owner de 2026-10-21. Pre-requisitos cumpridos: features 1 a 6 mescladas na develop e suite de validacao 17/17 no TESTE (rodada 20261021-133335).

## User Scenarios & Testing

### User Story 1 - Ambiente de dados de PROD pronto e protegido (Priority: P1)

O operador cria, em PROD, o banco de dados da barbearia, aplica todas as migracoes (0001 a 0010) e cadastra as credenciais de PROD, com backup diario funcionando e limpeza de mensagens antigas.

**Why this priority**: Nada mais de PROD funciona sem dados; backup e retencao sao obrigacoes de seguranca e LGPD antes de qualquer cliente.

**Independent Test**: Conferir banco, migracoes, credenciais, backup e limpeza sem depender de workflow publicado.

**Acceptance Scenarios**:

1. **Given** o banco de PROD inexistente, **When** o operador prepara os bancos e migra, **Then** o banco `barbearia_vila` existe com as migracoes 0001 a 0010 aplicadas e nenhum dado de TESTE.
2. **Given** credenciais de PROD ausentes no n8n, **When** o operador cria as credenciais com alvo producao, **Then** elas existem so no n8n e no `.env` fora do repositorio, sem valor impresso ou versionado.
3. **Given** o backup configurado, **When** passam 03:30, **Then** ha um backup do dia e os backups com mais de 14 dias foram removidos.
4. **Given** um backup diario, **When** o operador testa o restore, **Then** o restore verificavel recupera o banco com retencao de 14 dias respeitada.
5. **Given** mensagens com mais de 12 meses, **When** roda a limpeza diaria, **Then** apenas essas mensagens somem; contato e agendamentos permanecem.

---

### User Story 2 - Configuracao de PROD completa (Priority: P1)

O arquivo de configuracao de PROD passa a ter todas as chaves exigidas (credenciais, webhook, conexao do WhatsApp, ids de todos os workflows e sub-workflows incluindo recepcao, vigia e verificacao, hosts de imagem) sem valores inventados.

**Why this priority**: O deploy e o hook de guarda dependem dela.

**Independent Test**: Validar o arquivo contra o esquema de ambiente e verificar que nao ha chave vazia nem id apontando para TESTE.

**Acceptance Scenarios**:

1. **Given** o arquivo de PROD incompleto, **When** completado com valores de fontes reais (n8n2, banco, conexao 145), **Then** a verificacao do repositorio passa e nenhuma chave obrigatoria esta vazia.
2. **Given** um id de PROD, **When** comparado ao de TESTE, **Then** nenhum id de PROD aponta para recurso `[TESTE]`.

---

### User Story 3 - Deploy ordenado dos workflows em PROD (Priority: P1)

O operador publica os sub-workflows e depois a recepcao em PROD, com validacao de cada no antes e conferencia depois de cada publicacao.

**Why this priority**: E a entrega em si; a ordem evita recepcao chamando sub-workflow inexistente.

**Independent Test**: Para cada workflow, ver validacao antes e detalhes depois (ativo, versao ativa igual a versao atual, nos, settings).

**Acceptance Scenarios**:

1. **Given** autorizacao explicita do owner e confirmacao de id, **When** o deploy roda, **Then** os sub-workflows sao publicados antes da recepcao, todos com nome `[PROD]`.
2. **Given** cada publicacao, **When** concluida, **Then** a conferencia mostra workflow ativo e versao ativa igual a versao atual, com nos e settings esperados.
3. **Given** falha de validacao de um no, **When** o deploy e tentado, **Then** ele para sem publicar e registra o rollback.
4. **Given** qualquer etapa, **When** o destino e resolvido, **Then** e sempre a instancia n8n2, nunca `n8n.todo-tips.com`, e os workflows `[TESTE]` permanecem intactos.

---

### User Story 4 - Webhook unico aponta para PROD e VPS ajustada (Priority: P2)

A conexao 145 passa a entregar mensagens a PROD; o TESTE segue por disparos diretos com contatos simulados. Na VPS, o cron de midia usa o id de PROD, o nome do container esta correto e o hook de guarda de PROD esta ativo.

**Why this priority**: Sem isso PROD nao recebe mensagens reais; mas so apos o deploy.

**Independent Test**: Enviar mensagem do numero do owner e ver execucao em PROD, nao em TESTE; disparo direto de TESTE continua funcionando.

**Acceptance Scenarios**:

1. **Given** a recepcao de PROD ativa, **When** o webhook da conexao 145 e alterado, **Then** uma mensagem do owner gera execucao em PROD e nenhuma em TESTE.
2. **Given** o webhook em PROD, **When** a suite de validacao dispara direto no TESTE, **Then** segue 17/17.
3. **Given** a VPS, **When** o cron de midia roda, **Then** usa o id de PROD e o container correto; o hook de guarda de PROD bloqueia acao proibida.

---

### User Story 5 - Quickstart restrito ao owner e liberacao com ok humano (Priority: P1)

Cada feature (1 a 6) e validada em PROD so com o numero 5511967296849; o resultado e enviado ao WhatsApp do owner; liberar a todos e ligar mensagens ativas so ocorre com o ok dele.

**Why this priority**: Controle de risco: nenhum cliente real e atingido antes da validacao.

**Independent Test**: Executar quickstart e confirmar que so o numero do owner recebeu e que a liberacao continua desligada.

**Acceptance Scenarios**:

1. **Given** PROD publicada, **When** o quickstart roda, **Then** apenas 5511967296849 e contatado e nenhum numero de cliente recebe mensagem.
2. **Given** um passo que exigiria escrita na agenda de barbeiro real, **When** o quickstart chega nele, **Then** nao escreve e abre bloqueio humano.
3. **Given** o quickstart concluido, **When** o resultado e enviado ao WhatsApp do owner, **Then** a liberacao a todos e `mensagens.ativo` permanecem desligados ate o ok explicito do owner (bloqueio humano final).

---

### Edge Cases

- Banco ja existe: preparar-bancos nao recria nem apaga dados.
- Migracao parcial falha: parar, registrar rollback, nao seguir para deploy.
- Chave Graces e de PROD: nenhum teste de escrita com barbeiro real.
- Webhook alterado antes do deploy completo: proibido; a ordem e deploy, depois webhook.
- Falha do alerta fora de banda: registrada, nao silenciosa.
- Segredos nunca copiados entre worktrees, impressos ou commitados.

## Requirements

### Functional Requirements

- **FR-001**: System MUST criar o banco `barbearia_vila` na VPS (autorizado pelo owner) e aplicar as migracoes 0001 a 0010, sem alterar dados existentes.
- **FR-002**: System MUST criar as credenciais de PROD no n8n com alvo producao, sem imprimir ou versionar segredos.
- **FR-003**: System MUST executar backup diario as 03:30 com retencao de 14 dias e restore verificavel (FR-INFRA-BACKUP).
- **FR-004**: System MUST completar a configuracao de PROD com credenciais, webhook, conexao, ids de todos os workflows e sub-workflows (incluindo recepcao, vigia e verificacao) e hosts de imagem, apenas com valores de fonte real.
- **FR-005**: System MUST publicar sub-workflows antes da recepcao, com validacao de cada no antes e conferencia de detalhes depois de cada publicacao (ativo, versao ativa, nos, settings).
- **FR-006**: System MUST nomear workflows novos de PROD com `[PROD]` e nao alterar workflows `[TESTE]` alem do necessario.
- **FR-007**: System MUST usar somente a instancia n8n2 e nunca `n8n.todo-tips.com`.
- **FR-008**: System MUST exigir autorizacao explicita e confirmacao de id para publicar em PROD, com rollback anotado em cada passo.
- **FR-009**: System MUST apontar o webhook unico da conexao 145 para PROD apos o deploy, mantendo o TESTE operavel por disparos diretos (suite 17/17).
- **FR-010**: System MUST configurar na VPS o id de PROD no cron de midia, o nome do container e o hook de guarda de PROD.
- **FR-011**: System MUST guardar mensagens por 12 meses e executar limpeza diaria do que exceder, preservando contato e agendamentos (base legal art. 7o V; sem parecer juridico).
- **FR-012**: System MUST usar em PROD os valores `[PROPOSTA]` iguais aos validados no TESTE.
- **FR-013**: System MUST executar o quickstart de cada feature 1 a 6 em PROD somente com o numero 5511967296849 como contato autorizado.
- **FR-014**: System MUST NOT escrever em agenda de barbeiro real em PROD; passo que exija isso abre bloqueio humano.
- **FR-015**: System MUST enviar o resultado do quickstart ao WhatsApp do owner e manter a liberacao a todos e `mensagens.ativo` desligados ate o ok explicito dele.
- **FR-016**: System MUST enviar alerta fora de banda ao WhatsApp 5511967296849 para Postgres fora e cota/gasto da OpenAI.

### Key Entities

- **Ambiente PROD**: banco, credenciais, workflows `[PROD]` e configuracao.
- **Backup**: copia diaria com retencao de 14 dias.
- **Mensagem**: historico de conversa com prazo de 12 meses.
- **Liberacao**: estado desligado ate ok do owner.

## Success Criteria

- **SC-001**: 100% das migracoes 0001 a 0010 aplicadas em PROD e 0 dados de TESTE no banco.
- **SC-002**: 100% dos workflows de PROD ativos com versao ativa igual a atual, apos cada publicacao.
- **SC-003**: 0 mensagens a numeros diferentes de 5511967296849 ate o ok do owner.
- **SC-004**: Suite de validacao do TESTE segue 17/17 apos a mudanca do webhook.
- **SC-005**: Backup diario presente e 0 backups com mais de 14 dias; 0 mensagens com mais de 12 meses apos a limpeza.
- **SC-006**: 0 segredos em commits e 0 referencias a `n8n.todo-tips.com`.

## Premissas

- Conexao 145 compartilhada com TESTE; ninguem atende nela hoje, sem cutover de atendimento.
- Promocao develop para main e uma PR separada, fora desta feature.
- Decisoes de infraestrutura: backup (FR-003), retencao (FR-011) e agendamento diario de limpeza e backup; sem rotacao de chaves ou refresh de token novos.
