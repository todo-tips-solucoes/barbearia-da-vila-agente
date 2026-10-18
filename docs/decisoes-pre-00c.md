# Decisões do owner antes do `/agente-00c` (2026-10-18)

Insumo do briefing e da constituição. Tudo aqui foi respondido pelo owner nesta data; o que não está aqui **não foi decidido**.

## Infraestrutura

| Tema | Decisão |
|---|---|
| Referência | Rodar **igual ao `goldincision_licienciados`**: nó AI Agent do n8n + sub-workflows, Postgres e Redis da stack n8n, deploy pela API pública do n8n, MCP nativo do n8n. |
| Instância n8n | `https://n8n2.todo-tips.com` (a mesma do Gold). |
| Servidor | Tudo na VPS do n8n2, `178.156.134.167`; acesso SSH com a mesma chave do Gold (`/root/.ssh/id_ed25519_n8n_vps`, root). *O `srv1726158`/`2.25.163.213` citado antes foi descartado pelo owner.* Mexer só na stack `n8n`. |
| Banco | Postgres próprio na stack n8n: database e dono **`barbearia_vila`** (PROD) e **`barbearia_vila_teste`** (TESTE). |
| Ambientes | Igual ao Gold: workflows `[TESTE]` e `[PROD]` na mesma instância, banco `_teste` separado e prefixos Redis distintos. **Novidade:** cada ambiente tem path e webhookId próprios (corrige a pendência do Gold). |

## Canal (Chat Master Veloz)

| Tema | Decisão |
|---|---|
| Biblioteca | **QR Code, Pro.** *Não usar a API Oficial da Meta* (decisão revista na mesma sessão). Tem "digitando…" e botão Quick Reply. |
| Número de TESTE | `55 11 95213-4521` (já tem um webhook, que pode ser trocado). |
| Número de PROD | Ainda não informado. |
| Token | `CHATMASTER_TOKEN_TESTE` em `/home/projetos/barbearia_da_villa/.env.smoke` (o owner vai incluir). |
| Entrada | Texto, **áudio** (transcrição) e **imagem** (interpretação). |
| Handoff | Transferir para fila/setor do Chat Master e parar de responder. *Setor a descobrir via API.* |

## Agente

| Tema | Decisão |
|---|---|
| LLM | OpenAI **`gpt-5.6-luna`**, com **chave própria da barbearia** (credencial n8n separada da do Gold). |
| Persona | **Assume que é IA** (assistente virtual da Barbearia da Vila), com tom muito humanizado. |
| Cadência | Igual ao Gold, mais "digitando": buffer de 8 s para juntar rajadas, até 4 mensagens curtas, "digitando…" proporcional entre elas, uma pergunta por mensagem. |
| Feedback do dono | `alteracoes_clientes/transcricoes.md` é requisito: conversa em vez de menus, botão só na confirmação, sugerir remarcar ao cancelar, contexto da conversa, áudio, todos os inícios em que o serviço cabe, não retomar coleta antiga, esconder o barbeiro de teste. |

## Regras de negócio

| Tema | Decisão |
|---|---|
| Fonte da verdade | **Graces**, inclusive para faixas de idade e preços (não `informacaoes_barbearia.txt`). |
| Testes | Só em produção da Graces, **sempre com o barbeiro de teste** (o que tem "TESTE" no nome). |
| Pacotes | **Perguntar antes** se quer usar a sessão do pacote ou pagar avulso. |
| Serviços "2º vez" | **Nunca** oferecer nem agendar. |
| Terceiros | **Permitido** agendar para outra pessoa (filho, amigo): pedir o nome e buscar ou cadastrar a pessoa na Graces. |
| Vários serviços | **Permitido**: um agendamento por serviço, com horários encadeados. |
| Follow-up | **No MVP**: 1 retomada gentil 2 h depois da última mensagem, só se o cliente parou no meio de um agendamento. |

## Mensagens agendadas (módulo de agendamento do Chat Master, `POST/DELETE /api/schedules`)

Criadas ao agendar na Graces; apagadas ao cancelar e recriadas ao reagendar.

| Mensagem | Quando |
|---|---|
| Confirmação (com botão Quick Reply) | Véspera, às 18:00. A resposta vira `POST /agenda/confirmacao` na Graces. |
| Lembrete | 2 h antes do horário. |
| Pós-atendimento | 1 h depois do término. |

## CRM e etiquetas (Chat Master)

| Tema | Decisão |
|---|---|
| Funil | Raias: Novo contato → Em atendimento → Agendado → Confirmado → Atendido; laterais: Cancelado, Não compareceu, Humano. Criar via API se existir; senão, o owner cria. |
| Etiquetas | Por **categoria de serviço** (Corte, Barba, Combo, Estética, Depilação), por **barbeiro** e **Cliente novo** (cadastrado pelo agente). |

## Processo

| Tema | Decisão |
|---|---|
| Repositório | Novo, **privado**: `todo-tips-solucoes/barbearia-da-vila-agente`, com `develop`/`main`, CI e rito do cockpit (`configurar.sh`). |
| Pipeline | `/agente-00c` de ponta a ponta. |
| Autonomia | Igual ao Gold: o 00c implementa, valida, faz deploy **só no TESTE** e roda a suíte. Push, PR e PROD só com aprovação do owner. |
| Credenciais | n8n API: reusar o `.env.n8n` do Gold. Graces: `GRACES_API_KEY` vira credencial Header Auth no n8n. OpenAI: chave nova, ainda pendente. |

## Pendências (bloqueiam partes da pipeline)

1. `CHATMASTER_TOKEN_TESTE` e `OPENAI_API_KEY` no `.env.smoke`.
2. Número e token da conexão de **PROD**.
3. A descobrir com o token: `whatsappId`, `userId` (obrigatório em `/api/schedules`), setor do handoff, se existe API de criar funil.
