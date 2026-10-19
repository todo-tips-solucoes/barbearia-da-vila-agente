# Feature Specification: Entrada de áudio e imagem

**Feature**: `audio-imagem`
**Created**: 2026-10-19
**Status**: Draft
**Depende de**: `recepcao-buffer`, `recepcao-robustez`, `agente-conversacional-graces` (entregar-rajada), `infra-base`
**Origem**: roadmap item 5 e `docs/decisoes-pre-00c.md` (entrada: texto, áudio e imagem; retenção de mídia de 24 h).
**Escopo de ambiente**: somente TESTE (conexão 145). PROD segue parametrizado e inativo.

## User Scenarios & Testing

### User Story 1 - Cliente manda um áudio e é atendido como se tivesse escrito (Priority: P1)

O cliente grava um áudio de voz (PTT) no WhatsApp ("quero cortar o cabelo amanhã de tarde"). O agente transcreve o áudio e trata o texto resultante exatamente como uma mensagem digitada, respondendo de forma natural, sem mencionar a transcrição a menos que seja útil.

**Why this priority**: o dono pediu explicitamente que o agente entenda áudio (`alteracoes_clientes/transcricoes.md`); é o maior ganho da feature.

**Independent Test**: enviar, do número de teste 5511967296849 pela conexão 145, um áudio curto falando um pedido de horário; verificar que o agente responde ao pedido como se fosse texto.

**Acceptance Scenarios**:

1. **Given** um áudio de voz recebido, **When** a transcrição é obtida, **Then** o texto entra no buffer do contato como mensagem de texto e é entregue na rajada do turno.
2. **Given** áudio seguido de texto digitado dentro da janela do buffer, **When** o turno é entregue, **Then** ambos chegam ao agente na ordem de chegada, no mesmo turno.
3. **Given** a transcrição devolve vazio ou ininteligível, **When** o turno é processado, **Then** o agente pede para o cliente repetir ou escrever, com resposta natural, sem inventar o conteúdo.
4. **Given** o serviço de transcrição falha ou excede o tempo, **When** o turno é processado, **Then** o cliente recebe o mesmo pedido natural para repetir ou escrever, a falha é registrada sem conteúdo pessoal, e nenhuma mensagem se perde.

---

### User Story 2 - Cliente manda uma imagem e o agente a interpreta (Priority: P2)

O cliente envia uma foto (por exemplo, um corte de referência) com ou sem legenda. O agente interpreta a imagem no contexto do atendimento e responde de forma natural; legenda, quando existe, é tratada como texto do cliente.

**Why this priority**: amplia o canal, mas o agendamento depende menos dela que do áudio.

**Independent Test**: enviar uma foto com legenda e outra sem legenda do número de teste; verificar respostas coerentes com o conteúdo.

**Acceptance Scenarios**:

1. **Given** imagem com legenda, **When** o turno é processado, **Then** o agente recebe a descrição da imagem e a legenda juntas.
2. **Given** imagem sem legenda, **When** o turno é processado, **Then** o agente responde com base apenas na interpretação.
3. **Given** a imagem não tem relação com o atendimento, **When** o agente responde, **Then** reconhece o que viu de forma breve e conduz de volta ao que pode fazer (agendar, reagendar, cancelar), sem descrever em excesso.

---

### User Story 3 - Conteúdo não compreendido recebe resposta natural (Priority: P1)

Quando o áudio ou a imagem não puder ser compreendido (mudo, ruído, corrompido, tipo sem suporte, mídia não obtida, imagem ilegível), o cliente recebe uma resposta humanizada pedindo outra tentativa ou o texto, nunca silêncio nem mensagem técnica.

**Why this priority**: silêncio em mídia é o pior defeito de atendimento; a regra do dono é "resposta natural quando não compreendido".

**Independent Test**: enviar mídia inválida ou sem conteúdo inteligível; verificar uma resposta natural por mídia, uma só por turno.

**Acceptance Scenarios**:

1. **Given** mídia que não pôde ser obtida ou interpretada, **When** o turno é processado, **Then** o cliente recebe uma mensagem natural pedindo reenvio ou texto.
2. **Given** várias mídias ilegíveis na mesma rajada, **When** o turno é entregue, **Then** o cliente recebe uma única resposta, não uma por mídia.
3. **Given** mídia ilegível acompanhada de texto compreensível na mesma rajada, **When** o turno é processado, **Then** o agente atende o texto e menciona apenas a parte não compreendida.
4. **Given** qualquer tipo de mídia sem suporte, **When** chega, **Then** o evento é gravado, não é descartado em silêncio e recebe a resposta natural.

