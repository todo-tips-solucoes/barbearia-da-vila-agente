# Feature Specification: Recepção do WhatsApp com buffer de rajadas

**Feature**: `recepcao-buffer`
**Created**: 2026-10-18
**Status**: Draft
**Depende de**: `infra-base` (bancos, prefixos do armazenamento temporário por ambiente, deploy)

## User Scenarios & Testing

### User Story 1 - Descobrir o formato real dos eventos (Priority: P1)

Antes de qualquer lógica, o time precisa saber exatamente o que o Chat Master Veloz envia à conexão de TESTE (145, QR Pro): quais eventos existem, como identificar o contato, o tipo de mensagem (texto, áudio, imagem), mensagens enviadas pela própria loja e eventos que não são mensagem. A fonte é a captura de eventos reais, não a documentação, que avisa que os payloads mudam entre versões.

**Why this priority**: todo o resto depende do formato; supor campos viola a Constituição (XVI) e quebraria a feature 3.

**Independent Test**: com a captura ativa, o owner envia as mensagens combinadas; os eventos aparecem registrados e um conjunto anonimizado vira fixture versionado; ao final, o webhook da conexão volta à URL original.

**Acceptance Scenarios**:

1. **Given** a URL atual do webhook da conexão 145 registrada, **When** o webhook é trocado para o de captura e o owner envia texto, áudio, imagem e uma rajada, **Then** cada evento recebido fica guardado e é possível listar os tipos distintos observados.
2. **Given** a captura concluída, **When** o webhook original é restaurado, **Then** a configuração da conexão 145 volta a ser exatamente a URL anotada, e isso é conferido consultando a conexão.
3. **Given** os eventos capturados, **When** os fixtures são gerados, **Then** nenhum telefone, nome ou conteúdo real de cliente permanece, e a estrutura (campos, tipos, formas) é preservada.

---

### User Story 2 - Receber e validar a mensagem de um cliente (Priority: P1)

Quando um cliente escreve para a barbearia, a recepção aceita só o que é evento legítimo de mensagem recebida, descarta o resto sem erro e entrega ao próximo estágio uma mensagem normalizada (contato, tipo, conteúdo ou referência da mídia, momento).

**Why this priority**: é a entrada obrigatória do fluxo; sem ela o agente não recebe nada.

**Independent Test**: enviar ao endpoint de TESTE fixtures de texto, áudio, imagem, evento de outro tipo e payload malformado; só os válidos de mensagem recebida seguem adiante.

**Acceptance Scenarios**:

1. **Given** um evento de texto válido, **When** chega à recepção, **Then** é aceito e normalizado com o tipo "texto".
2. **Given** eventos de áudio e de imagem válidos, **When** chegam, **Then** são aceitos com o tipo correto e a referência da mídia preservada (transcrição e interpretação ficam para a feature 3).
3. **Given** um evento que não é mensagem de cliente (ex.: enviado pela própria loja, status, tipo desconhecido), **When** chega, **Then** é descartado sem acionar o buffer e sem resposta de erro ao Chat Master.
4. **Given** um payload malformado ou sem os campos mínimos, **When** chega, **Then** é rejeitado e o motivo fica registrado sem expor dados do cliente.
5. **Given** uma chamada sem a credencial esperada do webhook, **When** chega, **Then** é recusada.

---

### User Story 3 - Juntar rajadas em um único turno (Priority: P1)

Clientes escrevem em várias mensagens curtas seguidas. A recepção espera 8 segundos de silêncio daquele contato, reiniciando a espera a cada nova mensagem, e só então entrega todas as mensagens juntas, em ordem, como um único turno.

**Why this priority**: evita respostas duplicadas e fragmentadas; é requisito de produto.

**Independent Test**: enviar 3 mensagens com intervalos menores que 8 s e verificar uma única entrega com as 3 em ordem, ocorrendo cerca de 8 s após a última.

**Acceptance Scenarios**:

1. **Given** uma mensagem isolada, **When** passam 8 s sem novas mensagens do contato, **Then** ocorre exatamente uma entrega com essa mensagem.
2. **Given** três mensagens com menos de 8 s entre elas, **When** passam 8 s após a última, **Then** ocorre exatamente uma entrega com as três, na ordem de chegada.
3. **Given** uma mensagem chegando 5 s após a anterior, **When** o contador estava correndo, **Then** a espera reinicia e a entrega só acontece 8 s depois da nova mensagem.
4. **Given** mensagens de dois contatos diferentes ao mesmo tempo, **When** o prazo vence, **Then** cada contato recebe sua própria entrega, sem mistura de conteúdo.

