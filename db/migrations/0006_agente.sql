-- 0006 agente conversacional (agente-conversacional-graces): turnos, conversas, propostas, falhas_agente. Sem token, payload bruto ou PII. Idempotente.
CREATE TABLE IF NOT EXISTS turnos (
  turno_id uuid PRIMARY KEY,
  contato_id bigint NOT NULL REFERENCES contatos(id) ON DELETE CASCADE,
  estado text NOT NULL DEFAULT 'em_andamento' CHECK (estado IN ('em_andamento','concluido','falhou')),
  iniciado_em timestamptz NOT NULL DEFAULT now(),
  concluido_em timestamptz,
  CHECK ((estado = 'em_andamento') = (concluido_em IS NULL))
);
CREATE INDEX IF NOT EXISTS turnos_contato_iniciado_idx ON turnos (contato_id, iniciado_em);

CREATE TABLE IF NOT EXISTS conversas (
  contato_id bigint PRIMARY KEY REFERENCES contatos(id) ON DELETE CASCADE,
  sessao_iniciada_em timestamptz NOT NULL DEFAULT now(),
  ultima_entrada_em timestamptz,
  pedido jsonb NOT NULL DEFAULT '{}'::jsonb,
  opcoes jsonb NOT NULL DEFAULT '{}'::jsonb,
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS propostas (
  id uuid PRIMARY KEY,
  contato_id bigint NOT NULL REFERENCES contatos(id) ON DELETE CASCADE,
  turno_id uuid NOT NULL,
  acao text NOT NULL CHECK (acao IN ('agendar','reagendar','cancelar','trocar_servico')),
  dados jsonb NOT NULL DEFAULT '{}'::jsonb,
  estado text NOT NULL DEFAULT 'pendente' CHECK (estado IN ('pendente','executando','executada','incerta','falhou','substituida','expirada')),
  resultado jsonb NOT NULL DEFAULT '{}'::jsonb,
  criada_em timestamptz NOT NULL DEFAULT now(),
  atualizada_em timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS propostas_pendente_unica_idx ON propostas (contato_id) WHERE estado = 'pendente';
CREATE INDEX IF NOT EXISTS propostas_estado_idx ON propostas (estado, atualizada_em);

CREATE TABLE IF NOT EXISTS falhas_agente (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tipo text NOT NULL CHECK (tipo IN ('graces','chatmaster','agente','turno')),
  motivo text NOT NULL,
  operacao text,
  code text,
  status_http int,
  trace_id text,
  contato_id bigint REFERENCES contatos(id) ON DELETE CASCADE,
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS falhas_agente_criado_idx ON falhas_agente (criado_em);
