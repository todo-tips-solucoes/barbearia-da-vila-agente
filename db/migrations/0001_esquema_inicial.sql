-- 0001 esquema inicial (data-model.md). Identico em PROD e TESTE; so dados necessarios a operacao (LGPD).
CREATE TABLE IF NOT EXISTS contatos (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  telefone text NOT NULL UNIQUE,
  nome text,
  graces_cliente_id text,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mensagens (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  contato_id bigint NOT NULL REFERENCES contatos(id) ON DELETE CASCADE,
  mensagem_id_canal text UNIQUE,
  direcao text NOT NULL CHECK (direcao IN ('entrada','saida')),
  tipo text NOT NULL DEFAULT 'texto',
  conteudo text,
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS mensagens_contato_criado_idx ON mensagens (contato_id, criado_em);

CREATE TABLE IF NOT EXISTS mensagens_agendadas (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  contato_id bigint NOT NULL REFERENCES contatos(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('confirmacao','lembrete','pos_atendimento')),
  previsto_para timestamptz NOT NULL,
  graces_agendamento_id text NOT NULL,
  agendamento_canal_id text,
  situacao text NOT NULL DEFAULT 'pendente' CHECK (situacao IN ('pendente','enviada','cancelada')),
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (graces_agendamento_id, tipo)
);
CREATE INDEX IF NOT EXISTS mensagens_agendadas_situacao_previsto_idx ON mensagens_agendadas (situacao, previsto_para);

CREATE TABLE IF NOT EXISTS handoffs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  contato_id bigint NOT NULL REFERENCES contatos(id) ON DELETE CASCADE,
  motivo text NOT NULL,
  situacao text NOT NULL DEFAULT 'aberto' CHECK (situacao IN ('aberto','encerrado')),
  iniciado_em timestamptz NOT NULL DEFAULT now(),
  encerrado_em timestamptz,
  CHECK ((situacao = 'aberto') = (encerrado_em IS NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS handoffs_aberto_unico_idx ON handoffs (contato_id) WHERE situacao = 'aberto';

CREATE TABLE IF NOT EXISTS schema_migrations (
  versao text PRIMARY KEY,
  nome text NOT NULL,
  sha256 text NOT NULL,
  aplicada_em timestamptz NOT NULL DEFAULT now()
);
