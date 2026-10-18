# Feature Specification: Infraestrutura base do agente da Barbearia da Vila

**Feature**: `infra-base`
**Created**: 2026-10-18
**Status**: Draft

> Fontes: `docs/decisoes-pre-00c.md`, `docs/constitution.md` (Princípios XIII, XIV, VII, XVI), `docs/roadmap.md` (feature 1) e, como referência de arquitetura, `docs/infra.md` do projeto `goldincision_licienciados`. Nenhum host, porta, id ou nome de credencial novo é inventado aqui: o que não tem fonte está em Assumptions ou marcado como `[NEEDS CLARIFICATION]`.

## User Scenarios & Testing

### User Story 1 - Bancos de dados isolados por ambiente (Priority: P1)

O mantenedor precisa de um banco de dados próprio para o ambiente de TESTE e outro para PROD, cada um com seu usuário dono, contendo as estruturas de estado do agente (contatos, histórico de mensagens, mensagens agendadas e handoffs), para que todas as features seguintes tenham onde guardar estado sem tocar nos dados de outros serviços da VPS.

**Why this priority**: todas as demais features dependem de estado; sem banco não há recepção, agente, agendadas nem handoff.

**Independent Test**: executar a preparação do banco de TESTE, conectar com o usuário dele e conferir que as estruturas existem, que o usuário de TESTE não enxerga o banco de PROD e que um segundo run não altera nada.

**Acceptance Scenarios**:

1. **Given** a stack n8n sem os bancos da barbearia, **When** o mantenedor roda a preparação de infra, **Then** existem os bancos `barbearia_vila_teste` e `barbearia_vila`, cada um com dono de mesmo nome e as estruturas de contatos, histórico, mensagens agendadas e handoffs.
2. **Given** os bancos já criados, **When** a preparação roda de novo, **Then** o estado final é idêntico, sem erro, sem duplicar registros e sem recriar usuário ou trocar senha.
3. **Given** o usuário dono do banco de TESTE, **When** tenta conectar no banco de PROD (ou no banco do próprio n8n), **Then** a conexão é negada.

---

### User Story 2 - Redis separado por ambiente (Priority: P1)

O mantenedor precisa que buffer, lock por contato e demais chaves temporárias de TESTE e PROD usem prefixos distintos no Redis já existente da stack, para que um teste nunca interfira em conversas reais nem em outros serviços.

**Why this priority**: a feature `recepcao-buffer` depende de lock e buffer no Redis; colisão entre ambientes causaria respostas duplicadas ou perdidas em produção.

**Independent Test**: gravar uma chave de teste em cada prefixo e conferir que nenhuma operação de um ambiente enxerga ou apaga chaves do outro, nem de chaves alheias à barbearia.

**Acceptance Scenarios**:

1. **Given** os prefixos documentados, **When** o ambiente de TESTE grava uma chave, **Then** ela só é visível sob o prefixo de TESTE.
2. **Given** chaves de PROD existentes, **When** uma limpeza de TESTE é executada, **Then** nenhuma chave de PROD ou de outro serviço é removida.

---

### User Story 3 - Deploy de workflows pela API pública do n8n (Priority: P1)

O mantenedor precisa publicar um workflow versionado no repositório em um ambiente (TESTE ou PROD) com um único comando, que atualiza o workflow existente e o publica, para que as features seguintes entreguem workflows de forma repetível e auditável.

**Why this priority**: sem o deploy repetível, cada feature teria de inventar seu próprio caminho de publicação; o deploy de PROD precisa ser explícito e protegido.

**Independent Test**: executar o deploy de um workflow de exemplo em TESTE duas vezes e conferir que o workflow é atualizado (não duplicado) e fica publicado; tentar PROD sem a confirmação exigida e ver a recusa.

**Acceptance Scenarios**:

1. **Given** um workflow JSON versionado e seu id registrado para o ambiente TESTE, **When** o deploy é executado, **Then** o workflow existente é atualizado e em seguida publicado, e o resultado informa sucesso ou o motivo da falha.
2. **Given** o mesmo deploy executado duas vezes, **When** o segundo termina, **Then** não existe workflow duplicado e o estado final é igual ao do primeiro.
3. **Given** o ambiente PROD como alvo, **When** o deploy é invocado sem a confirmação explícita do owner, **Then** o script recusa e não altera nada.
4. **Given** falha na atualização, **When** o deploy é executado, **Then** o script não publica e retorna erro, deixando claro em que etapa parou.

---

### User Story 4 - Configuração por ambiente e segredos fora do repositório (Priority: P2)

O mantenedor precisa de um arquivo de configuração por ambiente (sem segredos) com os ids de workflows e credenciais do n8n, os prefixos Redis e o nome do banco, e de um registro das credenciais do n8n necessárias, para que features futuras leiam tudo de um só lugar e nenhum segredo vaze.

