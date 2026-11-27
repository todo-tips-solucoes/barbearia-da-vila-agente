import glob
import importlib.util
import json
import os
import re
import subprocess
import tempfile
import unittest

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_s = importlib.util.spec_from_file_location("dep", os.path.join(RAIZ, "scripts", "deploy-n8n.py"))
dep = importlib.util.module_from_spec(_s)
_s.loader.exec_module(dep)
CFG = json.load(open(os.path.join(RAIZ, "config", "ambientes", "integracao.json"), encoding="utf-8"))


class Base:
    ARQ = ""

    @classmethod
    def setUpClass(cls):
        cls.texto = open(os.path.join(RAIZ, cls.ARQ), encoding="utf-8").read()
        cls.wf = json.loads(cls.texto)
        cls.nos = {n["name"]: n for n in cls.wf["nodes"]}

    def destinos(self, origem, saida=None):
        s = self.wf["connections"][origem]["main"]
        return [d["node"] for i, x in enumerate(s) for d in x if saida in (None, i)]

    def test_conexoes_e_ids(self):
        self.assertEqual(len({n["id"] for n in self.wf["nodes"]}), len(self.wf["nodes"]))
        for origem, c in self.wf["connections"].items():
            self.assertIn(origem, self.nos)
            for saida in c["main"]:
                for d in saida:
                    self.assertIn(d["node"], self.nos)

    def test_sem_execucao_salva_e_sem_error_workflow(self):  # dados do contato nao ficam no n8n
        st = self.wf["settings"]
        self.assertEqual((st["saveDataSuccessExecution"], st["saveDataErrorExecution"]), ("none", "none"))
        self.assertNotIn("errorWorkflow", st)

    def test_sql_so_com_parametros(self):
        for nome, n in self.nos.items():
            if n["type"] != "n8n-nodes-base.postgres":
                continue
            q = n["parameters"]["query"]
            self.assertNotIn("{{", q, nome)
            self.assertNotIn("${", q, nome)
            self.assertTrue(n["parameters"]["options"]["queryReplacement"].startswith("={{"), nome)
            usados = sorted({int(x) for x in re.findall(r"\$(\d+)", q)})
            self.assertEqual(usados, list(range(1, len(usados) + 1)), nome)

    def test_renderiza_com_o_config_e_o_js_compila(self):
        wf = json.loads(dep.renderizar(self.texto, CFG, RAIZ))
        self.assertNotIn("{{BV:", json.dumps(wf).replace("via {{BV:INCLUDE:shared/", "").replace("({{BV:INCLUDE:...}})", ""))  # o cabecalho do .js incluido cita o placeholder
        for n in wf["nodes"]:
            js = n["parameters"].get("jsCode")
            if js is None:
                continue
            with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False) as f:
                f.write("function __no(){\n" + js + "\n}\n")
            r = subprocess.run(["node", "--check", f.name], capture_output=True, text=True)
            os.unlink(f.name)
            self.assertEqual(r.returncode, 0, f"{n['name']}: {r.stderr[:300]}")

    def test_credenciais_e_producao_recusada(self):  # usa chave teste.*: o deploy recusa PROD
        self.assertTrue("{{BV:teste." in self.texto or self.ARQ.endswith("bv-confirmacao.json"))  # bv-confirmacao: PROD recusado por INATIVOS_PROD
        for n in self.wf["nodes"]:
            if n["type"] == "n8n-nodes-base.httpRequest":
                self.assertEqual(n["onError"], "continueRegularOutput", n["name"])
                self.assertIn("httpHeaderAuth", n["credentials"])


PCFG = json.load(open(os.path.join(RAIZ, "config", "ambientes", "producao.json"), encoding="utf-8"))


def rodar(arq, no, input_, refs=None, each=False, run_index=0, cfg=None):
    """Executa o jsCode renderizado de um Code node com $/$input simulados (tests/harness_code_node.js)."""
    wf = json.loads(dep.renderizar(open(os.path.join(RAIZ, arq), encoding="utf-8").read(), cfg or CFG, RAIZ))
    js = next(n["parameters"]["jsCode"] for n in wf["nodes"] if n["name"] == no)
    r = subprocess.run(["node", os.path.join(RAIZ, "tests", "harness_code_node.js")], capture_output=True, text=True,
                       input=json.dumps({"js": js, "each": each, "input": input_, "refs": refs or {}, "runIndex": run_index}))
    assert r.returncode == 0, r.stderr[:500]
    return json.loads(r.stdout)


TESTE = CFG["graces"]["barbeiro_teste_id"]
TEL = "5511999998888"


class CodeNodes(unittest.TestCase):
    """Execucao real do JS dos Code nodes (config de TESTE renderizado)."""

    def setUp(self):
        self._esc = CFG["teste"]["contatos_escrita"]
        CFG["teste"]["contatos_escrita"] = ["+" + TEL]

    def tearDown(self):
        CFG["teste"]["contatos_escrita"] = self._esc

    def linha(self, **o):
        return {"id": "7", "contato_id": "1", "tipo": "confirmacao", "graces_agendamento_id": "A", "graces_cliente_id": "C", "id_profissional": TESTE,
                "inicio": "2026-10-22T14:00:00", "dados": {"servico": "Corte", "barbeiro": "Ze"}, "tentativas": 0, "reserva": "1.5", "telefone": TEL,
                "handoff_aberto": False, **o}

    def test_decidir_envia_lista_de_confirmacao(self):
        l = self.linha()
        ag = {"statusCode": 200, "body": [{"idAgenda": "A", "horaInicio": "2026-10-22T14:00:00", "idStatusAgenda": 2}]}
        r = rodar("workflows/bv-mensagens.json", "Decidir", [ag], {"Reservar": [l]}, each=True)
        self.assertEqual((r["acao"], r["tipo_msg"]), ("enviar", "lista"))
        self.assertEqual([x["RowId"] for x in r["req"]["body"]["body"]["List"]], ["bvc:7:s", "bvc:7:n"])
        self.assertEqual(r["req"]["body"]["whatsappId"], "145")
        self.assertIn("quinta-feira (22/10)", r["texto"])

    def test_decidir_falha_da_graces_adia_e_nao_envia_as_cegas(self):
        r = rodar("workflows/bv-mensagens.json", "Decidir", [{"error": "timeout"}], {"Reservar": [self.linha()]}, each=True)
        self.assertEqual(r["acao"], "adiar")

    def test_resultado_por_status(self):
        dec = {"id": "7", "reserva": "1.5", "tentativas": 0, "acao": "enviar", "tipo_msg": "lista", "texto": "oi"}
        f = lambda st, d=dec: rodar("workflows/bv-mensagens.json", "Resultado", [{"statusCode": st}] if st is not None else [{"error": "x"}], {"Decidir": [d]}, each=True)
        self.assertEqual(f(200)["situacao"], "enviada")
        self.assertEqual(f(200)["texto"], "oi")
        r = f(500)
        self.assertEqual((r["situacao"], r["tentativas"], r["falha_motivo"]), ("pendente", 1, "mensagem|envio_falhou"))
        r = f(None)  # sem resposta: incerto, sem reenvio
        self.assertEqual((r["situacao"], r["motivo"], r["falha_motivo"]), ("falhou", "incerto", "mensagem|envio_incerto"))
        self.assertEqual(f(500, {**dec, "tentativas": 3})["motivo"], "recusada_canal")
        self.assertEqual(rodar("workflows/bv-mensagens.json", "Resultado", [{}], {"Decidir": [{**dec, "acao": "cancelar", "motivo": "orfa"}]}, each=True)["motivo"], "orfa")

    def test_confirmacao_escolher_e_desfecho(self):
        arq = "workflows/sub/bv-confirmacao.json"
        ent = {"ok": True, "contato_id": "1", "origem": "id", "confirmado": True, "mensagem_id": "7"}
        row = {"id": "7", "situacao": "enviada", "resposta": None, "id_profissional": TESTE, "futuro": True, "repetidas": "0", "inicio": "2026-10-22T14:00:00", "telefone": TEL}
        e = rodar(arq, "Escolher", [row], {"Normalizar": [ent]})[0]
        self.assertEqual(e["acao"], "claim")
        d = rodar(arq, "Desfecho", [{"code": "confirmada", "status": 200}], {"Resolver claim": [{"ent": ent, "row": row, "req": {"idAgenda": "A", "confirmado": True}}]})[0]
        self.assertEqual((d["ok"], d["enviar"], d["id"], d["idAgenda"]), (True, True, "7", "A"))
        self.assertIn("22/10", d["texto"])
        d = rodar(arq, "Desfecho", [{"code": "falhou", "status": 503}], {"Resolver claim": [{"ent": ent, "row": row, "req": {"idAgenda": "A"}}]})[0]
        self.assertEqual((d["liberar"], d["falha"]["code"]), (True, "HTTP_503"))
        d = rodar(arq, "Desfecho", [{"acao": "fim", "code": "repetida", "ent": {**ent, "origem": "titulo"}, "row": row}])[0]
        self.assertEqual((d["texto"], d["enviar"]), ("", False))  # dedupe do mesmo toque: silencio
        sim = rodar(arq, "Desfecho", [{"acao": "fim", "code": "confirmada", "ent": ent, "row": {**row, "telefone": "5500000000510"}}])[0]
        self.assertEqual((sim["enviar"], sim["simulado"]), (False, True))  # contato fora de teste.contatos_escrita: nunca vai ao Chat Master
        self.assertEqual((d_ok := rodar(arq, "Desfecho", [{"code": "confirmada", "status": 200}], {"Resolver claim": [{"ent": ent, "row": row, "req": {"idAgenda": "A"}}]})[0])["enviar"], True)
        d = rodar(arq, "Desfecho", [{"acao": "fim", "code": "confirmada", "ent": {**ent, "origem": "agente"}, "row": row}])[0]
        self.assertEqual(d["enviar"], False)  # origem=agente: o agente responde sozinho

    def test_reconciliar_cria_e_ignora_reagendada(self):
        arq = "workflows/bv-mensagens.json"
        ag = {"idAgenda": "A", "horaInicio": "2099-10-22T14:00:00", "horaFim": "2099-10-22T14:45:00", "idStatusAgenda": 2, "ddiCelular": "55", "celularCliente": "(11) 99999-8888",
              "nomeServico": "Corte", "profissional": "Ze", "idProfissional": TESTE}
        r = rodar(arq, "Reconciliar", [{"linhas": [], "contatos": [{"id": 1, "telefone": TEL}]}], {"Achatar": [{"agenda": [ag]}]})[0]
        self.assertEqual(sorted(x["tipo"] for x in r["criar"]), ["lembrete_dia", "lembrete_hora"])  # owner, 2026-11-15: lembretes no Chat Master
        self.assertEqual(r["criar"][0]["dados"], {"servico": "Corte", "barbeiro": "Ze", "fim": "2099-10-22T14:45:00"})


