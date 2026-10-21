#!/usr/bin/env python3
"""Captura de eventos reais da conexao 145 (Chat Master) pelo workflow bv-captura. So TESTE.

Uso: python3 -I scripts/capturar-webhook.py anotar|trocar|restaurar|fixtures [--ambiente integracao]
     python3 -I scripts/capturar-webhook.py trocar|restaurar --destino recepcao-producao  (exige BV_DEPLOY_PRODUCAO_AUTORIZADO=sim)
  anotar    grava a URL vigente do webhook da 145 em .captura-145.url (600). NAO sobrescreve: idempotente.
  trocar    exige a URL anotada; aponta a 145 para o webhook de captura e confere relendo o status.
  restaurar volta a URL anotada e confere relendo o status (repetivel; mantem o arquivo).
  fixtures  le as execucoes do bv-captura, anonimiza em tests/fixtures/chatmaster/ e apaga as execucoes.
  --destino recepcao-producao: trocar anota a URL vigente em .webhook-145-antes-prod.url (600, uma vez) e aponta a 145
            para a recepcao de PROD (webhook.path do producao.json); restaurar volta a URL anotada.
Token do Chat Master (CHATMASTER_TOKEN_TESTE) e chave do n8n vem de .env.smoke / .env.n8n (ou BV_ENV_N8N); nunca impressos.
Exit 0 ok, 1 falha, 2 uso/alvo recusado (producao)."""
import argparse
import json
import os
import re
import sys
import urllib.error
import urllib.request

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CM = "https://api.chatmasterveloz.com"
CONEXAO = 145
ARQ_URL = ".captura-145.url"
ARQ_PROD = ".webhook-145-antes-prod.url"
PROIBIDO = "n8n.todo-tips.com"  # instancia antiga: nunca destino (so n8n2)


class Falha(Exception):
    pass


def http(metodo, url, cab, corpo=None):
    req = urllib.request.Request(url, method=metodo, headers={"Content-Type": "application/json", "User-Agent": "bv-capturar-webhook/1.0", **cab},
                                 data=json.dumps(corpo).encode() if corpo is not None else None)
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            txt = r.read()
            return json.loads(txt) if txt else {}
    except urllib.error.HTTPError as e:  # sem corpo: pode conter dado sensivel
        raise Falha(f"{metodo} {url.split('?')[0].split('/api')[-1]} -> HTTP {e.code}") from None
    except (urllib.error.URLError, OSError, ValueError) as e:
        raise Falha(f"{metodo} -> {type(e).__name__}") from None


def carregar_env(raiz):
    for c in (os.path.join(raiz, ".env.smoke"), os.environ.get("BV_ENV_N8N", os.path.join(raiz, ".env.n8n"))):
        if os.path.exists(c):
            for l in open(c, encoding="utf-8"):
                if "=" in l and not l.startswith("#"):
                    k, v = l.rstrip("\n").split("=", 1)
                    os.environ.setdefault(k, v)


def url_captura(cfg):
    return f"{cfg['n8n_url']}/webhook/{cfg['captura']['path']}"


def webhook_atual(cm):
    ws = cm("POST", "/api/whatsapp-status").get("whatsapps", [])
    for w in ws:
        if w.get("id") == CONEXAO:
            return w.get("webhook")
    raise Falha(f"conexao {CONEXAO} nao encontrada no status")


def anotar(cm, cfg, raiz):
    arq = os.path.join(raiz, ARQ_URL)
    if os.path.exists(arq):
        return "ja anotada (nao sobrescrita)"
    atual = webhook_atual(cm)
    if not atual:
        raise Falha("a API nao devolveu a URL do webhook: peca ao owner (painel: Conexoes > editar > Integracoes)")
    if atual == url_captura(cfg):
        raise Falha("o webhook vigente ja e o de captura; original desconhecido, peca a URL ao owner")
    fd = os.open(arq, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, "w") as f:
        f.write(atual + "\n")
    return "anotada"


def lido(raiz):
    try:
        return open(os.path.join(raiz, ARQ_URL), encoding="utf-8").read().strip()
    except OSError:
        raise Falha(f"{ARQ_URL} ausente: rode 'anotar' antes") from None


def definir(cm, url):
    cm("POST", "/api/whatsapp/update", {"whatsappId": CONEXAO, "webhook": url})
    if webhook_atual(cm) != url:
        raise Falha("conferencia falhou: o webhook lido nao e o esperado")


