import importlib.util
import io
import os
import tempfile
import unittest
from contextlib import redirect_stdout, redirect_stderr

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
spec = importlib.util.spec_from_file_location("cc", os.path.join(RAIZ, "scripts", "criar-credenciais-n8n.py"))
cc = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cc)

SEGREDO_PG, SEGREDO_RD, SEGREDO_TK = "pgSEGREDO123", "rdSEGREDO456", "tkSEGREDO789"


class Http:
    def __init__(self, existentes=()):
        self.existentes, self.posts = list(existentes), []

    def __call__(self, env, metodo, caminho, corpo=None):
        if metodo == "GET":
            return {"data": [{"name": n, "id": f"x{i}"} for i, n in enumerate(self.existentes)]}
        self.posts.append(corpo)
        return {"id": f"id{len(self.posts)}"}


def rodar(argv, http, env_antes=None):
    with tempfile.NamedTemporaryFile("w", suffix=".env", delete=False) as f:
        f.write("N8N_API_URL=http://x\nN8N_API_KEY=k\n")
    os.environ["BV_ENV_N8N"] = f.name
    out, err = io.StringIO(), io.StringIO()
    try:
        with redirect_stdout(out), redirect_stderr(err):
            rc = cc.main(argv, http, lambda alvo: (SEGREDO_PG, SEGREDO_RD, SEGREDO_TK))
    finally:
        os.unlink(f.name)
        os.environ.pop("BV_ENV_N8N", None)
    return rc, out.getvalue(), err.getvalue()


class T(unittest.TestCase):
    def setUp(self):
        os.environ.pop("BV_DEPLOY_PRODUCAO_AUTORIZADO", None)

    def test_cria_e_nao_vaza_segredo(self):
        h = Http()
        rc, out, err = rodar(["--alvo", "teste"], h)
        self.assertEqual(rc, 0)
        self.assertEqual(len(h.posts), 3)
        for s in (SEGREDO_PG, SEGREDO_RD, SEGREDO_TK):
            self.assertNotIn(s, out + err)
        self.assertIn("Barbearia Vila Postgres TESTE -> id1", out)

    def test_nome_existente_pulado(self):
        h = Http(["Barbearia Vila Postgres TESTE"])
        rc, out, _ = rodar(["--alvo", "teste"], h)
        self.assertEqual(rc, 0)
        self.assertEqual([p["name"] for p in h.posts], ["Barbearia Vila Redis", "Barbearia Vila Verificacao"])
        self.assertIn("pulada", out)

    def test_producao_sem_trava_recusada(self):
        h = Http()
        rc, _, err = rodar(["--alvo", "producao"], h)
        self.assertEqual(rc, 2)
        self.assertEqual(h.posts, [])
        self.assertIn("BV_DEPLOY_PRODUCAO_AUTORIZADO", err)


if __name__ == "__main__":
    unittest.main()
