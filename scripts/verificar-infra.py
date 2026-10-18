"""Sondagens somente leitura da infra (contracts/scripts-cli.md). Uso: --redis [--db N] | --acesso | --backup."""
import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import _vps


def redis_livre(db):
    """DB livre = DBSIZE 0. Somente leitura (sem escrita enquanto db_confirmado=false)."""
    n = int(_vps.redis(db, "DBSIZE").strip())
    return n == 0, n


def main(argv):
    ap = argparse.ArgumentParser()
    ap.add_argument("--redis", action="store_true")
    ap.add_argument("--db", type=int, default=2)
    ap.add_argument("--acesso", action="store_true")
    ap.add_argument("--backup", action="store_true")
    a = ap.parse_args(argv)
    if not (a.redis or a.acesso or a.backup):
        ap.error("informe --redis, --acesso ou --backup")
    try:
        if a.redis:
            livre, n = redis_livre(a.db)
            print(f"redis db {a.db}: DBSIZE={n} -> {'LIVRE' if livre else 'OCUPADO'}")
            print("keyspace:", _vps.sondar("redis-keyspace").strip().replace("\n", " | "))
            if not livre:
                return 1
        if a.acesso:
            print("datacl database n8n:", _vps.sondar("connect-n8n").strip())
        if a.backup:
            print("backup existente:", _vps.sondar("backup-existente").strip() or "(nada encontrado)")
    except _vps.Recusado as e:
        print(f"recusado: {e}", file=sys.stderr)
        return 2
    except (RuntimeError, ValueError) as e:
        print(str(e), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
