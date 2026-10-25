"""Cria no n8n as credenciais Postgres e Redis do alvo (nome existente -> pula). Imprime so `nome -> id`.
Uso: --alvo teste|producao. API key: N8N_API_URL/N8N_API_KEY de $BV_ENV_N8N (default .env.n8n, fora do git).
Senhas: lidas do infra.env do servidor e enviadas direto ao n8n; nunca impressas."""
import argparse
import json
import os
import re
import sys
import urllib.error
import urllib.request

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(RAIZ, "scripts"))
import _vps

ARQ = {"teste": "integracao.json", "producao": "producao.json"}
NOMES = {"teste": "Barbearia Vila Postgres TESTE", "producao": "Barbearia Vila Postgres PROD"}
NOME_REDIS = "Barbearia Vila Redis"
NOME_VERIF = "Barbearia Vila Verificacao"  # so TESTE (webhook bv-verificacao); token nasce e fica em infra.env na VPS
NOME_OPENAI, NOME_GRACES, NOME_CHAT = "Barbearia Vila OpenAI", "Barbearia Vila Graces", "Barbearia Vila Chat Master"
# Chaves do agente em .env.smoke (fora do git); so o TESTE as recebe (a Graces so existe em prod, a chave serve ao teste).
CHAVES_APP = ("OPENAI_API_KEY", "GRACES_API_KEY", "CHATMASTER_TOKEN_TESTE")
# Host/porta dentro da rede docker da stack n8n (documentado em docs/infra.md).
PG_HOST, PG_PORT, REDIS_HOST, REDIS_PORT = "postgres", 5432, "redis", 6379


def ler_env(caminho):
    with open(caminho, encoding="utf-8") as f:
        return dict(l.rstrip("\n").split("=", 1) for l in f if "=" in l and not l.startswith("#"))


def api(env, metodo, caminho, corpo=None):
    req = urllib.request.Request(
        env["N8N_API_URL"] + "/api/v1" + caminho, method=metodo,
        data=json.dumps(corpo).encode() if corpo is not None else None,
        headers={"X-N8N-API-KEY": env["N8N_API_KEY"], "Content-Type": "application/json"})
    with urllib.request.urlopen(req) as r:
        return json.load(r)


def segredos_vps(alvo):
    """(senha_postgres, senha_redis, token_verificacao|"") lidas na VPS; nada vai para stdout."""
    _d, var = _vps._alvo(alvo)
    tok = ("grep -q '^BV_VERIFICACAO_TOKEN=' {f} || printf 'BV_VERIFICACAO_TOKEN=%s\\n' \"$(openssl rand -hex 32)\" >> {f}; "
           .format(f=_vps.INFRA_ENV) if alvo == "teste" else "")
    rc, out, err = _vps._ssh(
        f"umask 077; {tok}set -a; . {_vps.INFRA_ENV}; set +a; printf '%s\\n' \"${var}\"; "
        f"printf '%s\\n' \"$REDIS_PASSWORD\"; "
        f"printf '%s\\n' \"${{BV_VERIFICACAO_TOKEN:-}}\"")
    linhas = out.split("\n")
    if rc or len(linhas) < 3 or not linhas[0] or not linhas[1] or (alvo == "teste" and not linhas[2]):
        raise RuntimeError("segredos nao encontrados na VPS")
    return linhas[0], linhas[1], linhas[2]


def segredos_app():
    """(openai, graces, chatmaster) de $BV_ENV_SMOKE (default .env.smoke)."""
    env = ler_env(os.environ.get("BV_ENV_SMOKE", os.path.join(RAIZ, ".env.smoke")))
    return tuple(env[k] for k in CHAVES_APP)


def montar(alvo, cfg, pg_pw, redis_pw, token="", app=None):
    d = _vps.ALVOS[alvo][0]
    return [
        {"name": NOMES[alvo], "type": "postgres", "data": {
            "host": PG_HOST, "port": PG_PORT, "database": d, "user": d, "password": pg_pw,
            "ssl": "disable", "allowUnauthorizedCerts": False, "sshTunnel": False}},
        {"name": NOME_REDIS, "type": "redis", "data": {
            "host": REDIS_HOST, "port": REDIS_PORT, "database": cfg["redis"]["db"],
            "password": redis_pw, "ssl": False}},
    ] + ([{"name": NOME_VERIF, "type": "httpHeaderAuth", "data": {"name": "X-BV-Token", "value": token}}]
         if alvo == "teste" else []) + ([
        {"name": NOME_OPENAI, "type": "openAiApi", "data": {"apiKey": app[0]}},
        {"name": NOME_GRACES, "type": "httpHeaderAuth", "data": {"name": "X-Api-Key", "value": app[1]}},
        {"name": NOME_CHAT, "type": "httpHeaderAuth", "data": {"name": "Authorization", "value": "Bearer " + app[2]}},
    ] if alvo == "teste" and app else [])


def criar(env, creds, http=api):
    """Retorna lista de (nome, id|None, pulada). Nome existente nao e recriado."""
    existentes = {c["name"]: c["id"] for c in http(env, "GET", "/credentials?limit=250").get("data", [])}
    res = []
    for c in creds:
        if c["name"] in existentes:
            res.append((c["name"], existentes[c["name"]], True))
        else:
            res.append((c["name"], http(env, "POST", "/credentials", c)["id"], False))
    return res


def main(argv, http=api, segredos=segredos_vps, app_segredos=segredos_app):
    ap = argparse.ArgumentParser()
    ap.add_argument("--alvo", default="teste", choices=list(ARQ))
    a = ap.parse_args(argv)
    try:
        _vps._alvo(a.alvo)  # trava de PROD antes de qualquer chamada remota
        env = ler_env(os.environ.get("BV_ENV_N8N", os.path.join(RAIZ, ".env.n8n")))
        with open(os.path.join(RAIZ, "config", "ambientes", ARQ[a.alvo]), encoding="utf-8") as f:
            cfg = json.load(f)
        pg_pw, redis_pw, token = segredos(a.alvo)
        app = app_segredos() if a.alvo == "teste" else None
        for nome, cid, pulada in criar(env, montar(a.alvo, cfg, pg_pw, redis_pw, token, app), http):
            print(f"{nome} -> {cid}" + (" (ja existia, pulada)" if pulada else ""))
    except _vps.Recusado as e:
        print(f"recusado: {e}", file=sys.stderr)
        return 2
    except (RuntimeError, OSError, KeyError, urllib.error.HTTPError) as e:
        # HTTPError.read() nao e impresso: o corpo pode ecoar o payload.
        print(f"falhou: {type(e).__name__}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
