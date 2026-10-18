---
title: "Pré-Requisitos das APIs"
slug: pre-requisitos-apis
category: "Introdução"
source: https://clihelper.chatmasterveloz.com/docs/pre-requisitos-apis
fetched: 2026-10-14
---
# Pré-Requisitos das APIs

> Fonte: <https://clihelper.chatmasterveloz.com/docs/pre-requisitos-apis> · [Voltar ao índice](../README.md)

🧩 Antes da primeira chamada de API funcionar, duas coisas precisam estar no lugar:

### 1. O Token

O token é a credencial da chamada, e existem dois.

➡️ **Token da Conexão** — ao recebê-lo, a plataforma já sabe por qual Conexão a mensagem deve sair. Defina no menu **Conexões → editar a Conexão → aba Integrações → Token**, e repita para cada Conexão que a integração for usar.

➡️ **Token da Empresa** — um só, válido para a empresa inteira, que vale nas mesmas APIs. Como ele não carrega a Conexão, é obrigatório informar a Conexão em cada chamada. Configure no menu **Configurações → Token da Empresa**.

### 2. A API Externa habilitada no seu Plano

A **API Externa** é a opção que abre os endereços da API para a sua empresa.

➡️ Entre em contato com o Suporte do Chat Master Veloz e peça a habilitação da **API Externa**.

### Como conferir que ficou pronto

A chamada de **Status da Conexão** é a mais simples para testar, porque exige só o token e devolve o estado atual da Conexão.

Se vier resposta, os dois pré-requisitos estão cumpridos e a integração pode seguir.

##### ❔Dúvidas Comuns

**Onde eu vejo o endereço das APIs?** Todas partem do endereço da sua instalação, no formato `https://api.chatmasterveloz.com/api/...`. O artigo de cada chamada traz o caminho completo que vem depois disso.

**A minha integração precisa de algo a mais na API Oficial?** Os dois pré-requisitos são os mesmos. O que muda é a lista de chamadas disponíveis: nem toda chamada existe em todas as bibliotecas, e a **Oficial** tem um conjunto próprio.

**Mudei de Conexão e a integração parou.** O token da Conexão acompanha a Conexão. Se ela foi excluída e recriada, o token mudou, e o valor antigo passa a ser recusado — atualize o token no seu sistema.
