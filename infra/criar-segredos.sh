#!/bin/sh
# Cria os docker secrets da stack bv com valores aleatorios e guarda uma copia em
# /root/barbearia_vila/infra.env (modo 600), a fonte local de verdade. Idempotente:
# variavel ja presente no infra.env e secret ja existente nao sao recriados.
set -eu
ENV=/root/barbearia_vila/infra.env
umask 077
mkdir -p "$(dirname "$ENV")"
touch "$ENV"

garantir() {  # garantir <VARIAVEL> <secret>
  if ! grep -q "^$1=" "$ENV"; then
    printf '%s=%s\n' "$1" "$(openssl rand -hex 32)" >> "$ENV"
  fi
  if ! docker secret inspect "$2" >/dev/null 2>&1; then
    grep "^$1=" "$ENV" | cut -d= -f2- | tr -d '\n' | docker secret create "$2" - >/dev/null
    echo "secret criado: $2"
  fi
}

garantir PG_N8N_PASSWORD bv_pg_n8n_password
garantir N8N_ENCRYPTION_KEY bv_n8n_encryption_key
garantir REDIS_PASSWORD bv_redis_password
garantir PORTAINER_ADMIN_PASSWORD bv_portainer_admin
# senha do owner do n8n: so no infra.env; o n8n exige maiuscula e numero, ate 64 caracteres
grep -q '^N8N_OWNER_PASSWORD=' "$ENV" || printf 'N8N_OWNER_PASSWORD=%sBv9\n' "$(openssl rand -hex 24)" >> "$ENV"
chmod 600 "$ENV"
