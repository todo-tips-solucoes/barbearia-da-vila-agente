# Data Model: infra-base

**Feature**: `infra-base` | **Date**: 2026-10-18 | **Spec**: [spec.md](./spec.md)

Esquema idêntico em `barbearia_vila` (PROD) e `barbearia_vila_teste` (TESTE), aplicado por
`scripts/migrar.py` a partir de `db/migrations/0001_esquema_inicial.sql`. Convenção: nomes em
português, `snake_case`, `timestamptz`, ids `bigint GENERATED ALWAYS AS IDENTITY` (padrão do Gold).
Identificadores externos (Graces, Chat Master) são `text`: o formato vem da API em runtime e não é
suposto aqui. Só dados necessários à operação (Princípio XIV / LGPD).

## Entity: contatos

| Campo | Tipo | Regras |
|-------|------|--------|
| id | bigint identity | PK |
| telefone | text | NOT NULL, UNIQUE — número no canal |
| nome | text | opcional, informado pelo cliente |
| graces_cliente_id | text | opcional — `idCliente` da Graces quando vinculado |
| criado_em / atualizado_em | timestamptz | NOT NULL DEFAULT now() |

Sem e-mail, documento, data de nascimento ou endereço.

## Entity: mensagens (histórico)

| Campo | Tipo | Regras |
|-------|------|--------|
| id | bigint identity | PK |
| contato_id | bigint | FK `contatos(id)` ON DELETE CASCADE |
| mensagem_id_canal | text | UNIQUE — id da mensagem no Chat Master (idempotência); campo de origem definido em `recepcao-buffer` |
| direcao | text | CHECK IN ('entrada','saida') |
| tipo | text | NOT NULL DEFAULT 'texto' (outros valores entram com `audio-imagem`) |
| conteudo | text | texto da mensagem (ou transcrição) |
| criado_em | timestamptz | NOT NULL DEFAULT now() |

Índice `(contato_id, criado_em)`. Retenção do histórico: `[PENDENTE-OWNER]` (research P7).

## Entity: mensagens_agendadas

| Campo | Tipo | Regras |
|-------|------|--------|
| id | bigint identity | PK |
| contato_id | bigint | FK `contatos(id)` ON DELETE CASCADE |
| tipo | text | CHECK IN ('confirmacao','lembrete','pos_atendimento') |
| previsto_para | timestamptz | NOT NULL |
| graces_agendamento_id | text | NOT NULL — referência ao agendamento na Graces |
| agendamento_canal_id | text | opcional — id do agendamento criado no Chat Master (`/api/schedules`) |
| situacao | text | CHECK IN ('pendente','enviada','cancelada'), DEFAULT 'pendente' |
| criado_em / atualizado_em | timestamptz | NOT NULL DEFAULT now() |

UNIQUE `(graces_agendamento_id, tipo)` — evita duplicar a mesma mensagem ao reagendar/reprocessar.
Índice `(situacao, previsto_para)`.

**State transitions**: `pendente → enviada`; `pendente → cancelada`. `enviada` e `cancelada` são finais
(reagendar cria/atualiza a linha `pendente` correspondente; regra detalhada em `mensagens-agendadas`).

## Entity: handoffs

| Campo | Tipo | Regras |
|-------|------|--------|
| id | bigint identity | PK |
| contato_id | bigint | FK `contatos(id)` ON DELETE CASCADE |
| motivo | text | NOT NULL |
| situacao | text | CHECK IN ('aberto','encerrado'), DEFAULT 'aberto' |
| iniciado_em | timestamptz | NOT NULL DEFAULT now() |
| encerrado_em | timestamptz | NULL enquanto aberto; CHECK (situacao='aberto') = (encerrado_em IS NULL) |

Índice único parcial `(contato_id) WHERE situacao='aberto'` — no máximo um handoff aberto por contato
(enquanto aberto, o agente não responde).

**State transitions**: `aberto → encerrado` (preenche `encerrado_em`).

## Entity: schema_migrations

| Campo | Tipo | Regras |
|-------|------|--------|
| versao | text | PK (`0001`) |
| nome | text | NOT NULL |
| sha256 | text | NOT NULL — hash do arquivo aplicado |
| aplicada_em | timestamptz | NOT NULL DEFAULT now() |

## Entity: configuração de ambiente (arquivo, não tabela)

`config/ambientes/integracao.json` e `config/ambientes/producao.json` — contrato em
[contracts/config-ambiente.md](./contracts/config-ambiente.md).

## Relacionamentos

`contatos 1—N mensagens`, `contatos 1—N mensagens_agendadas`, `contatos 1—N handoffs` (≤1 aberto).
