# Project Briefing: Barbearia da Vila - Agente

**Data**: 2026-10-18
**Status**: Draft
**Versao**: 1.0

> Briefing gerado em modo autônomo a partir de fontes já fechadas: `docs/decisoes-pre-00c.md`, `CLAUDE.md`, `docs/project-context.md`, `docs/constitution.md`, `cockpit.config`, `alteracoes_clientes/transcricoes.md`, `graces-api/`, `chatmasterveloz-api/`, `informacaoes_barbearia.txt` e o projeto de referência `goldincision_licienciados`. Marcação `[fornecido]` = decisão explícita nessas fontes; `[inferido]` = dedução; o que não consta está em "Itens a Definir".

---

## 1. Visao e Proposito

**O que é** [fornecido]: o agente de atendimento WhatsApp da Barbearia da Vila (Vila Mascote, São Paulo). Conversa de forma muito humanizada e agenda, reagenda e cancela serviços direto na Graces, o sistema de agenda da loja.

**Problema que resolve** [fornecido]: a versão anterior (Python/FastAPI, abandonada) soava como chatbot: menus em vez de conversa, perdia o contexto ("cancelei, vamos marcar outro"), não entendia áudio, retomava coletas antigas num "Oi" e oferecia poucos horários. O dono relatou que os clientes não gostam de chatbot.

**Proposta de valor** [inferido]: atendimento 24 h que parece conversa com uma pessoa atenciosa, reduz faltas (confirmação e lembretes) e preenche a agenda.

**Identidade** [fornecido]: o agente **assume que é IA** (assistente virtual da Barbearia da Vila), com tom muito humanizado.

## 2. Usuarios e Stakeholders

| Ator | Papel | Ações principais |
|------|-------|-----------------|
| Cliente da barbearia | Quem agenda | Conversa por WhatsApp (texto, áudio, imagem); agenda, reagenda, cancela, confirma presença; pode agendar para terceiros (filho, amigo) |
| Agente de atendimento | Atendente automatizado | Identifica o cliente, conduz a conversa, consulta a Graces, escreve na agenda, aplica etiquetas e funil, transfere para humano |
| Atendente humano | Fila/setor do Chat Master | Assume o ticket após o handoff |
| Dono da barbearia | Fonte do feedback de produto | Testa e pede ajustes (`alteracoes_clientes/transcricoes.md`) |
| Owner técnico (paulo@todo-tips.com) | Dono do projeto | Aprova PRs, deploy em PROD e decisões (autonomia limitada) |

## 3. Escopo

### MVP (Essencial) [fornecido]

1. Infra: banco `barbearia_vila` / `barbearia_vila_teste`, prefixos Redis distintos por ambiente, script de deploy via API pública do n8n.
2. Recepção do webhook do Chat Master, com buffer de 8 s para juntar rajadas e lock por contato.
3. Agente (nó AI Agent, `gpt-5.6-luna`) com ferramentas Graces: identificar/cadastrar cliente, serviços, barbeiros, horários livres, agendar, reagendar, cancelar, pacotes. Conversa em vez de menus; contexto da conversa; sugerir remarcar ao cancelar; oferecer todos os inícios em que o serviço cabe; não retomar coleta antiga num "Oi"; nunca expor o barbeiro de teste.
4. Cadência humana: até 4 mensagens curtas, "digitando…" proporcional, uma pergunta por mensagem.
5. Áudio (transcrição) e imagem (interpretação) de entrada.
6. Regras de negócio: pacotes (perguntar se usa a sessão ou paga avulso), serviços "2ª vez" nunca oferecidos, agendamento para terceiros, vários serviços encadeados (um agendamento por serviço).
7. Mensagens agendadas pelo módulo de agendamento do Chat Master (`POST/DELETE /api/schedules`): confirmação na véspera às 18:00 com botão Quick Reply (resposta vira `POST /agenda/confirmacao`), lembrete 2 h antes, pós-atendimento 1 h depois do término; apagadas ao cancelar e recriadas ao reagendar.
8. CRM e etiquetas: funil existente "Funil Agendamento Barbearia" (id 5): Novo Contato → Em Atendimento → Agendado → Confirmação → Atendido (laterais Cancelado, Não compareceu); handoff por setor 78 + etiqueta 521; etiquetas por categoria de serviço, por barbeiro e "Cliente novo".
9. Handoff: transferir para fila/setor do Chat Master e parar de responder.
10. Follow-up: 1 retomada gentil 2 h após a última mensagem, só se o cliente parou no meio de um agendamento.
11. Suíte de validação: conversas roteirizadas contra o webhook de TESTE, com LLM avaliadora.

### Pos-MVP (Desejavel)

- A definir (nenhum item pós-MVP fornecido).

