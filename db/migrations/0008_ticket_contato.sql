-- 0008 regras-negocio-agenda: ticket do Chat Master do contato (chamadoId do webhook), usado no handoff (updateAPI). Idempotente.
ALTER TABLE contatos ADD COLUMN IF NOT EXISTS ticket_id bigint;