---

### User Story 4 - Um turno por contato por vez (Priority: P2)

Enquanto o turno de um contato está em processamento, novas mensagens desse mesmo contato não iniciam um segundo processamento paralelo: ficam guardadas e formam o turno seguinte, processado depois do primeiro terminar.

**Why this priority**: impede respostas duplicadas e concorrência por contato, mas só importa depois que a entrega existe.

**Independent Test**: entregar um turno cujo processamento demora, enviar nova mensagem do mesmo contato durante o processamento e verificar que o segundo turno só começa após o fim do primeiro, sem perda.

**Acceptance Scenarios**:

1. **Given** um turno do contato em processamento, **When** chega nova mensagem dele, **Then** ela não gera processamento simultâneo e é entregue num turno posterior sem perda.
2. **Given** um processamento que falhou ou travou, **When** o tempo máximo de posse do contato expira, **Then** o contato é liberado e volta a ser atendido.
3. **Given** dois contatos distintos, **When** um está em processamento, **Then** o outro não é bloqueado.

---

### User Story 5 - Ambientes TESTE e PROD independentes (Priority: P2)

TESTE e PROD têm cada um seu endereço de webhook, identificador e armazenamento temporário, sem interferência. PROD fica parametrizado e inativo até o owner definir a conexão.

**Why this priority**: Constituição XIII; permite validar sem risco e entregar PROD sem refazer nada.

**Independent Test**: publicar TESTE e confirmar que um evento enviado ao endereço de TESTE não toca o armazenamento de PROD, e que o endereço de PROD não responde enquanto a conexão não for informada.

**Acceptance Scenarios**:

1. **Given** TESTE publicado, **When** eventos são processados, **Then** só são usados bancos e prefixos de TESTE.
2. **Given** a conexão de PROD ainda não definida, **When** o deploy de PROD é solicitado sem as autorizações exigidas pela infra-base, **Then** nada de PROD é ativado.
3. **Given** a conexão de PROD definida depois, **When** o owner informa o identificador da conexão e autoriza, **Then** PROD é ativado apenas trocando parâmetros, sem alterar a lógica.

---

### Edge Cases

- Mesma mensagem entregue duas vezes pelo Chat Master: não pode gerar turno duplicado.
- Mensagem chegando exatamente no instante em que o prazo de 8 s vence: entra no turno corrente ou no seguinte, nunca é perdida nem duplicada.
- Rajada muito longa (cliente nunca para de escrever): existe um teto máximo de espera total, para o turno não ficar adiado indefinidamente.
- Reinício ou indisponibilidade do armazenamento temporário durante a espera: o comportamento é definido e registrado (sem perda silenciosa).
- Mídia sem referência utilizável ou tipo não suportado (ex.: vídeo, figurinha): tratado de forma definida, sem quebrar o buffer.
- Mensagem de grupo ou de contato não individual, se o canal as enviar: tratada conforme a captura mostrar.
- Conteúdo de mensagens e telefones não podem aparecer em logs persistentes além do necessário (Constituição XIV).

## Requirements

### Functional Requirements

