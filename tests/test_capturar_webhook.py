import importlib.util
import io
import json
import os
import tempfile
import unittest
from contextlib import redirect_stderr, redirect_stdout

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
spec = importlib.util.spec_from_file_location("cap", os.path.join(RAIZ, "scripts", "capturar-webhook.py"))
cap = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cap)

CFG = {"n8n_url": "https://n8n.exemplo", "captura": {"path": "bv-captura-x"}, "workflows": {"bv-captura": "w1"}}
CAPT = "https://n8n.exemplo/webhook/bv-captura-x"


class FakeCm:
    def __init__(self, url):
        self.url, self.chamadas = url, []

    def __call__(self, m, r, c=None):
        self.chamadas.append((m, r))
        if r == "/api/whatsapp/update":
            self.url = c["webhook"]
            return {}
        return {"whatsapps": [{"id": 1, "webhook": "outra"}, {"id": 145, "webhook": self.url}]}


class T(unittest.TestCase):
    def setUp(self):
        self.d = tempfile.mkdtemp()
        os.makedirs(f"{self.d}/config/ambientes")
        json.dump(CFG, open(f"{self.d}/config/ambientes/integracao.json", "w"))

    def run_main(self, passo, cm, *extra):
        o, e = io.StringIO(), io.StringIO()
        with redirect_stdout(o), redirect_stderr(e):
            rc = cap.main([passo, *extra], raiz=self.d, cm=cm)
        return rc, o.getvalue(), e.getvalue()

    def test_recusa_producao(self):
        cm = FakeCm("orig")
        rc, _, err = self.run_main("trocar", cm, "--ambiente", "producao")
        self.assertEqual(rc, 2)
        self.assertEqual(cm.chamadas, [])

    def test_anotar_nao_sobrescreve(self):
        cm = FakeCm("orig")
        self.assertEqual(self.run_main("anotar", cm)[0], 0)
        cm.url = CAPT  # apos trocar, anotar de novo nao pode perder a original
        self.assertEqual(self.run_main("anotar", cm)[0], 0)
        self.assertEqual(open(f"{self.d}/.captura-145.url").read().strip(), "orig")
        self.assertEqual(oct(os.stat(f"{self.d}/.captura-145.url").st_mode & 0o777), "0o600")

    def test_trocar_sem_anotar_recusa(self):
        cm = FakeCm("orig")
        rc, _, _ = self.run_main("trocar", cm)
        self.assertEqual(rc, 1)
        self.assertNotIn(("POST", "/api/whatsapp/update"), cm.chamadas)

    def test_restaurar_idempotente(self):
        cm = FakeCm("orig")
        self.run_main("anotar", cm)
        self.assertEqual(self.run_main("trocar", cm)[0], 0)
        self.assertEqual(cm.url, CAPT)
        for _ in range(2):
            self.assertEqual(self.run_main("restaurar", cm)[0], 0)
            self.assertEqual(cm.url, "orig")

    def test_sem_url_na_api_para(self):
        rc, _, err = self.run_main("anotar", FakeCm(None))
        self.assertEqual(rc, 1)
        self.assertIn("owner", err)

    def test_anonimizacao_preserva_tipos_e_remove_pii(self):
        evs = [{"acao": "start", "sender": "5511999998888", "token": "segredo", "n": 5, "ok": True, "l": ["a"]},
               {"acao": "start", "sender": "5511977776666", "token": "segredo", "n": 5, "ok": False, "l": ["b"]}]
        com = cap.valores_comuns(evs)
        a = cap.anonimizar(evs[0], com, tokens=("segredo",))
        self.assertEqual(a["acao"], "start")
        self.assertNotIn("5511999998888", json.dumps(a))
        self.assertEqual(a["token"], "TOKEN_ANONIMIZADO")
        self.assertEqual((a["n"], a["ok"], type(a["l"])), (5, True, list))


if __name__ == "__main__":
    unittest.main()
