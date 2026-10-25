import importlib.util, os, sys, unittest
from unittest import mock
sys.path.insert(0, "scripts")
_s = importlib.util.spec_from_file_location("janela_prod", "scripts/janela-prod.py")
jp = importlib.util.module_from_spec(_s)
_s.loader.exec_module(jp)


class JanelaProd(unittest.TestCase):
    def test_sem_trava_recusa_antes_de_qualquer_chamada(self):
        with mock.patch.dict(os.environ, {"BV_DEPLOY_PRODUCAO_AUTORIZADO": ""}), \
                mock.patch.object(jp, "gatilhos") as g, mock.patch.object(jp, "dump_origem") as d:
            for argv in (["desligar-origem"], ["dump-origem"], ["restaurar", "x.dump"]):
                self.assertEqual(jp.main(argv), 2)
        g.assert_not_called(), d.assert_not_called()

    def test_so_os_tres_gatilhos_da_barbearia(self):
        self.assertEqual(sorted(jp.GATILHOS.values()), ["alerta", "recepcao", "vigia"])
        chamadas = []
        with mock.patch.object(jp, "chave_origem", return_value="k"), \
                mock.patch.object(jp, "n8n", side_effect=lambda c, m, r: chamadas.append((m, r)) or {"active": False}):
            jp.gatilhos(False)
        self.assertEqual({r.split("/")[2] for _, r in chamadas}, set(jp.GATILHOS))

    def test_restore_recusa_banco_com_tabelas(self):
        with mock.patch.object(jp, "listar", return_value=12), mock.patch.object(jp, "psql", return_value="12"), \
                mock.patch.object(jp.subprocess, "run") as run, self.assertRaises(jp.Falha):
            jp.restaurar("x.dump")
        run.assert_not_called()


if __name__ == "__main__":
    unittest.main()
