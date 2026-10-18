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

    def test_gatilho_so_aceita_campos_do_contrato(self):
        g = self.nos["Gatilho"]
        self.assertEqual(g["type"], "n8n-nodes-base.executeWorkflowTrigger")
        campos = {v["name"] for v in g["parameters"]["workflowInputs"]["values"]}
        permitidos = set(re.search(r"BVG_CAMPOS = \[(.*?)\]", self.js, re.S).group(1).replace("'", "").replace("\n", "").replace(" ", "").split(","))
        self.assertEqual(campos, permitidos)
        self.assertNotIn("idCliente", campos | {"id_cliente"})  # FR-020: o modelo nunca informa o cliente
        self.assertIn("bvGNormalizar", self.nos["Normalizar"]["parameters"]["jsCode"])

    def test_http_graces_com_timeout_neverError_e_credencial(self):
        https = [n for n in self.wf["nodes"] if n["type"] == "n8n-nodes-base.httpRequest"]
        self.assertEqual(len(https), 3)
        for n in https:
            p = n["parameters"]
            self.assertTrue(p["url"].startswith("=https://{{BV:graces.host}}/public/v1"))
            self.assertEqual(p["options"]["timeout"], "{{BV:NUM:graces.timeout_ms}}")
            self.assertTrue(p["options"]["response"]["response"]["neverError"])
            self.assertEqual(n["credentials"]["httpHeaderAuth"]["id"], "{{BV:credenciais.graces}}")
            self.assertEqual(n["onError"], "continueRegularOutput")

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
        for nome in ("Planejar", "Passo A", "Passo E1", "Passo E2"):
            self.assertIn("{{BV:INCLUDE:shared/agente.js}}", self.nos[nome]["parameters"]["jsCode"])

    def test_sql_so_com_parametros(self):
        qs = {n: x for n, x in self.nos.items() if x["type"] == "n8n-nodes-base.postgres"}
        self.assertEqual(set(qs), {"Contexto", "Substituir pendente", "Persistir"})
        for nome, n in qs.items():
            q = n["parameters"]["query"]
            self.assertIn("$1", q, nome)
            self.assertNotIn("{{", q, nome)
            self.assertNotIn("${", q, nome)
            self.assertNotIn("'+", q.replace(" ", ""), nome)
            self.assertTrue(n["parameters"]["options"]["queryReplacement"].startswith("={{"), nome)
        persistir = qs["Persistir"]["parameters"]["query"]
        self.assertEqual(sorted({int(x) for x in re.findall(r"\$(\d+)", persistir)}), list(range(1, 15)))

    def test_fase2_so_com_proposta_pendente_do_turno_anterior(self):  # FR-007 / 4.2.2
        q = self.nos["Contexto"]["parameters"]["query"]
        for trecho in ("estado = 'pendente'", "contato_id = $1::bigint", "turno_id::text <> $3::text", "make_interval(mins => $4::int)",
                       "ANY(string_to_array($5::text"):
            self.assertIn(trecho, q)
        self.assertIn("{{BV:proposta.validade_min}}", self.nos["Contexto"]["parameters"]["options"]["queryReplacement"])
        # revalida antes de escrever e o POST/PUT so nasce depois da revalidacao
        self.assertLess(self.js.index("etapa === 'reval'"), self.js.index("m: 'POST', path: '/agenda'"))

    def test_escrita_so_no_barbeiro_de_teste(self):  # 4.2.4
        self.assertIn("cfg.ambiente === 'producao' || !cfg.redirecionar", self.js)
        self.assertIn("cfg.redirecionar ? cfg.testeId", self.js)
        self.assertIn("escrita_fora_do_teste", self.js)
        self.assertIn("'{{BV:teste.redirecionar_escrita}}' === 'True'", self.nos["Planejar"]["parameters"]["jsCode"])
        self.assertIn("cadastroLiberado: false", self.nos["Planejar"]["parameters"]["jsCode"])  # 4.2.6: sem P1 nao cadastra

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


if __name__ == "__main__":
    unittest.main()