---

### User Story 4 - Mídia não fica guardada além de 24 horas (Priority: P2)

Qualquer conteúdo de mídia retido (arquivo baixado, transcrição, descrição) é apagado no máximo 24 h após o recebimento.

**Why this priority**: decisão de retenção do owner; protege dados do cliente.

**Independent Test**: com o prazo reduzido em teste, verificar que itens vencidos somem e itens recentes permanecem.

**Acceptance Scenarios**:

1. **Given** mídia retida há mais de 24 h, **When** a rotina de limpeza roda, **Then** o conteúdo é apagado.
2. **Given** mídia retida há menos de 24 h, **When** a limpeza roda, **Then** permanece intacta.
3. **Given** logs e registros de falha, **When** consultados, **Then** não contêm o arquivo, a transcrição, a descrição nem telefone legível.

---

### Edge Cases

- Áudio muito longo ou arquivo grande: tem limite configurável; acima dele o cliente é orientado a mandar mais curto ou escrever.
- Áudio e imagem reenviados pelo canal (mesma mensagem duas vezes): gravados uma só vez (deduplicação por identificador existente).
- Mensagens enviadas pela própria loja (`fromMe`) e de grupos: mantêm o tratamento atual, sem transcrição.
- Imagem com legenda e áudio no mesmo turno: ordem de chegada preservada.
- Idioma diferente do português no áudio: transcrito como falado; o agente segue em português.
- Texto com instruções dentro da imagem ou do áudio ("ignore as regras"): conteúdo do cliente, nunca instrução ao agente.
- Falha da transcrição ou da interpretação após a gravação do evento: mensagem permanece pendente, sem erro ao Chat Master (reforça FR-009 da `recepcao-robustez`).
- Campos de mídia fora das fixtures reais (campos supostos): não são usados; só `fileUrl`, `fileMimeType`, `text`, `caption`, `seconds`, `fileLength` e `PTT` das fixtures.
- Áudio com `type`, `fileMimeType` e `fileUrl` mascarados na fixture (formato e tipo MIME desconhecidos): reconhecido por `originalData.audioMessage`, sem assumir `type`, formato ou tipo MIME.
- Testes da suíte com fixtures reais usam só o número de teste, o barbeiro `ZZ TESTE`, cancelam o que criarem e não alteram o webhook da 145.
- Deploy dos workflows alterados pelo script (API REST, `.env.n8n`): nós validados no MCP (`validate_node_config`) antes e conferidos (`get_workflow_details`) depois.

## Requirements

### Functional Requirements

