# Roadmap: Barbearia da Vila - Agente

**Gerado por**: /agente-00c (modo roadmap)
**Atualizado em**: 2026-10-18

## Ordem sugerida

| # | Feature | Depende de | Descricao (resumo) |
|---|---------|------------|--------------------|
| 1 | `infra-base` | - | Preparar a infraestrutura da barbearia na stack n8n: databases Postgres `barbearia_vila` (PROD) e `barbearia_vila_teste` (TESTE) com usuário próprio e schema (contatos, histórico, mensagens agendadas, handoffs), prefixos Redis distintos por ambiente e o script de deploy dos workflows via API pública do n8n (PUT seguido de publish). Sem alterar outros serviços da VPS; scripts idempotentes. |
| 2 | `recepcao-buffer` | infra-base | Workflow de recepção do webhook do Chat Master Veloz (QR Code Pro) com validação do payload, buffer de 8 s reiniciado a cada nova mensagem e lock por contato no Redis, nos ambientes [TESTE] e [PROD], cada um com path e webhookId próprios. Formato do payload confirmado com eventos reais, nunca suposto. |
| 3 | `agente-conversacional-graces` | recepcao-buffer | Nó AI Agent (OpenAI `gpt-5.6-luna`, credencial própria da barbearia) com sub-workflows ferramenta da Graces: identificar ou cadastrar cliente, listar serviços e barbeiros, consultar horários livres, agendar, reagendar e cancelar. Conversa em vez de menus, uso do contexto da conversa, sugestão de remarcar ao cancelar, não retomar coleta antiga num "Oi", nunca expor o barbeiro de teste, persona que assume ser IA e cadência humana (até 4 mensagens curtas, "digitando…" proporcional, uma pergunta por mensagem, envio pelo Chat Master). |
| 4 | `regras-negocio-agenda` | agente-conversacional-graces | Regras de negócio sobre a agenda da Graces: oferecer todos os inícios em que a duração do serviço cabe, perguntar se usa a sessão do pacote ou paga avulso, nunca oferecer nem agendar serviços "2ª vez", agendar para terceiros (pedir o nome e buscar ou cadastrar a pessoa) e encadear vários serviços com um agendamento por serviço. Tratamento de erro pelo campo `code` e escrita nunca repetida às cegas após timeout. |
| 5 | `audio-imagem` | agente-conversacional-graces | Entrada de áudio (transcrição via OpenAI, tratada como texto) e de imagem (interpretação) no fluxo do agente, com resposta natural quando o conteúdo não for compreendido. |
| 6 | `mensagens-agendadas` | regras-negocio-agenda | Mensagens agendadas pelo módulo de agendamento do Chat Master (`POST/DELETE /api/schedules`): confirmação na véspera às 18:00 com botão Quick Reply cuja resposta vira `POST /agenda/confirmacao` na Graces, lembrete 2 h antes e pós-atendimento 1 h após o término; criadas ao agendar, apagadas ao cancelar e recriadas ao reagendar. Identificadores como `whatsappId` e `userId` obtidos pela API com o token válido. |
| 7 | `crm-etiquetas-handoff` | agente-conversacional-graces | Funil do CRM existente "Funil Agendamento Barbearia" (id 5; raias 25–31) movido conforme a conversa, etiquetas por categoria de serviço, por barbeiro e "Cliente novo", e handoff que transfere para a fila/setor do Chat Master e para de responder. Handoff para o setor 78 "Atendimento Humano" com a etiqueta 521; conexão 145 (QR Pro); ver docs/decisoes-pre-00c.md. |
| 8 | `suite-validacao` | agente-conversacional-graces | Suíte versionada de conversas roteirizadas disparada contra o webhook [TESTE], com LLM avaliadora conferindo tom, regras de negócio e ausência de dado inventado; testes na Graces sempre com o barbeiro de teste, cancelando o que criarem. Deve crescer para cobrir áudio, mensagens agendadas e CRM conforme entram. |
| 9 | `followup` | crm-etiquetas-handoff, suite-validacao | Uma retomada gentil 2 h após a última mensagem, apenas quando o cliente parou no meio de um agendamento, via workflow agendado que respeita a janela de atendimento do canal e não duplica envios. |

## Features

### 1. infra-base

- **short-name**: `infra-base`
- **ordem**: 1
- **depende-de**: -

**Descricao**: Preparar a infraestrutura da barbearia na stack n8n: databases Postgres `barbearia_vila` (PROD) e `barbearia_vila_teste` (TESTE) com usuário próprio e schema (contatos, histórico, mensagens agendadas, handoffs), prefixos Redis distintos por ambiente e o script de deploy dos workflows via API pública do n8n (PUT seguido de publish). Sem alterar outros serviços da VPS; scripts idempotentes.

**Justificativa**: Todas as demais features dependem de estado e deploy; é a base do MVP e é curta.

### 2. recepcao-buffer

- **short-name**: `recepcao-buffer`
- **ordem**: 2
- **depende-de**: infra-base

