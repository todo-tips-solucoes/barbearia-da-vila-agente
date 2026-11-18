# Melhorias do atendimento: análises de 14 a 16/11/2026

Análise das 282 mensagens de 21 contatos de PROD (2 de spam), feita em 2026-11-16 a pedido do owner. O agente resolveu 9 dos 19 clientes reais. A leitura do banco foi feita pelo owner, com um script só de leitura.

## Feito (PR de 2026-11-16)

| # | Problema | Correção |
|---|---|---|
| 1 | "Cabelo" só achava os combos com barba; quem pedia só o corte recebia as opções de R$ 150 e R$ 130 | "cabelo" e "cortar" buscam os cortes de cabelo; com "barba", os combos |
| 2 | Remarcação trocava o barbeiro em silêncio | Mantém o barbeiro do agendamento; outro só se o cliente pedir |
| 3 | "Lotado" olhando um barbeiro só | Barbeiro habitual sem horário: mostra os outros e avisa; barbeiro escolhido: diz que ele não tem |
| 4 | Respostas duplicadas quando o cliente escreve antes de ler a resposta anterior | O turno seguinte é avisado e não reenvia o que acabou de sair |
| 5 | Mensagem de cliente sem resposta por 2h25: a chamada à OpenAI travou sem tempo limite e o n8n matou a execução aos 5 min, em silêncio | Tempo limite de 45 s e 1 retentativa no modelo (cai na contingência); o vigia fecha o turno preso e avisa o cliente (2026-11-16) |
| 6 | Conversas abandonadas sem retomada | Uma retomada, 2 h depois da última mensagem do agente, só para quem parou no meio de um agendamento (2026-11-16) |
| 7 | Quem dizia "já sou cliente" era cadastrado de novo | Não cadastra: explica que o cadastro deve estar com outro número e transfere para a equipe localizar. O convite ao cadastro avisa que, se já for cliente, é só dizer (2026-11-16) |
| 8 | Cadastro exigido antes de pergunta simples | Horário de funcionamento e endereço são respondidos sem cadastro; o cadastro começa quando o cliente quer agendar ou pergunta outra coisa (2026-11-16) |
| 9 | Becos sem saída com e-mail e Instagram | A equipe atende na mesma conversa: pedido de pessoa e atraso transferem direto; o que o agente não resolve vira oferta de passar para a equipe. E-mail e Instagram só se o cliente pedir. "Estou a caminho" recebe resposta curta (2026-11-16) |
| 10 | Lista de serviços em ordem alfabética: sem filtro apareciam os 10 primeiros e o corte adulto era o 13º | Os mais pedidos vêm primeiro, na ordem medida na agenda (`graces.servicos_destaque`); os demais seguem depois (2026-11-16) |
| 11 | Dois lembretes para quem tem dois serviços, e o "SIM" ficava ambíguo | Um lembrete só por cliente e dia, citando todos os serviços que começam até 2 h depois do primeiro (`mensagens.juntar_min`); a resposta SIM ou NÃO vale para todos (2026-11-16) |

## Segunda análise: 16/11/2026, dia inteiro

Leitura das 06:40 às 17:36 de 16/11 (segunda-feira), feita pelo owner com o script só de leitura: 560 mensagens de 53 contatos, 264 atendimentos do agente. Tempo de resposta: 9,8 s na mediana e 17,1 s no percentil 95. Nenhuma mensagem ficou sem resposta e nenhum atendimento travou.

| Indicador do dia | Resultado |
|---|---|
| Agendamentos feitos pelo agente | 10, mais 1 remarcação e 1 cancelamento |
| Agendamentos que pararam na confirmação ou antes | 8 |
| Lembretes de 24 h enviados | 17; 15 clientes responderam; 13 respostas registradas (12 sim, 1 não) |
| Transferências para a equipe | 12: 4 pelo Jayme, 5 por algo que o agente não resolveu, 2 por "já sou cliente", 1 por atraso |
| Retomadas enviadas | 5; 2 respostas; nenhuma virou agendamento |
| Clientes que demonstraram irritação | 4 |

O que já se vê funcionando: a lista de serviços abre com o corte adulto, a resposta SIM vale para os dois serviços do mesmo lembrete, quem diz que já é cliente não é cadastrado de novo, e a equipe assume depois da transferência (pelo ritmo das respostas dos clientes, entre 8 min e 1 h 20 depois).

## Decisões do owner sobre a segunda análise (2026-11-16)

