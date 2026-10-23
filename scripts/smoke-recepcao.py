"""Smoke da recepcao-buffer no TESTE (C2-C5, FR-021). So contatos sinteticos +55000000xxxx; so barbearia_vila_teste e Redis de TESTE.
Uso: python3 -I scripts/smoke-recepcao.py [recepcao|duplicidade|limite|rajada|posse|concorrencia|falha|gravacao|dedupe|redis|ttl|teto ...] | --limpar
Sem argumentos roda tudo (exceto teto ~80 s e ttl ~5 min: peca por nome) e limpa no fim. Token vem de .env.smoke (nunca impresso).
Exit 1 se algum cenario falhar."""
import copy
import importlib.util
import json
import os
import sys
import threading
import time
import urllib.error
import urllib.request

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(RAIZ, "scripts"))
import _smoke  # noqa: E402
import _vps  # noqa: E402

BANCO = "barbearia_vila_teste"
PREFIXO_TEL = "+55000000"
FIX = os.path.join(RAIZ, "tests", "fixtures", "chatmaster")
CFG, URL = _smoke.CFG, _smoke.URL
_falhas = []
INICIO = int(time.time()) - 5


_env = _smoke.carregar_env


def tel(n):
    return _smoke.tel(PREFIXO_TEL, n, 4)


def fixture(nome):
    return copy.deepcopy(json.load(open(os.path.join(FIX, nome), encoding="utf-8"))["body"])


def evento_texto(n, texto):
    b = fixture("evento-02.json")
    b.update(sender=tel(n), token_origin=TOKEN)
    b["mensagem"][0]["text"] = texto
    return b


def evento_imagem(n, url):
    b = fixture("evento-13.json")
    b.update(sender=tel(n), token_origin=TOKEN)
    b["mensagem"][0]["fileUrl"] = url
    return b


def post(corpo, raw=None):
    return _smoke.post(corpo, raw=raw, timeout=30)[0]


def linhas():
    """Mensagens de entrada dos contatos sinteticos (a resposta do agente nao conta): dicts com telefone, id, tipo, turno_id, criado/turno/proc em epoch."""
    sql = ("SELECT c.telefone, m.id, m.tipo, coalesce(m.turno_id::text,''), extract(epoch from m.criado_em), "
           "coalesce(extract(epoch from m.turno_em)::text,''), coalesce(extract(epoch from m.processada_em)::text,'') "
           f"FROM mensagens m JOIN contatos c ON c.id=m.contato_id WHERE c.telefone LIKE '{PREFIXO_TEL}%' AND m.direcao = 'entrada' ORDER BY m.id;")
    out = []
    for l in _vps.psql(BANCO, sql).strip().splitlines():
        t, i, tp, tu, cr, te, pr = l.split("|")
        out.append(dict(tel=t, id=int(i), tipo=tp, turno=tu, criado=float(cr),
                        turno_em=float(te) if te else None, proc=float(pr) if pr else None))
    return out


def esperar(cond, limite_s, passo=1.5):
    fim = time.time() + limite_s
    while time.time() < fim:
        ls = linhas()
        if cond(ls):
            return ls
        time.sleep(passo)
    return linhas()


def turnos(ls, telefone=None):
    """{turno_id: [linhas]} dos entregues (turno e processada preenchidos)."""
    t = {}
    for l in ls:
        if l["turno"] and l["proc"] and (telefone is None or l["tel"] == telefone):
            t.setdefault(l["turno"], []).append(l)
    return t


def latencia(turno):
    return min(l["turno_em"] for l in turno) - max(l["criado"] for l in turno)


def checar(nome, ok, detalhe=""):
    _smoke.checar(_falhas, nome, ok, detalhe)


