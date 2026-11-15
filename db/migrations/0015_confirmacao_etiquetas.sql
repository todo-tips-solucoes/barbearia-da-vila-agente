-- 0015 confirmacao junto com o lembrete de 24 h e etiquetas no ticket (owner, 2026-11-15). A resposta (SIM/NAO) fica no proprio
-- lembrete_dia; o sincronizador poe a etiqueta Confirmado/Cancelado no ticket e a tira no horario marcado.
-- etiqueta_id: etiqueta posta (0 = nao se aplica: sem ticket ou sem etiqueta configurada); etiqueta_removida_em: ja tirada.
ALTER TABLE mensagens_agendadas DROP CONSTRAINT IF EXISTS mensagens_agendadas_resposta_chk;
ALTER TABLE mensagens_agendadas ADD CONSTRAINT mensagens_agendadas_resposta_chk
  CHECK (resposta IS NULL OR (tipo IN ('confirmacao','lembrete_dia') AND resposta IN ('confirmada','recusada')));
ALTER TABLE mensagens_agendadas ADD COLUMN IF NOT EXISTS etiqueta_id integer;
ALTER TABLE mensagens_agendadas ADD COLUMN IF NOT EXISTS etiqueta_ticket_id bigint;
ALTER TABLE mensagens_agendadas ADD COLUMN IF NOT EXISTS etiqueta_removida_em timestamptz;