class Recepcao(unittest.TestCase):
    """4.2: a recepcao reconhece a selecao da lista (id primario, titulo como fallback) sem regredir o fluxo normal."""
    ARQ = "workflows/bv-recepcao.json"

    def norm(self, body):
        os.environ["BV_WEBHOOK_TOKEN_SHA256"] = "tok"
        return rodar(self.ARQ, "Normalizar", [{"tokenHash": "tok", "body": body}])[0]

    def test_selecao_por_id_vira_resultado_selecao(self):
        dj = json.dumps({"rawData": {"event": {"Message": {"listResponseMessage": {"singleSelectReply": {"selectedRowID": "bvc:7:n"}, "contextInfo": {"stanzaID": "W"}}}}}})
        r = self.norm({"acao": "from_internal", "fromMe": False, "sender": TEL, "mensagem": {"body": "Nao vou poder", "dataJson": dj}})
        self.assertEqual((r["resultado"], r["telefone"], r["rec"]["mensagem_id"], r["rec"]["confirmado"]), ("selecao", TEL, 7, False))

    def test_from_internal_comum_continua_descartado(self):
        r = self.norm({"acao": "from_internal", "fromMe": False, "sender": TEL, "mensagem": {"body": "oi", "dataJson": "{}"}})
        self.assertEqual(r["resultado"], "descartada")
        dj = json.dumps({"rawData": {"event": {"Message": {"listResponseMessage": {"singleSelectReply": {"selectedRowID": "bv_conf_teste_sim"}}}}}})
        self.assertEqual(self.norm({"acao": "from_internal", "sender": TEL, "mensagem": {"dataJson": dj}})["resultado"], "descartada")  # id fora do formato bvc:

    def test_titulo_exato_marca_a_mensagem_e_texto_comum_nao(self):
        ev = lambda t: {"acao": "start", "fromMe": False, "sender": TEL, "chamadoId": 5, "mensagem": [{"type": "text", "text": t}]}
        self.assertEqual(self.norm(ev("Confirmo"))["msg"]["confirmaTitulo"], "sim")
        self.assertEqual(self.norm(ev("Não vou poder"))["msg"]["confirmaTitulo"], "nao")
        r = self.norm(ev("oi, tudo bem?"))
        self.assertEqual((r["resultado"], r["msg"]["confirmaTitulo"]), ("aceita", ""))
        # "sim" digitado ao lembrete de 24 h (23/11): marca a mensagem como titulo E como digitada; o "nao" digitado fica com o agente
        for t in ("Sim", "Confirmado!"):
            m = self.norm(ev(t))["msg"]
            self.assertEqual((m["confirmaTitulo"], m["confirmaDigitado"]), ("sim", True), t)
        self.assertEqual(self.norm(ev("Confirmo"))["msg"]["confirmaDigitado"], False)
        for t in ("Não", "Não posso", "Sim, mas vou atrasar"):
            self.assertEqual(self.norm(ev(t))["msg"]["confirmaTitulo"], "", t)

    def test_grafo(self):
        wf = json.load(open(os.path.join(RAIZ, self.ARQ), encoding="utf-8"))
        g = {o: [[d["node"] for d in s] for s in c["main"]] for o, c in wf["connections"].items()}
        self.assertEqual(g["Roteador"][4], ["Responder 200 selecao"])  # responde antes de processar
        self.assertEqual(g["Contato achado?"][0], ["Montar confirmacao id"])
        self.assertEqual(g["Responder 200 titulo"], [["Aguardar id"]])  # espera o evento com id antes do titulo
        self.assertEqual(g["Montar confirmacao titulo"], [["Chamar bv-confirmacao titulo"]])
        nos = {n["name"]: n for n in wf["nodes"]}
        for nome in ("Chamar bv-confirmacao id", "Chamar bv-confirmacao titulo"):
            self.assertEqual(nos[nome]["parameters"]["workflowId"]["value"], "{{BV:workflows_sub.bv_confirmacao}}")
            self.assertEqual(nos[nome]["onError"], "continueRegularOutput")
        self.assertIn("mensagens.espera_texto_s", nos["Aguardar id"]["parameters"]["amount"])
        self.assertIn("SELECT id AS contato_id FROM contatos WHERE telefone = $1::text", nos["Contato da selecao"]["parameters"]["query"])  # nao cria contato


