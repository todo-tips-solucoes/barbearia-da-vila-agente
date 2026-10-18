import importlib.util, os, sys, unittest
from unittest import mock
sys.path.insert(0, "scripts")
import _vps
sp = importlib.util.spec_from_file_location("limpar", "scripts/limpar-redis.py")
L = importlib.util.module_from_spec(sp); sp.loader.exec_module(L)


class Fake:
    def __init__(self, chaves):
        self.chaves, self.dels, self.verbos = list(chaves), [], []

    def __call__(self, db, *a):
        self.verbos.append(a[0])
        if a[0] == "SCAN":
            pre = a[3].rstrip("*")
            return "0\n" + "\n".join(k for k in self.chaves if k.startswith(pre)) + "\n"
        self.dels += a[1:]
        return "ok"


class Limpar(unittest.TestCase):
    def test_prefixos_disjuntos(self):
        t, p = L.carregar("teste")["prefixo"], L.carregar("producao")["prefixo"]
        self.assertFalse(t.startswith(p) or p.startswith(t))

    def test_teste_nao_toca_prod_nem_alheias(self):
        f = Fake(["bv:teste:a", "bv:teste:b", "bv:prod:a", "gold:x"])
        self.assertEqual(L.limpar("bv:teste:", 2, "", f), 2)
        self.assertEqual(sorted(f.dels), ["bv:teste:a", "bv:teste:b"])

    def test_sem_flush(self):
        f = Fake(["bv:teste:a"]); L.limpar("bv:teste:", 2, "", f)
        self.assertTrue(set(f.verbos) <= {"SCAN", "DEL"})
        for v in ("FLUSHDB", "FLUSHALL"):
            with self.assertRaises(_vps.Recusado):
                _vps.cmd_redis(2, [v])

    def test_del_de_prod_exige_trava_e_alheia_recusada(self):
        with mock.patch.dict(os.environ, {"BV_DEPLOY_PRODUCAO_AUTORIZADO": ""}):
            with self.assertRaises(_vps.Recusado):
                _vps.cmd_redis(2, ["DEL", "bv:prod:a"])
        with self.assertRaises(_vps.Recusado):
            _vps.cmd_redis(2, ["DEL", "bv:teste:a", "gold:x"])

    def test_producao_sem_trava_recusada_sem_chamada(self):
        f = Fake([])
        with mock.patch.dict(os.environ, {"BV_DEPLOY_PRODUCAO_AUTORIZADO": ""}):
            self.assertEqual(L.main(["--alvo", "producao"], f), 2)
        self.assertEqual(f.verbos, [])


if __name__ == "__main__":
    unittest.main()
