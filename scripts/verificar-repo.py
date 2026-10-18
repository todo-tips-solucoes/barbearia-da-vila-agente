"""Regras de config/ambientes/*.json (contracts/config-ambiente.md) + ids presentes em docs/infra.md.
Exit 1 com violacoes. Uso (da raiz): python3 -I scripts/verificar-repo.py"""
import json
import os
import re
import sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BANCO = {"integracao": "barbearia_vila_teste", "producao": "barbearia_vila"}
SEGREDO = re.compile(r"(?i)password|senha|token|key|secret")


def percorrer(o, caminho=""):
    """(caminho, chave, valor) de toda folha do JSON."""
    if isinstance(o, dict):
        for k, v in o.items():
            yield from percorrer(v, f"{caminho}.{k}")
            if not isinstance(v, (dict, list)):
                yield f"{caminho}.{k}", k, v
    elif isinstance(o, list):
        for i, v in enumerate(o):
            yield from percorrer(v, f"{caminho}[{i}]")


def verificar(cfgs, infra):
    """cfgs: {ambiente: dict}; infra: texto de docs/infra.md. Retorna lista de violacoes."""
    erros = []
    for amb, c in cfgs.items():
        r = c.get("redis", {})
        if not str(r.get("prefixo", "")).endswith(":"):
            erros.append(f"{amb}: redis.prefixo deve terminar em ':'")
        if r.get("db") in (0, 1):
            erros.append(f"{amb}: redis.db {r.get('db')} reservado a outros projetos")
        if c.get("postgres", {}).get("database") != BANCO.get(amb):
            erros.append(f"{amb}: postgres.database deve ser {BANCO.get(amb)}")
        for caminho, chave, v in percorrer(c):
            if SEGREDO.search(chave):
                erros.append(f"{amb}: chave com nome de segredo em {caminho}")
            eh_id = caminho.endswith(".credencial_id") or caminho.startswith((".credenciais.", ".workflows."))
            if eh_id and isinstance(v, str) and v and v not in infra:
                erros.append(f"{amb}: id de {caminho} ausente em docs/infra.md")
    lk = {a: c.get("lock", {}) for a, c in cfgs.items()}
    for a, l in lk.items():
        if l and l.get("espera_s", 0) * l.get("tentativas", 0) < l.get("ttl_s", 0):
            erros.append(f"{a}: lock.espera_s * lock.tentativas deve ser >= lock.ttl_s")
    paths = {a: c.get("webhook", {}).get("path", "") for a, c in cfgs.items()}
    if paths.get("integracao") and paths.get("integracao") == paths.get("producao"):
        erros.append("webhook.path de integracao e producao devem ser diferentes")
    pre = [(a, c.get("redis", {}).get("prefixo", "")) for a, c in cfgs.items()]
    for i, (a, p) in enumerate(pre):
        for b, q in pre[i + 1:]:
            if p.startswith(q) or q.startswith(p):
                erros.append(f"prefixos de {a} e {b} nao sao disjuntos ({p} vs {q})")
    return erros


def main():
    cfgs = {}
    for amb in BANCO:
        with open(os.path.join(RAIZ, "config", "ambientes", amb + ".json"), encoding="utf-8") as f:
            cfgs[amb] = json.load(f)
    with open(os.path.join(RAIZ, "docs", "infra.md"), encoding="utf-8") as f:
        erros = verificar(cfgs, f.read())
    for e in erros:
        print(e)
    print(f"verificar-repo: {len(erros)} violacao(oes)")
    return 1 if erros else 0


if __name__ == "__main__":
    sys.exit(main())