class BvMensagens(Base, unittest.TestCase):
    ARQ = "workflows/bv-mensagens.json"

    def test_dois_agendadores(self):
        gat = [n for n in self.wf["nodes"] if n["type"] == "n8n-nodes-base.scheduleTrigger"]
        self.assertEqual(len(gat), 5)  # varredura (legado), reconciliacao, sincronizacao com o Chat Master, retomada (16/11) e convite de volta (27/11)
        j = json.dumps(self.wf)
        self.assertIn("{{BV:NUM:mensagens.varredura_s}}", j)
        self.assertIn("{{BV:NUM:mensagens.reconciliacao_min}}", j)

    def test_retomada_de_agendamento_abandonado(self):  # owner, 2026-11-16 (roadmap feature 9): uma vez por sessao, nunca duplica
        self.assertEqual(self.destinos("A cada retomada"), ["Reivindicar retomadas"])
        self.assertEqual(self.destinos("Envia retomada?", 0), ["Enviar retomada"])
        self.assertEqual(self.destinos("Envia retomada?", 1), ["Resultado retomada"])  # simulado no TESTE: grava sem enviar
        self.assertEqual(self.destinos("Resultado retomada"), ["Gravar retomada"])
        q = self.nos["Reivindicar retomadas"]["parameters"]["query"]
        for t in ("$1::boolean", "FOR UPDATE OF c SKIP LOCKED", "UPDATE conversas c SET retomada_em = now()", "c.retomada_em < c.sessao_iniciada_em",
                  "position('?' in coalesce(u.conteudo, '')) > 0", "coalesce(c.pedido->>'handoff', 'false') <> 'true'", "p.estado IN ('executada','executando','incerta')"):
            self.assertIn(t, q)
        self.assertEqual(sorted({int(x) for x in re.findall(r"\$(\d+)", q)}), list(range(1, 11)))
        self.assertEqual(q.count("("), q.count(")"))
        g = self.nos["Gravar retomada"]["parameters"]["query"]
        self.assertEqual((sorted({int(x) for x in re.findall(r"\$(\d+)", g)}), g.count("(") == g.count(")")), (list(range(1, 10)), True))  # 5 a 9: a cauda de envio tambem fecha a linha do convite de volta (27/11)
        self.assertEqual(self.nos["Enviar retomada"]["credentials"]["httpHeaderAuth"]["id"], "{{BV:credenciais.chatmaster}}")
        lin = {"contato_id": "9", "telefone": TEL, "nome": "DANIEL", "servico": "Cabelo adulto + barba",
               "proposta": {"acao": "agendar", "dados": {"servico": "Cabelo adulto + barba", "barbeiro": "Pedro Henrique", "data": "2030-01-10", "hora": "14:40"}}}
        esc, CFG["teste"]["contatos_escrita"] = CFG["teste"]["contatos_escrita"], ["+" + TEL]
        try:
            r = rodar("workflows/bv-mensagens.json", "Montar retomada", [lin])
        finally:
            CFG["teste"]["contatos_escrita"] = esc
        self.assertEqual(r[0]["texto"], "Oi, Daniel! Ficou faltando só confirmar o seu Cabelo adulto + barba com Pedro Henrique em 10/01 às 14:40. Ainda quer esse horário?")
        self.assertEqual((r[0]["simulado"], r[0]["req"]["body"]["number"], r[0]["req"]["body"]["openTicket"]), (False, TEL, "0"))  # na lista de escrita do TESTE: envia de verdade
        r2 = rodar("workflows/bv-mensagens.json", "Montar retomada", [{**lin, "telefone": "5500000000510", "proposta": None}])
        self.assertEqual((r2[0]["simulado"], r2[0]["texto"]), (True, "Oi, Daniel! A gente não terminou de marcar o seu Cabelo adulto + barba. Quer continuar de onde paramos?"))
        ok = rodar("workflows/bv-mensagens.json", "Resultado retomada", [{"statusCode": 200}], {"Envia retomada?": r}, each=True)
        self.assertEqual((ok["texto"], ok["code"]), (r[0]["texto"], None))
        ko = rodar("workflows/bv-mensagens.json", "Resultado retomada", [{"error": "x"}], {"Envia retomada?": r}, each=True)
        self.assertEqual((ko["texto"], ko["code"]), (None, "SEM_RESPOSTA"))  # falha: nada gravado como enviado, sem nova tentativa
        self.assertEqual((ok["origem"], ok["convite"]), ("retomada", None))  # a cauda e compartilhada com o convite de volta; a retomada segue igual
        self.assertIn("$5::text || '-' || $1::text || '-' ||", g)
        self.assertTrue(self.nos["Gravar retomada"]["parameters"]["options"]["queryReplacement"].endswith("$json.origem || 'retomada', ($json.convite || {}).id ?? null, ($json.convite || {}).situacao ?? null, ($json.convite || {}).motivo ?? null, ($json.convite || {}).sessoes ?? null] }}"))

    def test_convite_de_volta(self):  # owner, 2026-11-27: lembrete a quem esta ha quase um mes sem cortar
        con = {k: [[c["node"] for c in s] for s in v["main"]] for k, v in self.wf["connections"].items()}
        self.assertEqual([con[n] for n in ("A cada convite", "Reivindicar convite", "Pedir cliente", "Graces cliente", "Pedir convite", "Consulta convite?", "Graces convite", "Decidir convite")],
                         [[["Reivindicar convite"]], [["Pedir cliente"]], [["Graces cliente"]], [["Pedir convite"]], [["Consulta convite?"]], [["Graces convite"], ["Decidir convite"]], [["Decidir convite"]], [["Envia retomada?"]]])
        # sem ciclo: do gatilho do convite nao se volta a nenhum no ja visitado, e o ramo nao chama sub-workflow
        visto, pilha = set(), ["A cada convite"]
        while pilha:
            n = pilha.pop()
            caminho_novo = n not in visto
            visto.add(n)
            if caminho_novo:
                pilha += [d for s in con.get(n, []) for d in s]
        self.assertEqual(visto, {"A cada convite", "Reivindicar convite", "Pedir cliente", "Graces cliente", "Pedir convite", "Consulta convite?", "Graces convite", "Decidir convite", "Envia retomada?", "Enviar retomada", "Resultado retomada", "Gravar retomada"})
        self.assertEqual([self.nos[n]["type"] for n in visto if "executeWorkflow" in self.nos[n]["type"]], [])
        self.assertEqual(self.nos["A cada convite"]["parameters"]["rule"]["interval"][0], {"field": "minutes", "minutesInterval": "{{BV:NUM:convite.intervalo_min}}"})
        q = self.nos["Reivindicar convite"]["parameters"]["query"]
        for t in ("$1::boolean AND extract(isodow FROM sp)::int = ANY(string_to_array($2::text, ',')::int[]) AND sp::time >= $3::time AND sp::time < $4::time",  # ligado, dia da semana e horario
                  "e.tipo = 'convite_volta' AND e.enviada_em >= date_trunc('day', sp) AT TIME ZONE 'America/Sao_Paulo') < $5::int",  # teto por dia
                  "f.motivo = 'mensagem|convite_falhou' AND f.criado_em > now() - interval '1 hour') + (SELECT count(*)",  # disjuntor: falhas de envio
                  "b.visita::date BETWEEN (SELECT sp FROM agora)::date - $8::int AND (SELECT sp FROM agora)::date - $7::int",  # janela de dias
                  "WHERE NOT b.futuro", "o.tipo = 'convite_volta' AND o.motivo = 'parou'", "c.fila_id IS DISTINCT FROM $9::int", "<> ALL(string_to_array($10::text, ','))",
                  "h.situacao = 'aberto'", "x.criado_em > now() - make_interval(days => $11::int)",
                  "v.tipo = 'convite_volta' AND v.inicio >= b.visita::date AND v.motivo IS DISTINCT FROM 'graces_falhou')",  # um convite por visita; leitura que falhou tenta de novo
                  "velhas AS (UPDATE mensagens_agendadas SET situacao = 'cancelada', motivo = 'graces_falhou', reservada_em = NULL, atualizado_em = now() WHERE tipo = 'convite_volta' AND situacao = 'pendente' AND reservada_em < now() - interval '15 minutes' RETURNING 1)",  # linha que ficou no meio do caminho
                  "+ (SELECT count(*) FROM mensagens_agendadas g WHERE g.tipo = 'convite_volta' AND g.criado_em > now() - interval '1 hour' AND (g.situacao = 'pendente' OR g.motivo = 'graces_falhou')) < $6::int",  # Graces fora tambem para as rodadas
                  "coalesce(m.motivo, '') NOT IN ('orfa','reagendada','cancelada_agente')",  # agendamento que deixou de existir nao e visita
                  "ORDER BY b.visita LIMIT 1 FOR UPDATE OF c SKIP LOCKED"):  # um por rodada
            self.assertIn(t, q)
        self.assertEqual((sorted({int(x) for x in re.findall(r"\$(\d+)", q)}), q.count("(") == q.count(")")), (list(range(1, 12)), True))
        for n in ("Graces cliente", "Graces convite"):
            self.assertEqual((self.nos[n]["parameters"]["method"], self.nos[n]["credentials"]["httpHeaderAuth"]["id"], self.nos[n]["onError"]), ("GET", "{{BV:credenciais.graces}}", "continueRegularOutput"))
        # os outros ramos nao enxergam o tipo novo
        for n, t in (("Reservar", "m.tipo IN ('confirmacao','lembrete','pos_atendimento')"), ("Pendencias", "m.tipo = ANY(ARRAY['lembrete_dia','lembrete_hora'])")):
            self.assertIn(t, self.nos[n]["parameters"]["query"])
        # execucao dos nos: sem candidato nada segue; cadastro unico pede as tres leituras; sem cadastro vai direto a decisao
        self.assertEqual(rodar(self.ARQ, "Pedir cliente", [{"success": True}]), [])
        cand = {"convite_id": "77", "contato_id": "9", "telefone": "+55 (11) 99999-8888", "nome": "DANIEL souza", "visita": "2030-01-01"}
        pc = rodar(self.ARQ, "Pedir cliente", [cand])
        self.assertEqual(pc[0]["req"], {"m": "GET", "path": "/agenda/clientes", "qs": {"celular": TEL}})
        U = "11111111-1111-4111-8111-111111111111"
        reqs = rodar(self.ARQ, "Pedir convite", [{"statusCode": 200, "body": [{"idCliente": U}]}])
        self.assertEqual([r["req"]["path"] for r in reqs], ["/agenda/historico", "/agenda/agendamentos", "/agenda/pacotes"])
        self.assertEqual(rodar(self.ARQ, "Pedir convite", [{"statusCode": 200, "body": []}]), [{"fim": {"enviar": False, "motivo": "sem_cadastro"}}])
        d = rodar(self.ARQ, "Decidir convite", [{"fim": {"enviar": False, "motivo": "sem_cadastro"}}], {"Pedir cliente": pc})
        self.assertEqual(d, [{"contato_id": "9", "origem": "convite", "texto": None, "req": None, "simulado": True, "convite": {"id": "77", "situacao": "cancelada", "motivo": "sem_cadastro"}}])
        import datetime
        ha26 = (datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=-3))) - datetime.timedelta(days=26)).strftime("%Y-%m-%d")
        resp = [{"statusCode": 200, "body": [{"dataAbertura": ha26 + "T10:00:00"}]}, {"statusCode": 200, "body": []},
                {"statusCode": 200, "body": [{"dataValidade": None, "secoes": [{"idClienteItemPacote": U, "idProdutoServico": "s"}, {"idClienteItemPacote": U.replace("1111-4", "2222-4"), "idProdutoServico": "s"}]}]}]
        d = rodar(self.ARQ, "Decidir convite", resp, {"Pedir cliente": pc})[0]
        self.assertEqual((d["simulado"], d["origem"], d["convite"], d["req"]["path"], d["req"]["body"]["number"], d["req"]["body"]["openTicket"]), (True, "convite", {"id": "77", "situacao": "enviada", "sessoes": 2}, "/api/messages/send", TEL, "0"))
        self.assertTrue(d["texto"].startswith("Oi, Daniel! Já faz quase um mês do seu último corte aqui na Barbearia da Vila. Você ainda tem 2 sessões do seu pacote disponíveis para agendar. "))
        self.assertNotIn("?", d["texto"])
        d2 = rodar(self.ARQ, "Decidir convite", [resp[0], {"statusCode": 200, "body": [{"idAgenda": "a1"}]}, resp[2]], {"Pedir cliente": pc})[0]
        self.assertEqual(d2["convite"], {"id": "77", "situacao": "cancelada", "motivo": "tem_horario"})
        canc = rodar(self.ARQ, "Resultado retomada", [d2], {"Envia retomada?": [d2]}, each=True)  # nao envia: nada gravado como mensagem nem como falha
        self.assertEqual((canc["texto"], canc["code"], canc["convite"]), (None, None, {"id": "77", "situacao": "cancelada", "motivo": "tem_horario"}))
        # a cauda de envio fecha a linha: enviada (simulado), ou falhou quando o canal recusa
        ok = rodar(self.ARQ, "Resultado retomada", [d], {"Envia retomada?": [d]}, each=True)
        self.assertEqual((ok["origem"], ok["texto"], ok["code"], ok["convite"]), ("convite", d["texto"], None, {"id": "77", "situacao": "enviada", "sessoes": 2}))
        real = {**d, "simulado": False}
        ko = rodar(self.ARQ, "Resultado retomada", [{"statusCode": 500}], {"Envia retomada?": [real]}, each=True)
        self.assertEqual((ko["texto"], ko["code"], ko["convite"]["situacao"], ko["convite"]["motivo"]), (None, "HTTP_500", "falhou", "envio"))
        g = self.nos["Gravar retomada"]["parameters"]["query"]
        self.assertIn("cv AS (UPDATE mensagens_agendadas SET situacao = $7::text, motivo = $8::text, enviada_em = CASE WHEN $7::text = 'enviada' THEN now() END, dados = dados || jsonb_build_object('sessoes', COALESCE($9::int, 0)), reservada_em = NULL, atualizado_em = now() WHERE id = $6::bigint AND tipo = 'convite_volta' AND situacao = 'pendente' AND $7::text IS NOT NULL RETURNING 1)", g)
        self.assertIn("'mensagem|' || $5::text || '_falhou'", g)
        rj = json.loads(ler("workflows/sub/entregar-rajada.json")) if "ler" in globals() else json.load(open(os.path.join(RAIZ, "workflows", "sub", "entregar-rajada.json"), encoding="utf-8"))
        nos = {n["name"]: n for n in rj["nodes"]}
        self.assertIn("retomada_ms", nos["Ler contexto"]["parameters"]["query"])
        self.assertIn("retomadaMs: ctx.retomada_ms == null ? null : Number(ctx.retomada_ms)", nos["Decidir silencio"]["parameters"]["jsCode"])

    def test_sincronizacao_chatmaster(self):  # owner, 2026-11-15: lembretes no modulo de Agendamentos, so a diferenca vira chamada
        self.assertEqual(self.destinos("A cada sincronizacao"), ["Pendencias"])
        self.assertEqual(self.destinos("Chama o Chat Master?", 0), ["Chat Master agendamentos"])
        self.assertEqual(self.destinos("Chama o Chat Master?", 1), ["Resultado sincronizacao"])
        self.assertEqual(self.destinos("Resultado sincronizacao"), ["Gravar sincronizacao"])
        q = self.nos["Pendencias"]["parameters"]["query"]
        for t in ("ARRAY['lembrete_dia','lembrete_hora']", "FOR UPDATE OF m SKIP LOCKED", "m.situacao IN ('cancelada','falhou') AND m.agendamento_canal_id IS NOT NULL", "m.atualizado_em > m.canal_sincronizado_em"):
            self.assertIn(t, q)
        self.assertIn("m.tipo IN ('confirmacao','lembrete','pos_atendimento')", self.nos["Reservar"]["parameters"]["query"])  # legado nao envia os novos
        self.assertEqual(self.nos["Chat Master agendamentos"]["credentials"]["httpHeaderAuth"]["id"], "{{BV:credenciais.chatmaster}}")
        g = self.nos["Gravar sincronizacao"]["parameters"]["query"]
        self.assertEqual(sorted({int(x) for x in re.findall(r"\$(\d+)", g)}), list(range(1, 22)))
        # lembrete de 24 h com lista (owner, 2026-11-27): a lista enviada entra em `mensagens` (historico do modelo e ultima_lista da recepcao)
        self.assertIn("ms AS (INSERT INTO mensagens (contato_id, mensagem_id_canal, direcao, tipo, conteudo) SELECT u.contato_id, 'agendada-' || u.id, 'saida', 'lista', $21::text FROM u WHERE $21::text IS NOT NULL ON CONFLICT (mensagem_id_canal) DO NOTHING RETURNING 1)", g)
        self.assertTrue(self.nos["Gravar sincronizacao"]["parameters"]["options"]["queryReplacement"].endswith("!!$json.etiqueta_removida, $json.lista_texto ?? null] }}"))
        ps = self.nos["Planejar sincronizacao"]["parameters"]["jsCode"]
        self.assertIn("{{BV:INCLUDE:shared/config.js}}", ps)
        self.assertIn("const cfg = { ...bvMCfgEnvio(), atraso_max_min: {{BV:mensagens.atraso_max_min}}, textos: {", ps)  # conexao, fila e titulos da lista num lugar so
        self.assertIn("p.acao === 'enviar_lista' && bvSimulado(linhas[k].telefone) ? { req: undefined } : {}", ps)  # contato simulado: so grava
        for amb in ("integracao", "producao"):
            t = json.load(open(os.path.join(RAIZ, "config", "ambientes", amb + ".json"), encoding="utf-8"))["textos"]["lembrete_dia"]
            self.assertIn("Toque em *Ver opções*", t)
            self.assertNotIn("responder SIM", t)
            # sem "?": o lembrete entra no historico, e saida com pergunta dispara a retomada (Reivindicar retomadas) e conta como
            # lista repetida no laco (bvVezesDaLista), que anteciparia a transferencia (revisao de 27/11)
            self.assertNotIn("?", t)
        # falha entre o envio da lista e a gravacao: a reserva vencida vira `incerto`, nunca reenvia (como o Reservar legado)
        self.assertIn("situacao = CASE WHEN tipo = 'lembrete_dia' AND situacao = 'pendente' AND agendamento_canal_id IS NULL AND previsto_para <= reservada_em THEN 'falhou' ELSE situacao END", q)
        self.assertIn("motivo = CASE WHEN tipo = 'lembrete_dia' AND situacao = 'pendente' AND agendamento_canal_id IS NULL AND previsto_para <= reservada_em THEN 'incerto' ELSE motivo END", q)
        self.assertEqual(g.count("("), g.count(")"))
        lin = {"id": 9, "tipo": "lembrete_hora", "situacao": "pendente", "previsto_para": "2030-01-10T16:00:00.000Z", "inicio": "2030-01-10T14:00:00",
               "dados": {"nome": "Ana Souza", "servico": "corte adulto", "barbeiro": "Pedro"}, "canal_id": None, "tentativas": 0, "reserva": "1.5",
               "contato_id": 3, "telefone": TEL, "contato_canal_id": 55, "ticket_id": 9}
        r = rodar("workflows/bv-mensagens.json", "Planejar sincronizacao", [lin])
        self.assertEqual(r[0]["acao"], "criar")
        b = r[0]["req"]["body"]
        self.assertEqual((b["sendAt"], b["contactId"], b["userId"], b["whatsappId"], b["openTicket"]), ("2030-01-10T13:00", "55", CFG["chatmaster"]["user_id"], CFG["chatmaster"]["whatsapp_id"], "0"))
        self.assertTrue(b["body"].startswith("Oi, Ana! Seu corte adulto com Pedro é daqui a 1 hora, às 14:00."))
        g2 = rodar("workflows/bv-mensagens.json", "Resultado sincronizacao", [{"statusCode": 200, "body": {"id": 77}}], {"Planejar sincronizacao": r}, each=True)
        self.assertEqual((g2["canal_id"], g2["reserva"]), ("77", "1.5"))

    def test_cadeia_da_varredura(self):  # contracts/envio-chatmaster.md
        self.assertEqual(self.destinos("Reservar"), ["Tem cliente?"])
        self.assertEqual(self.destinos("Tem cliente?", 0), ["Graces agendamentos"])
        self.assertEqual(self.destinos("Tem cliente?", 1), ["Graces dia"])  # item 6: sem cliente revalida pela /agenda/completa do dia
        self.assertEqual(self.destinos("Graces dia"), ["Decidir"])
        self.assertIn("/agenda/completa", self.nos["Graces dia"]["parameters"]["url"])
        self.assertEqual(self.destinos("Graces agendamentos"), ["Decidir"])
        self.assertEqual(self.destinos("Enviar?", 0), ["Enviar"])
        self.assertEqual(self.destinos("Enviar?", 1), ["Resultado"])
        self.assertEqual(self.destinos("Resultado"), ["Gravar resultado"])

    def test_reserva_atomica_e_gravacao_com_dono(self):  # 3.2.1
        q = self.nos["Reservar"]["parameters"]["query"]
        for t in ("FOR UPDATE SKIP LOCKED", "make_interval(secs => $1::int)", "'incerto'", "'ja_passou'", "clock_timestamp()", "handoffs h", "'mensagem|envio_incerto'"):
            self.assertIn(t, q)
        # item 26: handoffs passou a ter linhas; segurar o lembrete durante a transferencia continua desligado, por chave propria
        self.assertIn("($5::boolean AND EXISTS (SELECT 1 FROM handoffs h WHERE h.contato_id = r.contato_id AND h.situacao = 'aberto')) AS handoff_aberto", q)
        self.assertTrue(self.nos["Reservar"]["parameters"]["options"]["queryReplacement"].endswith("'{{BV:handoff.segurar_lembretes}}' === 'True'] }}"))
        for amb in ("producao", "integracao"):
            self.assertIs(json.load(open(f"config/ambientes/{amb}.json", encoding="utf-8"))["handoff"]["segurar_lembretes"], False)
        g = self.nos["Gravar resultado"]["parameters"]["query"]
        self.assertIn("situacao = 'pendente' AND extract(epoch from reservada_em)::text = $2::text", g)  # so o dono da reserva grava
        self.assertIn("'agendada-' || id", g)
        self.assertIn("ON CONFLICT (mensagem_id_canal) DO NOTHING", g)

    def test_revalidacao_e_envio(self):  # 3.2.2 / 3.2.3
        d = self.nos["Decidir"]["parameters"]["jsCode"]
        for t in ("bvMDecidir", "{{BV:INCLUDE:shared/mensagens.js}}", "{{BV:INCLUDE:shared/config.js}}\nconst cfg = bvMCfgEnvio();"):
            self.assertIn(t, d)
        for t in ("barbeiro_teste_id", "teste.contatos_escrita"):
            self.assertIn(t, open(os.path.join(RAIZ, "workflows", "shared", "config.js"), encoding="utf-8").read())
        self.assertIn("proximos: $json.tipo !== 'pos_atendimento'", json.dumps(self.nos["Graces agendamentos"]["parameters"]))
        self.assertIn("api.chatmasterveloz.com", self.nos["Enviar"]["parameters"]["url"])
        self.assertIn("bvMResultadoEnvio", self.nos["Resultado"]["parameters"]["jsCode"])
        self.assertIn("Number($input.item.json.statusCode || 0)", self.nos["Resultado"]["parameters"]["jsCode"])  # sem resposta = incerto

    def test_tetos_e_tolerancia_parametrizados(self):  # 3.2.4
        r = self.nos["Reservar"]["parameters"]["options"]["queryReplacement"]
        for k in ("reserva_s", "max_por_varredura", "atraso_max_min", "max_por_contato_dia"):
            self.assertIn("mensagens." + k, r)

    def test_reconciliacao(self):  # 3.3
        self.assertEqual(self.destinos("Agenda ok?", 0), ["Ler estado"])
        self.assertEqual(self.destinos("Agenda ok?", 1), ["Falha reconciliacao"])
        self.assertIn("/agenda/completa", self.nos["Agenda completa"]["parameters"]["url"])
        self.assertIn("(p.idProfissional === teste) === soTeste", self.nos["Achatar"]["parameters"]["jsCode"])  # TESTE: so o de teste; PROD: todos menos ele
        self.assertIn("dataInicio: $json.inicio", self.nos["Agenda completa"]["parameters"]["jsonQuery"])  # item 10
        self.assertIn("bvMReconciliar", self.nos["Reconciliar"]["parameters"]["jsCode"])
        a = self.nos["Aplicar"]["parameters"]["query"]
        self.assertIn("ON CONFLICT (graces_agendamento_id, tipo) WHERE situacao = 'pendente' DO UPDATE", a)
        self.assertIn("'sem_contato:' || s", a)
        self.assertIn("NOT EXISTS (SELECT 1 FROM falhas_agente", a)  # sem_contato uma vez por idAgenda
        self.assertIn("'recorrente:' || s", a)  # item 7: recorrente pulado e registrado uma vez


