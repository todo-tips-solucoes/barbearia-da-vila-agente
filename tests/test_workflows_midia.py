import json, os, re, unittest

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class InterpretarMidia(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        with open(os.path.join(RAIZ, "workflows/sub/interpretar-midia.json"), encoding="utf-8") as f:
            cls.texto = f.read()
        cls.wf = json.loads(cls.texto)
        cls.nos = {n["name"]: n for n in cls.wf["nodes"]}

    def destinos(self, origem):
        return [d["node"] for saida in self.wf["connections"][origem]["main"] for d in saida]

    def test_conexoes_referenciam_nos_existentes(self):
        for origem, c in self.wf["connections"].items():
            self.assertIn(origem, self.nos)
            for saida in c["main"]:
                for d in saida:
                    self.assertIn(d["node"], self.nos)

    def test_cadeia(self):  # contracts/interpretar-midia.md §Cadeia
        self.assertEqual(self.destinos("Validar"), ["Pode baixar?"])
        self.assertEqual(self.destinos("Pode baixar?"), ["Tipo da midia", "Falha de entrada"])
        self.assertEqual(self.destinos("Tipo da midia"), ["Baixar", "Baixar imagem", "Falha de entrada"])
        self.assertEqual(self.destinos("Baixar"), ["Conferir"])
        self.assertEqual(self.destinos("Conferir"), ["Audio ok?"])
        self.assertEqual(self.destinos("Audio ok?"), ["Transcrever", "Falha de entrada"])
        self.assertEqual(self.destinos("Baixar imagem"), ["Imagem baixada?"])
        self.assertEqual(self.destinos("Imagem baixada?"), ["Descrever", "Falha de entrada"])
        self.assertEqual(self.destinos("Juntar"), ["Gravar"])
        self.assertEqual(self.destinos("Gravar"), ["Registrar falhas"])
        self.assertEqual(self.destinos("Registrar falhas"), ["Resumo"])

    def test_baixar_sem_credencial_sem_redirecionamento_com_timeout(self):
        b = self.nos["Baixar"]
        self.assertNotIn("credentials", b)
        self.assertEqual(b["parameters"]["authentication"], "none")
        self.assertEqual(b["parameters"]["options"]["redirect"]["redirect"]["maxRedirects"], 0)
        self.assertIn("midia.download_timeout_s", b["parameters"]["options"]["timeout"])
        self.assertNotIn("maxContentLength", self.texto)  # tarefa 2.4: o HTTP Request nao tem teto de bytes

    def test_imagem_baixada_em_code_sem_binario_n8n(self):  # block-005: binario n8n fica em disco
        b = self.nos["Baixar imagem"]
        self.assertEqual(b["type"], "n8n-nodes-base.code")
        j = b["parameters"]["jsCode"]
        for t in ("encoding: 'arraybuffer'", "disableFollowRedirect: true", "midia.download_timeout_s", "imagem_max_mb", "content-type", "mimes_imagem"):
            self.assertIn(t, j)
        self.assertNotIn("binary", j)
        self.assertNotIn("getBinaryDataBuffer", self.nos["Imagem baixada?"]["parameters"].__str__())
        # o unico HTTP de download (binario) e o do audio
        self.assertEqual(self.nos["Baixar"]["parameters"]["options"]["response"]["response"]["responseFormat"], "file")
        self.assertNotIn("input_image", self.nos["Conferir"]["parameters"]["jsCode"])
        self.assertIn("corpo_imagem", j)

    def test_nos_de_rede_continuam_em_erro_e_openai_usa_credencial_predefinida(self):
        for nome in ("Baixar", "Transcrever", "Descrever"):
            self.assertEqual(self.nos[nome]["onError"], "continueRegularOutput")
        for nome in ("Transcrever", "Descrever"):
            n = self.nos[nome]
            self.assertEqual(n["parameters"]["nodeCredentialType"], "openAiApi")
            self.assertIn("openAiApi", n["credentials"])
            self.assertIn("midia.openai_timeout_s", n["parameters"]["options"]["timeout"])
        self.assertTrue(self.nos["Descrever"]["parameters"]["url"].endswith("/v1/responses"))

    def test_settings_sem_retencao_de_execucao(self):
        s = self.wf["settings"]
        self.assertEqual((s["saveDataSuccessExecution"], s["saveDataErrorExecution"], s["saveManualExecutions"]), ("none", "none", False))
        self.assertEqual(s["executionTimeout"], "{{BV:NUM:midia.execucao_timeout_s}}")
        self.assertNotIn("errorWorkflow", s)

    def test_gravacao_parametrizada_e_sem_conteudo_em_falhas(self):
        g = self.nos["Gravar"]["parameters"]
        self.assertRegex(g["query"], r"conteudo_derivado = \$2.*midia_falha = \$3.*WHERE id = \$1")
        self.assertNotIn("{{", g["query"])
        f = self.nos["Registrar falhas"]["parameters"]
        self.assertNotIn("midia_url", f["query"] + f["options"]["queryReplacement"])
        self.assertNotIn("texto", f["options"]["queryReplacement"])

    def test_nenhum_log_de_conteudo(self):
        self.assertNotRegex(self.texto, r"console\.|\$execution\.customData|\$workflow\.staticData")

    def test_toda_chave_midia_do_workflow_e_do_contrato(self):
        with open(os.path.join(RAIZ, "docs/specs/audio-imagem/contracts/config-midia.md"), encoding="utf-8") as f:
            contrato = f.read()
        for k in set(re.findall(r"\{\{BV:(?:NUM:)?(midia\.[a-z_]+)\}\}", self.texto)):
            self.assertIn("`%s`" % k, contrato)



class RetencaoVigia(unittest.TestCase):
    """6.1.3: retencao de midia no bv-vigia (FR-009)."""

    @classmethod
    def setUpClass(cls):
        with open(os.path.join(RAIZ, "workflows/bv-vigia.json"), encoding="utf-8") as f:
            cls.wf = json.load(f)
        cls.no = {n["name"]: n for n in cls.wf["nodes"]}["Reter midia"]

    def test_gatilho_dispara_a_retencao(self):
        self.assertIn("Reter midia", [d["node"] for d in self.wf["connections"]["A cada 5 minutos"]["main"][0]])

    def test_query_parametrizada_e_idempotente(self):
        q = self.no["parameters"]["query"]
        self.assertIn("{{BV:midia.retencao_h}}", self.no["parameters"]["options"]["queryReplacement"])
        self.assertIn("$1::float8", q)
        self.assertNotIn("midia.retencao_h", q)  # valor entra so como parametro
        self.assertIn("tipo IN ('audio','imagem','outro')", q)
        for c in ("midia_url = NULL", "midia_mime = NULL", "conteudo = NULL", "conteudo_derivado = NULL"):
            self.assertIn(c, q)
        self.assertIn("'sha256:' || encode(sha256(convert_to(mensagem_id_canal || ':' || id, 'UTF8')), 'hex')", q)
        # 2a rodada: a linha ja expurgada tem sha256: no canal e sai do filtro => 0 linhas
        self.assertIn("mensagem_id_canal NOT LIKE 'sha256:%'", q)
        self.assertTrue(self.no["alwaysOutputData"])
        self.assertIn("RETURNING id", q)  # so o id; nenhum conteudo volta para a execucao


if __name__ == "__main__":
    unittest.main()
