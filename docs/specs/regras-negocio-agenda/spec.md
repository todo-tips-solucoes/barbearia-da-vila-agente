# Feature Specification: Regras de negócio sobre a agenda da Graces

**Feature**: `regras-negocio-agenda`
**Created**: 2026-10-18
**Status**: Draft
**Depende de**: `agente-conversacional-graces` (estende o fluxo `entregar-rajada` e as ferramentas `bv-graces` da feature 3)
**Origem**: roadmap (feature 4), `docs/decisoes-pre-00c.md` (seção Regras de negócio), `graces-api/` e `alteracoes_clientes/transcricoes.md`. FR-023 da feature 3 adiou para cá: pacote, terceiros, encadeamento e oferta de todos os inícios.
**Escopo de ambiente**: somente TESTE; PROD fica parametrizado e inativo (decisão do owner).

> Decisões de infraestrutura: N/A (esta feature não cria agendador, rotação de chave nem backup). Idempotência de escrita: ver FR-009 e FR-010.

## User Scenarios & Testing

### User Story 1 - Ver todos os inícios em que o serviço cabe (Priority: P1)

Ao pedir um horário, o cliente recebe todos os inícios livres do dia (e do barbeiro) em que o serviço, com a duração real dele, cabe inteiro, e não apenas 3 a 5 sugestões. É um pedido explícito do dono: quem tem pouco tempo livre quer ver cada opção possível.

**Why this priority**: é feedback direto do dono da barbearia e aumenta as chances de fechar o agendamento.

**Independent Test**: com o barbeiro de teste e um dia com vários horários livres, pedir um serviço e conferir que a lista oferecida contém exatamente os inícios que a Graces devolve como livres para aquele serviço, nenhum a mais e nenhum a menos.

**Acceptance Scenarios**:

1. **Given** um dia com 10 inícios livres para o serviço, **When** o cliente pede horário, **Then** os 10 são oferecidos (em mais de uma lista se o canal limitar o tamanho), sem omitir nenhum.
2. **Given** o cliente aceita "qualquer barbeiro", **When** o assistente consulta cada barbeiro elegível, **Then** os inícios são unidos, cada um indicando o barbeiro, sem o barbeiro de teste.
3. **Given** um dia lotado, **When** o cliente pede horário, **Then** o assistente informa que não há vaga e sugere o dia seguinte, sem inventar horário.
4. **Given** o horário escolhido foi tomado entre a oferta e a confirmação, **When** o assistente revalida, **Then** ele avisa e reoferece a grade atualizada.

---

### User Story 2 - Pacote ou avulso: perguntar antes (Priority: P1)

Quando o cliente tem sessão de pacote aplicável ao serviço, o assistente pergunta se ele quer usar a sessão do pacote ou pagar avulso, e agenda conforme a resposta. Nunca decide sozinho.

**Why this priority**: decisão do owner; usar o pacote sem perguntar consome algo que o cliente pode querer guardar.

**Independent Test**: para um cliente com seção de pacote aplicável, conferir que a pergunta é feita antes do resumo de confirmação e que o agendamento reflete a escolha; para um cliente sem pacote, conferir que a pergunta não aparece.

**Acceptance Scenarios**:

1. **Given** o cliente tem seção de pacote aplicável ao serviço, **When** o serviço, o barbeiro e o horário já estão escolhidos, **Then** o assistente oferece "usar a sessão do pacote" ou "pagar avulso" por botão de lista antes de confirmar.
2. **Given** o cliente escolhe o pacote, **When** o agendamento é criado, **Then** ele abate a seção do pacote e o resumo de confirmação diz "abatido do pacote".
3. **Given** o cliente escolhe avulso, **When** o agendamento é criado, **Then** o serviço é cobrado como avulso e o resumo mostra o valor.
4. **Given** o cliente não tem seção aplicável, **When** ele agenda, **Then** nada sobre pacote é perguntado.
5. **Given** o cliente tem mais de uma seção aplicável, **When** escolhe usar o pacote, **Then** vale a regra definida em FR-004.

---

### User Story 3 - Nunca oferecer nem agendar serviços "2ª vez" (Priority: P1)

Os serviços cuja descrição indica "2ª vez" (variantes de preço reduzido) nunca aparecem como opção nem são agendados, mesmo que o cliente os peça pelo nome.

