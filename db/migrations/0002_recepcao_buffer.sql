-- 0002 recepcao-buffer (data-model.md). Identico em PROD e TESTE; idempotente.
-- midia chega por fileUrl (contrato observado): sem midias_recebidas, so mensagens.midia_url.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'mensagens' AND column_name = 'processada_em') THEN
    ALTER TABLE mensagens ADD COLUMN processada_em timestamptz;
    -- historico existente nao e reentregue; so na primeira aplicacao (nunca reprocessa pendentes novas)
    UPDATE mensagens SET processada_em = criado_em WHERE direcao = 'entrada';
  END IF;
END $$;

ALTER TABLE mensagens ADD COLUMN IF NOT EXISTS midia_url text;
ALTER TABLE mensagens ADD COLUMN IF NOT EXISTS turno_id uuid;
ALTER TABLE mensagens ADD COLUMN IF NOT EXISTS turno_em timestamptz;

ALTER TABLE mensagens DROP CONSTRAINT IF EXISTS mensagens_tipo_entrada_chk;
ALTER TABLE mensagens ADD CONSTRAINT mensagens_tipo_entrada_chk
  CHECK (direcao <> 'entrada' OR tipo IN ('texto','audio','imagem'));

CREATE INDEX IF NOT EXISTS mensagens_pendentes_idx ON mensagens (contato_id, criado_em, id)
  WHERE direcao = 'entrada' AND processada_em IS NULL;
