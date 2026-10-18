# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## O que é

Workspace do **agente de atendimento WhatsApp da Barbearia da Vila** (São Paulo). O agente conversa com os clientes de forma muito humanizada e agenda, reagenda e cancela serviços direto na **Graces**, o sistema de agenda da loja. Toda a documentação é em português.

Estado atual: **ainda não há código**, só documentação de referência. O desenvolvimento será feito de ponta a ponta pela skill `/agente-00c` (cstk), depois que o owner fechar as decisões em aberto. Não presuma o que não está decidido: pergunte.

## Decisões do owner (2026-10-18)

A lista completa, e as pendências, estão em **`docs/decisoes-pre-00c.md`**. O essencial:

- **Roda no n8n, igual ao projeto `/home/projetos/goldincision_licienciados`.** Ele é a referência de arquitetura, deploy, testes e processo; leia o `CLAUDE.md`, `docs/infra.md`, `workflows/README.md` e `docs/constitution.md` de lá antes de projetar. Instância `https://n8n2.todo-tips.com`, na VPS `178.156.134.167` (mexer só na stack `n8n`). Interações com o n8n são feitas pelo **MCP nativo do n8n**.
- **Banco próprio:** `barbearia_vila` (PROD) e `barbearia_vila_teste` (TESTE), no Postgres da stack n8n.
- **Canal:** Chat Master Veloz por **QR Code (Pro)**, **sem API Oficial da Meta**. O token é da empresa, então informe o `whatsappId` em cada chamada. A conexão de teste é a `145` (QR Pro); o `95213-4521` é API Oficial e foi descartado. Funil 5, setor 78 e usuário 100 estão em `docs/decisoes-pre-00c.md`.
- **LLM do atendimento:** OpenAI, modelo **`gpt-5.6-luna`**, com chave própria. A persona assume que é IA, com tom muito humanizado.
- **Graces só funciona em produção.** A chave de `.env.smoke` responde `401` em staging. Os testes rodam em dados reais, **sempre com o barbeiro de teste** (o que tem "TESTE" no nome: `ZZ TESTE INTEGRACAO - NAO AGENDAR`, id `1cee0bb9-e58b-4428-9e9b-1db184db7943`). Ele nunca pode ser oferecido a um cliente. Cancele tudo o que um teste criar.
- **Divergências de serviço, idade e preço: vale a Graces**, não `informacaoes_barbearia.txt`.

## Fontes de referência

- `graces-api/README.md`: API da Graces, com endpoints, divergências entre portal e API real e lacunas. Os fluxos de agendar, reagendar e cancelar estão em `graces-api/05-fluxos-do-agente.md`, e os IDs reais de serviços e barbeiros em `graces-api/06-dados-da-loja.md` (snapshot; em runtime, leia da API).
- `chatmasterveloz-api/README.md`: API do WhatsApp (Chat Master Veloz). Para gerar código, use `endpoints.json`; para atualizar, `python3 -I _tools/sync.py`.
- `alteracoes_clientes/transcricoes.md`: feedback do dono sobre a **versão anterior** do agente. São requisitos de produto:
  - conversa em vez de menus;
  - botão só na mensagem de confirmação;
  - sempre sugerir remarcar quando o cliente pedir cancelamento;
  - entender o contexto ("cancelei, vamos marcar outro");
  - entender áudio;
  - oferecer todos os inícios em que o serviço cabe;
  - não retomar uma coleta antiga num "Oi";
  - não mostrar o barbeiro de teste.
- `informacaoes_barbearia.txt`: endereço, contatos, CNPJ e preços de referência humana (o horário de funcionamento já foi alinhado à Graces).
- Versão anterior (Python/FastAPI, abandonada): repositório `todo-tips-solucoes/agente-barbearia-da-vila`, que só contém briefing e mapas de API. Serve como histórico de decisões, não como base de código.

## Armadilhas da Graces já verificadas

- Base URL: `https://<host>/public/v1`. Em `.env.smoke`, `GRACES_BASE_URL_*` guarda **só o host**.
- Datas no fuso de São Paulo, **sem offset**. O `POST /agenda` usa `data` + `horaInicio` (`HH:mm`); o `PUT` usa `AAAA-MM-DDTHH:mm:ss`.
- `tempoPadrao` vem em minutos inteiros e `dia` vem por extenso (`"Segunda-Feira"`), ao contrário do portal. O `apelido` pode ter espaço no final.
- Use `GET /agenda/horarios-livres` para oferecer horários: a grade já vem calculada.
- Sem webhooks: o estado da agenda só se obtém consultando a API. Erros vêm em ProblemDetails; decida pelo campo `code`.
