import os, sys, unittest
from unittest import mock
sys.path.insert(0, "scripts")
import _vps


class Vps(unittest.TestCase):
    def test_banco_fora_da_lista_recusado(self):
        for b in ("n8n", "barbearia_vila", "goldincision_teste"):
            with self.assertRaises(_vps.Recusado):
                _vps.cmd_psql(b)

    def test_prod_so_com_trava(self):
        with mock.patch.dict(os.environ, {"BV_DEPLOY_PRODUCAO_AUTORIZADO": "sim"}):
            self.assertIn("PG_PASSWORD", _vps.cmd_psql("barbearia_vila"))

    def test_redis_db_e_verbos(self):
        for db, args in ((0, ["DBSIZE"]), (1, ["DBSIZE"]), (2, ["FLUSHDB"]), (2, ["FLUSHALL"]),
                         (2, ["SET", "bv:prod:x", "1"]), (2, ["DEL", "bv:teste:verif:a", "alheia"])):
            with self.assertRaises(_vps.Recusado):
                _vps.cmd_redis(db, args)
        self.assertIn("DBSIZE", _vps.cmd_redis(2, ["DBSIZE"]))
        self.assertIn("SET", _vps.cmd_redis(2, ["SET", "bv:teste:verif:a", "1"]))

    def test_sonda_fora_da_lista(self):
        with self.assertRaises(_vps.Recusado):
            _vps.cmd_sondar("rm-rf")

    def test_senha_nunca_na_linha_de_comando(self):
        self.assertNotIn("Garantia", _vps.cmd_redis(2, ["DBSIZE"]))

    def test_exit_codes(self):
        self.assertEqual(_vps.main(["flush"]), 2)
        self.assertEqual(_vps.main(["redis", "0", "DBSIZE"]), 2)
        with mock.patch.object(_vps, "_ssh", return_value=(0, "5\n", "")):
            self.assertEqual(_vps.main(["redis", "2", "DBSIZE"]), 0)
        with mock.patch.object(_vps, "_ssh", return_value=(1, "", "password=abc erro")):
            self.assertEqual(_vps.main(["redis", "2", "DBSIZE"]), 1)

    def test_scrub(self):
        self.assertNotIn("abc", _vps._scrub("PGPASSWORD=abc"))


if __name__ == "__main__":
    unittest.main()
