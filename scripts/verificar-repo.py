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


CHAVES_MIDIA = ("hosts_audio", "hosts_imagem", "mimes_audio", "mimes_imagem", "prefixos_audio", "prefixos_imagem",
                "descricao_max_chars", "audio_max_s", "audio_max_mb", "imagem_max_mb", "max_por_turno", "download_timeout_s",
                "openai_timeout_s", "execucao_timeout_s", "transcricao_modelo", "imagem_detalhe", "retencao_h")
WORKFLOWS_MIDIA = ("workflows/sub/interpretar-midia.json", "workflows/sub/entregar-rajada.json")


def regras_midia(amb, c):
    """contracts/config-midia.md: chaves midia.* nos dois ambientes e suas regras."""
    erros = []
    m = c.get("midia", {})
    for k in CHAVES_MIDIA:
        if k not in m:
            erros.append(f"{amb}: midia.{k} ausente")
    for k in ("hosts_audio", "hosts_imagem"):
        for h in m.get(k, []):
            if not isinstance(h, str) or "/" in h or "://" in h:
                erros.append(f"{amb}: midia.{k} deve ter so o host, sem esquema nem barra ({h!r})")
    for k in ("prefixos_audio", "prefixos_imagem"):
        for x in m.get(k, []):
            if not isinstance(x, str) or not x.startswith("/"):
                erros.append(f"{amb}: midia.{k} deve comecar com '/' ({x!r})")
    d = m.get("descricao_max_chars")
    if "descricao_max_chars" in m and (isinstance(d, bool) or not isinstance(d, int) or d <= 0):
        erros.append(f"{amb}: midia.descricao_max_chars deve ser inteiro > 0")
    ttl = c.get("lock", {}).get("ttl_s")
    if ttl is not None and not m.get("execucao_timeout_s", 0) < ttl:
        erros.append(f"{amb}: midia.execucao_timeout_s deve ser menor que lock.ttl_s")
    if "interpretar_midia" not in c.get("workflows_sub", {}):
        erros.append(f"{amb}: workflows_sub.interpretar_midia ausente")
    t = c.get("textos", {})
    if "midia" in t:
        erros.append(f"{amb}: textos.midia foi substituido por textos.midia_nao_entendida/midia_grande")
    for k in ("midia_nao_entendida", "midia_grande"):
        if not t.get(k):
            erros.append(f"{amb}: textos.{k} ausente")
    return erros


def verificar_workflows(raiz):
    """FR-008/FR-015: sem execucao salva com conteudo de midia e sem errorWorkflow nos workflows que a tocam."""
    erros = []
    for rel in WORKFLOWS_MIDIA:
        with open(os.path.join(raiz, rel), encoding="utf-8") as f:
            st = json.load(f).get("settings", {})
        for k in ("saveDataSuccessExecution", "saveDataErrorExecution"):
            if st.get(k) != "none":
                erros.append(f"{rel}: settings.{k} deve ser 'none'")
        if "errorWorkflow" in st:
            erros.append(f"{rel}: settings.errorWorkflow nao pode existir")
    return erros


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
    for amb, c in cfgs.items():
        erros += regras_midia(amb, c)
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
        erros = verificar(cfgs, f.read()) + verificar_workflows(RAIZ)
    for e in erros:
        print(e)
    print(f"verificar-repo: {len(erros)} violacao(oes)")
    return 1 if erros else 0


if __name__ == "__main__":
    sys.exit(main())
