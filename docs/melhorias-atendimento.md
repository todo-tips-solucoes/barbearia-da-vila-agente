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
| 16 | Agente calado na fila humana | O silêncio segue o ticket: enquanto ele está na fila de atendimento humano, ou assumido por alguém da equipe em qualquer fila (25/11), o agente não responde, mesmo horas depois. Atendimento humano sem interação há 30 min é encerrado, desde que a equipe já tenha respondido |
| 17 | Mensagens da equipe no histórico (parcial) | O que a equipe escreve na fila humana entra no histórico da conversa. Mensagem escrita pela equipe fora da fila humana ainda não é registrada |
| 19 | Respostas a lembrete | Resposta no primeiro minuto é reconhecida; erro 400 da Graces tenta de novo com a data da ocorrência (hipótese: agendamento recorrente); "combinado" e "estarei aí" contam como confirmação; depois do NÃO, o pedido de cancelar não volta à pergunta |
| 20 | Retomada no contexto | Resposta até 12 h depois continua a conversa; proposta vencida não é retomada; horário para as próximas 6 h é retomado em 20 min |
| 12 | Pacote ou plano | Provisório até 23/11: o agente agendava pelo valor avulso e passava para a equipe abater. Desde o item 12 (ver "Item 12: agendar pelo pacote (23/11)") ele consulta o pacote na Graces e agenda abatendo dele; falta a prova ao vivo com um pacote de teste |

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

- **Fila humana sem interação há 30 minutos:** encerra também quando o cliente falou por último; nesse caso o cliente recebia um aviso fixo. Consequência assumida: o pedido sai da fila da equipe. Desde 23/11 o aviso não sai quando a equipe respondeu e o cliente só agradeceu depois (ver "Leitura dos atendimentos de 23/11"). **Desde 25/11 o aviso fixo não existe mais:** o agente retoma a conversa ou o encerramento é calado (ver "Volta do atendimento humano sem texto fixo").
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

### Etapa 3: feito (duplicação, banco e limites)

| Problema | Correção |
|---|---|
| Consultas de `mensagens_agendadas` por contato varriam a tabela (a regra do lembrete saiu do único índice por contato) | Migração 0018: índice `mensagens_agendadas (contato_id, tipo, inicio)` e `propostas (contato_id, atualizada_em)` |
| A regra "confirmação respondível" estava copiada em 5 consultas de 3 workflows | Função SQL `bv_respondivel` (migração 0018), usada nos cinco lugares; o planejador a expande e usa o índice |
| O bloco de configuração do `bv-graces` estava copiado em 4 nós, o do envio em 2 nós do `bv-mensagens` e a trava de simulação do TESTE em 4 nós | `workflows/shared/config.js` (`bvGCfg`, `bvMCfgEnvio`, `bvSimulado`, `BV_ESCRITA_TESTE`); o deploy passou a trocar os placeholders também dentro do arquivo incluído |
| A posse do contato durava 120 s e o turno podia durar 300 s: acima de 120 s outro turno reentregava as mesmas mensagens e a resposta saía em dobro | O turno tem tempo limite próprio (`execucao.turno_timeout_s`, 140 s), menor que a posse (`lock.ttl_s`, 150 s); o verificador do repositório exige essa ordem |
| Um número só conseguia lotar a agenda | Teto de 3 agendamentos por contato por dia (`graces.agendamentos_max_dia`, decisão do owner): acima disso `agendar` transfere para a equipe; cancelar e remarcar seguem liberados |
| Um número só conseguia encher a fila de execuções | Limite de 30 mensagens por contato por minuto no webhook (`taxa.max_por_minuto`): acima disso a mensagem é descartada com resposta 200 e a falha é registrada uma vez por minuto |
| Com a conversa na fila humana, o áudio e a imagem eram interpretados (chamada à OpenAI) para o agente ficar calado | O silêncio é decidido antes da mídia (nó `Decidir silencio`); na fila humana a mídia não é interpretada |

Como o tempo limite funciona no n8n (medido no TESTE): o `executionTimeout` de um sub-workflow é aplicado entre um nó e outro; o nó em curso termina e a execução é cancelada em seguida. Um turno que estoura não envia resposta, e as mensagens voltam a pendentes.

Ordem de publicação: a migração 0018 vem antes do deploy (os workflows chamam `bv_respondivel`).

Fora desta etapa, apontado na revisão e ainda aberto: reserva do sincronizador (`mensagens.reserva_s`) menor que uma varredura lenta, `bv-vigia` sem tempo limite, tempo limite próprio para o Chat Master e a âncora de `Irmas` diferente da de `Pendencias`.

### Etapa 4: feito (prompt, código morto e cobertura)

A lista de 11 conflitos da primeira revisão não ficou guardada; o levantamento foi refeito por um especialista em prompt e chegou a 15. Cada um foi resolvido a favor da decisão do owner, com a exceção escrita na própria regra:

| # | Conflito | Como ficou | Roteiros |
|---|---|---|---|
| 1 | "Nunca escolha um serviço que ele não disse" contra "proponha repetir o último atendimento" | A regra geral ganhou a exceção do último atendimento; a proposta sai em afirmação, com uma pergunta só (dia e horário) | R20 |
| 2 | "Sem laço" contra "mande a lista de novo" | A mesma pergunta sai no máximo duas vezes, inclusive em lista; na terceira, transfere para a equipe (era "oferece a equipe" até 24/11); não sugere uma opção no lugar do cliente | R30, R38 |
| 3 | Perguntar o horário preferido contra "chame a ferramenta e mande as opções" | A única pergunta antes da busca é a do horário preferido; vale também para o toque em "Remarcar" | R19, R33 |
| 4 | `meus_agendamentos`: chamar sempre contra "uma vez por pedido" | Com os agendamentos já listados no contexto, usa o id e não chama de novo | sem roteiro |
| 5 | Cancelar com mais de um agendamento | Com um só, vai direto à fase 1; com mais de um e sem dizer qual, manda a lista deles antes | R33 |
| 6 | Recusa de presença: a pergunta "remarcar ou cancelar?" voltava em lista depois de respondida | A fase 1 de `cancelar` não manda a lista de decisão para o agendamento cuja presença foi recusada; pede só a confirmação | R35 |
| 7 | "Ação já concluída" contra "depois de cancelar, ofereça outro horário" | O "sim" responde à última pergunta feita | R34 |
| 8 | Atraso contra agendamento existente contra recusa de presença | Atraso é só de quem ainda vai; "não vou conseguir ir" é recusa ou cancelamento | R15, R35 |
| 9 | Fala própria antes de transferir contra "responda só com o texto da ferramenta" | Só o texto da ferramenta | R15, R17, R24, R28, R30, R36, R39 |
| 10 | Barbeiro só da equipe: cadastro antes contra "já sou cliente"; remarcar agendamento que já é com ele | Quem diz que já é cliente não é cadastrado de novo; remarcar agendamento com ele transfere; cancelar segue liberado | R21, R39 |
| 11 | `ja_cliente` contra `outra_pessoa` | Outra pessoa que já é cliente segue a regra "Outra pessoa" | R24, R36 |
| 12 | Cadastro: a primeira mensagem voltava como pendência depois do cadastro | O trecho da primeira mensagem saiu; depois do cadastro o agente chama `agendar` com o horário escolhido | R21, R26, R32 |
| 13 | Corrida ("não repita o resumo") contra "peça a confirmação de novo" | A ferramenta do turno manda | sem roteiro |
| 14 | Informação que o agente não tem: duas perguntas na mesma mensagem | A equipe vira afirmação; a única pergunta é o convite para agendar | R13 |
| 15 | Busca em vários dias contra "nunca diga que há horários sem a lista" | Para no primeiro dia com horário e manda a lista dele | R37 |

Cobertura: cada roteiro declara em `cobre` os conflitos que exercita, e `tests/test_suite_validacao.py` exige que os 15 tenham roteiro ou justificativa. Sem roteiro, com motivo:

- **4 (`meus_agendamentos` de novo):** o efeito não aparece na conversa; exigiria contar as chamadas de ferramenta por turno, que não são gravadas.
- **13 (corrida):** depende de duas mensagens chegarem fora de ordem; a regra de código por trás é coberta pelo teste ao vivo da etapa 1.
- **Parte do 10 (remarcar agendamento que já é com um barbeiro só da equipe):** exigiria um agendamento real com ele, o que a cláusula pétrea proíbe; a barreira de código tem teste unitário.

Outros pontos da etapa:

- **"Sim" com proposta e lembrete abertos (item 11):** o contexto passou a dizer qual das duas perguntas foi a última, pelo relógio (`bvUltimaPergunta`).
- **Código das ferramentas de outra pessoa:** removido de `shared/graces.js`, da configuração (`terceiro.*`), do `Contexto` e dos testes.
- **Roteiros novos:** R27 retomada, R28 ida e volta da fila humana, R29 pacote, R30 laço e irritação, R31 "sim" com proposta e lembrete abertos, R32 cadastro em pedaços. Para cobrir os conflitos do prompt: R33 cancelar sem dizer qual, R34 "sim" depois da oferta de outro horário, R35 recusa de presença e cancelamento, R36 outra pessoa que já é cliente, R37 busca em vários dias, R38 laço em lista, R39 cliente do barbeiro só da equipe sem cadastro. A suíte ganhou os passos `equipe`, `fila_humana`, `passar_horas`, `lembrete` e `tocar_texto`, e a conferência das escritas na agenda (`escritas`).
- **Tamanho do prompt:** o prompt fixo não encolheu (cada conflito resolvido acrescenta a exceção); o contexto do cliente sem cadastro ficou cerca de 20% menor.

O que os roteiros de cobertura acharam (e que os 32 anteriores não pegavam), já corrigido:

| Achado | Correção |
|---|---|
| Confirmação do cancelamento saía só "Prontinho!": a frase com o nome do barbeiro de teste (ou do barbeiro só da equipe) era cortada na saída | O resumo do cancelamento e a lista de `meus_agendamentos` não levam mais esses nomes ao modelo; o agendamento com barbeiro da equipe vai marcado como `so_equipe` (fecha o item 21) |
| Depois de cancelar, o agente não oferecia outro horário, e o "sim" a essa oferta virava "já está cancelado" | A oferta vem na orientação da ferramenta; o contexto da ação concluída cita a pergunta que o agente fez depois dela (`bvContextoFeita`) |
| Laço em lista: a mesma pergunta saía três vezes, sem oferecer a equipe | Cada oferta nasce com a hora (`opcoes.em`); a lista volta junto na segunda vez (`bvRepetePergunta`) e, na terceira, a conversa é transferida para a equipe (`bvTerceiraVez`, ramo `Laco?`; até 24/11 saía o texto fixo `textos.laco`, que só oferecia) |
| No toque em "Remarcar" o agente perguntava "qual opção prefere?": a orientação da ferramenta só existe no turno em que ela é chamada | A decisão do cancelamento leva o significado das opções no contexto enquanto estiver aberta (`bvContextoOferta`) |
| Quem dizia ser cliente do barbeiro só da equipe, em número sem cadastro, recebia pedido de cadastro | A regra diz que quem já é cliente (da loja ou do barbeiro) não é cadastrado, nem para transferir |
| Diante de "tanto faz, você que sabe", o agente afirmava qual opção era "a mais procurada" | A regra do laço proíbe escolher pelo cliente e afirmar preferência sem dado |
| No pedido de cancelamento o texto perguntava só "posso cancelar?" | A orientação manda perguntar no texto "remarcar ou cancelar mesmo?" |

Sobre a suíte: a avaliadora aprovou conversas que descumpriam a expectativa (R33 e R38 em algumas execuções), então as conversas dos roteiros novos foram lidas uma a uma. A transcrição passou a mostrar a lista reenviada no turno, a fala da equipe vale como fonte, e um roteiro pode levar referência própria (`referencia`). Com 39 roteiros julgados por modelo, uma rodada inteira sem variação é difícil: de cinco rodadas completas de 39, duas fecharam 39 de 39 e três fecharam 38, cada uma com um roteiro diferente.

Em aberto, para decisão do owner: o texto da recusa de presença pergunta "remarcar ou cancelar?" em texto livre (`textos.confirmacao_recusada`, enviado pelo `bv-confirmacao`), não em lista.

## Leitura dos atendimentos de 17/11 (etapa 5)

As 313 mensagens da manhã de 17/11 (33 contatos, todas anteriores à etapa 1) foram lidas em 19/11. Parte do que confundiu os clientes as etapas 1 a 4 já corrigiam (lista junto do pedido de confirmação, negrito cru, segundo agendamento para quem já tinha horário, horários de vários dias em texto). O que nenhuma etapa tratava:

| O que aconteceu | Correção |
|---|---|
| O cliente pediu um barbeiro às 9h e recebeu "corte com outro barbeiro às 8h, posso confirmar?" | A exceção do "único horário" ficou estreita: só vai direto ao resumo o horário que é exatamente o pedido (mesmo barbeiro, sem hora marcada). Horário de outro barbeiro ou de outra hora é mostrado e o cliente escolhe (`pedido.busca.hora` e `outros`) |
| "Depois das 18h" era lido como "perto das 18h": havia horário às 20h e o agente respondeu que não tinha | A lista traz os horários dessa hora em diante. O modelo continua mandando só `hora`; o código lê o texto do cliente no turno e, se ele diz "depois das" ou "a partir das" a mesma hora, trata a hora como mínima (`bvgDepoisDas`). Um campo novo na ferramenta fazia a chamada ao modelo travar (ver abaixo) |
| "Não tem início até 60 minutos das 18h" saía igual para o cliente | O aviso da ferramenta não fala mais em minutos nem em "início" |
| Opções escritas no meio da frase ("1 \| 16:00 — Kiel 2 \| 16:40 — Kiel") saíam cruas | A frase é cortada na primeira opção (`bvCompor`); a lista de verdade segue junto |
| O cliente confirmou presença num lembrete desatualizado, ouviu só "esse horário não está mais valendo" e marcou outro | A resposta diz o que está marcado no cadastro dele agora (`textos.confirmacao_desatualizada_atual`), a partir da leitura que a conferência já fazia |

Decisões do owner em 18/11:

- **Recusa de presença em lista:** "remarcar ou cancelar?" deixou de ser pergunta em texto. O `bv-confirmacao` manda a lista (Remarcar / Cancelar mesmo) e deixa na conversa a oferta e a proposta de cancelar; o toque em "Cancelar mesmo" já cancela.
- **Duas de três na suíte:** roteiro reprovado roda de novo; com duas aprovações em três execuções vale aprovado, e a reprovação fica no relatório.
- **Aviso de duplicidade, texto do laço, 30 mensagens por minuto e 140/150 s do turno:** mantidos como estavam.
- **Chave da OpenAI própria do TESTE** (19/11): credencial `Barbearia Vila OpenAI TESTE`; a suíte deixou de gastar o saldo de produção.

O que a agenda tinha no caso do lembrete desatualizado (leitura do owner em 19/11): o cliente tem uma série semanal, e a ocorrência do dia apareceu com outro `idAgenda` (o lembrete da véspera levava o id da série; o da hora, outro id no mesmo início). O horário valia; a conferência procurava só pelo id do lembrete e respondeu que não. Agora, na leitura do próprio cliente, vale o agendamento dele no mesmo início, se já estiver confirmado na agenda (`bvMConfConferir`). Por que o id muda não foi medido (hipótese: a confirmação de uma ocorrência destaca a ocorrência da série).

Vistos na leitura das conversas da rodada 41/41 de 19/11 (a avaliadora aprovou os dois) e corrigidos:

- **Terceira lista com a pergunta reescrita (R38):** "Qual deles quer mudar?" escapava da comparação de texto e a mesma lista saía pela terceira vez. Agora basta a resposta levar a mesma lista de novo: a terceira não sai (desde 24/11 a conversa é transferida; antes saía o texto fixo que oferecia a equipe).
- **Linha de opção que sobra no texto (R40):** quando a oferta guardada não tem o id que o modelo escreveu, a linha "1 | 10:00 — Kiel" saía crua. Agora sai sem o número e a barra. A causa de fundo fica aberta: com duas buscas de horário no mesmo turno, a lista guardada é a da última busca, e o texto pode falar da outra (visto também no R37, que citou um dia e mandou a lista de outro).
- **Campo novo na ferramenta travava a chamada ao modelo (R18):** a primeira versão desta etapa deu à ferramenta `horarios_livres` um campo `a_partir`. Na conversa do R18 (corte infantil, depois "O Pedro tem?"), a chamada ao modelo passou a estourar os 45 s ou a ser recusada pela OpenAI ("prompt sinalizado por possível violação da política de uso"): 4 de 12 conversas com o campo, 0 de 6 sem ele, 0 de 7 na etapa 4 e 0 de 12 na versão final. A suíte mostrava isso como `erro_infra` ("turno sem fim em 60 s"). O mecanismo não foi entendido; a medição foi por versão, com as execuções salvas. O campo saiu e a hora mínima passou a ser decidida no código. A frase do prompt "você mostra e pergunta se serve" também foi reescrita: com ela, as recusas apareciam mais. **Para a próxima mudança de ferramenta ou de prompt:** `erro_infra` repetido no mesmo roteiro é para investigar, e vale medir a conversa do R18 antes e depois.
- **Frase que termina no verbo (R40):** tirada a lista do meio do texto, sobrava "o mais próximo disponível é.". A frase passa a apontar para a lista ("é este.", "são estes.").

Ainda abertos, vistos na leitura: "Obrigado" depois do resumo foi entendido como confirmação; um cumprimento no meio da conversa zera a pergunta em aberto; quem não sabe o nome de nenhum barbeiro recebe a lista de novo em vez de "qualquer um"; áudio da equipe entra no histórico como nome de arquivo; duas respostas quando o cliente manda duas mensagens com mais de 8 s de intervalo.

## Etapa 6: pendências da leitura de 17/11 e das rodadas de 19/11

Desenho feito com dois especialistas em leitura (arquitetura do backend e comportamento do agente); implementação, medição e validação no TESTE como nas etapas anteriores. Regra mantida: decisão no código e no estado, sem campo novo visível ao modelo e sem crescer o prompt.

| O que acontecia | Correção |
|---|---|
| **Duas ou mais buscas de horário no mesmo turno.** Medido em 19/11: em 2 de 18 execuções do R37 o modelo pediu seis buscas num passo (uma por dia); ficava guardada a lista da última e o texto falava de todos os dias. As chamadas de um passo rodam em série | **Uma lista de horários por turno** (`bvGPlano`, `horarios_livres`): vale a primeira busca do turno que achou horário; outra busca não roda (recusa `lista_ja_definida`, sem ida à agenda) e é contada em `falhas_agente` como `graces\|busca_repetida`. A mesma busca repetida (retentativa do agente) roda de novo (`pedido.busca.chave`). Busca sem horário não trava a seguinte. As ofertas de sequência passaram a gravar `pedido.busca` |
| Texto de um dia com lista de outro, por qualquer outro caminho | **Rede no `bvCompor`:** lista de horários com texto que só cita outras datas vira frase montada da oferta ("Para sábado, 28/11, os horários são estes.") |
| Barbeiro sem horário: "outro dia com ele ou os outros barbeiros?" em texto (princípio X pede lista) | Oferta `decisao_sem_horario` (Outro horário no dia / Outro dia com ele / Ver outros barbeiros), no molde da decisão do cancelamento; o `bvContextoOferta` explica as opções no turno seguinte. "Dia lotado" segue sem lista: a pergunta é aberta |
| "Obrigado" depois do resumo foi entendido como confirmação e o agendamento foi criado | **Barreira da fase 2** (`bvgConfirmou`, no `bvGNormalizar`): com `proposta_id`, a fala do cliente no turno precisa ter um sim (no cancelamento, também "cancelar"; "remarcar" não cancela). É condição necessária: com um sim, quem decide continua sendo o modelo. A proposta fica pendente. O texto do cliente vai do fluxo para as ferramentas (`texto_cliente`), sem passar pelo modelo |
| Com uma pergunta feita há segundos, "Bom dia tudo bem" fazia o agente recomeçar ("Como posso ajudar?") | Linha de contexto **Pergunta em aberto** (`bvPerguntaAberta`): só quando a mensagem é só cumprimento (ou um sinal como "."), a última saída do agente é pergunta e tem até 30 min. O laço tem precedência. Acima de 30 min nada muda (conversa antiga não é retomada num "Oi") |
| Quem não conhecia nenhum barbeiro recebia a lista de barbeiros de novo | A lista de barbeiros ganhou o item **Qualquer barbeiro** (com 2 ou mais); escolhê-lo vale `qualquer=true`. O contexto do turno seguinte diz que "tanto faz" e "não conheço nenhum" são essa resposta |
| Áudio, imagem ou arquivo mandado pela equipe entrava no histórico com o nome do arquivo | `bvEquipe`: fica a marca (`[áudio]`, `[imagem]`, `[vídeo]`, `[arquivo]`) e a legenda, quando há. O agente não ouve o áudio da equipe |

Revisões independentes do diff (segurança; correção, performance e escala), feitas em leitura antes do PR. Nenhuma achou caminho que escreva na agenda sem consentimento nem que leve ao barbeiro de teste ou ao barbeiro só da equipe. Corrigido a partir delas: a barreira não via negação ("não quero mais" passava) nem distinguia descrição de imagem de fala; cancelamento digitado ao lado de "remarcar" era recusado; a rede do `bvCompor` trocava texto correto (aviso de escrita feita, dia da lista citado pelo nome); a trava da lista por turno agia mesmo depois de a oferta deixar de ser de horários; a linha da pergunta em aberto contradizia a das mensagens cruzadas; "Ver outros barbeiros" aparecia para serviço de um barbeiro só; nome de arquivo com espaço passava por legenda.

Medido no TESTE com o código final (19/11): rodada completa 45/45; a conversa do R18 doze vezes, sem recusa da OpenAI nem estouro de tempo; a frase do R37 dezesseis vezes, e na vez em que o modelo pediu as seis buscas num passo a primeira valeu, as outras cinco foram recusadas e a resposta saiu com o texto e a lista do mesmo dia.

Achados lendo as conversas da rodada 45/45 (a avaliadora aprovou os três), que ficam abertos:

- **Promessa sem entrega.** Em 1 de 16 execuções da frase do R37, e uma vez na rodada, o modelo chamou só `listar_servicos` (ou nenhuma ferramenta) e encerrou o turno com "Vou consultar os horários... Só um momento". O cliente fica esperando. Não vem desta etapa: até esse ponto o prompt, as ferramentas e os resultados são iguais aos da etapa 5, onde já tinha aparecido uma vez. Próximo passo sugerido: uma segunda passada do agente quando a resposta promete verificar e o turno não chamou a ferramenta que entrega (laço no workflow, no máximo uma vez).
- **Frase truncada antes da lista de decisão (R7):** "Seu horário de corte adulto na quarta-feira, 25/11, às 15:00 pode ser. Qual fica melhor pra você?", seguida de Remarcar / Cancelar mesmo. O caminho não mudou nesta etapa.
- **Depois do "Obrigado" (R43):** nada é agendado e a proposta fica pendente, mas o agente às vezes responde só "De nada!" e não pergunta de novo se pode confirmar.

Limitações conhecidas, deixadas como estão:

- **Segunda busca que a regra recusa mas o prompt ainda sugere.** A orientação da busca com qualquer barbeiro diz "para falar de um barbeiro específico, chame horarios_livres com ele". Se o cliente perguntar dos dois no mesmo turno, a segunda busca é recusada e custa uma rodada do modelo. A contagem `graces|busca_repetida` em `falhas_agente` mede a frequência.
- **Retentativa do agente:** só a última busca que achou horário roda de novo; as outras voltam como recusa. A lista certa chega ao cliente; o texto é escrito sem os dados da busca recusada.
- **Vários dias sem horário com o mesmo barbeiro:** a lista de decisão fica com o último dia buscado.
- **Pergunta em aberto:** a linha repete entre aspas a última pergunta do próprio agente (mesmo padrão do laço).
- **Chamadas em paralelo:** a regra da lista por turno conta com as chamadas de um passo rodando em série (medido em 19/11). Se o n8n passar a rodar em paralelo, a decisão tem de ir para o `Persistir`.

Números sem base medida, para rever com atendimentos reais: os 30 min da pergunta em aberto (o caso real foi de segundos) e a lista de palavras de "sim" da barreira (um sim fora dela custa uma pergunta a mais; se aparecer, o próximo passo é mandar a confirmação como lista Sim/Não).

