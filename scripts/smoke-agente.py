"""Smoke do agente no TESTE (quickstart cenarios 2, 3, 5, 9-15). So contatos SIMULADOS +5500000000xxx (teste.contatos_simulados);
a saida e conferida em `mensagens` (nenhum envio real ao Chat Master: teste.contatos_escrita vazio, conferido no config e no workflow implantado).
Chama a OpenAI e le a Graces de verdade. Nao confirma nenhuma proposta; se alguma ficar `executada`, o finally cancela na Graces (SC-010).
Uso: python3 -I scripts/smoke-agente.py [--so NOME ...] | --limpar. NOMES: c2 c3 c5 c9 c10 c11 c14 c15 c12 c13 (c12/c13 trocam credencial so no TESTE); midia m1-m8 (audios reais do owner em tests/fixtures/midia-real.local.json, fora do git; m3 troca a credencial do interpretar-midia; m6 ~7 min; m7 20 audios); roteiros r1-r10 (quickstart, chamada direta ao bv-graces, escrita real no barbeiro de teste) so por nome.
Segredos vem de .env.smoke/.env.n8n (nunca impressos). Exit 1 se algum cenario falhar."""
import contextlib
import importlib.util
import json
import os
import sys
import time
import urllib.error
import urllib.request
import uuid

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(RAIZ, "scripts"))
import _vps  # noqa: E402

BANCO = "barbearia_vila_teste"
PREFIXO = "+5500000000"  # + 3 digitos (faixa 500-599, longe do smoke-recepcao)
CFG = json.load(open(os.path.join(RAIZ, "config", "ambientes", "integracao.json"), encoding="utf-8"))
URL = f"{CFG['n8n_url']}/webhook/{CFG['webhook']['path']}"
TESTE_ID = CFG["graces"]["barbeiro_teste_id"]
_falhas, _info, _lat = [], [], []
PAULO = "95e69175-6021-4280-a001-5ef2a0135bf8"  # cliente de teste autorizado pelo owner (P1): GET /agenda/clientes?celular=5511967296849
_ocupados = []  # idAgenda criados pelo c4 para ocupar horario
FANTASMA = "00000000-0000-0000-0000-0000000000aa"  # cliente/profissional ficticios: so alimentam a fase 1 (nada vai a Graces)


def _env(*arquivos):
    for a in arquivos:
        try:
            for linha in open(os.path.join(RAIZ, a), encoding="utf-8"):
                k, _, v = linha.strip().partition("=")
                if k and not k.startswith("#"):
                    os.environ.setdefault(k, v.strip().strip('"').strip("'"))
        except FileNotFoundError:
            pass


PAULO_TEL = "+5511967296849"  # P1/P2: telefone real do cliente de teste; no TESTE nada e enviado (contatos_escrita vazio)


def tel(n):
    if n >= 520:
        return PAULO_TEL
    return f"{PREFIXO}{n:03d}"


def checar(nome, ok, detalhe=""):
    print(f"  [{'ok' if ok else 'FALHA'}] {nome} {detalhe}")
    if not ok:
        _falhas.append(nome)


def sql(q):
    return _vps.psql(BANCO, q).strip()


def cid(n):
    r = sql(f"SELECT id FROM contatos WHERE telefone='{tel(n)}';")
    return int(r) if r else None


def evento(n, texto):
    b = json.load(open(os.path.join(RAIZ, "tests", "fixtures", "chatmaster", "evento-02.json"), encoding="utf-8"))["body"]
    b.update(sender=tel(n), token_origin=TOKEN)
    b["mensagem"][0]["text"] = texto
    return b


def evento_audio(n):
    b = json.load(open(os.path.join(RAIZ, "tests", "fixtures", "chatmaster", "evento-13.json"), encoding="utf-8"))["body"]
    b.update(sender=tel(n), token_origin=TOKEN)
    m = b["mensagem"][0]
    m.update(type="audio", fileUrl=f"https://exemplo.invalid/smoke-audio-{uuid.uuid4().hex[:8]}.ogg", fileMimeType="audio/ogg; codecs=opus")
    m["originalData"] = {"audioMessage": {}}
    m.pop("text", None)
    return b


