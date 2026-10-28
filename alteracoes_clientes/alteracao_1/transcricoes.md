# Alterações pedidas pelo cliente — alteração 1 (2026-10-28)

Dois áudios do owner (`ajuste_1.ogg` e `ajuste_2.ogg`, fora do git: `alteracoes_clientes/*/*.ogg` no `.gitignore`),
transcritos com a API de transcrição da OpenAI (`whisper-1`, a mesma do `interpretar-midia`). A transcrição é
automática; o áudio é a fonte.

## Transcrições (literais da ferramenta, sem edição)

### ajuste_1.ogg

Ô Paulo, outra coisa também, eu tava conversando com o Jaime aqui, será que nessa parte da conversação a gente consegue dar uma alterada? Perguntar qual o período que seria melhor pro cliente, aí o cara fala assim, ah, duas horas. E aí ele meio que oferecer, meio que específico, ao invés de jogar todos os horários igual ele tá recebendo, no caso do Kiel, ele tava com a agenda mais de boa, liberou tipo duas conversas, digamos assim, duas mensagens só de horário. A gente não consegue dar uma limpada nessa questão de ser um pouco mais objetivo? Tipo, ah, qual o melhor horário pra você? Você tá perguntando sobre barba, a pessoa vai responder mais ou menos o horário, aí ele pega dentro da margem do horário ali e já oferece mais específico.

### ajuste_2.ogg

O Paulo e outra coisa, em questão de horário, tipo, no caso, quando for dois serviços, né, que seria cabelo e barba, que fecha dois horários. O Jami até lembrou uma conversa aqui, que meio que tinha, media, media 40, e depois, mais tarde, aí tinha uma brecha que daria pra fazer também. Aí ele meio que pulou um horário que daria pra encaixar dois serviços, pra jogar mais pra cima, sabe? Ele não mostrou, tipo, todos os horários, digamos assim, que daria, dois horários seguidos que daria pra fazer os serviços.

## Leitura (o que cada áudio pede)

| Áudio | Pedido | Como entrou |
|---|---|---|
| ajuste_1 | Em vez de despejar todos os horários do dia (duas mensagens só de horário), perguntar qual horário fica melhor; o cliente responde algo aproximado ("umas duas horas") e o agente oferece só os inícios perto disso. | Prompt: com o dia definido e sem período/hora, pergunta primeiro. Ferramenta `horarios_livres` ganha `hora` (HH:mm): só inícios até `horarios.margem_min` (60 min) da hora dita; sem nenhum, os 2 mais próximos de cada lado, com aviso. Período continua em `periodo`; "tanto faz" lista tudo. Roteiro R19 na suíte. |
| ajuste_2 | Com dois serviços (cabelo e barba, dois horários seguidos), o agente pulou uma brecha mais tarde em que a sequência cabia; mostrar todas as sequências possíveis. | Nas conversas reais "corte e barba" virou o serviço combinado de 80 min da Graces; a grade da Graces anda de 40 em 40 min desde a abertura e descarta brechas fora dessa grade (medido no barbeiro de teste em 2026-10-28). Decisão do owner pendente: ver a PR. |
