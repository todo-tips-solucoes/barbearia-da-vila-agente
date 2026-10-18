-- 0005 tentativas em curso da recepcao (block-003/dec-025): o bv-vigia registra em falhas_recepcao as que estouraram o executionTimeout. Sem PII. Idempotente.
CREATE TABLE IF NOT EXISTS tentativas_recepcao (
  mensagem_id bigint PRIMARY KEY REFERENCES mensagens(id) ON DELETE CASCADE,
  iniciada_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tentativas_recepcao_iniciada_em_idx ON tentativas_recepcao (iniciada_em);