def trocar(cm, cfg, raiz):
    lido(raiz)  # nunca trocar sem a original anotada (FR-001)
    definir(cm, url_captura(cfg))
    return "trocado e conferido"


def restaurar(cm, cfg, raiz):
    definir(cm, lido(raiz))
    return "restaurado e conferido"


def url_recepcao_prod(raiz):
    pcfg = json.load(open(os.path.join(raiz, "config", "ambientes", "producao.json"), encoding="utf-8"))
    path = (pcfg.get("webhook") or {}).get("path")
    if not path:
        raise Falha("producao.json sem webhook.path: publique a recepcao de PROD antes")
    url = f"{pcfg['n8n_url'].rstrip('/')}/webhook/{path}"
    if f"//{PROIBIDO}" in url:
        raise Falha(f"destino em {PROIBIDO} recusado")
    return url


def trocar_prod(cm, raiz):
    url, arq = url_recepcao_prod(raiz), os.path.join(raiz, ARQ_PROD)
    atual = webhook_atual(cm)
    if not os.path.exists(arq):  # anota uma vez so: repetir o trocar nunca perde a URL de antes da PROD
        if not atual:
            raise Falha("a API nao devolveu a URL do webhook: peca ao owner antes de trocar")
        fd = os.open(arq, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, "w") as f:
            f.write(atual + "\n")
    definir(cm, url)
    return "145 apontada para a recepcao de PROD e conferida"


def restaurar_prod(cm, raiz):
    try:
        url = open(os.path.join(raiz, ARQ_PROD), encoding="utf-8").read().strip()
    except OSError:
        raise Falha(f"{ARQ_PROD} ausente: nada a restaurar") from None
    definir(cm, url)
    return "145 restaurada para a URL de antes da PROD e conferida"


# ---- fixtures -------------------------------------------------------------------------------
ENUM = re.compile(r"^[A-Za-z][A-Za-z_\-]{0,29}$")
TOKEN = re.compile(r"token|secret|senha|password|authorization", re.I)
# campos estruturais nossos (sem dado pessoal): sobrevivem mesmo aparecendo uma vez so (selectedRowID e o RowId que enviamos)
ESTRUTURAIS = {"acao", "type", "fromMe", "listType", "selectedRowID"}


def caminhos(obj, p=""):
    if isinstance(obj, dict):
        for k, v in obj.items():
            yield from caminhos(v, f"{p}.{k}")
    elif isinstance(obj, list):
        for v in obj:
            yield from caminhos(v, f"{p}[]")
    elif isinstance(obj, str):
        yield p, obj


def anonimizar(obj, comuns, tokens=(), p=""):
    """Preserva estrutura/tipos. String so sobrevive se parecer enum E se repetir em >=2 eventos no mesmo caminho."""
    if isinstance(obj, dict):
        return {k: ("TOKEN_ANONIMIZADO" if TOKEN.search(k) and isinstance(v, str) and v
                    else v if k in ESTRUTURAIS and isinstance(v, str) and (ENUM.match(v) or k == "selectedRowID") and v not in tokens
                    else anonimizar(v, comuns, tokens, f"{p}.{k}"))
                for k, v in obj.items()}
    if isinstance(obj, list):
        return [anonimizar(v, comuns, tokens, f"{p}[]") for v in obj]
    if isinstance(obj, bool) or obj is None:
        return obj
    if isinstance(obj, (int, float)):
        return 0 if abs(obj) >= 10_000_000 else obj
    if isinstance(obj, str):
        if obj in tokens:
            return "TOKEN_ANONIMIZADO"
        if obj[:1] in "{[":  # string que e JSON (mensagem.dataJson): anonimiza por dentro
            try:
                return json.dumps(anonimizar(json.loads(obj), comuns, tokens, p), ensure_ascii=False)
            except ValueError:
                pass
        if (p, obj) in comuns and ENUM.match(obj):
            return obj
        return "x" * min(len(obj), 12) if obj else obj
    return obj


