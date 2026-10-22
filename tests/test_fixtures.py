import glob, json, re, unittest

ARQ = sorted(glob.glob("tests/fixtures/chatmaster/*.json"))


class Fixtures(unittest.TestCase):
    def test_existem_e_tem_estrutura(self):
        self.assertGreaterEqual(len(ARQ), 1)
        for f in ARQ:
            b = json.load(open(f, encoding="utf-8"))["body"]
            self.assertIn("acao", b, f)
            self.assertIn("chamadoId", b, f)

    def test_sem_telefone_nome_ou_segredo(self):
        for f in ARQ:
            t = open(f, encoding="utf-8").read()
            self.assertIsNone(re.search(r"\d{10,}|@s\.whatsapp|Paulo", t), f)
            self.assertNotRegex(t, r"\.env|Bearer ", f)

    def test_datajson_sem_pii(self):
        # dataJson e uma string JSON aninhada: varre o conteudo interno tambem
        for f in ARQ:
            dj = json.load(open(f, encoding="utf-8"))["body"].get("mensagem")
            dj = dj.get("dataJson") if isinstance(dj, dict) else None
            if dj:
                self.assertIsNone(re.search(r"\d{10,}|@lid|@s\.whatsapp|Paulo", dj), f)

    def test_acao_das_fixtures_restauradas(self):
        for n, a in ((22, "start"), (24, "closed")):
            self.assertEqual(json.load(open(f"tests/fixtures/chatmaster/evento-{n}.json"))["body"]["acao"], a)


if __name__ == "__main__":
    unittest.main()