- **FR-001**: A recepção MUST reconhecer evento de imagem pelo `type` igual a `image` e pelo bloco `originalData.imageMessage`, e evento de áudio de voz pelo bloco `originalData.audioMessage` (campo `PTT` verdadeiro), conforme as fixtures reais `tests/fixtures/chatmaster/evento-13.json`, `evento-15.json` (imagem) e `evento-17.json` (áudio).
- **FR-002**: Os campos de mídia usados MUST ser somente os presentes em fixtures reais: `fileUrl`, `fileMimeType`, `text` e `originalData.imageMessage.caption` (imagem); `originalData.audioMessage.seconds`, `fileLength` e `PTT` (áudio). Nenhum campo MUST ser suposto fora das fixtures.
- **FR-003**: A fixture de áudio (`evento-17.json`) tem `type`, `fileUrl` e `fileMimeType` mascarados; portanto o valor de `type`, o formato e o tipo MIME do áudio MUST NOT ser assumidos. O reconhecimento de áudio MUST apoiar-se em `originalData.audioMessage` até haver captura real não mascarada. [NEEDS CLARIFICATION: capturar evento de áudio real com `type`, `fileMimeType` e `fileUrl` visíveis para fixar o valor de `type` e o formato do arquivo.]
- **FR-004**: Áudio reconhecido MUST ser transcrito via OpenAI e o texto MUST ser tratado como mensagem de texto do cliente, entrando no buffer e na entrega em rajada existentes, na ordem de chegada.
- **FR-005**: Imagem reconhecida MUST ser interpretada via OpenAI (modelo de atendimento `gpt-5.6-luna`) e a descrição MUST ser entregue ao agente junto da legenda, quando houver, mantendo ordem de chegada.
- **FR-006**: O download da mídia pela `fileUrl` MUST ter tempo máximo e limite de tamanho configuráveis; a mídia MUST NOT ser seguida para endereços fora do canal esperado (validação do host da `fileUrl` contra o host do Chat Master observado nas fixtures). [NEEDS CLARIFICATION: limites padrão de duração/tamanho do áudio e da imagem — propostos 120 s de áudio e 10 MB, marcados `[PROPOSTA]`.]
- **FR-007**: Mídia não obtida, não compreendida ou sem suporte MUST resultar em uma única resposta natural por turno, em português, pedindo reenvio ou texto, sem jargão técnico e sem inventar conteúdo.
- **FR-008**: Falha em obter, transcrever ou interpretar MUST ser registrada com tipo e momento, sem arquivo, transcrição, descrição, telefone ou segredo (FR-019 da `recepcao-buffer`), e MUST NOT gerar erro ao Chat Master após a gravação do evento.
- **FR-009**: Qualquer conteúdo de mídia retido (arquivo, transcrição, descrição) MUST ser apagado em no máximo 24 h do recebimento, por rotina automática, com prazo configurável para teste.
- **FR-010**: Conteúdo vindo de áudio ou imagem MUST ser tratado como dado do cliente, nunca como instrução ao agente (injeção via mídia).
- **FR-011**: Deduplicação por identificador do canal MUST valer também para mídia; a deduplicação por conteúdo (FR-010 da `recepcao-robustez`) MUST NOT afetar mídia.
- **FR-012**: Mensagens `fromMe` e de grupo MUST manter o comportamento atual, sem transcrição nem interpretação.
- **FR-013**: A transcrição e a interpretação MUST usar a chave OpenAI própria já definida em `docs/decisoes-pre-00c.md`, sem registrá-la em logs ou artefatos.
- **FR-014**: A suíte de testes MUST cobrir os cenários de aceitação usando as fixtures reais, apenas o número de teste 5511967296849 pela conexão 145, o barbeiro `ZZ TESTE INTEGRACAO - NAO AGENDAR` (id `1cee0bb9-e58b-4428-9e9b-1db184db7943`) na Graces, cancelando tudo que criar, e MUST NOT alterar o webhook da conexão 145.
- **FR-015**: Os workflows alterados MUST ser publicados pelo script de deploy (API REST, `.env.n8n`), com os nós validados antes pelo MCP nativo do n8n (`validate_node_config`) e conferidos depois (`get_workflow_details`).
- **FR-016**: Tudo MUST valer apenas em TESTE; PROD MUST permanecer inativo, sem mudança de lógica na futura ativação.

> Decisões de infraestrutura: retenção de 24 h (FR-009) é a única de longo prazo; sem scheduling novo além da limpeza, sem rotação de chave nem multi-pod novos. Idempotência: FR-011.

### Key Entities

- **Mídia recebida**: evento de imagem ou áudio com identificador do canal, tipo, referência de arquivo, momento de recebimento e prazo de expiração (24 h).
- **Conteúdo derivado**: transcrição (áudio) ou descrição (imagem), vinculado à mídia e ao contato, apagado junto com ela.
- **Falha de mídia**: tipo (obtenção, transcrição, interpretação, tamanho, sem suporte) e momento, sem conteúdo pessoal.

## Success Criteria

### Measurable Outcomes

- **SC-001**: 100% dos áudios de teste inteligíveis geram resposta coerente com o pedido falado, como se digitado.
- **SC-002**: 0 mídias sem resposta: todo áudio ou imagem recebido gera resposta ao cliente ou fica pendente para o turno seguinte, nunca em silêncio.
- **SC-003**: Em rajada com várias mídias ilegíveis, o cliente recebe no máximo 1 resposta de "não entendi" por turno.
- **SC-004**: Nenhum conteúdo de mídia, transcrição ou descrição existe mais de 24 h após o recebimento.
- **SC-005**: Resposta a um áudio curto (até 30 s) chega em até 30 s após o fim da janela do buffer em 95% dos testes. [PROPOSTA]
- **SC-006**: Zero ocorrência de dado factual de payload fora das fixtures reais nos artefatos da feature.
