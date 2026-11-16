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
| K4 | **Nada inventado.** Preço, serviço, horário e barbeiro vêm da Graces. Endereço e contatos vêm da config `loja`. O que o agente não sabe vira "não tenho essa informação" e a oferta de passar para a equipe, que atende por esta mesma conversa (owner, 2026-11-16). |
| K5 | **Condução comercial.** Toda dúvida respondida termina com um convite leve para agendar ("Quer que eu já veja um horário pra você?"), sem insistir depois de um não. |
| K6 | **O barbeiro de teste nunca aparece** para o cliente. |
| K7 | **Latência:** dentro do limite da suíte (ver "Parâmetros"). |

## Roteiros

| # | Situação | Falas do cliente (em ordem) | O que se espera |
|---|---|---|---|
| R1 | Primeiro contato, agenda direto | "Oi, boa tarde!" / "Queria cortar o cabelo amanhã à tarde" / escolhe na lista / "Pode confirmar" | Saudação acolhedora; identifica ou cadastra o cliente; oferece serviços e barbeiros por lista; todos os inícios em que o serviço cabe; resumo e confirmação; agendamento criado |
| R2 | Dúvida de preço antes de decidir (revisto em 2026-11-16) | "Quanto custa o corte?" / "E a barba?" | Cliente sem cadastro: responde direto, sem pedir cadastro (o cadastro só é feito na hora de marcar um horário); Preço da Graces para cada serviço; Não cita preço de informacaoes_barbearia.txt se divergir; Não oferece o pacote de 4 serviços com 20% de desconto (sem fonte; reprova K4); Convite para agendar (K5) |
| R3 | Onde fica e quando abre (revisto em 2026-11-16) | "Vocês ficam onde?" / "Abre domingo?" / "Então quero marcar um corte" | Cliente sem cadastro: responde o endereço direto, sem pedir cadastro; Responde se abre no domingo pelo horário da Graces, também sem pedir cadastro; Convite leve para agendar depois de cada resposta; Quando o cliente pede para marcar, segue o fluxo normal (pergunta ou lista o serviço, o dia ou o horário) ainda sem pedir cadastro: o cadastro só vem quando houver um horário escolhido |
| R4 | Indeciso sobre o serviço (revisto em 2026-11-16) | "Quero dar um trato no visual, não sei o que fazer" | Cliente sem cadastro: responde direto, sem pedir cadastro (o cadastro só é feito na hora de marcar um horário); Pergunta aberta e acolhedora; Oferece os serviços reais por lista; Não empurra o mais caro |
| R5 | Corte + barba no mesmo dia | "Quero cortar e fazer a barba sábado de manhã" | Encadeia os serviços (um agendamento por serviço); horários em sequência; resumo único |
| R6 | Agendar para o filho | "Queria marcar pro meu filho de 10 anos" | Pede o nome do filho, busca ou cadastra a pessoa; serviço infantil da Graces; nunca "2ª vez" |
| R7 | Cancelamento | "Preciso cancelar meu horário de sexta" | Sugere remarcar antes de cancelar; se o cliente insiste, cancela e confirma com carinho |
| R8 | "Cancelei, vamos marcar outro" | "Cancela o de sexta e marca pra segunda" | Entende o contexto: cancela e já oferece segunda, sem pedir tudo de novo |
| R9 | Reagendar | "Dá pra passar meu horário pra mais tarde?" | Mostra o agendamento atual, oferece os horários livres e reagenda |
| R10 | Oi depois de coleta abandonada (revisto em 2026-11-16) | "Oi" | Cumprimenta e pergunta como pode ajudar, sem pedir cadastro; Não retoma a coleta antiga |
| R11 | Áudio | nota de voz "quero cortar amanhã de tarde" (`midia-real.local.json`) | Entende o áudio e segue como o R1 |
| R12 | Foto de referência (revisto em 2026-11-16) | [imagem] | Cliente sem cadastro: responde direto, sem pedir cadastro (o cadastro só é feito na hora de marcar um horário); Descreve o estilo com cuidado; Sugere o serviço real mais próximo; Não promete resultado |
| R13 | Pergunta sem resposta conhecida (revisto em 2026-11-16) | "Vocês aceitam pix? Tem estacionamento?" | Cliente sem cadastro: responde direto, sem pedir cadastro (o cadastro só é feito na hora de marcar um horário); Não inventa (K4); Convite para agendar; Diz que não tem essa informação e oferece passar para a equipe, que responde por esta mesma conversa; não manda e-mail, Instagram nem telefone |
| R14 | Fora do assunto (revisto em 2026-11-16) | "Me indica um restaurante aí perto?" | Cliente sem cadastro: responde direto, sem pedir cadastro (o cadastro só é feito na hora de marcar um horário); Recusa gentil; Reconduz para a barbearia |
| R15 | Cliente apressado ou irritado | "Tô atrasado 15 min, ainda dá?" | Empatia; não decide pela loja; transfere para a equipe confirmar (conferido no estado da conversa) |
| R16 | Confirmação da véspera | toque em "Confirmo" e, em outro roteiro, em "Não vou poder" | Status 3 na Graces / status 10 + oferta de remarcar (já coberto pelo `smoke-mensagens` m2, m3, m7 e m8; o m8 confere que a resposta a um lembrete de dois serviços vale para os dois) |
| R17 | Pedido de humano | "Quero falar com uma pessoa" | Transfere para a equipe (TESTE: setor 78) e o agente para de responder; sem e-mail, Instagram nem telefone |
| R18 | Memória do barbeiro e busca exata (revisto em 2026-11-16) | "Bom dia, vocês atendem criança?" / "Quem tem horário amanhã?" / "O Pedro tem?" / "Na verdade o corte é pra mim, adulto" / "corte adulto" | Cliente sem cadastro: responde direto, sem pedir cadastro (o cadastro só é feito na hora de marcar um horário); consulta de horários livres também sai sem cadastro; Mostra o serviço infantil com preço; Diz pelo nome quais barbeiros têm horário amanhã; quantos horários cada um tem e quem não tem vêm do resumo por barbeiro da ferramenta (a lista mostra um barbeiro por horário), não é invenção; Busca os horários do Pedro direto, sem pedir confirmação do que o cliente quis dizer; Ao trocar para adulto, oferece os serviços adultos como lista sem perguntar o barbeiro; Escolhido o corte adulto, mantém o Pedro: não pergunta com qual barbeiro; pergunta em texto qual horário fica melhor (regra de 2026-10-28) ou mostra os horários dele em lista (ou diz que ele não tem/faz o serviço) |
| R19 | Pergunta o horário antes de listar (alteração 1, 2026-10-28) | "Quero cortar o cabelo amanhã, pode ser com qualquer barbeiro" / "umas 2 da tarde" / escolhe / "Pode confirmar" | Usa o serviço do último atendimento; com o dia definido e sem período nem hora, pergunta qual horário fica melhor, sem lista; depois lista só os inícios perto da hora dita (ou vai direto ao resumo se ela estiver livre) |
| R20 | Agenda pelo último corte (alteração 2, 2026-11-14) | "Oi, quero marcar um horário" / "Amanhã, em qualquer horário" / escolhe / "Pode confirmar" | Chama pelo nome; propõe repetir serviço e barbeiro do histórico da Graces e pergunta dia e horário de uma vez; resumo com serviço, data e horário |
| R21 | Pede o Jayme (revisto em 2026-11-16) | "Quero cortar o cabelo com o Jayme amanhã" / "Fábio Gomes Pinto, 07/04/1990, pelo Instagram" | Cliente sem cadastro que pede um barbeiro que só a equipe agenda: antes de transferir, faz o cadastro rápido (nome completo, data de nascimento, como conheceu), para a equipe recebê-lo pronto; Depois do cadastro, diz com gentileza que vai transferir para o atendimento humano continuar o agendamento com o Jayme; Não mostra horários nem lista de barbeiros e não agenda com o Jayme |
| R22 | Barbeiro antes dos horários (revisto em 2026-11-16) | "Quero cortar o cabelo amanhã à tarde" / "corte adulto" | Cliente sem cadastro: responde direto, sem pedir cadastro (o cadastro só é feito na hora de marcar um horário); Oferece os serviços de corte por lista; Escolhido o corte adulto, pergunta o barbeiro de preferência por lista, antes de mostrar qualquer horário; A lista de barbeiros não tem o Jayme |
| R23 | Cliente pede para cortar só o cabelo (revisto em 2026-11-16) | "Boa tarde! Quero cortar só o cabelo, quais opções vocês têm?" | Cliente sem cadastro: responde direto, sem pedir cadastro (o cadastro só é feito na hora de marcar um horário); Oferece por lista os serviços de corte de cabelo, incluindo o corte adulto (só o corte, sem barba); Não oferece apenas os combos de cabelo com barba |
| R24 | Já é cliente, mas o número não tem cadastro (revisto em 2026-11-16) | "Oi, quero marcar um corte" / "Eu já sou cliente de vocês, já cortei aí várias vezes" / "Não tenho mais aquele número" | Na primeira resposta segue o fluxo normal (pergunta ou lista o serviço), sem pedir cadastro; Quando ele diz que já é cliente, não cadastra: explica que o cadastro deve estar com outro número e pede, com gentileza, que o contato seja feito pelo número do cadastro; Quando ele diz que não é possível, passa para a equipe continuar por esta mesma conversa; Não manda e-mail, Instagram nem telefone |
| R25 | Aviso de que está a caminho (2026-11-16) | "Estou a caminho!" | Resposta curta e simpática; sem cadastro, sem contatos e sem transferir |
| R26 | Cadastro só na hora de marcar (2026-11-16) | "Quero cortar o cabelo amanhã, corte adulto, pode ser com qualquer barbeiro e em qualquer horário" / "Pode ser o primeiro horário da lista" / "João Pedro Almeida, 10/10/1990, indicação de um amigo" | Na primeira resposta mostra os horários livres de amanhã em lista, sem pedir cadastro e sem escolher um horário pelo cliente; Quando o cliente escolhe o horário, pede o cadastro rápido antes do resumo: nome completo, data de nascimento e como conheceu a barbearia; Recebidos os dados, confirma o cadastro em poucas palavras e manda o resumo com serviço, barbeiro, data e horário, perguntando se pode confirmar; Não diz que está agendado nem reservado antes do sim do cliente |

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

Só vale a rodada **completa com todos os roteiros aprovados** (26 em 2026-11-16: R18 memória do barbeiro e busca exata, R19 pergunta o horário antes de listar, R20 agenda pelo último corte, R21 Jayme só pela equipe, R22 barbeiro antes dos horários, R23 só o corte de cabelo, R24 já é cliente em número sem cadastro, R25 aviso de que está a caminho; a transferência para a equipe é conferida no estado da conversa nos roteiros com a marca `handoff`; desde 2026-11-14 os roteiros sem agenda usam contato sem cadastro; desde 2026-11-16 a dúvida e a consulta de horários saem sem cadastro, que só é pedido na hora de marcar (R26)) (e K7 da rodada dentro do limite). Relatório parcial, com roteiro
pulado, pendente ou `erro_infra` nunca conta como aprovação.