**Why this priority**: decisão do owner; a fonte da Graces não documenta quando o cliente tem direito a elas, então o assistente não pode concedê-las.

**Independent Test**: listar os serviços oferecidos e tentar agendar "corte adulto 2ª vez" pelo nome; o assistente recusa e oferece o serviço regular equivalente.

**Acceptance Scenarios**:

1. **Given** a lista de serviços da Graces contém variantes "2ª vez", **When** o assistente lista ou sugere serviços, **Then** nenhuma delas aparece.
2. **Given** o cliente pede um serviço "2ª vez" pelo nome, **When** o assistente responde, **Then** ele não agenda e oferece o serviço regular equivalente, sem prometer desconto.
3. **Given** uma ferramenta de escrita recebe o id de um serviço "2ª vez", **When** executa, **Then** recusa a operação, independentemente do que o modelo decidiu.

---

### User Story 4 - Agendar para outra pessoa (Priority: P2)

O cliente pode agendar para um terceiro (filho, amigo). O assistente pede o nome da pessoa, busca na Graces e, se não existir, cadastra. O agendamento fica no nome dessa pessoa.

**Why this priority**: decisão do owner e caso frequente (pais com filhos), mas depende de cadastro irreversível, então vem depois das regras de leitura.

**Independent Test**: com a conta de teste, pedir agendamento "para o meu filho", informar o nome de uma pessoa já existente na Graces e conferir que o agendamento usa o cliente encontrado, não o remetente.

**Acceptance Scenarios**:

1. **Given** o cliente diz que o serviço é para outra pessoa, **When** o assistente responde, **Then** pede o nome dela.
2. **Given** a busca pelo nome devolve uma pessoa, **When** o assistente confirma "é o(a) <nome>?", **Then** agenda no cadastro dela somente após o "sim".
3. **Given** a busca devolve várias pessoas, **When** o assistente pergunta qual, **Then** o cliente escolhe por botão de lista e nada é agendado antes disso.
4. **Given** a busca não devolve ninguém, **When** o assistente propõe cadastrar, **Then** só cadastra após confirmação do cliente e com os dados exigidos pela loja (ver FR-007).
5. **Given** o terceiro é identificado, **When** o assistente mostra dados, **Then** mostra somente dados dele e do remetente, nunca de outros clientes.

---

### User Story 5 - Encadear vários serviços (Priority: P2)

O cliente pede mais de um serviço de uma vez (por exemplo corte e barba como serviços separados). O assistente cria um agendamento por serviço, com horários em sequência, e confirma o conjunto de uma vez.

**Why this priority**: decisão do owner; evita o cliente repetir o fluxo, mas exige cuidado com falha parcial.

**Independent Test**: com o barbeiro de teste, pedir dois serviços; conferir que existem dois agendamentos, o segundo começando no fim do primeiro, e que falha no segundo não deixa o cliente sem aviso.

**Acceptance Scenarios**:

1. **Given** o cliente pede dois serviços, **When** o assistente oferece horários, **Then** só oferece inícios em que a sequência inteira cabe, cada serviço com a duração dele.
2. **Given** o cliente escolhe um início, **When** o assistente resume, **Then** mostra cada serviço com seu horário e valor numa única confirmação.
3. **Given** o cliente confirma, **When** os agendamentos são criados, **Then** há um agendamento por serviço, criados em ordem.
4. **Given** o segundo agendamento falha após o primeiro ter sido criado, **When** o assistente responde, **Then** informa exatamente o que foi agendado e o que não foi, e oferece nova tentativa para o que faltou, sem repetir o que já existe.
5. **Given** o cliente cancela o conjunto, **When** confirma, **Then** cada agendamento é cancelado individualmente e o assistente informa o resultado de cada um.

---

### User Story 6 - Erros pelo `code` e escrita nunca repetida às cegas (Priority: P1)

Cada erro da Graces é tratado pelo campo `code`, nunca pelo texto da mensagem. Após timeout ou erro 5xx numa escrita, o assistente primeiro consulta a agenda para saber se a escrita foi aplicada e só repete se não foi.

**Why this priority**: uma escrita duplicada gera agendamento em dobro, cancelamento errado ou cobrança indevida.

