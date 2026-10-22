"""Sondagens somente leitura da infra (contracts/scripts-cli.md). Uso: --redis [--db N] | --acesso | --backup."""
import argparse
import json
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
    ap.add_argument("--idempotencia", action="store_true")
    a = ap.parse_args(argv)
    if not (a.redis or a.acesso or a.backup or a.idempotencia):
        ap.error("informe --redis, --acesso ou --backup")
    try:
        if a.redis:
            livre, n = redis_livre(a.db)
            print(f"redis db {a.db}: DBSIZE={n} -> {'LIVRE' if livre else 'OCUPADO'}")
            print("keyspace:", _vps.sondar("redis-keyspace").strip().replace("\n", " | "))
            if not livre:
                return 1
        if a.redis:  # escrita so apos DB confirmado no config, somente sob bv:teste:verif:
            cfg = json.load(open(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                                              "config", "ambientes", "integracao.json")))["redis"]
            if cfg.get("db_confirmado") and cfg["db"] == a.db:
                k = _vps.PREFIXO_ESCRITA + "ping"
                _vps.redis(a.db, "SET", k, "1")
                ok = _vps.redis(a.db, "GET", k).strip() == "1"
                _vps.redis(a.db, "DEL", k)
                resto = _vps.redis(a.db, "EXISTS", k).strip() == "0"
                print(f"redis escrita SET/GET/DEL {k}: {'OK' if ok and resto else 'FALHA'}")
                if not (ok and resto):
                    return 1
        if a.acesso:
            print("datacl database n8n:", _vps.sondar("connect-n8n").strip())
            vazou = False
            for dest in ("n8n", "barbearia_vila"):
                negado, msg = _vps.acesso_cruzado("teste", dest)
                print(f"TESTE -> {dest}: {'NEGADO' if negado else 'ACESSO PERMITIDO (falha)'} ({msg})")
                vazou = vazou or not negado
            if vazou:
                return 1
        if a.idempotencia:  # TESTE: reexecutar preparar + migrar nao pode alterar nada
            import importlib.util
            sp = importlib.util.spec_from_file_location("migrar", os.path.join(os.path.dirname(__file__), "migrar.py"))
            mig = importlib.util.module_from_spec(sp); sp.loader.exec_module(mig)
            alt_prep = _vps.preparar("teste")[0]
            novas, div = mig.planejar("barbearia_vila_teste", _vps.psql)
            print(f"idempotencia: preparar={alt_prep} migracoes_pendentes={len(novas)} divergentes={len(div)}")
            if alt_prep or novas or div:
                return 1
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
