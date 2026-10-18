import importlib.util
import os
import unittest

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def carregar(nome):
    s = importlib.util.spec_from_file_location(nome, os.path.join(RAIZ, "scripts", nome.replace("_", "-") + ".py"))
    m = importlib.util.module_from_spec(s)
    s.loader.exec_module(m)
    return m


vr, vs = carregar("verificar_repo"), carregar("varrer_segredos")


def cfg(prefixo, banco, db=2, **extra):
    return {"redis": {"prefixo": prefixo, "db": db}, "postgres": {"database": banco, "credencial_id": ""}, **extra}


OK = {"integracao": cfg("bv:teste:", "barbearia_vila_teste"), "producao": cfg("bv:prod:", "barbearia_vila")}


class T(unittest.TestCase):
    def test_config_valida(self):
        self.assertEqual(vr.verificar(OK, ""), [])

    def test_prefixo_nao_disjunto(self):
        c = {"integracao": cfg("bv:teste:", "barbearia_vila_teste"), "producao": cfg("bv:", "barbearia_vila")}
        self.assertTrue(any("disjuntos" in e for e in vr.verificar(c, "")))

    def test_prefixo_sem_dois_pontos_e_db_reservado(self):
        c = {"integracao": cfg("bv:teste", "barbearia_vila_teste", db=1)}
        e = " ".join(vr.verificar(c, ""))
        self.assertIn("terminar em ':'", e)
        self.assertIn("reservado", e)

    def test_banco_errado(self):
        self.assertTrue(vr.verificar({"integracao": cfg("bv:teste:", "barbearia_vila")}, ""))

    def test_id_fora_do_infra(self):
        c = {"integracao": cfg("bv:teste:", "barbearia_vila_teste", workflows={"w": "abc123"})}
        self.assertTrue(any("abc123" not in e and "ausente" in e for e in vr.verificar(c, "")))
        self.assertEqual(vr.verificar(c, "id abc123"), [])

    def test_chave_com_nome_de_segredo(self):
        c = {"integracao": cfg("bv:teste:", "barbearia_vila_teste", api_key="x")}
        self.assertTrue(any("segredo" in e for e in vr.verificar(c, "")))

    def test_segredo_plantado_detectado(self):
        import tempfile
        with tempfile.NamedTemporaryFile("w", suffix=".txt", delete=False) as f:
            f.write("ok\nPASSWORD=abcdefghijklmnopqrstuvwx\n")
        try:
            achados = vs.varrer([f.name])
        finally:
            os.unlink(f.name)
        self.assertEqual(len(achados), 1)
        self.assertTrue(achados[0].endswith(":2: possivel atribuicao de segredo"))
        self.assertNotIn("abcdefgh", achados[0])


if __name__ == "__main__":
    unittest.main()
