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
| Conexão de TESTE | **`whatsappId` 145**, "Atendimento Chat Master Veloz", canal `whatsapp_whatsmeow_pro` (QR Pro). É a conexão padrão da empresa no Chat Master. *Revisto em 2026-10-18: o `55 11 95213-4521` é a conexão 138, API Oficial Meta (`whatsapp_meta`), e por isso foi descartado para o teste.* |
| Número de PROD | Ainda não informado. |
| Token | `CHATMASTER_TOKEN_TESTE` em `.env.smoke`. É **token da empresa** (lista as 8 conexões), então toda chamada precisa informar a conexão (`whatsappId`). Validado em 2026-10-18 (`POST /api/whatsapp-status` → 200). |
| Entrada | Texto, **áudio** (transcrição) e **imagem** (interpretação). |
| Handoff | Transferir para o setor **78 "Atendimento Humano"** e parar de responder. Já existe a etiqueta **521 "BARBEARIA - AGUARDANDO ATENDENTE"**. |
| Usuário das mensagens agendadas | **`userId` 100, "Agente IA"** (campo obrigatório de `POST /api/schedules`). |

## Agente

| Tema | Decisão |
|---|---|
| LLM | OpenAI **`gpt-5.6-luna`**, com **chave própria da barbearia** (credencial n8n separada da do Gold). |
| Persona | **Assume que é IA** (assistente virtual da Barbearia da Vila), com tom muito humanizado. |
| Cadência | Igual ao Gold, mais "digitando": buffer de 8 s para juntar rajadas, até 4 mensagens curtas, "digitando…" proporcional entre elas, uma pergunta por mensagem. |
| Múltipla escolha | **Sempre botão de lista** (mensagem de lista da biblioteca Pro) quando o agente oferecer opções: horários, barbeiros, serviços, pacote ou avulso etc. Decisão do owner em 2026-10-18; **prevalece** sobre "conversa em vez de menus" e "botão só na confirmação" do feedback abaixo. A confirmação de presença continua com botão Quick Reply. Se o cliente responder escrevendo em vez de tocar, o agente entende a resposta do mesmo jeito. |
| Feedback do dono | `alteracoes_clientes/transcricoes.md` é requisito, exceto onde a linha acima prevalece: sugerir remarcar ao cancelar, contexto da conversa, áudio, todos os inícios em que o serviço cabe, não retomar coleta antiga, esconder o barbeiro de teste. |

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
| Funil | **Usar o funil já existente "Funil Agendamento Barbearia" (id 5)**, por decisão do owner em 2026-10-18. Raias: 25 Novo Contato → 26 Em Atendimento → 27 Agendado → 28 Confirmação → 29 Atendido (WON); 30 Cancelado e 31 Não compareceu (LOST). Não há raia "Humano": o handoff é marcado por etiqueta e setor. |
| Etiquetas | Por **categoria de serviço** (Corte, Barba, Combo, Estética, Depilação), por **barbeiro** e **Cliente novo** (cadastrado pelo agente). |

## Processo

| Tema | Decisão |
|---|---|
| Repositório | Novo, **privado**: `todo-tips-solucoes/barbearia-da-vila-agente`, com `develop`/`main`, CI e rito do cockpit (`configurar.sh`). |
| Pipeline | `/agente-00c` de ponta a ponta. |
| Autonomia | Igual ao Gold: o 00c implementa, valida, faz deploy **só no TESTE** e roda a suíte. Push, PR e PROD só com aprovação do owner. |
| Credenciais | n8n API: reusar o `.env.n8n` do Gold. Graces: `GRACES_API_KEY` vira credencial Header Auth no n8n. OpenAI: chave nova, ainda pendente. |

## Pendências (bloqueiam partes da pipeline)

1. ~~`CHATMASTER_TOKEN_TESTE` e `OPENAI_API_KEY` no `.env.smoke`~~ — incluídos em 2026-10-18.
   - `OPENAI_API_KEY`: **válida**; `gpt-5.6-luna` e `whisper-1` disponíveis (`GET /v1/models/gpt-5.6-luna` → 200).
   - `CHATMASTER_TOKEN_TESTE`: **recusado** pela API. `POST /api/whatsapp-status` (a chamada indicada pela documentação para testar) → `401 {"error":"Acesso não permitido"}`; `GET` → `403 "Expired Session - New token generated!"`; `/api/company/queues|users`, `/api/tags` e `/api/crm/v2/funis` → 401. O token tem 40 caracteres alfanuméricos, sem espaços nem aspas. Causas possíveis, segundo `chatmasterveloz-api/00-introducao/pre-requisitos-apis.md`: o token da conexão foi regenerado, ou a **API Externa** não está habilitada no plano. **Resolvido em 2026-10-18:** o owner atualizou o token, e ele foi validado (ver tabela Canal).
2. Número e conexão de **PROD**: **adiado** por decisão do owner (2026-10-18). Cada feature entrega o TESTE completo e deixa PROD parametrizado (`whatsappId`, path/webhookId de PROD) até a conexão existir. Isso não bloqueia nenhuma feature.
4. **Captura de payload real (owner, 2026-10-18):** autorizado **trocar temporariamente o webhook da conexão 145** para o webhook de captura no n8n TESTE. Antes da troca, registrar a URL atual; ao final da captura, restaurá-la. Nunca versionar dados pessoais dos eventos.
3. ~~A descobrir: `whatsappId`, `userId`, setor do handoff, funil~~: resolvido (conexão 145, usuário 100, setor 78, funil 5).

## Decisões durante a execução (2026-10-18)

| Tema | Decisão do owner |
|---|---|
| Merge em `develop` | **Automático** quando CI e commitlint passarem (o `aprovacao-de-dono` falha porque o autor do PR é a própria conta CODEOWNER). Promoção para `main`/PROD continua **só com aprovação explícita**. |
| Retenção (CHK026) | **Confirmada:** mídia recebida fica guardada por 24 h; eventos brutos são apagados depois de virar fixtures. |
| Duplicadas de texto (dec-031) | **Dedupe por conteúdo:** descartar a mensagem igual (mesmo contato e mesmo texto) recebida em até ~10 s. Risco aceito: um "ok" repetido de propósito pode ser descartado. |
| Robustez da recepção | **Corrigir antes da feature 3:** (a) não responder 200 antes de gravar no Postgres, ou alertar a falha; (b) Redis indisponível não pode travar o nó e precisa registrar a falha em `falhas_recepcao`. |