def recepcao():
    print("C2 recepcao e descarte")
    checar("401 sem token valido", post({**evento_texto(1, "x"), "token_origin": "invalido"}) == 401)
    checar("400 malformado", post({"acao": "start", "token_origin": TOKEN, "mensagem": [{"type": "text", "text": "x"}]}) == 400)
    checar("200 loja (fromMe)", post({**evento_texto(1, "loja"), "fromMe": True}) == 200)
    checar("200 from_internal", post({**fixture("evento-01.json"), "sender": tel(1), "token_origin": TOKEN}) == 200)
    checar("200 grupo", post({**evento_texto(1, "grupo"), "isGroup": True}) == 200)
    checar("200 texto", post(evento_texto(1, "smoke texto")) == 200)
    checar("200 imagem", post(evento_imagem(1, "https://exemplo.invalid/smoke-img-c2.jpg")) == 200)
    ls = esperar(lambda x: len([l for l in x if l["tel"] == tel(1)]) >= 2, 20)
    tipos = sorted(l["tipo"] for l in ls if l["tel"] == tel(1))
    checar("so texto e imagem viraram linha", tipos == ["imagem", "texto"], str(tipos))


def duplicidade():
    print("C5 duplicidade (imagem: id = fileUrl; texto sem id, dec-031)")
    e = evento_imagem(2, "https://exemplo.invalid/smoke-dup.jpg")
    checar("200 duas vezes", post(e) == 200 and post(e) == 200)
    time.sleep(3)
    n = len([l for l in linhas() if l["tel"] == tel(2)])
    checar("uma linha so", n == 1, f"linhas={n}")


def limite():
    print("C6 payload acima do limite")
    mb = CFG["payload"]["max_kb"] * 1024
    corpo = evento_texto(3, "a" * (mb + 1024))
    s = post(corpo)
    checar("recusado (400/413)", s in (400, 413), f"status={s}")


def rajada():
    print("C3 rajada: 3 textos (2 s) + outro contato")
    post(evento_texto(10, "r1"))
    t = threading.Thread(target=post, args=(evento_texto(11, "outro"),))
    t.start()
    time.sleep(2)
    post(evento_texto(10, "r2"))
    time.sleep(2)
    post(evento_texto(10, "r3"))
    t.join()
    ls = esperar(lambda x: len(turnos(x, tel(10))) >= 1 and len(turnos(x, tel(11))) >= 1, 40)
    a, b = turnos(ls, tel(10)), turnos(ls, tel(11))
    checar("um turno de 3 mensagens", len(a) == 1 and len(list(a.values())[0]) == 3, str({k[:6]: len(v) for k, v in a.items()}))
    if a:
        tr = list(a.values())[0]
        checar("ordem de chegada", [l["id"] for l in tr] == sorted(l["id"] for l in tr))
        lat = latencia(tr)
        checar("entrega entre 8 e 10 s apos a 3a", 8 <= lat <= 10.5, f"{lat:.1f}s")
    checar("outro contato com turno proprio", len(b) == 1 and not set(a) & set(b))


def posse():
    print("C4 um turno por vez (stub atrasa)")
    post(evento_texto(20, "p1"))
    ls = esperar(lambda x: any(l["tel"] == tel(20) and l["turno_em"] for l in x), 30)
    post(evento_texto(20, "p2"))  # chega com o 1o turno em curso
    ls = esperar(lambda x: len(turnos(x, tel(20))) >= 2, 60)
    t = sorted(turnos(ls, tel(20)).values(), key=lambda v: v[0]["turno_em"])
    checar("dois turnos", len(t) == 2)
    if len(t) == 2:
        checar("2o turno comeca apos processada_em do 1o", t[1][0]["turno_em"] >= t[0][0]["proc"] - 0.05)
        checar("nenhuma perda", sum(len(v) for v in t) == 2)