**Why this priority**: viabiliza reprodutibilidade, mas o MVP (stories 1 a 3) funciona com configuração mínima.

**Independent Test**: varrer o repositório procurando senhas, tokens e chaves e não encontrar nenhum; conferir que cada id citado na configuração aparece na documentação de infraestrutura.

**Acceptance Scenarios**:

1. **Given** os arquivos de configuração dos dois ambientes, **When** o repositório é varrido por segredos, **Then** nenhuma credencial, token ou senha é encontrada.
2. **Given** uma credencial do n8n necessária (banco, Redis, OpenAI, Graces, Chat Master), **When** consultada a documentação de infraestrutura, **Then** consta nome e finalidade, nunca o valor.

---

### Edge Cases

- Banco ou usuário já existe parcialmente (execução anterior interrompida): a preparação completa o que falta sem recriar nem apagar dados.
- Senha do usuário de banco já definida: re-execução não a troca silenciosamente.
- Falta de conexão com a VPS ou com a API do n8n: os scripts falham com mensagem clara e código de saída diferente de zero, sem efeito parcial oculto.
- Operação na VPS fora da stack `n8n`: nunca executada; os scripts só atuam sobre os recursos da stack n8n.
- Existem outros Postgres na VPS que não são o da stack n8n: a preparação deve atuar apenas no Postgres da stack n8n.
- Prefixo Redis do TESTE ser prefixo textual do PROD (ou vice-versa): proibido, para que limpezas por prefixo não colidam.
- Deploy apontando para um id de workflow inexistente no ambiente: o script falha sem criar workflow novo às cegas.
- Dados de clientes (nome, telefone, histórico): a estrutura guarda apenas o necessário (LGPD).

## Requirements

### Functional Requirements

- **FR-001**: O sistema MUST fornecer a criação do banco `barbearia_vila_teste` com dono `barbearia_vila_teste` e do banco `barbearia_vila` com dono `barbearia_vila`, no Postgres da stack n8n, isolados do banco do próprio n8n e de outros serviços.
- **FR-002**: Cada usuário dono MUST ter permissão apenas sobre o seu banco; o usuário de TESTE MUST NOT acessar o banco de PROD e vice-versa.
- **FR-003**: Cada banco MUST conter estruturas para: contatos (identificação do cliente no canal e vínculo opcional com o cliente na Graces), histórico de mensagens da conversa, mensagens agendadas (tipo, horário previsto, referência ao agendamento e situação) e handoffs (contato, motivo, situação e instantes de início e fim).
- **FR-004**: As estruturas de dados MUST guardar somente dados de cliente necessários à operação (identificação, histórico e estado), sem campos de dados sensíveis desnecessários (Princípio XIV).
- **FR-005**: A preparação de bancos e estruturas MUST ser idempotente: rodar duas vezes produz o mesmo estado, sem duplicar registros, sem trocar senha existente e sem erro (Princípio VII).
- **FR-006**: A preparação MUST escrever apenas na stack `n8n` da VPS e nos recursos declarados (bancos da barbearia e chaves Redis com os prefixos da barbearia); MUST NOT alterar outros serviços da VPS (Princípio XIII).
- **FR-007**: O sistema MUST definir prefixos de chave Redis distintos para TESTE e PROD, documentados, e MUST NOT usar nem apagar chaves fora desses prefixos (nenhuma limpeza global do Redis).
- **FR-008**: Nenhum prefixo Redis de um ambiente MAY ser prefixo textual do outro.
- **FR-009**: O sistema MUST fornecer um script de deploy que, dado o ambiente e o workflow versionado, atualiza o workflow existente pela API pública do n8n e, só após sucesso, o publica.
- **FR-010**: O deploy MUST ser idempotente e MUST NOT criar workflow duplicado; MUST falhar com mensagem clara, sem publicar, se a atualização falhar ou o id do workflow no ambiente não existir.
- **FR-011**: O deploy para PROD MUST exigir confirmação explícita do owner e ser recusado sem ela; o agente autônomo MUST implantar apenas no TESTE (Princípio XIII).
- **FR-012**: O sistema MUST manter, por ambiente, um arquivo de configuração sem segredos com nome do banco, prefixos Redis, ids de workflows e ids de credenciais do n8n, consumido pelos scripts e pelas features seguintes.
- **FR-013**: Credenciais, tokens e senhas MUST viver apenas nas credenciais do n8n e em arquivos de ambiente fora do repositório; MUST NOT aparecer em scripts, configuração versionada, documentos, logs ou mensagens de commit (Princípio XIV). Scripts MUST NOT imprimir segredos.
- **FR-014**: A documentação de infraestrutura do projeto (`docs/infra.md`) MUST registrar, sem segredos, onde roda (VPS, stack, instância n8n), bancos, prefixos Redis e a lista de credenciais do n8n com nome e finalidade, e MUST ser conferível contra os ids da configuração por ambiente.
- **FR-015**: As credenciais do n8n para banco (TESTE e PROD) e Redis MUST ser criadas por script idempotente, lendo os segredos de fonte fora do repositório.
- **FR-016**: Os scripts MUST ser portáveis nos sistemas suportados pelo projeto, escrever só no escopo declarado e terminar com código de saída diferente de zero em qualquer falha (Princípio VII).
- **FR-017**: Todo dado factual dos artefatos desta feature (nomes de credenciais, ids, portas, caminhos) MUST vir de fonte rastreável (documentação do projeto, doc oficial do n8n, leitura da própria VPS ou instância); sem fonte, MUST ser tratado como pendência, nunca suposto (Princípio XVI).
- **FR-018**: Os scripts de infra MUST ter verificação automatizada de pelo menos: idempotência (segunda execução sem mudança), recusa do PROD sem confirmação e ausência de segredos no repositório.

