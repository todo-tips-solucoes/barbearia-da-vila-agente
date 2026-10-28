"""pg_dump -Fc dos bancos da Barbearia em /root/barbearia_vila/backups/ (modo 600), com rotacao do proprio padrao.
Uso: --alvo teste|producao|todos --retencao N [--validar] [--restaurar-teste].
--restaurar-teste: restaura o dump novo num banco descartavel <banco>_restore, roda la a limpeza de 12 meses
(13 meses sai, recente fica, 2a execucao apaga 0) e apaga o banco no mesmo passo. PROD (inclusive em `todos`) exige BV_DEPLOY_PRODUCAO_AUTORIZADO=sim.
Nao instala cron nem decide frequencia (pendencia do owner, docs/infra.md)."""
import argparse
import os
import shlex
import sys
import time

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(RAIZ, "scripts"))
import _vps
import importlib.util

_s = importlib.util.spec_from_file_location("lm", os.path.join(RAIZ, "scripts", "limpar-mensagens.py"))
_lm = importlib.util.module_from_spec(_s)
_s.loader.exec_module(_lm)


def cmd_backup(alvo, retencao, ts):
    """Script remoto: dump novo (nome unico por execucao) + rotacao so de bv-<banco>-*.dump. Imprime o caminho."""
    d, _ = _vps._alvo(alvo)
    b = _vps.BACKUPS
    arq = f"{b}/bv-{d}-{ts}.dump"
    return (f"set -e; umask 077; mkdir -p {b}; chmod 700 {b}; "
            f"{_vps.cmd_pg_dump(d)} > {arq}.tmp && mv {arq}.tmp {arq}; chmod 600 {arq}; "
            f"ls -1t {b}/bv-{d}-*.dump | tail -n +{int(retencao) + 1} | xargs -r rm -f --; echo {arq}")


def cmd_validar(arq):
    if not arq.startswith(_vps.BACKUPS + "/bv-") or not arq.endswith(".dump") or " " in arq or ";" in arq:
        raise _vps.Recusado("caminho de dump invalido")
    return f"docker exec -i {_vps.PG} pg_restore --list < {shlex.quote(arq)} | head -200"


def cmd_restaurar_teste(alvo, arq):
    """Banco descartavel <d>_restore: restore do dump, cenario da limpeza e DROP no fim (trap, inclusive em erro)."""
    cmd_validar(arq)  # mesmo filtro de caminho
    d, var = _vps._alvo(alvo)
    r = f"{d}_restore"
    adm = f"docker exec -i {_vps.PG} sh -c 'psql -v ON_ERROR_STOP=1 -q -t -A -U \"$POSTGRES_USER\" -d postgres'"
    ps = f"docker exec -i -e PGPASSWORD=\"${var}\" {_vps.PG} psql -v ON_ERROR_STOP=1 -q -t -A -U {d} -d {r}"
    cenario = ("INSERT INTO contatos(telefone) VALUES ('+5500000000999'); "
               "INSERT INTO mensagens(contato_id,direcao,conteudo,criado_em) SELECT id,'entrada','velha',now()-interval '13 months' FROM contatos; "
               "INSERT INTO mensagens(contato_id,direcao,conteudo) SELECT id,'entrada','nova' FROM contatos;")
    # funcao no trap: entre aspas duplas o $POSTGRES_USER do adm seria expandido no host (vazio) e o DROP falharia calado
    return (f"set -e; . {_vps.INFRA_ENV}; limpa() {{ echo 'DROP DATABASE IF EXISTS {r};' | {adm}; }}; trap limpa EXIT; "
            f"echo 'DROP DATABASE IF EXISTS {r}; CREATE DATABASE {r} OWNER {d};' | {adm}; "
            f"docker exec -i -e PGPASSWORD=\"${var}\" {_vps.PG} pg_restore --no-owner -U {d} -d {r} < {shlex.quote(arq)}; "
            f"echo \"SELECT 'migracoes=' || count(*) FROM schema_migrations;\" | {ps}; "
            f"echo {shlex.quote(cenario)} | {ps}; "
            f"echo {shlex.quote(_lm.SQL)} | {ps} | sed 's/^/apagadas_1a=/'; "
            f"echo {shlex.quote(_lm.SQL)} | {ps} | sed 's/^/apagadas_2a=/'; "
            f"echo \"SELECT 'restantes=' || count(*) || ' contatos=' || (SELECT count(*) FROM contatos) FROM mensagens;\" | {ps}")


def main(argv, ssh=_vps._ssh, agora=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--alvo", required=True, choices=["teste", "producao", "todos"])
    ap.add_argument("--retencao", required=True, type=int)
    ap.add_argument("--validar", action="store_true")
    ap.add_argument("--restaurar-teste", action="store_true")
    a = ap.parse_args(argv)
    if a.retencao < 1:
        print("recusado: --retencao deve ser >= 1", file=sys.stderr)
        return 2
    alvos = ["teste", "producao"] if a.alvo == "todos" else [a.alvo]
    try:
        for alvo in alvos:
            _vps._alvo(alvo)  # trava de PROD antes de qualquer chamada remota
        ts = agora or time.strftime("%Y%m%dT%H%M%SZ", time.gmtime())
        for alvo in alvos:
            arq = _vps._ok(*ssh("sh -c " + shlex.quote(cmd_backup(alvo, a.retencao, ts))), "backup").strip().splitlines()[-1]
            print(f"{alvo}: {arq}")
            if a.validar:
                itens = _vps._ok(*ssh(cmd_validar(arq)), "pg_restore --list").strip().splitlines()
                print(f"{alvo}: pg_restore --list ok ({len(itens)} linhas)")
            if a.restaurar_teste:
                out = _vps._ok(*ssh("sh -c " + shlex.quote(cmd_restaurar_teste(alvo, arq))), "restore de teste")
                print(f"{alvo}: restore descartavel " + " ".join(out.split()))
    except _vps.Recusado as e:
        print(f"recusado: {e}", file=sys.stderr)
        return 2
    except RuntimeError as e:
        print(str(e), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
