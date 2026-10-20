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
        self.assertNotIn("{{BV:", json.dumps(wf).replace("via {{BV:INCLUDE:shared/", ""))  # o cabecalho do .js incluido cita o placeholder
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
        self.assertEqual(sorted(x["tipo"] for x in r["criar"]), ["confirmacao", "lembrete", "pos_atendimento"])
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
        self.assertEqual(len(gat), 2)
        j = json.dumps(self.wf)
        self.assertIn("{{BV:NUM:mensagens.varredura_s}}", j)
        self.assertIn("{{BV:NUM:mensagens.reconciliacao_min}}", j)

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
        g = self.nos["Gravar resultado"]["parameters"]["query"]
        self.assertIn("situacao = 'pendente' AND extract(epoch from reservada_em)::text = $2::text", g)  # so o dono da reserva grava
        self.assertIn("'agendada-' || id", g)
        self.assertIn("ON CONFLICT (mensagem_id_canal) DO NOTHING", g)

    def test_revalidacao_e_envio(self):  # 3.2.2 / 3.2.3
        d = self.nos["Decidir"]["parameters"]["jsCode"]
        for t in ("bvMDecidir", "{{BV:INCLUDE:shared/mensagens.js}}", "barbeiro_teste_id", "teste.contatos_escrita"):
            self.assertIn(t, d)
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
        for t in ("contato_id = $2::bigint", "tipo = 'confirmacao'", "situacao = 'enviada'", "resposta IS NULL", "motivo IS NULL", "RETURNING"):
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
        for t in ("'confirmacao_recusada'", "'saida'", "'conf-' ||", "mensagem_id_canal", "falhas_agente", "resposta = NULL", "'divergente'",
                  "tipo IN ('lembrete', 'pos_atendimento')", "motivo = 'recusada'"):  # item 11 (owner): recusa cancela lembrete e pos
            self.assertIn(t, r) if t != "mensagem_id_canal" else None
        self.assertEqual(self.destinos("Enviar texto?", 1), ["Registrar"])
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
        rota = lambda **o: rodar("workflows/bv-recepcao.json", "Rota do titulo", [{"contato_id": "1", "abertas": "1", "recentes": "0", "propostas": "0", "ultima_lista": True, **o}])[0]
        self.assertEqual(rota()["rota"], "consumir")
        self.assertEqual(rota()["contato_id"], "1")  # Inserir mensagem (ramo agente) le $json.contato_id
        self.assertEqual(rota(abertas="0", recentes="1", ultima_lista=False)["rota"], "consumir")  # gemeo do toque: nunca vai ao agente
        self.assertEqual(rota(propostas="1")["rota"], "agente")  # "Confirmo" ao resumo do agente
        self.assertEqual(rota(ultima_lista=False)["rota"], "agente")
        q = json.load(open(os.path.join(RAIZ, "workflows", "bv-recepcao.json"), encoding="utf-8"))
        q = next(n for n in q["nodes"] if n["name"] == "Confirmacao aberta?")["parameters"]["query"]
        for t in ("AS abertas", "AS recentes", "AS propostas", "AS ultima_lista", "'agendada-%'", "motivo IS NULL", "estado = 'pendente'"):
            self.assertIn(t, q)

    def test_item2_confirmacoes_no_prompt_mesmo_em_sessao_nova(self):
        import time
        agora = int(time.time() * 1000)
        ctx = {"ultima_ms": agora - 5 * 86400000, "pedido": {"confirmacao_recusada": {"idAgenda": "A", "em": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}},
               "opcoes": None, "historico": [], "pendente": None, "confirmacoes": [{"id": 9, "servico": "Corte", "barbeiro": "Ze", "inicio": "2026-10-22T14:00:00"}]}
        r = rodar("workflows/sub/entregar-rajada.json", "Preparar", [], {"Gatilho": [{"itens": [{"tipo": "texto", "conteudo": "oi"}]}], "Ler contexto": [ctx], "Registrar turno": [{"turnos_hora": 0}]})[0]
        self.assertTrue(r["sessao_nova"])
        self.assertIn("id=9 (Corte com Ze", r["system"])
        self.assertIn("não vai poder comparecer ao agendamento A", r["system"])

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


if __name__ == "__main__":
    unittest.main()
