# Roteiros de atendimento (insumo da `suite-validacao`)

Proposta do agente. O owner delegou a escolha em 2026-10-21 ("vou seguir com as suas recomendações"); ajustes dele entram aqui antes da `suite-validacao` começar.

**Objetivo:** atendimento acolhedor e comercial. O cliente agenda ou tira a dúvida sem atrito, e o agente conduz para o
agendamento sem pressionar.

**Como roda:** cada roteiro dispara contra o webhook do TESTE. Sem agendamento: contato simulado 510-519 (505-509 são do
`smoke-mensagens`). Roteiros que agendam (R1, R5 a R9 e R11): índice >= 520, em fila serial, com o cliente de teste autorizado e a escrita
redirecionada ao barbeiro de teste (ZZ TESTE, nunca oferecido). A Graces é usada só com o barbeiro de teste, e o que o roteiro criar é cancelado no fim. A LLM avaliadora (`gpt-5.6-luna`) dá nota a cada
critério com a transcrição.

## Critérios comuns (valem para todos)

| Id | Critério |
|---|---|
| K1 | **Acolhimento.** Cumprimenta pelo nome quando conhece. Tom caloroso, sem formalidade de robô. Assume que é IA se perguntarem. |
| K2 | **Uma pergunta por mensagem.** No máximo 4 mensagens curtas por turno. |
| K3 | **Múltipla escolha sempre por lista**, com texto humano (Constituição X). |
| K4 | **Nada inventado.** Preço, serviço, horário e barbeiro vêm da Graces. Endereço e contatos vêm da config `loja`. O que o agente não sabe vira "não tenho essa informação" e o contato da loja. |
| K5 | **Condução comercial.** Toda dúvida respondida termina com um convite leve para agendar ("Quer que eu já veja um horário pra você?"), sem insistir depois de um não. |
| K6 | **O barbeiro de teste nunca aparece** para o cliente. |
| K7 | **Latência:** dentro do limite da suíte (ver "Parâmetros"). |

## Roteiros

| # | Situação | Falas do cliente (em ordem) | O que se espera |
|---|---|---|---|
| R1 | Primeiro contato, agenda direto | "Oi, boa tarde!" / "Queria cortar o cabelo amanhã à tarde" / escolhe na lista / "Pode confirmar" | Saudação acolhedora; identifica ou cadastra o cliente; oferece serviços e barbeiros por lista; todos os inícios em que o serviço cabe; resumo e confirmação; agendamento criado |
| R2 | Dúvida de preço antes de decidir | "Quanto custa o corte?" / "E a barba?" | Preço da Graces para cada serviço; não cita preço de `informacaoes_barbearia.txt` se divergir; convite para agendar (K5) |
| R3 | Onde fica e quando abre | "Vocês ficam onde?" / "Abre domingo?" | Endereço da config `loja`; horário da Graces; convite para agendar |
| R4 | Indeciso sobre o serviço | "Quero dar um trato no visual, não sei o que fazer" | Pergunta aberta e acolhedora; oferece os serviços reais por lista; não empurra o mais caro |
| R5 | Corte + barba no mesmo dia | "Quero cortar e fazer a barba sábado de manhã" | Encadeia os serviços (um agendamento por serviço); horários em sequência; resumo único |
| R6 | Agendar para o filho | "Queria marcar pro meu filho de 10 anos" | Pede o nome do filho, busca ou cadastra a pessoa; serviço infantil da Graces; nunca "2ª vez" |
| R7 | Cancelamento | "Preciso cancelar meu horário de sexta" | Sugere remarcar antes de cancelar; se o cliente insiste, cancela e confirma com carinho |
| R8 | "Cancelei, vamos marcar outro" | "Cancela o de sexta e marca pra segunda" | Entende o contexto: cancela e já oferece segunda, sem pedir tudo de novo |
| R9 | Reagendar | "Dá pra passar meu horário pra mais tarde?" | Mostra o agendamento atual, oferece os horários livres e reagenda |
| R10 | "Oi" depois de coleta abandonada | (coleta parada há mais de 2 h) "Oi" | Não retoma a coleta antiga; cumprimenta e pergunta como pode ajudar |
| R11 | Áudio | nota de voz "quero cortar amanhã de tarde" (`midia-real.local.json`) | Entende o áudio e segue como o R1 |
| R12 | Foto de referência | imagem de corte | Descreve o estilo com cuidado e sugere o serviço real mais próximo; não promete resultado |
| R13 | Pergunta sem resposta conhecida | "Vocês aceitam pix? Tem estacionamento?" | Não inventa (K4); diz que não tem essa informação e passa o contato da loja; convite para agendar |
| R14 | Fora do assunto | "Me indica um restaurante aí perto?" | Recusa gentil e reconduz para a barbearia |
| R15 | Cliente apressado ou irritado | "Tô atrasado 15 min, ainda dá?" | Empatia; não decide pela loja; passa o contato da loja ou o handoff (depois da C) |
| R16 | Confirmação da véspera | toque em "Confirmo" e, em outro roteiro, em "Não vou poder" | Status 3 na Graces / status 10 + oferta de remarcar (já coberto pelo `smoke-mensagens` m2, m3 e m7) |
| R17 | Pedido de humano | "Quero falar com uma pessoa" | **Depois da C:** handoff para o setor 78 e o agente para de responder. Antes da C: passa o contato da loja |

## Decisão pendente do owner, sem bloquear a suíte

- **Pacotes:** `informacaoes_barbearia.txt` diz "4 serviços com 20% de desconto", mas o agente não tem esse dado: não está
  na Graces nem na config. Até o owner confirmar que vale, o R2 espera que o agente **não** ofereça o pacote.

## Parâmetros da suíte (recomendação do agente; o owner delegou a decisão)

- **Latência**, da última mensagem do cliente até a primeira resposta:
  - p50 ≤ 15 s e p95 ≤ 25 s, contando a espera da rajada (`buffer.janela_s` 8 s);
  - acima de 25 s o roteiro falha.
  - Base medida: a resposta da confirmação levou de 2 a 9 s, com a Graces incluída (E2E de 20/10), e o turno com mídia
    teve p95 de 8,7 s mais a rajada (audio-imagem, SC-005).
- **Custo:**
  - a 1ª rodada mede os tokens reais por roteiro, porque o agente não sabe o preço por token do `gpt-5.6-luna`;
  - teto da 1ª rodada: 3 milhões de tokens, contando agente e avaliadora. É uma estimativa:
    17 roteiros × ~6 turnos × ~3 chamadas × ~8 mil tokens ≈ 2,4 milhões, com folga;
  - a partir da 2ª rodada, o teto passa a 2× o medido.
  - Ao bater no teto, a suíte termina o roteiro em curso, não começa outro e entrega relatório parcial. Os roteiros que
    sobram rodam na próxima execução, então a tarefa é sempre concluída.
- **Aprovação:** nota ≥ 4 de 5 em cada critério K1 a K6 e K7 dentro do limite. Todo dado factual tem de ter fonte
  (K4 eliminatório).

## Aprovação para o princípio XV

Só vale a rodada **completa com 17/17 roteiros aprovados** (e K7 da rodada dentro do limite). Relatório parcial, com roteiro
pulado, pendente ou `erro_infra` nunca conta como aprovação.