### Fora de Escopo [fornecido]

- API Oficial da Meta (decisão revista: QR Code Pro).
- Reaproveitar código da versão anterior (serve só como histórico).
- Alterações em outros serviços da VPS e em outras stacks além da `n8n`.
- Push, PR e PROD pelo agente-00c: só com aprovação do owner.

## 4. Prioridades e Trade-offs

**Ordem de prioridade** [inferido]: correção dos dados da agenda (nunca oferecer horário que não veio da Graces) > naturalidade da conversa > cobertura de recursos (CRM, lembretes) > velocidade.

**Decisões explícitas** [fornecido]: a Graces é a fonte da verdade (inclusive faixas de idade e preços, não `informacaoes_barbearia.txt`); botão só na confirmação; o agente nunca agenda com o barbeiro de teste.

## 5. Restricoes

| Restrição | Valor | Notas |
|-----------|-------|-------|
| Prazo | a definir | não informado |
| Equipe | owner + agente-00c/rito-dev | [inferido] |
| Budget | a definir | custo OpenAI não estimado |
| Técnica | stack n8n compartilhada na VPS `178.156.134.167`; mexer só na stack `n8n` | [fornecido] |
| Graces | chave só funciona em produção (staging responde 401); testes em dados reais, sempre com o barbeiro de teste, e cancelando o que criarem | [fornecido] |
| Autonomia | deploy só no TESTE; push, PR e PROD só com aprovação | [fornecido] |
| Tier de entrega | cloud-public | [fornecido] |

## 6. Stack Tecnica

| Camada | Tecnologia | Justificativa |
|--------|-----------|---------------|
| Orquestração | n8n em `https://n8n2.todo-tips.com`, workflows JSON em `workflows/` (`[TESTE]` e `[PROD]`, path e webhookId próprios por ambiente); deploy via API pública; MCP nativo do n8n | igual ao projeto Gold [fornecido] |
| Agente | nó AI Agent + sub-workflows como ferramentas | [fornecido] |
| LLM | OpenAI `gpt-5.6-luna`, chave própria da barbearia (credencial n8n separada); transcrição `whisper-1` disponível | [fornecido] |
| Banco | Postgres da stack n8n: `barbearia_vila` (PROD) e `barbearia_vila_teste` (TESTE) | [fornecido] |
| Cache/estado | Redis da stack n8n, prefixos distintos por ambiente | [fornecido] |
| Agenda | Graces API pública `https://api.gracesonline.com.br/public/v1`, header `X-Api-Key` | [fornecido] |
| Canal | Chat Master Veloz, biblioteca QR Code Pro (tem "digitando…" e Quick Reply), `https://api.chatmasterveloz.com/api/...` | [fornecido] |
| Ciclo | GitHub privado `todo-tips-solucoes/barbearia-da-vila-agente`, `develop`/`main`, CI e rito do cockpit | [fornecido] |

## 7. Qualidade e Padroes

- Constituição do cockpit (`docs/constitution.md`) a ser estendida com princípios próprios [fornecido].
- Validação estática só no CI (Princípio III ligado); português do Brasil; Conventional Commits.
- Suíte de conversas roteirizadas contra o webhook de TESTE é o smoke antes de PROD [inferido, como no Gold].
- Segredos só em credenciais do n8n e `.env`/`.env.smoke` fora do repositório [fornecido].
- Dados de clientes (nome, telefone, histórico) sob LGPD [inferido]; requisitos específicos a definir.
- Erros da Graces tratados pelo campo `code`; escrita nunca repetida às cegas após timeout [fornecido em `graces-api/05`].

## 8. Visao de Futuro

**6 meses**: a definir. **12 meses**: a definir.

**Riscos conhecidos**:
- Conexão de TESTE (145, QR Pro) é a conexão padrão da empresa no Chat Master: testes devem enviar só para contatos de teste.
- Testes em produção da Graces: risco de poluir a agenda real (mitigado pelo barbeiro de teste e limpeza).
- Lacunas da API Graces: idempotência do `POST /agenda`, significado de prazos 0, rate limit.
- Payloads de webhook do Chat Master mudam entre versões; validar com eventos reais.
- Recursos compartilhados na VPS (Postgres, Redis, n8n) exigem isolamento rigoroso.

---

## Itens a Definir

| Item | Dimensão | Impacto |
|------|----------|---------|
| Número e token da conexão de PROD | Integração | Alto |
| Requisitos LGPD (retenção, consentimento, exclusão) | Qualidade | Médio |
| Orçamento e custo OpenAI | Restrições | Médio |
| Prazo e métricas de sucesso | Escopo | Médio |
| Visão pós-MVP | Futuro | Baixo |

---

**Proximo passo recomendado**: `/constitution` para estender a constituição com princípios próprios.
