"""Unico ponto de acesso ao servidor da stack bv (FR-006/FR-016). Lista fechada de operacoes; o resto e recusado (exit 2).

Desde a migracao de 2026-10-23 (docs/migracao-vps.md) a stack roda neste mesmo servidor, num Swarm: os comandos rodam
num sh local e o container de cada servico e resolvido pelo nome do servico (bv_postgres, bv_redis), nunca fixo.
Segredos ficam em /root/barbearia_vila/infra.env (senhas do Postgres e do Redis), lidos pelo shell e passados ao
container por variavel de ambiente; nunca na linha de comando nem na saida. SQL entra por stdin.
"""
import os
import re
import shlex
import subprocess
import sys


def container(servico):
    """Expressao de shell com o id do container da task em execucao do servico bv_<servico> (o Swarm sorteia o nome)."""
    return f"$(docker ps -q -f name=bv_{servico}. -f status=running | head -1)"


PG, REDIS = container("postgres"), container("redis")
BANCOS = {"barbearia_vila_teste": "PG_TESTE_PASSWORD"}
BANCO_PROD = ("barbearia_vila", "PG_PASSWORD")  # so com BV_DEPLOY_PRODUCAO_AUTORIZADO=sim
INFRA_ENV = "/root/barbearia_vila/infra.env"
BACKUPS = "/root/barbearia_vila/backups"
PREFIXO_ESCRITA = "bv:teste:verif:"
PREFIXO_LIMPEZA = ("bv:teste:", "bv:prod:")  # DEL em lote de limpar-redis; bv:prod: exige a trava
LEITURA = {"SCAN", "GET", "TTL", "EXISTS", "DBSIZE"}
ESCRITA = {"SET", "DEL"}  # so em chave com PREFIXO_ESCRITA
SONDAS = {  # leitura pura; sql roda como superusuario do container postgres
    "connect-n8n": ("psql-admin", "SELECT datname, datacl FROM pg_database WHERE datname='n8n';"),
    "redis-keyspace": ("redis-info", None),
    "backup-existente": ("shell", "ls -la /root/ 2>/dev/null | grep -i -E 'backup|dump' ; "
                                  "crontab -l 2>/dev/null | grep -i -E 'pg_dump|backup' ; true"),
}
# Arquivos de config/vps instalados na VPS (owner, 2026-10-22): origem -> (destino, modo). Nada fora desta lista.
CRONS = {
    "barbearia-backup-limpeza.sh": ("/root/barbearia_vila/barbearia-backup-limpeza.sh", "700"),
    "barbearia-backup-limpeza.cron": ("/etc/cron.d/barbearia-backup-limpeza", "644"),
    "barbearia-limpar-midia.cron": ("/etc/cron.d/barbearia-limpar-midia", "644"),
}
_SEGREDO = re.compile(r"(?i)(password|senha|token|api[_-]?key)\s*[=:]\s*\S+")


class Recusado(Exception):
    pass


def _scrub(txt):
    return _SEGREDO.sub(lambda m: m.group(1) + "=***", txt)


def _prod():
    return os.environ.get("BV_DEPLOY_PRODUCAO_AUTORIZADO") == "sim"


def _banco_var(banco):
    bancos = dict(BANCOS)
    if _prod():
        bancos[BANCO_PROD[0]] = BANCO_PROD[1]
    if banco not in bancos:
        raise Recusado(f"banco nao permitido: {banco}")
    return bancos[banco]


def cmd_psql(banco):
    var = _banco_var(banco)
    return (f"set -a; . {INFRA_ENV}; set +a; "
            f"docker exec -i -e PGPASSWORD=\"${var}\" {PG} "
            f"psql -v ON_ERROR_STOP=1 -q -t -A -U {banco} -d {banco}")


def cmd_pg_dump(banco):
    var = _banco_var(banco)
    return (f"set -a; . {INFRA_ENV}; set +a; "
            f"docker exec -e PGPASSWORD=\"${var}\" {PG} pg_dump -Fc -U {banco} -d {banco}")


def _redis_prefixo(interno):
    return f"set -a; . {INFRA_ENV}; set +a; docker exec -e REDISCLI_AUTH=\"$REDIS_PASSWORD\" {REDIS} sh -c {shlex.quote(interno)}"