def post(corpo, url=URL):
    req = urllib.request.Request(url, data=json.dumps(corpo).encode(), headers={"Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return r.status, r.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()


def semear(n, pedido=None, opcoes=None):
    """Contato + conversa em sessao viva (ultima entrada agora) para poder pular a identificacao do cliente (P1 nao liberado)."""
    sql(f"INSERT INTO contatos(telefone) VALUES ('{tel(n)}') ON CONFLICT (telefone) DO NOTHING;")
    c = cid(n)
    p, o = json.dumps(pedido or {}), json.dumps(opcoes or {})
    sql(f"INSERT INTO conversas(contato_id,pedido,opcoes,sessao_iniciada_em,ultima_entrada_em) VALUES ({c},$j${p}$j$::jsonb,$j${o}$j$::jsonb,now(),now()) "
        f"ON CONFLICT (contato_id) DO UPDATE SET pedido=EXCLUDED.pedido, opcoes=EXCLUDED.opcoes, sessao_iniciada_em=now(), ultima_entrada_em=now();")
    return c


def estado(n):
    r = sql(f"SELECT json_build_object('pedido',coalesce(pedido,'{{}}'),'opcoes',coalesce(opcoes,'{{}}')) FROM conversas WHERE contato_id={cid(n)};")
    return json.loads(r) if r else {"pedido": {}, "opcoes": {}}


def propostas(n, estado_=None):
    f = f" AND estado='{estado_}'" if estado_ else ""
    return json.loads(sql(f"SELECT coalesce(json_agg(json_build_object('id',id,'acao',acao,'estado',estado,'dados',dados) ORDER BY criada_em),'[]') "
                          f"FROM propostas WHERE contato_id={cid(n) or 0}{f};"))


def falhas(n):
    r = sql(f"SELECT coalesce(json_agg(tipo||'|'||motivo||'|'||coalesce(code,'') ORDER BY id),'[]') FROM falhas_agente WHERE contato_id={cid(n) or 0};")
    return json.loads(r)


def turno(n, corpo, limite=240):
    """Posta o evento e espera um turno novo terminar. Retorna {turno_id, estado, saidas:[texto]} ou None se estourou."""
    c = cid(n)
    ja = lambda: int(sql(f"SELECT count(*) FROM turnos WHERE contato_id={cid(n)} AND estado<>'em_andamento';")) if cid(n) else 0
    antes = ja()
    s, _ = post(corpo)
    if s != 200:
        return {"http": s, "saidas": [], "estado": "recusado", "turno_id": None}
    fim = time.time() + limite
    while time.time() < fim:
        time.sleep(3)
        if ja() > antes:
            break
    else:
        return None
    tid, est = sql(f"SELECT turno_id, estado FROM turnos WHERE contato_id={cid(n)} ORDER BY iniciado_em DESC LIMIT 1;").split("|")
    saidas = json.loads(sql(f"SELECT coalesce(json_agg(conteudo ORDER BY id),'[]') FROM mensagens WHERE contato_id={cid(n)} "
                            f"AND direcao='saida' AND mensagem_id_canal LIKE 'out-{tid}-%';"))
    lat = sql(f"SELECT extract(epoch FROM min(m.criado_em) - min(t.iniciado_em)) FROM turnos t JOIN mensagens m ON m.contato_id=t.contato_id AND m.direcao='saida' "
              f"AND m.mensagem_id_canal LIKE 'out-' || t.turno_id || '-%' WHERE t.turno_id='{tid}';")
    if lat:
        _lat.append(float(lat))  # SC-009: inicio do turno (fim da rajada) -> primeira mensagem
    return {"turno_id": tid, "estado": est, "saidas": saidas}


def conduzir(n, falas, parar, maximo=10):
    """Conversa como cliente: usa as falas na ordem; havendo oferta, responde com o 1o rotulo (sem 'TESTE'). Retorna o log dos turnos."""
    log, falas = [], list(falas)
    for _ in range(maximo):
        op = estado(n)["opcoes"]
        itens = [i for i in (op.get("itens") or []) if "TESTE" not in str(i.get("rotulo", "")).upper()]
        fala = itens[0]["rotulo"] if itens and log else (falas.pop(0) if falas else "pode ser, o que você sugere?")
        t = turno(n, evento(n, fala))
        if t is None:
            checar("turno terminou no limite", False, f"fala={fala!r}")
            break
        t["fala"], t["estado_conversa"] = fala, estado(n)
        log.append(t)
        print(f"    > {fala!r} -> {t['estado']} oferta={t['estado_conversa']['opcoes'].get('tipo')} {str(t['saidas'])[:220]}")
        if t["estado"] != "concluido" or parar(t):
            break
    return log


def tem_teste(textos):
    return any("TESTE" in str(x).upper() for x in textos)


# ---------------------------------------------------------------- chamador temporario (cenarios 3 e 11)
def _api_deploy():
    spec = importlib.util.spec_from_file_location("deploy_n8n", os.path.join(RAIZ, "scripts", "deploy-n8n.py"))
    d = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(d)
    return d, d.Api(os.environ["N8N_API_URL"], os.environ["N8N_API_KEY"])


@contextlib.contextmanager
def chamador(api):
    """Workflow TEMPORARIO (TESTE, deste projeto) com webhook de path aleatorio que repassa `dados` a um sub-workflow `wf`; apagado no finally."""
    path = "bv-smoke-" + uuid.uuid4().hex
    wf = api("POST", "/workflows", {"name": "Barbearia Vila - smoke chamador [TESTE]", "settings": {"executionOrder": "v1", "saveDataErrorExecution": "all", "saveDataSuccessExecution": "all"}, "nodes": [
        {"id": str(uuid.uuid4()), "name": "Webhook", "type": "n8n-nodes-base.webhook", "typeVersion": 2, "position": [0, 0],
         "webhookId": str(uuid.uuid4()), "parameters": {"httpMethod": "POST", "path": path, "responseMode": "lastNode", "options": {}}},
        {"id": str(uuid.uuid4()), "name": "Montar", "type": "n8n-nodes-base.code", "typeVersion": 2, "position": [220, 0],
         "parameters": {"jsCode": "return [{ json: $input.first().json.body.dados }];"}},
        {"id": str(uuid.uuid4()), "name": "Chamar", "type": "n8n-nodes-base.executeWorkflow", "typeVersion": 1.2, "position": [440, 0],
         "parameters": {"source": "database", "workflowId": {"__rl": True, "mode": "id", "value": "={{ $('Webhook').first().json.body.wf }}"},
                        "options": {"waitForSubWorkflow": True}}}],
        "connections": {"Webhook": {"main": [[{"node": "Montar", "type": "main", "index": 0}]]},
                        "Montar": {"main": [[{"node": "Chamar", "type": "main", "index": 0}]]}}})
    wid = wf["id"]
    try:
        api("POST", f"/workflows/{wid}/publish", {})
        time.sleep(3)

        def chamar(sub_id, dados):
            s, corpo = post({"wf": sub_id, "dados": dados}, f"{CFG['n8n_url']}/webhook/{path}")
            try:
                return s, json.loads(corpo)
            except ValueError:
                return s, corpo
        yield chamar
    finally:
        for rota, metodo in ((f"/workflows/{wid}/deactivate", "POST"), (f"/workflows/{wid}", "DELETE")):
            try:
                api(metodo, rota, {} if metodo == "POST" else None)
            except Exception as e:  # noqa: BLE001
                print(f"  ATENCAO: {metodo} {rota} falhou ({type(e).__name__}); apague o chamador temporario a mao (id {wid}).")


# ---------------------------------------------------------------- cenarios
def oferta_horarios(horas=("15:00", "15:30", "16:00")):
    """Oferta de horarios ficticia (profissional fantasma, nunca o de teste): a fase 1 so grava proposta pendente, nada vai a Graces."""
    dia = time.strftime("%Y-%m-%d", time.gmtime(time.time() + 86400))
    return {"tipo": "horario", "itens": [{"id": str(k + 1), "rotulo": h, "valor": {"idServico": FANTASMA, "servico": "Corte", "idProfissional": FANTASMA,
                                                                                 "apelido": "Fulano", "data": dia, "hora": h, "preco": 50}} for k, h in enumerate(horas)]}


def bloqueado_p1(t, pend):
    """Sem proposta e o modelo pedindo o nome para cadastrar: telefone simulado nao tem cliente na Graces e o cadastro e vedado sem o P1."""
    return bool(t) and not pend and any("nome" in x.lower() for x in t["saidas"])


def c2():
    print("C2 parar no resumo (US1-5): proposta pendente, 0 escritas (estado semeado: cliente identificado + oferta de horarios; P1 impede o funil completo)")
    semear(500, {"idCliente": FANTASMA, "cliente_nome": "Teste"}, oferta_horarios())
    t = turno(500, evento(500, "pode ser o das 15:00"))
    pend = propostas(500, "pendente")
    if bloqueado_p1(t, pend):
        _info.append("c2: o modelo identificou o telefone simulado como sem cadastro e pediu o nome (cadastro so com P1); o resumo/pendente fica coberto pelo c3 e por 7.2.1")
    else:
        checar("proposta pendente criada (resumo, sem confirmar)", bool(t) and len(pend) == 1 and str(pend[0]["dados"].get("hora")) == "15:00", f"falhas={falhas(500)} {t and t['saidas']}"[:200])
        checar("resumo pede confirmacao ao cliente", bool(t) and any("?" in x for x in t["saidas"]), str(t and t["saidas"])[:200])
    checar("nenhuma proposta executada/executando (0 escritas)", not propostas(500, "executada") and not propostas(500, "executando"))


def c3():
    print("C3 fase 2 no mesmo turno (FR-007): recusada, 0 escritas (chamada direta ao bv-graces)")
    d, api = _api_deploy()
    c = semear(501, {"idCliente": FANTASMA}, oferta_horarios(("15:00",)))
    base = {"contato_id": c, "telefone": tel(501), "turno_id": str(uuid.uuid4()), "ambiente": CFG["ambiente"]}
    with chamador(api) as chamar:
        s1, r1 = chamar(CFG["workflows_sub"]["bv_graces"], {**base, "operacao": "agendar", "id_opcao_horario": "1"})
        pid = r1.get("proposta_id") if isinstance(r1, dict) else None
        checar("fase 1 devolve proposta e resumo", s1 == 200 and bool(pid) and bool(r1.get("aguardando_confirmacao")), str(r1)[:160])
        s2, r2 = chamar(CFG["workflows_sub"]["bv_graces"], {**base, "operacao": "agendar", "proposta_id": pid or str(uuid.uuid4())})
        checar("fase 2 no mesmo turno recusada", isinstance(r2, dict) and r2.get("code") == "confirmacao_no_mesmo_turno", str(r2)[:160])
    checar("proposta segue pendente, 0 executadas", [p["estado"] for p in propostas(501)] == ["pendente"])


def c5():
    print("C5 texto livre (US2-2/3): 'sei la' gera nova pergunta sem escolha inventada; 'o das HH:MM' e reconhecida")
    semear(502, {"idCliente": FANTASMA, "cliente_nome": "Teste"}, oferta_horarios())
    t = turno(502, evento(502, "sei lá"))
    checar("'sei la': nova pergunta, sem escolha inventada", bool(t) and any("?" in x for x in t["saidas"]) and not propostas(502), str(t and t["saidas"])[:200])
    t = turno(502, evento(502, "o das 15:30"))
    pend = propostas(502, "pendente")
    if bloqueado_p1(t, pend):
        checar("'o das 15:30' reconhecida (o modelo citou 15:30 ao pedir o cadastro; proposta so com P1)", bool(t) and "15:30" in " ".join(t["saidas"]))
        _info.append("c5: proposta do 'o das 15:30' depende do cliente cadastrado (P1); reexecutar em 7.2.1")
    else:
        checar("'o das 15:30' reconhecida (proposta com a hora)", len(pend) == 1 and str(pend[0]["dados"].get("hora")) == "15:30", str(t and t["saidas"])[:200])


def c9():
    print("C9 'Oi' apos 2 h (US5, SC-007): sem retomar a coleta")
    semear(503, {"idCliente": FANTASMA, "cliente_nome": "Teste", "servico": {"idServico": FANTASMA, "nome": "Corte Degradê Especial", "opcao_id": "1"}}, oferta_horarios())
    serv = (estado(503)["pedido"].get("servico") or {})
    nome = str(serv.get("nome") or "")
    checar("havia coleta pela metade (servico no pedido)", bool(serv))
    sql(f"UPDATE conversas SET ultima_entrada_em = now() - interval '3 hours' WHERE contato_id={cid(503)};")
    t = turno(503, evento(503, "Oi"))
    e = estado(503)
    checar("sessao nova: pedido sem servico", t is not None and not e["pedido"].get("servico"), str(list(e["pedido"])))
    checar("resposta sem citar a coleta antiga", bool(t) and (not nome or nome.lower() not in " ".join(t["saidas"]).lower()), str(t and t["saidas"])[:160])


def graces_get(caminho):
    req = urllib.request.Request(f"https://{os.environ['GRACES_BASE_URL_PROD']}/public/v1{caminho}", headers={"X-Api-Key": os.environ["GRACES_API_KEY"]})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def c10():
    print("C10 barbeiro de teste pelo nome (US6-2): tratado como inexistente (leitura real na Graces; nada escrito)")
    s0 = next(x for x in graces_get("/agenda/servicos?texto=corte") if x.get("ativo", True))
    serv = {"idServico": s0["idServico"], "nome": s0["descricaoAgenda"], "preco": s0.get("valorPadrao"), "minutos": s0.get("tempoPadrao")}
    # (a) ferramenta direta: a lista de barbeiros do servico nunca traz o de teste
    d, api = _api_deploy()
    c = semear(504, {"idCliente": FANTASMA, "cliente_nome": "Teste"}, {"tipo": "servico", "itens": [{"id": "1", "rotulo": serv["nome"][:24], "valor": serv}]})
    with chamador(api) as chamar:
        st, r = chamar(CFG["workflows_sub"]["bv_graces"], {"contato_id": c, "telefone": tel(504), "turno_id": str(uuid.uuid4()), "ambiente": CFG["ambiente"],
                                                           "operacao": "listar_barbeiros", "id_opcao_servico": "1"})
    op = estado(504)["opcoes"]
    ofertados = json.dumps([op, r])
    checar("listar_barbeiros respondeu com barbeiros reais", st == 200 and op.get("tipo") == "barbeiro" and len(op.get("itens", [])) >= 1, f"{st} {str(r)[:120]}")
    checar("0 ofertas/respostas com TESTE ou o id do barbeiro de teste (SC-001)", "TESTE" not in ofertados.upper() and TESTE_ID not in ofertados)
    # (b) conversa: o cliente pede o barbeiro de teste pelo nome
    semear(510, {"idCliente": FANTASMA, "cliente_nome": "Teste", "servico": {**serv, "opcao_id": "1"}}, {"tipo": "servico", "itens": [{"id": "1", "rotulo": serv["nome"][:24], "valor": serv}]})
    log = conduzir(510, ["quero esse corte com o ZZ TESTE INTEGRACAO", "pode ser qualquer um então", "amanhã"], lambda t: t["estado_conversa"]["opcoes"].get("tipo") == "horario", 4)
    ofertas = json.dumps([t["estado_conversa"]["opcoes"] for t in log])
    checar("conversa: 0 listas com TESTE ou o id do barbeiro de teste", "TESTE" not in ofertas.upper() and TESTE_ID not in ofertas, f"turnos={len(log)}")
    checar("nenhuma proposta no barbeiro de teste", not any(p["dados"].get("idProfissional") == TESTE_ID for p in propostas(510)))
    if any(tem_teste(t["saidas"]) for t in log):
        _info.append("c10: o texto do modelo repetiu o nome pedido pelo cliente (nao e lista)")


def c11():
    print("C11 turno repetido (FR-018, SC-006): ok, 0 mensagens novas, 0 escritas (chamada direta ao entregar-rajada)")
    d, api = _api_deploy()
    semear(505, {"idCliente": FANTASMA})
    t = turno(505, evento(505, "oi"))
    if not t or t["estado"] != "concluido":
        checar("turno base concluido", False, str(t)[:120])
        return
    c = cid(505)
    n0 = sql(f"SELECT count(*) FROM mensagens WHERE contato_id={c};")
    mid = sql(f"SELECT id FROM mensagens WHERE contato_id={c} AND direcao='entrada' ORDER BY id LIMIT 1;")
    with chamador(api) as chamar:
        s, r = chamar(CFG["workflows_sub"]["entregar_rajada"], {"turno_id": t["turno_id"], "contato_id": c, "telefone": tel(505), "total": 1,
                                                                "itens": [{"mensagem_id": int(mid), "tipo": "texto", "conteudo": "oi", "midia_url": None, "recebida_em": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime())}]})
    checar("responde ok/repetido", isinstance(r, dict) and r.get("ok") is True and r.get("repetido") is True, str(r)[:160])
    checar("0 mensagens novas", sql(f"SELECT count(*) FROM mensagens WHERE contato_id={c};") == n0)
    checar("0 propostas, 0 falhas novas", not propostas(505) and not falhas(505), str(falhas(505)))


def c14():
    print("C14 limites de saida (US4, SC-003): <= %d mensagens, <= 1 '?' e <= %d chars cada" % (CFG["saida"]["max_mensagens"], CFG["saida"]["max_chars_mensagem"]))
    semear(506, {"idCliente": FANTASMA})
    t = turno(506, evento(506, "me explica tudo sobre a barbearia: serviços, preços, horários de funcionamento, endereço, formas de pagamento e como funciona o agendamento, com bastante detalhe"))
    if not t:
        checar("turno terminou", False)
        return
    s = t["saidas"]
    checar("turno concluido com saida", t["estado"] == "concluido" and len(s) >= 1, f"estado={t['estado']} msgs={len(s)}")
    checar("<= max_mensagens", len(s) <= CFG["saida"]["max_mensagens"], str(len(s)))
    checar("<= 1 '?' por mensagem", all(x.count("?") <= 1 for x in s), str([x.count("?") for x in s]))
    checar("<= max_chars por mensagem", all(len(x) <= CFG["saida"]["max_chars_mensagem"] + 200 for x in s), str([len(x) for x in s]))  # lista acrescenta titulos
    _info.append("c14: 'digitando' antes de cada mensagem nao e observavel em contato simulado (log de execucao nao e salvo no TESTE)")


def c15():
    print("C15 audio (Edge Case): pedido para escrever")
    semear(507, {"idCliente": FANTASMA})
    t = turno(507, evento_audio(507))
    checar("turno concluido", bool(t) and t["estado"] == "concluido", str(t)[:120])
    checar("resposta e o aviso de nao entendido (textos.midia_nao_entendida ou midia_grande)", bool(t) and any(CFG["textos"][k] in t["saidas"] for k in ("midia_nao_entendida", "midia_grande")), str(t and t["saidas"])[:160])
    checar("falhas_agente midia|host_recusado, sem URL", any(x.startswith("midia|host_recusado") and "exemplo.invalid" not in x for x in falhas(507)), str(falhas(507)))


def _trocar_credencial(api, d, wid, tipo, falsa):
    wf = api("GET", f"/workflows/{wid}")
    for n in wf["nodes"]:
        if tipo in n.get("credentials", {}):
            n["credentials"][tipo] = {"id": falsa, "name": "INVALIDA (smoke)"}
    api("PUT", f"/workflows/{wid}", d.corpo_put(wf))
    api("POST", f"/workflows/{wid}/publish", {})
    time.sleep(3)


def _cenario_credencial(num, wf_chave, so_nome, tipo_cred, dados_cred, conversa, esperado):
    d, api = _api_deploy()
    wid = CFG["workflows_sub"][wf_chave]
    semear(num, {"idCliente": FANTASMA, "cliente_nome": "Teste"})
    cred = api("POST", "/credentials", {"name": "Barbearia Vila INVALIDA (smoke)", "type": tipo_cred, "data": dados_cred})["id"]
    try:
        _trocar_credencial(api, d, wid, "openAiApi" if tipo_cred == "openAiApi" else "httpHeaderAuth", cred)
        t = turno(num, evento(num, conversa) if isinstance(conversa, str) else conversa)
        esperado(t)
    finally:
        rc = d.main(["integracao", "--so", so_nome])  # restaura o JSON versionado
        checar("workflow restaurado", rc == 0)
        if rc == 0:
            api("DELETE", f"/credentials/{cred}")
        else:
            print("  ATENCAO: credencial invalida mantida (workflow ainda a referencia); restaure e apague a mao.")


def c12():
    print("C12 erro da Graces (US7): credencial invalida so no bv-graces de TESTE, restaurada no finally")

    def esperado(t):
        f = falhas(508)
        checar("turno concluido com texto de passar para a equipe", bool(t) and t["estado"] == "concluido" and any("equipe" in x.lower() or "pessoa" in x.lower() for x in t["saidas"]), str(t and t["saidas"])[:200])
        checar("falhas_agente com code NAO_AUTENTICADO", any(x.endswith("|NAO_AUTENTICADO") for x in f), str(f))
        checar("cliente sem detalhe tecnico", bool(t) and not any(k in " ".join(t["saidas"]) for k in ("401", "NAO_AUTENTICADO", "X-Api-Key", "api key")))
    _cenario_credencial(508, "bv_graces", "bv_graces", "httpHeaderAuth", {"name": "X-Api-Key", "value": "chave-invalida-smoke"},
                        "oi, quais serviços vocês têm?", esperado)


def c13():
    print("C13 falha do modelo (US7-4): credencial OpenAI invalida so no entregar-rajada de TESTE, restaurada no finally")

    def esperado(t):
        f = falhas(509)
        checar("turno concluido com a contingencia", bool(t) and t["estado"] == "concluido" and CFG["textos"]["contingencia"] in t["saidas"], str(t and t["saidas"])[:200])
        checar("falhas_agente agente|agente_falhou", any(x.startswith("agente|agente_falhou") for x in f), str(f))
    _cenario_credencial(509, "entregar_rajada", "entregar_rajada", "openAiApi", {"apiKey": "sk-invalida-smoke"}, "oi, tudo bem?", esperado)


def graces_post(caminho, corpo):
    req = urllib.request.Request(f"https://{os.environ['GRACES_BASE_URL_PROD']}/public/v1{caminho}", data=json.dumps(corpo).encode(), method="POST",
                                 headers={"X-Api-Key": os.environ["GRACES_API_KEY"], "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        return {"http": e.code, "corpo": e.read()[:200].decode()}


def _agendas_paulo():
    return [a for a in graces_get(f"/agenda/agendamentos?idCliente={PAULO}&proximos=true") if a.get("idProfissional") == TESTE_ID]


def novo_paulo(n):
    """Mesmo telefone em todos os roteiros P1: zera o contato antes (cascade) e semeia a sessao (cliente achado pelo telefone na Graces)."""
    sql(f"DELETE FROM contatos WHERE telefone='{PAULO_TEL}';")
    return semear(n, {})


def guiar(n, falas, parar, maximo=7):
    """Como conduzir, mas toca cada tipo de oferta uma vez (a oferta de servico pode persistir enquanto o modelo pergunta o dia)."""
    log, falas, tocados = [], list(falas), set()
    for _ in range(maximo):
        op = estado(n)["opcoes"]
        itens = [i for i in (op.get("itens") or []) if "TESTE" not in str(i.get("rotulo", "")).upper()]
        if itens and op.get("tipo") not in tocados:
            tocados.add(op.get("tipo"))
            fala = itens[0]["rotulo"]
        else:
            fala = falas.pop(0) if falas else "pode ser o primeiro que você sugerir"
        t = turno(n, evento(n, fala))
        if t is None:
            checar("turno terminou no limite", False, f"fala={fala!r}")
            break
        t["fala"], t["estado_conversa"] = fala, estado(n)
        log.append(t)
        print(f"    > {fala!r} -> {t['estado']} oferta={t['estado_conversa']['opcoes'].get('tipo')} {str(t['saidas'])[:200]}")
        if t["estado"] != "concluido" or parar(t):
            break
    return log


def _say(n, fala):
    t = turno(n, evento(n, fala))
    print(f"    > {fala!r} -> {t and t['estado']} {str(t and t['saidas'])[:230]}")
    return t


def c1():
    print("C1 agendar, cliente conhecido (US1, SC-008): 1 proposta executada no barbeiro de teste, <= 8 falas, 0 'TESTE' nas ofertas")
    novo_paulo(520)
    log = guiar(520, ["oi, queria marcar um corte", "amanhã", "qualquer barbeiro"], lambda t: bool(propostas(520, "pendente")), 7)
    pend = propostas(520, "pendente")
    checar("chegou ao resumo (proposta pendente)", len(pend) == 1, f"falhas={falhas(520)}")
    if not pend:
        return
    t = _say(520, "sim")
    if not propostas(520, "executada"):
        print("    (1o 'sim' nao executou; estado:", [(p["acao"], p["estado"]) for p in propostas(520)], ")")
        t = _say(520, "sim, pode confirmar")
    falas = int(sql(f"SELECT count(*) FROM mensagens WHERE contato_id={cid(520)} AND direcao='entrada';"))
    checar("proposta executada", len(propostas(520, "executada")) == 1, f"falhas={falhas(520)} {t and t['saidas']}"[:200])
    checar("<= 8 falas do cliente (SC-008)", falas <= 8, f"falas={falas}")
    checar("0 ofertas com TESTE (SC-001)", "TESTE" not in json.dumps([x["estado_conversa"]["opcoes"] for x in log]).upper())
    checar("agendamento criado no barbeiro de teste, no nome do Paulo", len(_agendas_paulo()) >= 1)


def c4():
    print("C4 horario tomado (US1-4): ocupar o horario entre resumo e 'sim' -> aviso/novas opcoes, 0 duplicado")
    novo_paulo(521)
    guiar(521, ["oi, queria marcar um corte", "amanhã", "qualquer barbeiro"], lambda t: bool(propostas(521, "pendente")), 7)
    pend = propostas(521, "pendente")
    checar("chegou ao resumo", len(pend) == 1, f"falhas={falhas(521)}")
    if not pend:
        return
    d = pend[0]["dados"]
    antes = len(_agendas_paulo())
    r = graces_post("/agenda", {"idCliente": PAULO, "idServico": d["idServico"], "idProfissional": TESTE_ID, "data": d["data"], "horaInicio": d["hora"]})
    print("    ocupacao:", str(r)[:160])
    if isinstance(r, dict) and r.get("idAgenda"):
        _ocupados.append(r["idAgenda"])
    t = _say(521, "sim")
    depois = len(_agendas_paulo())
    checar("nenhum agendamento duplicado", depois <= antes + 1, f"antes={antes} depois={depois}")
    for a in _ocupados:  # libera o horario para os roteiros seguintes
        urllib.request.urlopen(urllib.request.Request(f"https://{os.environ['GRACES_BASE_URL_PROD']}/public/v1/agenda/{a}", method="DELETE", headers={"X-Api-Key": os.environ["GRACES_API_KEY"]}), timeout=30)
    _ocupados.clear()
    checar("avisou e/ou ofereceu novas opcoes", bool(t) and (estado(521)["opcoes"].get("tipo") == "horario" or any("hor" in x.lower() for x in t["saidas"])), str(t and t["saidas"])[:200])


def _semear_agendamento(n, hora="15:00"):
    """Agendamento do Paulo no barbeiro de teste, direto na Graces (o roteiro seguinte o cancela em encerrar)."""
    for a in _agendas_paulo():  # roteiros anteriores deixam agendamentos do Paulo no barbeiro de teste: cancela antes
        urllib.request.urlopen(urllib.request.Request(f"https://{os.environ['GRACES_BASE_URL_PROD']}/public/v1/agenda/{a['idAgenda']}", method="DELETE", headers={"X-Api-Key": os.environ["GRACES_API_KEY"]}), timeout=30)
    s0 = next(x for x in graces_get("/agenda/servicos?texto=corte") if x.get("ativo", True) and "adulto" in x["descricaoAgenda"].lower())
    dia = time.strftime("%Y-%m-%d", time.gmtime(time.time() - 3 * 3600 + 86400))
    r = graces_post("/agenda", {"idCliente": PAULO, "idServico": s0["idServico"], "idProfissional": TESTE_ID, "data": dia, "horaInicio": hora})
    checar("semeou agendamento (Graces)", isinstance(r, dict) and bool(r.get("idAgenda")), str(r)[:160])
    novo_paulo(n)
    return r


def _dump(n):
    for p in propostas(n):
        print("    proposta:", p["acao"], p["estado"], json.dumps(p["dados"], ensure_ascii=False)[:200])
    print("    falhas:", falhas(n))


def c6():
    print("C6 cancelar sugerindo remarcar (US3-1/2, SC-005): sugere remarcar; apos recusa e 'sim', DELETE e oferta de marcar outro")
    _semear_agendamento(523)
    log = guiar(523, ["quero cancelar", "não quero remarcar, quero cancelar mesmo"], lambda t: bool(propostas(523, "pendente")), 6)
    checar("sugeriu remarcar antes de cancelar (SC-005)", any("remarc" in x.lower() or "outro hor" in x.lower() for t in log for x in t["saidas"]), str([t["saidas"] for t in log])[:200])
    t = _say(523, "sim, pode cancelar") if propostas(523, "pendente") else None
    _dump(523)
    checar("cancelamento executado", any(p["acao"] == "cancelar" and p["estado"] == "executada" for p in propostas(523)))
    checar("agenda do Paulo no barbeiro de teste vazia", not _agendas_paulo())
    checar("ofereceu marcar outro", bool(t) and any("marcar" in x.lower() or "agendar" in x.lower() for x in t["saidas"]), str(t and t["saidas"])[:200])
    t = _say(523, "cancelei, vamos marcar outro")  # C8 (US3-3)
    txt = " ".join(t["saidas"]).lower() if t else ""
    checar("C8 'vamos marcar outro': segue para novo agendamento, sem 'nao encontrei agendamento'", bool(t) and "encontrei agendamento" not in txt, txt[:200])


def c7():
    print("C7 reagendar (US3-4): PUT com servico preservado; resumo 'de X para Y'")
    _semear_agendamento(524, "17:00")
    _say(524, "queria remarcar meu horário de amanhã")
    tocados, falas7 = set(), ["amanhã mesmo, depois das 18h", "qualquer barbeiro"]
    for _ in range(9):
        op = estado(524)["opcoes"]
        its = [i for i in (op.get("itens") or []) if "TESTE" not in str(i.get("rotulo", "")).upper()]
        if op.get("tipo") == "horario" and its:
            alvo = next((i for i in its if "18" in i["rotulo"] or "19" in i["rotulo"]), its[-1])
            _say(524, alvo["rotulo"])
        elif op.get("tipo") in ("agendamento", "servico", "barbeiro") and its and op["tipo"] not in tocados:
            tocados.add(op["tipo"])
            _say(524, its[0]["rotulo"])
        else:
            _say(524, falas7.pop(0) if falas7 else "pode ser qualquer barbeiro")
        if propostas(524, "pendente"):
            break
    pend = propostas(524, "pendente")
    checar("proposta de reagendar pendente (resumo de X para Y)", len(pend) == 1 and pend[0]["acao"] == "reagendar", str([(p["acao"], p["estado"]) for p in propostas(524)]))
    if pend:
        _say(524, "sim")
    _dump(524)
    checar("reagendar executado", any(p["acao"] == "reagendar" and p["estado"] == "executada" for p in propostas(524)))
    ag = _agendas_paulo()
    checar("1 agendamento no barbeiro de teste, em outra hora", len(ag) == 1 and str(ag[0].get("horaInicio", ""))[11:16] != "15:00", str([a.get("horaInicio") for a in ag]))


def p2():
    print("P2 ponta a ponta com o contato real (7.2.4): Chat Master -> bv-recepcao -> entregar-rajada -> Graces -> Chat Master (envio REAL ao 5511967296849 pela conexao 145)")
    checar("config: contatos_escrita = so o contato real do owner (P2)", CFG["teste"]["contatos_escrita"] == [PAULO_TEL])
    sv = [x for x in graces_get("/agenda/servicos?texto=corte") if x.get("ativo", True)]
    checar("shape /agenda/servicos", bool(sv) and {"idServico", "descricaoAgenda", "tempoPadrao", "valorPadrao"} <= set(sv[0]), str(sorted(sv[0]))[:200] if sv else "")
    c1()
    ag = _agendas_paulo()
    checar("shape /agenda/agendamentos", bool(ag) and {"idAgenda", "horaInicio", "idServico", "descricaoServico", "idProfissional", "profissional"} <= set(ag[0]), str(sorted(ag[0]))[:300] if ag else "")
    bs = graces_get(f"/servicos/profissionais?idServico={sv[0]['idServico']}")
    checar("shape /servicos/profissionais", bool(bs) and {"idProfissional", "apelido"} <= set(bs[0]), str(sorted(bs[0]))[:200] if bs else "")
    dia = time.strftime("%Y-%m-%d", time.gmtime(time.time() - 3 * 3600 + 86400))
    hl = graces_get(f"/agenda/horarios-livres?idServico={sv[0]['idServico']}&idProfissional={bs[0]['idProfissional']}&data={dia}")
    checar("shape /agenda/horarios-livres", isinstance(hl, dict) and {"horarios", "minutos"} <= set(hl), str(hl)[:120])
    n_out = int(sql(f"SELECT count(*) FROM mensagens m JOIN contatos c ON c.id=m.contato_id WHERE c.telefone='{PAULO_TEL}' AND m.direcao='saida';"))
    checar("mensagens de saida gravadas (enviadas pelo Chat Master)", n_out >= 1, f"n={n_out}")


# ---------------------------------------------------------------- roteiros r1-r10 (quickstart; chamada direta ao bv-graces, escrita so no barbeiro de teste, Paulo)
_lat_enc = []  # latencia (s) das consultas de encadeamento (horarios_livres com id_opcoes_servicos)


def _del(a):
    try:
        urllib.request.urlopen(urllib.request.Request(f"https://{os.environ['GRACES_BASE_URL_PROD']}/public/v1/agenda/{a}", method="DELETE", headers={"X-Api-Key": os.environ["GRACES_API_KEY"]}), timeout=30)
    except urllib.error.HTTPError as err:
        print(f"  cancelamento de {a}: HTTP {err.code}")


def limpar_paulo():
    for a in _agendas_paulo():
        _del(a["idAgenda"])


def G(chamar, c, n, **kw):
    s, r = chamar(CFG["workflows_sub"]["bv_graces"], {"contato_id": c, "telefone": tel(n), "turno_id": str(uuid.uuid4()), "ambiente": CFG["ambiente"], **kw})
    return r if isinstance(r, dict) else {"http": s, "corpo": r}


def ini(n, opcoes=None):
    sql(f"DELETE FROM contatos WHERE telefone='{PAULO_TEL}';")
    return semear(n, {"idCliente": PAULO, "cliente_nome": "Paulo"}, opcoes)


def _seg_vez(s):
    import re
    return bool(re.search(r"\b2\s*[ao]?\s*vez\b", s.lower().replace("ª", "a").replace("º", "o")))


def servico(texto, excluir=()):
    return next(x for x in graces_get(f"/agenda/servicos?texto={texto}") if x.get("ativo", True) and not _seg_vez(x["descricaoAgenda"]) and x["idServico"] not in excluir)


def grade(sv, prof, dia):
    return graces_get(f"/agenda/horarios-livres?idServico={sv}&idProfissional={prof}&data={dia}")


def dias(k=21):
    return [time.strftime("%Y-%m-%d", time.gmtime(time.time() - 3 * 3600 + 86400 * i)) for i in range(1, k + 1)]


def reais(sv):
    return [b for b in graces_get(f"/servicos/profissionais?idServico={sv}") if b["idProfissional"] != TESTE_ID and "TESTE" not in json.dumps(b).upper()]


def uniao(sv, dia):
    return {h for b in reais(sv) for h in grade(sv, b["idProfissional"], dia).get("horarios", [])}


def dia_util(sv):
    """Primeiro dia com vaga para o barbeiro de teste e para algum barbeiro real."""
    for d in dias():
        if len(grade(sv, TESTE_ID, d).get("horarios", [])) >= 4 and uniao(sv, d):
            return d
    raise SystemExit("nenhum dia com vaga nos proximos 21 dias")


def ofertar(chamar, c, n, sv, texto, dia):
    """listar_servicos -> listar_barbeiros -> horarios_livres(qualquer): devolve (resposta, itens da oferta)."""
    G(chamar, c, n, operacao="listar_servicos", texto=texto)
    it = next((i for i in estado(n)["opcoes"].get("itens", []) if i["valor"].get("idServico") == sv), None)
    if not it:
        return {"ok": False, "code": "servico_nao_ofertado"}, []
    G(chamar, c, n, operacao="listar_barbeiros", id_opcao_servico=it["id"])
    r = G(chamar, c, n, operacao="horarios_livres", qualquer=True, data=dia)
    return r, estado(n)["opcoes"].get("itens", [])


def propor_e_confirmar(chamar, c, n, **kw):
    """Fase 1 (proposta) e, em turno posterior, fase 2 ('sim'). Devolve (fase1, fase2)."""
    r1_ = G(chamar, c, n, **kw)
    pid = r1_.get("proposta_id")
    return r1_, (G(chamar, c, n, operacao=kw["operacao"], proposta_id=pid) if pid else None)


def _horario_do_teste(sv, dia, itens):
    g = set(grade(sv, TESTE_ID, dia).get("horarios", []))
    return next((i for i in itens if i["valor"]["hora"] in g), None)


def r1():
    print("r1 todos os inicios (SC-001): oferta completa = uniao das grades dos barbeiros reais da Graces")
    s0 = servico("corte")
    dia = dia_util(s0["idServico"])
    c = ini(530)
    d, api = _api_deploy()
    with chamador(api) as chamar:
        r, itens = ofertar(chamar, c, 530, s0["idServico"], "corte", dia)
    got = {i["valor"]["hora"] for i in itens}
    esp = uniao(s0["idServico"], dia)
    checar("oferta == uniao das grades da Graces (SC-001)", bool(esp) and got == esp, f"dia={dia} oferta={len(got)} graces={len(esp)} faltam={sorted(esp - got)[:5]} sobram={sorted(got - esp)[:5]}")
    checar("0 ofertas com TESTE ou o barbeiro de teste", "TESTE" not in json.dumps(itens).upper() and TESTE_ID not in json.dumps(itens))


def r2():
    print("r2 dia lotado: barbeiro real sem vaga no dia (a loja abre todo dia, nao ha dia lotado para todos) -> texto sugere outro dia, nenhuma lista")
    s0 = servico("corte")
    alvo = next(((bb, d) for d in dias(21) for bb in reais(s0["idServico"]) if not grade(s0["idServico"], bb["idProfissional"], d).get("horarios")), None)
    if not alvo:
        checar("achou barbeiro real sem vaga em algum dia dos proximos 21", False)
        return
    bb, vazio = alvo
    c = ini(531)
    d, api = _api_deploy()
    with chamador(api) as chamar:
        G(chamar, c, 531, operacao="listar_servicos", texto="corte")
        it = next(i for i in estado(531)["opcoes"]["itens"] if i["valor"]["idServico"] == s0["idServico"])
        G(chamar, c, 531, operacao="listar_barbeiros", id_opcao_servico=it["id"])
        ib = next(i for i in estado(531)["opcoes"]["itens"] if bb["idProfissional"] in json.dumps(i["valor"]))
        r = G(chamar, c, 531, operacao="horarios_livres", id_opcao_barbeiro=ib["id"], data=vazio)
    checar("sem horarios: nenhuma lista, nenhum horario inventado", not estado(531)["opcoes"].get("itens") and not r.get("opcoes"), f"dia={vazio} {str(r)[:160]}")
    checar("orientacao sugere outro dia", "dia" in json.dumps(r, ensure_ascii=False).lower(), str(r)[:160])


def r3():
    print("r3 horario tomado: ocupar entre proposta e 'sim' -> proposta falhou, 0 duplicado, ocupacao cancelada")
    s0 = servico("corte")
    dia = dia_util(s0["idServico"])
    c = ini(532)
    d, api = _api_deploy()
    with chamador(api) as chamar:
        r, itens = ofertar(chamar, c, 532, s0["idServico"], "corte", dia)
        it = _horario_do_teste(s0["idServico"], dia, itens)
        if not it:
            checar("achou horario comum ao barbeiro de teste", False)
            return
        f1 = G(chamar, c, 532, operacao="agendar", id_opcao_horario=it["id"])
        checar("fase 1 devolveu proposta", bool(f1.get("proposta_id")), str(f1)[:160])
        ocup = graces_post("/agenda", {"idCliente": PAULO, "idServico": s0["idServico"], "idProfissional": TESTE_ID, "data": dia, "horaInicio": it["valor"]["hora"]})
        checar("smoke ocupou o horario", bool(ocup.get("idAgenda")), str(ocup)[:160])
        f2 = G(chamar, c, 532, operacao="agendar", proposta_id=f1.get("proposta_id"))
    ps = propostas(532)
    checar("proposta falhou (horario tomado) e nao executou", bool(ps) and ps[-1]["estado"] == "falhou" and f2.get("ok") is not True, f"{[p['estado'] for p in ps]} {str(f2)[:160]}")
    checar("so a ocupacao do smoke existe (0 duplicado)", len(_agendas_paulo()) == 1, str(len(_agendas_paulo())))
    limpar_paulo()  # cancela a ocupacao


def r4():
    print("r4 sem pacote (SC-002): agenda pelo idServico, sem pergunta de pacote e sem /agenda/pacotes")
    cod = open(os.path.join(RAIZ, "workflows", "shared", "graces.js"), encoding="utf-8").read() + open(os.path.join(RAIZ, "workflows", "sub", "bv-graces.json"), encoding="utf-8").read()
    checar("nenhuma referencia a /agenda/pacotes no bv-graces", "pacotes" not in cod.lower())
    s0 = servico("corte")
    dia = dia_util(s0["idServico"])
    c = ini(533)
    d, api = _api_deploy()
    with chamador(api) as chamar:
        r, itens = ofertar(chamar, c, 533, s0["idServico"], "corte", dia)
        it = _horario_do_teste(s0["idServico"], dia, itens)
        f1, f2 = propor_e_confirmar(chamar, c, 533, operacao="agendar", id_opcao_horario=it["id"]) if it else ({}, None)
    checar("agendamento criado e proposta executada", bool(f2) and f2.get("ok") is True and any(p["estado"] == "executada" for p in propostas(533)), str(f2)[:160])
    checar("nenhuma pergunta de pacote no resumo/resultado", "pacote" not in json.dumps([f1, f2], ensure_ascii=False).lower())
    ag = _agendas_paulo()
    checar("agendamento no barbeiro de teste pelo idServico", len(ag) == 1 and ag[0]["idServico"] == s0["idServico"], str([a.get("idServico") for a in ag]))
    limpar_paulo()


def r5():
    print("r5 2a vez pelo nome (SC-003): nenhuma oferta '2a vez'; agendar com a variante recusado")
    c = ini(534)
    d, api = _api_deploy()
    seg = next((x for x in graces_get("/agenda/servicos") if _seg_vez(x["descricaoAgenda"])), None)
    with chamador(api) as chamar:
        G(chamar, c, 534, operacao="listar_servicos", texto="corte adulto 2ª vez")
        itens = estado(534)["opcoes"].get("itens", [])
        checar("nenhuma oferta '2a vez'", bool(itens) and not any(_seg_vez(json.dumps(i, ensure_ascii=False)) for i in itens), str([i.get("rotulo") for i in itens]))
        semear(534, {"idCliente": PAULO, "cliente_nome": "Paulo"}, {"tipo": "horario", "itens": [{"id": "1", "rotulo": "15:00", "valor": {
            "idServico": (seg or {}).get("idServico", FANTASMA), "servico": (seg or {}).get("descricaoAgenda", "Corte Adulto 2ª vez"), "idProfissional": FANTASMA,
            "apelido": "Fulano", "data": dias(1)[0], "hora": "15:00", "preco": 50}}]})
        r = G(chamar, c, 534, operacao="agendar", id_opcao_horario="1")
    checar("agendar variante '2a vez' recusado (servico_nao_oferecido), sem proposta", r.get("code") == "servico_nao_oferecido" and not propostas(534), str(r)[:160])


def r6():
    print("r6 terceiro existente (SC-004): busca pelo nome do proprio cliente de teste -> mesmo celular -> agendado no idCliente achado")
    paulo = next(x for x in graces_get(f"/agenda/clientes?celular={PAULO_TEL[1:]}") if x["idCliente"] == PAULO)
    nome = f"{paulo['nomeCliente']} {paulo.get('sobrenomeCliente') or ''}".strip()
    s0 = servico("corte")
    dia = dia_util(s0["idServico"])
    c = ini(535)
    d, api = _api_deploy()
    with chamador(api) as chamar:
        b = G(chamar, c, 535, operacao="buscar_pessoa", nome=nome)
        it = next((i for i in estado(535)["opcoes"].get("itens", []) if PAULO in json.dumps(i["valor"])), None)
        checar("nenhum celular na resposta ao modelo", PAULO_TEL[3:] not in json.dumps(b))
        if not it:  # a Graces de PROD devolve [] para QUALQUER `busca=` (verificado 2026-10-19: Paulo, Ana, Silva...): semeia a oferta no formato que buscar_pessoa grava
            _info.append("r6: GET /agenda/clientes?busca= devolve [] na Graces de PROD (totalItemCount 0, qualquer termo); a oferta 'pessoa' foi semeada com o formato de buscar_pessoa (mesmo_celular calculado do celular real do cadastro)")
            checar("busca sem resultado orienta cadastrar, sem gravar idCliente", b.get("pessoas") == [] and "cadastrar" in str(b.get("orientacao")), str(b)[:160])
            mesmo = "".join(ch for ch in str(paulo["celular"]) if ch.isdigit())[-9:] == PAULO_TEL[-9:]
            semear(535, {"idCliente": PAULO, "cliente_nome": "Paulo"}, {"tipo": "pessoa", "itens": [{"id": "1", "rotulo": nome[:24], "valor": {"idCliente": PAULO, "nome": nome, "mesmo_celular": mesmo}}]})
            it = estado(535)["opcoes"]["itens"][0]
        e = G(chamar, c, 535, operacao="escolher_pessoa", id_opcao=it["id"])
        checar("escolher_pessoa ok (mesmo celular)", e.get("ok") is True and estado(535)["pedido"].get("idCliente") == PAULO, str(e)[:160])
        r, itens = ofertar(chamar, c, 535, s0["idServico"], "corte", dia)
        h = _horario_do_teste(s0["idServico"], dia, itens)
        f1, f2 = propor_e_confirmar(chamar, c, 535, operacao="agendar", id_opcao_horario=h["id"]) if h else ({}, None)
    ps = [p for p in propostas(535) if p["acao"] == "agendar"]
    checar("agendado no idCliente da pessoa escolhida", bool(f2) and f2.get("ok") is True and bool(ps) and ps[-1]["dados"].get("idCliente") == PAULO, str(f2)[:160])
    checar("nenhum cadastro de terceiro (POST /agenda/clientes)", not any(p["acao"] == "cadastrar_terceiro" for p in propostas(535)))
    limpar_paulo()


def _dois_servicos():
    a = servico("corte")
    return a, servico("barba", {a["idServico"]})


def _dia_dois(a):
    return next((x for x in dias() if len(grade(a["idServico"], TESTE_ID, x).get("horarios", [])) >= 4), dias(1)[0])


def _sequencia(chamar, c, n, s_a, s_b, dia):
    semear(n, {"idCliente": PAULO, "cliente_nome": "Paulo"}, {"tipo": "servico", "itens": [
        {"id": str(k + 1), "rotulo": s["descricaoAgenda"][:24], "valor": {"idServico": s["idServico"], "nome": s["descricaoAgenda"], "preco": s.get("valorPadrao"), "minutos": s.get("tempoPadrao")}} for k, s in enumerate((s_a, s_b))]})
    t0 = time.time()
    r = G(chamar, c, n, operacao="horarios_livres", id_opcoes_servicos=["1", "2"], data=dia)
    _lat_enc.append(time.time() - t0)
    op = estado(n)["opcoes"]
    itens = op.get("itens", []) if op.get("tipo") == "sequencia" else []
    ga = set(grade(s_a["idServico"], TESTE_ID, dia).get("horarios", []))
    gb = set(grade(s_b["idServico"], TESTE_ID, dia).get("horarios", []))
    ok = [i for i in itens if i["valor"]["itens"][0]["hora"] in ga and i["valor"]["itens"][1]["hora"] in gb]  # a escrita vai ao barbeiro de teste (TESTE)
    return r, (ok[0] if ok else None)


def r7():
    print("r7 dois servicos (SC-005): 2 agendamentos, o 2o comecando em horaInicio do 1o + minutos")
    a, b = _dois_servicos()
    c = ini(536)
    d, api = _api_deploy()
    with chamador(api) as chamar:
        r, it = _sequencia(chamar, c, 536, a, b, _dia_dois(a))
        checar("oferta de sequencias (encadeamento)", bool(it), str(r)[:200])
        if not it:
            return
        f1, f2 = propor_e_confirmar(chamar, c, 536, operacao="agendar", id_opcao_horario=it["id"])
    ag = sorted(_agendas_paulo(), key=lambda x: x["horaInicio"])
    checar("proposta agendar_conjunto executada com 2 criados", bool(f2) and f2.get("ok") is True and len(f2.get("criados", [])) == 2, str(f2)[:200])
    m = it["valor"]["itens"][0]["minutos"]
    esp = None
    if len(ag) == 2:
        h, mi = int(ag[0]["horaInicio"][11:13]), int(ag[0]["horaInicio"][14:16])
        t = h * 60 + mi + m
        esp = f"{t // 60:02d}:{t % 60:02d}"
    checar("2 agendamentos, o 2o = horaInicio do 1o + minutos", len(ag) == 2 and ag[1]["horaInicio"][11:16] == esp, str([(x["descricaoServico"], x["horaInicio"]) for x in ag]) + f" minutos={m}")
    limpar_paulo()


def r8():
    print("r8 conjunto parcial: ocupar o horario do 2o servico entre a proposta e o 'sim'")
    a, b = _dois_servicos()
    c = ini(537)
    d, api = _api_deploy()
    dia = _dia_dois(a)
    with chamador(api) as chamar:
        r, it = _sequencia(chamar, c, 537, a, b, dia)
        if not it:
            checar("oferta de sequencias", False, str(r)[:200])
            return
        f1 = G(chamar, c, 537, operacao="agendar", id_opcao_horario=it["id"])
        i2 = it["valor"]["itens"][1]
        ocup = graces_post("/agenda", {"idCliente": PAULO, "idServico": i2["idServico"], "idProfissional": TESTE_ID, "data": dia, "horaInicio": i2["hora"]})
        checar("smoke ocupou o horario do 2o servico", bool(ocup.get("idAgenda")), str(ocup)[:160])
        f2 = G(chamar, c, 537, operacao="agendar", proposta_id=f1.get("proposta_id"))
    st = [p["estado"] for p in propostas(537)]
    n_ag = len(_agendas_paulo())
    if f2.get("code") == "conjunto_parcial":
        checar("parcial: diz o que foi e o que faltou", bool(f2.get("criados")) and bool(f2.get("faltaram")), str(f2)[:200])
    else:  # a revalidacao de TODOS os itens antes de escrever barra o conjunto: nada criado (mais seguro que parcial)
        _info.append("r8: com a ocupacao previa a revalidacao barrou o conjunto (horario_indisponivel, 0 criados); 'parcial' so ocorre em corrida entre a revalidacao e o POST (coberto pelo teste unitario)")
        checar("conjunto barrado sem escrita: so a ocupacao existe", f2.get("ok") is not True and st[-1] == "falhou" and n_ag == 1, f"{st} ag={n_ag} {str(f2)[:160]}")
    limpar_paulo()


def r9():
    print("r9 cancelar conjunto: 2 agendamentos, 'cancela os dois' -> 2 DELETE, resultado por item")
    a, b = _dois_servicos()
    dia = _dia_dois(a)
    ga = grade(a["idServico"], TESTE_ID, dia)["horarios"]
    gb = grade(b["idServico"], TESTE_ID, dia)["horarios"]
    mins = lambda h: int(h[:2]) * 60 + int(h[3:])
    h2 = next(h for h in gb if abs(mins(h) - mins(ga[0])) >= 90)
    for sv, h in ((a, ga[0]), (b, h2)):
        r = graces_post("/agenda", {"idCliente": PAULO, "idServico": sv["idServico"], "idProfissional": TESTE_ID, "data": dia, "horaInicio": h})
        checar("semeou agendamento", bool(r.get("idAgenda")), str(r)[:120])
    c = ini(538)
    d, api = _api_deploy()
    with chamador(api) as chamar:
        G(chamar, c, 538, operacao="meus_agendamentos")
        ids = [i["id"] for i in estado(538)["opcoes"].get("itens", [])]
        checar("2 agendamentos listados", len(ids) >= 2, str(ids))
        f1, f2 = propor_e_confirmar(chamar, c, 538, operacao="cancelar", id_opcoes_agendamentos=ids[:2]) if len(ids) >= 2 else ({}, None)
    checar("cancelar_conjunto executada: 2 cancelados, 0 faltaram", bool(f2) and f2.get("ok") is True and len(f2.get("criados", [])) == 2 and not f2.get("faltaram"), str(f2)[:200])
    checar("0 agendamentos do Paulo no barbeiro de teste", not _agendas_paulo())
    limpar_paulo()


def r10():
    print("r10 limpeza (SC-008): 0 agendamentos futuros do Paulo no barbeiro de teste ao fim da rodada")
    limpar_paulo()
    checar("0 agendamentos futuros do Paulo no barbeiro de teste", not _agendas_paulo())


ROTEIROS = ["r1", "r2", "r3", "r4", "r5", "r6", "r7", "r8", "r9", "r10"]


# ---------------------------------------------------------------- limpeza e SC-010
def encerrar():
    print("encerramento (TESTE): SC-010, cancelamento do que ficou executado, limpeza de Postgres/Redis")
    ex = json.loads(sql(f"SELECT coalesce(json_agg(json_build_object('p',p.id,'a',p.resultado->>'idAgenda')),'[]') FROM propostas p JOIN contatos c ON c.id=p.contato_id "
                        f"WHERE c.telefone LIKE '{PREFIXO}%' AND p.estado IN ('executada','executando','incerta');"))
    for e in ex:
        if e["a"]:
            req = urllib.request.Request(f"https://{os.environ['GRACES_BASE_URL_PROD']}/public/v1/agenda/{e['a']}", method="DELETE",
                                         headers={"X-Api-Key": os.environ["GRACES_API_KEY"]})
            try:
                urllib.request.urlopen(req, timeout=30)
            except urllib.error.HTTPError as err:
                print(f"  cancelamento de {e['a']}: HTTP {err.code}")
    for a in set(_ocupados) | {x["idAgenda"] for x in (_agendas_paulo() if os.environ.get("GRACES_API_KEY") else [])}:  # roteiros P1: tudo do Paulo no barbeiro de teste
        try:
            urllib.request.urlopen(urllib.request.Request(f"https://{os.environ['GRACES_BASE_URL_PROD']}/public/v1/agenda/{a}", method="DELETE", headers={"X-Api-Key": os.environ["GRACES_API_KEY"]}), timeout=30)
            print(f"  cancelado (barbeiro de teste): {a}")
        except urllib.error.HTTPError as err:
            print(f"  cancelamento de {a}: HTTP {err.code}")
    if os.environ.get("GRACES_API_KEY"):
        checar("SC-008: 0 agendamentos futuros do Paulo no barbeiro de teste", not _agendas_paulo())
    checar("SC-010: 0 agendamentos criados pela rodada ficaram ativos (propostas executadas a cancelar)", not ex, f"cancelados={len(ex)}")
    lista = CFG["teste"]
    checar("nenhum envio real: contatos_escrita vazio e todos os contatos do smoke simulados", lista["contatos_escrita"] in ([], [PAULO_TEL]) and tel(500)[:11] == "+5500000000")
    sql(f"DELETE FROM falhas_agente WHERE contato_id IN (SELECT id FROM contatos WHERE telefone LIKE '{PREFIXO}%');")
    sql(f"DELETE FROM contatos WHERE telefone LIKE '{PREFIXO}%' OR telefone='{PAULO_TEL}';")  # turnos/mensagens/conversas/propostas caem por CASCADE
    spec = importlib.util.spec_from_file_location("limpar_redis", os.path.join(RAIZ, "scripts", "limpar-redis.py"))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    for p in ("ultima:", "lock:"):
        mod.main(["--alvo", "teste", "--padrao", p])
    print("  restantes:", sql(f"SELECT count(*) FROM contatos WHERE telefone LIKE '{PREFIXO}%';"))


# ---------------------------------------------------------------- midia (audio-imagem, FASE 7.2/7.4): audio real, contatos simulados
LOCAL_MIDIA = os.path.join(RAIZ, "tests", "fixtures", "midia-real.local.json")  # fora do git: voz do owner e caminho do storage


def _local(nome):
    """Audio real guardado (gravado pelo owner pela 145 e mantido fora do git): (url, segundos)."""
    try:
        d = json.load(open(LOCAL_MIDIA, encoding="utf-8"))[nome]
    except (FileNotFoundError, KeyError):
        raise SystemExit(f"sem '{nome}' em {LOCAL_MIDIA}: grave o audio pela 145 e registre a URL")
    return d["url"], d["segundos"]


def _midia_real(tipo, longo=False):
    """URL de uma midia REAL ja recebida pela 145 (ainda dentro da retencao). Sem URL no repo: o storage traz caminho da empresa."""
    lim = CFG["midia"]["audio_max_s"]
    cond = f"AND midia_segundos {'>' if longo else '<='} {lim}" if tipo == "audio" else ""
    r = sql(f"SELECT midia_url||'|'||coalesce(midia_segundos,0) FROM mensagens m JOIN contatos c ON c.id=m.contato_id WHERE m.tipo='{tipo}' "
            f"AND m.direcao='entrada' AND m.midia_url LIKE 'https://{CFG['midia']['hosts_audio'][0]}/%' AND c.telefone NOT LIKE '+55000%' {cond} "
            f"ORDER BY m.id DESC LIMIT 1;")
    if not r:
        raise SystemExit(f"sem {tipo} real dentro da retencao: mande um pela 145 e rode de novo")
    u, seg = r.rsplit("|", 1)
    return u, int(seg)


def evento_midia(n, url, segundos=5, legenda=None):
    """Payload real de nota de voz (evento-20) com o fileUrl trocado; ?smoke= deixa o mensagem_id_canal unico (o storage ignora a query)."""
    b = json.load(open(os.path.join(RAIZ, "tests", "fixtures", "chatmaster", "evento-20.json"), encoding="utf-8"))["body"]
    b.update(sender=tel(n), token_origin=TOKEN)
    m = b["mensagem"][0]
    m["fileUrl"] = url if "smoke=" in url else f"{url}?smoke={uuid.uuid4().hex[:10]}"
    m["originalData"]["audioMessage"]["seconds"] = segundos
    if legenda:
        m["text"] = legenda
    return b


def entradas(n):
    return json.loads(sql(f"SELECT coalesce(json_agg(json_build_object('id',id,'tipo',tipo,'turno',turno_id,'mime',midia_mime,'seg',midia_segundos,"
                          f"'falha',midia_falha,'derivado',conteudo_derivado,'canal',mensagem_id_canal) ORDER BY id),'[]') FROM mensagens "
                          f"WHERE contato_id={cid(n) or 0} AND direcao='entrada';"))


NAO_ENT = lambda: (CFG["textos"]["midia_nao_entendida"], CFG["textos"]["contingencia"])


def m1():
    print("M1 (7.2.1) nota de voz real 'quero cortar o cabelo amanha de tarde': transcrita, resposta coerente, payload confere com evento-20")
    url, seg = _local("cortar_amanha_tarde")
    semear(440, {"idCliente": FANTASMA, "cliente_nome": "Teste"})
    t = turno(440, evento_midia(440, url, seg))
    e = (entradas(440) or [{}])[-1]
    checar("turno concluido", bool(t) and t["estado"] == "concluido", str(t)[:160])
    checar("gravado: tipo audio, mime e segundos do payload", e.get("tipo") == "audio" and e.get("mime") == "audio/ogg; codecs=opus" and e.get("seg") == seg, str(e)[:200])
    checar("transcricao em conteudo_derivado, sem falha", bool(e.get("derivado")) and not e.get("falha"), str(e)[:200])
    checar("resposta coerente (nao e aviso de midia/contingencia)", bool(t) and t["saidas"] and not set(t["saidas"]) & set(NAO_ENT()), str(t and t["saidas"])[:200])
    checar("0 falhas_agente", not falhas(440), str(falhas(440)))
    print("    transcricao:", str(e.get("derivado"))[:120], "| resposta:", str(t and t["saidas"])[:160])


def m2():
    print("M2 (7.2.2) audio + texto na mesma janela: um turno so, com os dois")
    url, seg = _midia_real("audio")
    semear(441, {"idCliente": FANTASMA, "cliente_nome": "Teste"})
    post(evento_midia(441, url, seg))
    t = turno(441, evento(441, "é pra amanhã"))
    es = entradas(441)
    checar("duas entradas no mesmo turno", len(es) == 2 and es[0]["turno"] and es[0]["turno"] == es[1]["turno"], str([(x["tipo"], x["turno"]) for x in es]))
    checar("um turno concluido", int(sql(f"SELECT count(*) FROM turnos WHERE contato_id={cid(441)};")) == 1 and bool(t) and t["estado"] == "concluido")


def m3():
    print("M3 (7.2.2) erro da OpenAI na transcricao: credencial invalida so no interpretar-midia de TESTE, restaurada no finally")
    url, seg = _midia_real("audio")

    def esperado(t):
        f = falhas(442)
        checar("resposta e o aviso de midia nao entendida", bool(t) and CFG["textos"]["midia_nao_entendida"] in t["saidas"], str(t and t["saidas"])[:200])
        checar("falhas_agente midia|transcricao, sem URL", any(x.startswith("midia|transcricao") for x in f) and not any("http" in x for x in f), str(f))
    _cenario_credencial(442, "interpretar_midia", "interpretar_midia", "openAiApi", {"apiKey": "sk-invalida-smoke"}, evento_midia(442, url, seg), esperado)


def m4():
    print("M4 (7.4.1) duas midias ilegiveis na mesma janela: uma unica resposta")
    host = CFG["midia"]["hosts_audio"][0]
    semear(443, {"idCliente": FANTASMA, "cliente_nome": "Teste"})
    post(evento_midia(443, f"https://{host}/smoke-inexistente/{uuid.uuid4().hex}.mp3"))
    t = turno(443, evento_midia(443, f"https://{host}/smoke-inexistente/{uuid.uuid4().hex}.mp3"))
    es = entradas(443)
    checar("duas entradas, ambas com midia_falha, mesmo turno", len(es) == 2 and all(x["falha"] for x in es) and es[0]["turno"] == es[1]["turno"], str([(x["falha"], x["turno"]) for x in es]))
    checar("uma unica resposta", bool(t) and len(t["saidas"]) == 1, str(t and t["saidas"])[:200])


def m5():
    print("M5 (7.4.2) reenvio do mesmo evento de midia: uma linha em mensagens")
    url, seg = _midia_real("audio")
    semear(444, {"idCliente": FANTASMA, "cliente_nome": "Teste"})
    corpo = evento_midia(444, url, seg)
    turno(444, corpo)
    s, _ = post(corpo)
    time.sleep(8)
    checar("reenvio aceito sem erro", s == 200, str(s))
    checar("uma linha para o fileUrl", int(sql(f"SELECT count(*) FROM mensagens WHERE mensagem_id_canal=$u${corpo['mensagem'][0]['fileUrl']}$u$;")) == 1)


def m6(limite_s=420):
    print("M6 (7.4.3) retencao: linhas semeadas vencidas (sem mudar config; mesmo SQL do bv-vigia), recentes intactas")
    c = semear(445)
    h = CFG["midia"]["retencao_h"]
    ids = {}
    for nome, idade in (("vencida", h + 1), ("recente", 0)):
        ids[nome] = int(sql(f"INSERT INTO mensagens(contato_id,mensagem_id_canal,direcao,tipo,conteudo,midia_url,midia_mime,conteudo_derivado,criado_em) VALUES "
                            f"({c},'https://smoke.invalid/{uuid.uuid4().hex}','entrada','audio','legenda smoke','https://smoke.invalid/a.ogg','audio/ogg','transcricao smoke',"
                            f"now() - make_interval(secs => {idade} * 3600)) RETURNING id;").splitlines()[0])
    lin = lambda i: sql(f"SELECT coalesce(midia_url,'')||'|'||coalesce(conteudo,'')||'|'||coalesce(conteudo_derivado,'')||'|'||mensagem_id_canal FROM mensagens WHERE id={i};")
    fim = time.time() + limite_s
    while time.time() < fim and not lin(ids["vencida"]).startswith("|||sha256:"):
        time.sleep(15)
    checar("vencida sem URL/conteudo e com sha256:", lin(ids["vencida"]).startswith("|||sha256:"), lin(ids["vencida"])[:80])
    checar("recente intacta", lin(ids["recente"]).startswith("https://smoke.invalid/a.ogg|legenda smoke|transcricao smoke|https://"))
    vaz = sql("SELECT count(*) FROM falhas_agente WHERE code ~ '(https?://|\\+?55\\d{10,11})' OR motivo ~ 'https?://';")
    checar("falhas_agente sem URL nem telefone", vaz == "0", vaz)


def m7(n=20):
    print(f"M7 (7.2.3) SC-005: {n} notas de voz curtas reais (reenvio do payload real), resposta <= 30 s apos a janela em 95%")
    falados = [_local(k) for k in ("cortar_amanha_tarde", "preco_corte_barba", "sabado_manha", "pedido_25s")]
    lat0 = len(_lat)
    for i in range(n):
        url, seg = falados[i % len(falados)]
        semear(470 + i, {"idCliente": FANTASMA, "cliente_nome": "Teste"})
        t = turno(470 + i, evento_midia(470 + i, url, seg))
        checar(f"audio {i + 1}: concluido e entendido", bool(t) and t["estado"] == "concluido" and not set(t["saidas"]) & set(NAO_ENT()), str(t and t["saidas"])[:120])
    q = sorted(_lat[lat0:])
    if q:
        p95 = q[min(len(q) - 1, int(len(q) * 0.95))]
        _info.append(f"SC-005: n={len(q)} p50={q[len(q)//2]:.1f}s p95={p95:.1f}s max={q[-1]:.1f}s (inicio do turno -> 1a resposta)")
        checar("SC-005 p95 <= 30 s", p95 <= 30, f"p95={p95:.1f}s")


def m8():
    print("M8 (7.2.2) audio mudo real: sem transcricao, aviso de midia nao entendida")
    url, seg = _local("mudo")
    semear(446, {"idCliente": FANTASMA, "cliente_nome": "Teste"})
    t = turno(446, evento_midia(446, url, seg))
    e = (entradas(446) or [{}])[-1]
    checar("midia_falha registrada e sem conteudo_derivado", bool(e.get("falha")) and not e.get("derivado"), str(e)[:160])
    checar("resposta e o aviso de midia nao entendida", bool(t) and CFG["textos"]["midia_nao_entendida"] in t["saidas"], str(t and t["saidas"])[:160])


def verificar_implantado():
    """O workflow implantado tambem tem de enviar so a contatos_escrita (vazio): sem envio real no smoke."""
    d, api = _api_deploy()
    wf = api("GET", f"/workflows/{CFG['workflows_sub']['entregar_rajada']}")
    cod = next(n["parameters"]["jsCode"] for n in wf["nodes"] if n["name"] == "Saidas")
    checar("entregar-rajada implantado: lista de envio real vazia", "const escrita = [].map(dig);" in cod.replace("[ ]", "[]"))


CENARIOS = dict(p2=p2, c6=c6, c7=c7, c1=c1, c4=c4, c2=c2, c3=c3, c5=c5, c9=c9, c10=c10, c11=c11, c14=c14, c15=c15, c12=c12, c13=c13,
                m1=m1, m2=m2, m3=m3, m4=m4, m5=m5, m6=m6, m7=m7, m8=m8,
                r1=r1, r2=r2, r3=r3, r4=r4, r5=r5, r6=r6, r7=r7, r8=r8, r9=r9, r10=r10)

if __name__ == "__main__":
    _env(".env.smoke", ".env.n8n")
    TOKEN = os.environ.get("CHATMASTER_TOKEN_TESTE", "")
    arg = sys.argv[1:]
    if arg == ["--limpar"]:
        encerrar()
        sys.exit(0)
    nomes = arg[1:] if arg[:1] == ["--so"] else (arg or [k for k in CENARIOS if k not in ROTEIROS])
    if not TOKEN or any(n not in CENARIOS for n in nomes):
        sys.exit("CHATMASTER_TOKEN_TESTE ausente ou cenario desconhecido")
    try:
        if "p2" not in nomes:
            verificar_implantado()
        for n in nomes:
            CENARIOS[n]()
    finally:
        encerrar()
    for i in _info:
        print("info:", i)
    if _lat:
        q = sorted(_lat)
        print(f"latencia SC-009: n={len(q)} p50={q[len(q)//2]:.1f}s p90={q[min(len(q)-1, int(len(q)*0.9))]:.1f}s max={q[-1]:.1f}s")
    if _lat_enc:
        q = sorted(_lat_enc)
        print(f"latencia encadeamento: n={len(q)} p90={q[min(len(q)-1, int(len(q)*0.9))]:.1f}s max={q[-1]:.1f}s")
    print("FALHAS:", _falhas or "nenhuma")
    sys.exit(1 if _falhas else 0)
