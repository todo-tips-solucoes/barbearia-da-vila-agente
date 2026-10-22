import importlib.util
import io
import os
import unittest
from contextlib import redirect_stderr, redirect_stdout

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
spec = importlib.util.spec_from_file_location("bk", os.path.join(RAIZ, "scripts", "backup-bancos.py"))
bk = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bk)


class T(unittest.TestCase):
    def setUp(self):
        os.environ.pop("BV_DEPLOY_PRODUCAO_AUTORIZADO", None)
        self.cmds = []

    def ssh(self, remoto, stdin=None):
        self.cmds.append(remoto)
        return 0, "/root/barbearia_vila/backups/bv-barbearia_vila_teste-T.dump\n", ""

    def rodar(self, argv):
        out, err = io.StringIO(), io.StringIO()
        with redirect_stdout(out), redirect_stderr(err):
            try:
                rc = bk.main(argv, self.ssh, "T")
            except SystemExit as e:
                rc = e.code
        return rc, out.getvalue(), err.getvalue()

    def test_rotacao_so_do_proprio_padrao(self):
        c = bk.cmd_backup("teste", 3, "T")
        self.assertIn("ls -1t /root/barbearia_vila/backups/bv-barbearia_vila_teste-*.dump | tail -n +4", c)
        self.assertNotIn("rm -rf", c)
        self.assertNotIn("barbearia_vila-*", c.replace("barbearia_vila_teste-*", ""))

    def test_retencao_obrigatoria(self):
        self.assertEqual(self.rodar(["--alvo", "teste"])[0], 2)
        self.assertEqual(self.rodar(["--alvo", "teste", "--retencao", "0"])[0], 2)
        self.assertEqual(self.cmds, [])

    def test_producao_sem_trava_recusada_inclusive_em_todos(self):
        for alvo in ("producao", "todos"):
            self.assertEqual(self.rodar(["--alvo", alvo, "--retencao", "3"])[0], 2)
        self.assertEqual(self.cmds, [])

    def test_teste_e_validacao(self):
        rc, out, _ = self.rodar(["--alvo", "teste", "--retencao", "3", "--validar"])
        self.assertEqual(rc, 0)
        self.assertEqual(len(self.cmds), 2)
        self.assertIn("pg_restore --list", self.cmds[1])

    def test_restaurar_teste_em_banco_descartavel(self):
        rc, out, _ = self.rodar(["--alvo", "teste", "--retencao", "3", "--restaurar-teste"])
        self.assertEqual(rc, 0)
        c = self.cmds[1]
        self.assertIn("CREATE DATABASE barbearia_vila_teste_restore OWNER barbearia_vila_teste", c)
        self.assertIn("trap limpa EXIT", c)  # DROP do descartavel mesmo em erro, sem expandir nada no host
        self.assertNotIn('trap "', c)
        self.assertIn("DROP DATABASE IF EXISTS barbearia_vila_teste_restore", c)
        self.assertIn("-d barbearia_vila_teste_restore", c)
        self.assertNotIn("-d barbearia_vila_teste ", c)  # nunca escreve no banco real
        self.assertEqual(c.count("12 months"), 2)  # limpeza rodada duas vezes (idempotencia)
        with self.assertRaises(bk._vps.Recusado):
            bk.cmd_restaurar_teste("teste", "/etc/passwd")

    def test_validar_recusa_caminho_alheio(self):
        with self.assertRaises(bk._vps.Recusado):
            bk.cmd_validar("/etc/passwd")


if __name__ == "__main__":
    unittest.main()