class BvConfirmacao(Base, unittest.TestCase):
    ARQ = "workflows/sub/bv-confirmacao.json"

    def test_entrada_e_claim_atomico(self):  # 4.1.1 / 4.1.2
        self.assertEqual([v["name"] for v in self.nos["Gatilho"]["parameters"]["workflowInputs"]["values"]], ["contato_id", "origem", "confirmado", "mensagem_id"])
        c = self.nos["Reivindicar"]["parameters"]["query"]
        for t in ("contato_id = $2::bigint", "tipo IN ('confirmacao','lembrete_dia')", "situacao = 'enviada'", "resposta IS NULL", "motivo IS NULL", "RETURNING"):
            self.assertIn(t, c)
        self.assertEqual(self.destinos("Reivindicar?", 0), ["Reivindicar"])
        self.assertEqual(self.destinos("Reivindicar?", 1), ["Desfecho"])  # desatualizada/repetida/fora do teste: sem Graces
        self.assertEqual(self.destinos("Chamar Graces?", 1), ["Desfecho"])
        s = self.nos["Selecionar"]["parameters"]["query"]
        self.assertIn("conf-repetida-%", s)  # teto de repetidas
        self.assertIn("m.respondida_em > now() - make_interval(secs => $3::int)", s)  # item 1: o titulo enxerga o gemeo ja respondido
        self.assertIn("m.motivo", s)  # item 3

    def test_graces_com_ate_duas_novas_chamadas(self):  # 4.1.3
        p = self.nos["Graces confirmacao"]["parameters"]
        self.assertIn("/agenda/confirmacao", p["url"])
        self.assertEqual(self.destinos("Repetir?", 0), ["Espera"])
        self.assertEqual(self.destinos("Espera"), ["Graces confirmacao"])
        # item 4: 409 nao vira sucesso: conferir o status antes de afirmar
        self.assertEqual(self.destinos("Repetir?", 1), ["Conferir?"])
        self.assertEqual(self.destinos("Conferir?", 0), ["Graces conferir"])
        self.assertEqual(self.destinos("Conferir?", 1), ["Desfecho"])
        self.assertEqual(self.destinos("Graces conferir"), ["Conferencia"])
        self.assertEqual(self.destinos("Conferencia"), ["Desfecho"])
        self.assertEqual(self.nos["Graces conferir"]["parameters"]["method"], "GET")
        self.assertIn("'agendamentos' : 'completa'", self.nos["Graces conferir"]["parameters"]["url"])
        self.assertIn("$runIndex", self.nos["Avaliar"]["parameters"]["jsCode"])

    def test_trava_de_teste_antes_do_claim(self):  # 4.1.1
        self.assertIn("testeId", self.nos["Escolher"]["parameters"]["jsCode"])
        self.assertLess(self.wf["nodes"].index(self.nos["Escolher"]), self.wf["nodes"].index(self.nos["Reivindicar"]))

    def test_respostas_registro_e_recusa(self):  # 4.1.4
        r = self.nos["Registrar"]["parameters"]["query"]
        # item 26: a lista de decisao da recusa grava os itens enviados
        self.assertIn("(SELECT jsonb_agg(jsonb_build_object('id', i->>'id', 'rotulo', i->>'rotulo')) FROM jsonb_array_elements($18::jsonb->'itens') i) WHERE $11::boolean", json.dumps(json.load(open("workflows/sub/bv-confirmacao.json", encoding="utf-8")), ensure_ascii=False))
        for t in ("'confirmacao_recusada'", "'saida'", "'conf-' ||", "mensagem_id_canal", "falhas_agente", "resposta = NULL", "'divergente'",
                  "tipo IN ('lembrete', 'pos_atendimento', 'lembrete_hora')", "motivo = 'recusada'"):  # item 11 (owner): recusa cancela lembrete e pos
            self.assertIn(t, r) if t != "mensagem_id_canal" else None
        self.assertEqual(self.destinos("Enviar texto?", 1), ["Registrar"])
        # E2E 2026-10-20: o toque tratado pelo id tira da rajada o titulo gemeo ("Confirmo"), que senao iria ao agente
        self.assertIn("tg AS (UPDATE mensagens SET processada_em = now() WHERE $13::text = 'id'", r)
        self.assertIn("turno_id IS NULL AND conteudo IN ($14::text, $15::text)", r)
        self.assertIn("mensagens.titulo_nao", self.nos["Registrar"]["parameters"]["options"]["queryReplacement"])
        self.assertIn("ent.origem !== 'agente'", self.nos["Desfecho"]["parameters"]["jsCode"])  # o agente responde sozinho




