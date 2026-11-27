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
    # Ok do owner em 2026-11-15: lembretes de 24 h e 1 h no Chat Master ligados em PROD; so os tipos novos sao programados
    if m["ativo"] and not m.get("lembretes"):
        erros.append(f"{amb}: mensagens.ativo exige mensagens.lembretes (sem ela voltariam os tipos do envio proprio)")
    return erros


def regras_rodizio(amb, c):
    """Fila da vez (26/11/2026): graces.rodizio.ligado (boolean) e janela_dias (inteiro 1..365) nos dois ambientes."""
    r = c.get("graces", {}).get("rodizio")
    if not isinstance(r, dict):
        return [f"{amb}: graces.rodizio ausente"]
    erros = []
    if not isinstance(r.get("ligado"), bool):
        erros.append(f"{amb}: graces.rodizio.ligado deve ser boolean")
    j = r.get("janela_dias")
    if isinstance(j, bool) or not isinstance(j, int) or not 1 <= j <= 365:
        erros.append(f"{amb}: graces.rodizio.janela_dias deve ser inteiro entre 1 e 365")
    return erros


def regras_habitual(amb, c):
    """Barbeiro habitual (26/11/2026): graces.habitual.visitas, inteiro entre 1 e 20 (1 = so a ultima visita)."""
    v = c.get("graces", {}).get("habitual", {}).get("visitas")
    if isinstance(v, bool) or not isinstance(v, int) or not 1 <= v <= 20:
        return [f"{amb}: graces.habitual.visitas deve ser inteiro entre 1 e 20"]
    return []


def regras_convite(amb, c):
    """Convite de volta (27/11/2026): bloco `convite` e textos nos dois ambientes; em producao nasce desligado ate o owner ligar."""
    v, t, erros = c.get("convite"), c.get("textos", {}), []
    if not isinstance(v, dict):
        return [f"{amb}: convite ausente"]
    if not isinstance(v.get("ativo"), bool):
        erros.append(f"{amb}: convite.ativo deve ser boolean")
    faixas = {"dias_min": (7, 120), "dias_max": (7, 120), "intervalo_min": (1, 60), "max_por_dia": (1, 100), "falhas_max_hora": (1, 20), "sem_conversa_dias": (0, 30), "resposta_max_dias": (1, 30)}
    for k, (lo, hi) in faixas.items():
        x = v.get(k)
        if isinstance(x, bool) or not isinstance(x, int) or not lo <= x <= hi:
            erros.append(f"{amb}: convite.{k} deve ser inteiro entre {lo} e {hi}")
    if not erros and v["dias_min"] > v["dias_max"]:
        erros.append(f"{amb}: convite.dias_min maior que dias_max")
    for k in ("hora_inicio", "hora_fim"):
        if not re.fullmatch(r"[0-2]\d:[0-5]\d", str(v.get(k, ""))):
            erros.append(f"{amb}: convite.{k} deve ser HH:MM")
    d = v.get("dias_semana")
    if not isinstance(d, list) or not d or any(isinstance(x, bool) or not isinstance(x, int) or not 1 <= x <= 7 for x in d):
        erros.append(f"{amb}: convite.dias_semana deve ser lista de 1 (segunda) a 7 (domingo)")
    # sem "?" (saida com pergunta dispara a retomada e conta no laco) e sem barbeiro (clausula petrea: o convite nao cita ninguem)
    for k in ("convite", "convite_pacote", "convite_pacote_uma"):
        x = str(t.get(k, ""))
        if not x or "?" in x or "{barbeiro}" in x:
            erros.append(f"{amb}: textos.{k} ausente, com '?' ou citando barbeiro")
    if "{nome}" not in str(t.get("convite", "")) or "{pacote}" not in str(t.get("convite", "")) or "{sessoes}" not in str(t.get("convite_pacote", "")):
        erros.append(f"{amb}: textos.convite precisa de {{nome}} e {{pacote}}, e textos.convite_pacote de {{sessoes}}")
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
        erros += regras_rodizio(amb, c)
        erros += regras_habitual(amb, c)
        erros += regras_convite(amb, c)
    lk = {a: c.get("lock", {}) for a, c in cfgs.items()}
    for a, l in lk.items():
        if l and l.get("espera_s", 0) * l.get("tentativas", 0) < l.get("ttl_s", 0):
            erros.append(f"{a}: lock.espera_s * lock.tentativas deve ser >= lock.ttl_s")
        # o turno tem de terminar (ou ser cancelado) antes de a posse do contato expirar: senao outro turno reentrega as mesmas
        # mensagens e a resposta sai em dobro (revisao de 17/11)
        t = cfgs[a].get("execucao", {}).get("turno_timeout_s")
        if l and t is not None and not t < l.get("ttl_s", 0):
            erros.append(f"{a}: execucao.turno_timeout_s deve ser menor que lock.ttl_s")
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
