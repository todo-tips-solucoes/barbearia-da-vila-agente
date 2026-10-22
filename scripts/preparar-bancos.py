"""Cria role + database da barbearia e fecha CONNECT (FR-001/002/005). Uso: --alvo teste|producao."""
import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import _vps


def main(argv):
    ap = argparse.ArgumentParser()
    ap.add_argument("--alvo", required=True, choices=["teste", "producao"])
    a = ap.parse_args(argv)
    try:
        alt, linhas = _vps.preparar(a.alvo)  # recusa PROD sem trava antes de qualquer chamada remota
    except _vps.Recusado as e:
        print(f"recusado: {e}", file=sys.stderr)
        return 2
    except RuntimeError as e:
        print(str(e), file=sys.stderr)
        return 1
    print("\n".join(linhas))
    print(f"alteracoes: {alt}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
