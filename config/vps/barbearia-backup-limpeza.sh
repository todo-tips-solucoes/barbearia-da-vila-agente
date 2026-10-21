#!/bin/sh
# Barbearia da Vila (PROD): backup diario do barbearia_vila com 14 dias de retencao e, so depois de um backup ok,
# a limpeza LGPD de mensagens com mais de 12 meses (owner, 2026-10-21). Instalar em /root/barbearia_vila/.
# O SQL e o mesmo de scripts/limpar-mensagens.py (tests/test_producao.py confere). Segredo so do infra.env da VPS.
set -eu
umask 077
. /root/barbearia_vila/infra.env
b=/root/barbearia_vila/backups
arq="$b/bv-barbearia_vila-$(date -u +%Y%m%dT%H%M%SZ).dump"
mkdir -p "$b"; chmod 700 "$b"
docker exec -e PGPASSWORD="$PG_PASSWORD" n8n-postgres-1 pg_dump -Fc -U barbearia_vila -d barbearia_vila > "$arq.tmp"
mv "$arq.tmp" "$arq"; chmod 600 "$arq"
ls -1t "$b"/bv-barbearia_vila-*.dump | tail -n +15 | xargs -r rm -f --
echo "WITH d AS (DELETE FROM mensagens WHERE criado_em < now() - interval '12 months' RETURNING 1) SELECT count(*) FROM d;" \
  | docker exec -i -e PGPASSWORD="$PG_PASSWORD" n8n-postgres-1 psql -v ON_ERROR_STOP=1 -q -t -A -U barbearia_vila -d barbearia_vila