- **FR-001**: O sistema MUST registrar a URL de webhook vigente da conexão 145 antes de qualquer troca e MUST restaurá-la ao fim da captura, verificando a restauração.
- **FR-002**: O sistema MUST capturar eventos reais da conexão 145 cobrindo ao menos texto, áudio, imagem e rajada de mensagens, e MUST derivar o formato do payload apenas desses eventos.
- **FR-003**: Os fixtures versionados MUST ser anonimizados (sem telefone, nome ou conteúdo reais) preservando estrutura e tipos.
- **FR-004**: O formato do payload (campos, identificação do contato, tipo, mídia, direção da mensagem) MUST constar em contrato documentado com fonte nos eventos capturados; nenhum nome de campo pode ser suposto. Se a captura não puder ser feita (ex.: owner indisponível para enviar mensagens), a feature MUST aguardar via bloqueio humano; contrato provisório/suposto é proibido (ver Clarifications).
- **FR-005**: A recepção MUST autenticar a chamada do webhook e MUST recusar chamadas sem a credencial esperada.
- **FR-006**: A recepção MUST aceitar apenas eventos de mensagem recebida de um cliente e MUST descartar, sem erro ao remetente e sem acionar o buffer, eventos de outros tipos, mensagens enviadas pela própria loja e tipos não suportados.
- **FR-007**: A recepção MUST rejeitar payload malformado, registrando o motivo sem conteúdo pessoal.
- **FR-008**: A recepção MUST normalizar cada mensagem aceita em um formato interno único contendo contato, tipo (texto, áudio ou imagem), conteúdo ou referência da mídia e momento de chegada.
- **FR-009**: O sistema MUST manter, por contato, um buffer de mensagens com espera de 8 segundos reiniciada a cada nova mensagem do mesmo contato.
- **FR-010**: Ao fim da espera, o sistema MUST entregar ao estágio seguinte, uma única vez, todas as mensagens acumuladas do contato, em ordem de chegada.
- **FR-011**: O sistema MUST limitar a espera total máxima de uma rajada a um valor configurável. O teto default é 60 s, configurável (ver Clarifications).
- **FR-012**: O sistema MUST garantir no máximo um turno em processamento por contato, mantendo mensagens novas para o turno seguinte sem perda nem duplicação.
- **FR-013**: A posse do contato MUST expirar após um tempo máximo configurável, liberando-o se o processamento falhar ou travar.
- **FR-014**: O sistema MUST descartar mensagens duplicadas (mesmo evento entregue mais de uma vez) dentro de uma janela configurável.
- **FR-015**: Contatos diferentes MUST ser processados de forma independente, sem bloqueio nem mistura de conteúdo.
- **FR-016**: Cada ambiente (TESTE, PROD) MUST ter endereço de webhook, identificador e armazenamento temporário próprios e disjuntos, usando os prefixos definidos pela infra-base.
- **FR-017**: PROD MUST ficar parametrizado (conexão, endereço, identificador) e inativo até o owner informar a conexão e autorizar, sem alteração de lógica na ativação.
- **FR-018**: Os workflows MUST ser publicados pelo script de deploy da infra-base e validados pelo MCP nativo do n8n.
- **FR-019**: Logs e registros persistentes MUST NOT conter telefone ou texto de cliente além do estritamente necessário e MUST NOT conter segredos.
- **FR-020**: O sistema MUST expor ao estágio seguinte (feature 3) um contrato estável de entrega do turno (formato da mensagem normalizada e semântica de liberação do contato ao terminar).
- **FR-021**: A suíte de testes de TESTE MUST cobrir todos os cenários de aceitação acima usando os fixtures anonimizados e MUST limpar o que criar.

> Decisões de infraestrutura: scheduling não se aplica (reação a eventos); mutex entre execuções = FR-012/FR-013; idempotência = FR-014; backup N/A (armazenamento temporário descartável); rotação de chaves e refresh de token externo N/A.

### Key Entities

- **Evento recebido**: payload bruto enviado pelo Chat Master (forma conhecida só após a captura).
- **Mensagem normalizada**: contato, tipo, conteúdo ou referência de mídia, momento de chegada.
- **Buffer do contato**: mensagens acumuladas e prazo de espera vigente.
- **Posse do contato**: marca de que um turno está em processamento, com expiração.
- **Turno**: conjunto ordenado de mensagens entregue de uma vez ao estágio seguinte.
- **Fixture**: evento capturado e anonimizado, versionado para testes.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Em 100% das rajadas de teste (2 a 10 mensagens com menos de 8 s entre elas), há exatamente uma entrega por contato, com todas as mensagens em ordem.
- **SC-002**: A entrega ocorre entre 8 e 10 segundos após a última mensagem da rajada em 95% dos casos de teste.
- **SC-003**: Nenhum contato recebe dois turnos processados simultaneamente em 50 mensagens concorrentes de teste.
- **SC-004**: 100% dos eventos que não são mensagem de cliente são descartados sem erro ao remetente e sem acionar o buffer.
- **SC-005**: 0 telefones, nomes ou conteúdos reais nos fixtures e documentos versionados, verificado por varredura.
- **SC-006**: A URL original do webhook da conexão 145 está restaurada e conferida ao final da captura.
- **SC-007**: Nenhuma mensagem aceita é perdida em testes de reinício do armazenamento temporário e de falha de processamento (todas entregues ou registradas como falha).
- **SC-008**: Nenhuma operação de TESTE altera dados ou chaves de PROD.

## Clarifications

### Session 2026-10-18

- Q: Se a captura real não puder ser feita, aguarda ou segue com contrato provisório? -> A: Aguarda via bloqueio humano com o texto exato das mensagens a enviar; NUNCA contrato provisório. Fonte: Constitution VI (zero fabricação) e resposta do owner em block-001 (captura autorizada na conexão 145). Aplicado em FR-004.
- Q: Teto de espera total da rajada? -> A: 60 s, configurável (default proposto aceito; evita starvation sem cortar rajadas legítimas). Aplicado em FR-011.