- **Cadastro só para agendar.** Preço, serviços e horários livres saem sem cadastro; o cadastro é pedido na hora de marcar.
- **Outra pessoa ou cadastro em outro número.** Pedir que o contato seja feito pelo número do cadastro; se não for possível, transferir para a equipe. Interpretação adotada: criança ou dependente sem cadastro próprio, trazido pelo titular do número, segue sendo agendado no cadastro do titular.
- **Fila humana.** Enquanto a conversa está na fila de atendimento humano, o agente não interage. Sem interação há mais de 30 minutos, o atendimento humano pode ser encerrado.
- **Descrição dos serviços (item 22).** Fica para depois dos demais. Ideia do owner: para quem não é cliente, oferecer um conjunto curto de serviços "coringa" por categoria (por exemplo, em barba: barboterapia, barba express e a barba mais cara do catálogo; o mesmo em cabelo). O desenho será feito junto com o owner.
- **Todos os outros itens: corrigir.** O item 21 (Jayme nos lembretes) aguarda a resposta do owner à explicação.

## Feito depois da segunda análise

| # | Correção | Como |
|---|---|---|
| 13 | Cadastro só na hora de marcar | Dúvidas e horários livres sem cadastro; a ferramenta de agendar pede o cadastro antes do resumo. Quem diz que já é cliente é orientado a chamar pelo número do cadastro e, se não puder, vai para a equipe |
| 14 | O cliente é quem escolhe | No turno da busca, a ferramenta só aceita o horário pedido que está livre ou o único da lista; os demais esperam a escolha do cliente |
| 15 | Serviço presumido (parcial) | Último serviço infantil ou juvenil não é presumido quando a mensagem não fala da criança; horário que o cliente diz já ter é conferido antes de criar outro. Falta levar os agendamentos futuros ao contexto da conversa |
| 18 | Laços e irritação | Mesma pergunta no máximo duas vezes; depois muda a abordagem ou oferece a equipe. Sinal de irritação leva à oferta da equipe |
| 23 | Ação já concluída | A escrita dos últimos 10 minutos entra no contexto: repetir o pedido recebe "já está feito" |
| 24 | Confirmação antes da pergunta | A proposta só é executada por mensagem que chegou depois do pedido de confirmação |
| 25 | Texto quebrado e lista de cadastros (parcial) | Frase que ficava pela metade quando as opções viravam lista é descartada; com vários cadastros no telefone, a pergunta vai junto com a lista |
| 16 | Agente calado na fila humana | O silêncio segue o ticket: enquanto ele está na fila de atendimento humano o agente não responde, mesmo horas depois. Atendimento humano sem interação há 30 min é encerrado, desde que a equipe já tenha respondido |
| 17 | Mensagens da equipe no histórico (parcial) | O que a equipe escreve na fila humana entra no histórico da conversa. Mensagem escrita pela equipe fora da fila humana ainda não é registrada |
| 19 | Respostas a lembrete | Resposta no primeiro minuto é reconhecida; erro 400 da Graces tenta de novo com a data da ocorrência (hipótese: agendamento recorrente); "combinado" e "estarei aí" contam como confirmação; depois do NÃO, o pedido de cancelar não volta à pergunta |
| 20 | Retomada no contexto | Resposta até 12 h depois continua a conversa; proposta vencida não é retomada; horário para as próximas 6 h é retomado em 20 min |
| 12 | Pacote ou plano (provisório) | O agente agenda normalmente, avisa que o valor é o avulso e passa para a equipe abater o pacote. Falta agendar pelo pacote na API da Graces, o que depende de um pacote de teste no cliente de teste |

## Pendente, por prioridade

Compilado do que as duas análises encontraram e ainda não foi corrigido. "Decisão" marca o que depende do owner.

