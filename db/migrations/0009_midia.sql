-- 0009 midia (audio-imagem): metadados e conteudo derivado de audio/imagem; tipo 'outro'; falhas_agente.tipo 'midia'. Idempotente.
ALTER TABLE mensagens ADD COLUMN IF NOT EXISTS midia_mime text;
ALTER TABLE mensagens ADD COLUMN IF NOT EXISTS midia_segundos integer;
ALTER TABLE mensagens ADD COLUMN IF NOT EXISTS midia_bytes bigint;
ALTER TABLE mensagens ADD COLUMN IF NOT EXISTS conteudo_derivado text;
ALTER TABLE mensagens ADD COLUMN IF NOT EXISTS midia_falha text;

ALTER TABLE mensagens DROP CONSTRAINT IF EXISTS mensagens_tipo_entrada_chk;
ALTER TABLE mensagens ADD CONSTRAINT mensagens_tipo_entrada_chk
  CHECK (direcao <> 'entrada' OR tipo IN ('texto','audio','imagem','outro'));

ALTER TABLE falhas_agente DROP CONSTRAINT IF EXISTS falhas_agente_tipo_check;
ALTER TABLE falhas_agente ADD CONSTRAINT falhas_agente_tipo_check
  CHECK (tipo IN ('graces','chatmaster','agente','turno','midia'));
