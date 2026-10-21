"""Helpers comuns dos smokes (smoke-agente, smoke-recepcao) e da suite-validacao. Sem efeito colateral ao importar.
Segredos: lidos de .env.smoke/.env.n8n na raiz da worktree e, em fallback, no checkout principal; nunca impressos."""
import json
import os
import subprocess
import sys
import urllib.error
import urllib.request

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(RAIZ, "scripts"))
import _vps  # noqa: E402

CFG = json.load(open(os.path.join(RAIZ, "config", "ambientes", "integracao.json"), encoding="utf-8"))
URL = f"{CFG['n8n_url']}/webhook/{CFG['webhook']['path']}"


def _raiz_principal():
    """Checkout principal de uma worktree (dirname do git-common-dir); None fora de git."""
    try:
        r = subprocess.run(["git", "-C", RAIZ, "rev-parse", "--path-format=absolute", "--git-common-dir"],
                           capture_output=True, text=True, timeout=10)
        return os.path.dirname(r.stdout.strip()) if r.returncode == 0 and r.stdout.strip() else None
    except (OSError, subprocess.SubprocessError):
        return None


def carregar_env(*arquivos):
    """Carrega KEY=VAL no os.environ (setdefault: nao sobrescreve). Raiz da worktree primeiro, depois o checkout principal."""
    raizes = [RAIZ]
    principal = _raiz_principal()
    if principal and os.path.abspath(principal) != os.path.abspath(RAIZ):
        raizes.append(principal)
    for raiz in raizes:
        for a in arquivos:
            try:
                with open(os.path.join(raiz, a), encoding="utf-8") as f:
                    for linha in f:
                        k, _, v = linha.strip().partition("=")
                        if k and not k.startswith("#"):
                            os.environ.setdefault(k, v.strip().strip('"').strip("'"))
            except FileNotFoundError:
                pass


def post(corpo, url=URL, raw=None, timeout=120):
    """POST JSON (ou bytes em `raw`). Devolve (status, corpo_texto); HTTPError vira o proprio status."""
    dados = raw if raw is not None else json.dumps(corpo).encode()
    req = urllib.request.Request(url, data=dados, headers={"Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, r.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()


def checar(falhas, nome, ok, detalhe=""):
    print(f"  [{'ok' if ok else 'FALHA'}] {nome} {detalhe}")
    if not ok:
        falhas.append(nome)


def sql(banco, q):
    return _vps.psql(banco, q).strip()


def tel(prefixo, n, largura):
    return f"{prefixo}{n:0{largura}d}"