Fica aberto: alerta de WhatsApp fora do ar, os 94 "sem contato" da conciliação de lembretes, duas respostas para mensagens com mais de 8 s de intervalo, e a orientação "outro dia ou agendar cada serviço separado" das sequências, que ainda vai em texto.

## Etapa 7: barreiras para o agente cumprir o combinado

Não muda a forma de atender: são conferências em código sobre a resposta do modelo e sobre o resultado das ferramentas. A topologia do `entregar-rajada` é a mesma da etapa 6.

| O que acontecia | Barreira |
|---|---|
| **Promessa sem entrega:** o modelo encerrava com "Vou consultar os horários... Só um momento." sem chamar a ferramenta (1 em 16 na frase do R37) | `bvPrometeu`, só quando a resposta **inteira** é a promessa (tiradas as frases que só prometem, sobra no máximo uma interjeição como "Oi, Paulo!"): com lista, a lista segue; sem lista, sai `textos.sem_entrega` ("Não consegui consultar agora. Pode me mandar de novo o que você precisa?"). Resposta com conteúdo (preço, horário, pedido de dado, aviso de escrita feita) fica como veio |
| **Texto truncado antes da lista de decisão:** "…às 15:00 pode ser. Qual fica melhor pra você?" | A cauda "pode ser:" que introduzia as opções sai, e a pergunta que fecha uma lista de decisão passa a ser "O que você prefere?" (`bvPerguntaDecisao`) |
| **Sequência de serviços que não cabe no dia:** "outro dia ou agendar separado?" em texto | Lista `modo_encadeamento` com Outro dia / Agendar separado; a resposta volta por `id_opcao`. "Outro dia" com a data nova busca a mesma sequência (os serviços estão em `pedido.servicos`; o dia que não coube, em `pedido.seq_dia`), e o `bvContextoOferta` explica as duas opções no turno seguinte |
| **Orientação que contradizia a regra de uma lista por turno** ("para falar de um barbeiro específico, chame horarios_livres…") | O texto passou a dizer que isso vale para a próxima mensagem do cliente |

A negação na fala do cliente (`bvNegou`) passou a ser uma função em `agente.js`, usada pela barreira da fase 2.

Resposta que avisa de algo já feito na agenda ("agendado", "cancelei", "remarquei") nunca é tratada como promessa, mesmo com "aguarde o lembrete": o aviso não pode sumir.

**Horários repetidos no texto, tentado e retirado.** A regra que tirava a frase com quatro ou mais horários da lista apagava junto o aviso de cancelamento, o dia da lista e o "quem tem horário a partir de". A repetição no texto é só estética; ficou como o modelo escreve.

**Pedido de confirmação anexado pelo código, tentado e retirado.** A primeira versão acrescentava "Posso confirmar o horário?" quando havia um resumo pendente e a resposta não perguntava nada (o caso "Obrigado" → "De nada!"). A revisão de segurança mostrou que a pergunta não diz a que se refere: um "sim" a ela poderia executar uma proposta em que o cliente não estava pensando, e ela voltaria depois de uma recusa dita com outras palavras ("mudei de ideia"). Como mexe no consentimento, saiu. O que garante o resultado continua sendo a barreira da fase 2 (nada é agendado sem um sim), e a retomada automática já traz o pedido de volta.

**Segunda passada do agente, tentada e abandonada (21/11).** A primeira versão refazia o turno quando o modelo prometia e não entregava, com um laço `Agente → Conferir entrega → IF → Agente`. O turno funcionou, mas ler a execução salva pela API (`GET /executions/{id}?includeData=true`) deixou o processo do n8n em 100% de CPU, sem responder, por cerca de 20 minutos. Como TESTE e PROD rodam no mesmo processo, os workflows de PROD pararam nesse intervalo; voltou com o restart do serviço, autorizado pelo owner. A causa dentro do n8n não foi investigada. Regra que fica: nada de ciclo nem de topologia nova em torno do nó `Agente` nesta instância sem combinar antes.

Medido no TESTE com o código final (21/11): rodada completa 45/45; a conversa do R18 doze vezes, sem recusa da OpenAI nem estouro de tempo; testes ao vivo sem modelo das etapas 5 e 6; `healthz` do n8n conferido entre cada passo. A promessa sem entrega não apareceu nessas rodadas (é de cerca de 1 em 16 na frase do R37), então a barreira dela só tem teste unitário. O ramo "Outro dia" das sequências também: não há como montar no TESTE um dia em que a sequência não caiba.

Desenho conferido por duas revisões independentes do diff (segurança; correção, performance e escala), em leitura. Delas saíram a retirada das duas regras acima, o estreitamento da promessa e o conserto do "Outro dia".

Continua aberto: duas respostas para mensagens com mais de 8 s de intervalo (é o tempo de espera da rajada; aumentar atrasa toda resposta) e os 94 "sem contato" da conciliação de lembretes.

## Etapa 8: resposta ao lembrete de 1 hora

Leitura do contato em PROD (21/11): o "Simm" de 17/11 chegou junto com o lembrete de 1 hora ("Seu corte é daqui a 1 hora. Te esperamos!"). Não havia confirmação aberta: o horário tinha sido remarcado pela equipe na véspera, depois da hora da confirmação. O lembrete sai pelo módulo de Agendamentos do Chat Master e não entra no histórico; a conversa da véspera já tinha passado da janela. O agente recebeu só "Simm" e respondeu "Como posso ajudar?".

Correção: o `Ler contexto` lê o lembrete de 1 hora do contato (enviado, ou criado no Chat Master e prestes a sair em 2 minutos, pela própria `bv_respondivel`, sem copiar a regra; vale até a hora marcada) e `bvMPromptConfirmacoes` acrescenta uma linha de dado ao contexto. Com confirmação de presença aberta a linha não entra: o "sim" confirma a presença. No meio de uma conversa também não entra: ali o "sim" responde à última pergunta do agente (um resumo, por exemplo). A linha não leva o nome do barbeiro. Sem lembrete, o contexto fica byte a byte igual ao da etapa 7.

Observado na mesma leitura e ainda aberto: as respostas da equipe a esse contato em 16/11 não ficaram gravadas (o cliente respondia a alguém entre 16:05 e 16:24 e não há nenhuma mensagem `equipe-` no período). Só entra a mensagem da equipe com o chamado na fila humana; com o chamado em outra fila, é descartada. A resposta pelo aparelho da conexão também entra (captura de 23/11: ver "Teste pela conexão 145 (23/11)"). Medido em 22/11: ver "Medições em PROD (22/11)".

## Operacional: alerta de WhatsApp fora do ar (21/11)

O `bv-alerta` (só PROD, a cada 10 minutos) passa a consultar o estado da conexão da loja no Chat Master (`POST /api/whatsapp-status`, que devolve `{ whatsapps: [{ id, status }] }`; conferido com o token do TESTE). Estado diferente de `CONNECTED`, ou a conexão ausente da lista, vira o alerta "o WhatsApp da loja está fora do ar", um por queda: ele só se repete depois de a conexão ser vista no ar de novo (desde 22/11; antes era um por hora, e o owner havia desconectado a loja por decisão dele em 17/11). Consulta que falha não alerta.

A conexão da loja não consegue avisar a própria queda: com ela fora, todo alerta da rodada sai pela conexão reserva (`alerta.reserva` e `credenciais.chatmaster_reserva`: a conexão de teste, que é de outra empresa no Chat Master e por isso não cai junto). Com a conexão no ar, os alertas seguem pela conexão da loja, como antes.

A resposta do status traz dados de todas as conexões da empresa. O `Decidir` só repassa tipo, texto e a marca da reserva, e nenhum nó de rede derruba a execução, para ela não ser salva com a resposta. Efeito: envio de alerta que falha deixa de aparecer como execução com erro. Se uma execução do `bv-alerta` aparecer com erro, apague-a depois de ler.

Testado no TESTE com uma cópia temporária do workflow, com os envios trocados por nós sem efeito: conexão no ar, nenhum alerta; conexão inexistente, um alerta pela reserva. O envio de verdade pela reserva e os estados que o Chat Master usa para a conexão caída não foram exercitados.

## Medições em PROD (22/11)

Feitas pelo owner com um script só de leitura (contagens, sem nome, telefone nem texto de cliente).

**O atendimento de verdade parou em 17/11 às 12:57.** É a hora da última mensagem recebida, da última enviada e do último turno em PROD; em 22/11 a conexão da loja estava `DISCONNECTED` no Chat Master. Recebidas por dia: 125 em 15/11, 373 em 16/11 e 160 em 17/11. Efeitos:

- toda medição abaixo "dos últimos 7 ou 14 dias" cobre, na prática, de 15/11 a 17/11 ao meio-dia;
- as etapas 5 a 8 foram publicadas depois disso e ainda não atenderam nenhum cliente;
- os lembretes saem pelo agendamento do Chat Master na mesma conexão. Não foi verificado se saíram nesses dias: o banco marca `enviada` na hora prevista, não na hora do envio.

Não está registrado se a desconexão foi decidida ou foi queda. A conexão por QR Code é um aparelho vinculado: com ela fora, o celular da loja continua funcionando e só o agente para.

**Rajada (janela de 8 s): recomendação de manter, revista em 23/11 para 15 s** (ver o fim deste trecho). Pares de mensagens seguidas do mesmo cliente com até 60 s de intervalo:

| Intervalo (s) | Pares | Em turnos diferentes |
|---|---|---|
| 0 a 8 | 75 | 0 |
| 8 a 12 | 35 | 31 |
| 12 a 16 | 31 | 31 |
| 16 a 20 | 22 | 22 |
| 20 a 30 | 67 | 67 |
| 30 a 60 | 155 | 155 |

Não há um degrau: os intervalos se espalham até 60 s. Subir a janela para 12 s juntaria 35 pares e atrasaria todos os turnos (617 no período, resposta com mediana de 9,8 s e p90 de 14,8 s).

**Revisão em 23/11: a janela passa a 15 s** (`buffer.janela_s`, decisão do owner). Na leitura dos atendimentos de 23/11, 5 de 21 conversas tiveram resposta em dobro porque a segunda mensagem do cliente chegou de 11 a 13 s depois da primeira; numa delas saiu uma lista de horários e, 12 s depois, um texto dizendo que a lista não servia. Pela tabela acima, 15 s juntam os pares de 8 a 12 s e a maior parte dos de 12 a 16 s, perto de 1 em cada 10 turnos. Custo assumido: toda resposta fica 7 s mais lenta (mediana de 10,8 s para perto de 18 s em PROD). Junto com a janela: `execucao.timeout_s` vai de 300 para 320 s, para a execução da recepção continuar cobrindo janela + espera pela posse + um turno inteiro com folga (pior caso perto de 308 s), e os limites de latência da suíte sobem os mesmos 7 s (p50 22 s, p95 e turno 32 s). Pares com mais de 15 s de intervalo continuam em turnos separados. Testado no TESTE com contato simulado: duas mensagens a 12 s de intervalo viraram um turno e uma resposta, 22 s depois da segunda; a 20 s, dois turnos. Suíte (R1, R27 e R29) aprovada com p50 de 20,0 s e p95 de 22,5 s. Duas revisões independentes do diff, em leitura, sem achado crítico; delas saíram a folga do tempo limite (320 s em vez de 310), o prazo sem saída da suíte (67 s) e o smoke da recepção, que tinha os 8 s fixos. Fica como está: a segunda mensagem que chega depois dos 15 s com o turno ainda rodando gera outra resposta; fechar isso pede mudança de topologia em torno do agente.

**"Sem contato" da conciliação de lembretes: nada a corrigir.** De 449 registros, 194 ganharam lembrete depois. Os 103 dos últimos 5 dias que nunca ganharam foram cruzados com a agenda da Graces: 53 sem celular válido no cadastro, 28 com início em até uma hora (não havia lembrete a mandar) e 22 que não estavam mais na agenda lida (cancelados, ou fora da página de 200 agendamentos). Nenhum caso em que o lembrete cabia e não saiu. Esses registros não contam para o alerta de falhas, que só conta `agente_falhou`.

**Respostas da equipe: fechado em 23/11.** O agente passou 22 contatos para a equipe; dos 13 que escreveram duas vezes ou mais nas 3 horas seguintes, 11 não têm nenhuma resposta da equipe gravada. O banco não separa "respondeu pelo aparelho da loja" (evento `start` com `fromMe`, descartado em `bvNormalizar`) de "não respondeu". O silêncio do agente não depende disso (vale a fila do chamado); o que se perde é o histórico quando o cliente volta ao agente. Próximo passo: ver no TESTE como chega o evento de uma mensagem digitada no aparelho da conexão e, se for identificável, gravá-la como mensagem da equipe. **Feito em 23/11: a hipótese do aparelho não se confirmou, e a medição no Chat Master mostrou que as respostas sem registro são anteriores à gravação, que só entrou em PROD em 17/11** (ver "Teste pela conexão 145 (23/11)").

## Item 26: registro para auditar (22/11)

Não muda o atendimento: são gravações a mais em consultas que já existiam, sem nó novo em nenhum workflow.

| O que faltava | Como ficou |
|---|---|
| Itens das listas enviadas | Coluna `mensagens.lista` (migração 0019), com `[{id, rotulo}]`: toda lista do agente (`Saidas` e `Gravar saida 1` a `4` do `entregar-rajada`) e a lista de decisão da recusa de presença (`bv-confirmacao`). Mensagem de texto fica com a coluna nula. A confirmação de presença do lembrete (Sim / Não) não grava: os dois títulos são fixos no config |
| Início de cada transferência | Uma linha em `handoffs`, com o motivo, gravada no `Registrar handoff` do `bv-graces`. Todo encaminhamento passa por ele: a ferramenta `transferir_atendimento`, o limite de turnos, o teto de agendamentos e o barbeiro só da equipe. Uma transferência aberta por contato |
| Fim de cada transferência | `encerrado_em` e `encerrado_por` (migração 0019): `vigia`, quando a fila humana fica 30 minutos sem interação (`Gravar encerramento` do `bv-vigia`), ou `retorno`, no primeiro turno em que o agente volta a atender o contato (`Sessao` do `entregar-rajada`). No `retorno` a hora é a da volta do cliente ao agente, não a de quando a equipe terminou |

**Lembrete durante a transferência: segue saindo.** O `bv-mensagens` tinha, desde o plano original, a regra de adiar o lembrete de quem está com transferência aberta em `handoffs`; ela nunca agiu porque a tabela ficava vazia. Com a tabela preenchida ela passaria a agir, então ficou atrás da chave `handoff.segurar_lembretes`, desligada nos dois ambientes. Ligar é decisão do owner. Risco conhecido de ligar: transferência sem chamado conhecido no Chat Master só fecha quando o cliente volta a escrever, e o lembrete ficaria retido até lá.

Limites:

- Chamado que a equipe encerra sem o cliente voltar a escrever: a linha fica `aberto` até o vigia agir (PROD) ou até a próxima mensagem do cliente. No TESTE o vigia não encerra.
- A mensagem da equipe com o chamado fora da fila humana continua fora do banco. A digitada no aparelho da conexão entra, desde que o chamado esteja na fila humana (ver "Teste pela conexão 145 (23/11)").
- Transferências e listas anteriores à publicação não são reconstruídas.

Ordem de publicação: a migração 0019 vem antes do deploy (os workflows gravam nas colunas novas).

Consulta de exemplo, transferências por dia, motivo e desfecho: `SELECT (iniciado_em AT TIME ZONE 'America/Sao_Paulo')::date, motivo, coalesce(encerrado_por, 'aberto'), count(*), round(avg(extract(epoch from encerrado_em - iniciado_em)) / 60) AS minutos FROM handoffs GROUP BY 1, 2, 3 ORDER BY 1;`

Testado no TESTE (22/11), com a migração aplicada: teste ao vivo com 20 conferências (itens gravados iguais aos da oferta da conversa; transferência aberta com o motivo; segunda chamada sem linha nova; agente calado na fila humana com a linha aberta; encerrada por `retorno` quando o agente volta; encerrada por `vigia` rodando a consulta do `Gravar encerramento`); as seis consultas alteradas conferidas no banco com `PREPARE`; R1, R2, R15, R28, R30 e R35 da suíte, 6 de 6, com as conversas do R28 e do R35 lidas. Não exercitado: o vigia encerrando de verdade (desligado no TESTE) e a gravação da lista de decisão pelo `bv-confirmacao` conferida no banco (o R35 passa por ela; a expressão foi testada isolada).

## Teste pela conexão 145 (23/11)

Com a conexão da loja fora do ar por decisão do owner, os testes que dependiam de WhatsApp de verdade foram feitos pela conexão de teste (145), com o owner no papel de cliente (o número de teste registrado em `docs/decisoes-pre-00c.md`).

### Captura: mensagem digitada no aparelho da conexão

A 145 foi apontada para o `bv-captura` e o owner mandou três mensagens: uma como cliente, uma pelo painel do Chat Master e uma digitada no aplicativo do WhatsApp do aparelho da 145, com o chamado na fila humana (78).

| Origem | Eventos | O que a recepção faz |
|---|---|---|
| Cliente | `start` e o eco `from_internal`, os dois com `fromMe` falso | Aceita o `start` como mensagem do cliente |
| Painel | `from_internal` com `fromMe`, fila 78 e o atendente em `userId` | `bvEquipe` grava como mensagem da equipe |
| Aparelho da conexão | `start` com `fromMe` e `fromApp`; e o eco `from_internal` com `fromMe`, fila 78, `mensagem.fromApp` e sem `userId` | O `start` é descartado (`enviada_pela_loja`); o eco é gravado por `bvEquipe` como mensagem da equipe |

Os dois eventos do aparelho viraram as fixtures `evento-26` e `evento-27`, e `tests/rajada.test.js` passa os dois pelo código da recepção.

**Conclusão para o item 17:** a resposta digitada no aparelho não é a causa das respostas da equipe sem registro. Com o chamado na fila humana ela já é gravada, sem mudança de código. Vale para a 145; o owner informou em 23/11 que a 159 se comporta igual (mesma estrutura, com outros valores nas variáveis).

### Medição em PROD: respostas da equipe (23/11)

Leitura rodada pelo owner: para cada contato que o agente passou para a equipe nos últimos 10 dias (22 contatos, 15 a 17/11), as mensagens do chamado no Chat Master (`GET /api/tickets/{ticketId}/messages`) foram cruzadas com o que está gravado no banco. Cada mensagem do chamado traz a fila em que ele estava na hora, o atendente (`userId`, no painel) e a marca de aparelho (`fromApp`). Um chamado não foi lido por erro de rede.

| Origem | Fila do chamado na hora | Gravada no banco | Mensagens |
|---|---|---|---|
| Aparelho | Humana | Sim | 12 |
| Aparelho | Humana | Não | 34 |
| Painel | Humana | Sim | 1 |
| Painel | Humana | Não | 34 |
| Aparelho | Do agente | Não | 20 |
| Painel | Do agente | Não | 3 |

