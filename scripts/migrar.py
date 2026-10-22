"""Aplica db/migrations/NNNN_*.sql com controle por schema_migrations + sha256. Uso: --alvo teste|producao [--dry-run]."""
import argparse
import hashlib
import os
import sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(RAIZ, "scripts"))
import _vps

BANCO = {"teste": "barbearia_vila_teste", "producao": "barbearia_vila"}


def arquivos(pasta=None):
    pasta = pasta or os.path.join(RAIZ, "db", "migrations")
    return [(n[:4], n, os.path.join(pasta, n)) for n in sorted(os.listdir(pasta)) if n[:4].isdigit() and n.endswith(".sql")]


def aplicadas(banco, psql):
    if psql(banco, "SELECT to_regclass('schema_migrations') IS NOT NULL;").strip() != "t":
        return {}
    out = psql(banco, "SELECT versao||'|'||sha256 FROM schema_migrations;")
    return dict(l.split("|", 1) for l in out.splitlines() if "|" in l)


def planejar(banco, psql, pasta=None):
    """Retorna (a_aplicar, divergentes). Nada e escrito."""
    ja, novas, div = aplicadas(banco, psql), [], []
    for v, nome, caminho in arquivos(pasta):
        sql = open(caminho, encoding="utf-8").read()
        h = hashlib.sha256(sql.encode()).hexdigest()
        if v in ja:
            if ja[v] != h:
                div.append(nome)
        else:
            novas.append((v, nome, h, sql))
    return novas, div


def main(argv, psql=None, pasta=None):
    psql = psql or _vps.psql
    ap = argparse.ArgumentParser()
    ap.add_argument("--alvo", required=True, choices=list(BANCO))
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args(argv)
    banco = BANCO[a.alvo]
    try:
        _vps._alvo(a.alvo)  # trava de PROD antes de qualquer chamada remota
        novas, div = planejar(banco, psql, pasta)
        if div:
            print(f"hash divergente (migracao ja aplicada foi editada): {', '.join(div)}", file=sys.stderr)
            return 1
        for v, nome, h, sql in novas:
            if a.dry_run:
                print(f"[dry-run] aplicaria {nome}")
                continue
            psql(banco, f"BEGIN;\n{sql}\nINSERT INTO schema_migrations (versao, nome, sha256) "
                        f"VALUES ('{v}', '{nome}', '{h}');\nCOMMIT;\n")
            print(f"aplicada {nome}")
    except _vps.Recusado as e:
        print(f"recusado: {e}", file=sys.stderr)
        return 2
    except RuntimeError as e:
        print(str(e), file=sys.stderr)
        return 1
    print(f"alteracoes: {0 if a.dry_run else len(novas)}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
