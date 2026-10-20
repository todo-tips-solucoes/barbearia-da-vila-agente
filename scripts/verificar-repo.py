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


CHAVES_MENSAGENS = ("ativo", "confirmacao_hora", "lembrete_antes_min", "pos_depois_min", "varredura_s", "reserva_s", "atraso_max_min",
                    "retentativas_min", "reconciliacao_min", "reconciliacao_dias", "espera_texto_s", "titulo_sim", "titulo_nao",
                    "repetida_max_por_hora", "max_por_varredura", "max_por_contato_dia")
TEXTOS_MENSAGENS = ("confirmacao", "lembrete", "pos", "confirmacao_ok", "confirmacao_recusada", "confirmacao_repetida",
                    "confirmacao_desatualizada", "confirmacao_falhou")


def regras_mensagens(amb, c):
    """mensagens-agendadas (FR-020): chaves mensagens.* e textos.*, reserva > timeout HTTP, PROD inativo e sem ids."""
    erros, m, t = [], c.get("mensagens", {}), c.get("textos", {})
    for k in CHAVES_MENSAGENS:
        if k not in m:
            erros.append(f"{amb}: mensagens.{k} ausente")
    for k in TEXTOS_MENSAGENS:
        if not t.get(k):
            erros.append(f"{amb}: textos.{k} ausente")
    if erros:
        return erros
    if not re.fullmatch(r"([01]?\d|2[0-3]):[0-5]\d", str(m["confirmacao_hora"])):
        erros.append(f"{amb}: mensagens.confirmacao_hora deve ser HH:mm")
    r = m["retentativas_min"]
    if not (isinstance(r, list) and r and all(isinstance(x, int) and x > 0 for x in r)):
        erros.append(f"{amb}: mensagens.retentativas_min deve ser lista de inteiros > 0")
    for k in ("varredura_s", "atraso_max_min", "reconciliacao_min", "max_por_varredura", "max_por_contato_dia"):
        if not (isinstance(m[k], int) and m[k] > 0):
            erros.append(f"{amb}: mensagens.{k} deve ser inteiro > 0")
    if not (1 <= m["reconciliacao_dias"] <= 7):
        erros.append(f"{amb}: mensagens.reconciliacao_dias deve estar entre 1 e 7 (limite de /agenda/completa)")
    if m["reserva_s"] * 1000 <= 2 * c.get("graces", {}).get("timeout_ms", 0):  # revalidacao + envio, em sequencia
        erros.append(f"{amb}: mensagens.reserva_s deve ser maior que 2 * graces.timeout_ms (revalidar e enviar)")
    for k in ("titulo_sim", "titulo_nao"):
        if not (0 < len(m[k]) <= c.get("lista", {}).get("max_titulo", 24)) or m[k] != m[k].strip():
            erros.append(f"{amb}: mensagens.{k} deve ter 1..lista.max_titulo caracteres, sem espaco nas pontas")
    if m["titulo_sim"] == m["titulo_nao"]:
        erros.append(f"{amb}: mensagens.titulo_sim e titulo_nao devem ser diferentes")
    if amb == "producao" and (m["ativo"] or c.get("workflows", {}).get("bv-mensagens") or c.get("workflows_sub", {}).get("bv_confirmacao")):
        erros.append("producao: mensagens agendadas devem estar inativas (mensagens.ativo falso, sem ids de bv-mensagens/bv_confirmacao)")
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
        erros += regras_mensagens(amb, c)
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