def concorrencia():
    print("C4 50 mensagens concorrentes em 10 contatos")
    ths = [threading.Thread(target=post, args=(evento_texto(100 + i % 10, f"c{i}"),)) for i in range(50)]
    for t in ths:
        t.start()
    for t in ths:
        t.join()
    pend = lambda x: [l for l in x if int(l["tel"][-4:]) in range(100, 110) and not l["proc"]]
    ls = esperar(lambda x: not pend(x) and len([l for l in x if int(l["tel"][-4:]) in range(100, 110)]) >= 50, 120)
    mine = [l for l in ls if int(l["tel"][-4:]) in range(100, 110)]
    checar("50 linhas, todas entregues", len(mine) == 50 and not pend(ls), f"linhas={len(mine)} pendentes={len(pend(ls))}")
    over = 0
    lats = []
    for n in range(100, 110):
        t = sorted(turnos(mine, tel(n)).values(), key=lambda v: v[0]["turno_em"])
        for a, b in zip(t, t[1:]):
            over += b[0]["turno_em"] < a[0]["proc"] - 0.05
        lats += [latencia(v) for v in t]
    checar("nunca dois turnos sobrepostos por contato", over == 0, f"sobreposicoes={over}")
    if lats:
        dentro = sum(8 <= x <= 10.5 for x in lats) / len(lats)
        print(f"  latencia por turno: min {min(lats):.1f}s max {max(lats):.1f}s; {dentro:.0%} entre 8 e 10,5 s ({len(lats)} turnos)")


def falhas_de(telefone):
    sql = ("SELECT f.tipo||'|'||f.motivo FROM falhas_recepcao f JOIN contatos c ON c.id=f.contato_id "
           f"WHERE c.telefone='{telefone}' ORDER BY f.id;")
    return _vps.psql(BANCO, sql).strip().splitlines()


def contato_id(telefone):
    return _vps.psql(BANCO, f"SELECT id FROM contatos WHERE telefone='{telefone}';").strip()


def posse_existe(telefone):
    return _vps.redis(CFG["redis"]["db"], "EXISTS", f"{CFG['redis']['prefixo']}lock:{contato_id(telefone)}").strip() == "1"


def falha():
    print("SC-007 falha forcada de entrega (stub devolve ok:false para __falha__)")
    post(evento_texto(40, "__falha__ teste"))
    ls = esperar(lambda x: any(l["tel"] == tel(40) and l["turno_em"] for l in x), 30)
    fim = time.time() + 30
    while time.time() < fim and not falhas_de(tel(40)):
        time.sleep(1.5)
    ls = [l for l in linhas() if l["tel"] == tel(40)]
    checar("mensagem volta a pendente", len(ls) == 1 and not ls[0]["proc"] and not ls[0]["turno"], str(len(ls)))
    checar("falha registrada sem conteudo", falhas_de(tel(40)) == ["entrega|entrega_falhou"], str(falhas_de(tel(40))))
    checar("posse liberada pelo dono", not posse_existe(tel(40)))


def _api_deploy():
    spec = importlib.util.spec_from_file_location("deploy_n8n", os.path.join(RAIZ, "scripts", "deploy-n8n.py"))
    d = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(d)
    return d, d.Api(os.environ["N8N_API_URL"], os.environ["N8N_API_KEY"])


def gravacao():
    print("S1/S2 resposta so apos gravar; falha de gravacao (senha invalida so na credencial do no, temporaria, apagada no fim)")
    d, api = _api_deploy()
    wid = CFG["workflows"]["bv-recepcao"]
    ok = post(evento_texto(60, "grava antes de confirmar")) == 200
    checar("S1 200 e a linha ja existe ao receber o 200", ok and len([l for l in linhas() if l["tel"] == tel(60)]) == 1)
    cid = api("POST", "/credentials", {"name": "Barbearia Vila Postgres INVALIDA (smoke)", "type": "postgres", "data": {
        "host": "postgres", "port": 5432, "database": BANCO, "user": BANCO, "password": "senha-invalida-smoke",
        "ssl": "disable", "allowUnauthorizedCerts": False, "sshTunnel": False}})["id"]

    def trocar(nomes):
        wf = api("GET", f"/workflows/{wid}")
        for n in wf["nodes"]:
            if n["name"] in nomes:
                n["credentials"]["postgres"] = {"id": cid, "name": "Barbearia Vila Postgres INVALIDA (smoke)"}
        api("PUT", f"/workflows/{wid}", d.corpo_put(wf))
        api("POST", f"/workflows/{wid}/publish", {})
        time.sleep(2)
    try:
        trocar({"Inserir mensagem"})
        checar("S2 500 com a gravacao fora", post(evento_texto(61, "falha gravacao")) == 500)
        checar("S2 0 linhas em mensagens", not [l for l in linhas() if l["tel"] == tel(61)])
        checar("S2 falha registrada sem conteudo", falhas_de(tel(61)) == ["gravacao|mensagem_falhou"], str(falhas_de(tel(61))))
        trocar({"Inserir mensagem", "Registrar falha mensagem"})
        checar("S2 500 mesmo sem registrar a falha (FR-004)", post(evento_texto(62, "falha dupla")) == 500)
    finally:
        rc = d.main(["integracao", "--so", "bv-recepcao"])  # restaura o JSON versionado
        checar("workflow restaurado", rc == 0)
        if rc == 0:
            api("DELETE", f"/credentials/{cid}")
        else:
            print("  ATENCAO: credencial invalida mantida (workflow ainda a referencia); restaure e apague a mao.")
    time.sleep(2)
    checar("S2 reenvio grava uma vez", post(evento_texto(61, "falha gravacao")) == 200
           and len([l for l in linhas() if l["tel"] == tel(61)]) == 1)


