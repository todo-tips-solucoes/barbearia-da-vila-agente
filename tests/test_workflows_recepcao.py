import json, os, re, unittest

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def carregar(rel):
    with open(os.path.join(RAIZ, "workflows", rel), encoding="utf-8") as f:
        texto = f.read()
    return texto, json.loads(texto)


class WorkflowRecepcao(unittest.TestCase):
    def test_conexoes_referenciam_nos_existentes(self):
        for rel in ("bv-recepcao.json", "sub/entregar-rajada.json"):
            _, wf = carregar(rel)
            nomes = {n["name"] for n in wf["nodes"]}
            for origem, c in wf["connections"].items():
                self.assertIn(origem, nomes)
                for saida in c["main"]:
                    for d in saida:
                        self.assertIn(d["node"], nomes, rel)

    def test_sem_segredo_nem_log_de_conteudo(self):
        texto, _ = carregar("bv-recepcao.json")
        self.assertNotIn("console.log", texto)
        self.assertNotRegex(texto, r"[0-9a-f]{64}")  # so placeholder, nunca o hash/token
        self.assertIn("{{BV:TOKEN_SHA256}}", texto)
        self.assertEqual(json.loads(texto)["settings"]["saveDataSuccessExecution"], "none")

    def test_chaves_redis_usam_prefixo_do_ambiente(self):
        _, wf = carregar("bv-recepcao.json")
        for n in wf["nodes"]:
            if n["type"] == "n8n-nodes-base.redis":
                self.assertIn("{{BV:redis.prefixo}}", n["parameters"]["key"])
                self.assertNotIn("telefone", n["parameters"]["key"])

    def test_stub_segue_contrato_de_entrega(self):
        texto, wf = carregar("sub/entregar-rajada.json")
        tipos = {n["type"] for n in wf["nodes"]}
        self.assertIn("n8n-nodes-base.executeWorkflowTrigger", tipos)
        self.assertIn("{{BV:teste.atraso_entrega_s}}", texto)
        self.assertIn("__falha__", texto)
        self.assertIn("{ ok, turno_id", texto)

    def test_chamada_ao_sub_marca_e_desmarca_turno(self):
        _, wf = carregar("bv-recepcao.json")
        q = {n["name"]: n["parameters"].get("query", "") for n in wf["nodes"]}
        self.assertIn("processada_em = now()", q["Marcar processada"])
        self.assertIn("turno_id = NULL", q["Desmarcar turno"])
        self.assertIn("ON CONFLICT (mensagem_id_canal) DO NOTHING", q["Inserir mensagem"])
        self.assertIn("{{BV:workflows_sub.entregar_rajada}}", json.dumps(wf))

    def _grafo(self):
        _, wf = carregar("bv-recepcao.json")
        n = {x["name"]: x for x in wf["nodes"]}
        return n, {o: [[d["node"] for d in s] for s in c["main"]] for o, c in wf["connections"].items()}

    def test_posse_so_liberada_pelo_dono(self):  # FR-012 / CA-5
        n, g = self._grafo()
        for nome in ("Marcar processada", "Desmarcar turno"):
            self.assertIn("count(*)", n[nome]["parameters"]["query"])
        self.assertEqual(g["Marcar processada"], [["Dono apos entrega?"]])
        self.assertEqual(g["Dono apos entrega?"], [["Liberar posse"], ["Fim"]])
        self.assertEqual(g["Dono apos falha?"], [["Liberar posse apos falha"], ["Falha da entrega"]])
        self.assertEqual(g["Turno vazio?"][0], ["Ainda dono vazio?"])
        self.assertEqual(g["Ainda dono vazio?"], [["Liberar posse turno vazio"], ["Fim"]])
        # nenhum DEL de posse e alcancavel sem passar por um teste de dono
        for d in ("Liberar posse", "Liberar posse apos falha", "Liberar posse turno vazio"):
            pais = [o for o, s in g.items() if any(d in x for x in s)]
            self.assertTrue(pais and all(p.startswith(("Dono", "Ainda dono")) for p in pais), (d, pais))

    def test_falhas_registradas_sem_pii(self):  # FR-025 / FR-007
        n, g = self._grafo()
        self.assertEqual(g["Responder 400"], [["Registrar falha payload"]])
        self.assertEqual(g["Registrar falha Redis"], [["Fim Redis indisponivel"]])
        self.assertEqual(g["Desmarcar turno"], [["Registrar falha entrega"]])
        for o, s in g.items():
            if o != "Registrar falha Redis":
                self.assertFalse(any("Fim Redis indisponivel" in x for x in s), o)
        for nome in ("Registrar falha Redis", "Registrar falha payload", "Registrar falha entrega"):
            p = n[nome]["parameters"]
            self.assertIn("INSERT INTO falhas_recepcao", p["query"])
            blob = json.dumps(p).lower()
            for proibido in ("telefone", "conteudo", "token", "midia"):
                self.assertNotIn(proibido, blob, nome)
            self.assertEqual(n[nome]["onError"], "continueRegularOutput")  # log nunca derruba o fluxo

    def test_resposta_so_depois_de_gravar(self):  # FR-001..FR-004
        n, g = self._grafo()
        self.assertEqual(g["Roteador"][3], ["Upsert contato"])
        self.assertEqual(g["Upsert contato"], [["Inserir mensagem"], ["Registrar falha contato"]])
        self.assertEqual(g["Inserir mensagem"], [["Gravada?"], ["Registrar falha mensagem"]])
        self.assertEqual(g["Gravada?"], [["Responder 200 aceita"], ["Responder 200 descartada"]])
        self.assertEqual(g["Registrar falha contato"], [["Responder 500"]])
        self.assertEqual(g["Registrar falha mensagem"], [["Responder 500"]])
        # unico caminho ate o 200 de aceita passa por Gravada?
        pais = [o for o, s in g.items() if any("Responder 200 aceita" in x for x in s)]
        self.assertEqual(pais, ["Gravada?"])
        for nome in ("Upsert contato", "Inserir mensagem"):
            self.assertEqual(n[nome]["onError"], "continueErrorOutput")
        # sem alwaysOutputData: ele joga item vazio na saida 0 mesmo com erro, e o erro viraria "descartada"
        self.assertNotIn("alwaysOutputData", n["Inserir mensagem"])
        self.assertIn("SELECT (SELECT id FROM ins) AS id, $1::bigint AS contato_id", n["Inserir mensagem"]["parameters"]["query"])
        self.assertEqual(n["Responder 500"]["parameters"]["options"]["responseCode"], 500)
        for nome, motivo in (("Registrar falha contato", "contato_falhou"), ("Registrar falha mensagem", "mensagem_falhou")):
            self.assertEqual(n[nome]["onError"], "continueRegularOutput")  # FR-004
            p = n[nome]["parameters"]
            self.assertIn(f"'gravacao', '{motivo}'", p["query"])
            blob = json.dumps(p).lower()
            for proibido in ("telefone", "conteudo", "token", "midia", "error"):
                self.assertNotIn(proibido, blob, nome)

    def test_dedupe_por_conteudo_no_mesmo_statement(self):  # FR-010..FR-012
        n, g = self._grafo()
        q = n["Inserir mensagem"]["parameters"]["query"]
        self.assertIn("ON CONFLICT (contato_id, hash_conteudo) DO UPDATE SET visto_em = now()", q)
        self.assertIn("sha256(convert_to($4::text, 'UTF8'))", q)
        self.assertIn("$2::text IS NULL AND $3::text = 'texto'", q)  # so texto sem id gera marca
        self.assertIn("$3::text <> 'texto' OR $2::text IS NOT NULL OR EXISTS (SELECT 1 FROM marca)", q)  # midia e id fora
        self.assertNotIn("||", q)  # sem concatenacao
        r = n["Inserir mensagem"]["parameters"]["options"]["queryReplacement"]
        self.assertIn("{{BV:dedup.conteudo_janela_s}}", r)
        self.assertEqual(g["Responder 200 aceita"], [["Limpar marcas"]])
        self.assertEqual(g["Limpar marcas"], [["Marcar ultima"]])
        self.assertEqual(n["Limpar marcas"]["onError"], "continueRegularOutput")
        self.assertIn("DELETE FROM marcas_conteudo", n["Limpar marcas"]["parameters"]["query"])

    def test_tempo_maximo_da_execucao_parametrizado(self):  # FR-006 / dec-020
        texto, wf = carregar("bv-recepcao.json")
        self.assertEqual(wf["settings"]["executionTimeout"], "{{BV:NUM:execucao.timeout_s}}")
        self.assertNotIn("redis-op", texto)
        for n in wf["nodes"]:
            if n["type"] == "n8n-nodes-base.redis" and n["name"].startswith(("Marcar", "Ler", "Tomar")):
                self.assertEqual(n["onError"], "continueErrorOutput", n["name"])
        for a in ("integracao", "producao"):
            cfg = json.load(open(os.path.join(RAIZ, "config", "ambientes", a + ".json"), encoding="utf-8"))
            self.assertIsInstance(cfg["execucao"]["timeout_s"], int)
            self.assertGreater(cfg["execucao"]["timeout_s"], cfg["buffer"]["teto_s"] + cfg["lock"]["espera_s"] * cfg["lock"]["tentativas"] + cfg["buffer"]["janela_s"])
            self.assertEqual(cfg["dedup"]["conteudo_janela_s"], 10)


if __name__ == "__main__":
    unittest.main()
