"""Feature producao: render de PROD sem [TESTE], TESTE identico ao de antes, crons e limpeza de 12 meses."""
import importlib.util
import json
import os
import subprocess
import unittest

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
spec = importlib.util.spec_from_file_location("dep", os.path.join(RAIZ, "scripts", "deploy-n8n.py"))
dep = importlib.util.module_from_spec(spec)
spec.loader.exec_module(dep)


def cfg(amb):
    return json.load(open(os.path.join(RAIZ, "config", "ambientes", f"{amb}.json"), encoding="utf-8"))


def render(arq, amb, texto=None):
    os.environ.setdefault("BV_WEBHOOK_TOKEN_SHA256", "x")
    texto = texto if texto is not None else open(os.path.join(RAIZ, "workflows", arq), encoding="utf-8").read()
    return json.loads(dep.renderizar(texto, cfg(amb), RAIZ))


class Rotulo(unittest.TestCase):  # 2.2
    ARQS = ("bv-vigia.json", "bv-verificacao.json")

    def test_prod_sem_teste_e_teste_identico_ao_anterior(self):
        for arq in self.ARQS:
            p, t = render(arq, "producao"), render(arq, "integracao")
            self.assertTrue(p["name"].endswith("[PROD]"), p["name"])
            self.assertNotIn("[TESTE]", json.dumps(p, ensure_ascii=False))
            self.assertTrue(t["name"].endswith("[TESTE]"), t["name"])
            # o TESTE renderiza igual ao arquivo de antes da parametrizacao (commit 00a0688, develop da #16)
            antigo = subprocess.run(["git", "-C", RAIZ, "show", f"00a0688:workflows/{arq}"], capture_output=True, text=True)
            if antigo.returncode == 0:
                self.assertEqual(t, render(arq, "integracao", antigo.stdout))

    def test_verificacao_com_path_e_webhook_distintos(self):
        p, t = cfg("producao")["verificacao"], cfg("integracao")["verificacao"]
        self.assertNotEqual(p["path"], t["path"])
        self.assertNotEqual(p["webhook_id"], t["webhook_id"])
        self.assertEqual(render("bv-verificacao.json", "producao")["nodes"][0]["parameters"]["path"], p["path"])


def vps(arq):
    return open(os.path.join(RAIZ, "config", "vps", arq), encoding="utf-8").read()


class Retencao(unittest.TestCase):  # 2.3
    def setUp(self):
        s = importlib.util.spec_from_file_location("lm", os.path.join(RAIZ, "scripts", "limpar-mensagens.py"))
        self.lm = importlib.util.module_from_spec(s)
        s.loader.exec_module(self.lm)

    def test_sql_so_apaga_mensagens_de_mais_de_12_meses(self):
        sql = self.lm.SQL
        self.assertIn("DELETE FROM mensagens WHERE criado_em < now() - interval '12 months'", sql)
        for t in ("contatos", "conversas", "propostas", "mensagens_agendadas"):
            self.assertNotIn(t, sql.replace("FROM mensagens", ""))

    def test_producao_exige_a_trava(self):
        os.environ.pop("BV_DEPLOY_PRODUCAO_AUTORIZADO", None)
        chamadas = []
        self.assertEqual(self.lm.main(["--alvo", "producao"], psql=lambda b, q: chamadas.append(b) or "0"), 2)
        self.assertEqual(chamadas, [])
        self.assertEqual(self.lm.main(["--alvo", "teste"], psql=lambda b, q: chamadas.append(b) or "3"), 0)
        self.assertEqual(chamadas, ["barbearia_vila_teste"])

    def test_cron_backup_antes_da_limpeza_com_14_dias(self):
        sh, cron = vps("barbearia-backup-limpeza.sh"), vps("barbearia-backup-limpeza.cron")
        self.assertIn(self.lm.SQL, sh)  # mesmo SQL do script local
        self.assertIn("set -eu", sh)  # backup falhou = sem limpeza
        self.assertLess(sh.index("pg_dump"), sh.index("DELETE FROM mensagens"))
        self.assertIn("tail -n +15", sh)  # mantem os 14 mais recentes
        linhas = [x for x in cron.splitlines() if x and not x.startswith("#")]
        self.assertEqual(len(linhas), 1)
        self.assertTrue(linhas[0].startswith("30 6 * * * root sh /root/barbearia_vila/barbearia-backup-limpeza.sh"))


class CronMidia(unittest.TestCase):  # 2.5
    def test_uma_linha_por_ambiente_com_o_id_do_config(self):
        linhas = [x for x in vps("barbearia-limpar-midia.cron").splitlines() if x and not x.startswith("#")]
        for amb in ("integracao", "producao"):
            wid = cfg(amb)["workflows_sub"]["interpretar_midia"]
            if not wid and amb == "producao":
                self.skipTest("producao: interpretar_midia sem id ate o deploy (tarefa 3.4)")
            self.assertEqual(sum(f"/workflows/{wid};" in x for x in linhas), 1, amb)


class Liberacao(unittest.TestCase):  # producao: so o owner ate o ok dele
    def codigo_normalizar(self, amb):
        n = next(x for x in render("bv-recepcao.json", amb)["nodes"] if x["name"] == "Normalizar")
        return n["parameters"]["jsCode"]

    def test_prod_so_o_owner_e_teste_todos(self):
        self.assertIn("liberados: ['5511967296849'] }", self.codigo_normalizar("producao"))
        self.assertIn("liberados: [] }", self.codigo_normalizar("integracao"))


class MensagensAtivo(unittest.TestCase):  # 2.7
    def test_bv_mensagens_nao_consulta_a_flag(self):
        # evidencia da 2.7: so recepcao e bv-graces leem mensagens.ativo; a varredura/reconciliacao do bv-mensagens nao.
        # Se um dia passar a ler, revisar a trava do deploy-n8n (bv-mensagens fora de PROD com ativo false).
        txt = open(os.path.join(RAIZ, "workflows", "bv-mensagens.json"), encoding="utf-8").read()
        self.assertNotIn("mensagens.ativo", txt)
        for arq in ("bv-recepcao.json", "sub/bv-graces.json"):
            self.assertIn("{{BV:mensagens.ativo}}", open(os.path.join(RAIZ, "workflows", arq), encoding="utf-8").read())


if __name__ == "__main__":
    unittest.main()
