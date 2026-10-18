---
title: "Qual Webhook Usar"
slug: qual-webhook-usar
category: "Webhooks"
source: https://clihelper.chatmasterveloz.com/docs/qual-webhook-usar
fetched: 2026-10-14
---
# Qual Webhook Usar

> Fonte: <https://clihelper.chatmasterveloz.com/docs/qual-webhook-usar> · [Voltar ao índice](../README.md)

🧩 Você já decidiu que quer avisar o seu sistema quando algo acontecer por aqui. Falta escolher **qual** webhook ligar.

São três saídas, e o que separa uma da outra é o **alcance**.

➡️ **Pela Conexão** — avisa tudo o que acontece naquela Conexão: mensagem recebida, mensagem enviada, tag alterada no Ticket e Ticket aberto ou encerrado. É o mais amplo, e a escolha natural de quem quer espelhar a conversa inteira em outro sistema.

➡️ **Pelo Setor** — avisa os mesmos quatro eventos, mas só dos Tickets que estão naquele Setor. É de quem se interessa por uma parte do atendimento: a triagem, o time de vendas, o financeiro.

➡️ **Por evento** — cobre mensagem interna, alteração de tag, mudança de status do usuário e movimentação no CRM. Três desses só existem aqui: **mensagem interna**, **status do usuário** e **CRM**. Se é um deles que você precisa, não adianta ligar os outros dois.

⚠️ **Conexão e Setor ligados ao mesmo tempo disparam os dois.** A regra é: quando o Ticket **não** está no Setor escolhido, sai só o aviso da Conexão; quando está, saem os dois. Se o seu sistema está processando a mesma mensagem duas vezes, é quase sempre isto.

### O sentido contrário

O **Webhook Trigger** não avisa ninguém — ele é um endereço nosso que o **seu** sistema chama. Um pagamento aprovado, um lead cadastrado no site: a chamada chega aqui e inicia um fluxo de conversa.

##### ❔Dúvidas Comuns

**Preciso escolher um só?** Não. Os três podem ficar ligados ao mesmo tempo, cada um apontando para um endereço diferente do seu sistema. O cuidado é com Conexão e Setor, que se sobrepõem.
