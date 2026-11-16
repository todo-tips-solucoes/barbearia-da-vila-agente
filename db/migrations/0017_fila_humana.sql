-- Fila de atendimento humano (owner, 2026-11-16): enquanto a conversa esta nela o agente nao interage; sem interacao ha mais de
-- 30 min o atendimento humano pode ser encerrado. A fila vem em cada evento do Chat Master (queueId).
-- fila_id: fila do ultimo evento do contato; fila_interacao_em / fila_ultima_de: ultima mensagem trocada na fila humana e de quem
-- ('cliente' | 'equipe'). Nulos fora da fila humana.
ALTER TABLE contatos ADD COLUMN IF NOT EXISTS fila_id integer;
ALTER TABLE contatos ADD COLUMN IF NOT EXISTS fila_interacao_em timestamptz;
ALTER TABLE contatos ADD COLUMN IF NOT EXISTS fila_ultima_de text;
