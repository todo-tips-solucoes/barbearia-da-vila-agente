-- 0010 mensagens-agendadas: agendador proprio (confirmacao/lembrete/pos). Unico so entre pendentes, situacao 'falhou', colunas de envio/resposta, falhas_agente.tipo 'mensagem'. Idempotente.
ALTER TABLE mensagens_agendadas DROP CONSTRAINT IF EXISTS mensagens_agendadas_graces_agendamento_id_tipo_key;
CREATE UNIQUE INDEX IF NOT EXISTS mensagens_agendadas_pendente_unico_idx ON mensagens_agendadas (graces_agendamento_id, tipo) WHERE situacao = 'pendente';

ALTER TABLE mensagens_agendadas ADD COLUMN IF NOT EXISTS graces_cliente_id text;
ALTER TABLE mensagens_agendadas ADD COLUMN IF NOT EXISTS id_profissional text;
ALTER TABLE mensagens_agendadas ADD COLUMN IF NOT EXISTS inicio timestamp;
ALTER TABLE mensagens_agendadas ADD COLUMN IF NOT EXISTS dados jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE mensagens_agendadas ADD COLUMN IF NOT EXISTS tentativas smallint NOT NULL DEFAULT 0;
ALTER TABLE mensagens_agendadas ADD COLUMN IF NOT EXISTS proxima_tentativa_em timestamptz;
ALTER TABLE mensagens_agendadas ADD COLUMN IF NOT EXISTS reservada_em timestamptz;
ALTER TABLE mensagens_agendadas ADD COLUMN IF NOT EXISTS enviada_em timestamptz;
ALTER TABLE mensagens_agendadas ADD COLUMN IF NOT EXISTS motivo text;
ALTER TABLE mensagens_agendadas ADD COLUMN IF NOT EXISTS resposta text;
ALTER TABLE mensagens_agendadas ADD COLUMN IF NOT EXISTS respondida_em timestamptz;

ALTER TABLE mensagens_agendadas DROP CONSTRAINT IF EXISTS mensagens_agendadas_situacao_check;
ALTER TABLE mensagens_agendadas ADD CONSTRAINT mensagens_agendadas_situacao_check
  CHECK (situacao IN ('pendente','enviada','cancelada','falhou'));
ALTER TABLE mensagens_agendadas DROP CONSTRAINT IF EXISTS mensagens_agendadas_enviada_chk;
ALTER TABLE mensagens_agendadas ADD CONSTRAINT mensagens_agendadas_enviada_chk
  CHECK ((situacao = 'enviada') = (enviada_em IS NOT NULL));
ALTER TABLE mensagens_agendadas DROP CONSTRAINT IF EXISTS mensagens_agendadas_resposta_chk;
ALTER TABLE mensagens_agendadas ADD CONSTRAINT mensagens_agendadas_resposta_chk
  CHECK (resposta IS NULL OR (tipo = 'confirmacao' AND resposta IN ('confirmada','recusada')));

CREATE INDEX IF NOT EXISTS mensagens_agendadas_resposta_idx ON mensagens_agendadas (contato_id, tipo) WHERE situacao = 'enviada' AND resposta IS NULL;

ALTER TABLE falhas_agente DROP CONSTRAINT IF EXISTS falhas_agente_tipo_check;
ALTER TABLE falhas_agente ADD CONSTRAINT falhas_agente_tipo_check
  CHECK (tipo IN ('graces','chatmaster','agente','turno','midia','mensagem'));
