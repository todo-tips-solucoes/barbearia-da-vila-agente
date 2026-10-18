-- 0004 recepcao-robustez (data-model.md): tipo 'gravacao' em falhas_recepcao e marcas de conteudo. Identico em PROD e TESTE; idempotente.
ALTER TABLE falhas_recepcao DROP CONSTRAINT IF EXISTS falhas_recepcao_tipo_check;
ALTER TABLE falhas_recepcao ADD CONSTRAINT falhas_recepcao_tipo_check
  CHECK (tipo IN ('redis_indisponivel','payload_invalido','entrega','gravacao'));

-- so hash do texto + contato: nenhum texto ou telefone legivel (FR-012, XIV)
CREATE TABLE IF NOT EXISTS marcas_conteudo (
  contato_id     bigint NOT NULL REFERENCES contatos(id) ON DELETE CASCADE,
  hash_conteudo  bytea NOT NULL,
  visto_em       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (contato_id, hash_conteudo)
);
CREATE INDEX IF NOT EXISTS marcas_conteudo_visto_em_idx ON marcas_conteudo (visto_em);
