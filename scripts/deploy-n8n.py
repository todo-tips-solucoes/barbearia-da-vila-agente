"""Publica workflows/<nome>.json no n8n pela API publica: GET -> PUT -> publish por id do config (nunca POST no deploy).
Uso: deploy-n8n.sh integracao [--so NOME] | integracao --criar NOME (so TESTE, uma vez)
     deploy-n8n.sh producao --confirmar-id ID   (exige BV_DEPLOY_PRODUCAO_AUTORIZADO=sim)
N8N_API_URL/N8N_API_KEY do ambiente ou de $BV_ENV_N8N (default .env.n8n, fora do git); nunca impressos.
Exit 0 ok, 1 falha de execucao, 2 uso invalido/alvo recusado."""
import argparse
import json
import os
import re
import sys
import tempfile
import urllib.error
import urllib.parse
import urllib.request

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARQ = {"integracao": "integracao.json", "producao": "producao.json"}


class Falha(Exception):
    pass


class Api:
    def __init__(self, url, chave):
        self.url, self.chave = url.rstrip("/"), chave

    def __call__(self, metodo, rota, corpo=None):
        req = urllib.request.Request(
            self.url + "/api/v1" + rota, method=metodo,
            data=json.dumps(corpo).encode() if corpo is not None else None,
            headers={"X-N8N-API-KEY": self.chave, "Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:  # sem corpo: pode conter dados sensiveis
            raise Falha(f"{metodo} {rota} -> HTTP {e.code}") from None
        except (urllib.error.URLError, OSError) as e:
            raise Falha(f"{metodo} {rota} -> {type(e).__name__}") from None


def renderizar(texto, cfg, raiz):
    """Troca {{BV:a.b}} pelo valor do config, {{BV:INCLUDE:shared/x.js}} pelo arquivo e {{BV:TOKEN_SHA256}} por
    BV_WEBHOOK_TOKEN_SHA256 (de .env.n8n, nunca versionado). Valores entram escapados como conteudo de string JSON.
    "{{BV:NUM:a.b}}" (com aspas) vira o numero cru, para campos que o n8n exige numericos (ex.: executionTimeout)."""
    def num(m):
        v = cfg
        for p in m.group(1).split("."):
            if not isinstance(v, dict) or p not in v:
                raise Falha(f"placeholder {{{{BV:NUM:{m.group(1)}}}}} sem valor no config")
            v = v[p]
        if isinstance(v, bool) or not isinstance(v, int):
            raise Falha(f"placeholder NUM:{m.group(1)} nao e inteiro")
        return str(v)
    texto = re.sub(r'"\{\{BV:NUM:([^}]+)\}\}"', num, texto)

    def sub(m):
        k = m.group(1)
        if k == "TOKEN_SHA256":
            v = os.environ["BV_WEBHOOK_TOKEN_SHA256"]
        elif k.startswith("INCLUDE:"):
            with open(os.path.join(raiz, "workflows", k[8:]), encoding="utf-8") as f:
                v = f.read()
        else:
            v = cfg
            for p in k.split("."):
                if not isinstance(v, dict) or p not in v:
                    raise Falha(f"placeholder {{{{BV:{k}}}}} sem valor no config")
                v = v[p]
        return json.dumps(str(v), ensure_ascii=False)[1:-1]
    return re.sub(r"\{\{BV:([^}]+)\}\}", sub, texto)


def corpo_put(wf):
    return {k: wf[k] for k in ("name", "nodes", "connections")} | {"settings": wf.get("settings", {})}


def etapa(nome, fn, *a):
    try:
        return fn(*a)
    except Falha as e:
        raise Falha(f"etapa {nome}: {e}") from None


def implantar(api, nome, wid, wf):
    """GET -> guarda copia -> PUT -> publish. Falha no publish tenta restaurar o JSON anterior."""
    if not wid:
        raise Falha(f"etapa GET: workflow '{nome}' sem id no config (use --criar na primeira vez)")
    anterior = etapa("GET", api, "GET", f"/workflows/{wid}")
    fd, copia = tempfile.mkstemp(prefix=f"bv-{nome}-", suffix=".json")  # 600, fora do git
    with os.fdopen(fd, "w", encoding="utf-8") as f:
        json.dump(anterior, f)
    etapa("PUT", api, "PUT", f"/workflows/{wid}", corpo_put(wf))
    try:
        api("POST", f"/workflows/{wid}/publish", {})
    except Falha as e:
        try:
            api("PUT", f"/workflows/{wid}", corpo_put(anterior))
            estado = f"JSON anterior restaurado (copia em {copia})"
        except Falha:
            estado = f"restauracao FALHOU; JSON anterior em {copia}"
        raise Falha(f"etapa publish: {e}; {estado}") from None
    os.unlink(copia)
    return wid


def criar(api, cfg, arq_cfg, nome, wf):
    secao = "workflows_sub" if nome in cfg.get("workflows_sub", {}) else "workflows"  # mesmo criterio de main()
    if cfg.get(secao, {}).get(nome):
        raise Falha(f"'{nome}' ja tem id no config; --criar recusado")
    existentes = api("GET", "/workflows?" + urllib.parse.urlencode({"name": wf["name"], "limit": 250})).get("data", [])
    if any(w["name"] == wf["name"] for w in existentes):
        raise Falha(f"ja existe workflow com o nome '{wf['name']}' na instancia; --criar recusado")
    wid = api("POST", "/workflows", corpo_put(wf))["id"]
    cfg.setdefault(secao, {})[nome] = wid
    with open(arq_cfg, "w", encoding="utf-8") as f:
        json.dump(cfg, f, ensure_ascii=False, indent=2)
        f.write("\n")
    return wid


def carregar_env(caminho):
    if os.path.exists(caminho):
        with open(caminho, encoding="utf-8") as f:
            for l in f:
                if "=" in l and not l.startswith("#"):
                    k, v = l.rstrip("\n").split("=", 1)
                    os.environ.setdefault(k, v)


def main(argv=None, raiz=RAIZ, api=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("ambiente", choices=list(ARQ))
    ap.add_argument("--confirmar-id")
    ap.add_argument("--so")
    ap.add_argument("--criar")
    a = ap.parse_args(argv)
    arq_cfg = os.path.join(raiz, "config", "ambientes", ARQ[a.ambiente])
    with open(arq_cfg, encoding="utf-8") as f:
        cfg = json.load(f)
    if a.ambiente == "producao":
        ids = [i for i in cfg["workflows"].values() if i]
        if os.environ.get("BV_DEPLOY_PRODUCAO_AUTORIZADO") != "sim" or not a.confirmar_id or a.confirmar_id not in ids:
            print("producao recusada: exige BV_DEPLOY_PRODUCAO_AUTORIZADO=sim e --confirmar-id igual ao id de PROD do config.",
                  file=sys.stderr)
            return 2
        if a.criar:
            print("--criar so em integracao.", file=sys.stderr)
            return 2
    try:
        carregar_env(os.environ.get("BV_ENV_N8N", os.path.join(raiz, ".env.n8n")))
        api = api or Api(os.environ["N8N_API_URL"], os.environ["N8N_API_KEY"])
        subs = cfg.get("workflows_sub", {})
        todos = {**subs, **cfg["workflows"]}  # sub-workflows primeiro: o principal os referencia
        nomes = [a.criar] if a.criar else [n for n in todos if not a.so or n == a.so]
        if not nomes or (a.so and a.so not in todos):
            raise Falha("nenhum workflow para implantar")
        if a.ambiente == "producao":
            if "bv-captura" in nomes:
                print("producao recusada: bv-captura e so do TESTE.", file=sys.stderr)
                return 2
            if "bv-recepcao" in nomes and not (cfg.get("webhook", {}).get("path") and cfg.get("chatmaster", {}).get("whatsapp_id")):
                print("producao recusada: webhook.path e chatmaster.whatsapp_id devem estar preenchidos.", file=sys.stderr)
                return 2
        for nome in nomes:
            arq = os.path.join(raiz, "workflows", ("sub/" + nome.replace("_", "-") if nome in subs else nome) + ".json")
            with open(arq, encoding="utf-8") as f:
                wf = json.loads(renderizar(f.read(), cfg, raiz))
            if a.criar:
                print(f"{nome} -> {criar(api, cfg, arq_cfg, nome, wf)}")
            else:
                wid = implantar(api, nome, todos.get(nome), wf)
                print(f"Workflow {wid} ({a.ambiente}, {nome}) atualizado e publicado.")
    except KeyError as e:
        print(f"variavel ausente: {e.args[0]} (defina em .env.n8n)", file=sys.stderr)
        return 1
    except (Falha, OSError) as e:
        print(f"falha: {e}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
