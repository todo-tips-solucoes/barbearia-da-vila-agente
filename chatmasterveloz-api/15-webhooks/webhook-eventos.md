---
title: "Webhook Eventos"
slug: webhook-eventos
category: "Webhooks"
source: https://clihelper.chatmasterveloz.com/docs/webhook-eventos
fetched: 2026-10-14
---
# Webhook Eventos

> Fonte: <https://clihelper.chatmasterveloz.com/docs/webhook-eventos> · [Voltar ao índice](../README.md)

🧩 Os **Webhooks de Eventos** avisam o seu sistema quando acontece algum evento específico.

São quatro avisos independentes, cada um com o seu próprio endereço — você liga só o que for usar.

### Onde ligar

Acesse o menu **Configurações → Opções** e localize a seção **Webhooks | Eventos**. Lá existe um campo para cada tipo:

◽ **Eventos de Mensagens Internas** — quando alguém escreve uma mensagem interna num atendimento.

◽ **Eventos de TAG** — quando as tags de um atendimento mudam.

◽ **Eventos de Usuários** — quando alguém da equipe muda de status.

◽ **Eventos de CRM** — quando uma oportunidade é mexida.

⚠️ **Esses avisos carregam dado sensível.** O de usuário inclui o e-mail, o telefone e o hash da senha da pessoa; o de tag inclui o token da Conexão e os dados do contato. Aponte apenas para endereços seus, sob HTTPS, e nunca para um serviço de terceiro que você não controla.

##### ❔Dúvidas Comuns

**Como o meu sistema distingue um aviso do outro?** Pelo campo `acao`, dentro de `body`. Cada tipo traz um valor próprio, e é a primeira coisa que a sua integração deve ler.

**Posso mandar os quatro para o mesmo endereço?** Pode — basta repetir a mesma URL nos quatro campos. O `acao` continua separando os avisos do outro lado.
