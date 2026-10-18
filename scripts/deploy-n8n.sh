#!/usr/bin/env bash
# Publica workflows/*.json no n8n (logica em scripts/deploy-n8n.py).
# Uso: scripts/deploy-n8n.sh integracao [--so NOME|--criar NOME] | producao --confirmar-id <id>
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
exec python3 -I scripts/deploy-n8n.py "$@"