class RevisaoOnda7(CodeNodes):
    """Achados da revisao de codigo (2026-10-20), executando o JS real dos Code nodes."""
    CONF = "workflows/sub/bv-confirmacao.json"
    MSG = "workflows/bv-mensagens.json"

    def row(self, **o):
        return {"id": "7", "situacao": "enviada", "resposta": None, "motivo": None, "recente": False, "id_profissional": TESTE, "futuro": True, "repetidas": "0",
                "inicio": "2026-10-22T14:00:00", "telefone": TEL, "graces_agendamento_id": "A", "graces_cliente_id": None, "dados": {}, **o}

    def test_item1_titulo_nao_confirma_a_outra_aberta(self):
        ent = {"ok": True, "contato_id": "1", "origem": "titulo", "confirmado": True, "mensagem_id": None}
        rows = [self.row(), self.row(id="8", resposta="confirmada", recente=True)]  # o id do mesmo toque ja respondeu a 8
        e = rodar(self.CONF, "Escolher", rows, {"Normalizar": [ent]})[0]
        self.assertEqual((e["acao"], e["code"]), ("fim", "repetida"))
        e = rodar(self.CONF, "Escolher", [self.row(), self.row(id="8")], {"Normalizar": [ent]})[0]
        self.assertEqual(e["code"], "ambigua")  # 2 abertas sem id: nenhuma e confirmada
        d = rodar(self.CONF, "Desfecho", [{**e, "ent": ent}])[0]
        self.assertEqual((d["enviar"], d["texto"]), (True, CFG["textos"]["confirmacao_escolher"]))  # pede para escolher

    def test_item1_e_5_rota_do_titulo_na_recepcao(self):
        rota = lambda dig=False, tit="sim", **o: rodar("workflows/bv-recepcao.json", "Rota do titulo", [{"contato_id": "1", "abertas": "1", "recentes": "0", "propostas": "0", "ultima_lista": True, **o}],
                                                       refs={"Normalizar": [{"msg": {"confirmaTitulo": tit, "confirmaDigitado": dig}}], "Upsert contato": [{"contato_id": 77}]})[0]
        self.assertEqual(rota()["rota"], "consumir")
        self.assertEqual(rota()["contato_id"], "1")  # Inserir mensagem (ramo agente) le $json.contato_id
        self.assertEqual(rota(abertas="0", recentes="1", ultima_lista=False)["rota"], "consumir")  # gemeo do toque: nunca vai ao agente
        self.assertEqual(rota(propostas="1")["rota"], "agente")  # "Confirmo" ao resumo do agente
        self.assertEqual(rota(ultima_lista=False)["rota"], "agente")
        # "sim" ao lembrete de 24 h (23/11): so se o lembrete foi a ultima coisa dita pela barbearia; vale para o titulo escrito a mao
        self.assertEqual(rota(dig=True, ultima_lista=False, lembrete_ultimo=True)["rota"], "consumir")
        self.assertEqual(rota(dig=True, ultima_lista=True, lembrete_ultimo=False)["rota"], "consumir")  # 27/11: sim digitado logo depois da lista do lembrete
        self.assertEqual(rota(dig=True, lembrete_ultimo=True, propostas="1")["rota"], "agente")
        self.assertEqual(rota(dig=True, abertas="0", recentes="1", lembrete_ultimo=False)["rota"], "agente")
        self.assertEqual(rota(ultima_lista=False, lembrete_ultimo=True)["rota"], "consumir")
        self.assertEqual(rota(tit="nao", ultima_lista=False, lembrete_ultimo=True)["rota"], "agente")
        # consulta com erro (o no segue com a linha vazia): vai ao agente, com o contato_id que o Inserir mensagem le
        vazio = rodar("workflows/bv-recepcao.json", "Rota do titulo", [{}], refs={"Normalizar": [{"msg": {"confirmaTitulo": "sim", "confirmaDigitado": True}}], "Upsert contato": [{"contato_id": 77}]})[0]
        self.assertEqual((vazio["rota"], vazio["contato_id"]), ("agente", "77"))
        no = next(n for n in json.load(open(os.path.join(RAIZ, "workflows", "bv-recepcao.json"), encoding="utf-8"))["nodes"] if n["name"] == "Confirmacao aberta?")
        self.assertEqual((no.get("onError"), no.get("alwaysOutputData")), ("continueRegularOutput", True))
        q = json.load(open(os.path.join(RAIZ, "workflows", "bv-recepcao.json"), encoding="utf-8"))
        q = next(n for n in q["nodes"] if n["name"] == "Confirmacao aberta?")["parameters"]["query"]
        for t in ("WITH ab AS (SELECT COALESCE(m.enviada_em, m.previsto_para) AS em", "COALESCE((SELECT max(em) FROM ab) <= now(), false) AND NOT EXISTS", "s.criado_em > (SELECT max(em) FROM ab) - make_interval(mins => $3::int))) AS lembrete_ultimo", "AS abertas", "LIKE 'conf-%' AND criado_em > now() - make_interval(secs => $2::int)) AS recentes", "AS propostas", "AS ultima_lista", "'agendada-%'", "motivo IS NULL", "estado = 'pendente'"):
            self.assertIn(t, q)

    def test_item2_confirmacoes_no_prompt_mesmo_em_sessao_nova(self):
        import time
        agora = int(time.time() * 1000)
        ctx = {"ultima_ms": agora - 5 * 86400000, "pedido": {"confirmacao_recusada": {"idAgenda": "A", "em": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}},
               "opcoes": None, "historico": [], "pendente": None, "confirmacoes": [{"id": 9, "servico": "Corte", "barbeiro": "Ze", "inicio": "2026-10-22T14:00:00"}]}
        ds = rodar("workflows/sub/entregar-rajada.json", "Decidir silencio", [], {"Ler contexto": [ctx]})[0]
        r = rodar("workflows/sub/entregar-rajada.json", "Preparar", [], {"Gatilho": [{"itens": [{"tipo": "texto", "conteudo": "oi"}]}], "Ler contexto": [ctx], "Registrar turno": [{"turnos_hora": 0}], "Decidir silencio": [ds]})[0]
        self.assertTrue(r["sessao_nova"])
        self.assertIn("id=9 (Corte com Ze", r["system"])
        self.assertIn("não vai poder comparecer ao agendamento A", r["system"])
        self.assertIs(r["recusa_valida"], True)  # 27/11: o no Sessao guarda a recusa valida na sessao nova

    def test_planejar_resolve_o_agendamento_recusado_com_o_relogio_e_a_janela(self):  # 27/11: o no renderizado, com a configuracao de verdade
        import time
        iso = lambda seg: time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(time.time() - seg))
        ent = {"in": {"operacao": "horarios_livres", "contato_id": "7", "telefone": "+" + TEL, "turno_id": "22222222-2222-4222-8222-222222222222", "ambiente": "integracao", "data": "2026-11-30", "qualquer": False}}

        def planejar(em):
            pedido = {"idCliente": "c1", "futuros": [{"idAgenda": "a1", "idServico": "s1", "horaInicio": "2026-11-28T11:20:00", "servico": "corte adulto", "idProfissional": "b1"}],
                      "ultimo": {"servico": {"idServico": "s1", "nome": "corte adulto", "opcao_id": "ult"}, "barbeiro": {"idProfissional": "b7", "apelido": "Black"}},
                      "confirmacao_recusada": {"idAgenda": "a1", "inicio": "2026-11-28T11:20:00", "servico": "corte adulto", "barbeiro": "Pedro", "idProfissional": "b1", "idCliente": "c1", "em": em}}
            return rodar("workflows/sub/bv-graces.json", "Planejar", [{"pedido": pedido, "opcoes": {}}], {"Normalizar": [ent], "Gatilho": [{"telefone": "+" + TEL}]})
        valida = planejar(iso(60))
        self.assertEqual((valida[0]["req"]["qs"]["idProfissional"], valida[0]["st"]["in"]["id_opcao_agendamento"]), ("b1", "rec"))  # remarcacao, com o barbeiro do agendamento
        vencida = planejar(iso(3 * 3600))
        self.assertEqual((vencida[0]["req"]["qs"]["idProfissional"], vencida[0]["st"]["in"].get("id_opcao_agendamento")), ("b7", None))  # recusa de 3 h: a busca de sempre

    def test_recusa_valida_ou_vencida_no_preparar(self):  # 27/11: recusa por toque, conversa parada ha dias, depois "Remarcar"
        import time
        agora = int(time.time() * 1000)
        iso = lambda ms: time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(ms / 1000))

        def preparar(pedido, ultima):
            ctx = {"ultima_ms": ultima, "pedido": pedido, "opcoes": {"tipo": "decisao_cancelamento", "itens": [{"id": "1", "rotulo": "Remarcar"}, {"id": "2", "rotulo": "Cancelar mesmo"}]}, "historico": [], "pendente": None, "confirmacoes": []}
            ds = rodar("workflows/sub/entregar-rajada.json", "Decidir silencio", [], {"Ler contexto": [ctx]})[0]
            return rodar("workflows/sub/entregar-rajada.json", "Preparar", [], {"Gatilho": [{"itens": [{"tipo": "texto", "conteudo": "Remarcar"}]}], "Ler contexto": [ctx], "Registrar turno": [{"turnos_hora": 0}], "Decidir silencio": [ds]})[0]
        rec = lambda ms: {"confirmacao_recusada": {"idAgenda": "3fa85f64-5717-4562-b3fc-2c963f66afa6", "inicio": "2026-11-28T11:20:00", "servico": "corte adulto", "barbeiro": "Pedro", "em": iso(ms)}}
        r = preparar(rec(agora - 60000), agora - 3 * 86400000)
        self.assertEqual((r["sessao_nova"], r["recusa_valida"]), (True, True))
        self.assertIn("não vai poder comparecer ao agendamento de corte adulto de sábado (28/11) às 11:20 (dado; nas ferramentas ele é o id_opcao_agendamento rec)", r["system"])
        self.assertNotIn("3fa85f64", r["system"])  # o id da agenda nao vai mais ao modelo
        velha = preparar(rec(agora - 3 * 3600000), agora - 60000)  # mesma sessao, recusa de 3 h atras: sai do pedido e do contexto
        self.assertEqual((velha["sessao_nova"], velha["recusa_valida"]), (False, False))
        self.assertNotIn("não vai poder comparecer", velha["system"])
        self.assertIs(preparar({}, agora - 60000)["recusa_valida"], False)

    def test_item3_lista_antiga_encerrada_e_desatualizada_sem_graces(self):
        ent = {"ok": True, "contato_id": "1", "origem": "id", "confirmado": True, "mensagem_id": "7"}
        e = rodar(self.CONF, "Escolher", [self.row(motivo="cancelada_agente")], {"Normalizar": [ent]})[0]
        self.assertEqual((e["acao"], e["code"]), ("fim", "desatualizada"))
        d = rodar(self.CONF, "Desfecho", [{**e, "ent": ent}])[0]
        self.assertEqual((d["texto"], d["idAgenda"], d["liberar"]), (CFG["textos"]["confirmacao_desatualizada"], None, False))

    def test_item4_409_conferido(self):
        ent = {"confirmado": True}
        g = lambda st: {"statusCode": 200, "body": [{"idAgenda": "A", "horaInicio": "2026-10-22T14:00:00", "idStatusAgenda": st}]}
        c = lambda i: rodar(self.CONF, "Conferencia", [i], {"Escolher": [{"row": self.row()}], "Normalizar": [ent]})[0]["code"]
        self.assertEqual(c(g(3)), "confirmada")
        self.assertEqual(c(g(10)), "desatualizada")
        self.assertEqual(c({"error": "timeout"}), "falhou")
        ok = {"ok": True, "contato_id": "1", "origem": "id", "confirmado": True, "mensagem_id": "7"}
        d = rodar(self.CONF, "Desfecho", [{"code": "desatualizada", "status": 200}], {"Resolver claim": [{"ent": ok, "row": self.row(), "req": {"idAgenda": "A"}}]})[0]
        self.assertEqual((d["ok"], d["liberar"], d["encerrar"]), (False, True, True))  # divergente: devolve o claim e encerra

    def test_item6_sem_cliente_revalida_pela_completa(self):
        l = self.linha(graces_cliente_id=None)
        comp = lambda ag: {"statusCode": 200, "body": [{"idProfissional": TESTE, "apelido": "Ze", "agendamentos": [{"idAgenda": ag, "horaInicio": "2026-10-22T14:00:00", "idStatusAgenda": 2}]}]}
        self.assertEqual(rodar(self.MSG, "Decidir", [comp("A")], {"Reservar": [l]}, each=True)["acao"], "enviar")
        self.assertEqual(rodar(self.MSG, "Decidir", [comp("B")], {"Reservar": [l]}, each=True)["motivo"], "orfa")  # antes: enviava sem revalidar

    def test_item7_recorrente_manda_data(self):
        e = {"ent": {"confirmado": False}, "row": self.row(dados={"recorrente": True})}
        r = rodar(self.CONF, "Resolver claim", [{"id": "7", "graces_agendamento_id": "A"}], {"Escolher": [e]})[0]
        self.assertEqual(r["req"], {"idAgenda": "A", "confirmado": False, "data": "2026-10-22"})
        ag = lambda ini: {"idAgenda": "R", "horaInicio": ini, "horaFim": ini, "idStatusAgenda": 2, "ddiCelular": "55", "celularCliente": "(11) 99999-8888", "nomeServico": "C", "profissional": "Z", "idProfissional": TESTE}
        r = rodar(self.MSG, "Reconciliar", [{"linhas": [], "contatos": [{"id": 1, "telefone": TEL}]}], {"Achatar": [{"agenda": [ag("2099-10-21T14:00:00"), ag("2099-10-24T14:00:00")]}]})[0]
        self.assertEqual((r["criar"], r["recorrente"]), ([], ["R"]))

    def test_item8_prod_sem_travas_de_teste(self):
        l = self.linha(id_profissional="real", telefone="5511912345678")
        ag = {"statusCode": 200, "body": [{"idAgenda": "A", "horaInicio": "2026-10-22T14:00:00", "idStatusAgenda": 2}]}
        self.assertEqual(rodar(self.MSG, "Decidir", [ag], {"Reservar": [l]}, each=True)["motivo"], "fora_do_teste")  # TESTE trava
        self.assertEqual(rodar(self.MSG, "Decidir", [ag], {"Reservar": [l]}, each=True, cfg=PCFG)["acao"], "enviar")  # PROD nao
        body = [{"idProfissional": TESTE, "agendamentos": [{"idAgenda": "T"}]}, {"idProfissional": "real", "agendamentos": [{"idAgenda": "R"}]}]
        ach = lambda cfg: [a["idAgenda"] for a in rodar(self.MSG, "Achatar", [{"statusCode": 200, "body": body}], cfg=cfg)[0]["agenda"]]
        self.assertEqual((ach(CFG), ach(PCFG)), (["T"], ["R"]))  # PROD nunca le a agenda do barbeiro de teste
        ent = {"ok": True, "contato_id": "1", "origem": "id", "confirmado": True, "mensagem_id": "7"}
        d = rodar(self.CONF, "Desfecho", [{"acao": "fim", "code": "confirmada", "ent": ent, "row": self.row(telefone="5511912345678")}], cfg=PCFG)[0]
        self.assertEqual((d["enviar"], d["simulado"]), (True, False))
        e = rodar(self.CONF, "Escolher", [self.row(id_profissional="real")], {"Normalizar": [ent]}, cfg=PCFG)[0]
        self.assertEqual(e["acao"], "claim")

    def test_item8_producao_renderiza_os_workflows_da_feature(self):
        for arq in ("workflows/bv-mensagens.json", "workflows/sub/bv-confirmacao.json", "workflows/sub/bv-graces.json", "workflows/sub/entregar-rajada.json", "workflows/bv-recepcao.json"):
            os.environ.setdefault("BV_WEBHOOK_TOKEN_SHA256", "tok")
            wf = json.loads(dep.renderizar(open(os.path.join(RAIZ, arq), encoding="utf-8").read(), PCFG, RAIZ))
            for n in wf["nodes"]:
                js = n["parameters"].get("jsCode")
                if js is None:
                    continue
                with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False) as f:
                    f.write("function __no(){\n" + js + "\n}\n")
                r = subprocess.run(["node", "--check", f.name], capture_output=True, text=True)
                os.unlink(f.name)
                self.assertEqual(r.returncode, 0, f"{arq}::{n['name']}: {r.stderr[:300]}")

    def test_item10_janela_comeca_ontem(self):
        import datetime
        j = rodar(self.MSG, "Janela", [{}])[0]
        self.assertEqual(datetime.date.fromisoformat(j["hoje"]) - datetime.date.fromisoformat(j["inicio"]), datetime.timedelta(days=1))


