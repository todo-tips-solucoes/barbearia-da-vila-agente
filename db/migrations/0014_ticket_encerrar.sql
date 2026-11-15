-- 0014 ticket criado pelo sincronizador de lembretes e encerrado em seguida (owner, 2026-11-15): sem isso cada cliente do balcao
-- abriria um ticket em "Aguardando" no painel da equipe. true = criado por nos, falta encerrar.
ALTER TABLE contatos ADD COLUMN IF NOT EXISTS ticket_encerrar boolean NOT NULL DEFAULT false;