def expandir(obj):
    """Copia com strings-JSON expandidas, para os caminhos de dentro do dataJson contarem em valores_comuns."""
    if isinstance(obj, dict):
        return {k: expandir(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [expandir(v) for v in obj]
    if isinstance(obj, str) and obj[:1] in "{[":
        try:
            return expandir(json.loads(obj))
        except ValueError:
            pass
    return obj


def valores_comuns(eventos):
    conta = {}
    for ev in eventos:
        for par in set(caminhos(expandir(ev))):
            conta[par] = conta.get(par, 0) + 1
    return {par for par, n in conta.items() if n >= 2}


def fixtures(n8n, cfg, raiz, tokens=(), apagar=True):
    wid = cfg["workflows"].get("bv-captura")
    if not wid:
        raise Falha("bv-captura sem id no config")
    lista = n8n("GET", f"/executions?workflowId={wid}&includeData=true&limit=250").get("data", [])
    eventos = []
    for e in lista:
        run = (e.get("data") or {}).get("resultData", {}).get("runData", {})
        for it in (run.get("Webhook") or [{}])[0].get("data", {}).get("main", [[]])[0]:
            eventos.append(it.get("json", {}))
    comuns = valores_comuns(eventos)
    pasta = os.path.join(raiz, "tests", "fixtures", "chatmaster")
    os.makedirs(pasta, exist_ok=True)
    # numera a partir do maior existente: nunca sobrescreve fixture ja revisada
    ja = [int(m.group(1)) for f in os.listdir(pasta) if (m := re.fullmatch(r"evento-(\d+)\.json", f))]
    for i, ev in enumerate(eventos, max(ja, default=0) + 1):
        with open(os.path.join(pasta, f"evento-{i:02d}.json"), "w", encoding="utf-8") as f:
            json.dump(anonimizar(ev, comuns, tokens), f, ensure_ascii=False, indent=2)
            f.write("\n")
    if apagar:
        for e in lista:
            n8n("DELETE", f"/executions/{e['id']}")
    return f"{len(eventos)} evento(s) anonimizado(s) em tests/fixtures/chatmaster/; {len(lista) if apagar else 0} execucao(oes) apagada(s); revise antes de versionar"


def main(argv=None, raiz=RAIZ, cm=None, n8n=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("passo", choices=["anotar", "trocar", "restaurar", "fixtures"])
    ap.add_argument("--ambiente", default="integracao")
    ap.add_argument("--manter", action="store_true", help="fixtures: nao apagar as execucoes brutas (apos revisar, rode sem --manter)")
    ap.add_argument("--destino", choices=["captura", "recepcao-producao"], default="captura")
    a = ap.parse_args(argv)
    if a.destino == "recepcao-producao":
        if a.passo not in ("trocar", "restaurar") or os.environ.get("BV_DEPLOY_PRODUCAO_AUTORIZADO") != "sim":
            print("recepcao-producao: so trocar/restaurar e exige BV_DEPLOY_PRODUCAO_AUTORIZADO=sim.", file=sys.stderr)
            return 2
        try:
            carregar_env(raiz)
            tok = os.environ.get("CHATMASTER_TOKEN_TESTE", "")  # mesma conexao 145 (owner, 2026-10-21)
            cm = cm or (lambda m, r, c=None: http(m, CM + r, {"Authorization": f"Bearer {tok}"}, c))
            print((trocar_prod if a.passo == "trocar" else restaurar_prod)(cm, raiz))
        except (Falha, OSError, KeyError) as e:
            print(f"falha: {e}", file=sys.stderr)
            return 1
        return 0
    if a.ambiente != "integracao":
        print("captura recusada: so no TESTE (integracao).", file=sys.stderr)
        return 2
    try:
        cfg = json.load(open(os.path.join(raiz, "config", "ambientes", "integracao.json"), encoding="utf-8"))
        carregar_env(raiz)
        tok = os.environ.get("CHATMASTER_TOKEN_TESTE", "")
        cm = cm or (lambda m, r, c=None: http(m, CM + r, {"Authorization": f"Bearer {tok}"}, c))
        if a.passo == "fixtures":
            n8n = n8n or (lambda m, r, c=None: http(m, os.environ["N8N_API_URL"].rstrip("/") + "/api/v1" + r,
                                                   {"X-N8N-API-KEY": os.environ["N8N_API_KEY"]}, c))
            print(fixtures(n8n, cfg, raiz, tokens=tuple(t for t in (tok,) if t), apagar=not a.manter))
        else:
            print({"anotar": anotar, "trocar": trocar, "restaurar": restaurar}[a.passo](cm, cfg, raiz))
    except KeyError as e:
        print(f"variavel ausente: {e.args[0]}", file=sys.stderr)
        return 1
    except (Falha, OSError) as e:
        print(f"falha: {e}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