class SemRequireNoN8n(unittest.TestCase):
    """O n8n proibe require em Code node: todo no que inclui graces.js precisa incluir antes o que ele importa."""

    def test_graces_js_com_dependencias(self):
        for f in glob.glob(os.path.join(RAIZ, "workflows", "**", "*.json"), recursive=True):
            for n in json.load(open(f, encoding="utf-8"))["nodes"]:
                c = n.get("parameters", {}).get("jsCode", "")
                if "{{BV:INCLUDE:shared/graces.js}}" in c:
                    for dep in ("agente.js", "mensagens.js"):
                        self.assertLess(c.find("shared/" + dep), c.find("shared/graces.js"), f"{f}::{n['name']} sem {dep} antes de graces.js")
                        self.assertNotEqual(c.find("shared/" + dep), -1, f"{f}::{n['name']} sem {dep}")


class LembreteUnicoPorGrupo(unittest.TestCase):
    """Item 11 (owner, 2026-11-16): um lembrete so para quem tem mais de um servico no mesmo dia."""

    def nos(self, arq):
        w = json.load(open(os.path.join(RAIZ, arq), encoding="utf-8"))
        return {n["name"]: n for n in w["nodes"]}, {k: [[d["node"] for d in o] for o in v.get("main", [])] for k, v in w["connections"].items()}

    def test_pendencias_devolve_o_grupo(self):
        nos, _ = self.nos("workflows/bv-mensagens.json")
        p = nos["Pendencias"]["parameters"]
        self.assertIn("AS grupo FROM res r", p["query"])
        self.assertIn("make_interval(mins => $4::int)", p["query"])
        self.assertTrue(p["options"]["queryReplacement"].endswith("4, {{BV:mensagens.juntar_min}}] }}"))
        self.assertEqual(p["query"].count("("), p["query"].count(")"))

    def test_resposta_vale_para_os_outros_servicos(self):
        nos, con = self.nos("workflows/sub/bv-confirmacao.json")
        self.assertEqual([con[n] for n in ("Registrar", "Irmas", "Tem irma?", "Graces irmas", "Registrar irmas")],
                         [[["Irmas"]], [["Tem irma?"]], [["Graces irmas"], ["Saida"]], [["Registrar irmas"]], [["Saida"]]])
        q, r = nos["Irmas"]["parameters"]["query"], nos["Irmas"]["parameters"]["options"]["queryReplacement"]
        self.assertEqual(q.count("("), q.count(")"))
        self.assertIn("m.id_profissional = $5::text", q)  # TESTE: so o barbeiro de teste
        self.assertIn("'{{BV:ambiente}}' === 'integracao' ? '{{BV:graces.barbeiro_teste_id}}' : ''", r)
        self.assertTrue(nos["Irmas"]["alwaysOutputData"])  # sem irma: segue para a Saida
        self.assertEqual(nos["Graces irmas"]["onError"], "continueRegularOutput")
        self.assertIn("/public/v1/agenda/confirmacao", nos["Graces irmas"]["parameters"]["url"])

    def test_config_dos_dois_ambientes(self):
        for amb in ("integracao", "producao"):
            c = json.load(open(os.path.join(RAIZ, "config", "ambientes", amb + ".json"), encoding="utf-8"))
            self.assertEqual(c["mensagens"]["juntar_min"], 120)
            self.assertEqual(c["graces"]["servicos_destaque"][0], "corte adulto")  # item 10: mais pedidos primeiro


