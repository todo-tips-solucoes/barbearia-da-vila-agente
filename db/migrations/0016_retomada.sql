-- 0016 retomada de agendamento abandonado (owner, 2026-11-16; roadmap feature 9): uma mensagem, 2 h depois da ultima do agente,
-- so para quem parou no meio de um agendamento. retomada_em marca a retomada da sessao corrente (nunca duas na mesma sessao) e
-- mantem a sessao viva para a resposta do cliente continuar de onde parou.
ALTER TABLE conversas ADD COLUMN IF NOT EXISTS retomada_em timestamptz;
