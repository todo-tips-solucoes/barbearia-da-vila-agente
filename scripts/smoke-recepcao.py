"""Smoke da recepcao-buffer no TESTE (C2-C5, FR-021). So contatos sinteticos +55000000xxxx; so barbearia_vila_teste e Redis de TESTE.
Uso: python3 -I scripts/smoke-recepcao.py [recepcao|duplicidade|limite|rajada|posse|concorrencia|falha|redis|ttl|teto ...] | --limpar
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
import _vps  # noqa: E402

BANCO = "barbearia_vila_teste"
PREFIXO_TEL = "+55000000"
FIX = os.path.join(RAIZ, "tests", "fixtures", "chatmaster")
CFG = json.load(open(os.path.join(RAIZ, "config", "ambientes", "integracao.json"), encoding="utf-8"))
URL = f"{CFG['n8n_url']}/webhook/{CFG['webhook']['path']}"
_falhas = []
INICIO = int(time.time()) - 5


def _env(*arquivos):
    for a in arquivos:
        try:
            for linha in open(os.path.join(RAIZ, a), encoding="utf-8"):
                k, _, v = linha.strip().partition("=")
                if k and not k.startswith("#"):
                    os.environ.setdefault(k, v.strip().strip('"').strip("'"))
        except FileNotFoundError:
            pass


def tel(n):
    return f"{PREFIXO_TEL}{n:04d}"


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
    dados = raw if raw is not None else json.dumps(corpo).encode()
    req = urllib.request.Request(URL, data=dados, headers={"Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status
    except urllib.error.HTTPError as e:
        return e.code


def linhas():
    """Mensagens dos contatos sinteticos: dicts com telefone, id, tipo, turno_id, criado/turno/proc em epoch."""
    sql = ("SELECT c.telefone, m.id, m.tipo, coalesce(m.turno_id::text,''), extract(epoch from m.criado_em), "
           "coalesce(extract(epoch from m.turno_em)::text,''), coalesce(extract(epoch from m.processada_em)::text,'') "
           f"FROM mensagens m JOIN contatos c ON c.id=m.contato_id WHERE c.telefone LIKE '{PREFIXO_TEL}%' ORDER BY m.id;")
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
    print(f"  [{'ok' if ok else 'FALHA'}] {nome} {detalhe}")
    if not ok:
        _falhas.append(nome)


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


def redis():
    print("CA-4 Redis indisponivel (senha invalida so na credencial do workflow de TESTE; Redis compartilhado intocado. Host inalcancavel nao serve: o no reconecta para sempre)")
    spec = importlib.util.spec_from_file_location("deploy_n8n", os.path.join(RAIZ, "scripts", "deploy-n8n.py"))
    d = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(d)
    api = d.Api(os.environ["N8N_API_URL"], os.environ["N8N_API_KEY"])
    wid = CFG["workflows"]["bv-recepcao"]
    cid = api("POST", "/credentials", {"name": "Barbearia Vila Redis INVALIDA (smoke)", "type": "redis", "data": {
        "host": "redis", "port": 6379, "database": CFG["redis"]["db"], "password": "senha-invalida-smoke", "ssl": False}})["id"]
    try:
        wf = api("GET", f"/workflows/{wid}")
        for n in wf["nodes"]:
            if "redis" in n.get("credentials", {}):
                n["credentials"]["redis"] = {"id": cid, "name": "Barbearia Vila Redis INVALIDA (smoke)"}
        api("PUT", f"/workflows/{wid}", d.corpo_put(wf))
        api("POST", f"/workflows/{wid}/publish", {})
        time.sleep(2)
        checar("200 mesmo sem Redis", post(evento_texto(50, "sem redis")) == 200)
        time.sleep(25)  # janela + folga: com Redis funcionando a entrega ja teria ocorrido
        ls = [l for l in linhas() if l["tel"] == tel(50)]
        checar("mensagem gravada e pendente", len(ls) == 1 and not ls[0]["proc"] and not ls[0]["turno"], str(len(ls)))
        # limite do no Redis do n8n: erro de conexao/auth nao sai pela saida de erro (o no reconecta sem fim), entao
        # a falha NAO e registrada nesse caso; o registro cobre so erro de comando. Documentado, nao afirmado.
        print("  info: falhas registradas para o contato:", falhas_de(tel(50)) or "nenhuma (esperado: o no fica pendurado)")
    finally:
        rc = d.main(["integracao", "--so", "bv-recepcao"])  # restaura o JSON versionado
        for e in api("GET", "/executions?status=running&limit=100").get("data", []):  # presas na credencial invalida
            if e["workflowId"] == wid:
                api("POST", f"/executions/{e['id']}/stop", {})
        checar("workflow restaurado", rc == 0)
        if rc == 0:
            api("DELETE", f"/credentials/{cid}")
        else:
            print("  ATENCAO: credencial invalida mantida (workflow ainda a referencia); restaure e apague a mao.")
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
                concorrencia=concorrencia, falha=falha, redis=redis, ttl=ttl, teto=teto)

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
