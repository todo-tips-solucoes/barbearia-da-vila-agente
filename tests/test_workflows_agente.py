import json, os, re, shutil, subprocess, unittest

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def ler(rel):
    with open(os.path.join(RAIZ, rel), encoding="utf-8") as f:
        return f.read()


class BvGraces(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.texto = ler("workflows/sub/bv-graces.json")
        cls.wf = json.loads(cls.texto)
        cls.nos = {n["name"]: n for n in cls.wf["nodes"]}
        cls.js = ler("workflows/shared/graces.js")

    def test_conexoes_referenciam_nos_existentes(self):
        for origem, c in self.wf["connections"].items():
            self.assertIn(origem, self.nos)
            for saida in c["main"]:
                for d in saida:
                    self.assertIn(d["node"], self.nos)

    def test_handoff_transfere_ticket_apos_persistir_e_registra_falha(self):  # 3.4.2b, sonda S5
        c = self.wf["connections"]
        self.assertEqual(c["Persistir"]["main"][0][0]["node"], "Handoff?")
        self.assertEqual(c["Handoff?"]["main"][1][0]["node"], "Saida")  # sem handoff segue direto
        h = self.nos["Transferir ticket"]
        self.assertEqual(h["parameters"]["url"], "=https://api.chatmasterveloz.com{{ '/api/tickets/updateAPI' }}")
        self.assertIn("ticketId", h["parameters"]["jsonBody"])
        self.assertIn("queueId", h["parameters"]["jsonBody"])
        self.assertNotIn("changequeue", self.texto)
        self.assertIn("handoff_falhou", self.nos["Registrar handoff"]["parameters"]["query"])
        self.assertIn("ticket_id", self.nos["Contexto"]["parameters"]["query"])  # ticketId vem do estado, nunca do modelo

    def test_gatilho_so_aceita_campos_do_contrato(self):
        g = self.nos["Gatilho"]
        self.assertEqual(g["type"], "n8n-nodes-base.executeWorkflowTrigger")
        campos = {v["name"] for v in g["parameters"]["workflowInputs"]["values"]}
        permitidos = set(re.search(r"BVG_CAMPOS = \[(.*?)\]", self.js, re.S).group(1).replace("'", "").replace("\n", "").replace(" ", "").split(","))
        self.assertEqual(campos, permitidos)
        self.assertNotIn("idCliente", campos | {"id_cliente"})  # FR-020: o modelo nunca informa o cliente
        self.assertIn("bvGNormalizar", self.nos["Normalizar"]["parameters"]["jsCode"])

    def test_http_graces_com_timeout_neverError_e_credencial(self):
        https = [n for n in self.wf["nodes"] if n["type"] == "n8n-nodes-base.httpRequest" and n["name"] != "Transferir ticket"]
        self.assertEqual(len(https), 2)  # laco: 1 sem corpo + 1 com corpo
        for n in https:
            p = n["parameters"]
            self.assertTrue(p["url"].startswith("=https://{{BV:graces.host}}/public/v1"))
            self.assertEqual(p["options"]["timeout"], "{{BV:NUM:graces.timeout_ms}}")
            self.assertTrue(p["options"]["response"]["response"]["neverError"])
            self.assertEqual(n["credentials"]["httpHeaderAuth"]["id"], "{{BV:credenciais.graces}}")
            self.assertEqual(n["onError"], "continueRegularOutput")
            self.assertIs(p["sendQuery"], True)  # schema exige booleano literal
            self.assertIs(p["sendBody"], n["name"].endswith("corpo"))

    def test_nunca_usa_agenda_completa(self):  # FR-020 / contrato regra 5
        self.assertNotIn("/agenda/completa", self.texto)
        self.assertNotIn("agenda/completa", self.js)

    def test_idcliente_so_do_pedido_ou_telefone(self):  # FR-020
        self.assertNotRegex(self.js, r"\bi\.(idCliente|id_cliente)\b")
        self.assertIn("ctx.pedido.idCliente", self.js)
        self.assertIn("celular: bvgSoDigitos(i.telefone)", self.js)

    def test_filtros_aplicados_antes_da_saida(self):  # FR-012 / FR-013
        def corpo(caso):
            a = self.js.rindex(f"case '{caso}':")
            return self.js[a:a + 1500]
        b = corpo("listar_barbeiros")
        self.assertLess(b.index("bvFiltrarBarbeiros"), b.index("bvMontarOferta"))
        s = corpo("listar_servicos")
        self.assertLess(s.index("bvFiltrarServicos"), s.index("bvMontarOferta"))
        self.assertIn(".trim()", b)  # apelido com espaco no final
        for nome in ("Planejar", "Passo"):
            self.assertIn("{{BV:INCLUDE:shared/agente.js}}", self.nos[nome]["parameters"]["jsCode"])

    def test_sql_so_com_parametros(self):
        qs = {n: x for n, x in self.nos.items() if x["type"] == "n8n-nodes-base.postgres"}
        self.assertEqual(set(qs), {"Contexto", "Substituir pendente", "Persistir", "Registrar handoff"})
        for nome, n in qs.items():
            q = n["parameters"]["query"]
            self.assertIn("$1", q, nome)
            self.assertNotIn("{{", q, nome)
            self.assertNotIn("${", q, nome)
            self.assertNotIn("'+", q.replace(" ", ""), nome)
            self.assertTrue(n["parameters"]["options"]["queryReplacement"].startswith("={{"), nome)
        persistir = qs["Persistir"]["parameters"]["query"]
        self.assertEqual(sorted({int(x) for x in re.findall(r"\$(\d+)", persistir)}), list(range(1, 18)))
        # mensagens-agendadas 3.1.2: cancela pendentes, insere por idAgenda sem duplicar, fora da lista de escrita nasce cancelada
        for trecho in ("mc AS (UPDATE mensagens_agendadas", "ma AS (INSERT INTO mensagens_agendadas", "ON CONFLICT (graces_agendamento_id, tipo) WHERE situacao = 'pendente' DO UPDATE",
                       "'fora_da_lista'", "y.motivo IS NULL", "m.situacao <> 'pendente'",
                       "m.situacao = 'pendente' AND m.reservada_em IS NULL AND NOT EXISTS",  # item 9: reservada nao e cancelada (o envio grava)
                       "me AS (UPDATE mensagens_agendadas m SET motivo = x.motivo",  # item 3: confirmacao ja enviada fica encerrada
                       "m.tipo = 'confirmacao' AND m.situacao = 'enviada' AND m.resposta IS NULL AND m.motivo IS NULL",
                       "$17::jsonb IS NOT NULL AND NOT EXISTS"):  # item 8: fora_da_lista so com lista (TESTE)
            self.assertIn(trecho, persistir)
        ef = self.nos["Efeitos"]["parameters"]["jsCode"]
        self.assertIn("{{BV:INCLUDE:shared/mensagens.js}}", ef)
        self.assertIn("bvGParams(j.st.in, j.final.efeitos, msg)", ef)
        self.assertIn("'{{BV:mensagens.ativo}}' === 'True'", ef)

    def test_fase2_so_com_proposta_pendente_do_turno_anterior(self):  # FR-007 / 4.2.2
        q = self.nos["Contexto"]["parameters"]["query"]
        for trecho in ("estado = 'pendente'", "contato_id = $1::bigint", "turno_id::text <> $3::text", "make_interval(mins => $4::int)",
                       "ANY(string_to_array($5::text"):
            self.assertIn(trecho, q)
        self.assertIn("{{BV:proposta.validade_min}}", self.nos["Contexto"]["parameters"]["options"]["queryReplacement"])
        # revalida antes de escrever e o POST/PUT so nasce depois da revalidacao
        self.assertLess(self.js.index("etapa === 'reval'"), self.js.index("m: 'POST', path: '/agenda', body: { idCliente: d.idCliente"))

    def test_fase2_reivindica_propostas_de_conjunto_e_de_terceiro(self):  # achado do roteiro r7/r9: conjunto e cadastro nunca eram reivindicados
        rep = self.nos["Contexto"]["parameters"]["options"]["queryReplacement"]
        i = self.js.index("const BVG_ACOES")
        for acao in ("agendar_conjunto", "cancelar_conjunto", "cadastrar_terceiro"):
            self.assertIn(acao, rep)
            self.assertIn(acao, self.js[i:i + 300])

    def test_escrita_so_no_barbeiro_de_teste(self):  # 4.2.4
        self.assertIn("cfg.ambiente === 'producao' ? !cfg.testeLiberado : !cfg.redirecionar", self.js)
        self.assertIn("const prof = redir ? cfg.testeId", self.js)
        self.assertIn("escrita_fora_do_teste", self.js)
        self.assertIn("'{{BV:teste.redirecionar_escrita}}' === 'True'", self.nos["Planejar"]["parameters"]["jsCode"])
        self.assertIn("cadastroLiberado: false", self.nos["Planejar"]["parameters"]["jsCode"])  # 4.2.6: sem P1 nao cadastra

    def test_contador_diario_terceiros_alimentado(self):  # SC-011: ctx.dia vem do banco, nunca fica vazio
        q = self.nos["Contexto"]["parameters"]["query"]
        self.assertRegex(q, r"AS dia FROM")
        self.assertIn("'buscas'", q)
        self.assertIn("'cadastros'", q)
        self.assertIn("busca_pessoa", q)
        self.assertIn("America/Sao_Paulo", q)

    def test_cadastro_terceiro_configuravel_por_ambiente(self):
        self.assertIn("terceiroLiberado: '{{BV:terceiro.cadastro_liberado}}' === 'True'", self.nos["Planejar"]["parameters"]["jsCode"])
        import json, pathlib
        amb = pathlib.Path(__file__).resolve().parent.parent / "config" / "ambientes"
        self.assertIs(json.loads((amb / "producao.json").read_text())["terceiro"]["cadastro_liberado"], True)
        self.assertIs(json.loads((amb / "integracao.json").read_text())["terceiro"]["cadastro_liberado"], False)

    def test_sem_segredo_nem_log(self):
        self.assertNotIn("console.log", self.texto)
        self.assertNotRegex(self.texto, r"[0-9a-f]{64}")
        self.assertNotRegex(self.texto, r"sk-[A-Za-z0-9]|X-Api-Key|Bearer ")
        self.assertEqual(self.wf["settings"]["saveDataSuccessExecution"], "none")
        self.assertEqual(self.wf["settings"]["saveDataErrorExecution"], "none")

    def test_logica_pura_em_node(self):
        if not shutil.which("node"):
            self.skipTest("node ausente")
        for t in ("agente.test.js", "graces.test.js"):
            r = subprocess.run(["node", os.path.join(RAIZ, "tests", t)], capture_output=True, text=True)
            self.assertEqual(r.returncode, 0, r.stderr[-800:])


    def test_laco_de_estagios(self):  # FR-015 / u20: um so HTTP em laco, Passo volta a "Tem chamada?"
        con = self.wf["connections"]
        self.assertEqual(con["Passo"]["main"][0][0]["node"], "Tem chamada?")
        self.assertEqual(con["Tem chamada?"]["main"][0][0]["node"], "Corpo?")
        self.assertEqual(con["Tem chamada?"]["main"][1][0]["node"], "Efeitos")
        self.assertEqual({n for n in self.nos if n.startswith("Graces")}, {"Graces", "Graces corpo"})
        self.assertIn("graces: { max_estagios: {{BV:graces.max_estagios}}", self.nos["Passo"]["parameters"]["jsCode"])
        self.assertIn("estagios_esgotados", self.js)

if __name__ == "__main__":
    unittest.main()


class EntregarRajadaAgente(unittest.TestCase):
    """Tarefas 5.1.1-5.1.4 e 5.2.1: workflow do turno (AI Agent) e envio pelo Chat Master."""

    @classmethod
    def setUpClass(cls):
        cls.texto = ler("workflows/sub/entregar-rajada.json")
        cls.wf = json.loads(cls.texto)
        cls.nos = {n["name"]: n for n in cls.wf["nodes"]}

    def _destinos(self, nome):
        return {i: [d["node"] for d in s] for i, s in enumerate(self.wf["connections"].get(nome, {}).get("main", []))}

    def test_conexoes_referenciam_nos_existentes(self):
        for origem, c in self.wf["connections"].items():
            self.assertIn(origem, self.nos)
            for saidas in c.values():
                for saida in saidas:
                    for d in saida:
                        self.assertIn(d["node"], self.nos)

    def test_gatilho_e_idempotencia_do_turno(self):  # 5.1.1
        self.assertEqual(self.nos["Gatilho"]["id"], "741e271a-ab2d-582e-91f1-bd3affabd0e1")  # mesmo id do stub
        q = self.nos["Registrar turno"]["parameters"]["query"]
        self.assertIn("ON CONFLICT (turno_id) DO NOTHING", q)
        self.assertEqual(self._destinos("Ja tratado?")[0], ["Responder repetido"])
        self.assertIn("Concluir turno", self._destinos("Pos 4?")[0] + self._destinos("Pos 4?")[1])
        cm = self.nos["Compor midia"]["parameters"]["jsCode"]  # 5.1.3: precedencia grande x nao entendida
        self.assertIn("{{BV:textos.midia_grande}}", cm)
        self.assertIn("{{BV:textos.midia_nao_entendida}}", cm)
        self.assertNotIn("{{BV:textos.midia}}", cm)

    def test_ramo_de_midia_no_turno(self):  # 5.1.1, 5.1.4
        self.assertEqual(self._destinos("Ler contexto")[0], ["Tem midia?"])
        self.assertEqual(self._destinos("Tem midia?"), {0: ["Itens de midia"], 1: ["Preparar"]})
        self.assertEqual(self._destinos("Itens de midia")[0], ["Interpretar midia"])
        self.assertEqual(self._destinos("Interpretar midia")[0], ["Preparar"])
        c = self.nos["Interpretar midia"]
        self.assertEqual(c["parameters"]["workflowId"]["value"], "{{BV:workflows_sub.interpretar_midia}}")
        self.assertEqual((c["onError"], c["alwaysOutputData"]), ("continueRegularOutput", True))
        self.assertTrue(c["parameters"]["options"]["waitForSubWorkflow"])
        prep = self.nos["Preparar"]["parameters"]["jsCode"]
        self.assertIn("bvMontarTurno(itens, res)", prep)  # saida ausente/erro => res indefinido => 'interpretacao'
        q = self.nos["Ler contexto"]["parameters"]["query"]
        self.assertIn("conteudo_derivado", q)
        self.assertIn("'audio','imagem'", q)
        self.assertNotIn("console.log", prep)

    def test_agente_modelo_e_treze_ferramentas_sem_memoria(self):  # 5.1.2
        ag = self.nos["Agente"]
        self.assertEqual((ag["type"], ag["typeVersion"]), ("@n8n/n8n-nodes-langchain.agent", 3))
        self.assertEqual(ag["parameters"]["options"]["maxIterations"], "{{BV:NUM:agente.iteracoes_max}}")
        m = self.nos["Modelo"]
        self.assertEqual((m["type"], m["typeVersion"]), ("@n8n/n8n-nodes-langchain.lmChatOpenAi", 1.3))
        self.assertEqual(m["parameters"]["model"]["value"], "{{BV:agente.modelo}}")
        self.assertEqual(m["parameters"]["options"]["reasoningEffort"], "{{BV:agente.raciocinio}}")
        tools = [n for n in self.wf["nodes"] if n["type"] == "@n8n/n8n-nodes-langchain.toolWorkflow"]
        conf = [t for t in tools if t["parameters"]["name"] == "confirmar_presenca"]  # mensagens-agendadas 4.3.2: ferramenta propria, outro sub-workflow
        tools = [t for t in tools if t not in conf]
        self.assertEqual(len(conf), 1)
        vc = conf[0]["parameters"]["workflowInputs"]["value"]
        self.assertEqual(conf[0]["parameters"]["workflowId"]["value"], "{{BV:workflows_sub.bv_confirmacao}}")
        self.assertEqual(vc["origem"], "agente")
        self.assertNotIn("$fromAI", vc["contato_id"])  # o modelo nunca informa o contato
        self.assertEqual(sorted(k for k, x in vc.items() if "$fromAI" in x), ["confirmado", "mensagem_id"])
        self.assertIn("confirmar_presenca", ler("workflows/shared/agente.js"))
        self.assertIn("m.resposta IS NULL", self.nos["Ler contexto"]["parameters"]["query"])
        self.assertIn("bvMPromptConfirmacoes(ctx, Date.now()", self.nos["Preparar"]["parameters"]["jsCode"])  # confirmacoes e recusa (mensagens.js)
        self.assertIn("m.motivo IS NULL", self.nos["Ler contexto"]["parameters"]["query"])  # confirmacao encerrada (cancelar/remarcar) nao entra
        self.assertEqual({t["parameters"]["name"] for t in tools}, {
            "identificar_cliente", "cadastrar_cliente", "escolher_cliente", "listar_servicos", "listar_barbeiros",
            "horarios_livres", "meus_agendamentos", "agendar", "reagendar", "cancelar",
            "buscar_pessoa", "escolher_pessoa", "cadastrar_terceiro", "funcionamento"})
        campos_graces = set(re.search(r"BVG_CAMPOS = \[(.*?)\]", ler("workflows/shared/graces.js"), re.S).group(1).replace("'", "").replace("\n", "").replace(" ", "").split(","))
        for t in tools:
            self.assertEqual(t["typeVersion"], 2.2)
            self.assertEqual(t["parameters"]["workflowId"]["value"], "{{BV:workflows_sub.bv_graces}}")
            v = t["parameters"]["workflowInputs"]["value"]
            self.assertEqual(v["operacao"], t["parameters"]["name"])
            self.assertLessEqual(set(v), campos_graces)  # bv-graces recusa campo desconhecido
            for fixo in ("contato_id", "telefone", "turno_id", "ambiente"):
                self.assertNotIn("$fromAI", v[fixo])  # FR-020: o modelo nunca informa o cliente
            self.assertNotIn("idCliente", json.dumps(v))
            self.assertIn(("Agente", "ai_tool"), [(d["node"], k) for k, ss in self.wf["connections"][t["name"]].items() for s in ss for d in s])
        self.assertFalse([n for n in self.wf["nodes"] if "memory" in n["type"].lower()])

    def test_contingencia_limite_e_sem_handoff(self):  # 5.1.3
        self.assertEqual(self.nos["Agente"]["onError"], "continueErrorOutput")
        # erro intermitente do n8n ("Paired item data ... from node 'Limite?' is unavailable", R8 em 2026-10-28): uma retentativa antes da contingencia
        self.assertEqual((self.nos["Agente"]["retryOnFail"], self.nos["Agente"]["maxTries"]), (True, 2))
        self.assertEqual(self._destinos("Agente")[1], ["Registrar falha agente"])
        self.assertIn("{{BV:textos.contingencia}}", self.nos["Contingencia"]["parameters"]["jsCode"])
        self.assertIn("'agente_falhou'", self.nos["Registrar falha agente"]["parameters"]["query"])
        self.assertNotIn("conteudo", self.nos["Registrar falha agente"]["parameters"]["query"])  # sem PII
        self.assertIn("{{BV:agente.turnos_max_contato_hora}}", self.nos["Preparar"]["parameters"]["jsCode"])
        self.assertIn("{{BV:textos.humano}}", self.nos["Compor humano"]["parameters"]["jsCode"])
        self.assertNotIn("handoffs", self.texto)

    def test_concluir_turno_e_resposta(self):  # 5.1.4
        q = self.nos["Concluir turno"]["parameters"]["query"]
        self.assertIn("estado = 'concluido'", q)
        self.assertIn("ultima_entrada_em = now()", q)
        self.assertIn("ok: true", self.nos["Responder ok"]["parameters"]["jsCode"])
        self.assertIn("ok: false", self.nos["Responder falha"]["parameters"]["jsCode"])

    def test_envio_por_posicao(self):  # 5.2.1 / 5.2.3
        for n in range(1, 5):
            self.assertIn("ON CONFLICT (mensagem_id_canal) DO NOTHING", self.nos[f"Gravar saida {n}"]["parameters"]["query"])
            ordem = [f"Gravar saida {n}", f"Gravada {n}?", f"Simulado {n}?", f"Digitando {n}", f"Espera {n}", f"Enviar {n}", f"Enviado {n}?"]
            for a, b in zip(ordem, ordem[1:]):
                self.assertIn(b, self._destinos(a)[0], (a, b))
            self.assertIn(f"Falha envio {n}", self._destinos(f"Enviado {n}?")[1])
            self.assertEqual(self._destinos(f"Falha envio {n}")[0], ["Concluir falhou"])
            for http in (f"Digitando {n}", f"Enviar {n}"):
                p = self.nos[http]["parameters"]
                self.assertIs(p["sendQuery"], False)
                self.assertIs(p["sendBody"], True)
                self.assertEqual(self.nos[http]["credentials"]["httpHeaderAuth"]["id"], "{{BV:credenciais.chatmaster}}")
            # contato simulado nunca chega ao HTTP: so a saida "real" (0) de Simulado vai ao digitando
            self.assertNotIn(f"Enviar {n}", self._destinos(f"Simulado {n}?")[1])
        js = self.nos["Saidas"]["parameters"]["jsCode"]
        self.assertIn("{{BV:chatmaster.whatsapp_id}}", js)
        self.assertEqual(js.count("whatsappId: wid"), 3)  # digitando, texto e lista
        self.assertIn("{{BV:teste.contatos_escrita}}", js)  # so contato de escrita recebe de verdade
        self.assertIn("sendListPRO", js)
        self.assertNotIn("1.", self.nos["Compor"]["parameters"]["jsCode"].split("OPCOES")[0])  # sem lista numerada em texto

    def test_node_syntax_dos_code_nodes(self):
        if not shutil.which("node"):
            self.skipTest("node ausente")
        import importlib.util
        spec = importlib.util.spec_from_file_location("deploy_n8n", os.path.join(RAIZ, "scripts", "deploy-n8n.py"))
        d = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(d)
        cfg = json.loads(ler("config/ambientes/integracao.json"))
        wf = json.loads(d.renderizar(self.texto, cfg, RAIZ))
        for n in wf["nodes"]:
            if n["type"] == "n8n-nodes-base.code":
                p = subprocess.run(["node", "--check", "-"], input="async function f(){" + n["parameters"]["jsCode"] + "\n}", capture_output=True, text=True)
                self.assertEqual(p.returncode, 0, (n["name"], p.stderr[:200]))
