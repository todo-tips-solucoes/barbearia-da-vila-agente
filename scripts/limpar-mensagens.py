"""Retencao LGPD (owner, 2026-10-21): apaga mensagens com mais de 12 meses; contatos e agendamentos ficam.
Uso: --alvo teste|producao (PROD exige BV_DEPLOY_PRODUCAO_AUTORIZADO=sim). Imprime quantas apagou.
O cron diario da VPS roda o mesmo SQL em config/vps/barbearia-backup-limpeza.sh, depois do backup."""
import argparse
import os
import sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(RAIZ, "scripts"))
import _vps

# FK: so contatos -> mensagens tem cascade (0001); apagar mensagem nunca apaga contato. tentativas_recepcao cai junto (0005).
SQL = "WITH d AS (DELETE FROM mensagens WHERE criado_em < now() - interval '12 months' RETURNING 1) SELECT count(*) FROM d;"


def main(argv, psql=_vps.psql):
    ap = argparse.ArgumentParser()
    ap.add_argument("--alvo", required=True, choices=["teste", "producao"])
    a = ap.parse_args(argv)
    try:
        banco, _ = _vps._alvo(a.alvo)  # trava de PROD antes de qualquer chamada remota
        print(f"{a.alvo}: {psql(banco, SQL).strip()} mensagens apagadas (> 12 meses)")
    except _vps.Recusado as e:
        print(f"recusado: {e}", file=sys.stderr)
        return 2
    except RuntimeError as e:
        print(str(e), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