| # | Problema | Evidência em 16/11 | Sugestão |
|---|---|---|---|
| 12 | **Cliente com pacote ou plano fica sem agendamento.** O agente trava no valor avulso e transfere, sem reservar o horário | 4 casos: 2 transferidos sem horário, 1 irritado, 1 em andamento | A API da Graces lista os pacotes do cliente (`GET /agenda/pacotes`) e agenda abatendo deles (`idClienteItemPacote` no `POST /agenda`). Consultar antes de propor e agendar pelo pacote |
| 15 | **Serviço presumido errado.** Telefone do filho no cadastro vira "corte infantil" para o pai; quem tem barba marcada recebe proposta de corte | 3 casos; 1 terminou em "é só barba" e desistência | Dizer o serviço presumido na primeira resposta e pedir confirmação; olhar os agendamentos do dia antes de propor um novo |
| 17 | **O agente não vê o que a equipe escreveu.** Respostas do cliente à equipe chegam sem contexto | 2 casos de laço: "essa IA aí tá querendo dominar" | Gravar as mensagens da equipe no histórico da conversa |
| 21 | **Clientes do Jayme recebem lembrete e confirmação do agente**, e o agente cita "com o Jayme" ao falar de agendamento existente | 3 casos | **Decisão**: manter, ou tirar os agendamentos do Jayme dos lembretes e transferir quem perguntar por eles |
| 22 | **O agente não sabe descrever serviços nem dados da loja** | "o que é a express?", "barba italiana", "fazem platinado?", "sexta é feriado, ele trabalha?" | Glossário curto dos serviços e calendário de feriados no config. **Decisão**: o owner fornece o conteúdo |
| 25 | **Lista que não combina com o texto, e texto quebrado quando as opções viram lista** | "Posso te ajudar a. Qual fica melhor pra você?"; saudação com lista anexada | Só anexar a lista quando o texto pede aquela escolha; não cortar a frase ao extrair as opções |
| 26 | **Falta registro para auditar** | Os itens das listas e as mensagens da equipe não ficam no banco; a tabela de transferências está vazia | Gravar os itens da lista enviada e o início e o fim de cada transferência |

## Menores

- Telefone compartilhado entre pai e filho: o agente supôs corte infantil para o pai, porque o cadastro do telefone é do filho.
- Título de lista cortado em 24 caracteres ("Corte Infantil ate 11 an") repetido ao cliente no texto.
- Resposta livre a lembrete ("estarei por aí"): não virou confirmação (visto em 15/11). Faz parte do item 19.
- Saudação cortada pelo filtro de repetição: a resposta sai como "😊 Como posso ajudar hoje?" (3 casos em 16/11).
- Barbeiro habitual sem horário: a orientação nova já oferece outro dia com ele; falta uma busca do "próximo horário" por período, que hoje custa várias perguntas.
- "Último barbeiro que me atendeu": o agente disse que não conseguia identificar.
- "8 e 30" sem dizer manhã ou noite: o agente assumiu manhã.
- "Aumentou?": o agente afirmou que o valor foi atualizado sem ter o preço anterior.
- Agendamentos recorrentes continuam sem lembrete (limitação conhecida da reconciliação).
- Agendamento feito pelo agente e replanejado pela equipe depois da transferência: o horário original pode ficar ocupado.
- Quem pediu para agendar e parou na lista de serviços não recebe retomada.

## Revisão da solução aplicada (17/11/2026)

Depois da publicação das correções, o owner relatou atendimentos ainda confusos na manhã de 17/11. Três revisões independentes (atendimento, arquitetura e segurança) leram o que foi aplicado, sem acesso às conversas do dia. Conclusão: as correções entraram quase todas como texto no prompt, e os defeitos que mais confundem estavam no código.

### Decisões do owner (17/11)

- **Fila humana sem interação há 30 minutos:** encerra também quando o cliente falou por último; nesse caso o cliente recebe um aviso (`textos.fila_sem_resposta`). Consequência assumida: o pedido sai da fila da equipe.
- **Teto de agendamentos por contato por dia:** 3; acima disso, transfere para a equipe (etapa 3).
- **Item 21 (Jayme):** manter os lembretes e as confirmações dos agendamentos dele.
- **OpenAI:** chave separada para o TESTE, com orçamento próprio (depende de o owner criar a chave e a credencial no n8n).

### Etapa 1: feito

