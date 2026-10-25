"""Janela da F6 (docs/migracao-vps.md): passos que tocam a PROD de origem (n8n2) ou o banco de PROD daqui.
Uso (todos exigem BV_DEPLOY_PRODUCAO_AUTORIZADO=sim):
  desligar-origem | religar-origem   gatilhos de PROD no n8n2 (recepcao, vigia, alerta); confere relendo
  dump-origem                        pg_dump de barbearia_vila na VPS de origem -> backups/ (600), validado por pg_restore --list
  restaurar ARQ                      pg_restore no barbearia_vila daqui (vazio), objetos do role barbearia_vila; lista as migracoes
Chave do n8n2: .env.n8n do checkout principal (ou BV_ENV_N8N_ORIGEM); nunca impressa. Exit 0 ok, 1 falha, 2 recusado."""
import datetime
import json
import os
import subprocess
import sys
import urllib.error
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import _vps

ORIGEM = "https://n8n2.todo-tips.com"
# ids da PROD no n8n2 (producao.json antes da migracao); so os gatilhos, nunca outros workflows da instancia
GATILHOS = {"yUEWTZpNYMfIotdg": "recepcao", "hbHUY1RLNS5SJ3sP": "vigia", "qbA6tXtfzHLZr11T": "alerta"}
SSH = ["ssh", "-i", os.path.expanduser("~/.ssh/id_ed25519_n8n_vps"), "root@178.156.134.167"]
DUMP = "docker exec n8n-postgres-1 sh -c 'pg_dump -Fc -U \"$POSTGRES_USER\" -d barbearia_vila'"
BANCO = "barbearia_vila"


class Falha(Exception):
    pass


def pg():  # _vps.PG e uma expressao $(docker ps ...) para sh; aqui o subprocess precisa do id
    cid = subprocess.run(["sh", "-c", f"echo {_vps.PG}"], capture_output=True, text=True).stdout.strip()
    if not cid:
        raise Falha("container bv_postgres nao encontrado")
    return cid


def chave_origem():
    arq = os.environ.get("BV_ENV_N8N_ORIGEM", "/home/projetos/barbearia_da_villa/.env.n8n")
    env = dict(l.rstrip("\n").split("=", 1) for l in open(arq, encoding="utf-8") if "=" in l and not l.startswith("#"))
    if env.get("N8N_API_URL", "").rstrip("/") != ORIGEM:
        raise Falha(f"{arq} nao aponta para {ORIGEM}")
    return env["N8N_API_KEY"]


def n8n(chave, metodo, rota):
    req = urllib.request.Request(ORIGEM + "/api/v1" + rota, method=metodo, data=b"{}" if metodo == "POST" else None,
                                 headers={"X-N8N-API-KEY": chave, "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:  # sem corpo: pode conter dados sensiveis
        raise Falha(f"{metodo} {rota} -> HTTP {e.code}") from None


def gatilhos(ligar):
    chave = chave_origem()
    for wid, nome in GATILHOS.items():
        n8n(chave, "POST", f"/workflows/{wid}/{'activate' if ligar else 'deactivate'}")
        ativo = n8n(chave, "GET", f"/workflows/{wid}")["active"]
        if ativo != ligar:
            raise Falha(f"{nome} ({wid}) ficou {'desligado' if ligar else 'ligado'}")
        print(f"{nome} {wid}: {'ligado' if ativo else 'desligado'}")


def listar(arq):
    with open(arq, "rb") as f:
        r = subprocess.run(["docker", "exec", "-i", pg(), "pg_restore", "--list"], stdin=f, capture_output=True, text=True)
    if r.returncode:
        raise Falha(f"pg_restore --list falhou: {_vps._scrub(r.stderr.strip())}")
    return sum(" TABLE " in l and "TABLE DATA" not in l for l in r.stdout.splitlines())


def dump_origem():
    os.makedirs(_vps.BACKUPS, exist_ok=True)
    arq = os.path.join(_vps.BACKUPS, f"bv-{BANCO}-origem-{datetime.datetime.now(datetime.UTC):%Y%m%dT%H%M%SZ}.dump")
    fd = os.open(arq, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, "wb") as f:
        r = subprocess.run(SSH + [DUMP], stdout=f, stderr=subprocess.PIPE, text=False)
    if r.returncode:
        raise Falha(f"pg_dump na origem falhou: {_vps._scrub(r.stderr.decode(errors='replace').strip())}")
    print(f"{arq}: {os.path.getsize(arq)} bytes, {listar(arq)} tabelas")


def psql(sql):
    r = subprocess.run(["docker", "exec", "-i", pg(), "sh", "-c", f'psql -q -t -A -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d {BANCO}'],
                       input=sql, capture_output=True, text=True)
    if r.returncode:
        raise Falha(f"psql falhou: {_vps._scrub(r.stderr.strip())}")
    return r.stdout.strip()


def restaurar(arq):
    tabelas = listar(arq)
    if psql("SELECT count(*) FROM pg_tables WHERE schemaname = 'public'") != "0":
        raise Falha(f"{BANCO} daqui nao esta vazio: restore recusado")
    with open(arq, "rb") as f:  # --role: os objetos nascem do role do banco, como nas migracoes
        r = subprocess.run(["docker", "exec", "-i", pg(), "sh", "-c",
                            f'pg_restore --no-owner --no-acl --role={BANCO} --single-transaction --exit-on-error -U "$POSTGRES_USER" -d {BANCO}'],
                           stdin=f, capture_output=True)
    if r.returncode:
        raise Falha(f"pg_restore falhou: {_vps._scrub(r.stderr.decode(errors='replace').strip())}")
    n = psql("SELECT count(*) FROM pg_tables WHERE schemaname = 'public' AND tableowner = 'barbearia_vila'")
    print(f"restaurado: {n} de {tabelas} tabelas do role {BANCO}")
    print("migracoes:", psql("SELECT string_agg(versao::text, ' ' ORDER BY versao) FROM schema_migrations"))


def main(argv):
    if os.environ.get("BV_DEPLOY_PRODUCAO_AUTORIZADO") != "sim":
        print("recusado: exige BV_DEPLOY_PRODUCAO_AUTORIZADO=sim", file=sys.stderr)
        return 2
    cmd = argv[0] if argv else ""
    try:
        if cmd in ("desligar-origem", "religar-origem") and len(argv) == 1:
            gatilhos(cmd == "religar-origem")
        elif cmd == "dump-origem" and len(argv) == 1:
            dump_origem()
        elif cmd == "restaurar" and len(argv) == 2:
            restaurar(argv[1])
        else:
            print(__doc__, file=sys.stderr)
            return 2
    except Falha as e:
        print(str(e), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
