import contextlib, io, os, sys, tempfile, unittest
from unittest import mock
sys.path.insert(0, "scripts")
import _smoke


class SmokeComum(unittest.TestCase):
    def _env_em(self, d, conteudo):
        open(os.path.join(d, ".env.x"), "w").write(conteudo)

    def test_setdefault_nao_sobrescreve_e_nada_e_impresso(self):
        with tempfile.TemporaryDirectory() as d, mock.patch.object(_smoke, "RAIZ", d), \
                mock.patch.object(_smoke, "_raiz_principal", return_value=None), \
                mock.patch.dict(os.environ, {"SMK_A": "do-ambiente"}):
            self._env_em(d, "# c\nSMK_A=arquivo\nSMK_B=\"segredo-b\"\n")
            out = io.StringIO()
            with contextlib.redirect_stdout(out), contextlib.redirect_stderr(out):
                _smoke.carregar_env(".env.x", ".env.ausente")
            self.assertEqual(os.environ["SMK_A"], "do-ambiente")
            self.assertEqual(os.environ["SMK_B"], "segredo-b")
            self.assertEqual(out.getvalue(), "")
            os.environ.pop("SMK_B")

    def test_fallback_para_checkout_principal(self):
        with tempfile.TemporaryDirectory() as wt, tempfile.TemporaryDirectory() as principal, \
                mock.patch.object(_smoke, "RAIZ", wt), mock.patch.object(_smoke, "_raiz_principal", return_value=principal):
            self._env_em(principal, "SMK_C=so-no-principal\n")
            _smoke.carregar_env(".env.x")
            self.assertEqual(os.environ.pop("SMK_C"), "so-no-principal")

    def test_checar_acumula_falhas(self):
        f = []
        with contextlib.redirect_stdout(io.StringIO()):
            _smoke.checar(f, "a", True)
            _smoke.checar(f, "b", False, "x")
        self.assertEqual(f, ["b"])

    def test_tel(self):
        self.assertEqual(_smoke.tel("+5500000000", 7, 3), "+5500000000007")
        self.assertEqual(_smoke.tel("+55000000", 7, 4), "+550000000007")


if __name__ == "__main__":
    unittest.main()