def dedupe():
    print("S4 dedupe por conteudo (janela dedup.conteudo_janela_s = %s s)" % CFG["dedup"]["conteudo_janela_s"])
    janela, n = CFG["dedup"]["conteudo_janela_s"], 20
    base = 200  # fora de 100-109 (concorrencia)
    for i in range(n):  # pares iguais dentro da janela
        post(evento_texto(base + i, "ok dedupe"))
        post(evento_texto(base + i, "ok dedupe"))
    for i in range(n):  # texto diferente no mesmo contato (a); mesmo texto em contatos diferentes (b)
        post(evento_texto(base + n + i, "um"))
        post(evento_texto(base + n + i, "dois"))
        post(evento_texto(base + 2 * n + i, "ok dedupe"))
    for i in range(n):  # fora da janela: primeiro envio agora, segundo depois
        post(evento_texto(base + 3 * n + i, "depois da janela"))
    time.sleep(janela + 1)
    for i in range(n):
        post(evento_texto(base + 3 * n + i, "depois da janela"))
    ls = linhas()
    por = lambda k: [len([l for l in ls if l["tel"] == tel(base + k * n + i)]) for i in range(n)]
    checar("20 pares iguais na janela: 20 descartadas", por(0) == [1] * n, str(por(0)))
    checar("textos diferentes: 0 descartadas", por(1) == [2] * n, str(por(1)))
    checar("mesmo texto, contatos diferentes: 0 descartadas", por(2) == [1] * n, str(por(2)))
    checar("fora da janela: 0 descartadas", por(3) == [2] * n, str(por(3)))
    cols = _vps.psql(BANCO, "SELECT string_agg(column_name, ',' ORDER BY ordinal_position) FROM information_schema.columns "
                            "WHERE table_name='marcas_conteudo';").strip()
    checar("marcas sem texto nem telefone", cols == "contato_id,hash_conteudo,visto_em", cols)
    img = [post(evento_imagem(base + 4 * n, "https://exemplo.invalid/dedupe-midia.jpg")) for _ in range(2)]
    checar("midia segue a regra por id (1 linha)", img == [200, 200] and
           len([l for l in linhas() if l["tel"] == tel(base + 4 * n)]) == 1)