**Independent Test**: simular timeout na criação de um agendamento de teste que, na verdade, foi aplicado; conferir que não há segunda criação e que o cliente recebe a confirmação correta.

**Acceptance Scenarios**:

1. **Given** uma escrita termina em timeout ou 5xx, **When** o assistente decide o próximo passo, **Then** consulta os agendamentos do cliente antes de qualquer nova escrita.
2. **Given** a consulta mostra que a escrita foi aplicada, **When** o assistente responde, **Then** trata como sucesso e não repete.
3. **Given** a consulta mostra que não foi aplicada, **When** o assistente repete, **Then** repete no máximo uma vez e, persistindo a falha, usa a resposta de contingência e registra.
4. **Given** a Graces responde com `code` conhecido, **When** o assistente reage, **Then** a reação segue a tabela de FR-009 pelo `code`, mesmo que o texto da mensagem esteja em outro idioma ou mude.
5. **Given** o mesmo turno é reprocessado, **When** a escrita já foi feita, **Then** nenhuma escrita se repete (idempotência por turno da feature 3).

### Edge Cases

- Serviço com tempo próprio do barbeiro: a duração usada é a que a Graces devolve para aquele barbeiro e serviço, nunca um tempo suposto.
- Início que cabe no fim do expediente: só aparece se a Graces o devolve; o assistente não calcula fechamento por conta própria.
- Pacote vencido ou seção já reservada: não é oferecido; o assistente trata como avulso somente se o cliente concordar.
- Cliente que pede "o mais cedo possível" com muitas opções: o assistente responde com o primeiro início, mantendo o restante disponível.
- Terceiro com o mesmo nome do remetente ou homônimo: o assistente pede confirmação antes de usar o cadastro.
- Terceiro sem celular próprio: cadastra com o celular do remetente após confirmação explícita (FR-007).
- Nenhum barbeiro faz todos os serviços em sequência: o cliente escolhe por botão de lista entre barbeiros diferentes (resumo único) ou serviços separados (FR-012).
- Cliente desiste no meio do encadeamento: nada é criado antes da confirmação conjunta.
- `code` desconhecido ou ausente: contingência genérica, com `code` e `traceId` registrados.
- Teste que falha no meio: tudo o que criou é cancelado mesmo assim.

## Clarifications

### Session 2026-10-18

(Q1 resolvida (dec-008); FR-007 resolvida (block-001, dec-011); FR-012 resolvida (block-002, dec-012). Sem pendências.)

## Requirements

### Functional Requirements

