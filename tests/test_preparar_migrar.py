import hashlib, importlib.util, os, sys, tempfile, unittest
from unittest import mock
sys.path.insert(0, "scripts")
import _vps


def _carrega(nome, arq):
    spec = importlib.util.spec_from_file_location(nome, f"scripts/{arq}")
    m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m); return m


class Preparar(unittest.TestCase):
    def setUp(self):
        self.pb = _carrega("preparar_bancos", "preparar-bancos.py")

    def test_prod_sem_trava_exit2_sem_chamada_remota(self):
        with mock.patch.dict(os.environ, {}, clear=True), mock.patch.object(_vps, "_ssh") as ssh:
            self.assertEqual(self.pb.main(["--alvo", "producao"]), 2)
            ssh.assert_not_called()

    def test_idempotencia_segunda_execucao_zero_alteracoes(self):
        pri = "credencial=gerada\nprevio role=false db=false publico_conecta=false"
        seg = "credencial=mantida\nprevio role=true db=true publico_conecta=false"
        with mock.patch.object(_vps, "_ssh", side_effect=[(0, pri, ""), (0, seg, "")]):
            self.assertEqual(_vps.preparar("teste")[0], 3)
            self.assertEqual(_vps.preparar("teste")[0], 0)

    def test_script_nao_troca_senha_e_fecha_connect(self):
        c = _vps.cmd_preparar("teste")
        self.assertNotIn("ALTER ROLE", c)
        self.assertIn("REVOKE CONNECT ON DATABASE barbearia_vila_teste FROM PUBLIC", c)
        self.assertIn("grep -q '^PG_TESTE_PASSWORD='", c)

    def test_acesso_cruzado_destino_fora_da_lista(self):
        with self.assertRaises(_vps.Recusado):
            _vps.cmd_acesso_cruzado("teste", "postgres")


class Migrar(unittest.TestCase):
    def setUp(self):
        self.m = _carrega("migrar", "migrar.py")
        self.d = tempfile.TemporaryDirectory()
        sql = "CREATE TABLE x (i int);"
        open(os.path.join(self.d.name, "0001_a.sql"), "w").write(sql)
        self.h = hashlib.sha256(sql.encode()).hexdigest()

    def run_m(self, aplicadas, args=("--alvo", "teste")):
        escritas = []
        def psql(b, sql):
            if sql.startswith("BEGIN"):
                escritas.append(sql)
            return ("t" if aplicadas else "f") if "to_regclass" in sql else aplicadas
        rc = self.m.main(list(args), psql=psql, pasta=self.d.name)
        return rc, escritas

    def test_aplica_e_reaplicacao_sem_efeito(self):
        rc, esc = self.run_m("")
        self.assertEqual((rc, len(esc)), (0, 1))
        self.assertEqual(self.run_m(f"0001|{self.h}"), (0, []))

    def test_hash_divergente_falha(self):
        self.assertEqual(self.run_m("0001|deadbeef"), (1, []))

    def test_dry_run_sem_escrita(self):
        self.assertEqual(self.run_m("", ("--alvo", "teste", "--dry-run")), (0, []))

    def test_prod_sem_trava_recusado(self):
        with mock.patch.dict(os.environ, {}, clear=True):
            self.assertEqual(self.run_m("", ("--alvo", "producao")), (2, []))


if __name__ == "__main__":
    unittest.main()
