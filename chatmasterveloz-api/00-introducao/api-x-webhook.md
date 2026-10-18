---
title: "API x Webhook"
slug: api-x-webhook
category: "Introdução"
source: https://clihelper.chatmasterveloz.com/docs/api-x-webhook
fetched: 2026-10-14
---
# API x Webhook

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-x-webhook> · [Voltar ao índice](../README.md)

🧩 **API** e **Webhook** são sempre comparados, porque os dois servem para **comunicação entre sistemas** — mas funcionam ao contrário um do outro. A API você chama quando quer; o Webhook chama você quando acontece.

✅ **API** é utilizada para fazer uma requisição a outro sistema **de forma ativa**, enviando uma solicitação para um **endpoint (URL)** e recebendo uma resposta no momento da requisição.

✅ **Webhook** é utilizado para **notificar outro sistema automaticamente** (via um **endpoint/URL**) **quando um evento acontece**, sem necessidade de uma requisição prévia.

### API (Application Programming Interface)

🔑 É um conjunto de regras e definições que permite que **um sistema se comunique com outro** em um momento específico.

- Funciona por meio de **requisições e respostas** (geralmente via HTTP).
- O cliente (aplicação que deseja informações) precisa **chamar** a API para **obter dados ou executar** uma ação.

##### 📌 Analogia

**API** é como um restaurante. Você (cliente) pede um prato (requisição) ao garçom e ele traz a comida (resposta).

##### Exemplos práticos de API

- Um sistema externo chamar a nossa API para enviar uma mensagem de texto.
- Um sistema externo consultar nossa API Status da Conexão para verificar o status dentro de nosso sistema.
- Um sistema externo consultar nossa API de mensagens de um protocolo para fazer um resumo do atendimento.

### Webhook

🔑 É um **mecanismo de notificações automáticas** enviadas de um sistema para outro quando um evento acontece.

- Funciona via **requisições HTTP POST** para um endpoint previamente configurado.
- Em vez de o cliente ficar chamando uma API para verificar se há novidades (**polling**), o webhook envia a informação assim que ela estiver disponível.

##### 📌 Analogia

**Webhook** é como uma entrega de pizza. Você faz o pedido e apenas aguarda. Quando a pizza estiver pronta, o entregador vai até sua casa sem você precisar ficar ligando (**polling**) para perguntar.

##### Exemplos práticos de Webhook

- Toda vez que uma mensagem é enviada ou recebida, nosso Webhook dispara um aviso para uma URL externa. O alcance é escolhido por você: tudo o que acontece numa Conexão, só os atendimentos de um Setor, ou um tipo de evento específico.
- Um sistema de cobrança notificar nosso endpoint do Webhook Trigger quando receber um pagamento, iniciando assim um fluxo do Flowbuilder.
- Uma plataforma de cursos notificar nosso endpoint do Webhook Trigger quando o usuário completar uma aula ou módulo.

### Principais Diferenças

| Característica | API | Webhook |
|---|---|---|
| **Definição** | É usada para **buscar ou enviar dados** de forma ativa para outro sistema. | É usada para **receber dados automaticamente** quando um evento ocorre. |
| **Quem inicia?** | O cliente precisa chamar. | O servidor envia automaticamente. |
| **Como?** | O sistema A faz uma requisição para o sistema B e aguarda a resposta. | O sistema B **notifica automaticamente** o sistema A quando algo acontece. |
| **Quando?** | Quando o sistema A solicita (ativa). | Assim que um evento ocorre (passiva). |
| **Exemplo** | Consultar o estado de uma Conexão sempre que o seu sistema precisar saber. | Ser avisado no instante em que uma mensagem chega. |
| **Analogia** | Você liga para uma pizzaria e pede uma pizza. | A pizzaria te liga quando a pizza sai para entrega. |

##### ❔Dúvidas Comuns

**Preciso escolher entre API e Webhook?** Não — a integração completa costuma usar os dois, e é assim que eles foram desenhados. O Webhook avisa que algo aconteceu; a API é como você responde àquilo, etiquetando o atendimento, mandando uma mensagem ou encerrando o Ticket.

**Meu sistema consulta a API de tempos em tempos para ver se algo aconteceu. Tem problema?** Tem, e o nome disso é **polling**: você gasta requisição a cada consulta, descobre a novidade com atraso e ainda corre o risco de perder o que aconteceu entre uma consulta e outra. Esse caso específico é o que o Webhook resolve.
