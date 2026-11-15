-- 0013 nome do cliente como se escreve (owner, 2026-11-15): "GABRIEL" vira "Gabriel". Marca os lembretes ja espelhados no Chat Master
-- para o sincronizador recalcular o texto; so os que mudarem viram PUT (os iguais terminam em 'nada', sem chamada).
UPDATE mensagens_agendadas SET atualizado_em = now()
  WHERE tipo IN ('lembrete_dia','lembrete_hora') AND situacao = 'pendente' AND agendamento_canal_id IS NOT NULL AND previsto_para > now();
