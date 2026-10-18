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
        self.assertIn("ok: true", texto)

    def test_chamada_ao_sub_marca_e_desmarca_turno(self):
        _, wf = carregar("bv-recepcao.json")
        q = {n["name"]: n["parameters"].get("query", "") for n in wf["nodes"]}
        self.assertIn("processada_em = now()", q["Marcar processada"])
        self.assertIn("turno_id = NULL", q["Desmarcar turno"])
        self.assertIn("ON CONFLICT (mensagem_id_canal) DO NOTHING", q["Inserir mensagem"])
        self.assertIn("{{BV:workflows_sub.entregar_rajada}}", json.dumps(wf))


if __name__ == "__main__":
    unittest.main()