**Descricao**: Workflow de recepção do webhook do Chat Master Veloz (QR Code Pro) com validação do payload, buffer de 8 s reiniciado a cada nova mensagem e lock por contato no Redis, nos ambientes [TESTE] e [PROD], cada um com path e webhookId próprios. Formato do payload confirmado com eventos reais, nunca suposto.

**Justificativa**: Entrada obrigatória do fluxo; evita respostas duplicadas e concorrência por contato.

### 3. agente-conversacional-graces

- **short-name**: `agente-conversacional-graces`
- **ordem**: 3
- **depende-de**: recepcao-buffer

**Descricao**: Nó AI Agent (OpenAI `gpt-5.6-luna`, credencial própria da barbearia) com sub-workflows ferramenta da Graces: identificar ou cadastrar cliente, listar serviços e barbeiros, consultar horários livres, agendar, reagendar e cancelar. Conversa em vez de menus, uso do contexto da conversa, sugestão de remarcar ao cancelar, não retomar coleta antiga num "Oi", nunca expor o barbeiro de teste, persona que assume ser IA e cadência humana (até 4 mensagens curtas, "digitando…" proporcional, uma pergunta por mensagem, envio pelo Chat Master).

**Justificativa**: É o núcleo do produto e concentra o feedback do dono em alteracoes_clientes; sem ele não há atendimento.

### 4. regras-negocio-agenda

- **short-name**: `regras-negocio-agenda`
- **ordem**: 4
- **depende-de**: agente-conversacional-graces

**Descricao**: Regras de negócio sobre a agenda da Graces: oferecer todos os inícios em que a duração do serviço cabe, perguntar se usa a sessão do pacote ou paga avulso, nunca oferecer nem agendar serviços "2ª vez", agendar para terceiros (pedir o nome e buscar ou cadastrar a pessoa) e encadear vários serviços com um agendamento por serviço. Tratamento de erro pelo campo `code` e escrita nunca repetida às cegas após timeout.

**Justificativa**: Separa as regras de domínio do núcleo conversacional para validá-las isoladamente contra a Graces.

### 5. audio-imagem

- **short-name**: `audio-imagem`
- **ordem**: 5
- **depende-de**: agente-conversacional-graces

**Descricao**: Entrada de áudio (transcrição via OpenAI, tratada como texto) e de imagem (interpretação) no fluxo do agente, com resposta natural quando o conteúdo não for compreendido.

**Justificativa**: Requisito do dono (o agente anterior não entendia áudio); independente das demais features após o núcleo.

### 6. mensagens-agendadas

- **short-name**: `mensagens-agendadas`
- **ordem**: 6
- **depende-de**: regras-negocio-agenda

**Descricao**: Mensagens agendadas pelo módulo de agendamento do Chat Master (`POST/DELETE /api/schedules`): confirmação na véspera às 18:00 com botão Quick Reply cuja resposta vira `POST /agenda/confirmacao` na Graces, lembrete 2 h antes e pós-atendimento 1 h após o término; criadas ao agendar, apagadas ao cancelar e recriadas ao reagendar. Identificadores como `whatsappId` e `userId` obtidos pela API com o token válido.

**Justificativa**: Reduz faltas e é item do MVP; depende do token do canal estar válido para descobrir os identificadores.

### 7. crm-etiquetas-handoff

- **short-name**: `crm-etiquetas-handoff`
- **ordem**: 7
- **depende-de**: agente-conversacional-graces

**Descricao**: Funil do CRM existente "Funil Agendamento Barbearia" (id 5; raias 25–31) movido conforme a conversa, etiquetas por categoria de serviço, por barbeiro e "Cliente novo", e handoff que transfere para a fila/setor do Chat Master e para de responder. Handoff para o setor 78 "Atendimento Humano" com a etiqueta 521; conexão 145 (QR Pro); ver docs/decisoes-pre-00c.md.

**Justificativa**: Fecha o ciclo comercial e a passagem para o humano; independente das mensagens agendadas.

### 8. suite-validacao

- **short-name**: `suite-validacao`
- **ordem**: 8
- **depende-de**: agente-conversacional-graces

**Descricao**: Suíte versionada de conversas roteirizadas disparada contra o webhook [TESTE], com LLM avaliadora conferindo tom, regras de negócio e ausência de dado inventado; testes na Graces sempre com o barbeiro de teste, cancelando o que criarem. Deve crescer para cobrir áudio, mensagens agendadas e CRM conforme entram.

**Justificativa**: É o smoke exigido antes de PROD; entra logo após o núcleo para validar cedo.

### 9. followup

- **short-name**: `followup`
- **ordem**: 9
- **depende-de**: crm-etiquetas-handoff, suite-validacao

**Descricao**: Uma retomada gentil 2 h após a última mensagem, apenas quando o cliente parou no meio de um agendamento, via workflow agendado que respeita a janela de atendimento do canal e não duplica envios.

**Justificativa**: Item do MVP, porém o mais cortável; depende do CRM e da suíte para ser validado com segurança.

