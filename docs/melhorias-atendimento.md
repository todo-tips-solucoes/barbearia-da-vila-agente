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

## Pendente, por prioridade

Compilado do que as duas análises encontraram e ainda não foi corrigido. "Decisão" marca o que depende do owner.

| # | Problema | Evidência em 16/11 | Sugestão |
|---|---|---|---|
| 12 | **Cliente com pacote ou plano fica sem agendamento.** O agente trava no valor avulso e transfere, sem reservar o horário | 4 casos: 2 transferidos sem horário, 1 irritado, 1 em andamento | A API da Graces lista os pacotes do cliente (`GET /agenda/pacotes`) e agenda abatendo deles (`idClienteItemPacote` no `POST /agenda`). Consultar antes de propor e agendar pelo pacote |
| 13 | **Cadastro exigido antes de responder preço ou "vocês fazem X?"** | 4 casos: 1 cliente foi embora, 2 sem resposta até a leitura, 1 esperou 12 min pela resposta | Responder preço e serviços sem cadastro; cadastro só na hora de agendar. **Decisão** |
| 14 | **O agente escolhe dia, horário ou serviço pelo cliente** e já pede "posso confirmar?" | 5 casos; 1 agendou e cancelou 27 min depois, 1 parou sem responder | Sem o horário pedido, só mostrar opções. Trava em código: só propor confirmação de horário que o cliente disse ou escolheu |
| 15 | **Serviço presumido errado.** Telefone do filho no cadastro vira "corte infantil" para o pai; quem tem barba marcada recebe proposta de corte | 3 casos; 1 terminou em "é só barba" e desistência | Dizer o serviço presumido na primeira resposta e pedir confirmação; olhar os agendamentos do dia antes de propor um novo |
| 16 | **O agente volta a responder no meio do atendimento da equipe.** O silêncio da transferência dura só a sessão de 2 h | 1 caso grave: cadastro reiniciado e "ainda não está agendado" para quem a equipe atendia | Manter o silêncio até a equipe devolver a conversa, ou por um prazo maior. **Decisão** sobre o prazo |
| 17 | **O agente não vê o que a equipe escreveu.** Respostas do cliente à equipe chegam sem contexto | 2 casos de laço: "essa IA aí tá querendo dominar" | Gravar as mensagens da equipe no histórico da conversa |
| 18 | **Mesma pergunta repetida em laço**, e irritação sem saída | 4 conversas com a mesma pergunta 4 vezes; "robô pqp", "lixo isso aqui" | Depois de 2 repetições sem avanço, mudar a abordagem ou oferecer a equipe. Oferecer a equipe ao primeiro sinal de irritação |
| 19 | **Lembrete de 24 h: respostas perdidas** | SIM no primeiro minuto não reconhecido (1 perdido, 1 pediu de novo); erro 400 da Graces em 2 tentativas do mesmo cliente; "NÃO" seguido de "cancelar" voltou à mesma pergunta e não cancelou | Aceitar resposta a lembrete recém-enviado; investigar o 400 (provável agendamento recorrente); depois do NÃO, executar o cancelamento pedido |
| 20 | **Retomada fora de contexto** | "Fecho" 4 h 30 depois virou "até mais"; retomada às 17:00 de um horário das 16:00, com o serviço errado; quem pediu para cancelar o horário de hoje e parou na confirmação só foi retomado na hora do horário | Guardar o pedido até o fim do dia depois da retomada; não retomar proposta vencida; antecipar a retomada quando o horário envolvido é no mesmo dia |
| 21 | **Clientes do Jayme recebem lembrete e confirmação do agente**, e o agente cita "com o Jayme" ao falar de agendamento existente | 3 casos | **Decisão**: manter, ou tirar os agendamentos do Jayme dos lembretes e transferir quem perguntar por eles |
| 22 | **O agente não sabe descrever serviços nem dados da loja** | "o que é a express?", "barba italiana", "fazem platinado?", "sexta é feriado, ele trabalha?" | Glossário curto dos serviços e calendário de feriados no config. **Decisão**: o owner fornece o conteúdo |
| 23 | **Resposta errada logo depois de uma ação feita**, e confirmações duplicadas | "não encontrei nenhum agendamento" 1 s depois de cancelar; duas confirmações seguidas do mesmo agendamento | Informar ao turno seguinte a escrita recém-feita |
| 24 | **Confirmação por mensagem escrita antes da pergunta** | 1 caso (cancelamento) | Só aceitar como confirmação mensagem recebida depois do pedido de confirmação |
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