| Defeito | Correção |
|---|---|
| Depois de uma transferência, se a equipe devolvia ou encerrava o ticket, o agente respondia mas toda ferramenta recusava com `handoff_ativo` | A regra da fila humana virou `bvTransferido` (testada): com o ticket fora da fila humana, a marca da transferência é apagada |
| O pedido de confirmação saía com a lista de horários da busca do mesmo turno | O resumo com pedido de confirmação nunca leva lista de horários |
| Resposta à retomada exigia confirmar duas vezes (proposta vale 30 min, retomada sai aos 120) | A retomada mantém a proposta válida pelo prazo de resposta (`retomada.resposta_max_min`) |
| Acima de 20 turnos por hora o agente dizia que a equipe ia ajudar e não transferia | O limite transfere de verdade (motivo `nao_resolvi`) |
| `**negrito**` de Markdown ia cru ao WhatsApp | Vira `*negrito*` |
| Buscar e cadastrar outra pessoa só eram proibidos no prompt | As três ferramentas saíram do agente e `terceiro.cadastro_liberado` foi desligado em PROD. O código delas em `shared/graces.js` fica para a etapa 4 |
| Ticket na fila humana com o cliente por último nunca fechava; falha no encerramento repetia a cada 5 min | Encerra em 30 min nos dois casos (com aviso ao cliente quando ele falou por último); o estado local sai mesmo se o Chat Master recusar, e a falha é registrada uma vez |
| O vigia podia encerrar um ticket diferente do que a equipe usou; eco de lembrete agendado contava como resposta da equipe | A mensagem da equipe grava o ticket do evento; texto igual ao de um lembrete agendado do contato não conta |
| Falha de rede na transferência deixava o cliente avisado e o ticket na fila do agente | A transferência tenta de novo uma vez |

Não exercitado fora de PROD: a chamada que encerra o ticket no Chat Master (`handoff.encerrar_ativo` é desligado no TESTE).

### Etapa 2: feito (estado para o modelo)

| Defeito | Correção |
|---|---|
| "Muda pra quarta" virava um segundo agendamento: o modelo não sabia o que o cliente já tinha marcado | Os agendamentos futuros são lidos na identificação (junto do último atendimento), ficam em `pedido.futuros`, entram no contexto e são atualizados a cada escrita da conversa e a cada `meus_agendamentos` |
| Nada avisava de um agendamento repetido | A fase 1 de `agendar` devolve `ja_tem` quando o cliente já tem horário no mesmo dia ou do mesmo serviço; o agente manda o resumo, avisa numa frase e pergunta só se pode confirmar mais este (o "sim" confirma; se for para trocar, segue para reagendar) |
| O dia da semana do resumo e o texto de "agendado" eram montados pelo modelo | O resumo sai da ferramenta com o dia da semana (`bvDiaSemana`), e a escrita devolve `feito` com o texto do que ficou agendado, remarcado ou cancelado |
| A mensagem da equipe aparecia para o modelo como fala do agente; responder à equipe depois de 2 h perdia o histórico | Rótulo "Equipe:" na conversa recente (`bvLinhaHistorico`), e a mensagem da equipe conta como atividade na recência |
| Cadastro em três mensagens, uma pergunta em cada | Um pedido só, com nome completo, data de nascimento e como conheceu; sem a data ou sem o "como conheceu", cadastra sem perguntar de novo |
| Texto digitado pelo cliente entrava cru no contexto e podia simular uma fala do atendente | Texto do cliente e da equipe vira uma linha só, sem cabeçalho de papel, como já era com o áudio; o resumo da confirmação pendente também |

Ajuste da etapa 1 achado pela suíte (R8): a regra "pedido de confirmação sem lista de horários" também tirava a lista quando a proposta do turno era de cancelar ("cancela o de quarta e marca pra segunda" busca os horários de segunda no mesmo turno). Agora só a proposta de agendar ou remarcar tira a lista.

Datas (suíte R8, numa quarta): "marca pra segunda" saía ora na segunda seguinte, ora na outra. O contexto passou a trazer os próximos sete dias com o dia da semana (`bvDatas`), e a avaliadora recebe o mesmo calendário. Na remarcação com lista de qualquer barbeiro, a ferramenta manda não citar barbeiro pelo nome.

Suíte: os roteiros com agenda limpam o barbeiro de teste antes de começar, e a avaliadora recebe os agendamentos futuros do cliente de teste (ele é um cadastro real, com agendamentos próprios).

Limite conhecido: telefone com vários cadastros (`escolher_cliente`) não lê os agendamentos futuros nem o último atendimento.

### Etapas seguintes

3. **Duplicação, banco e limites:** índice `mensagens_agendadas (contato_id, tipo, inicio)`; regra única de "confirmação respondível" (hoje em 5 consultas); bloco de configuração e trava de simulação num lugar só; posse do contato (120 s) menor que o turno (até 300 s); teto de agendamentos por contato; limite de taxa no webhook; mídia interpretada só depois de decidir o silêncio.
4. **Prompt e cobertura:** resolver os 11 conflitos do prompt, remover o código das ferramentas de outra pessoa, e roteiros para retomada, ida e volta da fila humana, pacote, laço, "sim" com proposta aberta e cadastro em pedaços.
