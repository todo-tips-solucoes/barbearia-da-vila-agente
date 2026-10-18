"""Limpa chaves do prefixo do alvo no DB do config (SCAN MATCH + DEL em lote). Uso: --alvo teste|producao [--padrao SUFIXO]. Nunca FLUSH*."""
import argparse
import json
import os
import sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(RAIZ, "scripts"))
import _vps

ARQ = {"teste": "integracao.json", "producao": "producao.json"}


def carregar(alvo):
    with open(os.path.join(RAIZ, "config", "ambientes", ARQ[alvo]), encoding="utf-8") as f:
        return json.load(f)["redis"]


def limpar(prefixo, db, sufixo="", redis=None, lote=100):
    """Retorna o numero de chaves apagadas. So chaves que comecam com o prefixo."""
    redis = redis or _vps.redis
    cursor, chaves = "0", []
    while True:
        linhas = redis(db, "SCAN", cursor, "MATCH", f"{prefixo}{sufixo}*", "COUNT", "500").split()
        cursor, achadas = linhas[0], linhas[1:]
        chaves += [k for k in achadas if k.startswith(prefixo)]
        if cursor == "0":
            break
    chaves = sorted(set(chaves))
    for i in range(0, len(chaves), lote):
        redis(db, "DEL", *chaves[i:i + lote])
    return len(chaves)


def main(argv, redis=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--alvo", required=True, choices=list(ARQ))
    ap.add_argument("--padrao", default="")
    a = ap.parse_args(argv)
    try:
        _vps._alvo(a.alvo)  # trava de PROD antes de qualquer chamada remota
        cfg = carregar(a.alvo)
        if not cfg.get("db_confirmado"):
            print("recusado: redis.db_confirmado=false no config", file=sys.stderr)
            return 2
        n = limpar(cfg["prefixo"], cfg["db"], a.padrao, redis)
    except _vps.Recusado as e:
        print(f"recusado: {e}", file=sys.stderr)
        return 2
    except (RuntimeError, ValueError) as e:
        print(str(e), file=sys.stderr)
        return 1
    print(f"apagadas {n} chaves de {cfg['prefixo']}{a.padrao}*")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
