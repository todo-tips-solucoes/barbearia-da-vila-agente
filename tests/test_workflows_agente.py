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
        # item 26: toda transferencia grava o inicio em handoffs (uma aberta por contato), com o motivo so em letras
        rh = self.nos["Registrar handoff"]["parameters"]
        self.assertIn("INSERT INTO handoffs (contato_id, motivo) VALUES ($1::bigint, COALESCE(NULLIF(left(regexp_replace($3::text, '[^a-z_]', '', 'g'), 60), ''), 'nao_informado')) ON CONFLICT (contato_id) WHERE situacao = 'aberto' DO NOTHING", rh["query"])
        self.assertTrue(rh["options"]["queryReplacement"].endswith("String(($('Efeitos').first().json.resultado || {}).motivo || '')] }}"))
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
        self.assertEqual(sorted({int(x) for x in re.findall(r"\$(\d+)", persistir)}), list(range(1, 19)))
        self.assertIn("ct AS (UPDATE contatos SET como_conheceu = $18::text", persistir)  # 0011: como conheceu, so por parametro
        self.assertEqual(persistir.count("("), persistir.count(")"))  # CTE a mais quebrou o SQL inteiro (2026-11-14)
        # mensagens-agendadas 3.1.2: cancela pendentes, insere por idAgenda sem duplicar, fora da lista de escrita nasce cancelada
        for trecho in ("mc AS (UPDATE mensagens_agendadas", "ma AS (INSERT INTO mensagens_agendadas", "ON CONFLICT (graces_agendamento_id, tipo) WHERE situacao = 'pendente' DO UPDATE",
                       "'fora_da_lista'", "y.motivo IS NULL", "m.situacao <> 'pendente'",
                       "m.situacao = 'pendente' AND m.reservada_em IS NULL AND NOT EXISTS",  # item 9: reservada nao e cancelada (o envio grava)
                       "me AS (UPDATE mensagens_agendadas m SET motivo = x.motivo",  # item 3: confirmacao ja enviada fica encerrada
                       "m.tipo IN ('confirmacao','lembrete_dia') AND m.situacao = 'enviada' AND m.resposta IS NULL AND m.motivo IS NULL",
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
        self.assertLess(self.js.index("etapa === 'reval'"), self.js.index("m: 'POST', path: '/agenda', body: bvgCorpoAgendar(d.idCliente"))

    def test_pacote_item_12(self):  # owner, 2026-11-23: agendar abatendo do pacote
        # um so lugar monta o corpo do POST /agenda, com exatamente um entre o servico e a secao do pacote
        self.assertEqual(self.js.count("m: 'POST', path: '/agenda', body: bvgCorpoAgendar("), 2)
        self.assertNotIn("path: '/agenda', body: {", self.js)
        self.assertIn("...(secao ? { idClienteItemPacote: secao } : { idServico: x.idServico })", self.js)
        # a secao so nasce da leitura da Graces: nenhum campo de entrada (modelo ou Gatilho) a carrega, e so ha GET em /agenda/pacotes
        i = self.js.index("const BVG_CAMPOS")
        self.assertNotIn("acote", self.js[i:self.js.index("];", i)])
        self.assertNotIn("acote", json.dumps(self.nos["Gatilho"]["parameters"]))
        self.assertEqual(self.js.count("path: '/agenda/pacotes'"), 1)
        self.assertIn("({ m: 'GET', path: '/agenda/pacotes', qs: { idCliente, idServico } })", self.js)

    def test_fase2_reivindica_propostas_de_conjunto(self):  # achado do roteiro r7/r9: conjunto nunca era reivindicado
        rep = self.nos["Contexto"]["parameters"]["options"]["queryReplacement"]
        i = self.js.index("const BVG_ACOES")
        for acao in ("agendar_conjunto", "cancelar_conjunto"):
            self.assertIn(acao, rep)
            self.assertIn(acao, self.js[i:i + 300])

    def test_escrita_so_no_barbeiro_de_teste(self):  # 4.2.4
        self.assertIn("cfg.ambiente === 'producao' ? !(cfg.escritaLiberada || cfg.testeLiberado) : !cfg.redirecionar", self.js)
        for no in ("Normalizar", "Planejar", "Passo", "Efeitos"):  # a configuracao vem de um lugar so (revisao de 17/11)
            self.assertIn("{{BV:INCLUDE:shared/config.js}}\nconst cfg = bvGCfg(($('Gatilho').first().json || {}).telefone);", self.nos[no]["parameters"]["jsCode"])
            self.assertNotIn("{{BV:graces.", self.nos[no]["parameters"]["jsCode"])
        self.assertIn("escritaLiberada: '{{BV:graces.escrita_liberada}}' === 'True'", ler("workflows/shared/config.js"))  # owner, 2026-11-15: agenda real em PROD por config
        self.assertIn("const prof = redir ? cfg.testeId", self.js)
        self.assertIn("escrita_fora_do_teste", self.js)
        self.assertIn("'{{BV:teste.redirecionar_escrita}}' === 'True'", ler("workflows/shared/config.js"))
        # Cadastro proprio (owner, 2026-11-14): trava por ambiente no config; no TESTE redireciona ao cliente de teste
        for no in ("Normalizar", "Planejar", "Passo", "Efeitos"):
            self.assertIn("cadastroLiberado: '{{BV:cadastro.liberado}}' === 'True', clienteTesteId: '{{BV:cadastro.cliente_teste_id}}'", ler("workflows/shared/config.js"))
        integ, prod = (json.load(open(os.path.join(RAIZ, "config", "ambientes", f"{a}.json"), encoding="utf-8")) for a in ("integracao", "producao"))
        self.assertTrue(integ["teste"]["redirecionar_escrita"] and integ["cadastro"]["cliente_teste_id"])
        self.assertFalse(prod["teste"]["redirecionar_escrita"])
        self.assertEqual((integ["graces"]["escrita_liberada"], prod["graces"]["escrita_liberada"], prod["graces"]["teste_contatos"]), (False, True, []))

    def test_contador_diario_vem_do_banco(self):  # ctx.dia vem do banco, nunca fica vazio (hoje: o teto de agendamentos)
        q = self.nos["Contexto"]["parameters"]["query"]
        self.assertRegex(q, r"AS dia FROM")
        self.assertIn("'agendados'", q)
        self.assertIn("America/Sao_Paulo", q)

    def test_sem_codigo_das_ferramentas_de_outra_pessoa(self):  # revisao de 17/11, etapa 4: sairam do agente na etapa 1 e do codigo aqui
        import pathlib
        raiz = pathlib.Path(__file__).resolve().parent.parent
        for arq in ("workflows/shared/graces.js", "workflows/shared/config.js", "workflows/sub/bv-graces.json", "workflows/sub/entregar-rajada.json",
                    "config/ambientes/producao.json", "config/ambientes/integracao.json"):
            t = (raiz / arq).read_text(encoding="utf-8")
            for termo in ("buscar_pessoa", "escolher_pessoa", "cadastrar_terceiro", "terceiroLiberado", "para_terceiro", "busca_pessoa"):
                self.assertNotIn(termo, t, (arq, termo))
        self.assertNotIn("terceiro", json.loads((raiz / "config/ambientes/producao.json").read_text()))

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
        self.assertIn("graces: { max_estagios: {{BV:graces.max_estagios}}", ler("workflows/shared/config.js"))
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

    def test_conexao_e_filas_do_config(self):  # owner, 2026-11-14: PROD na conexao 159, fila do agente 106, humana 107
        import glob
        for f in glob.glob(os.path.join(RAIZ, "workflows", "**", "*.json"), recursive=True) + glob.glob(os.path.join(RAIZ, "workflows", "shared", "*.js")):
            t = open(f, encoding="utf-8").read()
            self.assertNotIn("queueId: '0'", t, f)
            self.assertNotRegex(t, r"whatsappId: '1[0-9]{2}'", f)
        prod = json.load(open(os.path.join(RAIZ, "config", "ambientes", "producao.json"), encoding="utf-8"))
        self.assertEqual((prod["chatmaster"], prod["handoff"]["setor_id"], prod["handoff"]["whatsapp_id"]), ({"whatsapp_id": "159", "queue_id": "107", "user_id": "234", "etiquetas": {"confirmado": 534, "cancelado": 535}}, 106, "159"))  # owner, 2026-11-15: 106 Atendimento (humano), 107 Atendimento Agente
        self.assertNotEqual(prod["credenciais"]["chatmaster"], integ_cred := json.load(open(os.path.join(RAIZ, "config", "ambientes", "integracao.json"), encoding="utf-8"))["credenciais"]["chatmaster"])  # 159 e de outra conta
        integ = json.load(open(os.path.join(RAIZ, "config", "ambientes", "integracao.json"), encoding="utf-8"))
        self.assertEqual((integ["chatmaster"], integ["handoff"]["setor_id"]), ({"whatsapp_id": "145", "queue_id": "0", "user_id": "100", "etiquetas": {"confirmado": 0, "cancelado": 0}}, 78))
        self.assertIn("handoff: { setor_id: {{BV:handoff.setor_id}} }", ler("workflows/shared/config.js"))

    def test_corrida_nao_repete_resposta(self):  # atendimentos de 2026-11-15: respostas duplicadas
        self.assertIn("bvCorrida(itens, hist)", self.nos["Preparar"]["parameters"]["jsCode"])
        c = self.nos["Compor"]["parameters"]["jsCode"]
        self.assertIn("saida = bvSemRepetir(saida, ($('Gatilho').first().json || {}).itens", c)
        self.assertLess(c.index("bvSaudar("), c.index("bvSemRepetir("))  # depois do texto de reformular: saida vazia e silencio, nao "nao entendi"

    def test_jayme_clausula_petrea(self):  # owner, 2026-11-14: so a equipe agenda o Jayme
        self.assertEqual(self._destinos("Sessao"), {0: ["Transferido?"]})  # depois da transferencia o agente fica em silencio
        self.assertEqual(self._destinos("Transferido?"), {0: ["Silencio"], 1: ["So midia?"]})
        self.assertEqual(self._destinos("Silencio"), {0: ["Saidas"]})
        # fila humana (owner, 2026-11-16): silencio pelo ticket na fila; sem fila no evento, vale a marca da transferencia na sessao
        # a regra mora em bvTransferido (agente.js, testada em agente.test.js); o no so a chama
        self.assertIn("const fh = bvTransferido({ porFila: '{{BV:handoff.silencio_por_fila}}' === 'True', filaHumana: {{BV:handoff.setor_id}}, fila: ctx.fila_id, sessaoNova: rec.sessaoNova, handoff: (ctx.pedido || {}).handoff });", self.nos["Decidir silencio"]["parameters"]["jsCode"])
        self.assertIn("transferido: fh.transferido, limpar_handoff: fh.limpar,", self.nos["Preparar"]["parameters"]["jsCode"])
        t = self.nos["Ferramenta transferir_atendimento"]["parameters"]
        self.assertEqual(t["workflowInputs"]["value"]["operacao"], "transferir_atendimento")
        self.assertEqual(self.wf["connections"]["Ferramenta transferir_atendimento"]["ai_tool"][0][0]["node"], "Agente")
        self.assertIn("humanos: {{BV:graces.barbeiros_humanos}}", self.nos["Preparar"]["parameters"]["jsCode"])
        for a in ("integracao", "producao"):
            cfg = json.load(open(os.path.join(RAIZ, "config", "ambientes", f"{a}.json"), encoding="utf-8"))
            self.assertIn({"id": "b623cd84-6068-4a57-9ce6-2f7d9a37a11e", "nome": "Jayme"}, cfg["graces"]["barbeiros_humanos"])
        self.assertIn("humanos: {{BV:graces.barbeiros_humanos}}", ler("workflows/shared/config.js"))
        self.assertIn("textos: { encaminhar_equipe: '{{BV:textos.encaminhar_equipe}}' }", ler("workflows/shared/config.js"))  # texto da transferencia chega a ferramenta

    def test_sessao_comeca_na_mensagem_que_a_abriu(self):  # 2026-11-14: a 1a mensagem sumia do historico do turno seguinte
        q = self.nos["Sessao"]["parameters"]["query"]
        self.assertIn("COALESCE((SELECT min(criado_em) FROM mensagens WHERE contato_id = $1::bigint AND turno_id = $4::uuid), now())", q)
        self.assertNotIn("THEN now()", q)
        self.assertTrue(self.nos["Sessao"]["parameters"]["options"]["queryReplacement"].endswith("$('Gatilho').first().json.turno_id, String(!!$json.limpar_handoff), String(!!$json.transferido)] }}"))
        # item 26: quando o agente volta a atender o contato, a transferencia aberta e encerrada (com o agente em silencio, nao)
        self.assertTrue(q.startswith("WITH hf AS (UPDATE handoffs SET situacao = 'encerrado', encerrado_em = now(), encerrado_por = 'retorno' WHERE contato_id = $1::bigint AND situacao = 'aberto' AND NOT $6::boolean RETURNING 1) INSERT INTO conversas"))
        # ticket fora da fila humana: a marca da transferencia sai, senao toda ferramenta recusava com handoff_ativo (17/11)
        self.assertIn("WHEN $5::boolean THEN conversas.pedido - 'handoff' ELSE conversas.pedido END", q)

    def test_identifica_o_cliente_antes_do_modelo(self):  # owner, 2026-11-14
        self.assertEqual(self._destinos("Limite?")[1], ["Identificar?"])
        self.assertEqual(self._destinos("Identificar?"), {0: ["Identificar"], 1: ["Cliente"]})
        self.assertEqual(self._destinos("Identificar"), {0: ["Cliente"]})
        self.assertEqual(self._destinos("Cliente"), {0: ["Agente"]})
        idf = self.nos["Identificar"]
        self.assertEqual((idf["type"], idf["onError"]), ("n8n-nodes-base.executeWorkflow", "continueRegularOutput"))  # falha nao derruba o turno
        self.assertEqual(idf["parameters"]["workflowInputs"]["value"]["operacao"], "identificar_cliente")
        self.assertEqual(idf["parameters"]["workflowInputs"]["value"]["telefone"], "={{ String($('Gatilho').first().json.telefone) }}")  # nunca do modelo
        self.assertIn("identificar: rec.sessaoNova || !(ctx.pedido || {}).identificado", self.nos["Preparar"]["parameters"]["jsCode"])
        self.assertEqual(self.nos["Agente"]["parameters"]["options"]["systemMessage"], "={{ $('Cliente').first().json.system }}")
        self.assertIn("bvContextoCliente(c, bvNeutralizar, p.agora)", self.nos["Cliente"]["parameters"]["jsCode"])
        cad = self.nos["Ferramenta cadastrar_cliente"]["parameters"]["workflowInputs"]
        self.assertTrue({"nome", "nascimento", "como_conheceu"} <= set(cad["value"]) and {"nascimento", "como_conheceu"} <= {x["id"] for x in cad["schema"]})

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
        # silencio decidido antes da midia (revisao de 17/11): na fila humana o audio e a imagem nem sao interpretados
        self.assertEqual(self._destinos("Ler contexto")[0], ["Decidir silencio"])
        self.assertEqual(self._destinos("Decidir silencio")[0], ["Tem midia?"])
        self.assertIn("&& !$('Decidir silencio').first().json.transferido", json.dumps(self.nos["Tem midia?"]["parameters"]))
        self.assertIn("const rec = ds.rec, fh = ds;", self.nos["Preparar"]["parameters"]["jsCode"])
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
        # lembrete de 1 hora no contexto (17/11): enviado ou prestes a sair (a regra unica de bv_respondivel, com o tipo fixo: a funcao
        # so da a folga de 2 min ao lembrete do Chat Master), ate a hora marcada; cancelado (motivo) nao entra
        self.assertIn("m.tipo = 'lembrete_hora' AND bv_respondivel(m.situacao, 'lembrete_dia', m.agendamento_canal_id, m.previsto_para) AND m.motivo IS NULL AND m.inicio > (now() AT TIME ZONE 'America/Sao_Paulo') ORDER BY m.inicio LIMIT 1) AS lembrete_hora", self.nos["Ler contexto"]["parameters"]["query"])
        self.assertIn("ctx.lembrete_hora", ler("workflows/shared/mensagens.js"))
        self.assertIn("bvNeutralizar, hist.length === 0)", self.nos["Preparar"]["parameters"]["jsCode"])  # so sem conversa em andamento
        self.assertEqual({t["parameters"]["name"] for t in tools}, {
            "identificar_cliente", "cadastrar_cliente", "escolher_cliente", "listar_servicos", "listar_barbeiros",
            "horarios_livres", "meus_agendamentos", "agendar", "reagendar", "cancelar",
            "funcionamento", "transferir_atendimento"})  # sem buscar_pessoa, escolher_pessoa e cadastrar_terceiro (17/11)
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
        # o fluxo do agente so toca em handoffs para encerrar a transferencia no retorno (no Sessao); o inicio e do bv-graces
        self.assertEqual(self.texto.count("handoffs"), 1)

    def test_concluir_turno_e_resposta(self):  # 5.1.4
        q = self.nos["Concluir turno"]["parameters"]["query"]
        self.assertIn("estado = 'concluido'", q)
        self.assertIn("ultima_entrada_em = now()", q)
        self.assertIn("ok: true", self.nos["Responder ok"]["parameters"]["jsCode"])
        self.assertIn("ok: false", self.nos["Responder falha"]["parameters"]["jsCode"])

    def test_envio_por_posicao(self):  # 5.2.1 / 5.2.3
        self.assertIn("const lista = m.tipo === 'lista' ? JSON.stringify((m.opcoes || []).map((o) => ({ id: o.id, rotulo: o.rotulo }))) : null;", self.nos["Saidas"]["parameters"]["jsCode"])
        for n in range(1, 5):
            self.assertIn("ON CONFLICT (mensagem_id_canal) DO NOTHING", self.nos[f"Gravar saida {n}"]["parameters"]["query"])
            # item 26: os itens da lista enviada ficam em mensagens.lista
            self.assertIn("tipo, conteudo, lista) VALUES ($1::bigint, $2::text, 'saida', $3::text, $4::text, $5::jsonb)", self.nos[f"Gravar saida {n}"]["parameters"]["query"])
            self.assertTrue(self.nos[f"Gravar saida {n}"]["parameters"]["options"]["queryReplacement"].endswith(f"$('Saidas').first().json.reqs[{n - 1}].lista] }}}}"))
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
        # texto e lista saem dos montadores de shared/mensagens.js (um lugar so decide endpoint, numero e ticket); aqui so o "digitando"
        self.assertEqual(js.count("whatsappId: cm.wid"), 1)
        self.assertIn("{{BV:INCLUDE:shared/mensagens.js}}", js)
        self.assertIn("{{BV:INCLUDE:shared/config.js}}", js)
        self.assertIn("const cm = bvMCfgEnvio();", js)  # conexao, setor e textos da lista: a mesma configuracao de envio do bv-mensagens
        self.assertNotIn("{{BV:chatmaster.", js)
        self.assertIn("const envio = m.tipo === 'lista' ? bvMListaDe(m.texto, m.opcoes, g.telefone, cm) : bvMTexto({ texto: m.texto }, g.telefone, cm);", js)
        self.assertNotIn("openTicket", js)  # a decisao sobre o ticket mora no montador
        self.assertIn("const simulado = bvSimulado(g.telefone);", js)  # so contato de escrita recebe de verdade (shared/config.js)
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


class RevisaoEtapa1(unittest.TestCase):  # revisao de 17/11/2026: defeitos que confundiam o cliente
    @classmethod
    def setUpClass(cls):
        w = json.loads(ler("workflows/sub/entregar-rajada.json"))
        cls.nos = {n["name"]: n for n in w["nodes"]}
        cls.con = w["connections"]
        cls.graces = {n["name"]: n for n in json.loads(ler("workflows/sub/bv-graces.json"))["nodes"]}

    def test_confirmacao_sem_lista_de_horarios(self):
        # so a proposta de agendar ou remarcar tira a lista: "cancela o de quarta e marca pra segunda" cria a de cancelar e busca os
        # horarios de segunda no mesmo turno, e a lista deles tem de sair (suite R8, 18/11)
        self.assertIn("p.estado = 'pendente' AND p.turno_id = $2::uuid AND p.acao NOT LIKE 'cancelar%') AS proposta_nova", self.nos["Reler opcoes"]["parameters"]["query"])
        self.assertIn("bvCompor(out, oferta, cfg, ofertaNova, !!$input.first().json.proposta_nova, repete)", self.nos["Compor"]["parameters"]["jsCode"])
        self.assertIn("bvTerceiraVez(out, histC, antes, ofertaNova, composta.some((x) => x.tipo === 'lista')) ? [{ n: 1, tipo: 'texto', texto: \"{{BV:textos.laco}}\" }] : composta;", self.nos["Compor"]["parameters"]["jsCode"])
        for amb in ("producao", "integracao"):
            self.assertIn("passe para a equipe", json.loads(ler(f"config/ambientes/{amb}.json"))["textos"]["laco"])
        # etapa 4: a mesma pergunta pela segunda vez leva a lista junto; a terceira nao sai (o contexto manda oferecer a equipe)
        self.assertIn("const repete = !ofertaNova && bvVezesDaLista(histC, antes) === 1 && bvRepetePergunta(out, histC);", self.nos["Compor"]["parameters"]["jsCode"])
        self.assertIn("bvLaco(hist, rec.opcoes)", self.nos["Preparar"]["parameters"]["jsCode"])
        # a oferta nasce carimbada com a hora (em): e o que permite contar quantas vezes a lista dela ja foi enviada
        qp = self.graces["Persistir"]["parameters"]["query"]
        self.assertEqual(qp.count("WHEN ($2::jsonb -> 'itens') IS NOT NULL THEN $2::jsonb || jsonb_build_object('em',"), 2)
        # a mesma lista buscada de novo guarda a hora em que nasceu: chamar a ferramenta outra vez nao zera a contagem (suite R38)
        self.assertIn("CASE WHEN conversas.opcoes - 'em' = $2::jsonb AND conversas.opcoes->>'em' IS NOT NULL THEN conversas.opcoes->>'em' ELSE", qp)

    def test_limite_de_turnos_transfere_de_verdade(self):
        self.assertEqual(self.con["Limite?"]["main"][0][0]["node"], "Transferir por limite")
        self.assertEqual(self.con["Transferir por limite"]["main"][0][0]["node"], "Compor humano")
        p = self.nos["Transferir por limite"]["parameters"]
        self.assertEqual(p["workflowId"]["value"], "{{BV:workflows_sub.bv_graces}}")
        v = p["workflowInputs"]["value"]
        # 23/11: o pedido claro de falar com uma pessoa usa o mesmo ramo, com o motivo proprio; o motivo sai do Preparar, nunca do modelo
        self.assertEqual([v["operacao"], v["motivo"]], ["transferir_atendimento", "={{ $('Preparar').first().json.motivo_limite }}"])
        prep = self.nos["Preparar"]["parameters"]["jsCode"]
        self.assertIn("const estourou = Number(reg.turnos_hora) >= {{BV:agente.turnos_max_contato_hora}};", prep)
        self.assertIn("limite: estourou || bvPediuPessoa(fala), motivo_limite: estourou ? 'nao_resolvi' : 'pediu_pessoa',", prep)  # o estouro guarda o motivo dele
        self.assertIn("{{BV:INCLUDE:shared/agente.js}}", prep)
        self.assertNotIn("$fromAI", json.dumps(v))  # contato, telefone e turno vem do Gatilho, nunca do modelo
        self.assertIn("($input.first().json || {}).texto", self.nos["Compor humano"]["parameters"]["jsCode"])

    def test_retomada_mantem_a_proposta_valida(self):
        q = self.graces["Contexto"]["parameters"]["query"]
        self.assertIn("r.retomada_em > propostas.criada_em AND r.retomada_em > now() - make_interval(mins => $6::int)", q)
        self.assertEqual(q.count("("), q.count(")"))
        self.assertTrue(self.graces["Contexto"]["parameters"]["options"]["queryReplacement"].endswith("{{BV:retomada.resposta_max_min}}] }}"))

    def test_transferencia_tenta_de_novo(self):
        self.assertEqual([self.graces["Transferir ticket"].get(k) for k in ("retryOnFail", "maxTries")], [True, 2])


class RevisaoEtapa2(unittest.TestCase):  # revisao de 17/11/2026: estado para o modelo
    @classmethod
    def setUpClass(cls):
        cls.nos = {n["name"]: n for n in json.loads(ler("workflows/sub/entregar-rajada.json"))["nodes"]}

    def test_mensagem_da_equipe_tem_rotulo_e_conta_para_a_recencia(self):
        self.assertIn("(mensagem_id_canal LIKE 'equipe-%') AS equipe FROM mensagens", self.nos["Ler contexto"]["parameters"]["query"])
        c = self.nos["Preparar"]["parameters"]["jsCode"]
        self.assertIn("hist.map(bvLinhaHistorico).join", c)
        self.assertIn("bvRecencia({ equipeMs: eq.length ? Math.max(...eq) : null,", self.nos["Decidir silencio"]["parameters"]["jsCode"])
        self.assertNotIn("'Atendente: '", c)  # o rotulo de quem falou fica so em bvLinhaHistorico (testada)

    def test_agendamentos_futuros_no_contexto_so_os_que_nao_passaram(self):
        self.assertIn("json: { texto, system, agora,", self.nos["Preparar"]["parameters"]["jsCode"])
        self.assertIn("bvContextoCliente(c, bvNeutralizar, p.agora)", self.nos["Cliente"]["parameters"]["jsCode"])


class Etapa6(unittest.TestCase):  # pendencias da leitura de 17/11: decisao no codigo, com o texto do cliente no turno
    @classmethod
    def setUpClass(cls):
        cls.nos = {n["name"]: n for n in json.loads(ler("workflows/sub/entregar-rajada.json"))["nodes"]}

    def test_texto_do_cliente_vai_do_fluxo_para_as_ferramentas_sem_passar_pelo_modelo(self):
        for nome in ("horarios_livres", "agendar", "reagendar", "cancelar"):
            wi = self.nos["Ferramenta " + nome]["parameters"]["workflowInputs"]
            self.assertEqual(wi["value"]["texto_cliente"], "={{ $('Preparar').first().json.texto_cliente }}", nome)
            self.assertIn("texto_cliente", [s["id"] for s in wi["schema"]], nome)
        for n in self.nos.values():  # nenhum campo novo visivel ao modelo: um campo a mais travava a chamada (R18, 19/11)
            if n["name"].startswith("Ferramenta "):
                vis = [k for k, v in n["parameters"]["workflowInputs"]["value"].items() if "$fromAI" in str(v)]
                self.assertNotIn("texto_cliente", vis)
                self.assertNotIn("a_partir", vis)

    def test_promessa_sem_entrega_e_tratada_no_codigo_sem_laco(self):  # etapa 7; o laco de volta ao agente travou o n8n em 21/11
        w = json.loads(ler("workflows/sub/entregar-rajada.json"))
        c = w["connections"]
        self.assertEqual([x["node"] for x in c["Agente"]["main"][0]], ["Reler opcoes"])
        self.assertEqual([x["node"] for x in c["Agente"]["main"][1]], ["Registrar falha agente"])
        self.assertEqual(self.nos["Agente"]["parameters"]["text"], "={{ $('Preparar').first().json.texto }}")
        chega_no_agente = {k for k, v in c.items() for s in v.get("main", []) for x in s if x["node"] == "Agente"}
        self.assertEqual(chega_no_agente, {"Cliente"})  # nenhum caminho volta para o agente
        self.assertIn('texto: bvPrometeu(out) ? "{{BV:textos.sem_entrega}}" : "{{BV:textos.reformular}}"', self.nos["Compor"]["parameters"]["jsCode"])
        for amb in ("integracao", "producao"):
            self.assertEqual(json.loads(ler(f"config/ambientes/{amb}.json"))["textos"]["sem_entrega"], "Não consegui consultar agora. Pode me mandar de novo o que você precisa?")

    def test_nao_ha_pedido_de_confirmacao_anexado_pelo_codigo(self):  # tentado e retirado na revisao de seguranca: pergunta sem referente
        self.assertNotIn("pendente_antiga", self.nos["Reler opcoes"]["parameters"]["query"])
        self.assertNotIn("confirmar_de_novo", self.nos["Compor"]["parameters"]["jsCode"])
        for amb in ("integracao", "producao"):
            self.assertNotIn("confirmar_de_novo", json.loads(ler(f"config/ambientes/{amb}.json"))["textos"])

    def test_pergunta_em_aberto_so_quando_nao_ha_laco(self):
        p = self.nos["Preparar"]["parameters"]["jsCode"]
        self.assertIn("+ (bvLaco(hist, rec.opcoes) || (bvCorrida(itens, hist) ? '' : bvPerguntaAberta(hist, fala, Date.now())))", p)
        # a fala do turno: descricao de imagem nao e fala, e turno sem fala manda a marca (nao confirma nada na fase 2)
        self.assertIn("const fala = tm.linhas.filter((l) => !String(l).startsWith('[imagem descrita]')).join(' ').slice(0, 600);", p)
        self.assertIn("texto_cliente: fala || '(sem texto)',", p)
        self.assertLess(p.index("const fala = "), p.index("bvPerguntaAberta(hist, fala"))


class RevisaoEtapa3(unittest.TestCase):  # revisao de 17/11/2026: duplicacao, banco e limites
    @classmethod
    def setUpClass(cls):
        cls.rajada = json.loads(ler("workflows/sub/entregar-rajada.json"))
        cls.graces = {n["name"]: n for n in json.loads(ler("workflows/sub/bv-graces.json"))["nodes"]}
        cls.cfgs = {a: json.loads(ler(f"config/ambientes/{a}.json")) for a in ("integracao", "producao")}

    def _config_js(self, amb, corpo):
        import importlib.util
        spec = importlib.util.spec_from_file_location("deploy_n8n_e3", os.path.join(RAIZ, "scripts", "deploy-n8n.py"))
        dep = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(dep)
        js = json.loads(dep.renderizar(json.dumps({"js": "{{BV:INCLUDE:shared/config.js}}\n" + corpo}), self.cfgs[amb], RAIZ))["js"]
        r = subprocess.run(["node", os.path.join(RAIZ, "tests", "harness_code_node.js")], capture_output=True, text=True, input=json.dumps({"js": js, "input": [{}]}))
        self.assertEqual(r.returncode, 0, r.stderr[:500])
        return json.loads(r.stdout)[0]

    def test_trava_de_simulacao_num_lugar_so(self):
        if not shutil.which("node"):
            self.skipTest("node ausente")
        escrita = self.cfgs["integracao"]["teste"]["contatos_escrita"]
        corpo = "return [{ json: { fora: bvSimulado('+55 00 00000-0500'), vazio: bvSimulado(null), lista: BV_ESCRITA_TESTE, dentro: BV_ESCRITA_TESTE ? BV_ESCRITA_TESTE.map((t) => bvSimulado('+' + t)) : [] } }];"
        t = self._config_js("integracao", corpo)
        self.assertEqual([t["fora"], t["vazio"], t["lista"]], [True, True, escrita])  # TESTE: so a lista de escrita recebe de verdade
        self.assertFalse(any(t["dentro"]))
        p = self._config_js("producao", corpo)
        self.assertEqual([p["fora"], p["vazio"], p["lista"]], [False, False, None])  # producao: ninguem e simulado
        for arq, no in (("workflows/sub/entregar-rajada.json", "Saidas"), ("workflows/sub/bv-confirmacao.json", "Desfecho"), ("workflows/bv-mensagens.json", "Montar retomada"), ("workflows/bv-vigia.json", "Montar aviso")):
            js = next(n for n in json.loads(ler(arq))["nodes"] if n["name"] == no)["parameters"]["jsCode"]
            self.assertIn("{{BV:INCLUDE:shared/config.js}}", js)
            self.assertIn("bvSimulado(", js)
            self.assertNotIn("contatos_escrita}}", js)
        for arq in ("workflows/sub/entregar-rajada.json", "workflows/sub/bv-confirmacao.json", "workflows/sub/bv-graces.json", "workflows/bv-vigia.json"):
            self.assertNotIn("{{BV:teste.contatos_escrita}}", ler(arq))  # a lista de escrita so aparece em shared/config.js

    def test_config_do_bv_graces_renderiza_nos_dois_ambientes(self):
        if not shutil.which("node"):
            self.skipTest("node ausente")
        for amb in ("integracao", "producao"):
            c = self._config_js(amb, "return [{ json: bvGCfg('+55 11 90000-0000') }];")
            self.assertEqual([c["ambiente"], c["agendamentosMaxDia"], c["testeLiberado"]], [amb, 3, False])
            self.assertEqual(c["handoff"]["setor_id"], self.cfgs[amb]["handoff"]["setor_id"])
            self.assertEqual(c["graces"]["max_estagios"], self.cfgs[amb]["graces"]["max_estagios"])
            self.assertTrue(c["humanos"])  # clausula petrea: os barbeiros so da equipe chegam a todos os nos

    def test_teto_de_agendamentos_por_contato(self):
        q = self.graces["Contexto"]["parameters"]["query"]
        self.assertIn("'agendados', (SELECT count(*)::int FROM propostas WHERE contato_id = x.cid AND acao IN ('agendar', 'agendar_conjunto') AND estado = 'executada' AND atualizada_em >= date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo')", q)
        self.assertEqual(q.count("("), q.count(")"))
        self.assertIn("agendamentosMaxDia: {{BV:graces.agendamentos_max_dia}}", ler("workflows/shared/config.js"))
        self.assertEqual([c["graces"]["agendamentos_max_dia"] for c in self.cfgs.values()], [3, 3])  # owner, 17/11

    def test_turno_cabe_na_posse_do_contato(self):
        self.assertEqual(self.rajada["settings"]["executionTimeout"], "{{BV:NUM:execucao.turno_timeout_s}}")
        for c in self.cfgs.values():
            lk, ex = c["lock"], c["execucao"]
            self.assertLess(c["midia"]["execucao_timeout_s"], ex["turno_timeout_s"])
            self.assertLess(ex["turno_timeout_s"], lk["ttl_s"])
            self.assertGreaterEqual(lk["espera_s"] * lk["tentativas"], lk["ttl_s"])
            # quem esperou a posse inteira e rodou um turno inteiro ainda cabe na execucao da recepcao
            self.assertLessEqual(c["buffer"]["janela_s"] + lk["espera_s"] * lk["tentativas"] + ex["turno_timeout_s"], ex["timeout_s"])
            # a marca da ultima mensagem tem de durar a rajada inteira (teto) mais uma janela
            self.assertGreaterEqual(c["redis"]["ttl"]["ultima_s"], c["buffer"]["teto_s"] + c["buffer"]["janela_s"])
