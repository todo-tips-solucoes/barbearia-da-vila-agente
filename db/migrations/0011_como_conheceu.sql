-- 0011 como o cliente conheceu a barbearia (owner, 2026-11-14). A Graces nao tem esse campo na API: fica aqui, por contato,
-- gravado pelo cadastrar_cliente do bv-graces (Persistir, $18). Dado de marketing pedido pelo owner; sem PII alem do que ja existe.
ALTER TABLE contatos ADD COLUMN IF NOT EXISTS como_conheceu text;