> Decisões de infraestrutura: backup/restore dos bancos novos e retenção ficam delegados à rotina de backup já existente da stack n8n; este escopo apenas registra se os novos bancos estão cobertos (pendência aberta abaixo). Scheduling, rotação de chaves e refresh de token: N/A (feature de infraestrutura sem scheduler próprio; mensagens agendadas pertencem a `mensagens-agendadas`).

### Key Entities

- **Contato**: pessoa atendida pelo canal, identificada pelo número no canal; pode ter vínculo com o cliente correspondente na Graces e nome informado.
- **Mensagem de histórico**: mensagem trocada com um contato (entrada ou saída), com instante e conteúdo textual; base do contexto da conversa.
- **Mensagem agendada**: mensagem programada para um contato, com tipo (confirmação, lembrete, pós-atendimento), horário previsto, referência ao agendamento e situação (pendente, enviada, cancelada).
- **Handoff**: transferência de um contato ao atendimento humano, com motivo, situação e instantes; enquanto aberto, o agente não responde.
- **Configuração de ambiente**: conjunto sem segredos (banco, prefixos Redis, ids de workflows e credenciais) de TESTE ou PROD.

## Success Criteria

### Measurable Outcomes

- **SC-001**: A preparação completa de um ambiente novo (banco, estruturas e prefixos) conclui em uma única execução, e uma segunda execução imediata resulta em 0 alterações.
- **SC-002**: 100% das tentativas de acesso cruzado entre o usuário de um ambiente e o banco do outro são negadas.
- **SC-003**: Após a preparação, 0 serviços da VPS fora da stack `n8n` têm configuração, dado ou container alterado.
- **SC-004**: Um deploy de workflow em TESTE atualiza e publica o workflow em uma única invocação, e repeti-lo 3 vezes deixa exatamente 1 workflow por id.
- **SC-005**: 100% das tentativas de deploy em PROD sem confirmação do owner são recusadas sem qualquer alteração.
- **SC-006**: A varredura de segredos sobre o repositório encontra 0 ocorrências de credenciais, tokens ou senhas.
- **SC-007**: Uma limpeza de chaves de um ambiente remove 0 chaves do outro ambiente e 0 chaves alheias à barbearia.

## Assumptions

- A VPS (`178.156.134.167`), a instância n8n (`https://n8n2.todo-tips.com`) e a stack `n8n` (n8n, Postgres e Redis) são as de `docs/decisoes-pre-00c.md`; o acesso segue o do projeto de referência.
- O padrão de organização é o do projeto de referência (credenciais no n8n, arquivos de ambiente fora do repositório, configuração por ambiente versionada sem segredos).
- Workflows `[TESTE]` e `[PROD]` coexistem na mesma instância, cada um com path e webhookId próprios (definidos na feature `recepcao-buffer`).
- A conexão e o número de PROD do Chat Master (item adiado, block-001) não afetam esta feature.
- Esquema detalhado de colunas, tipos e índices é decisão de plano, não de spec.

## Pendências

- [NEEDS CLARIFICATION: quais prefixos Redis e qual database lógico do Redis a barbearia usa em TESTE e PROD? Sem fonte no projeto; o de referência usa prefixo próprio por projeto num DB dedicado, mas os valores da barbearia não foram decididos.]
- [NEEDS CLARIFICATION: onde ficam, na VPS, os segredos dos bancos novos e o arquivo de ambiente do n8n local (equivalente ao `infra.env` e ao `.env.n8n` do projeto de referência) e quais nomes de variáveis usar?]
- [NEEDS CLARIFICATION: os bancos novos entram na rotina de backup atual da stack n8n?] Se não entrarem, criar o backup é requisito desta feature; se entrarem, registrar frequência e retenção.

## Delta Requirements

**Skip**: feature puramente nova, sem comportamento ativo em `docs/specs/current/` para alterar — specify (feature-00c), 2026-10-18