def cmd_redis(db, args):
    if not args or not re.fullmatch(r"[A-Za-z]+", args[0]):
        raise Recusado("comando redis invalido")
    verbo = args[0].upper()
    if db in (0, 1) or not 0 <= db <= 15:
        raise Recusado("db invalido (0 e 1 pertencem a outros projetos)")
    if verbo in ESCRITA:
        if len(args) < 2 or (verbo == "SET" and not args[1].startswith(PREFIXO_ESCRITA)) \
                or (verbo == "DEL" and not args[1].startswith(PREFIXO_LIMPEZA)):
            raise Recusado(f"escrita so em chaves {PREFIXO_ESCRITA}* (SET) ou bv:*: (DEL)")
        if verbo == "DEL" and any(not a.startswith(PREFIXO_LIMPEZA) for a in args[1:]):
            raise Recusado("DEL so de chaves bv:teste:/bv:prod:")
        if verbo == "DEL" and any(a.startswith("bv:prod:") for a in args[1:]) and not _prod():
            raise Recusado("producao exige BV_DEPLOY_PRODUCAO_AUTORIZADO=sim")
    elif verbo not in LEITURA:
        raise Recusado(f"verbo redis nao permitido: {verbo}")
    resto = " ".join(shlex.quote(a) for a in [verbo] + list(args[1:]))
    return _redis_prefixo(f"redis-cli --no-auth-warning -n {int(db)} {resto}")


def cmd_sondar(item):
    if item not in SONDAS:
        raise Recusado(f"sonda nao permitida: {item}")
    tipo, corpo = SONDAS[item]
    if tipo == "psql-admin":
        return (f"docker exec -i {PG} sh -c "
                + shlex.quote("psql -v ON_ERROR_STOP=1 -q -t -A -U \"$POSTGRES_USER\" -d postgres")), corpo
    if tipo == "redis-info":
        return _redis_prefixo("redis-cli --no-auth-warning INFO keyspace"), None
    return corpo, None


ALVOS = {"teste": ("barbearia_vila_teste", "PG_TESTE_PASSWORD"), "producao": ("barbearia_vila", "PG_PASSWORD")}
_ADMIN = f"docker exec -i {PG} sh -c " + shlex.quote(
    "psql -v ON_ERROR_STOP=1 -q -t -A -U \"$POSTGRES_USER\" -d postgres")


def _alvo(alvo):
    if alvo not in ALVOS:
        raise Recusado(f"alvo invalido: {alvo}")
    if alvo == "producao" and not _prod():
        raise Recusado("producao exige BV_DEPLOY_PRODUCAO_AUTORIZADO=sim")
    return ALVOS[alvo]


def cmd_preparar(alvo):
    """Script remoto (sh) que cria role+database e fecha CONNECT. A senha nasce e e usada so na VPS (heredoc = builtin,
    fora do argv) e nunca e trocada se ja existe em infra.env. Saida: linhas chave=valor sem segredo."""
    d, var = _alvo(alvo)
    return f"""set -e; umask 077
D=/root/barbearia_vila; F=$D/infra.env
mkdir -p $D; chmod 700 $D; touch $F; chmod 600 $F
if grep -q '^{var}=' $F; then echo credencial=mantida; else printf '{var}=%s\\n' "$(openssl rand -hex 24)" >> $F; echo credencial=gerada; fi
set -a; . $F; set +a; PW=${var}
cat <<EOF | {_ADMIN}
SELECT 'previo role=' || EXISTS(SELECT 1 FROM pg_roles WHERE rolname='{d}') || ' db=' || EXISTS(SELECT 1 FROM pg_database WHERE datname='{d}') || ' publico_conecta=' || EXISTS(SELECT 1 FROM pg_database x, aclexplode(x.datacl) a WHERE x.datname='{d}' AND a.grantee=0 AND a.privilege_type='CONNECT');
SELECT 'CREATE ROLE {d} LOGIN PASSWORD ''$PW''' WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='{d}') \\gexec
SELECT 'CREATE DATABASE {d} OWNER {d}' WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname='{d}') \\gexec
REVOKE CONNECT ON DATABASE {d} FROM PUBLIC;
GRANT CONNECT ON DATABASE {d} TO {d};
EOF
"""