- **A divisão é por data, não por origem.** Nenhuma resposta às transferências de 15 e 16/11 foi gravada; as de 17/11 foram todas (12 de 12 nas três horas seguintes, em 5 transferências). A gravação (`Registrar equipe`) entrou em `main` em 17/11 às 05:35 (PR #127): antes disso ela não existia. Não é defeito, e a hipótese do vigia fica descartada.
- **A equipe respondeu quase sempre.** De 22 transferências lidas, 20 tiveram resposta no chamado: metade em até 8 minutos e 7 depois de 40 minutos. Duas, de 17/11, ficaram sem resposta.
- **Limite desta leitura:** a tabela não saiu separada por dia; a atribuição das 68 não gravadas na fila humana ao período anterior a 17/11 vem das linhas por transferência. O script passou a imprimir a divisão por dia.
- **Aberto:** 23 mensagens da equipe (20 pelo aparelho) foram enviadas com o chamado na fila do agente. Por desenho não são gravadas: o agente não fica sabendo o que a loja disse nem deixa de responder. Com `fromApp` e `userId` dá para separar essas mensagens do eco das mensagens do próprio agente, o que antes não se sabia fazer. Gravar no histórico e calar o agente são decisões do owner.

### Conversa de verdade com o agente do TESTE

A 145 foi apontada para a recepção do TESTE, com o número de teste na lista de escrita (publicação local, sem commit). Quatro turnos, respostas entre 10 e 16 segundos depois da mensagem, nenhuma falha gravada:

- o agente ofereceu repetir o último serviço com o mesmo barbeiro;
- o cliente trocou o dia duas vezes (quarta, depois sábado) e o agente acompanhou sem perder o serviço;
- antes de pedir a confirmação, avisou que já havia outro horário marcado no mesmo dia.

A conversa parou na pergunta de confirmação: nada foi agendado. Não foram exercitados a gravação do agendamento, as listas, a transferência, os lembretes e a resposta ao lembrete de 1 hora.

### Estado da 145 antes e depois

- A 145 estava **sem webhook**: nenhum evento dela chegava ao TESTE. A anotação `.captura-145.url`, de outubro, apontava para o n8n2 desativado; passou a guardar "vazio", que era o estado real, e a API aceita gravar o webhook vazio.
- No fim: webhook da 145 de volta a vazio, TESTE republicado com a lista de escrita vazia, execuções do `bv-captura` apagadas e nenhum agendamento no barbeiro de teste.
- Com o chamado na fila 78 o agente do TESTE fica calado (regra da fila humana), e no TESTE o vigia não encerra: para o agente responder, o chamado tem de ser encerrado ou devolvido no painel.

Para repetir: `python3 -I scripts/capturar-webhook.py trocar` (captura) e `restaurar` (volta ao vazio). Apontar a 145 para a recepção do TESTE não tem comando no script: foi feito com a mesma chamada (`POST /api/whatsapp/update`) e a URL da recepção do `integracao.json`.

## Volta da conexão da loja (23/11)

A conexão da loja voltou em 23/11 às 12:41, depois de parada desde 17/11 às 12:57. Medido pelo owner 36 minutos depois, com script só de leitura (contagens, sem nome, telefone nem texto de cliente):

- conexão `CONNECTED` e webhook apontando para a recepção de PROD;
- 23 mensagens recebidas, 17 turnos concluídos, resposta em 11,1 s na mediana, nenhum turno com falha. São os primeiros atendimentos reais das etapas 5 a 8 e do item 26;
- sem pico na volta (1 a 2 contatos a cada 10 minutos): as mensagens dos dias parados não foram entregues ao agente. A recepção não tem filtro de idade da mensagem; se o Chat Master entregasse essa fila, o agente responderia todas;
- falhas registradas: 17 `sem_contato` da conciliação de lembretes (pendência conhecida), 2 `busca_repetida` e 2 `encaminhar_equipe`, uma delas pelo barbeiro que só a equipe agenda; 2 transferências.

**Lembretes vencidos durante a parada.** 238 lembretes (88 do dia anterior e 150 da hora) venceram com a conexão fora e estavam agendados no Chat Master; o banco os marcou `enviada` na hora prevista. Regra do owner (23/11): lembrete de agendamento que já passou não é enviado, e nada sai em lote, para não bloquear o número. Os 232 cujo agendamento já havia passado foram apagados do Chat Master pelo owner (`POST /api/schedules/delete`, um por um): 231 responderam `200` e, na segunda rodada, `404`; o que ficou sem resposta respondeu `200` na segunda. Ou seja, o Chat Master ainda guardava os registros. Os 6 de agendamentos que ainda iam acontecer ficaram.

O sincronizador só apaga agendamento futuro: lembrete vencido com a conexão fora continua no Chat Master. Numa próxima parada, a limpeza precisa ser repetida antes ou logo depois de religar (critério: `agendamento_canal_id` preenchido, `previsto_para` dentro da parada e `inicio` já passado).

Lembretes futuros na volta: 148, em 106 minutos diferentes, no máximo 3 no mesmo minuto. Cada um sai na hora do próprio agendamento.

Não medido: se o Chat Master enviaria os lembretes vencidos ao religar; se os 6 que ficaram saíram; se o alerta de WhatsApp fora do ar parou de se repetir (só aparece no WhatsApp do owner).

## Operacional: nota "HTTP 401" no chamado encerrado (23/11)

O owner viu no painel do Chat Master, em 23/11 às 13:55, a nota vermelha "HTTP 401 em POST …/webhook/bv-recepcao-…" num chamado da loja, um minuto depois de o agente responder a uma confirmação de presença. O chamado já estava encerrado.

**Causa.** O Chat Master avisa o encerramento do chamado (`acao: "closed"`) sem o campo `token_origin` (captura `tests/fixtures/chatmaster/evento-24.json`). A recepção autentica pelo SHA-256 desse campo e respondia 401; o painel grava a falha do aviso como nota no chamado. Pelo código, acontece em todo encerramento desde que a recepção autentica pelo token (não medido em PROD): a Decision 10 de `docs/specs/mensagens-agendadas/research.md` diz que o `closed` é descartado, mas a checagem do token vem antes da normalização.

**Impacto.** Nenhuma mensagem se perdeu: a confirmação do cliente foi aceita e respondida, e o aviso de encerramento não é mensagem. O dano era a nota à vista da equipe.

**Correção** (PR #178, promoção #180, em PROD desde 23/11 às 14:33). `bvEncerradoSemToken` (`workflows/shared/rajada.js`) reconhece só o `closed` sem `token_origin`; no nó `Normalizar` do `bv-recepcao` esse aviso sai como `descartada` (`nao_mensagem`), que responde 200 e não processa nada. O token continua obrigatório para todo o resto. Efeito na autenticação: quem conhece o caminho do webhook recebe 200 em vez de 401 para um corpo `{"acao":"closed"}`, sem ler, gravar nem devolver dado.

Medido no webhook, com a `evento-24` e variações dela:

| Evento enviado | TESTE antes | TESTE depois | PROD depois |
|---|---|---|---|
| `closed` sem token | 401 | 200 | 200 |
| `closed` com token errado | não medido | 401 | 401 |
| `start` (mensagem) sem token | não medido | 401 | 401 |

Não medido: o corpo do aviso de PROD que gerou a nota (as execuções não ficam salvas; a causa vem da captura e do 401 reproduzido no TESTE); quem encerrou o chamado (o envio do agente ou o painel); se o Chat Master reenvia o aviso ou desliga o webhook depois de falhas repetidas; se a nota no chamado é novidade da plataforma; e um chamado da loja encerrado depois do deploy sem a nota, que é a prova final. Se a nota voltar, o aviso de PROD tem formato diferente do capturado e vale capturar um.

## Leitura dos atendimentos de 23/11

Primeiras 2 h 30 de atendimento depois da volta da conexão (12:42 às 15:00), lidas pelo owner com o script só de leitura: 213 mensagens de 21 contatos, 94 turnos, resposta com mediana de 10,8 s e p95 de 22,7 s. O básico funcionou: 8 agendamentos fechados sem ajuda, os 3 pedidos pelo barbeiro que só a equipe agenda foram para a equipe, 2 confirmações de presença reconhecidas, horário de funcionamento igual ao da Graces.

| # | Ponto | Conversas | Situação |
|---|---|---|---|
| 1 | Aviso "a equipe não conseguiu te responder" depois de a equipe ter respondido e o cliente só agradecer | 2 de 3 avisos | **Corrigido** (abaixo) |
| 2 | Cliente pediu cabelo e barba ("raspar na navalha e barba", serviço que a Graces não tem) e saiu só com barba, com outro barbeiro; ao pedir para incluir cabelo, a lista voltou três vezes (turnos de 87 s e 37 s) e "incluir" virou troca de barbeiro. Na segunda leitura: corte + duas depilações agendado como três depilações | 2 | **Corrigido** o serviço trocado entre listas e o título cortado (abaixo); "incluir serviço num agendamento que já existe" **corrigido** em 24/11 (abaixo) |
| 3 | Duas respostas, às vezes contraditórias, quando a segunda mensagem chega de 11 a 13 s depois da primeira | 5 | **Corrigido**: janela da rajada em 15 s (ver "Rajada", em "Medições em PROD (22/11)") |
| 4 | Lista que não corresponde à pergunta do texto (pergunta a idade e lista horários; pergunta se passa para a equipe e lista barbeiros) | 2 | Aberto |
| 5 | Duas pessoas no mesmo horário com barbeiros diferentes: 5 minutos de tentativa antes de transferir, e o cliente repetiu tudo para a equipe | 1 | Aberto |
| 6 | Pergunta o barbeiro que o cliente já disse; depois de "qualquer barbeiro", pergunta o horário em texto em vez de listar | 2 | Aberto |
| 7 | Cliente avisou que ficaria preso em reunião e o agente não conferiu se havia agendamento para oferecer remarcar | 1 | Aberto |
| 8 | Pedido de desculpas e oferta da equipe sem motivo, em resposta a "Com certeza" | 1 | Aberto |
| 9 | Texto cita três barbeiros com horário e a lista só traz os de um | 1 | Aberto |
| 10 | Tabela de preços num parágrafo só; três serviços têm nome maior que os 24 caracteres do item de lista | 2 | Aberto |
| 11 | Áudio transcrito com frase que o cliente não disse ("Se inscreve no canal...") | 1 | Aberto |
| 12 | Cliente escreveu "Atendente" e não foi transferido ("Claro! Como posso ajudar?") | 1 | **Corrigido** (abaixo) |
| 13 | Já é cliente, mas escreve de outro número: passa por serviço, barbeiro, dia e horário e só no fim é transferido | 2 | Aberto |
| 14 | Serviço que ninguém pediu: a "repetir o último" propôs depilação de orelha a quem perguntou só por um horário (hipótese: o último atendimento tinha mais de um serviço e vale o primeiro item do histórico) | 1 | **Corrigido** em 24/11 (abaixo) |
| 15 | Vendedores e divulgação: o agente convidou um a mandar o material; outro foi para a fila da equipe | 4 | Aberto |
| 16 | Despedida repetida: a mesma frase em resposta a cada "obrigado" e emoji | 1 | Aberto |
| 17 | Cliente antigo do barbeiro que só a equipe agenda, escrevendo de um número sem cadastro: o pedido de cadastro saiu duas vezes e ele não foi transferido | 1 | **Corrigido** (abaixo) |
| 18 | "Sim" ao lembrete num celular com dois cadastros: o agente perguntou "qual deles é você?" em vez de confirmar a presença | 1 | **Corrigido** em 24/11 (abaixo) |
| 19 | Agendamento feito por pacote (no balcão) aparece para o agente sem o serviço: lista sem o nome, resumo "Cancelar undefined" e remarcação impossível | achado na prova do item 12; 12 clientes com agendamento assim nos 7 dias seguintes | **Corrigido** (abaixo) |
| 20 | Cancelar pela API um agendamento feito por pacote não devolve a sessão ao pacote | medido 3 vezes no cliente de teste e conferido pelo owner no sistema da Graces | **Corrigido**: o cancelamento vai para a equipe (abaixo) |
| 21 | Telefone com mais de um cadastro pede o barbeiro que só a equipe agenda e fica preso em "qual cadastro é o seu?" | 1 contato em 23/11 (20:10), pedido repetido 2 vezes, sem transferência; no TESTE, 2 de 10 | **Corrigido** em 24/11 (abaixo) |

As causas dos pontos 4, 8 e 14 são hipóteses: as conversas foram lidas, não a execução de cada turno. A do ponto 2 (serviço trocado) foi reproduzida no TESTE.

**Segunda leitura, das 15:00 às 17:55** (antes do deploy das correções 1 e 3, que terminou às 17:55): 428 mensagens de 35 contatos no dia, 198 turnos, mediana de 9,6 s. Mais 12 agendamentos corretos sem ajuda; as 2 retomadas tiveram resposta e uma virou agendamento; "Ok" ao lembrete de 1 hora respondido em 2 de 2. Trouxe os pontos 12 a 16 e repetiu os pontos 4 (5 conversas no dia), 6 (4 conversas: horário perguntado em texto em vez de lista) e 10 (3 conversas; um cliente respondeu "Não entendi" à tabela de preços).

**Ponto 1, corrigido.** O vigia encerra o chamado parado há 30 minutos no setor humano e avisava o cliente sempre que a última mensagem era dele. Em dois casos a equipe já tinha agendado e o cliente só respondeu "Obrigado". Agora o aviso não sai quando as três condições valem: a equipe escreveu nas últimas 24 horas; a última mensagem dela não é pergunta nem promessa de retorno ("vou ver", "já te falo", "um momento", "aguarde"); e, depois dela, todas as mensagens do cliente são só agradecimento ou despedida (`bvMSoAgradeceu`, em `workflows/shared/mensagens.js`). O chamado é encerrado do mesmo jeito, calado. Na dúvida, o aviso sai, como antes.

- Conta como agradecimento: "ok", "obrigado", "valeu", "beleza", "combinado", um emoji sozinho e parecidos, por lista de palavras (sem regex com repetição sobre texto de cliente).
- Não conta, e o aviso continua saindo: pergunta, pedido, cumprimento sozinho ("boa tarde"), "sim" ou "isso mesmo" sozinhos, mensagem com número ou horário ("ok 14:30" é escolha), emoji que não é de fecho, texto em outro alfabeto, mídia, mensagem com mais de 80 caracteres, mais de 6 mensagens depois da equipe, e equipe que nunca respondeu.
- A consulta `Filas paradas` devolve, por chamado, se a equipe respondeu e as mensagens do cliente depois dela (no máximo 7; texto longo, pergunta, mídia e mensagem com número ou "@" viram "?", para dado do cliente não trafegar pela execução, que fica salva quando dá erro). A decisão é do `Montar aviso`; não há nó novo.
- Testado no TESTE com uma cópia temporária do `bv-vigia` (só o ramo da fila humana, encerramento no Chat Master trocado por nó sem efeito, 9 contatos simulados). Calado: equipe resolveu e o cliente agradeceu; dois agradecimentos seguidos; equipe fechou com "te aguardamos" e o cliente agradeceu; equipe por último, como antes. Aviso: equipe nunca respondeu; ficou pergunta do cliente; equipe prometeu retorno e sumiu; equipe fez pergunta e sumiu; cliente escolheu um horário e ficou sem resposta.
- Duas revisões independentes do diff, em leitura (segurança; correção, performance, escala e duplicação), sem achado crítico. Delas saíram: a pergunta e a promessa de retorno da equipe, o número e o horário na mensagem do cliente, a lista de emojis de fecho, a retirada de palavras de apoio que deixavam passar pergunta sem "?" ("ok, e amanhã") e o corte de número e "@" no que trafega pela execução.

Limites conhecidos: promessa de retorno escrita de um jeito fora da lista ("deixa comigo") seguida de agradecimento encerra calado; a janela de 24 horas olha a última mensagem da equipe, não a da transferência em aberto (uma mensagem do cliente ao agente que não seja agradecimento já faz avisar); um envio do próprio agente gravado por engano como mensagem da equipe contaria como resposta (não conferido em PROD).

Não medido: o encerramento de verdade no Chat Master com a regra nova (no TESTE o vigia não encerra); a lista de palavras e a de promessas contra um volume maior de conversas reais.

**Pontos 2 e 12, corrigidos.**

- **Serviço trocado entre duas listas (ponto 2).** Cada lista de serviços numerava as opções de 1 a n. Num pedido com mais de um serviço o agente consulta duas listas (cortes; depois depilações) e pede a sequência pelos números; o "1" da primeira (corte adulto) era resolvido como o "1" da segunda (Depilação). Em PROD isso agendou três depilações para quem pediu corte e duas depilações; o resumo mostrava os serviços errados e o cliente confirmou sem ler. Agora o id de um serviço vale para a conversa inteira (`bvgIdsDeServico`, guardado em `pedido.servicos_vistos`): o serviço já mostrado mantém o id e o novo ganha o seguinte, e um serviço de lista anterior continua resolvendo. O id leva "s" na frente ("s1", "s2"): deixa de ser a posição na lista, e um "2" digitado pelo cliente nunca resolve como serviço. Junto, saiu um defeito antigo do mesmo tipo: no "agendar separado" os serviços da sequência eram devolvidos ao agente com ids pela posição, que não resolviam, e o fluxo nunca passava do primeiro serviço.
- **Título cortado (ponto 2).** O item da lista corta o nome em 24 caracteres e é esse texto que volta quando o cliente toca ("CORTE MAQUINA SIMPLES (1"). Quando o agente repassava esse texto como nome do serviço, ele não casava com o nome completo e a lista era reenviada. O título cortado da lista corrente passa a valer como o nome, desde que só um item da lista tenha esse título. Título de uma palavra ("Pezinho", "Selagem"), que tem formato de id, também passa a valer como nome quando não resolve como id.
- **Pedido de atendente (ponto 12).** Pedido de falar com uma pessoa ("atendente", "quero falar com alguém", "me passa para a equipe", "atendimento humano") é reconhecido no código (`bvPediuPessoa`) antes do modelo e segue pelo ramo que já transferia sem o agente no limite de turnos, com o motivo `pediu_pessoa`. Só vale quando a mensagem inteira é o pedido (mais cumprimento ou "por favor"): dúvida ("com quem eu falo?", "é robô ou pessoa?"), relato ("vou falar com a equipe do meu trabalho"), barbeiro pelo nome, "é para outra pessoa" e pedido junto de outro assunto ("pode confirmar, depois falo com o gerente") continuam com o modelo, como antes. Nenhum nó novo.
- Testado no TESTE: o roteiro `r12` do smoke reproduziu o defeito com o código antigo (pedido de corte adulto + duas depilações resolvido como três depilações) e passou com o novo; contato simulado que escreve "Atendente" recebe o texto de transferência, com a transferência aberta e o motivo registrado, e uma frase comum não transfere.
- Três revisões independentes, em leitura, sem achado crítico: segurança; correção, performance, escala e duplicação; e a do Chat Master (abaixo). Delas saíram o "s" no id, o defeito do "agendar separado", o título ambíguo, o título de uma palavra, a limpeza de "s1 | título" que sobraria no texto ao cliente, a regra da mensagem inteira no pedido de atendente (a primeira versão transferia "vou falar com a equipe do meu trabalho") e a cópia do pedido antigo na sessão nova, que deixa de carregar a lista de serviços e a cópia anterior.
- Limites conhecidos: os ids dependem de as ferramentas de um turno rodarem em série (medido em 19/11); se a transferência desse ramo falhar, o cliente recebe o texto de que a equipe vai ajudar e ninguém é acionado (já era assim no limite de turnos, que é raro; agora o ramo roda a cada pedido de atendente); pedidos de atendente fora das formas reconhecidas continuam dependendo do modelo.

**Revisão contra a documentação do Chat Master (23/11).** Feita por um especialista com as skills da plataforma, em leitura. Ficam abertos, por ordem de conferência:

1. A lista era enviada com `openTicket` 1 e o setor do agente. O artigo atual diz que isso põe a conversa em "Aguardando" mesmo em atendimento. **Medido e corrigido** (ver "Lista e chamado no setor humano", abaixo).
2. Cada item de lista aceita uma descrição (`desc`), que o projeto manda vazia: nome completo e preço cabem ali, com o título curto. Resolve o ponto 10 sem mudar o que volta no toque (o que volta é o título). Limites de título, descrição e quantidade não estão documentados.
3. As quebras de linha do texto do agente se perdem na composição das mensagens (as frases são rejuntadas com espaço), e por isso a tabela de preços sai num parágrafo só.
4. A transferência manda só chamado e setor (`updateAPI`); `status` e atendente ficam como estavam. O encerramento do vigia não informa `retornoAoAtendente`, então vale a opção do setor no painel.
5. `Transferir ticket` e `Encerrar atendimento` não informam `whatsappId`, que o artigo do Token da Empresa dá como obrigatório (hoje respondem 200).
6. Campos novos que o projeto não usa: `assinaturaIa` (marca a mensagem como enviada pela IA no painel) e `eventoId`/`sequencia` nos avisos (descartar repetido e perceber aviso perdido).

**Terceira leitura, das 17:55 às 20:00** (depois do deploy das correções 1 e 3): 30 mensagens de 9 contatos. Nenhuma resposta em dobro; cada resposta levou de 18 a 23 s (mediana de 21 s). O vigia encerrou 4 chamados: 2 calados pela regra nova (o cliente só escreveu "Blz, obrigado" e "Ok" depois da equipe), 1 calado como antes (equipe por último) e 1 com aviso (o cliente tinha respondido "pode ser às 16h então" e ninguém confirmou por escrito). A retomada das 19:30 virou agendamento (3 de 3 no dia). Trouxe os pontos 17 e 18 e repetiu o ponto 4.

**Ponto 18, corrigido em 24/11: o "sim" digitado em resposta ao lembrete de 24 h é tratado em código, sem o modelo.** O lembrete de 24 h é texto agendado no Chat Master e pede "SIM para confirmar ou NÃO se não puder vir". A resposta digitada ia ao agente, que dependia do modelo para chamar `confirmar_presenca`; em telefone com mais de um cadastro o modelo perguntava "qual deles é você?" (PROD, 1 contato; no TESTE, 6 de 6). Correção na recepção, nos nós que já existem (sem nó novo):

- `bvMReconhecer` reconhece a mensagem inteira "sim", "confirmo", "confirmado", "pode confirmar" e variações próximas (lista fechada, por palavras; aceita emoji de fecho). Qualquer coisa a mais ("sim, mas vou atrasar", número, pergunta) segue para o agente como antes.
- A rota (`bvMTituloRota`) só consome o "sim" quando há confirmação aberta, não há proposta pendente e **o lembrete foi a última coisa dita pela barbearia** (`lembrete_ultimo`, calculado na consulta `Confirmacao aberta?`): o lembrete já saiu e nenhuma mensagem nossa foi gravada desde 30 minutos antes dele (a validade de uma proposta; cobre a pergunta feita pelo agente logo antes do lembrete). No meio de uma conversa o "sim" responde à última pergunta do agente e continua indo para ele. Vale também para o título "Confirmo" escrito à mão.
- Consumido, o "sim" vai para o `bv-confirmacao` pelo mesmo caminho do título: confirma na Graces e responde com o texto padrão, que traz dia e hora. A espera de 10 s pelo evento da lista cai para 1 s na resposta digitada, que não tem esse evento.
- **O "não" digitado continua com o agente, de propósito** (revisão especialista de 24/11). Um "sim" consumido por engano confirma uma presença que já estava marcada; um "não" por engano muda o status na Graces, cancela o lembrete de 1 hora e abre a conversa de cancelamento. E há um ponto cego medido: mensagem que a equipe manda pelo aparelho com o chamado na fila do agente não entra em `mensagens` (23 de 104 em 10 dias), então um "não" à pergunta do barbeiro pareceria resposta ao lembrete. Com dois cadastros no telefone o "não" ainda depende do modelo (ver ponto 21: a instrução de vários cadastros passou a dizer que a escolha não segura a resposta à confirmação).
- A consulta `Confirmacao aberta?` passou a tolerar erro (segue para o agente em vez de derrubar a execução), porque agora todo "sim" isolado passa por ela.
- Medido no TESTE (smoke `m9`, agendamento real do barbeiro de teste, telefone com dois cadastros semeados): "Sim" confirmado na Graces (status 3) em cerca de 3 s, sem turno do agente e sem pergunta de cadastro; com mensagem nossa depois do lembrete, ou pouco antes dele, o "sim" foi para o agente; o "Não" digitado foi para o agente. `m2`, `m3`, `m4`, `m7` e `m8` sem falhas.
- Ganho de performance: a confirmação simples deixa de gastar um turno do modelo (em PROD, cerca de 15 a 20 s e uma chamada à OpenAI por confirmação).
- Limites: a mensagem consumida não entra em `mensagens` (como já era no toque da lista), só a resposta gravada no lembrete e o texto enviado; "Sum" seguido de "Sim" confirma pelo "Sim" e o "Sum" ainda gera um turno do agente; "Sim" seguido de "mas vou atrasar" confirma e o resto vai ao agente; cada "sim" isolado de qualquer conversa passa a custar uma consulta indexada na recepção.
**Ponto 14, corrigido em 24/11: última visita com vários serviços não vira "o de sempre".** A hipótese se confirmou no código: o histórico da Graces traz uma linha por serviço e a sugestão de repetir o último atendimento usava a primeira linha. O cliente tinha feito corte e duas depilações; perguntou só por um horário e recebeu o resumo de DEPILAÇÃO DE ORELHA. Agora a ferramenta junta as linhas da última visita (mesma comanda ou mesmo dia): com um serviço só, tudo segue como antes; com mais de um, não há serviço para repetir sozinho e o agente recebe só os nomes, com a instrução de perguntar se o cliente quer repetir os mesmos ou qual serviço quer, mandando a lista de serviços junto. Barbeiro que só a equipe agenda em qualquer linha da última visita leva à equipe. Se algum dos serviços da visita é "2ª vez" ou vem sem nome, não há sugestão nenhuma e o agente pergunta o serviço (revisão independente de 24/11). Medido no TESTE com o estado semeado (última visita com três serviços, pergunta "consigo agendar com o barbeiro tal, dia tal, às 14h?"): 14 de 14 rodadas perguntaram o serviço, nenhuma criou proposta; nas 5 rodadas depois do ajuste do texto, a pergunta foi com a lista de serviços. Limite: repetir os três de uma vez continua sendo o fluxo de vários serviços (um por vez na escolha).
**Ponto 2 (resto), corrigido em 24/11: incluir um serviço num agendamento que já existe.** O cliente tinha barba marcada e disse "barba e cabelo, né?". A busca de horário saiu para a barba (com o agendamento informado, `horarios_livres` ignorava o serviço novo), o barbeiro não tinha a manhã, e a escolha de outro barbeiro virou "trocar serviço" de barba por barba: o cabelo sumiu. Na Graces não existe "adicionar serviço"; incluir é agendar outro serviço colado ao que já existe. O que mudou, só em `workflows/shared/` e em textos (nenhum campo de ferramenta, nó ou requisição novos):

- **O serviço informado manda.** `horarios_livres` com o agendamento e um serviço diferente do dele, no mesmo dia, busca o serviço novo, com o barbeiro do agendamento. Em outro dia é recusado com orientação (é remarcação com serviço velho na chamada, ou agendamento novo sem o agendamento).
- **A oferta marca o horário colado.** `pedido.futuros` passou a guardar o fim (`HH:MM`) e o id do barbeiro de cada agendamento. Quando o cliente já tem agendamento no dia, a oferta marca os horários que terminam quando ele começa ou começam quando ele termina, e a ferramenta diz ao modelo qual é ("14:40 com Fulano, logo antes de barba design") e que o agendamento existente não muda. O horário colado entra na lista mesmo fora do período pedido; nesse caso o cliente precisa escolher (não vai direto ao resumo).
- **Barreiras.** "Trocar serviço" com o mesmo serviço é recusado (`mesmo_servico`); o resumo da troca de verdade passa a dizer o que sai ("no lugar de X das HH:MM"); agendamento do dia, ou o informado, com barbeiro que só a equipe agenda leva à equipe.
- **Texto.** Regra "Agendamento que já existe" ganhou o caso de incluir; a descrição do parâmetro do agendamento em `horarios_livres` deixou de dizer "só para reagendar".
- **Revisão independente** (24/11) pegou, antes da publicação, um caminho em que o cliente com agendamento do barbeiro da equipe, pedindo outro serviço, deixaria de ser encaminhado (corrigido, com teste em cinco variações), e a remarcação com serviço velho virando segundo agendamento (corrigido).
- **Prova no TESTE** (nível ferramenta, cliente e barbeiro de teste): barba agendada; `futuros` com fim e barbeiro, também na leitura da Graces (`horaFim` existe na API real); a busca para incluir o corte saiu para o corte, avisou a barba do dia e marcou os dois horários colados; o corte foi proposto como agendamento novo com o aviso do que ele já tem; na Graces ficaram corte 14:40–15:20 e barba 15:20–16:00; propostas: dois `agendar`, nenhum `trocar_servico`; a troca de barba por barba foi recusada.
- **Limites e pendências:** horário que se sobrepõe ao agendamento do próprio cliente continua podendo ser ofertado com outro barbeiro (já era assim); sem horário colado, o cliente escolhe outro da lista ou vai para a equipe (não há "remarcar os dois juntos"); conversa com `futuros` de antes desta versão só marca o "logo antes" até a próxima leitura. Origem do caso, ainda aberta: o cliente pediu dois serviços ("raspar na navalha e barba"), um deles não existe na Graces, e o agente agendou só o outro sem dizer qual não achou.
**Quarta leitura, das 20:00 às 22:20** (noite, pouco movimento): 9 mensagens de 3 contatos, nenhuma falha, proposta ou transferência no período. Duas confirmações de presença responderam certo. O terceiro contato é o ponto 21.

**Ponto 21, corrigido em 24/11.** Cliente com dois cadastros no telefone escreveu "Olá", recebeu a lista de cadastros, e em seguida pediu horário com o barbeiro que só a equipe agenda. O agente repetiu a lista ("para eu seguir com o atendimento, qual cadastro é o seu?") em vez de transferir; 55 minutos depois o cliente mandou o horário que queria e recebeu o texto de laço. Ficou sem atendimento. A ferramenta `transferir_atendimento` não exige cadastro escolhido: foi o modelo que insistiu na identificação, porque o contexto de vários cadastros só dizia para perguntar qual é o cliente. Reproduzido no TESTE com o estado semeado como a identificação deixa: 2 de 10 falharam do mesmo jeito. Correção: uma frase no contexto de vários cadastros (`bvContextoCliente`) dizendo que a escolha só é necessária para agendar e não segura a transferência (barbeiro da equipe, pedido de pessoa, atraso). Medido depois: 16 de 16 transferiram; controle com pedido comum ("quero cortar o cabelo amanhã à tarde"), 0 de 4 transferiram e todos pediram o cadastro. A mesma frase passou a cobrir a resposta a uma confirmação de presença aberta (o lembrete é do telefone, não do cadastro): com dois cadastros, o "Não" seco ao lembrete caía em "qual cadastro é o seu?" em 4 de 5 e o "Sim" em 6 de 6; com a frase, 6 de 6 e 4 de 4 trataram a confirmação. Com a frase final, o pedido do barbeiro da equipe transferiu em 6 de 6 e o controle em 0 de 3. O "sim" simples ao lembrete, além disso, deixou de depender do modelo (ponto 18).

**Ponto 17, corrigido: cadastro pedido uma vez só.** Cliente sem cadastro que pede o barbeiro que só a equipe agenda continua sendo convidado a se cadastrar antes da transferência (roteiro R21), mas a ferramenta só segura a transferência no turno em que ele foi visto sem cadastro (`pedido.sem_cadastro_desde`, gravado na identificação). Num turno seguinte, ainda sem cadastro, a transferência sai. No TESTE, o caso de PROD foi reproduzido com contato simulado (o agente pede o cadastro por conta própria na primeira mensagem, sem passar pela ferramenta; por isso a marca nasce na identificação e não na recusa) e, com a correção, a segunda mensagem transfere.

**Lista e chamado no setor humano, medido e corrigido.** Medição na conexão de teste, com o chamado do contato de teste posto em cada estado pela API antes do envio:

| Estado do chamado antes | Texto, `openTicket` '0' | Lista, `openTicket` '0' | Lista, `openTicket` '1' e setor '0' | Lista, `openTicket` '1' e um setor que não é o humano |
|---|---|---|---|---|
| Em atendimento no setor humano (`open`, com atendente) | igual | igual | igual | **foi para "Aguardando" no setor informado** |
| Aguardando no setor do agente, sem atendente | não medido | igual | igual | não medido (já está lá) |
| Encerrado | não medido | continua encerrado | continua encerrado | abre de novo, "Aguardando" no setor informado |

A última coluna é o que PROD enviava. As listas passam a ir com `openTicket` '0', como o texto: em nenhum estado o chamado mudou, e a lista foi entregue e registrada no chamado. A cópia antiga do artigo da plataforma dizia que '0' encerraria o chamado; a medição não confirmou. A montagem da lista, que estava em três lugares (`Saidas` do `entregar-rajada`, `bvMLista` e `bvMListaDecisao`), ficou num só (`bvMListaDe`, em `workflows/shared/mensagens.js`), e o `Saidas` passou a usar os mesmos montadores do resto do projeto para texto e lista. O histórico explica o valor antigo: a lista nasceu com `openTicket` 1 e setor 0, que mantém o status; quando PROD ganhou o setor do agente (107), a mesma chamada passou a mover o chamado.

O que muda de comportamento: (a) uma lista enviada com o chamado no setor humano não o tira mais de lá, e a resposta do cliente a essa lista fica com a equipe (o agente cala no setor humano); o caso prático é a lista "remarcar ou cancelar" do `bv-confirmacao`; (b) uma lista enviada a um chamado encerrado não o reabre; o chamado reabre quando o cliente responde, como já acontece com o texto.

Não medido: onde cai a resposta do cliente a uma lista enviada com o chamado encerrado; o efeito em PROD.

Limite do ponto 17: a ferramenta só exige o cadastro no turno em que o cliente foi visto sem cadastro, que é o primeiro da sessão. Quem diz "oi" e só na mensagem seguinte pede o barbeiro é transferido sem a ferramenta exigir o cadastro (o agente ainda pode pedi-lo por conta própria). Quando o cliente manda os dados, o cadastro continua sendo feito antes da transferência (3 de 3 no TESTE).

**O que pode sair do código e ir para a configuração do Chat Master** (levantamento do especialista na documentação da plataforma, 23/11; decisão do owner: o que der para resolver por configuração é melhor). Nada disto foi ligado; são opções do painel, que só o owner altera.

| Prioridade | Recurso da plataforma | Onde fica | O que cobre |
|---|---|---|---|
| Ligar já | Notificar Operador no WhatsApp | Setores & Chatbot › setor humano › aba Geral | Avisa os atendentes quando uma conversa chega em "Aguardando" no setor humano |
| Ligar já | Mensagem de despedida do setor e Mensagem de Ausência | Setor › aba Mensagens; perfil do atendente | Textos de encerramento e de ausência no atendimento humano |
| Medir antes | Retornar ao mesmo atendente, com prazo e setor de transbordo | Setor humano › aba Geral | Cliente que responde depois do encerramento volta para quem o atendeu |
| Medir antes | Inatividade e Mensagem por Inatividade | Conexões › editar › Setores & Tempos e Mensagens | Encerra chamado em atendimento parado; vale para a conexão inteira e não encerra se a última mensagem foi do cliente |
| Medir antes | Webhook do Setor do agente | Setores & Chatbot › setor › URL do Webhook | O n8n receberia só os avisos do setor do agente; os nomes dos avisos mudam e saem de cena o encerramento e as respostas da equipe |
| Medir antes | `assinaturaIa` nos envios | campo da API | Marca no painel as mensagens enviadas pela IA |

Continuam em código, segundo o mesmo levantamento: o silêncio do agente pelo setor do chamado (os envios que o agente inicia não passam por aviso), o encerramento de chamado em "Aguardando" ou com a última mensagem do cliente (a inatividade nativa não cobre), a transferência por intenção (palavra-chave e menu de setores falam antes do agente e não agem no meio da conversa), a junção de mensagens seguidas do cliente e pular lembrete em atendimento humano (o módulo de Agendamentos não tem essa opção).

**Pontos 19 e 20: agendamento feito por pacote (achados na prova ao vivo do item 12, 23/11).**

- **Ponto 19, corrigido.** Para o agendamento feito por pacote, `/agenda/agendamentos` devolve o serviço dentro de `servicoPacote` e não traz `idServico` nem `descricaoServico` no nível de cima. O agente lia só o nível de cima: listava o agendamento sem o nome do serviço, montava o resumo "Cancelar undefined em ..." e a busca de horários para remarcar ia sem serviço. Vale para PROD desde sempre, sem depender do item 12: é o caso de quem tem pacote e foi agendado pela equipe. Na agenda da loja, de 565 agendamentos em 15 dias, 58 são por pacote. A correção sobe os dois campos num lugar só (`bvMComServico`, em `workflows/shared/mensagens.js`), usado pelo agente (`bvgResp`) e pelos lembretes (`bvMAgendaDe`). Conferido no TESTE, só em leitura, com 4 clientes reais: 5 de 5 agendamentos por pacote listados com o serviço. Na prova com o cliente de teste, pelas ferramentas do agente: listou "24/11 08:00 corte adulto", remarcou das 08:00 para as 08:40 (mesmo agendamento, ainda por pacote) e o resumo do cancelamento saiu "Cancelar corte adulto em terça-feira, 24/11 às 08:40". Revisão independente do diff, em leitura, sem achado crítico.
- **Ponto 20.** No cliente de teste, o agendamento pelo pacote reservou a sessão (de 4 para 3) e o cancelamento pela API não a devolveu: `/agenda/pacotes` continuou com 3, depois com 2 na segunda rodada e com 1 na terceira, até 90 s depois e de novo minutos depois. O owner havia informado que cancelar devolve a sessão; pela API não foi o que se mediu (pode valer só para o cancelamento feito no sistema da Graces). Enquanto isso não se resolve, o cliente que cancela pelo agente um agendamento feito por pacote pode perder a sessão. Opções: o agente passar para a equipe o cancelamento e a remarcação de agendamento por pacote; ou confirmar com a Graces como a API devolve a sessão. **Remarcar mantém a sessão** (medido na terceira rodada: o `PUT` moveu o mesmo agendamento e as seções em aberto não mudaram). Com o ponto 19 corrigido, a remarcação de agendamento por pacote pelo agente, que antes falhava, passa a funcionar.

**Ponto 20, corrigido em 24/11: o agente não cancela agendamento de pacote.** O owner conferiu no sistema da Graces o pacote do cliente de teste: as três sessões usadas nas provas continuavam como "Agendado" depois de os agendamentos terem sido cancelados pela API, e só a quarta estava "Em Aberto". A sessão só volta quando a equipe a libera no sistema. Regra adotada:

- **Remarcar segue com o agente.** O `PUT` move o mesmo agendamento e a sessão é mantida (medido).
- **Cancelar vai para a equipe.** O pedido de cancelamento continua igual até a escolha do cliente: o agente mostra o agendamento e oferece "Remarcar / Cancelar mesmo". Se ele escolhe cancelar mesmo, a ferramenta não manda o `DELETE`: transfere a conversa com o texto "Como esse horário é do seu pacote, quem cancela é a equipe, para a sessão voltar para o seu pacote." O mesmo vale quando ele pede para cancelar vários de uma vez e um deles é de pacote, e para a troca de serviço de um agendamento de pacote (que apagaria o antigo).
- **A decisão é pela agenda lida na hora.** Antes de qualquer `DELETE` (cancelar um, cancelar vários, ou o antigo da troca de serviço), a fase 2 lê `GET /agenda/agendamentos` do cliente e confere cada agendamento que seria apagado: se a Graces diz que é de pacote (`servicoPacote`), transfere. Vale para a proposta criada pelo "Não vou poder" do lembrete e para a criada antes desta versão, que não trazem marca nenhuma (a proposta do lembrete passou a guardar o `idCliente`). A marca que acompanha a opção e os agendamentos da conversa serve só para avisar o modelo na fase 1.
- **Na dúvida, nada é apagado.** Leitura que falha: o agente pede desculpas e oferece tentar de novo ou a equipe (`nao_conferido`). Agendamento que não está mais na agenda do cliente: confere de novo com `meus_agendamentos` (`agendamento_nao_encontrado`). Cliente desconhecido na proposta e na conversa: transfere. Custo: uma leitura a mais por cancelamento (o reagendar e a troca já faziam essa leitura).
- Provado no TESTE com o cliente de teste do pacote e o barbeiro de teste: agendou pelo pacote, listou com o serviço, o pedido de cancelamento ofereceu remarcar e avisou que é do pacote, o "cancelar mesmo" transferiu com o texto próprio, o agendamento continuou de pé e a transferência ficou aberta com o motivo `pacote`.

Revisão especialista do desenho final (24/11): todos os pontos do código que montam `DELETE /agenda/...` passam pela conferência (cancelar, cada item do conjunto, e o antigo da troca, inclusive depois de `POST` sem resposta); nenhum workflow chama o `DELETE` da Graces por fora da ferramenta. Dela entraram: `servicoPacote` em qualquer formato conta como pacote; série recorrente (várias linhas com o mesmo `idAgenda`) vai para a equipe se qualquer ocorrência for de pacote; a troca confere com página de 200; leitura que falha fica em `falhas_agente`; e um defeito antigo corrigido de passagem (depois de um `DELETE` sem resposta, a verificação lia a agenda sem o cliente e a repetição saía vazia). Medido no TESTE na mesma data: depois de remarcado pelo agente, o agendamento de pacote continua vindo com `servicoPacote` em `/agenda/agendamentos` (a conferência segue valendo) e a sessão é mantida. Limite conhecido: lembrete de agendamento feito pela equipe, em telefone com mais de um cadastro, quando a conversa está no outro cadastro, dá `agendamento_nao_encontrado` e o agente passa para a equipe se o cliente confirmar que o horário existe.

Documentação da Graces relida em 24/11 (portal `api.gracesonline.com.br/docs/agendamentos`, indicado pelo owner): agendar por seção **reserva a seção no mesmo instante** e ela sai da consulta de disponíveis; o `DELETE` é descrito só como "cancelamento simples", sem nada sobre a seção; `GET /agenda/pacotes` lista só seções "em aberto, não vencidas e não reservadas"; **não há endpoint nem parâmetro para liberar a seção**. O portal bate com o que se mediu, e a devolução da sessão no cancelamento continua sem caminho pela API. Em aberto com a Graces: uma forma de a API devolver a sessão no cancelamento. Novidade do portal: a página de **webhooks** saiu do "em breve" (eventos de agendamento criado, alterado, status, executado e cancelado, com `packageItemId` na sessão de pacote); o agente ainda não usa.




## Item 12: agendar pelo pacote (23/11)

Pedido do owner em 23/11. Revê a decisão de 19/10 (o agente não tratava de pacote): a constituição passou à versão 4.0.0, com o princípio XI redefinido.

### Como funciona

| Momento | O que o agente faz |
|---|---|
| Antes do resumo | `agendar` consulta `GET /agenda/pacotes` para o cliente e o serviço (um GET por serviço distinto, no conjunto). Com sessão em aberto, o item é marcado e o resumo diz "(abatido do seu pacote)" no lugar do valor |
| Depois do "sim" | A sessão é relida junto da revalidação do horário e o `POST /agenda` leva `idClienteItemPacote` no lugar de `idServico` |
| Agendado pelo pacote | Não transfere para a equipe |
| Cliente diz ter pacote e a Graces não mostra | Como antes: agenda pelo valor avulso, avisa e passa para a equipe conferir (motivo `pacote`) |

Vale para agendar, trocar de serviço e conjunto de serviços (cada serviço consulta o seu pacote; um resumo pode ter um item do pacote e outro com valor). Remarcar e cancelar não mudam.

### Barreiras em código

- O identificador da sessão só sai da leitura da Graces, relida na hora de gravar. Não vem do modelo e não fica guardado na proposta, que leva só a marca `pacote`.
- Um lugar só monta o corpo do `POST /agenda` (`bvgCorpoAgendar`), sempre com exatamente um entre o serviço e a sessão.
- Só conta sessão do próprio serviço pedido, de pacote que não vence antes do dia do agendamento, com identificador no formato; repetida conta uma vez. Nada do texto que a Graces devolve sobre o pacote chega ao modelo ou ao cliente.
- Resumo e gravação nunca divergem: resumo com pacote não vira cobrança avulsa (sem sessão na hora de gravar, nada é gravado e o agente oferece o valor avulso num resumo novo), e resumo com valor não consome sessão.
- Leitura do pacote com falha antes do resumo: a proposta sai pelo valor avulso, como era antes, e a falha fica em `falhas_agente` (`pacotes`). Na hora de gravar: nada é gravado, a proposta falha (`pacote_nao_conferido`) e a oferta de horário continua valendo.
- Escrita sem resposta: a conferência acha o agendamento novo pelo barbeiro e pelo início; pelo pacote, o serviço não entra na comparação. A repetição reusa a mesma sessão.

### Custo

Uma chamada a mais antes de cada resumo (0,05 a 0,15 s medidos) e, só quando o item sai do pacote, uma a mais no estágio de revalidação que já existia. O workflow `bv-graces` não mudou: os nós já executam qualquer chamada do plano.

### Revisões independentes do diff

Duas, em leitura, antes do PR: segurança; correção, performance, escala e duplicação. Nenhum achado crítico ou alto. Delas saíram: conferir o serviço da sessão, descartar pacote que vence antes do dia, tirar sessão repetida, tratar resposta `200` fora do formato como falha, não depender do serviço na conferência depois de escrita sem resposta, não deixar a proposta "incerta" quando só a leitura do pacote falhou, e a frase da orientação para resumo misto.

### Testes

- `tests/graces.test.js` (bloco "Item 12" e o do conjunto): proposta com e sem pacote, defesas sobre a resposta, falhas de leitura nas duas fases, corpo do POST, repetição, conferência, troca de serviço, conjunto misto, mesmo serviço duas vezes, estado depois da ida e volta por JSON.
- `tests/test_workflows_agente.py`: um só lugar monta o POST e nenhum campo de entrada carrega a sessão.
- TESTE: R1, R27 e R29 aprovados com o código novo, sem falha gravada. São caminhos sem pacote: provam que a consulta nova não quebra o agendamento comum.

### O que falta e limites

- **Prova ao vivo, feita em 23/11** com o cliente de teste do pacote (cadastro nº 3700, "Pacote Corte Adulto 20%", 4 sessões) e o barbeiro de teste. O resumo saiu "corte adulto com Kiel em terça-feira, 24/11 às 08:00 (abatido do seu pacote)", sem valor; a fase 2 agendou pela sessão e a sessão saiu de `/agenda/pacotes` (de 4 para 3). `idProdutoServico` é o `idServico` da loja. O agendamento volta de `/agenda/agendamentos` com o serviço dentro de `servicoPacote` (ponto 19 da leitura de 23/11, já corrigido em PROD). Remarcar pelo agente move o mesmo agendamento e mantém a sessão. Não medido: a recusa por validade e por sessão já usada.
- **Cancelar pela API não devolve a sessão** (ponto 20 da leitura de 23/11): resolvido em 24/11 com a barreira do ponto 20. O agente não cancela agendamento de pacote; remarca normalmente e, se o cliente quer cancelar mesmo, passa para a equipe. Com isso o item 12 pode ir para PROD.
- **Remarcar agendamento de pacote não exige sessão em aberto** (24/11). Na proposta de remarcar, `pacote` quer dizer "o agendamento remarcado é de pacote"; na de agendar, "abater uma sessão". Ao juntar o item 12 com a barreira, a remarcação passava a ler o pacote e a exigir uma sessão livre, e recusaria o cliente com todas as sessões já agendadas. Corrigido: só agendar e trocar de serviço leem a sessão. Provado no TESTE com o pacote de teste em zero sessões livres: remarcou, a sessão foi mantida e o agendamento continuou vindo com `servicoPacote`.
- **Roteiro `r11` do smoke.** Faz a prova inteira (agenda pelo pacote, confere o resumo e a sessão, cancela direto pela API para limpar). Cada rodada gasta uma sessão do pacote de teste; não entra nas rodadas de rotina. Em 24/11 o pacote de teste ficou com 0 sessões em aberto: para rodar de novo, a equipe precisa liberar as sessões no sistema da Graces.
- **Consentimento depende de o modelo repassar o resumo**, como já era com o valor. Não há barreira em código que garanta a frase do abatimento no texto enviado.
- **Identidade é o telefone.** Dependente agendado no cadastro do titular consome o pacote do titular, e o resumo diz "seu pacote".
- **No TESTE a sessão é de verdade.** O redirecionamento troca só o barbeiro: contato de teste com pacote real tem a sessão reservada pelo teste, e ela não volta com o cancelamento (medido).
- **Volta de versão.** Proposta com pacote ainda pendente, lida pelo código antigo, seria gravada pelo valor avulso. Em caso de volta, as pendentes com `pacote` devem ser marcadas como substituídas.
- **Confirmação antes da transferência (R29).** No caminho em que a Graces não mostra pacote, o modelo às vezes manda só o texto da transferência, sem a frase do agendamento feito (visto em 18/11 e em 23/11). Não é novo e não foi tratado aqui.

## Cabelo e barba: dois horários seguidos (24/11)

Pedido do owner (24/11): quando o cliente quer cabelo e barba, o atendimento ocupa dois horários, então só vale início com dois horários livres em seguida.

### O que foi medido antes de mexer

- **A grade da Graces está certa.** Os serviços combinados ("Cabelo adulto + barba" e "Cabelo máquina + barba") têm 80 min para os barbeiros reais, e `GET /agenda/horarios-livres` só devolve início com os 80 min livres: 269 inícios de 4 barbeiros em 7 dias conferidos contra as ocupações, nenhum furado; 44 inícios que o corte de 40 min tinha ficaram fora da grade do combinado. O barbeiro de teste é exceção: para ele o combinado dura 40 min.
- **O defeito era a escolha do serviço.** Em 18 de 18 conversas no TESTE ("cabelo e barba", "corte e barba", "barba e cabelo", "raspar na navalha e barba", "cortar o cabelo e fazer a barba", "máquina e barba"), o agente mandou a lista geral de serviços, só os cortes, ou barbas e combinados misturados. Quem toca em "corte adulto" ou "barba design" fica com um horário só. Em PROD (23/11) um cliente pediu "raspar na navalha e barba" e saiu com só a barba agendada.

### Como funciona

A decisão é do código, pela fala do cliente no turno (`texto_cliente`, que o fluxo entrega às ferramentas sem passar pelo modelo). `listar_servicos` passou a receber esse campo, como `horarios_livres`, `agendar`, `reagendar` e `cancelar` já recebiam.

- **Detecção (`bvgCabeloEBarba`).** Cabelo, corte, cortar, raspar, máquina ou degradê ligados a barba por "e", "mais", "com", "+", "/", "&" ou vírgula, nas duas ordens. Não contam: "cortar a barba", "corte de barba", "cabelo, sem barba", "hoje é barba", serviço de outra pessoa ("corte do meu filho e barba"), bigode e avulsos ditos pelo nome ("corte adulto e barba express").
- **Lista só com os combinados (`bvgListarOsDois`).** Com a fala dos dois, `listar_servicos` devolve só os serviços combinados, com a orientação de perguntar qual deles. Vale uma vez (se a oferta atual já é a dos combinados, segue a busca do modelo), só quando a busca do modelo é geral ou de cabelo e barba, e só para quem não tem agendamento futuro. Loja sem serviço combinado: segue a lista que o modelo pediu.
- **Barreira no avulso (`bvgSoUmDosDois`).** `horarios_livres` de um serviço avulso e `agendar` (fase 1) de horário de serviço avulso, no turno em que o cliente falou dos dois, são recusados com `pediu_dois_servicos`. A recusa sai uma vez por turno (`pedido.dois_avisado`): se o modelo insiste, é porque o cliente quer mesmo um só, e a detecção errada custa uma chamada, nunca um laço. Com agendamento de outro serviço no dia da busca, é serviço a mais e segue pelo horário colado.
- **Passam sem barreira:** o próprio combinado, a sequência (`id_opcoes_servicos`), remarcar, trocar de serviço e a confirmação (fase 2).
- **Prompt:** uma frase manda buscar os combinados para cabelo e barba e nunca agendar só um dos dois sem o cliente pedir.

Custo: nenhuma chamada a mais no caminho comum; com a fala dos dois e busca do modelo por um termo, um `GET /agenda/servicos` a mais, em paralelo.

### Revisões

- **Revisão independente do diff (especialista de backend).** Achou que `listar_servicos` não recebia `texto_cliente` no fluxo (o filtro nunca rodaria), que a detecção disparava em pedido de um serviço só ("hoje é barba", "cortar o bigode e a barba", pai e filho) sem saída no turno, que frases comuns escapavam ("só cabelo e barba", "Fala amigo, …", "um corte e uma barba") e que a isenção por qualquer agendamento futuro era larga demais. Tudo corrigido e coberto por teste.
- **Especialista do Chat Master.** Lista de 2 itens não tem mínimo documentado que impeça, e o projeto já manda listas de 2 itens; os dois títulos (21 e 22 caracteres) cabem no corte de 24.

### Medição no TESTE (conversa simulada, sem escrita na Graces)

| Caso | Antes | Depois |
|---|---|---|
| "cabelo e barba", "corte e barba", "barba e cabelo" (9 conversas) | 0 de 9 | 9 de 9 |
| "raspar na navalha e barba", depois da pergunta do serviço (PROD, 23/11) | 0 de 3 | 3 de 3 |
| "cortar o cabelo e fazer a barba" | 0 de 3 | 3 de 3 |
| "máquina e barba" | 0 de 3 | 3 de 3 (na primeira rodada, 2 de 3: a busca do modelo por "maquina" escapava do filtro; corrigido e medido de novo) |
| "um corte e uma barba", "Fala amigo, só cabelo e barba" (casos da revisão) | não medido | 6 de 6 |

| Controles de um serviço só: "cortar a barba", "só o corte de cabelo, sem barba", "fazer a barba", "hoje é barba" (12 conversas) | lista de barbas ou de cortes | 12 de 12 com a mesma lista de antes |
| Controle "corte adulto e barba express" (avulsos ditos pelo nome) | não medido | 3 de 3: sequência dos dois serviços, em horários seguidos |

"Certo" = a lista leva só os combinados, ou a busca de horário já é do combinado.

Suíte no TESTE com a mudança: R1, R2, R5, R18 e R23 aprovados (p95 de 24,8 s). O R5 ("Quero cortar e fazer a barba sábado de manhã") foi ajustado: esperava um agendamento por serviço e agora aceita o serviço combinado, que é o que o agente oferece.

### O que falta e limites

- **Período na sequência de serviços (já existia).** No controle "corte adulto e barba express amanhã à tarde", a lista de sequências trouxe inícios de manhã: a busca encadeada não aplica o período pedido. Não é desta mudança e não foi tratado.
- **A marca vale só no turno da fala.** "Cabelo e barba amanhã", pergunta do agente, "de manhã": a busca desse último turno roda sem a marca; aí valem a lista dos combinados, que já saiu, e a frase do prompt.
- **Erro de digitação, frase muito longa e áudio com ponto entre as duas partes** ("Quero cortar o cabelo. E fazer a barba também.") não são detectados; vale o comportamento anterior.
- **Cliente com pacote de um dos serviços.** O combinado é outro serviço na Graces: a sessão do pacote não é abatida e o resumo sai pelo valor avulso. A orientação manda usar os avulsos em sequência quando o cliente diz que tem pacote, e a transferência por `pacote` continua valendo. Falta o owner dizer quais pacotes existem.
- **Barbeiro de teste:** como o combinado dura 40 min para ele, não há como provar no TESTE, com escrita, que o agendamento ocupa 80 min; a prova é a leitura da grade dos barbeiros reais.

### Serviço pedido que a loja não tem (24/11)

Origem do ponto 2 da leitura de 23/11: o cliente pediu dois serviços, um não existia com aquele nome, e o agente seguiu só com o outro, calado. O caso real ("raspar na navalha e barba") foi resolvido pela lista dos combinados. Para os outros pares:

- **Base medida no TESTE:** o agente já dizia qual serviço não achou em 9 de 9 conversas ("barba e sobrancelha", "corte e luzes", "barba e limpeza de pele"). No controle "barba e pezinho" (os dois existem), 1 de 3 procurou a frase inteira como um serviço só e disse que não achou.
- **O que mudou:** `listar_servicos` sem resultado devolve a orientação de dizer qual serviço não achou, sem trocar por outro nem seguir só com o que achou, e deixa a oferta como estava (a lista do outro serviço pedido não some). No prompt, uma frase manda procurar cada serviço pelo termo dele antes de buscar horário.
- **Efeito colateral corrigido:** com duas buscas de serviço no mesmo turno, a segunda desfazia a lista dos combinados (1 de 2 em "raspar na navalha e barba"). O "vale uma vez" da lista dos combinados passou a ser por turno (`pedido.dois_turno`).

| Medição no TESTE | Antes | Depois |
|---|---|---|
| Dois serviços, um não existe (três frases) | 9 de 9 dizem qual não acharam | 17 de 18, somando duas rodadas (uma conversa perguntou a barba sem dizer que não achou "limpeza de pele") |
| "Barba e pezinho" (os dois existem) | 2 de 3 | 3 de 3 |
| "Raspar na navalha e barba" e "um corte e uma barba" (combinados) | 6 de 6 | 8 de 8 |

Ou seja: o comportamento pedido já existia e a medição não mostra ganho nele; a mudança o amarra ao resultado da ferramenta e corrige o controle. Não há barreira em código que impeça o modelo de não procurar um dos serviços.

### Cliente com pacote (24/11)

O serviço combinado é outro serviço na Graces: quem tem pacote de corte ou de barba e é levado ao combinado não abate a sessão e vê o resumo pelo valor avulso.

- **Medido na Graces:** dos 288 clientes com agendamento entre 17/11 e 01/12, 65 (23%) tinham pacote em aberto, e cerca de 15 tinham dois. Todos os pacotes são de serviço avulso (corte adulto, barba design, máquina, juvenil, infantil, barba express); nenhum é do combinado. O owner confirmou pela lista de pacotes do sistema. A API só lista pacote por cliente (`idCliente` obrigatório), então a leitura partiu da agenda da loja.
- **Como funciona:** com a fala dos dois e cliente com cadastro, `listar_servicos` lê o catálogo e, em paralelo, os pacotes do cliente (`bvgDoPacote`, com o mesmo leitor de seções da proposta). Se há pacote de cabelo ou de barba de adulto, o agente não oferece o combinado: diz que o pacote entra, pergunta só o que falta (a lista leva só essas opções) e busca os dois em sequência (`id_opcoes_servicos`), que também ocupa dois horários seguidos e abate a sessão no resumo.
- **O código monta o par.** No turno em que o cliente escolhe ("barba design"), a busca de um serviço só vira a sequência do serviço do pacote com o escolhido (`pedido.dois_pacote` guarda o id do serviço do pacote de cada tipo). Vale enquanto a oferta é a lista de serviços; depois dela, quem pede um só é atendido.
- **Ficam nos combinados:** cliente sem pacote, pacote só infantil ou juvenil (no cadastro, é do filho), camuflagem, serviço fora do catálogo e leitura de pacote com falha. Catálogo com falha devolve erro, não lista vazia.
- **Custo:** só na listagem com a fala dos dois e cadastro: uma leitura de pacotes em paralelo e o catálogo inteiro no lugar da busca filtrada. Para quem tem pacote, a busca de horário é a da sequência (mais chamadas que a do combinado).

Medição no TESTE com o cliente de teste do pacote de corte, até o resumo e sem confirmar (nenhuma sessão consumida: 4 antes, 4 depois):

| Caso | Resultado |
|---|---|
| Cliente com pacote pede "cabelo e barba", responde "barba design" e escolhe um horário | 4 de 4: pergunta só a barba, oferece a sequência corte adulto + barba design e o resumo sai "corte adulto (abatido do seu pacote) + barba design (R$ 70,00)" |
| Cliente sem pacote pede "cabelo e barba" | 3 de 3 com os combinados, como antes |

Na primeira versão, 2 de 2 conversas voltaram aos combinados no turno da escolha (o modelo listava "cabelo e barba" de novo, sem a fala no turno); corrigido com `pedido.dois_pacote`. A revisão independente achou ainda que a busca só da barba passava sem barreira nesse turno (corrigido: o código monta o par), a lista de avulsos pendurada quando o pacote cobre os dois tipos, dois serviços do mesmo tipo no pacote e o leitor de seções mais frouxo que o da proposta. Tudo corrigido e com teste.

Limites:

- **A sequência não respeita o barbeiro nem o período pedidos** (já era assim): "cabelo e barba amanhã de manhã com o Pedro", para quem tem pacote, traz os inícios do dia inteiro de todos os barbeiros. Com este ajuste, cerca de um quarto dos clientes passa por esse caminho no pedido mais comum. Fica como decisão do owner.
- **Pacote que vence antes do dia marcado:** a listagem não tem data; o agente diz que o pacote entra e o resumo sai pelo valor avulso.
- **Cliente com pacote que quer o combinado mesmo assim:** a listagem de "cabelo e barba" volta ao caminho do pacote; a saída é pedir o serviço pelo nome.
- **Prova com escrita não feita:** confirmar o agendamento consumiria uma sessão do pacote de teste, que a API não devolve. O abatimento na escrita é o do item 12, já provado em 23/11.

### Sequência respeita o barbeiro e o período (24/11)

Pedido do owner (24/11). A busca de dois ou três serviços em sequência (`id_opcoes_servicos`) ignorava o barbeiro e o período pedidos. Desde o ajuste do pacote, cerca de um quarto dos clientes passa por ela ao pedir "cabelo e barba".

- **Base medida no TESTE:** cliente com pacote, "cabelo e barba amanhã de manhã com o Black": 0 de 2; saíram 21 inícios, das 09:20 às 19:20, de três barbeiros. "Corte adulto e barba express amanhã à tarde com o Black": 0 de 2; o agente voltava a perguntar o serviço e, numa rodada, ofereceu os combinados.
- **Período e hora mínima:** valem pelo início da sequência, com a mesma regra da busca de um serviço (`bvgNoPedido`, `bvgQuando`, extraídas do caminho de um serviço, que passou a usá-las; saídas dele idênticas em 20.000 cenários comparados com a versão anterior).
- **Barbeiro:** o informado na busca ou o já escolhido na conversa (`bvgBarbeiroDe`); `qualquer=true` traz todos. Com barbeiro escolhido só ele é consultado; os outros entram num estágio a mais quando ele não tem o pedido (menos chamadas no caso comum, nunca mais que antes).
- **Quando não há o que foi pedido** (`bvgSeqsDoPedido`): saem as sequências que atendem um dos dois (as dele em outro horário e as de outros no período) e, sem essas, as do dia, com a orientação dizendo o que não há. A proposta dessas opções espera a escolha do cliente (`cliente_nao_escolheu` no turno da busca), como na busca de um serviço.
- **Pacote:** a montagem do par (`pedido.dois_pacote`) preserva o barbeiro e o período, e vale também com a lista de barbeiros na tela ou com o serviço vindo de `pedido.servico` (quem pede um barbeiro passa por `listar_barbeiros` antes da busca).
- **Avulsos ditos pelo nome** ("corte adulto e barba express"): frase no prompt manda buscar os dois em sequência, não o combinado.
- **Barbeiro que não veio da lista:** recusa própria (`barbeiro_nao_listado`), mandando listar os barbeiros ou buscar sem barbeiro.
- **Revisão independente:** seis achados, todos corrigidos com teste: a conversão do pacote se desfazia depois de `listar_barbeiros`; hora aproximada passava pela barreira; a busca dia a dia travava no primeiro dia com sequência fora do pedido (regressão para "depois das 18"); rebusca idêntica no turno seguinte barrava a escolha do cliente; orientação descrevia itens que a lista não tinha; recusa do barbeiro mandava reenviar a lista errada.

| Medição no TESTE | Antes | Depois |
|---|---|---|
| Cliente com pacote, "cabelo e barba amanhã de manhã com o Black" e depois "barba design" | 0 de 2 | 3 de 3: só o Black, de 09:20 a 11:20 |
| "Corte adulto e barba express amanhã à tarde com o Black" | 0 de 2 | 3 de 3: sequência só com o Black, de 12:00 a 17:20 |

Limites: barbeiro de uma busca anterior restringe a sequência seguinte (como já acontece com um serviço; `qualquer=true` solta); com mais barbeiros que o teto por estágio, um dos outros fica fora das alternativas; sequência de três serviços não tem teste novo; "só a barba", dito logo depois da listagem de cabelo e barba de quem tem pacote, ainda vira o par enquanto a oferta é a lista de serviços ou de barbeiros.

## Laço: na terceira vez transfere direto (24/11)

Decisão do owner (24/11). Até aqui, na terceira vez da mesma pergunta o agente só oferecia a equipe ("Quer que eu passe para a equipe te ajudar por aqui?"). Em PROD (23/11) um cliente não respondeu a essa oferta e a conversa ficou na fila de ninguém.

### Como funciona

- **Contexto (`bvLaco`).** Com a mesma lista ou a mesma pergunta já enviada duas vezes, a linha manda seguir normalmente se a mensagem nova responde (escolhe, diz sim ou não, traz dado novo, muda de assunto) e, só se a resposta do modelo fosse repetir, chamar `transferir_atendimento` com `nao_resolvi` no próprio turno. A linha deixou de afirmar que "o cliente não respondeu": a contagem não sabe disso.
- **Rede em código (`bvTerceiraVez`, nó `Compor`).** Se o modelo ainda assim devolve a mesma lista, repete a pergunta ou só oferece a equipe em pergunta, o `Compor` marca `laco` e o nó novo `Laco?` leva ao `Transferir por limite`, que já existia, e ao `Compor humano`. É um ramo linear: dele não se volta ao `Agente` (teste `test_laco_transfere_direto_sem_ciclo`).
- **Corrida não transfere.** Mensagem escrita antes de o cliente ler a segunda lista não conta: ele só viu a lista uma vez.
- **Motivo.** `motivo_limite` passa a ser `pediu_pessoa` só quando o limite veio do pedido de pessoa; estouro de turnos e laço vão como `nao_resolvi`.
- **Repetição da transferência.** `Transferir por limite` ganhou uma segunda tentativa; repetir é inofensivo (a segunda chamada é recusada com `handoff_ativo`).
- O texto `textos.laco` deixou de existir nos dois ambientes.

### Pareceres

- **Desenho (especialista de backend).** Não há como dar a mesma garantia sem nó novo: a decisão depende da resposta do modelo e a transferência é banco e HTTP no `bv-graces`. Alertas: falso positivo passa a custar a conversa (antes custava uma pergunta estranha); a pergunta em texto, sem lista, não tem rede em código.
- **Chat Master.** A chamada usada (`POST /api/tickets/updateAPI` com `ticketId` e `queueId`) é a documentada para mover um ticket. Não há recurso nativo do painel que transfira quem parou de responder num setor conduzido por integração. O aviso à equipe é configuração: **Avise-me** no setor humano (Setores & Chatbot › editar o Setor › Notificar Operador no WhatsApp).

### Medição no TESTE (24/11, com o ok do owner para o nó `Laco?`)

- **Transfere na terceira vez:** 3 de 3 conversas ("Quero marcar um horário", "sei lá", "ah, não sei mesmo"). Na terceira mensagem saiu só o texto de encaminhamento, com a conversa marcada como transferida; nenhuma pergunta "quer que eu passe para a equipe?".
- **Contraprova:** 3 de 3. Com a lista enviada duas vezes, o cliente escolheu na terceira mensagem ("corte adulto"): não houve transferência e a conversa seguiu para a escolha do barbeiro.
- **Suíte:** R38 aprovado (transferência conferida no estado) e R30 aprovado. O R30 foi reestruturado: a irritação vinha na terceira mensagem, que agora já é transferência; passou a vir na segunda, e o roteiro cobre só "desculpas, oferta e aceite". R1, R5, R18 e R23 aprovados na mesma integração (p95 de 24,6 s; o R18 teve um `erro_infra` de turno sem fim em 67 s e passou na repetição).
- **n8n depois de publicar o nó:** `healthz` 200 e uso de CPU normal.

### Quem tocou numa opção não é transferido (correção de 24/11, depois do primeiro dia em PROD)

Caso real, 24/11 às 20:56, poucas horas depois do deploy: a lista de horários já tinha ido duas vezes; no terceiro turno o cliente mandou "Esse" e tocou em duas opções seguidas ("18:00 …" e, 11 s depois, "18:40 …"). Em vez de seguir com uma delas, a conversa foi transferida. Era um cliente novo, sem cadastro, que tinha escolhido.

- **Toque na lista (`bvToques`, `bvEscolhaNaLista`):** mensagem de texto do turno igual ao título de um item da oferta atual (sem diferença de caixa, acento ou pontuação). Frase solta, parte do título, áudio e mensagem longa não contam.
- **O laço poupa quem tocou:** no `Preparar`, com toque, a linha do laço não entra no contexto e `escolheu_opcao` desliga a rede do `Compor`. Vale só para a terceira vez (`bvVezesDaLista < 3`): lista que já saiu três vezes com o cliente escolhendo e o agente sem andar (Graces fora, ferramenta recusando) transfere na quarta.
- **A oferta da equipe em pergunta continua virando transferência**, mesmo com toque (`bvOfereceEquipe`).
- **De toques em opções diferentes vale o último** (decisão do owner, 24/11), com uma linha no contexto. Só onde as opções se excluem (`horario`, `sequencia`), com id certo e quando o último toque é a última mensagem do turno. Em serviço ou agendamento dois toques podem ser os dois; na decisão do cancelamento o toque é a própria confirmação: nesses tipos não há linha e o modelo decide como antes. O resumo continua pedindo a confirmação antes de agendar.
- **Revisão independente:** a primeira versão mandava "vale a última" em qualquer lista (inclusive a do cancelamento) e desligava a rede sem teto enquanto o cliente tocasse; os dois defeitos foram corrigidos antes de publicar no TESTE.

| Medição no TESTE (lista enviada duas vezes; terceiro turno com toques) | Antes | Depois |
|---|---|---|
| Cliente sem cadastro, "Esse" e dois toques seguidos (o caso de PROD) | 4 de 5 transferidos | 0 de 5 transferidos; segue para o cadastro com o último horário tocado |
| Cliente com cadastro, dois toques seguidos | 0 de 4 transferidos; perguntava "12:00 ou 12:40?" | 0 de 3 transferidos; resumo do último horário tocado |
| Um toque só | 3 de 3 com o resumo | 3 de 3 com o resumo |
| Laço sem escolha ("sei lá", "ah, não sei mesmo") | transfere na terceira vez | 3 de 3 transferem na terceira vez |
| Contraprova (escolhe por texto na terceira mensagem) | não transfere | 3 de 3 sem transferência |

Limites: o toque com emoji, "por favor" ou só a hora ("18:40" com título "18:40 Black") não é reconhecido como toque, e nesses casos vale o comportamento anterior; se o cliente queria os dois horários tocados, recebe o resumo de um só e precisa dizer isso na confirmação.

### O que falta

- **Ler em PROD quantas vezes o texto antigo do laço saiu e quantas eram legítimas.** A pergunta em texto, sem lista, não tem rede em código; a leitura do dia seguinte ao deploy mostra se alguém foi transferido sem motivo.
- **Aviso à equipe:** conferir se o **Avise-me** está ligado no setor humano; a transferência por API não avisa ninguém sozinha.
- Contraprova como roteiro permanente da suíte: não foi criado; a medição ficou no registro acima.

## Aviso à equipe na transferência (24/11)

Pedido do owner (24/11): quando a conversa é passada para a equipe, mandar do WhatsApp da loja uma mensagem para os celulares da equipe com o nome e o telefone do cliente. Mover o chamado de setor pela API não avisa ninguém no painel, e a conversa ficava esperando até alguém olhar a fila.

### Como funciona

- **Onde:** no `bv-graces`, depois de `Registrar handoff`: `Aviso equipe` (monta um texto por número) → `Avisa?` → `Enviar aviso equipe` → `Saida`. Vale para toda transferência (pedido do cliente, laço, limite, barbeiro só da equipe, pacote). Sem transferência, nada muda.
- **Para quem:** `handoff.avisar_numeros` do ambiente. Em PROD, os dois números indicados pelo owner; no TESTE, lista vazia, e mesmo com número o destino fora de `teste.contatos_escrita` é simulado.
- **Texto:** `textos.aviso_equipe`, com `{nome}` e `{telefone}`: "Aviso automático, não precisa responder. Atendimento passado para a equipe pelo agente. Cliente: … WhatsApp: …". Nome e telefone vêm do estado da conversa, nunca do modelo; sem nome no cadastro sai "sem nome no cadastro".
- **Envio:** `POST /api/messages/send` pela conexão da loja, com `openTicket: '0'` (`bvMTexto`, o mesmo construtor dos textos ao cliente e do `bv-alerta`). Um aviso por transferência: depois dela o agente fica em silêncio e não há segunda transferência da mesma conversa. O envio não é repetido sozinho em caso de falha.
- **Custo:** só no turno da transferência: uma chamada por número (duas em PROD), depois da resposta ao cliente já estar decidida.

### Parecer do Chat Master

- O endpoint e os campos são os documentados para texto na conexão Pro; `openTicket: '0'` não abre atendimento. Se o envio a um número sem contato cria contato no painel, não está documentado.
- **Resposta da equipe ao aviso:** entra pela conexão da loja como mensagem de cliente, e o agente responde. O texto avisa que não precisa responder. Alternativas, não adotadas sem decisão do owner: o agente ignorar mensagens desses números (uma linha na recepção; eles deixariam de poder falar com o agente) ou **Ignorar Números** na conexão (efeito sobre o envio por API não documentado).
- **Avise-me nativo** (Setores & Chatbot › Notificar Operador no WhatsApp): avisa todos os usuários do setor, com texto único para a empresa; não está documentado se dispara na transferência por API nem se aceita nome e telefone do cliente no texto. Por isso o aviso ficou em código.
- Risco de bloqueio do chip por envios repetidos: sem limite documentado; dois destinatários fixos que têm o número da loja salvo são o caso de menor risco.

### O que falta e limites

- **Envio real não provado no TESTE:** lá o destino é simulado; a primeira mensagem de verdade sai em PROD. O construtor e a chamada são os mesmos do `bv-alerta`, que já envia em PROD.
- **Falha no envio não é registrada** em `falhas_agente`: o aviso se perde em silêncio se o Chat Master recusar.
- Se a equipe responder ao aviso, o agente responde como a um cliente.

## Chamado assumido pela equipe cala o agente (25/11)

Pedido do owner em 25/11: a equipe reclama que, depois de assumir o atendimento, o agente continua respondendo junto.

### O que estava acontecendo

O agente só ficava calado com o chamado na fila de atendimento humano (106 em PROD). Leitura do Chat Master de PROD em 25/11 (`GET /api/tickets/get` e as mensagens de cada chamado, só leitura): os dois chamados em atendimento estavam `open`, com o atendente em `userId` (usuário 233), e **continuavam na fila do agente (107)**. Assumir o chamado pelo painel, portanto, não muda a fila em PROD, ao contrário do que se supunha em 23/11.

| Chamado | O que se vê nas mensagens |
|---|---|
| 173283 (25/11) | A equipe escreve pelo painel às 13:16:46; o cliente responde às 13:16:50 e o agente responde às 13:17:19. A equipe escreve de novo (painel e aparelho) e, às 13:24:15, o agente manda uma lista de serviços |
| 173902 (23 a 25/11) | Equipe (painel e aparelho) e agente se alternam nos três dias; em 25/11 a equipe pergunta "Qual valor?" às 09:38:38 e o agente responde ao cliente às 09:42:05 |

Nenhuma mensagem da equipe nesses chamados entrou no histórico da conversa: a gravação também dependia da fila 106.

### Como ficou

- **Chamado assumido vale como fila humana.** Assumido é o chamado `open` com `ticketData.userId` de uma pessoa (diferente de `chatmaster.user_id`, o usuário do agente). A regra mora em `bvAssumido` e `bvFilaDe` (`workflows/shared/rajada.js`), usada pelo nó `Normalizar` da recepção: a fila gravada em `contatos.fila_id` passa a ser a humana, e o resto segue como já era na fila humana (`bvTransferido` cala o agente, a mídia não é interpretada, o vigia conta os 30 minutos).
- **A mensagem da equipe nesse chamado entra no histórico**, desde que escrita por gente (painel, com `userId`; aparelho, com `fromApp`). O eco de uma mensagem enviada pela API não entra.
- **O agente volta sozinho** quando o chamado deixa de estar assumido (devolvido para "aguardando" ou encerrado e reaberto pelo cliente), ou quando o vigia o encerra depois de 30 minutos sem interação; nesse caso, se o cliente ficou sem resposta, o agente retoma a conversa (ver "Volta do atendimento humano sem texto fixo").
- Os simuladores do TESTE (`_smoke.chamado_do_agente`) passam a mandar o chamado como ele fica em PROD com o agente (`pending`, sem atendente): as fixtures vieram de chamados que o owner tinha assumido no painel.

### Testes

- Unidade: `tests/rajada.test.js` (chamado assumido, usuário do agente, chamado não assumido, mensagem do painel, do aparelho e eco da API) e `tests/test_workflows_mensagens.py` (o nó passa a fila humana e o usuário do agente).
- TESTE (25/11, contato simulado, só a recepção publicada): com o chamado do agente ele responde; com o chamado assumido na fila do agente fica calado e a fila gravada é a humana; a mensagem da equipe pelo painel e pelo aparelho entra no histórico e o eco da API não; o cliente responde à equipe e o agente segue calado; devolvido o chamado, o agente volta a responder. 8 de 8 conferências.

### O que falta e limites

- **Chamado esquecido aberto:** se alguém assume e não encerra, a próxima mensagem do cliente fica com a equipe; sem resposta em 30 minutos o vigia encerra o chamado e avisa o cliente, e só então o agente volta. Em 25/11 havia dois chamados assumidos, um deles criado em 19/11.
- **Resposta digitada no aparelho sem assumir o chamado** continua fora: o chamado fica "aguardando" na fila do agente, o agente não vê a mensagem e responde. Em 15 a 17/11 foram 20 mensagens assim.
- Abrir o chamado no painel só para ler também cala o agente, se o painel o marcar como assumido.

## Remarcação recusada pela Graces com HTTP 200 (contato 1374, 24/11)

O cliente pediu para remarcar o corte de 24/11 às 19:20 (Pedro Henrique) para 25/11 às 20:00 com o Black. O agente fez o resumo às 18:19 e o cliente confirmou às 18:27.

- A conferência antes da escrita (`GET /agenda/horarios-livres`, etapa `reval`) ainda mostrava 20:00 livre com o Black: se não mostrasse, o resultado seria `horario_indisponivel`.
- O `PUT /agenda/{idAgenda}` respondeu **HTTP 200 com `sucesso: false`** e sem `code`. O código trata isso como falha (`code_desconhecido`, registrado como `HTTP_200`), não repete a escrita e oferece a equipe. Foi o que aconteceu: o agente disse que não conseguiu, transferiu às 18:29 e a equipe respondeu às 18:40 que o Black estaria de folga.
- **A causa da recusa não ficou gravada**: a `mensagem` que a Graces devolve nesse caso não é lida nem guardada. Em 25/11 a agenda do Black está toda como "Prof. Ausente" (status 7), em blocos picados em volta de um agendamento, e a grade dele volta vazia. A leitura mais provável é que a folga já valia para a escrita e ainda não para a grade, ou foi lançada entre a oferta e a confirmação; não dá para provar com o que foi gravado.
- É o único `HTTP_200` de remarcação nas leituras de PROD (15 a 24/11). As outras 6 remarcações executadas passaram.
- O agendamento antigo (24/11 19:20 com o Pedro Henrique) não está mais na agenda. A equipe combinou 25/11 às 20:40 com o Rodrigo; na leitura de 25/11 às 14:00 esse horário do Rodrigo aparecia livre, e o único agendamento às 20:40 é com outro barbeiro. Vale a equipe conferir.
- **Aberto:** guardar a `mensagem` da Graces quando ela recusa com `sucesso: false` (hoje não há coluna para isso em `falhas_agente`), para a próxima recusa ser explicável.

## Volta do atendimento humano sem texto fixo (25/11)

Pedido do owner em 25/11, depois de ver o aviso sair para um cliente que tinha acabado de aceitar o horário proposto pela equipe: tirar a frase "A equipe não conseguiu te responder por aqui agora"; se o cliente ficou sem resposta, o agente lê as últimas mensagens e continua a conversa; se a última mensagem dele é despedida ou confirmação, só encerra.

### Como funciona

O vigia continua encerrando o atendimento humano parado há 30 minutos. O que muda é o que acontece depois, quando o cliente falou por último:

| Situação | O que acontece |
|---|---|
| A equipe respondeu e, depois dela, o cliente só agradeceu, se despediu ou confirmou ("Pode ser sim", "Confirmo", "Tá bom") | Encerra calado |
| A equipe propôs um horário em pergunta ("Pode ser às 12h40?") e o cliente só confirmou | Encerra calado (antes, a pergunta da equipe contava como pendência) |
| A equipe perguntou sem horário, ou prometeu ver, e o cliente respondeu | O agente retoma |
| O cliente perguntou, pediu, mandou número, horário, áudio ou imagem | O agente retoma |
| A equipe nunca respondeu, mesmo que o cliente só tenha dito "ok" ao encaminhamento | O agente retoma: o pedido dele ficou sem atendimento |

- **Decisão em código**, em `bvMRetomaFila` (`workflows/shared/mensagens.js`), que reaproveita `bvMSoAgradeceu` com as palavras de confirmação. "Pode ser amanhã", "Sim, à tarde", "Pode ser 14h", "Não" e "Pode marcar" (pedido esperando a ação de alguém) continuam pedindo resposta.
- **Turno de retorno.** No `bv-vigia`, `Gravar encerramento` → `Decidir retorno` → `Montar retorno` → `Tem retorno?` → `Chamar retorno`. `Montar retorno` põe num turno novo as mensagens do cliente que ficaram sem resposta: as posteriores à última resposta do agente ou da equipe (lembrete e retomada não contam como resposta), no máximo 10, dentro da janela da sessão (120 minutos, com 10 de folga, para o turno nunca nascer como sessão nova, sem histórico). Grava também a marca `pedido.retorno` com o id desse turno. `Chamar retorno` executa o `entregar-rajada`. Por rodada do vigia sai no máximo um encerramento com o cliente por último (os demais ficam para as rodadas seguintes, de 5 em 5 minutos) e até cinco dos que só encerram. As mensagens não são reabertas (`processada_em` fica como está): se o turno falhar, a recepção não as reprocessa num "Oi" futuro.
- **O que o agente recebe:** as mensagens sem resposta como mensagens novas, a conversa recente com o que a equipe disse, e uma linha de contexto (`bvContextoRetorno`, `workflows/shared/agente.js`) mandando continuar de onde parou, sem dizer que a equipe não respondeu, sem prometer retorno dela e sem inventar o que só a equipe sabe (pix, valor combinado, áudio da equipe).
- **Sem nova transferência no turno de retorno**, para não haver o laço transfere → 30 minutos → retorno → transfere, com aviso à equipe a cada volta. São três travas, todas pela marca `pedido.retorno`: o atalho `Limite?` e o laço não disparam (`Preparar` e `Compor`), e qualquer ferramenta do `bv-graces` que passaria a conversa para a equipe é recusada num ponto só (`bvgSemRetransferir`, `workflows/shared/graces.js`). No turno seguinte, se o cliente pedir uma pessoa, valem as regras normais.
- O texto `textos.fila_sem_resposta` saiu da configuração. O aviso do turno que estourou o tempo (`textos.contingencia`) não muda.

### Topologia

O `bv-vigia` passa a ser um segundo chamador do `entregar-rajada` (o primeiro é a recepção). Não há ciclo: `Chamar retorno` é terminal e ninguém chama o vigia. O `entregar-rajada` não ganhou nó nem ligação; mudaram duas linhas de código (`Preparar` e `Compor`).

### Desenho e revisão

Desenho com dois especialistas em leitura (comportamento do agente e arquitetura de backend). Deles saíram: a trava contra nova transferência em código e não só na linha de contexto (há transferência sem o modelo em `Limite?`, no laço e em nove pontos do `graces.js`); não reabrir as mensagens; guarda de concorrência em SQL em vez de copiar os nós de posse do Redis para o vigia; `mode: each` no nó de chamada; e encerramento atômico (`AND fila_id = ...`).

Revisão independente do diff (especialista de backend, em leitura), com quatro achados corrigidos: item sem turno chegando ao sub-workflow quando não há mensagem a retomar (nó `Tem retorno?`); vários retornos reivindicados antes do primeiro rodar, com a guarda de concorrência envelhecendo minutos (um por rodada); a marca `pedido.retorno` e o histórico perdidos em sessão nova (janela da sessão no `Montar retorno`); e lembrete gravado depois da mensagem do cliente contando como resposta. Da mesma revisão: a linha do laço não entra no turno de retorno (contradizia a de retorno), "Pode marcar" não conta como confirmação, e um teste confere que o item montado pelo vigia tem os mesmos campos do da recepção.

### Testes

- Unidade: `tests/mensagens.test.js` (confirmação e decisão calado × retorno), `tests/agente.test.js` (linha de contexto), `tests/graces.test.js` (trava contra nova transferência) e `tests/test_workflows_*.py` (nós, ligações, chamada terminal e contrato do item).
- As consultas do vigia rodaram no banco do TESTE dentro de transação desfeita: o encerramento devolve a linha uma vez só; o retorno pega só as mensagens sem resposta; lembrete gravado depois não esconde a mensagem; turno em andamento ou mensagem fora da janela não monta retorno; de três contatos com o cliente por último, sai um por rodada.
- TESTE (25/11, com o ok do owner para a ligação nova): agente e ferramentas publicados da branch e uma cópia temporária do vigia, só com o ramo da fila humana, a cada minuto, restrita a 7 contatos simulados e sem tocar no Chat Master. O n8n respondeu saudável em todas as conferências e a cópia foi apagada no fim.

| Caso | Resultado |
|---|---|
| Equipe resolveu e o cliente agradeceu | Calado |
| Equipe propôs "Pode ser às 12h? Perdão, às 12h40" e o cliente disse "Pode ser sim" | Calado |
| Equipe falou por último | Calado |
| Cliente pediu o barbeiro que só a equipe agenda, foi transferido, ninguém respondeu e ele disse "ok" | "Por aqui não consigo agendar com esse barbeiro. Posso verificar horários com outro barbeiro hoje à tarde, se você quiser." |
| Equipe disse que não havia horário com um barbeiro; cliente perguntou por outro, hoje ou amanhã | O agente consultou a agenda e mandou a lista de horários do dia seguinte |
| Equipe mandou um áudio; cliente pediu de novo "a mensagem com as informações e o pix" | "Não consigo ver o áudio nem recuperar a mensagem ou o Pix que foram apagados por aqui. Posso ajudar com serviços, preços, horários e agendamentos da barbearia." |
| Cliente atrasado, equipe ofereceu outro dia, cliente insistiu e pediu um atendente de novo | O modelo tentou transferir e a trava recusou (`retorno_sem_transferir`): "Por aqui não consigo chamar um atendente neste momento. Posso verificar um horário para você amanhã ou remarcar seu agendamento." |

Em nenhum dos quatro turnos de retorno a conversa voltou para a fila humana, o agente disse que a equipe não respondeu, ou saiu o nome do barbeiro.

Caminho normal do agente, com o mesmo código: roteiros R1 (primeiro contato, agenda direto) e R28 (ida e volta da fila humana) aprovados, p50 de 20,0 s e p95 de 21,1 s. A suíte completa (45 roteiros) não rodou: o saldo da OpenAI do TESTE é o mesmo de PROD e o token próprio de testes ainda não existe.

### O que falta e limites

- **Cliente escreve durante o turno de retorno** (uns 20 segundos, depois de 30 minutos de silêncio): a recepção roda outro turno em paralelo e as duas respostas podem se cruzar. O vigia não toma a posse do Redis: seriam seis nós copiados da recepção e o vigia passaria a depender do Redis, que é a falha que ele cobre. A guarda é em SQL (não monta o retorno se há turno em andamento ou mensagem nova ainda não processada). Não há escrita em dobro na agenda: a proposta é reivindicada de forma atômica no `bv-graces`. Se aparecer em PROD, a correção é extrair posse e turno para um sub-workflow comum à recepção e ao vigia.
- **Mensagem sem resposta há mais de 110 minutos** (fila de encerramentos acumulada ou n8n parado): encerra calado, sem retorno.
- **Confirmação a uma proposta que a equipe não fechou:** o cliente que respondeu "Pode ser sim" a "Pode ser às 12h40?" fica sem aviso, e nada garante que o horário entrou na agenda. Decisão do owner: só encerrar.
- **Falha do turno de retorno:** se o `entregar-rajada` falhar ou estourar o tempo, o cliente não recebe nada e o vigia não registra a falha.
- **O que só a equipe resolve** (barbeiro que só ela agenda, atraso, pagamento): o agente diz em uma frase que por ali não consegue e oferece o que faz. O chamado já foi encerrado, então o pedido sai da fila da equipe, como já era.

### Barreira: no turno de retorno o agente não diz que o pedido ficou com a equipe (27/11)

Na prova repetida depois do merge, o caso "pediu o barbeiro que só a equipe agenda, ninguém respondeu, disse ok" recebeu **"Certo! Seu pedido ficou com a equipe por aqui."**. O chamado já estava encerrado: o cliente ficaria esperando ninguém. Na primeira rodada o mesmo caso tinha saído certo; é variação do modelo, com a linha de contexto proibindo.

- **Linha de contexto mais explícita** (`bvContextoRetorno`): "A equipe não está mais nesta conversa: não diga que o pedido ficou com ela nem que alguém vai responder" e, quando a equipe nunca falou, "responda ao pedido que está na conversa recente, não ao ok".
- **Barreira em código** no `Compor`, só no turno de retorno: a resposta que diz que o pedido ficou com a equipe ou que alguém vai responder (`bvPrometeEquipe`, `workflows/shared/agente.js`), ou que cita o barbeiro que só a equipe agenda (`bvBarbeiroHumano`, a mesma função da cláusula pétrea), é trocada por `textos.retorno_sem_equipe`: "Por aqui eu não consigo resolver isso. Se quiser, vejo um horário ou ajudo com um agendamento pra você." "Como a equipe falou" e "quem envia é a equipe" não são promessa e passam.

Medição no TESTE (27/11, mesma cópia temporária do vigia, 8 turnos de retorno por rodada: 6 vezes o caso do barbeiro da equipe, um de atraso e um de pedido de atendente, todos com a equipe sem responder):

| Versão | Disse que ficou com a equipe | Citou o nome do barbeiro | Barreira trocou a resposta |
|---|---|---|---|
| Só a linha mais explícita | 0 de 8 | 1 de 8 | não havia a do nome |
| Linha e barreira completas | 0 de 8 | 0 de 8 | 2 de 8 |

Nas duas rodadas nenhum turno transferiu de novo. Nos 2 de 8 em que a barreira agiu, o cliente recebeu o texto neutro em vez da resposta do modelo; a medição não guarda o que o modelo tinha escrito.

## Fila da vez: rodízio dos barbeiros indicados pelo agente (26/11)

### O que estava acontecendo

- `GET /servicos/profissionais` devolve sempre a mesma ordem, em todos os serviços: Kiel, Jayme, Black, Pedro Henrique, Rodrigo e o barbeiro de teste. Sem o Jayme (só da equipe) e sem o de teste, a ordem que o código usava era Kiel, Black, Pedro Henrique, Rodrigo.
- Na busca de horários sem barbeiro escolhido, a lista mostra um barbeiro por horário e o horário ficava com o **primeiro** de `meta.barbeiros` que o tinha livre. Só o barbeiro de um agendamento colado desbancava.
- Simulação com a agenda real (corte adulto, próximos 3 dias úteis): o Kiel ficaria com 54 dos 55 horários da lista de qualquer barbeiro; Black e Pedro Henrique com zero, tendo 13 e 7 horários livres em 30/11 e 18 e 15 em 01/12.
- Conversas reais de PROD de 25 e 26/11 (129 chamados lidos): nas 10 ofertas de horário em que o cliente não tinha escolhido barbeiro, foram mostrados 35 horários do Kiel, 4 do Rodrigo, 2 do Black e 0 do Pedro Henrique (83% Kiel). Na lista de barbeiros, o Kiel foi o primeiro em 12 de 12.
- A mesma ordem decidia a lista de barbeiros, `por_barbeiro` e `quem_tem_horario`, as sequências de dois serviços, o caso de barbeiros diferentes por serviço ("primeiro barbeiro da lista") e os cortes de 10 barbeiros e do teto de consultas.

### Como ficou

Quando é o **sistema** que indica o barbeiro (o cliente não escolheu), vale a fila da vez: vem primeiro quem está há mais tempo sem receber um agendamento por indicação do agente; quem recebe um vai para o fim da fila. Dentro de uma lista, os horários que mais de um barbeiro tem livres são repartidos em roda, seguindo a fila. É determinístico: a mesma entrada (barbeiros, grades, histórico) dá sempre a mesma saída; quem decide é o código, nunca o modelo.

- **Marca `indicado`.** O item de oferta de horário (e cada item de uma sequência) leva `indicado: true` no `valor` quando o barbeiro foi posto pelo sistema: lista de qualquer barbeiro (inclui "ver outros barbeiros", o habitual sem horário e a remarcação com qualquer barbeiro) e sequências sem barbeiro escolhido. Barbeiro pedido, o da conversa, o habitual, o do agendamento (remarcação) e o horário colado não levam a marca. Ela passa a `propostas.dados` (`bvgFase1`) e não aparece ao cliente (a lista usa só o `rotulo`) nem ao modelo (o resultado da ferramenta traz só `id`, `hora` e `barbeiro`).
- **Leitura.** O nó `Contexto` de `bv-graces` devolve `rodizio`: `{ idProfissional: instante da última proposta executada com item indicado }`, global (todos os contatos), das ações `agendar`, `agendar_conjunto`, `reagendar` e `trocar_servico`, numa janela de `graces.rodizio.janela_dias` dias. A janela e a chave vão por parâmetro do nó (`$7`, 0 = desligado), nunca no texto do SQL. Sem tabela, contador nem escrita nova: a posição é consequência do que já se grava quando o agendamento executa, e duas conversas ao mesmo tempo não disputam nada.
- **Duas funções puras** em `workflows/shared/graces.js`: `bvgFila` (ordena a lista já filtrada: sem registro primeiro, depois do mais antigo ao mais novo, empate pela ordem recebida) e `bvgRepartir` (cada horário vai ao candidato mais à frente na fila local, que passa ao fim dela; o horário colado ganha sem gastar a vez de ninguém). Usadas em: `listar_barbeiros`; `horarios_livres` com qualquer barbeiro (inclusive `ag_prof`); `por_barbeiro` e `quem_tem_horario` (na ordem da fila); sequência de dois serviços com o mesmo barbeiro; barbeiros diferentes por serviço (`bvgDifProf`/`bvgDifGrade`: cada início fica com o primeiro da fila que cabe, **sem repartição em roda dentro da mesma lista**; a fila anda entre conversas, quando um agendamento executa). A composição "filtrar e depois ordenar" é uma função só, `bvgBarbeiros`. Os cortes (`slice(0, 10)` e o teto de consultas) valem depois de ordenar. Nenhuma consulta a mais à Graces.
- **Índice:** a subconsulta usa `propostas_estado_idx (estado, atualizada_em)`, já existente; sem migração. No banco de TESTE (1 linha na tabela) o plano é varredura sequencial e leva 0,2 ms; com o volume de PROD o filtro `estado = 'executada'` e a janela entram pelo índice.

### O que não muda

- O Jayme (`graces.barbeiros_humanos`) e o barbeiro de teste são filtrados antes de qualquer ordenação: nunca entram na fila. Os filtros e as barreiras de escrita não foram tocados.
- Barbeiro pedido, habitual, do agendamento na remarcação e horário colado: caminho e resultado iguais aos de antes.
- Serviço que só um barbeiro faz: nada a repartir. Pacote e par cabelo e barba: o mesmo barbeiro nos dois horários.
- O prompt do agente não mudou.

### Como desligar

`graces.rodizio.ligado: false` em `config/ambientes/<ambiente>.json` (e deploy da configuração; não muda código): volta a ordem da Graces e o primeiro vence. `janela_dias` (1 a 365, padrão 30) é validada por `scripts/verificar-repo.py`; no nó, valor inválido cai em 30 e `ligado` diferente de `true` vale desligado. A marca `indicado` continua sendo gravada com a chave desligada, então o histórico já existe quando ela liga.

### Testes e limites

- `tests/graces.test.js` (bloco "fila da vez"): fila com e sem histórico, empate e desligado; repartição (4 barbeiros livres dão K, B, P, R, K; quem não tem o horário é pulado; o colado ganha); a marca em qualquer barbeiro e a ausência dela em barbeiro pedido, da conversa, habitual e remarcação no mesmo barbeiro; chegada em `propostas.dados`; de ponta a ponta, cinco agendamentos indicados seguidos andam a fila; sequências; Jayme e barbeiro de teste fora. `tests/test_verificacoes_repo.py` e `tests/test_workflows_agente.py` cobrem a configuração e a consulta do `Contexto`.
- A consulta do `Contexto` foi validada no banco de TESTE só com `SELECT` e `EXPLAIN`.
- **Limites:** a fila é do agente, não da loja: agendamento feito pela equipe, por outro canal ou com barbeiro pedido não conta. Quem recebe vários agendamentos com o barbeiro pedido continua sem gastar a vez. Duas conversas que listam antes de qualquer uma confirmar veem a mesma fila (a vez só anda quando o agendamento executa). Falta medir em TESTE com o agente real e, depois do deploy em PROD, conferir a distribuição de `propostas.dados` com `indicado` por barbeiro.

### Fila de ajustes (pedida pelo dono em 26/11/2026)

- Barbeiro habitual pelos últimos 5 atendimentos: feito em 26/11 (seção abaixo); sai desta fila.

## Barbeiro habitual pelos últimos atendimentos (26/11)

### O pedido do dono

"O agente deve indicar o barbeiro não somente pelo último corte, mas pelos últimos 5. Vence na indicação aquele que cortou mais. Por exemplo, se nos últimos 5 cortes quem cortou foi o Pedro Henrique e no último foi o Black, o agente deve indicar o Pedro."

### Como ficou

- **Visitas.** O histórico (`GET /agenda/historico`, uma linha por serviço) é agrupado em visitas: mesma comanda ou mesmo dia, a regra que já valia para a última visita (`bvgDaVisita` e `bvgVisitas` em `workflows/shared/graces.js`, agora uma só).
- **Contagem e vencedor.** Entram as `N` visitas mais recentes com barbeiro conhecido (`graces.habitual.visitas`, 5). Cada visita conta uma vez por barbeiro que atendeu nela; vence quem tem mais visitas e, no empate, quem atendeu mais recentemente (`bvgHabituais`). O critério do que conta como atendimento está num ponto só, `bvgConta` (hoje qualquer serviço).
- **O serviço** continua sendo o da última visita, com as mesmas condições de antes (visita de um serviço só, ativo, sem "2ª vez"). **O barbeiro** é o primeiro do ranking que faz esse serviço (`/servicos/profissionais`) e passa em `bvFiltrarBarbeiros`; se ninguém serve, `barbeiro: null` e o agente pergunta, como antes. O formato de `ctx.pedido.ultimo` não mudou.
- **Equipe humana (cláusula pétrea).** A última visita com o Jayme continua levando ao atendimento humano; agora também vai se o Jayme for o mais frequente das últimas visitas. A regra só aumenta as transferências. O Jayme e o barbeiro de teste nunca são propostos.
  - O barbeiro da equipe humana também é contado quando a linha do histórico vem só com o nome (sem `idProfissional`), do mesmo jeito que a regra da última visita o enxerga; para os demais, linha sem id é ignorada.
  - Empate no topo: se o Jayme está entre os que têm o maior número de visitas, o cliente vai para a equipe, mesmo que outro empatado tenha atendido mais recentemente (na dúvida, transfere). Sem humano no empate, vale o mais recente.
- **Requisição.** A mesma de antes, com `pageSize` = 10 por visita (50 com 5 visitas; máximo 200). Nenhuma requisição a mais. O habitual continua sem a marca `indicado` e sem andar a fila da vez.
- **Textos.** O prompt passou a dizer "o barbeiro de costume dele (o que mais o atendeu nos últimos atendimentos)" e a orientação de `meta.sem` diz "X, o barbeiro de costume do cliente, não tem horário"; o serviço segue sendo "o do último atendimento".

### Casos de borda

| Caso | Resultado |
|---|---|
| 4 visitas com o Pedro e a mais recente com o Black | Pedro |
| 2 a 2 (Black e Pedro) | quem atendeu mais recentemente |
| menos de 5 visitas | a maioria do que houver; uma só = como antes |
| dois serviços do mesmo barbeiro na visita | conta uma vez |
| visita com dois barbeiros | conta para os dois |
| vencedor não faz o serviço ou é o de teste | o seguinte do ranking |
| ninguém do ranking serve | sem barbeiro (o agente pergunta) |
| última visita com o Jayme | equipe, como antes |
| Jayme mais frequente, última com outro | equipe |
| Jayme só numa visita antiga | não transfere e nunca é proposto |
| linhas sem barbeiro ou com serviço inválido | ignoradas |
| `visitas: 1` | só a última visita decide, como antes |

### Decisões que ficaram com o dono

- Contar só cortes ou qualquer serviço (hoje, qualquer serviço; trocar em `bvgConta`).
- Cliente do Jayme por "a última visita" ou por "o mais frequente" (hoje valem os dois).

### Como voltar atrás

`graces.habitual.visitas: 1` em `config/ambientes/<ambiente>.json` (e deploy da configuração; não muda código). Valores de 1 a 20 (validados por `scripts/verificar-repo.py`); no código, valor inválido vale 5.

### Testes e limites

`tests/graces.test.js` (bloco "habitual"), `tests/agente.test.js`, `tests/test_verificacoes_repo.py` e `tests/test_workflows_agente.py`. Falta medir em TESTE com o agente real. Limites que só o agente real mostra: a ordem do histórico (mais recente primeiro) vem da documentação da Graces e do uso que o código já fazia, não foi medida (o cliente de teste não tem histórico); o `pageSize` de 10 linhas por visita é folga estimada. Com `visitas: 1`, só difere de antes se a última visita não trouxer barbeiro: agora vale a visita anterior que o traga.

**Correção da referência da suíte (26/11).** A referência da avaliadora (`referencia_graces` em `scripts/suite-validacao.py`) trazia horários só de "corte adulto" e "infantil" e o último atendimento em vez do barbeiro de costume; o R11 reprovou três vezes no K4 com a resposta do agente verdadeira. Agora ela inclui os horários do serviço do último atendimento e o barbeiro de costume das últimas N visitas (`barbeiros_de_costume`, espelho de `bvgVisitas`/`bvgHabituais`).

## Lembrete de 24 horas com lista para confirmar presença (27/11)

Pedido do owner em 27/11: o agente não vinha entendendo a resposta do cliente na confirmação de comparecimento; identificar o porquê e corrigir dando opções para o cliente tocar.

### O que estava acontecendo

Desde 15/11 o lembrete de 24 horas era um texto agendado no módulo de Agendamentos do Chat Master, pedindo para digitar SIM ou NÃO. Só um punhado de respostas exatas era tratado em código ("Sim", "Confirmo", "Confirmado", "Pode confirmar"); o resto ia ao modelo, e o texto do lembrete não ficava no histórico da conversa.

Leitura do Chat Master de PROD, 16 a 26/11, em duas amostras de chamados (na maior, 39 lembretes de 24 horas, 32 deles com resposta):

| Resposta do cliente | O que aconteceu |
|---|---|
| "Sim" puro (22 de 32), "Confirmado", "Não" | Entendido: presença confirmada em segundos, ou lista remarcar/cancelar |
| "Sim (e tem mão e pé também). Obg" | Não confirmou; virou conversa e acabou transferido |
| "Oi, eu remarquei para sábado às 16h" | "Perfeito! Anotado: sábado, 28/11, às 16h", sem conferir a agenda |
| "Amanhã não. Eu agendei para quarta-feira", "É só barba", "Com o Jaime é cabelo" | Listas sem relação ou transferência |
| Dois horários a confirmar | "Toque no botão da mensagem", e o botão não existia mais |

### Como ficou (decisões do owner em 27/11: botão de lista, uma mensagem só, saindo pelo n8n)

- **O lembrete de 24 horas sai em lista**, com "Confirmo" e "Não vou poder". O agendador do Chat Master não leva lista, então esse lembrete deixa de ser agendado lá: na hora dele, o ramo de sincronização do `bv-mensagens` manda a lista (`bvMSincPlano`, ação `enviar_lista`, com `bvMLista`). Ele deixa de aparecer no módulo de Agendamentos do painel; o de 1 hora continua lá, em texto.
- **Nada novo na recepção do toque:** os ids são os mesmos de antes (`bvc:<id>:s|n`), e `bvMReconhecer`, a recepção e o `bv-confirmacao` não mudaram. O toque confirma ou recusa na Graces sem o modelo; a recusa manda a lista remarcar/cancelar.
- **A lista entra em `mensagens`** (`agendada-<id>`, tipo `lista`): o modelo passa a ver o lembrete, e a recepção sabe que a última saída foi a lista. O texto não tem "?" de propósito: saída com pergunta dispara a retomada e conta como lista repetida no laço.
- **"Sim" digitado logo depois da lista** continua confirmando sem o modelo (`bvMTituloRota`).
- **Quem contesta o lembrete ouve o que está na agenda:** com confirmação aberta, a linha de contexto (`bvMPromptConfirmacoes`) manda chamar `meus_agendamentos` antes de responder e nunca dizer que anotou, remarcou ou cancelou sem a ferramenta. "Sim" com outro assunto junto confirma primeiro e trata o resto depois.
- O agrupamento "um lembrete por cliente e dia", o preparo do contato e do ticket e as etiquetas Confirmado/Cancelado seguem como eram.

### Transição

Lembrete de 24 horas que já estava agendado como texto sai como texto, com a redação antiga, e o "sim" digitado vale. Se ele for relido antes da hora (remarcação, segundo serviço no dia), o agendamento de texto é apagado e ele sai em lista.

### Revisão independente do diff

Um especialista de backend revisou em leitura. Corrigidos: o lembrete já agendado seria atualizado para o texto novo sem a lista (agora apaga e reenvia em lista); o eco da lista ("MENU ENVIADO…") seria gravado como fala da equipe com o contato na fila humana (`bvEquipe` ignora); contato `@lid` sem cadastro no Chat Master era cancelado antes da hora; quatro falhas no preparo do contato perdiam o lembrete (com duas, a linha dorme e a lista sai pelo número); falha entre o envio e a gravação reenviaria a lista (a reserva vencida vira `incerto`, sem reenvio); e o "?" do texto, pelos efeitos na retomada e no laço.

### Testes

- Unidade: `tests/mensagens.test.js` (plano e resultado do envio, transição, `@lid`, preparo que falhou, rota do "sim" digitado, linha de contexto), `tests/rajada.test.js` (eco da lista) e `tests/test_workflows_mensagens.py` (nós e configuração).
- As consultas alteradas rodaram no banco do TESTE em transação desfeita.
- TESTE, smoke `m10` (novo), `m2` e `m9`: a sincronização envia a lista e a grava no histórico; o toque em "Confirmo" e o "Sim" digitado confirmam na Graces (status 3) sem turno do agente; "Não vou poder" recusa (status 10); atraso além do limite não envia.
- TESTE, comportamento do modelo com confirmação aberta (contatos simulados, agendamento real do cliente de teste no barbeiro de teste):

| Mensagem do cliente | Vezes | Resultado |
|---|---|---|
| "Oi, eu remarquei para sábado às 16h" | 4 | 4 de 4 consultaram a agenda e disseram o que consta; nenhum "Anotado" |
| "Amanhã não. Eu agendei para quarta-feira", "Já cancelei esse horário" | 2 | Consultou a agenda nas duas ("ainda consta ativo aqui. Quer que eu faça o cancelamento?") |
| "É só barba" | 1 | Perguntou qual serviço de barba, sem citar o horário marcado |
| "Sim (e tem mão e pé também). Obg" | 3 | Antes da última frase da instrução: 0 de 1 confirmou. Depois: 2 de 2 confirmaram e trataram o outro assunto |
| "Sim, mas queria saber se dá pra fazer a barba junto", "Vou sim. Vocês aceitam cartão?", "Vou sim, pode deixar" | 3 | 3 de 3 confirmaram |
| "Não vou conseguir ir, surgiu um imprevisto no trabalho" | 1 | Recusa registrada na Graces e "Você prefere remarcar ou cancelar mesmo?" |

### O que falta e limites

- **Envio real da lista** não foi provado no TESTE (contatos simulados só gravam). A lista usa o mesmo construtor e o mesmo endpoint das listas que o agente já manda em PROD.
- **"É só barba"** ainda vira pergunta de serviço sem mencionar o horário marcado.
- **Lembrete de 1 hora** continua em texto, sem opções.
- Um toque que chegue nos segundos entre o envio e a gravação recebe "esse horário não está mais valendo".

## Convite de volta: lembrete para quem está há quase um mês sem cortar (27/11)

Pedido do owner em 27/11: mandar um lembrete ao cliente que está há quase um mês sem cortar e, para quem tem pacote, dizer quantas sessões restam.

### Decisões do owner

| Ponto | Decisão |
|---|---|
| Quando | 25 dias depois da última visita (janela de 25 a 28 dias) |
| Para quem | Quem não tem horário marcado; um convite por visita, sem segundo aviso |
| Dias e horário | Terça a sábado, das 10:00 às 18:00 |
| Limites | Um envio por rodada de 5 minutos (até 12 por hora) e 30 por dia; três falhas em uma hora (de envio ou de leitura da Graces) param as rodadas |
| Pacote | Só o total de sessões disponíveis para agendar, somando os pacotes abertos |
| Cliente do barbeiro que só a equipe agenda | Recebe; o texto não cita barbeiro e, se ele aceitar, a conversa vai para a equipe pelas regras de sempre |
| Parar de receber | A mensagem diz como; o pedido é respeitado |
| Produção | Nasce desligado (`convite.ativo: false`), até o owner aprovar o texto e ligar |

### Como funciona

- **Candidatos saem do nosso banco, sem chamada.** A reconciliação já grava em `mensagens_agendadas` todo agendamento da loja. A cada 5 minutos, `Reivindicar convite` (ramo novo do `bv-mensagens`) escolhe um contato cujo último horário foi há 25 a 28 dias, sem horário futuro, sem convite para essa visita, que não pediu para parar, não está no atendimento humano, não conversou nos últimos 3 dias e não é número da equipe, e já grava a linha `convite_volta` (tipo novo, migração 0020).
- **A verdade vem da Graces, só para esse contato, na hora do envio.** Primeiro o cadastro pelo celular (`Graces cliente`); com um cadastro só, três leituras (`Graces convite`): histórico, próximos agendamentos e pacotes. A decisão é `bvgConvite` (`workflows/shared/graces.js`): a última visita é a maior `dataAbertura` do histórico; não recebe quem tem horário marcado, quem voltou depois, quem não vem há bem mais de um mês (o agendamento da base foi falta) e quem nunca veio. Sem cadastro, ou com mais de um no mesmo celular, também não. O motivo fica na linha.
- **Texto** (`bvMConvite`, `textos.convite`): "Oi, {nome}! Já faz quase um mês do seu último corte aqui na Barbearia da Vila. Se quiser, é só me chamar que eu vejo um horário pra você. Se preferir não receber este lembrete, é só me avisar." Com pacote entra, depois da primeira frase, "Você ainda tem N sessões do seu pacote disponíveis para agendar." Sem barbeiro, sem pergunta (saída com "?" dispara a retomada e conta no laço) e sem nenhum texto da Graces. Pacote que não deu para ler: sai sem a frase.
- **Envio pela cauda da retomada**, agora compartilhada (`Envia retomada?` → `Enviar retomada` → `Resultado retomada` → `Gravar retomada`): mesma trava do TESTE (contato simulado só grava), mesmo endpoint de texto, e o `Gravar retomada` fecha a linha do convite como enviada, cancelada (com o motivo) ou falhou.
- **Resposta do cliente:** o `Ler contexto` do agente lê o último convite enviado há até 3 dias, e uma linha de dado (`bvMContextoConvite`) entra quando não há conversa em andamento: um "quero" segue o agendamento normal, com o serviço do último atendimento e o barbeiro de costume que o `Identificar` já traz. Não usa `retomada_em`, para não ressuscitar um pedido de um mês atrás.
- **Parar de receber:** reconhecido em código, por palavras (`bvMPediuParar`), só com convite enviado há pouco. O nó `Sessao` marca a linha do convite (`motivo = 'parou'`) e quem tem essa marca não é mais candidato. Não há coluna nova: o agente não depende da migração para rodar.

### Revisão independente do diff

Um especialista de backend revisou em leitura e não achou nada crítico para publicar com o convite desligado. Corrigido antes do PR: o reconhecimento do pedido de parar deixava passar frases comuns ("pode parar de mandar", "me tira dessa lista", "cancela esse lembrete") e casava com o que não era pedido ("não precisa mandar a localização", "não precisa avisar o barbeiro"), e a marca é permanente; com a Graces fora, cada rodada fechava um cliente como `graces_falhou` e ele nunca mais era tentado (agora a leitura que falhou não conta no "um por visita", a linha que ficou no meio do caminho é fechada depois de 15 minutos, e três leituras falhas em uma hora param as rodadas); o agendamento cancelado ou remarcado contava como última visita na nossa base; o convite marcado como `parou` voltava ao contexto do agente; e `bvgSecoes` passou a aceitar só `null` como "qualquer serviço".

### Topologia

Oito nós novos no `bv-mensagens` (`A cada convite`, `Reivindicar convite`, `Pedir cliente`, `Graces cliente`, `Pedir convite`, `Consulta convite?`, `Graces convite`, `Decidir convite`), ligados à cauda de envio da retomada. Nenhum workflow novo, nenhum ciclo, nenhuma chamada ao sub-workflow do agente. No `entregar-rajada`, só código e SQL de três nós que já existiam (`Ler contexto`, `Preparar`, `Sessao`).

### Testes

- Unidade: `tests/graces.test.js` (cadastro pelo celular e decisão: maior `dataAbertura`, voltou, visita antiga, horário futuro, soma das sessões, pacote ilegível), `tests/mensagens.test.js` (texto com e sem pacote, singular e plural, pedido de parar e falsos positivos, linha de contexto), `tests/test_workflows_mensagens.py` (ligações, sem ciclo, filtros do SQL, e os nós `Pedir cliente`, `Pedir convite`, `Decidir convite` e `Resultado retomada` executados com o código renderizado) e `tests/test_verificacoes_repo.py` (bloco `convite` e textos).
- Banco do TESTE, em transação desfeita (a migração ensaiada dentro dela): desligado ou fora do horário não reivindica; sai um por rodada, o mais antigo primeiro; ficam de fora quem tem horário futuro, quem pediu para parar, quem veio há 10 dias, quem veio há 40, quem está no atendimento humano e quem conversou há pouco; um convite por visita; teto diário e disjuntor seguram; a gravação fecha a linha como enviada ou cancelada, e a retomada segue com o prefixo de sempre.
- TESTE, ponta a ponta (27/11, migração 0020 aplicada no banco de TESTE): cópia temporária só do ramo do convite, a cada minuto e sem a restrição de horário, restrita a dois contatos semeados, com o envio trocado por um nó sem efeito e lendo a Graces de verdade. O contato sem cadastro terminou como `sem_cadastro`; o cliente de teste, com cadastro único, terminou como `tem_horario` (ele tem horários marcados de verdade). A prova foi repetida com a versão final, com o mesmo resultado. O n8n respondeu saudável em todas as conferências e a cópia foi apagada.
- TESTE, resposta do agente a quem recebeu o convite há um dia (10 contatos simulados, em duas rodadas):

| Mensagem do cliente | Resultado |
|---|---|
| "Quero sim", "Oi! Pode ver um horário pra mim sim", "Opa, bora marcar" | 3 de 3 seguiram o agendamento ("Qual serviço você quer agendar?") |
| "Não quero mais receber esses lembretes", "Pare de me mandar mensagem por favor" | 2 de 2 marcaram a linha (`parou`) e confirmaram ("você não receberá mais esses lembretes") |
| "Agora não, obrigado" | Agradeceu, sem marcar |
| "pode parar de mandar", "me tira dessa lista" (versão final, depois da revisão) | 2 de 2 marcaram e confirmaram |
| "Quero sim, não precisa mandar a localização que eu já sei onde é" | Seguiu o agendamento e não marcou a parada |

O caminho em que o convite é de fato enviado não rodou de ponta a ponta no n8n: não há no TESTE um cliente real com a última visita há 25 a 30 dias e sem horário marcado. Esse trecho está coberto pela execução dos nós renderizados nos testes, pela validação do SQL no banco e por ser a mesma cauda de envio que a retomada já usa em produção.

### Antes de ligar em produção

1. Aplicar a migração 0020 (`scripts/migrar.py`). Sem ela o agente roda normalmente; só o ramo do convite falharia ao gravar a linha.
2. O owner aprova o texto e muda `convite.ativo` para `true`.
3. Nossos dados de visita começam em 15/11: os primeiros convites sairiam por volta de 10/12. Não há carga de clientes antigos.

### O que falta e limites

- **Bloqueio do número:** não há limite de envio documentado para a conexão por QR Code. Os limites acima são conservadores, sem base medida.
- **Quem fica de fora:** cliente sem celular válido na agenda, celular com mais de um cadastro, e quem agendou com menos de uma hora de antecedência (não gera linha na nossa base).
- **Sessões do pacote:** a Graces só lista o que é agendável; seção de agendamento cancelado pode ficar presa como agendada e o número sair menor que o real.
- **Vazão:** uma avaliação por rodada dá no máximo 96 por dia (terça a sábado), contando as que terminam canceladas. Acima disso, quem passar dos 28 dias fica sem o convite daquela visita, sem registro.
- **Resposta por outro número** (`@lid` ou celular sem o 9): o contexto do convite e o pedido de parar são por contato e se perderiam.
- **Envio real a quem nunca falou com o agente:** não medido em que fila do Chat Master a resposta cai.

## Remarcar depois de recusar o lembrete (27/11)

### O que acontecia

PROD, 27/11, cliente com dez horários marcados (uma série de sábado). Ele respondeu "NÃO" ao lembrete, tocou em "Remarcar", pediu a segunda-feira e escolheu "20:00". O agente respondeu com a lista dos dez horários marcados; o cliente tocou no de 28/11 e ouviu "Você quer manter o corte adulto de sábado, 28/11 às 11:20, em vez de remarcar para segunda-feira às 20:00?". Só no "quero remarcar" a remarcação saiu. Reproduzido no TESTE: em uma rodada o modelo foi direto, em outra repetiu a falha.

### Causa

- **A recusa guardava só o id da agenda** (`pedido.confirmacao_recusada = {idAgenda, em}`), e esse id ia ao modelo na linha de contexto. Nenhuma ferramenta o aceita: `reagendar` e `horarios_livres` só conhecem o agendamento pela opção de `meus_agendamentos`. Para remarcar, o modelo era obrigado a chamar `meus_agendamentos`, que troca a oferta pela lista dos agendamentos e, com mais de um, não diz qual foi o recusado.
- **O resumo saía com a lista pendurada.** Com `meus_agendamentos` e `reagendar` no mesmo turno, a proposta nascia certa, mas o `bvCompor` só tirava da resposta as listas de horário: o "Posso confirmar?" seguia com os dez agendamentos em lista. O toque num item não é um sim (a barreira da fase 2 recusa), e o modelo reformulava a pergunta ao contrário.
- **Recusa por toque caía em sessão nova.** O toque em "Não vou poder" é tratado pelo `bv-confirmacao`, sem turno do agente. Se a conversa estava parada havia mais de duas horas, o "Remarcar" seguinte abria sessão nova e o nó `Sessao` levava a recusa para `pedido_anterior`: as ferramentas não sabiam mais dela. Com o lembrete em lista (27/11), esse passou a ser o caminho mais comum.

Nada disso veio das publicações de 27/11: as peças são de 18/10 a 24/11.

### O que mudou

- **A recusa guarda o agendamento.** O `Registrar` do `bv-confirmacao` grava também `inicio`, `servico`, `barbeiro`, `idProfissional` e `idCliente`, lidos da linha do lembrete (sem consulta nova à agenda).
- **O agendamento recusado é a opção `rec`.** `bvgRecusado` o acha no que a conversa já leu da agenda (os futuros da identificação ou os listados), pela ocorrência (`idAgenda` e início) ou, na série que aparece com outro id no dia, pelo início. Só vale se o barbeiro do agendamento achado for o do lembrete e o cadastro for o mesmo: telefone com dois cadastros no mesmo horário, ou barbeiro trocado pela equipe depois do lembrete, não resolvem (o resumo diria um barbeiro e a escrita iria a outro). `bvgResolver` resolve `rec` como qualquer `id_opcao_agendamento`: as barreiras existentes valem para ele sem mudança.
- **Padrão em código.** `horarios_livres` sem serviço e sem agendamento informados vira a remarcação do agendamento recusado (serviço e barbeiro dele), desde que a conversa não tenha escolhido outro serviço: quem recusou o corte e está marcando barba continua na busca da barba. `reagendar` passa a aceitar só o horário e assume o mesmo agendamento. Nenhuma chamada a mais à agenda nem ao modelo.
- **`agendar` no horário da remarcação vira remarcação.** No TESTE, em 1 de 7 rodadas o modelo chamou `agendar` no horário escolhido e saiu a proposta de um agendamento novo, com o recusado de pé. Os horários de uma busca que saiu como remarcação do agendamento recusado levam a marca `rec`, com o id e o início do agendamento da busca (só no estado, nunca no que vai ao modelo). `agendar` com um deles, sem substituição, segue pelo caminho do `reagendar` e devolve a mesma proposta, com as mesmas barreiras e sem contar no teto de agendamentos do dia; a orientação diz que saiu remarcação e como pedir um agendamento a mais. A conversão só acontece se a marca for do agendamento que a recusa em pauta resolve agora: com duas recusas em duas horas, o horário buscado para o primeiro não remarca o segundo (nem pelo `agendar`, nem pelo `reagendar` só com o horário). Horário de busca de outro serviço não leva a marca e continua sendo agendamento novo. Desde "Ocorrência certa (27/11)", abaixo, toda busca de remarcação marca os horários, também a que informa o agendamento pelo id da lista.
- **`agendar` confirma a proposta de remarcar.** No sim, o modelo pode repetir `agendar` com o `proposta_id`: o mapa do nó `Contexto` do `bv-graces` passou a deixar `agendar` reivindicar a proposta `reagendar` (antes saía `proposta_expirada`, a fase 1 convertia de novo e o "posso confirmar?" voltava). A fase 2 decide pela ação da proposta, que é o resumo que o cliente confirmou, e a conferência do sim é a mesma nas duas ferramentas. Nenhuma outra combinação mudou: `reagendar` não executa agendamento novo e `cancelar` só executa cancelamento.
- **Quando não dá para saber qual é o agendamento, a ferramenta manda listar.** Com a recusa em pauta sem resolver, a busca só com a data não cai calada no serviço de costume: `horarios_livres`, `reagendar` e `cancelar` devolvem `agendamento_nao_informado`, que manda chamar `meus_agendamentos` (e, na busca, informar o serviço se for um agendamento novo). O `rec` informado que não resolve é recusado sempre, com ou sem serviço na chamada.
- **Resumo sem a lista de agendamentos.** No `bvCompor`, o pedido de confirmação de uma proposta não leva a lista de agendamentos, como já não levava a de horários. A pergunta "qual deles?", sem proposta no turno, segue com a lista.
- **Linha de contexto.** Sai o id da agenda; entram o serviço, o dia e a hora do agendamento recusado, o id `rec` e o que fazer em "Remarcar" e em "Cancelar mesmo".
- **Validade num lugar só.** A recusa vale 120 minutos (`conversa.janela_recencia_min`), pela função `bvMRecusa`: na linha de contexto, nas ferramentas (`bvgRecusado`, com o relógio que o `Planejar` do `bv-graces` passa) e no `Preparar`, que diz ao nó `Sessao` se ela ainda vale.
- **Sessão nova.** Com a recusa válida, o nó `Sessao` a mantém no pedido da sessão nova; vencida, ela vai embora com o pedido, como sempre. Na mesma sessão o `Sessao` não mexe na recusa.
- **Uma definição de "é o agendamento recusado"** (`bvgEhRecusado`): o mesmo id e o mesmo início, ou o que `bvgRecusado` achou. Vale para o cancelamento sem a lista de decisão (também na ocorrência com outro id; outra ocorrência da mesma série volta a receber a lista) e para o fim da recusa.
- **Fim da recusa.** Remarcado, cancelado (sozinho ou em conjunto) ou trocado de serviço o agendamento recusado, a recusa sai do pedido (a linha "não vai poder comparecer" seguia no contexto por até duas horas).

**Barbeiro que só a equipe agenda.** Com o agendamento da remarcação sendo dele (o recusado ou um informado pelo id da lista), `horarios_livres` encaminha para a equipe em todos os casos, também com `qualquer=true` ou com outro barbeiro informado (antes essas buscas ofertavam horários de outros barbeiros como remarcação). O padrão do `reagendar` e a conversão do `agendar` entram na primeira linha do `bvgFase1`, antes de `bvgTocaHumano`: aplicados depois, um agendamento recusado com ele podia ser remarcado para um horário de outro barbeiro. Há teste para cada caminho: busca, `reagendar` e `agendar` encaminham, sem proposta.

### Limites

- **Dois agendamentos no mesmo dia do recusado:** o padrão não se aplica (a recusa do lembrete vale para os dois e não dá para saber de qual o cliente fala). As ferramentas mandam listar.
- **Recusa gravada antes desta versão** (sem `inicio`): linha de contexto e ferramentas como eram. **Agendamento que a conversa não leu** (o do barbeiro de teste em PROD), barbeiro ou cadastro diferente do lembrete: as ferramentas mandam listar.
- **Busca de remarcação com o agendamento informado pelo id da lista** (não pelo `rec`): fechado em "Ocorrência certa (27/11)", abaixo. Os horários levam a marca do agendamento da busca: se ele é o recusado, `agendar` neles sai como remarcação; se é outro, `agendar` continua saindo como agendamento novo, com o aviso de que o cliente já tem horário.
- **Em aberto, para decisão do owner:** com dois serviços no dia, "Cancelar mesmo" cancela só o primeiro; e o "Cancelar mesmo" por toque em sessão nova pede mais uma confirmação. A proposta de cancelar que seguia pendente durante a remarcação e a recusa de série recorrente sem a marca foram fechadas em "Cancelar só o que o cliente pediu (27/11)", abaixo.

### Testes

- `tests/graces.test.js`: busca só com a data e `reagendar` só com o horário; `agendar` no horário da remarcação; série recorrente; ocorrência com outro id; agendamento novo de outro serviço na mesma conversa; recusa que não resolve (barbeiro ou cadastro diferente, dois no dia, não lido) e recusa vencida; barbeiro que só a equipe agenda; cancelar por `rec`; fim da recusa depois da escrita.
- `tests/agente.test.js` (resumo sem a lista de agendamentos), `tests/mensagens.test.js` (linha de contexto e `bvMRecusa`), `tests/test_workflows_mensagens.py` (`Registrar`, `Preparar` em sessão nova e com a recusa vencida) e `tests/test_workflows_agente.py` (`Sessao`, `Planejar` e a janela na configuração).
- Roteiro na suíte: não criado. O preparo dos roteiros semeia um agendamento só e o toque em "Não vou poder" (pelo id da lista, sem turno do agente) não tem passo próprio; com um agendamento o roteiro não reproduz o caso.
- Banco do TESTE (27/11), em transação desfeita: `Registrar` (recusa com e sem a linha do lembrete, com e sem cliente), `Sessao` (sessão nova com a recusa válida, vencida e ausente; mesma sessão intacta) e o mapa do `Contexto` (proposta `reagendar` reivindicada por `agendar` e por `reagendar`; `cancelar` por nenhuma das duas).
- TESTE (27/11), a conversa do caso com a identificação real do cliente (dez horários marcados), contato sem envio: antes da correção, a falha reproduzida (resumo com a lista dos agendamentos e o "quer manter?"); na primeira versão, 6 de 7 rodadas certas e uma em que o modelo chamou `agendar` (o que a conversão trata); nas duas versões seguintes, 14 de 14 rodadas de remarcação certas (recusa digitada e por toque, conversa parada há 3 horas, espera de 13 minutos antes da escolha): busca com a chave `rec`, proposta no agendamento recusado e "Posso confirmar?" em texto, sem lista. "Cancelar mesmo" na mesma conversa: horário apagado na Graces e recusa fora do pedido (2 de 2); em sessão nova, o agente pede mais uma confirmação (limite acima). `smoke-mensagens` m10, m2 e m9 sem falha. Roteiros vizinhos da suíte (R7, R8, R33, R34 e R35: cancelamento, "cancelei, vamos marcar outro", lista de agendamentos antes da proposta, "sim" depois da oferta e recusa de presença com cancelamento): 5 de 5 aprovados.
- Não medido: o "sim" final da remarcação (no TESTE a busca oferece barbeiros reais, e a escrita só é feita no barbeiro de teste); a fase 2 não mudou, fora a limpeza da recusa, coberta em `tests/graces.test.js`.

## Cancelar só o que o cliente pediu (27/11)

Dois defeitos achados em leitura do código, sem caso registrado em PROD. Reproduzidos com as funções puras antes da correção.

### O que podia acontecer

- **Horário apagado no meio da remarcação.** A lista "Remarcar / Cancelar mesmo" nasce com uma proposta de cancelar pendente (no pedido de cancelamento comum, no de vários de uma vez e na recusa do lembrete). Se o cliente escolhe remarcar, a proposta continua pendente até nascer outra: 30 minutos, ou até 12 horas depois de uma retomada. "ok, segunda então", "pode ser às 20" e "sim" passavam na barreira do sim; bastava o modelo chamar `cancelar` com o `proposta_id` (que o contexto mostra a cada turno) para o horário ser apagado. "prefiro remarcar em vez de cancelar", "melhor remarcar do que cancelar" e "remarcar, sem cancelar" também passavam, pela palavra "cancelar".
- **`DELETE` sem a data numa série recorrente.** O lembrete criado pela reconciliação não sabe que o agendamento é de série (a `/agenda/completa` não traz `recorrente`), a recusa não lê a agenda e a proposta de cancelar nascia com `recorrente: false`; o mesmo vale para o cancelamento pelo `rec`, que sai dos futuros da identificação. No "Cancelar mesmo" saía `DELETE /agenda/{id}` sem `?data=`. A conferência antes de apagar olhava só o id: achava a primeira linha da série, e um agendamento que a equipe tivesse mudado de dia seria apagado no dia novo.

### O que mudou

- **Só o cancelamento dito executa a proposta da lista.** `bvgConfirmou` ganhou o modo `soDito`; o `bvGNormalizar` deriva da fala a marca `so_sim` (confirmou só por um sim genérico; como `cabelo_barba`, não entra de fora); a fase 2 recusa com `cliente_nao_disse_cancelar` a proposta de cancelar que não nasceu da pergunta direta. Nada é lido nem apagado, a proposta termina como `falhou` e a ocorrência fica em `falhas_agente` (`graces|cancelar_sem_dizer`), para contar quantas vezes o modelo tenta.
- **Falha fechada.** A única proposta de cancelar em que o sim genérico basta é a da pergunta direta ("Posso confirmar o cancelamento?"), que leva `sim_basta`. A da lista, a de vários de uma vez, a do lembrete e qualquer proposta anterior a esta versão exigem o cancelamento dito.
- **Sem laço.** A recusa marca os agendamentos da proposta em `pedido.decisao_vista` (id e início). A fase 1 seguinte deles sai pela pergunta direta, sem a lista (`bvgCancDireto`, o mesmo caminho de quem recusou a presença), e o "sim" a ela cancela. A recusa também tira a lista de decisão do estado da conversa, mas não a lista de horários de quem está remarcando.
- **Negação e pedido, depois da revisão independente.** Com o "dito" como única chave da proposta da lista, a negação passou a cobrir o "não" abreviado antes do verbo ("n cancela", "nn", "naum", "ñ"), o "não" depois dele ("cancela n", "cancela nada", "cancela ainda não", "cancelar mesmo não", "cancelar, não", "cancelar? não") e a menção que não é pedido ("sem", "em vez de", "invés de", "no lugar de", "antes de", "do que" e "remarcar que" antes de cancelar; "se cancelar", "se eu cancelo"), além de "mantém" e "manter". E só as formas de pedido contam como cancelamento dito (cancela, cancelar, cancele, cancelem, cancelo, desmarca, desmarcar, desmarque, desmarquem, desmarco): "já foi cancelado?", "você cancelou?" e "taxa de cancelamento" não cancelam, nem a pergunta sobre cancelar: fala terminada em "?" com interrogativo ("como faço pra cancelar?", "por que cancelar?", "até quando posso cancelar?") ou com "cancelar depois". O pedido em forma de pergunta ("pode cancelar?", "cancela pra mim?") segue valendo. "não vou poder ir, cancela" e "não, cancela" seguem cancelando: a vírgula separa a negação do pedido.
- **"Marca" e "agenda" não são sim ao cancelamento.** As duas palavras estão na lista do sim (valem para agendar e remarcar); no cancelar, o sim genérico não conta se a fala manda marcar, remarcar ou agendar (o verbo: marca, marcar, marque, agenda, agendar, agende, e qualquer forma de remarcar). "marca pra segunda então" e "agenda outro pra mim" deixaram de confirmar a pergunta direta; "sim, o agendamento de sábado" e "sim, o horário marcado" confirmam.
- **A ocorrência exata, pela agenda lida na fase 2.** `bvgConfereApagar` exige na agenda do cliente o agendamento com o mesmo id e o mesmo início (`bvMOcorrencia`, que passou a comparar o id como texto); sem ele, `agendamento_nao_encontrado` e nada é apagado. Vale para o cancelamento de um, para cada item do conjunto e para o antigo da troca de serviço. A conferência de pacote continua antes: qualquer ocorrência do id com pacote leva à equipe.
- **Data da ocorrência no `DELETE`.** Nesta versão o `DELETE` levava `?data=` quando a proposta ou a agenda lida diziam que era série (`recorrente` em alguma linha do id, ou o id em mais de uma linha). Desde "Ocorrência certa (27/11)", abaixo, a data vai sempre, sem decidir se é série, nos três casos: o cancelamento de um agendamento, cada item do conjunto e o antigo da troca de serviço (também depois de um `POST` sem resposta). Nenhuma chamada a mais: a leitura já era feita.
- **Verificação depois de `DELETE` sem resposta.** Cancelado é a ocorrência ter sumido (as outras seguem na agenda com o mesmo id; antes a verificação repetia o `DELETE` e podia terminar em falha com o horário já cancelado).

Só `workflows/shared/graces.js` e uma linha de `workflows/shared/mensagens.js`. Nenhum nó, coluna, configuração ou topologia mudou.

### O que executa o cancelamento

| Proposta | Executa | Não executa |
|---|---|---|
| Da lista "Remarcar / Cancelar mesmo" (cancelar comum), de vários de uma vez, do lembrete recusado e as anteriores a esta versão | Toque ou texto "Cancelar mesmo", "cancela", "cancelar", "cancele", "cancelem", "eu cancelo", "pode cancelar", "pode cancelar?", "desmarca", "pode desmarcar", "desmarque", "sim, cancela", "não quero remarcar, pode cancelar", "não vou poder ir, cancela", "não, cancela", "sem problema, pode cancelar", "vou ter que cancelar" | "sim", "ok", "pode ser", "ok, segunda então", "pode ser às 20", "pode tirar", "confirmo o cancelamento", "sim, o agendamento de sábado", "pode ir desmarcando", 👍 (recusa `cliente_nao_disse_cancelar`, e a pergunta direta em seguida) |
| Da pergunta direta (quem recusou a presença, pelo `rec` ou pelo id da lista, e quem já respondeu à lista sem dizer cancelar) | As de cima e também "sim", "pode", "isso", "ok", "confirmo o cancelamento", "sim, o agendamento de sábado", "sim, meu agendamento", "sim, o que está marcado pra sábado", "sim, o horário marcado", "pode ir desmarcando" | — |
| Qualquer uma (recusa `cliente_nao_confirmou`, antes de qualquer leitura) | — | "Remarcar", "quero remarcar", "prefiro remarcar em vez de cancelar", "prefiro remarcar que cancelar", "antes de cancelar, tem horário na segunda?", "não quero cancelar", "n cancela", "naum cancela", "cancela n", "cancela nada", "cancelar mesmo não", "cancelar, não", "cancelar? não, quero remarcar", "já foi cancelado?", "você cancelou?", "qual a taxa de cancelamento?", "vocês cobram se cancelar?", "não cancelem", "cancelem não", "não desmarque", "como faço pra cancelar?", "por que cancelar?", "cancelar pra quê?", "até quando posso cancelar?", "posso cancelar depois se precisar?", "o que acontece se eu cancelo?", "se eu cancelo perco?", "sim, mantém o agendamento", "marca pra segunda então", "quero marcar outro horário", "agenda outro pra mim", "tá bom, vamos remarcar", "sim, mas quero remarcar", "20:00", "Obrigado" |

### Limites

- **Sinônimo ou forma que não é de pedido** ("pode tirar", "pode excluir", "confirmo o cancelamento", "quero o cancelamento", "pode ir cancelando", erro de digitação como "pode canselar") diante da lista custa uma pergunta a mais: a ferramenta recusa e o agente pede a confirmação direta. Sem palavra de sim ("tira meu horário", "apaga", "cancelamento mesmo"), a fala não confirma nada.
- **"Cancela o de quarta e marca pra segunda"** (roteiro R8): a proposta de cancelar e a busca de segunda saem no mesmo turno. Um "pode ser às 10" no turno seguinte não executa mais o cancelamento; o caminho é remarcar, ou a confirmação direta do cancelamento.
- **Na pergunta direta o sim genérico continua bastando**, como em toda proposta: "ok, mas tem horário segunda?" ou "pode ser às 20" depois de "Posso confirmar o cancelamento?" ainda passam na barreira se o modelo chamar `cancelar`. "marcado" sozinho também passa (está na lista do sim).
- **Negações que a expressão não alcança** (medidas na bateria da revisão; passam como cancelamento dito se o modelo chamar `cancelar` com a proposta): mais de duas palavras entre o "não" e o verbo ("não era para eu cancelar", "não quero que você cancele", "não quero de jeito nenhum cancelar"), o "não" depois de outras palavras ("remarca, cancelar eu não quero"), a condição ("se não der pra remarcar eu cancelo", "prefiro remarcar, cancelar só se não tiver horário") e a pergunta sem interrogativo ("quem falou em cancelar?", "cancelo ou remarco?", "quero remarcar, que cancelar o que"). Alargar a negação para três palavras barraria "não vou poder ir cancela", sem vírgula. Na direção contrária, "não quero manter, cancela" e "quando puder, cancela?" não confirmam e custam uma pergunta; pedido sem vírgula depois do "não" já não confirmava e segue assim ("não posso cancela pra mim", "pode cancelar não quero remarcar").
- **Os quatro pontos que montam o `DELETE`** ficaram separados nesta versão; viraram um montador só (`bvgDel`) em "Ocorrência certa (27/11)", abaixo.
- **A linha "Confirmação pendente" do contexto não mudou:** enquanto a proposta da lista estiver pendente o modelo ainda é convidado a usá-la, e a tentativa custa uma chamada de ferramenta recusada.
- **Proposta sem `texto_cliente`** (chamada direta ao `bv-graces`, sem o nó da ferramenta) segue sem as barreiras da fala, como antes; os três nós de escrita do agente sempre mandam a fala.

### O que falta medir

- **Na Graces, com o barbeiro de teste** (a série tem de ser criada pela equipe no sistema; a API não cria recorrência): o que o `DELETE` sem `?data=` faz numa série (erro, ou a série inteira; deixou de importar para o agente, que manda a data sempre desde "Ocorrência certa (27/11)"); se as ocorrências vêm com `recorrente: true` em `/agenda/agendamentos`; se recusar a presença de uma ocorrência com a data troca o `idAgenda` dela; e o que o `DELETE ?data=` responde para uma data que já saiu da série. A ocorrência que aparece com outro id no dia (PROD, 17/11) termina em `agendamento_nao_encontrado`, sem apagar nada: falta medir quando o id muda para decidir se o cancelamento deve achá-la pelo início.
- **Medido no TESTE, com o modelo (27/11)**, contato sem envio, agendamento do cliente de teste no barbeiro de teste, em três versões do código: recusa do lembrete, "Remarcar", dia e "pode ser às 21:20": 8 de 8 rodadas com a proposta de remarcar, o agendamento recusado de pé e nenhuma chamada a `cancelar`; "Cancelar mesmo" depois da recusa: 6 de 6 (apaga em uma rodada na mesma conversa; em sessão nova, depois de uma confirmação); "sim" diante da lista "Remarcar / Cancelar mesmo": 11 rodadas, nenhuma apagou no sim genérico. Em 5 delas o modelo chamou `cancelar` com a proposta da lista e a barreira recusou (`graces|cancelar_sem_dizer`), o agente fez a pergunta direta e o sim seguinte cancelou; nas outras o agente repetiu "remarcar ou cancelar?" (e, no segundo sim seguido, passou para a equipe) ou, uma vez, ofereceu passar para a equipe. Roteiros R7, R33, R34 e R35 aprovados; o R8 teve um `erro_infra` (turno sem fim em 67 s) numa rodada e passou nas 3 repetições com o código final. `smoke-mensagens` m10, m2 e m9: uma falha isolada do m10 ("lembrete atrasado") numa rodada, sem repetição em duas rodadas com o código final.
- **Não medido com o modelo:** "marca pra segunda" depois da pergunta direta; cancelar vários de uma vez com um item de série; cancelamento de pacote (segue indo para a equipe, coberto em teste).

### Testes

- `tests/graces.test.js`: as frases por tipo de proposta, com as negações abreviadas e separadas por pontuação, as menções sem pedido, as que têm de continuar cancelando, o plural do pedido, as perguntas sobre cancelar, e "marca"/"agenda" contra "agendamento"/"marcado" na pergunta direta; `so_sim` não entra de fora; a recusa sem chamada à agenda; a saída sem laço (um e vários) e o "sim" à pergunta direta até o `DELETE`; a data da ocorrência no `DELETE` (série pela marca, pelo id repetido, pela proposta, e o avulso), no cancelamento de um, em cada item do conjunto e no antigo da troca (também depois de `POST` sem resposta); ocorrência fora da agenda; pacote antes; verificação depois de `DELETE` sem resposta; cancelamento pelo `rec` numa série. Cinco agendas simuladas de testes antigos ganharam o `horaInicio` do agendamento (não tinham, e a conferência agora o exige); o que cada teste afirma não mudou.
- `tests/mensagens.test.js`: `bvMOcorrencia` com id numérico e pela ocorrência.
- `tests/test_workflows_mensagens.py`: nós renderizados, do `Desfecho` da recusa ao `Passo` do `bv-graces`.

## Ocorrência certa: remarcar, futuros e `DELETE` (27/11)

Três achados da revisão independente feita depois da publicação das duas correções acima. Nenhum caso registrado em PROD; reproduzidos com as funções puras antes da correção.

### O que podia acontecer

- **Remarcação proposta para o agendamento errado.** Cliente com série de sábado recusa o lembrete de 28/11 e, nos 120 minutos seguintes, pede pela lista para remarcar outro horário (o sábado de 05/12, ou um avulso). A busca sai com o id da lista e os horários ficavam sem marca. Se o modelo chamasse `reagendar` só com o horário (o que a linha de contexto manda fazer enquanto a recusa vale), a proposta saía para o agendamento recusado: "Remarcar corte adulto de 28/11 11:20 para ...". O mesmo na reoferta de horários da fase 2 (horário tomado) de uma remarcação que não era a do recusado. O resumo mostrava a data, e o cliente podia notar antes do sim.
- **Os outros dias da série sumiam dos futuros.** Cancelar ou remarcar uma ocorrência tirava de `pedido.futuros` todas as linhas do mesmo `idAgenda`. A linha "Agendamentos futuros do cliente" do contexto deixava de mostrar sábados que continuavam marcados, o aviso de duplicidade não valia para eles e uma segunda recusa não resolvia o `rec`, até a sessão seguinte ou um `meus_agendamentos`. Nada era apagado na agenda.
- **`DELETE` sem a data na série que a leitura não mostra como série.** A data só ia quando a proposta ou a agenda lida diziam que era série. Série com uma ocorrência só na resposta e sem `recorrente: true` saía sem `?data=`, e não está medido o que a Graces faz nesse caso. A mesma expressão estava escrita em quatro pontos.

### O que mudou

- **Toda busca de remarcação marca os horários** com o agendamento dela (id e início), pelo `rec` ou pelo id da lista, e a reoferta da fase 2 de qualquer remarcação também. Com a recusa em pauta, `reagendar` só com o horário (ou com o `rec`) num horário buscado para outro agendamento devolve `agendamento_nao_informado`, que manda informar o `id_opcao_agendamento`: é o ramo que já existia para as duas recusas em duas horas. Com o id da lista informado sai o agendamento escolhido, como sempre. A marca só é lida com a recusa em pauta: sem ela nada muda.
- **`agendar` no horário de uma busca do próprio recusado pelo id da lista** passa a sair como remarcação (antes só a busca pelo `rec` convertia; era um limite registrado).
- **Futuros pela ocorrência.** `bvgFuturos` tira só a ocorrência escrita (id e início até o minuto, pela comparação que já existia, `bvgMesmaMarca`), no cancelar (um e vários), no remarcar e no antigo da troca de serviço. O id passou a ser comparado como texto, como em `bvMOcorrencia`.
- **Um montador do `DELETE`, sempre com `?data=`.** `bvgDel` monta os quatro pontos (cancelar, item do conjunto, antigo da troca depois do `POST` e depois do `POST` sem resposta) e manda sempre o dia da ocorrência. Medido em 27/11 na Graces, com o barbeiro de teste: `DELETE /agenda/{id}?data=AAAA-MM-DD` em agendamento comum responde 200 e apaga, inclusive com a data de outro dia (a API ignora a data fora de série). Em série, pela documentação, com a data só a ocorrência sai.
- **A conferência não mudou.** Como a Graces ignora a data no agendamento comum, quem garante a ocorrência exata continua sendo `bvgConfereApagar` (id e início na agenda lida na hora, pacote antes). Ela deixou só de devolver a marca de série, que ninguém mais usa.
- **Verificação depois de `DELETE` sem resposta:** cancelado é sempre a ocorrência ter sumido (antes, sem a data, era o id ter sumido).
- **Saiu do código** o que só servia para decidir se a data ia: a marca de série por alvo da conferência, `meta.rec`, `recAnt` e o `recorrente` dos itens do cancelamento em conjunto.

Só `workflows/shared/graces.js`. Nenhum nó, coluna, configuração ou topologia mudou, e nenhuma chamada a mais à Graces ou ao modelo.

### Limites

- **Oferta montada antes da publicação:** os horários de uma busca pelo id da lista feita na versão anterior seguem sem marca enquanto a oferta estiver aberta, e para eles vale o comportamento antigo.
- **Horário sem marca** (busca comum, com o serviço informado) com `reagendar` só com o horário continua assumindo o agendamento recusado, como antes; se o serviço for outro, `servico_diferente`.
- **O `recorrente` das propostas de cancelar e de remarcar segue existindo:** o da remarcação vai para a linha do lembrete (o `POST /agenda/confirmacao` de série leva a data); o da proposta de cancelar que nasce do lembrete (`bvMDecisaoCancelar`) ficou sem uso.
- **A ocorrência remarcada entra nos futuros sem `recorrente`,** como já entrava.
- **Verificação depois de `DELETE` sem resposta lê só a primeira página** (50 linhas, sem `pageSize`): numa agenda com mais de 50 linhas futuras, a ocorrência fora da página conta como cancelada. Já era assim para série.
- **Não medido na Graces:** o `DELETE` com a data numa série (a API não cria recorrência; depende de uma série criada pela equipe no barbeiro de teste).

### Testes

- `tests/graces.test.js`: busca pelo id da lista do sábado seguinte e do avulso, com a recusa em pauta (marca do agendamento da busca; `reagendar` só com o horário manda informar o id; com o id sai o escolhido; `agendar` segue agendamento novo); busca do próprio recusado pelo id da lista (remarcação pelo `reagendar` e pelo `agendar`); reoferta da fase 2 de outra ocorrência; sem recusa, nada muda. Futuros depois de remarcar, cancelar (um e vários) e trocar o serviço numa ocorrência de série, e do avulso. `DELETE` com a data nos quatro pontos, com a proposta dizendo ou não que é série; agendamento comum que mudou de dia ou de hora sem `DELETE` nenhum; verificação depois de `DELETE` sem resposta na série que a leitura mostrou com uma linha só.
- Cada correção conferida por mutação (15 mutações, todas derrubadas pela suíte): a marca só na busca pelo `rec`, a reoferta só do recusado ou sem marca, os futuros pelo id em cada uso, a data só com `recorrente`, cada um dos quatro pontos sem a data, a verificação pelo id e a conferência sem a ocorrência.
- Não medido com o modelo nem no n8n: nada foi publicado no TESTE nesta entrega.
