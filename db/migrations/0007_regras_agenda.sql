-- 0007 regras-negocio-agenda (data-model.md): amplia os CHECK de propostas (conjuntos, terceiro, estado parcial). Idempotente.
ALTER TABLE propostas DROP CONSTRAINT IF EXISTS propostas_acao_check;
ALTER TABLE propostas ADD CONSTRAINT propostas_acao_check
  CHECK (acao IN ('agendar','reagendar','cancelar','trocar_servico','agendar_conjunto','cancelar_conjunto','cadastrar_terceiro'));
ALTER TABLE propostas DROP CONSTRAINT IF EXISTS propostas_estado_check;
ALTER TABLE propostas ADD CONSTRAINT propostas_estado_check
  CHECK (estado IN ('pendente','executando','executada','incerta','falhou','substituida','expirada','parcial'));