def redis():
    print("S3 Redis pendurado (senha invalida so na credencial do workflow de TESTE; executionTimeout reduzido a 20 s so durante o cenario; Redis compartilhado intocado)")
    T = 20
    spec = importlib.util.spec_from_file_location("deploy_n8n", os.path.join(RAIZ, "scripts", "deploy-n8n.py"))
    d = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(d)
    api = d.Api(os.environ["N8N_API_URL"], os.environ["N8N_API_KEY"])
    wid = CFG["workflows"]["bv-recepcao"]
    cid = api("POST", "/credentials", {"name": "Barbearia Vila Redis INVALIDA (smoke)", "type": "redis", "data": {
        "host": "redis", "port": 6379, "database": CFG["redis"]["db"], "password": "senha-invalida-smoke", "ssl": False}})["id"]
    try:
        wf = api("GET", f"/workflows/{wid}")
        wf["settings"]["executionTimeout"] = T
        for n in wf["nodes"]:
            if "redis" in n.get("credentials", {}):
                n["credentials"]["redis"] = {"id": cid, "name": "Barbearia Vila Redis INVALIDA (smoke)"}
        api("PUT", f"/workflows/{wid}", d.corpo_put(wf))
        api("POST", f"/workflows/{wid}/publish", {})
        time.sleep(2)
        t0 = time.time()
        checar("200 so apos gravar, mesmo sem Redis", post(evento_texto(50, "sem redis")) == 200)
        vistas = False
        while time.time() - t0 < T + 15:  # webhook ate a execucao sair de running (canceled)
            run = [e for e in api("GET", f"/executions?workflowId={wid}&status=running&limit=50").get("data", [])]
            vistas = vistas or bool(run)
            if vistas and not run:
                break
            time.sleep(0.5)
        dur = time.time() - t0
        checar(f"execucao encerrada em <= {T}+2 s", vistas and dur <= T + 2, f"{dur:.1f}s")
        ls = [l for l in linhas() if l["tel"] == tel(50)]
        checar("mensagem gravada e pendente", len(ls) == 1 and not ls[0]["proc"] and not ls[0]["turno"], str(len(ls)))
        cid_c = contato_id(tel(50))
        checar("tentativa em curso aberta", _vps.psql(BANCO, f"SELECT count(*) FROM tentativas_recepcao t JOIN mensagens m ON m.id=t.mensagem_id WHERE m.contato_id={cid_c};").strip() == "1")
        # o vigia roda a cada 5 min; envelhece a tentativa (a margem real e execucao.timeout_s + 30 s) e espera o proximo ciclo
        _vps.psql(BANCO, f"UPDATE tentativas_recepcao SET iniciada_em = now() - interval '1 hour' WHERE mensagem_id IN (SELECT id FROM mensagens WHERE contato_id={cid_c});")
        esperar_f = time.time() + 330
        while time.time() < esperar_f and "redis_indisponivel|tempo_esgotado" not in falhas_de(tel(50)):
            time.sleep(10)
        checar("vigia registrou redis_indisponivel|tempo_esgotado", "redis_indisponivel|tempo_esgotado" in falhas_de(tel(50)), str(falhas_de(tel(50))))
        checar("tentativa baixada pelo vigia", _vps.psql(BANCO, f"SELECT count(*) FROM tentativas_recepcao t JOIN mensagens m ON m.id=t.mensagem_id WHERE m.contato_id={cid_c};").strip() == "0")
    finally:
        rc = d.main(["integracao", "--so", "bv-recepcao"])  # restaura o JSON versionado (inclui o executionTimeout)
        for e in api("GET", "/executions?status=running&limit=100").get("data", []):  # presas na credencial invalida
            if e["workflowId"] == wid:
                api("POST", f"/executions/{e['id']}/stop", {})
        checar("workflow restaurado", rc == 0)
        if rc == 0:
            api("DELETE", f"/credentials/{cid}")
        else:
            print("  ATENCAO: credencial invalida mantida (workflow ainda a referencia); restaure e apague a mao.")
    time.sleep(2)
    post(evento_texto(50, "de novo"))
    ls = esperar(lambda ls: len(turnos(ls, tel(50))) >= 1, 60)
    t = turnos(ls, tel(50))
    checar("turno seguinte entrega as duas mensagens uma vez", len(t) == 1 and len(next(iter(t.values()))) == 2, str({k: len(v) for k, v in t.items()}))
    checar("400 malformado registrou falha", (post({"acao": "start", "token_origin": TOKEN, "mensagem": [{"type": "text", "text": "x"}]}) == 400)
           and (time.sleep(3) or int(_vps.psql(BANCO, "SELECT count(*) FROM falhas_recepcao WHERE tipo='payload_invalido' AND contato_id IS NULL AND ocorrida_em >= to_timestamp(%d);" % INICIO).strip()) >= 1))


