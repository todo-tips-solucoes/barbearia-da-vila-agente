-- 0019 auditoria (item 26 das melhorias): fim de cada transferencia e itens das listas enviadas. Identico em PROD e TESTE; idempotente.
-- handoffs: quem encerrou. 'vigia' = fila humana sem interacao (bv-vigia); 'retorno' = o cliente voltou a ser atendido pelo agente
-- (ai o encerrado_em e a hora desse retorno, nao a hora em que a equipe terminou).
ALTER TABLE handoffs ADD COLUMN IF NOT EXISTS encerrado_por text CHECK (encerrado_por IN ('vigia','retorno'));
-- mensagens: itens da lista enviada, [{id, rotulo}]; NULL em mensagem de texto.
ALTER TABLE mensagens ADD COLUMN IF NOT EXISTS lista jsonb;
