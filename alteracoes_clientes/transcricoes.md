# Alterações pedidas pelo cliente — transcrições e leitura (2026-10-08)

Os áudios foram transcritos **localmente**, com `faster-whisper` (modelo `medium`, int8, CPU),
num container descartável: o áudio não saiu do servidor. A transcrição é automática, e
trechos ruidosos estão marcados como dúvida na leitura; o áudio é a fonte.
Ligação áudio ↔ imagem pelo número do arquivo, como indicado pelo operador.
`imagem_2`, `imagem_4` e `imagem_5` não existem.

## Transcrições (literais da ferramenta, sem edição)

### audio_1.ogg

> Paulão, eu continuei, eu mandei mensagem de novo, ele fez a mesma coisa, tá? Aí eu precisei escrever, quero marcar hoje, aí ele mudou. Mas, sei, não pode acontecer, né? Vou ficar fazendo uns testes aqui. Cara, eu acho que eu não sei se eu gosto desse esquema de escolher profissional. Porque aí o cliente vê muito que é um... Porque assim, qual que é a ideia? Vários clientes já falaram pra gente que não gostam de chat bot. E aí, por isso que a gente tá querendo aí, ah, porque daí é uma coisa mais personalizada. E aí quando ele fica perguntando e dando opção pra você ver se eu escrevo, marcar nas setinhas e tal, eu acho que fica meio impessoal e tal. Não teria como, tipo, ele escrevendo uma frase, eu falo assim, oi, eu queria marcar um corte-cabelo. Ah, ele me perguntou, tem preferência? Aí na outra frase, aí eu falo, não, aí ele falou, olha, eu tenho com... Aí ele escrevendo uma frase, eu tenho com... Aí eu escrevo. Fala lá, quero com o Pedro. Aí ele fala, ah, então tá bom, vou ver os horários do Pedro. Aí ele oferece os horários, eu vou lá e escrevo o horário e tal. Acho que ficaria mais... mais humano.

### audio_2.ogg

> Eu acho legal a confirmação só na confirmação, entendeu? Quando você manda uma mensagem pro cara de confirmação Oi, tudo bem? Gostaria de confirmar o seu horário Aí, confirmou não, aí o cara clica e confirmou e já é, entendeu?

### audio_3.ogg

> Olha, Paulo, na minha conversa com ele aqui, eu falei nas conversas anteriores que eu queria cancelar o meu horário. Seria interessante que ele sempre sugerisse um reagendamento. Falei assim, você quer cancelar? Você não quer remarcar para outro dia? Entendeu? Mas ele não sugeriu e eu confirmei que não queria cancelar. Beleza, ele cancelou. Aí na sequência eu falei, vamos marcar outro horário? Que é como o cliente vai falar muitas vezes, entendeu? Por isso que a gente está dando as opções. Aí ele, ah, não encontrou em nenhum horário. Tô assim, ele não entendeu que a gente estava conversando, que eu tinha um horário que eu desmarquei, então que eu quero marcar um outro horário agora. Seria interessante que ele entendesse isso, né? Aí ele falou que não entendeu, aí eu mandei um áudio. Ele falou, olha, eu não entendi. Você consegue mandar para o descrito?

### audio_4.ogg

> O áudio ele não vai entender

### audio_5.ogg

> Marquei um horário agora comigo mesmo, para terça-feira, para os laques pré-cabele e barra. O que acontece? Ele oferece dois horários, ele oferece dois horários, oferece dois horários. E ele deveria entender que ele tem que oferecer um horário que a partir dali tenha dois. Então ele vai oferecer um meio-dia ou uma e vinte, mas poderia ser meio-dia e quarenta, porque uma e vinte está livre também. Então poderia ser meio-dia, poderia ser meio-dia e quarenta, ou poderia ser meio-dia e vinte. Duas não, porque depois eu tenho um horário fechado. Entendeu? Então ele poderia oferecer meio-dia, porque ele precisa de meio-dia e meio-dia e quarenta. Por isso que ele vai oferecer meio-dia e quarenta, porque precisa de meio-dia e quarenta e uma e vinte. Uma, porque precisa de uma e vinte e duas. E ele ofereceu só meio-dia, contou com dois horários, e depois ofereceu uma e vinte, contou com dois horários.

## Leitura (o que cada par pede)

| Par | O que mostra/diz | Pedido |
|---|---|---|
| imagem_1 + audio_1 | "Oi" num dia novo; o agente retoma uma coleta antiga ("Cabelo adulto + barba… na quinta (17/09), qual profissional você prefere: Black, Kiel, Pedro Henrique, Rodrigo, jayme ou ZZ TESTE INTEGRACAO - NAO AGENDAR?"). Ele só saiu disso ao escrever "quero marcar hoje". | (1) Não retomar coleta antiga num "Oi". (2) Menos menu e mais conversa: "tem preferência de profissional?" → "não" → "tenho com X, Y e Z" → "quero com o Pedro" → "vou ver os horários do Pedro" → horários escritos e o cliente responde escrevendo. Motivo dito: os clientes não gostam de chatbot, e as opções "nas setinhas" ficam impessoais. (3) O profissional de teste aparece para o cliente (§31). |
| audio_2 (sem imagem) | Botão só na confirmação: a mensagem "Oi, tudo bem? Gostaria de confirmar o seu horário", e o cliente toca em confirmar. | Elemento interativo **só** na confirmação. |
| imagem_3 + audio_3 | Cancelou ("confirmo" → "Cancelado!…"). Depois, "Vamos marcar outro horário" → "Não encontrei nenhum agendamento seu para essa ação". Mandou um áudio → "Não consegui entender o áudio…". | (1) Ao pedir cancelamento, **sempre sugerir remarcar**. (2) Depois de cancelar, "vamos marcar outro horário" é um agendamento novo: o agente deve entender o contexto da conversa. (3) Entender áudio. |
| audio_4 | É o áudio de 5 s da imagem_3: "O áudio ele não vai entender". | Teste do item (3) acima. |
| audio_5 (sem imagem) | Serviço de 80 min (cabelo + barba, para terça). O agente ofereceu só 12:00 e 13:20, saltando de 80 em 80 min. | Oferecer todo início em que a duração cabe: 12:00, 12:40 e 13:20 (a transcrição também cita "meio-dia e vinte", trecho a confirmar no áudio). Não oferecer 14:00, porque depois há horário fechado. Hoje o passo é a duração do serviço (`app/dominio/disponibilidade.py`, dec-019). |
