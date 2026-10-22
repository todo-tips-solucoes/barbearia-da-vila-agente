-- 0003 registro de falhas da recepcao (FR-025/FR-007): so codigos e ids, nunca telefone, texto ou token. Idempotente.
CREATE TABLE IF NOT EXISTS falhas_recepcao (
  id          bigserial PRIMARY KEY,
  tipo        text NOT NULL CHECK (tipo IN ('redis_indisponivel','payload_invalido','entrega')),
  motivo      text NOT NULL,
  contato_id  bigint REFERENCES contatos(id) ON DELETE SET NULL,
  ocorrida_em timestamptz NOT NULL DEFAULT now()
);
