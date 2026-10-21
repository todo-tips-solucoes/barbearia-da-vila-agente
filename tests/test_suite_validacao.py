import glob, json, os, re, sys, unittest
sys.path.insert(0, "scripts")

ROT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "roteiros")


def roteiros():
    return [json.load(open(p, encoding="utf-8")) for p in sorted(glob.glob(os.path.join(ROT, "r*.json")))]


class Roteiros(unittest.TestCase):
    def test_ids_unicos_r1_a_r17(self):
        self.assertEqual([r["id"] for r in roteiros()], [f"R{i}" for i in range(1, 18)])

    def test_criterios_validos(self):
        for r in roteiros():
            self.assertLessEqual(set(r["criterios"]), {f"K{i}" for i in range(1, 7)}, r["id"])

    def test_falas_sem_dado_pessoal(self):
        for r in roteiros():
            for f in r["falas"]:
                if isinstance(f, str):
                    self.assertIsNone(re.search(r"\d{8,}|\d{3}\.\d{3}\.\d{3}|@", f), (r["id"], f))

    def test_agenda_so_nos_sete_previstos(self):
        self.assertEqual({r["id"] for r in roteiros() if r["agenda"]}, {"R1", "R5", "R6", "R7", "R8", "R9", "R11"})

    def test_marcas_especiais(self):
        m = {r["id"]: r for r in roteiros()}
        self.assertEqual([m[i].get("preparo") for i in ("R7", "R8", "R9", "R10")], ["agendamento_previo"] * 3 + ["coleta_abandonada"])
        self.assertEqual(m["R16"]["delegado"], "smoke-mensagens:m2,m3,m7")
        self.assertEqual({r["id"] for r in m.values() if r["antes_da_c"]}, {"R15", "R17"})
        self.assertTrue(any("20%" in e for e in m["R2"]["expectativas"]))


if __name__ == "__main__":
    unittest.main()
