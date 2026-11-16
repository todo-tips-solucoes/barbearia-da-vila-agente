# Melhorias do atendimento: análise de 14 e 15/11/2026

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

## Pendente, por prioridade

7. **Cadastro duplicado de quem já é cliente.** Dois disseram "já somos clientes" e "já cortei aí" e foram cadastrados de novo. A busca por nome da API da Graces devolve vazio nesta loja, então o duplicado não é detectado. Opções: perguntar antes se já é cliente e, se for, transferir para a equipe unir o cadastro.
8. **Cadastro antes de pergunta simples.** "Vocês estão abertos hoje?" exigiu nome, nascimento e origem. Sugestão: responder horário de funcionamento e endereço sem cadastro. Depende de decisão do owner, que pediu o cadastro antes.
9. **Becos sem saída com e-mail e Instagram.** Sem o telefone, quando o agente não resolve ele manda e-mail e Instagram. Sugestão: transferir para a fila humana (106) no próprio WhatsApp. "Estou a caminho" também recebeu um texto longo com esses contatos; deveria ser uma resposta curta.
10. **Lista de serviços em ordem alfabética.** Sem filtro, aparecem os 10 primeiros; o corte adulto é o 13º. Sugestão: mostrar os mais pedidos ou perguntar a categoria.
11. **Dois lembretes para quem tem dois serviços.** Um por serviço, no mesmo minuto. Sugestão: um só, citando os dois.

## Menores

- Telefone compartilhado entre pai e filho: o agente supôs corte infantil para o pai, porque o cadastro do telefone é do filho.
- Título de lista cortado em 24 caracteres ("Corte Infantil ate 11 an") repetido ao cliente no texto.
- Resposta a lembrete ("estarei por aí"): conferir se vira confirmação com a etiqueta, agora que o lembrete de 24 h pede SIM ou NÃO.
