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
| 2 | "Sem laço" contra "mande a lista de novo" | A mesma pergunta sai no máximo duas vezes, inclusive em lista; na terceira, oferece a equipe; não sugere uma opção no lugar do cliente | R30, R38 |
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
| Laço em lista: a mesma pergunta saía três vezes, sem oferecer a equipe | Cada oferta nasce com a hora (`opcoes.em`); a lista volta junto na segunda vez (`bvRepetePergunta`) e, na terceira, a resposta é trocada pelo texto fixo que oferece a equipe (`bvTerceiraVez`, `textos.laco`) |
| No toque em "Remarcar" o agente perguntava "qual opção prefere?": a orientação da ferramenta só existe no turno em que ela é chamada | A decisão do cancelamento leva o significado das opções no contexto enquanto estiver aberta (`bvContextoOferta`) |
| Quem dizia ser cliente do barbeiro só da equipe, em número sem cadastro, recebia pedido de cadastro | A regra diz que quem já é cliente (da loja ou do barbeiro) não é cadastrado, nem para transferir |
| Diante de "tanto faz, você que sabe", o agente afirmava qual opção era "a mais procurada" | A regra do laço proíbe escolher pelo cliente e afirmar preferência sem dado |
| No pedido de cancelamento o texto perguntava só "posso cancelar?" | A orientação manda perguntar no texto "remarcar ou cancelar mesmo?" |

Sobre a suíte: a avaliadora aprovou conversas que descumpriam a expectativa (R33 e R38 em algumas execuções), então as conversas dos roteiros novos foram lidas uma a uma. A transcrição passou a mostrar a lista reenviada no turno, a fala da equipe vale como fonte, e um roteiro pode levar referência própria (`referencia`). Com 39 roteiros julgados por modelo, uma rodada inteira sem variação é difícil: de cinco rodadas completas de 39, duas fecharam 39 de 39 e três fecharam 38, cada uma com um roteiro diferente.

Em aberto, para decisão do owner: o texto da recusa de presença pergunta "remarcar ou cancelar?" em texto livre (`textos.confirmacao_recusada`, enviado pelo `bv-confirmacao`), não em lista.