def preparar(alvo):
    """Retorna (n_alteracoes, linhas). 0 alteracoes = tudo ja estava no estado final."""
    out = _ok(*_ssh("sh -c " + shlex.quote(cmd_preparar(alvo))), "preparar")
    alt = out.count("credencial=gerada") + out.count("role=false") + out.count("db=false") + out.count("publico_conecta=true")
    return alt, out.strip().splitlines()


def cmd_acesso_cruzado(alvo, destino):
    """Tenta conectar como o role do alvo em outro database; sucesso = vazamento de acesso."""
    d, var = _alvo(alvo)
    if destino not in ("n8n", "barbearia_vila", "goldincision"):
        raise Recusado(f"destino nao permitido: {destino}")
    return (f"set -a; . {INFRA_ENV}; set +a; docker exec -e PGPASSWORD=\"${var}\" {PG} "
            f"psql -q -t -A -h localhost -U {d} -d {destino} -c 'select 1' 2>&1 | head -2")


def acesso_cruzado(alvo, destino):
    """(negado, msg): negado=True se a conexao nao retornou 1."""
    rc, out, err = _ssh(cmd_acesso_cruzado(alvo, destino))
    return out.strip() != "1", out.strip()[:120]


def _ssh(remoto, stdin=None):
    # nome historico (era ssh para a VPS antiga); hoje roda local, mantido para os chamadores e os mocks dos testes
    r = subprocess.run(["sh", "-c", remoto], input=stdin, capture_output=True, text=True)
    return r.returncode, _scrub(r.stdout), _scrub(r.stderr)


def _ok(rc, out, err, nome):
    if rc:
        raise RuntimeError(f"{nome} falhou (rc={rc}): {err.strip()[:200]}")
    return out


def psql(banco, sql):
    return _ok(*_ssh(cmd_psql(banco), sql), "psql")


def redis(db, *args):
    return _ok(*_ssh(cmd_redis(db, list(args))), "redis")


def sondar(item):
    cmd, stdin = cmd_sondar(item)
    return _ok(*_ssh(cmd, stdin), "sondar")


def pg_dump(banco):
    """Comando remoto do dump -Fc (stdout binario); a gravacao em BACKUPS e do backup-bancos.py (fase 6)."""
    return cmd_pg_dump(banco)


def cmd_instalar(origem):
    """Grava atomico (tmp + mv) com dono root; o .sh passa por sh -n antes de entrar no lugar."""
    destino, modo = CRONS[origem]
    tmp = shlex.quote(destino + ".tmp")
    checa = f"sh -n {tmp} && " if destino.endswith(".sh") else ""
    return f"umask 077; cat > {tmp} && {checa}chown root:root {tmp} && chmod {modo} {tmp} && mv {tmp} {shlex.quote(destino)}"


def instalar_crons(pasta):
    if not _prod():
        raise Recusado("instalar-crons e de PROD: exige BV_DEPLOY_PRODUCAO_AUTORIZADO=sim")
    for origem in CRONS:
        with open(os.path.join(pasta, origem), encoding="utf-8") as f:
            _ok(*_ssh(cmd_instalar(origem), f.read()), f"instalar {origem}")
    return _ok(*_ssh("ls -l " + " ".join(shlex.quote(d) for d, _ in CRONS.values())), "conferir")


def main(argv):
    """Uso: _vps.py psql <banco> < sql | redis <db> <verbo> [args] | sondar <item> | instalar-crons. Fora da lista -> exit 2."""
    try:
        if argv[:1] == ["psql"] and len(argv) == 2:
            sys.stdout.write(psql(argv[1], sys.stdin.read()))
        elif argv[:1] == ["redis"] and len(argv) >= 3:
            sys.stdout.write(redis(int(argv[1]), *argv[2:]))
        elif argv == ["instalar-crons"]:
            sys.stdout.write(instalar_crons(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "config", "vps")))
        elif argv[:1] == ["sondar"] and len(argv) == 2:
            sys.stdout.write(sondar(argv[1]))
        else:
            raise Recusado("uso invalido")
    except (Recusado, ValueError) as e:
        print(f"recusado: {e}", file=sys.stderr)
        return 2
    except RuntimeError as e:
        print(str(e), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