- **FR-001**: O sistema MUST oferecer ao cliente todos os inícios livres devolvidos pela Graces em que o serviço escolhido cabe inteiro, sem limitar a 3 a 5 sugestões e sem ocultar nenhum, e MUST NOT oferecer início que não tenha vindo da consulta de horários livres feita na mesma conversa. Quando excederem o tamanho máximo de uma lista do canal, MUST enviar várias listas em sequência cronológica até esgotar todos os inícios (clarify Q1, dec-008).
- **FR-002**: Para "qualquer barbeiro", o sistema MUST consultar cada barbeiro elegível do serviço, excluindo o barbeiro de teste, e unir os inícios identificando o barbeiro de cada um.
- **FR-003**: Antes da confirmação, quando o cliente tiver seção de pacote aplicável ao serviço, o sistema MUST perguntar, por botão de lista, se ele quer usar a sessão do pacote ou pagar avulso, e MUST NOT escolher por ele. Sem seção aplicável, MUST NOT perguntar.
- **FR-004**: Havendo mais de uma seção aplicável, o sistema MUST usar a primeira devolvida pela Graces, informando ao cliente que será abatido do pacote. (Regra de `graces-api/05-fluxos-do-agente.md`; a barbearia pode revisar.)
- **FR-005**: O sistema MUST NOT oferecer, sugerir nem agendar serviço cuja descrição indique "2ª vez" (variantes "2º vez"/"2ª vez", sem diferenciar acento, caixa ou ordinal), e a ferramenta de escrita MUST recusar esses serviços mesmo se o modelo os escolher. Se o cliente os pedir, o sistema MUST oferecer o serviço regular equivalente sem prometer desconto.
- **FR-006**: Ao saber que o atendimento é para outra pessoa, o sistema MUST pedir o nome dela, buscar na Graces pelo nome, confirmar a identidade com o cliente e agendar no cadastro dessa pessoa, nunca no do remetente. Terceiro cujo celular no cadastro difere do celular do remetente (inclusive sem celular no cadastro) MUST NOT virar `idCliente`: o sistema não permite ver, remarcar, cancelar, usar pacote nem agendar para ele, e MUST encaminhar o pedido à equipe (`encaminhar_equipe`, motivo `terceiro_outro_celular`). A busca MUST exigir nome completo de ao menos 2 palavras; "mesmo nome" é a igualdade após normalizar caixa, acentos e espaços repetidos.
- **FR-007**: Quando a pessoa não existir, o sistema MUST cadastrá-la somente após confirmação do cliente e com os dados que a loja exige. Cadastro de cliente na Graces é irreversível: nos testes, MUST NOT ser executado sem autorização expressa do owner. Terceiro sem celular próprio (por exemplo, criança): o sistema MUST cadastrá-lo com o celular de quem pede, somente após confirmação explícita do cliente na conversa (clarify block-001, dec-011; `docs/decisoes-pre-00c.md`). Testes não cadastram cliente real novo (mock ou cliente de teste). Primeiro contato cujo nome completo (2+ palavras, normalizado como em FR-006) já existe na Graces com outro celular MUST ser encaminhado à equipe (`encaminhar_equipe`, motivo `nome_outro_celular`), sem cadastrar, mesclar nem duplicar.
- **FR-008**: O sistema MUST agendar vários serviços pedidos juntos como um agendamento por serviço, em sequência (o início de cada um no fim do anterior), oferecendo apenas inícios em que a sequência inteira cabe e confirmando o conjunto numa única mensagem de resumo, sem criar nada antes do "sim".
- **FR-009**: O sistema MUST decidir a reação a erros da Graces pelo campo `code`, nunca pelo texto de `detail`, conforme: `PARAMETRO_INVALIDO`/`CORPO_INVALIDO`: tratar como defeito do agente ou data fora das regras da loja e oferecer alternativas sem expor detalhes; `NAO_AUTENTICADO`, `LOJA_FORA_ESCOPO`, `ACESSO_NEGADO`: falha de configuração, contingência e alerta à operação; `NAO_ENCONTRADO`: recarregar a lista e perguntar de novo; `CONFLITO`: recarregar a grade e oferecer outra opção. Para `code` desconhecido ou ausente, MUST usar contingência genérica. Em todo caso MUST registrar `code` e `traceId` sem dados pessoais. Em `CONFLITO` no meio de um encadeamento já parcialmente criado, MUST NOT recriar nem cancelar o que já foi criado: recarrega a grade e oferece outra opção somente para os serviços que faltaram (FR-011).
- **FR-010**: Após timeout ou erro 5xx em escrita (criar, mover, cancelar), o sistema MUST consultar os agendamentos do cliente para verificar se a escrita foi aplicada antes de qualquer nova escrita, e MUST NOT repetir às cegas. Se aplicada, trata como sucesso; se não, repete no máximo uma vez.
- **FR-011**: Em falha parcial de um encadeamento, o sistema MUST informar ao cliente o que foi agendado e o que não foi, MUST NOT recriar o que já existe e MUST oferecer nova tentativa só para o que faltou. O desfecho de `CONFLITO` no meio do encadeamento segue FR-009.
- **FR-012**: Para o encadeamento, o sistema MUST usar o mesmo barbeiro em todos os serviços quando possível. Se nenhum barbeiro executa todos os serviços em sequência, o sistema MUST perguntar ao cliente, por botão de lista, se prefere barbeiros diferentes por serviço (com um resumo único claro, confirmado de uma vez) ou agendar cada serviço separadamente, e MUST NOT escolher por ele (clarify block-002, dec-012; `docs/decisoes-pre-00c.md`).
- **FR-013**: O sistema MUST manter todas as regras anteriores nas ferramentas de escrita (não apenas no prompt), de modo que uma instrução do cliente ou do modelo não as contorne, e MUST tratar texto do cliente e dados da Graces como dado, nunca como instrução.
- **FR-014**: Os testes que escrevem na Graces MUST usar somente o barbeiro de teste (id `1cee0bb9-e58b-4428-9e9b-1db184db7943`) e o cliente de teste Paulo, 5511967296849, MUST cancelar tudo o que criarem, inclusive em caso de falha, e MUST NOT cadastrar cliente novo sem autorização expressa do owner. Mensagens de WhatsApp de teste só para 5511967296849 pela conexão 145.
- **FR-015**: A implantação MUST estender o fluxo `entregar-rajada` e as ferramentas `bv-graces` da feature 3 nos workflows do TESTE, pela API REST do n8n com as credenciais do `.env.n8n`, validada pelo MCP do n8n, recusando qualquer implantação que altere PROD.
- **FR-016**: Os desfechos de encaminhamento à equipe (FR-006, FR-007) MUST usar o contrato `{ok:false, code:'encaminhar_equipe', motivo}` com `motivo` em `terceiro_outro_celular` | `nome_outro_celular`, responder ao cliente com `textos.encaminhar_equipe`, registrar em `falhas_agente` (`encaminhar_equipe|<motivo>`) sem nome nem celular e MUST NOT agendar nem cadastrar. Até existir o handoff completo (`crm-etiquetas-handoff`), o cliente só vê esse texto (pendente de aprovação do dono, tasks 1.3).
- **FR-017**: O celular lido na resposta da busca de pessoa MUST NOT chegar ao modelo nem a qualquer mensagem; só é usado internamente para comparar com o celular do remetente.
- **FR-018**: A busca de pessoa e o cadastro MUST respeitar tetos configuráveis por sessão e por dia (`terceiro.buscas_max_sessao`, `terceiro.buscas_max_dia`, `terceiro.cadastros_max_dia`), recusando além do teto.

