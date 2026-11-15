-- 0012 lembretes no modulo de Agendamentos do Chat Master (owner, 2026-11-15): 24 h e 1 h antes do horario.
-- mensagens_agendadas segue a fonte unica; agendamento_canal_id guarda o id do agendamento no Chat Master e canal_previsto_para /
-- canal_texto o que esta la (o sincronizador so chama a API quando difere). contatos.chatmaster_contato_id: id do contato no Chat Master
-- (do webhook ou da busca pelo numero; 0 = nao existe la). Idempotente.
ALTER TABLE mensagens_agendadas DROP CONSTRAINT IF EXISTS mensagens_agendadas_tipo_check;
ALTER TABLE mensagens_agendadas ADD CONSTRAINT mensagens_agendadas_tipo_check
  CHECK (tipo IN ('confirmacao','lembrete','pos_atendimento','lembrete_dia','lembrete_hora'));
ALTER TABLE mensagens_agendadas ADD COLUMN IF NOT EXISTS canal_previsto_para timestamptz;
ALTER TABLE mensagens_agendadas ADD COLUMN IF NOT EXISTS canal_texto text;
-- ultima passada do sincronizador; atualizado_em maior = a linha mudou depois (ex.: remarcou com outro barbeiro no mesmo horario)
ALTER TABLE mensagens_agendadas ADD COLUMN IF NOT EXISTS canal_sincronizado_em timestamptz;
ALTER TABLE contatos ADD COLUMN IF NOT EXISTS chatmaster_contato_id bigint;
CREATE INDEX IF NOT EXISTS mensagens_agendadas_sinc_idx ON mensagens_agendadas (previsto_para)
  WHERE tipo IN ('lembrete_dia','lembrete_hora') AND (situacao = 'pendente' OR agendamento_canal_id IS NOT NULL);
-- os tipos do envio proprio deixam de ser programados: o que estava pendente nao sai mais
UPDATE mensagens_agendadas SET situacao = 'cancelada', motivo = 'substituida_chatmaster', reservada_em = NULL, atualizado_em = now()
  WHERE situacao = 'pendente' AND tipo IN ('confirmacao','lembrete','pos_atendimento');