class FilaHumana(unittest.TestCase):
    """Owner, 2026-11-16: na fila de atendimento humano o agente nao interage; 30 min sem interacao encerra o atendimento humano."""

    def nos(self, arq):
        w = json.load(open(os.path.join(RAIZ, arq), encoding="utf-8"))
        return {n["name"]: n for n in w["nodes"]}, {k: [[d["node"] for d in o] for o in v.get("main", [])] for k, v in w["connections"].items()}

    def test_recepcao_guarda_a_fila_e_a_mensagem_da_equipe(self):
        nos, con = self.nos("workflows/bv-recepcao.json")
        up = nos["Upsert contato"]["parameters"]
        self.assertIn("fila_id = $4::int", up["query"])
        self.assertTrue(up["options"]["queryReplacement"].endswith("msg.filaId ?? null, {{BV:handoff.setor_id}}] }}"))
        self.assertIn('bvEquipe(ev.body, {{BV:handoff.setor_id}}, "{{BV:textos.encaminhar_equipe}}", {{BV:chatmaster.user_id}})', nos["Normalizar"]["parameters"]["jsCode"])
        # chamado assumido por um atendente vale como fila humana (owner, 2026-11-25): o no passa a fila humana e o usuario do agente
        self.assertIn("bvNormalizar(ev, { filaHumana: {{BV:handoff.setor_id}}, usuarioAgente: {{BV:chatmaster.user_id}}, maxKb:", nos["Normalizar"]["parameters"]["jsCode"])
        self.assertEqual(con["Responder 200 descartada"], [["Registrar equipe"]])
        q = nos["Registrar equipe"]["parameters"]["query"]
        self.assertIn("fila_ultima_de = 'equipe'", q)
        self.assertIn("'equipe-' || $3::text", q)
        self.assertIn("ticket_id = COALESCE($5::bigint, ticket_id)", q)  # o ticket encerrado pelo vigia e o do evento da equipe
        self.assertIn("a.canal_texto = $4::text", q)  # eco de lembrete agendado nao conta como resposta da equipe
        self.assertEqual(q.count("("), q.count(")"))
        self.assertTrue(nos["Registrar equipe"]["alwaysOutputData"])

    def test_agente_calado_na_fila_humana(self):
        nos, _ = self.nos("workflows/sub/entregar-rajada.json")
        self.assertIn("AS fila_id FROM (SELECT $1::bigint AS cid) x", nos["Ler contexto"]["parameters"]["query"])
        self.assertIn("bvTransferido({ porFila:", nos["Decidir silencio"]["parameters"]["jsCode"])

    def test_vigia_encerra_o_atendimento_parado(self):
        nos, con = self.nos("workflows/bv-vigia.json")
        self.assertIn("Filas paradas", con["A cada 5 minutos"][0])
        self.assertEqual([con[n] for n in ("Filas paradas", "Encerrar atendimento", "Gravar encerramento")], [[["Encerrar atendimento"]], [["Gravar encerramento"]], [["Decidir retorno"]]])
        p = nos["Filas paradas"]["parameters"]
        self.assertIn("(NOT $4::boolean OR c.fila_ultima_de = 'equipe')", p["query"])  # a chave so_respondido restringe a quem a equipe respondeu
        self.assertIn("coalesce(c.fila_ultima_de, '') AS ultima_de", p["query"])
        g = nos["Gravar encerramento"]["parameters"]
        # owner, 2026-11-17: encerra tambem com o cliente por ultimo, e so nesse caso o cliente e avisado (pela cadeia de aviso do vigia)
        self.assertIn("WHERE $2::int BETWEEN 200 AND 299 AND $3::text = 'cliente'", g["query"])
        # o estado local sai mesmo se o Chat Master recusar (nao repete a cada varredura), e so de quem ainda esta na fila humana:
        # duas rodadas sobrepostas nao devolvem a linha duas vezes (25/11)
        self.assertIn("WHERE id = $1::bigint AND fila_id = $4::int RETURNING id, telefone", g["query"])
        self.assertNotIn("fila_sem_resposta", json.dumps(nos))  # owner, 2026-11-25: o texto fixo saiu
        # item 26: o encerramento pelo vigia fecha a transferencia aberta
        self.assertIn("UPDATE handoffs SET situacao = 'encerrado', encerrado_em = now(), encerrado_por = 'vigia' FROM ok WHERE handoffs.contato_id = ok.id AND handoffs.situacao = 'aberto'", g["query"])
        self.assertIn("texto: contingencia,", nos["Montar aviso"]["parameters"]["jsCode"])  # so o turno que estourou o tempo passa por aqui
        # 23/11: a equipe respondeu e o cliente so agradeceu depois -> encerra calado (decisao em shared/mensagens.js, nao no SQL)
        self.assertIn("(e.em IS NOT NULL AND NOT e.pendente) AS equipe_respondeu", p["query"])  # pergunta ou promessa de retorno da equipe nao e resposta
        self.assertIn("~ '(vou|vamos) (ver|verificar|conferir|checar|olhar|confirmar|consultar)|j[aá] te |te retorn|te aviso|um moment|um instant|um minut|aguarde|j[aá] volto' OR (coalesce(m.conteudo, '') ~ '[?]' AND coalesce(m.conteudo, '') !~* '[0-9]{1,2} ?(h|:[0-9]{2})')) AS pendente", p["query"])  # pergunta com horario e proposta ("Pode ser às 12h40?"), nao pendencia (25/11)
        # por rodada: 1 encerramento com o cliente por ultimo (pode virar turno do agente, e a guarda de concorrencia do Montar
        # retorno nao pode envelhecer esperando os turnos dos outros) e ate 5 dos demais, que so encerram
        self.assertIn("row_number() OVER (PARTITION BY coalesce(c.fila_ultima_de, '') = 'cliente' ORDER BY c.fila_interacao_em) AS ordem", p["query"])
        self.assertTrue(p["query"].endswith(") z WHERE z.ordem <= CASE WHEN z.ultima_de = 'cliente' THEN 1 ELSE 5 END ORDER BY z.ordem"))
        self.assertIn("m.mensagem_id_canal LIKE 'equipe-%' AND m.criado_em > now() - interval '24 hours' ORDER BY m.criado_em DESC LIMIT 1) e ON true", p["query"])
        self.assertIn("m.direcao = 'entrada' AND m.criado_em > e.em ORDER BY m.criado_em DESC LIMIT 7", p["query"])
        self.assertIn("length(coalesce(m.conteudo, '')) <= 80 AND coalesce(m.conteudo, '') !~ '[?0-9@]'", p["query"])  # texto longo, pergunta, numero, e-mail e midia viram "?": nao viajam pela execucao
        self.assertIn("$5::boolean AS equipe_respondeu, $6::text AS depois", g["query"])
        self.assertIn("$('Filas paradas').item.json.equipe_respondeu === true, $('Filas paradas').item.json.depois || '[]'", g["options"]["queryReplacement"])
        self.assertNotIn("bvMAvisaFila", json.dumps(nos))
        # owner, 2026-11-25: em vez do texto fixo, o agente retoma a conversa (ou o encerramento e calado)
        self.assertEqual([con[n] for n in ("Decidir retorno", "Montar retorno", "Tem retorno?")], [[["Montar retorno"]], [["Tem retorno?"]], [["Chamar retorno"]]])
        # sem mensagem a retomar o Postgres devolve um item sem turno: ele para no Tem retorno? (nao chega ao sub-workflow)
        self.assertEqual(nos["Tem retorno?"]["parameters"]["conditions"]["conditions"][0]["leftValue"], "={{ String($json.turno_id != null && $json.contato_id != null) }}")
        self.assertNotIn("Chamar retorno", con)  # terminal: nada volta para o vigia nem para o agente (sem ciclo)
        self.assertIn("bvMRetomaFila(x.l)", nos["Decidir retorno"]["parameters"]["jsCode"])
        self.assertIn("json: { contato_id: x.l.contato_id, telefone: x.l.telefone }", nos["Decidir retorno"]["parameters"]["jsCode"])  # o texto do cliente nao segue adiante
        mr = nos["Montar retorno"]["parameters"]["query"]
        self.assertIn("m.direcao = 'entrada' AND m.processada_em IS NOT NULL", mr)  # nao reabre mensagem: a recepcao nunca a reprocessa num "Oi" futuro
        self.assertIn("NOT EXISTS (SELECT 1 FROM turnos x WHERE x.contato_id = $1::bigint AND x.estado = 'em_andamento'", mr)
        self.assertIn("NOT EXISTS (SELECT 1 FROM mensagens p WHERE p.contato_id = $1::bigint AND p.direcao = 'entrada' AND p.processada_em IS NULL)", mr)
        self.assertIn("jsonb_build_object('retorno', (SELECT u::text FROM t))", mr)  # a marca do turno de retorno, lida pelo Preparar e pelo bv-graces
        self.assertIn("LIMIT 10 FOR UPDATE SKIP LOCKED", mr)
        # resposta e a do agente ou a da equipe: lembrete, retomada e aviso gravados depois nao escondem a mensagem sem resposta
        self.assertIn("s.direcao = 'saida' AND (s.mensagem_id_canal LIKE 'equipe-%' OR s.mensagem_id_canal LIKE 'out-%')", mr)
        # dentro da janela da sessao, com folga: o turno de retorno nunca nasce como sessao nova (sem historico e sem a marca)
        self.assertIn("m.criado_em > now() - make_interval(mins => $4::int - 10)", mr)
        self.assertTrue(nos["Montar retorno"]["parameters"]["options"]["queryReplacement"].endswith("{{BV:execucao.timeout_s}}, {{BV:conversa.janela_recencia_min}}] }}"))
        # contrato do item: os mesmos campos que a recepcao manda ao entregar-rajada (Montar entrega)
        rec, _ = self.nos("workflows/bv-recepcao.json")
        campos = lambda txt, pad: set(re.findall(pad, txt))
        ent = rec["Montar entrega"]["parameters"]["jsCode"]
        self.assertEqual(campos(mr[mr.index("json_build_object('mensagem_id'"):], r"'(\w+)', u\.|'(recebida_em)'") - {("", "")},
                         {(c, "") for c in ("mensagem_id", "tipo", "conteudo", "midia_url", "midia_mime", "midia_segundos", "midia_bytes")} | {("", "recebida_em")})
        for c in ("mensagem_id", "tipo", "conteudo", "midia_url", "midia_mime", "midia_segundos", "midia_bytes", "recebida_em"):
            self.assertIn(c + ":", ent[ent.index("itens: ord.map"):])
        for c in ("turno_id", "contato_id", "telefone", "total", "itens"):
            self.assertIn(c + ":", ent)
            self.assertRegex(mr, r"AS " + c + r"\b")
        self.assertEqual(mr.count("("), mr.count(")"))
        ch = nos["Chamar retorno"]
        self.assertEqual([ch["parameters"]["mode"], ch["parameters"]["options"]["waitForSubWorkflow"], ch["onError"], ch["parameters"]["workflowId"]["value"]],
                         ["each", True, "continueRegularOutput", "{{BV:workflows_sub.entregar_rajada}}"])  # um turno por contato, um por vez; a falha de um nao derruba os outros
        self.assertIn("{{BV:INCLUDE:shared/mensagens.js}}", nos["Montar aviso"]["parameters"]["jsCode"])
        self.assertIn("'{{BV:handoff.encerrar_ativo}}' === 'True'", p["options"]["queryReplacement"])
        self.assertEqual(nos["Encerrar atendimento"]["parameters"]["url"], "https://api.chatmasterveloz.com/api/tickets/updateAPI")
        self.assertIn("status: 'closed'", nos["Encerrar atendimento"]["parameters"]["jsonBody"])
        for n in ("Filas paradas", "Gravar encerramento"):
            q = nos[n]["parameters"]["query"]
            self.assertEqual(q.count("("), q.count(")"))

    def test_config(self):
        for amb, ativo in (("integracao", False), ("producao", True)):
            c = json.load(open(os.path.join(RAIZ, "config", "ambientes", amb + ".json"), encoding="utf-8"))
            self.assertEqual([c["handoff"]["encerrar_ativo"], c["handoff"]["encerrar_apos_min"], c["handoff"]["encerrar_so_respondido"]], [ativo, 30, False])
            self.assertNotIn("fila_sem_resposta", c["textos"])  # owner, 2026-11-25
            self.assertEqual([c["retomada"]["resposta_max_min"], c["retomada"]["apos_min_urgente"]], [720, 20])

    def test_lembrete_recem_enviado_vale_como_enviado(self):
        # a regra mora numa funcao SQL (migracao 0018, revisao de 17/11); nenhuma consulta a copia
        cond = "situacao = 'pendente' AND tipo = 'lembrete_dia' AND agendamento_canal_id IS NOT NULL AND previsto_para <= now() + interval '2 minutes'"
        self.assertIn("SELECT situacao = 'enviada' OR (" + cond + ")", open(os.path.join(RAIZ, "db", "migrations", "0018_revisao_etapa3.sql"), encoding="utf-8").read())
        chamada = "bv_respondivel(m.situacao, m.tipo, m.agendamento_canal_id, m.previsto_para)"
        nos, _ = self.nos("workflows/sub/bv-confirmacao.json")
        for n, vezes in (("Selecionar", 2), ("Reivindicar", 1)):
            q = nos[n]["parameters"]["query"]
            self.assertEqual(q.count(chamada), vezes)
            self.assertEqual(q.count("("), q.count(")"))
        for arq, no in (("workflows/bv-recepcao.json", "Confirmacao aberta?"), ("workflows/sub/entregar-rajada.json", "Ler contexto")):
            self.assertEqual(self.nos(arq)[0][no]["parameters"]["query"].count(chamada), 1)
        for arq in ("workflows/bv-recepcao.json", "workflows/sub/bv-confirmacao.json", "workflows/sub/entregar-rajada.json", "workflows/bv-mensagens.json"):
            self.assertNotIn("interval '2 minutes'", open(os.path.join(RAIZ, arq), encoding="utf-8").read())
        self.assertIn("situacao = 'enviada', enviada_em = COALESCE(m.enviada_em, m.previsto_para)", nos["Reivindicar"]["parameters"]["query"])
        self.assertIn("com_data", nos["Graces confirmacao"]["parameters"]["jsonBody"])

    def test_retomada_fora_da_fila_humana_e_sem_proposta_vencida(self):
        nos, _ = self.nos("workflows/bv-mensagens.json")
        p = nos["Reivindicar retomadas"]["parameters"]
        self.assertIn("t.fila_id = $10::int", p["query"])
        self.assertIn("THEN $9::int ELSE $4::int END", p["query"])
        self.assertEqual(p["query"].count("("), p["query"].count(")"))
        self.assertTrue(p["options"]["queryReplacement"].endswith("{{BV:retomada.apos_min_urgente}}, {{BV:handoff.setor_id}}] }}"))


