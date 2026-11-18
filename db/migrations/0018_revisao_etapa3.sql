-- 0018 revisao de 17/11, etapa 3: indices por contato e a regra unica da confirmacao respondivel. Identico em PROD e TESTE; idempotente.
-- mensagens_agendadas: as consultas por contato (contexto do agente, toque de confirmacao, grupo do dia) deixaram de caber no indice
-- parcial de 0010 quando a regra passou a aceitar o lembrete pendente prestes a sair; sem este indice elas varrem a tabela.
CREATE INDEX IF NOT EXISTS mensagens_agendadas_contato_idx ON mensagens_agendadas (contato_id, tipo, inicio);
-- propostas: contagem do dia por contato (teto de agendamentos por contato).
CREATE INDEX IF NOT EXISTS propostas_contato_idx ON propostas (contato_id, atualizada_em);
-- Confirmacao "respondivel": ja enviada, ou lembrete do dia criado no Chat Master e prestes a sair (2 min). A regra estava copiada
-- em 5 consultas de 3 workflows. Funcao SQL de expressao unica: o planejador a expande no lugar e segue usando os indices.
CREATE OR REPLACE FUNCTION bv_respondivel(situacao text, tipo text, agendamento_canal_id text, previsto_para timestamptz)
RETURNS boolean LANGUAGE sql STABLE AS $bv$
  SELECT situacao = 'enviada' OR (situacao = 'pendente' AND tipo = 'lembrete_dia' AND agendamento_canal_id IS NOT NULL AND previsto_para <= now() + interval '2 minutes')
$bv$;
-- falhas_recepcao: tipo 'taxa' (limite de eventos por contato e minuto no webhook; registrado uma vez por minuto estourado).
ALTER TABLE falhas_recepcao DROP CONSTRAINT IF EXISTS falhas_recepcao_tipo_check;
ALTER TABLE falhas_recepcao ADD CONSTRAINT falhas_recepcao_tipo_check
  CHECK (tipo IN ('redis_indisponivel','payload_invalido','entrega','gravacao','taxa'));