### Key Entities

- **Serviço**: item da agenda com duração própria por barbeiro; variantes "2ª vez" são marcadas como não oferecíveis.
- **Seção de pacote**: sessão em aberto do cliente, aplicável a um serviço; consumida só se o cliente escolher.
- **Pessoa atendida**: o cliente titular do agendamento, que pode ser o remetente ou um terceiro cadastrado na Graces.
- **Pedido composto**: conjunto ordenado de serviços pedidos juntos, com um agendamento por serviço e estado de cada um (criado, pendente, falho).
- **Resultado de escrita**: desfecho de uma criação, movimentação ou cancelamento, com `code` e `traceId` quando erro, e verificação de aplicação após timeout.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Em 100% dos testes de oferta, o conjunto de inícios apresentados é idêntico ao conjunto de inícios livres devolvidos pela Graces para o serviço.
- **SC-002**: Em 100% dos casos com seção de pacote aplicável, a pergunta pacote ou avulso é feita antes da confirmação; em 0% dos casos sem seção ela aparece.
- **SC-003**: Em 0 de N tentativas de oferecer ou agendar serviço "2ª vez" (incluindo pedido direto pelo nome) o sistema avança; em 100% elas são recusadas.
- **SC-004**: Em 100% dos agendamentos para terceiros nos testes, o agendamento fica no cadastro da pessoa informada e não no do remetente.
- **SC-005**: Em 100% dos pedidos de dois ou mais serviços confirmados, existe um agendamento por serviço, em sequência, e nenhum duplicado.
- **SC-006**: Em 100% dos timeouts simulados em escrita, nenhuma escrita é repetida antes da verificação, e o número final de agendamentos criados é o esperado.
- **SC-007**: Em 100% dos erros simulados com cada `code` previsto, a reação corresponde à tabela de FR-009, inclusive com mensagem de erro em outro idioma.
- **SC-008**: Ao fim de cada execução de teste, 0 agendamentos de teste permanecem abertos na Graces.
- **SC-009**: Em 100% dos testes u21 e u23, nenhum `idCliente` de terceiro com outro celular é gravado e nenhum cadastro é feito; a saída é `encaminhar_equipe` com o `motivo` correto.
- **SC-010**: Em 100% dos testes u22 e u24, terceiro com o mesmo celular é aceito e primeiro contato sem homônimo exato (ou nome de uma palavra) segue o fluxo previsto, sem cliente real novo nos testes.
- **SC-011**: Em 100% das respostas ao modelo e mensagens ao cliente dos testes de busca, nenhum celular de terceiro aparece; acima dos tetos, 100% das buscas/cadastros são recusados.