if __name__ == "__main__":
    unittest.main()


class Etapa5(unittest.TestCase):  # atendimentos de 17/11 e decisao do owner de 18/11
    def setUp(self):
        self.nos = {n["name"]: n for n in json.load(open(os.path.join(RAIZ, "workflows", "sub", "bv-confirmacao.json"), encoding="utf-8"))["nodes"]}

    def test_recusa_vai_em_lista_com_proposta_de_cancelar(self):
        self.assertIn("d.decisao ? bvMListaDecisao({ texto: d.texto }, d.telefone, cfg) : bvMTexto(", self.nos["Compor envio"]["parameters"]["jsCode"])
        self.assertIn("const decisao = code === 'recusada' ? bvMDecisaoCancelar(row, req && req.idAgenda) : null;", self.nos["Desfecho"]["parameters"]["jsCode"])
        q = self.nos["Registrar"]["parameters"]["query"]
        # uma proposta pendente por contato: a de cancelar entra no lugar da pendente, na mesma instrucao
        self.assertIn("ON CONFLICT (contato_id) WHERE estado = 'pendente' DO UPDATE SET id = EXCLUDED.id, turno_id = EXCLUDED.turno_id, acao = EXCLUDED.acao, dados = EXCLUDED.dados", q)
        self.assertIn("opcoes = CASE WHEN $18::jsonb IS NULL THEN conversas.opcoes ELSE EXCLUDED.opcoes END", q)
        # 27/11: a recusa guarda o inicio, o servico, o barbeiro (nome e id) e o cliente da linha do lembrete: e por eles que as ferramentas
        # acham o agendamento ao remarcar e conferem que e o mesmo. O barbeiro fica so no estado da conversa: a proposta de cancelar e o texto continuam sem ele
        self.assertIn("jsonb_build_object('confirmacao_recusada', jsonb_build_object('idAgenda', $7::text, 'em', now()) || COALESCE((SELECT jsonb_strip_nulls(jsonb_build_object('inicio', to_char(la.inicio, 'YYYY-MM-DD\"T\"HH24:MI:SS'), 'servico', la.dados->>'servico', 'barbeiro', la.dados->>'barbeiro', 'idProfissional', la.id_profissional, 'idCliente', la.graces_cliente_id)) FROM mensagens_agendadas la WHERE la.id = $1::bigint), '{}'::jsonb))", q)
        self.assertIn("ON CONFLICT (contato_id) DO UPDATE SET pedido = conversas.pedido || EXCLUDED.pedido", q)
        self.assertIn("jsonb_build_object('em',", q)  # a oferta nasce com a hora, como as do bv-graces
        self.assertIn("CASE WHEN $18::jsonb IS NOT NULL THEN 'lista' ELSE 'texto' END", q)
        self.assertEqual(q.count("("), q.count(")"))
        self.assertTrue(self.nos["Registrar"]["parameters"]["options"]["queryReplacement"].endswith("d.decisao ? JSON.stringify(d.decisao.dados) : null, d.decisao ? JSON.stringify(d.decisao.opcoes) : null]; })() }}"))
        for a in ("integracao", "producao"):
            t = json.load(open(os.path.join(RAIZ, "config", "ambientes", a + ".json"), encoding="utf-8"))["textos"]
            self.assertEqual(t["confirmacao_recusada"], "Tudo bem, avisei a equipe. Você prefere remarcar ou cancelar mesmo?")
            self.assertIn("{lista}", t["confirmacao_desatualizada_atual"])
            self.assertTrue(t["confirmacao_desatualizada_sem"])

    def test_desfecho_recusada_e_desatualizada_renderizados(self):
        ent = {"ok": True, "contato_id": "1", "origem": "id", "confirmado": False, "mensagem_id": "7"}
        row = {"id": 9, "inicio": "2026-11-19T15:00:00", "dados": {"servico": "corte adulto", "barbeiro": "Ze"}, "telefone": "+5500000000500", "graces_cliente_id": "c1", "graces_agendamento_id": "ag-1"}
        base = {"Resolver claim": [{"ent": ent, "row": row, "req": {"idAgenda": "ag-1", "confirmado": False}}], "Normalizar": [ent]}
        d = rodar("workflows/sub/bv-confirmacao.json", "Desfecho", [{"code": "recusada", "status": 200}], base)[0]
        self.assertEqual(d["texto"], "Tudo bem, avisei a equipe. Você prefere remarcar ou cancelar mesmo?")
        self.assertEqual(d["decisao"]["dados"]["idAgenda"], "ag-1")
        self.assertEqual(d["decisao"]["opcoes"]["tipo"], "decisao_cancelamento")
        e = rodar("workflows/sub/bv-confirmacao.json", "Compor envio", [{}], {"Desfecho": [dict(d, telefone="+5511999998888")]})[0]
        self.assertEqual(e["path"], "/api/messages/whatsmeow/sendListPRO")
        self.assertEqual([x["title"] for x in e["body"]["body"]["List"]], ["Remarcar", "Cancelar mesmo"])
        atual = [{"servico": "corte com maquina", "inicio": "2026-11-17T20:40:00"}]
        d2 = rodar("workflows/sub/bv-confirmacao.json", "Desfecho", [{"code": "desatualizada", "status": 200, "atual": atual}], base)[0]
        self.assertIn("corte com maquina, terça-feira (17/11) às 20:40", d2["texto"])
        self.assertIsNone(d2["decisao"])
        e2 = rodar("workflows/sub/bv-confirmacao.json", "Compor envio", [{}], {"Desfecho": [dict(d2, telefone="+5511999998888")]})[0]
        self.assertEqual(e2["path"], "/api/messages/send")