def ttl():
    print("CA-5 posse expirada: turno lento (stub > lock.ttl_s) nao apaga a posse de outro turno (~5 min)")
    ttl_s = CFG["lock"]["ttl_s"]
    post(evento_texto(60, "__lento__ a"))
    t0 = time.time()
    esperar(lambda x: any(l["tel"] == tel(60) and l["turno_em"] for l in x), 30)
    time.sleep(max(0, t0 + ttl_s + 15 - time.time()))  # posse do turno A ja expirou, A ainda no stub
    post(evento_texto(60, "__lento__ b"))
    esperar(lambda x: len({l["turno"] for l in x if l["tel"] == tel(60) and l["turno"]}) == 1
            and len([l for l in x if l["tel"] == tel(60) and l["turno"]]) == 2, 40)
    time.sleep(max(0, t0 + ttl_s + 15 + 8 + 20 + 25 + 10 - time.time()))  # A volta do stub (~ttl+25 apos sua entrega)
    checar("posse do turno B sobrevive ao retorno do turno A", posse_existe(tel(60)))
    ls = esperar(lambda x: all(l["proc"] for l in x if l["tel"] == tel(60)) and len([l for l in x if l["tel"] == tel(60)]) == 2, 200, 5)
    mine = [l for l in ls if l["tel"] == tel(60)]
    checar("as duas mensagens num unico turno, entregues uma vez", len(turnos(ls, tel(60))) == 1 and len(mine) == 2)


def teto():
    print("C3 teto: 1 mensagem a cada 5 s por 70 s")
    for i in range(14):
        post(evento_texto(30, f"t{i}"))
        time.sleep(5)
    ls = esperar(lambda x: any(l["tel"] == tel(30) and l["proc"] for l in x), 30)
    ts = turnos(ls, tel(30))
    primeiro = min((l for l in ls if l["tel"] == tel(30)), key=lambda l: l["id"])
    checar("entrega forcada perto de 60 s", bool(ts) and 55 <= min(l["turno_em"] for v in ts.values() for l in v) - primeiro["criado"] <= 75)


def limpar():
    print("limpeza (TESTE)")
    _vps.psql(BANCO, "DELETE FROM falhas_recepcao WHERE contato_id IN (SELECT id FROM contatos "
                     f"WHERE telefone LIKE '{PREFIXO_TEL}%') OR (contato_id IS NULL AND ocorrida_em >= to_timestamp({INICIO}));")
    _vps.psql(BANCO, f"DELETE FROM contatos WHERE telefone LIKE '{PREFIXO_TEL}%';")  # mensagens caem por CASCADE
    spec = importlib.util.spec_from_file_location("limpar_redis", os.path.join(RAIZ, "scripts", "limpar-redis.py"))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    for p in ("ultima:", "lock:"):
        mod.main(["--alvo", "teste", "--padrao", p])
    print("  restantes:", _vps.psql(BANCO, f"SELECT count(*) FROM contatos WHERE telefone LIKE '{PREFIXO_TEL}%';").strip())


CENARIOS = dict(recepcao=recepcao, duplicidade=duplicidade, limite=limite, rajada=rajada, posse=posse,
                concorrencia=concorrencia, falha=falha, gravacao=gravacao, dedupe=dedupe, redis=redis, ttl=ttl, teto=teto)

if __name__ == "__main__":
    _env(".env.smoke", ".env.n8n")
    TOKEN = os.environ.get("CHATMASTER_TOKEN_TESTE", "")
    arg = sys.argv[1:]
    if arg == ["--limpar"]:
        limpar()
        sys.exit(0)
    if not TOKEN:
        sys.exit("CHATMASTER_TOKEN_TESTE ausente")
    nomes = arg or [n for n in CENARIOS if n not in ("teto", "ttl")]
    if any(n not in CENARIOS for n in nomes):
        sys.exit("cenario desconhecido")
    try:
        for n in nomes:
            CENARIOS[n]()
    finally:
        limpar()
    print("FALHAS:", _falhas or "nenhuma")
    sys.exit(1 if _falhas else 0)
