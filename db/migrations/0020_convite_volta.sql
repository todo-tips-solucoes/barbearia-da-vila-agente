-- 0020 convite de volta (owner, 2026-11-27): lembrete para quem esta ha quase um mes sem cortar. Identico em PROD e TESTE; idempotente.
-- mensagens_agendadas: tipo 'convite_volta' (um por visita; `inicio` guarda a data da ultima visita, que da o dedupe). O pedido de
-- nao receber mais fica na propria linha (motivo 'parou'): nenhuma coluna nova, e o agente nao depende desta migracao para rodar.
ALTER TABLE mensagens_agendadas DROP CONSTRAINT IF EXISTS mensagens_agendadas_tipo_check;
ALTER TABLE mensagens_agendadas ADD CONSTRAINT mensagens_agendadas_tipo_check
  CHECK (tipo IN ('confirmacao','lembrete','pos_atendimento','lembrete_dia','lembrete_hora','convite_volta'));
