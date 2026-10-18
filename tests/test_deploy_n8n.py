import importlib.util
import io
import json
import os
import shutil
import tempfile
import unittest
from contextlib import redirect_stderr, redirect_stdout

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
spec = importlib.util.spec_from_file_location("dep", os.path.join(RAIZ, "scripts", "deploy-n8n.py"))
dep = importlib.util.module_from_spec(spec)
spec.loader.exec_module(dep)

WF = {"name": "BV Verificacao", "nodes": [], "connections": {}, "settings": {}}


class FakeApi:
    def __init__(self, falha=None, existentes=()):
        self.corpos, self.chamadas, self.falha, self.existentes = [], [], falha, list(existentes)

    def __call__(self, metodo, rota, corpo=None):
        self.chamadas.append((metodo, rota))
        self.corpos.append((metodo, rota, corpo))
        if self.falha and (metodo, rota.split("?")[0]) in self.falha and self.falha.count((metodo, rota.split("?")[0])) :
            self.falha.remove((metodo, rota.split("?")[0]))
            raise dep.Falha(f"{metodo} {rota} -> HTTP 500")
        if metodo == "GET" and rota.startswith("/workflows?"):
            return {"data": [{"name": n} for n in self.existentes]}
        if metodo == "GET":
            return {"name": "antigo", "nodes": [], "connections": {}, "settings": {}}
        if metodo == "POST" and rota == "/workflows":
            return {"id": "novo1"}
        return {}


class T(unittest.TestCase):
    def setUp(self):
        self.d = tempfile.mkdtemp()
        os.makedirs(f"{self.d}/config/ambientes")
        os.makedirs(f"{self.d}/workflows")
        self.cfg = {"workflows": {"bv-verificacao": "wf1"}}
        self.pcfg = {"workflows": {"bv-verificacao": "wfP"}}
        json.dump(self.cfg, open(f"{self.d}/config/ambientes/integracao.json", "w"))
        json.dump(self.pcfg, open(f"{self.d}/config/ambientes/producao.json", "w"))
        json.dump(WF, open(f"{self.d}/workflows/bv-verificacao.json", "w"))
        os.environ["N8N_API_URL"], os.environ["N8N_API_KEY"] = "http://x", "k"
        os.environ.pop("BV_DEPLOY_PRODUCAO_AUTORIZADO", None)

    def tearDown(self):
        shutil.rmtree(self.d)

    def run_main(self, argv, api):
        out, err = io.StringIO(), io.StringIO()
        with redirect_stdout(out), redirect_stderr(err):
            rc = dep.main(argv, self.d, api)
        return rc, out.getvalue(), err.getvalue()

    def test_tres_deploys_um_workflow_sem_post(self):
        api = FakeApi()
        for _ in range(3):
            self.assertEqual(self.run_main(["integracao"], api)[0], 0)
        self.assertNotIn(("POST", "/workflows"), api.chamadas)
        self.assertEqual({r for _, r in api.chamadas}, {"/workflows/wf1", "/workflows/wf1/publish"})

    def test_falha_no_put_nao_publica(self):
        api = FakeApi(falha=[("PUT", "/workflows/wf1")])
        rc, _, err = self.run_main(["integracao"], api)
        self.assertEqual(rc, 1)
        self.assertIn("etapa PUT", err)
        self.assertNotIn(("POST", "/workflows/wf1/publish"), api.chamadas)

    def test_falha_no_publish_restaura(self):
        api = FakeApi(falha=[("POST", "/workflows/wf1/publish")])
        rc, _, err = self.run_main(["integracao"], api)
        self.assertEqual(rc, 1)
        self.assertEqual([c for c in api.chamadas if c[0] == "PUT"].__len__(), 2)
        self.assertIn("restaurado", err)

    def test_id_inexistente_falha(self):
        json.dump({"workflows": {"bv-verificacao": ""}}, open(f"{self.d}/config/ambientes/integracao.json", "w"))
        api = FakeApi()
        rc, _, err = self.run_main(["integracao"], api)
        self.assertEqual(rc, 1)
        self.assertEqual(api.chamadas, [])
        self.assertIn("sem id", err)

    def test_producao_sem_confirmacao_recusada(self):
        api = FakeApi()
        self.assertEqual(self.run_main(["producao", "--confirmar-id", "wfP"], api)[0], 2)
        os.environ["BV_DEPLOY_PRODUCAO_AUTORIZADO"] = "sim"
        self.assertEqual(self.run_main(["producao"], api)[0], 2)
        self.assertEqual(self.run_main(["producao", "--confirmar-id", "outro"], api)[0], 2)
        self.assertEqual(api.chamadas, [])

    def test_producao_recusa_captura_e_config_vazio(self):
        os.environ["BV_DEPLOY_PRODUCAO_AUTORIZADO"] = "sim"
        try:
            self.pcfg["workflows"]["bv-captura"] = "wfC"
            json.dump(self.pcfg, open(f"{self.d}/config/ambientes/producao.json", "w"))
            api = FakeApi()
            rc, _, err = self.run_main(["producao", "--confirmar-id", "wfC", "--so", "bv-captura"], api)
            self.assertEqual(rc, 2)
            self.assertIn("bv-captura", err)
            self.pcfg["workflows"] = {"bv-recepcao": "wfR"}
            self.pcfg["webhook"] = {"path": ""}
            self.pcfg["chatmaster"] = {"whatsapp_id": "145"}
            json.dump(self.pcfg, open(f"{self.d}/config/ambientes/producao.json", "w"))
            self.assertEqual(self.run_main(["producao", "--confirmar-id", "wfR"], api)[0], 2)
            self.pcfg["webhook"], self.pcfg["chatmaster"] = {"path": "p"}, {"whatsapp_id": ""}
            json.dump(self.pcfg, open(f"{self.d}/config/ambientes/producao.json", "w"))
            self.assertEqual(self.run_main(["producao", "--confirmar-id", "wfR"], api)[0], 2)
            self.assertEqual(api.chamadas, [])
        finally:
            os.environ.pop("BV_DEPLOY_PRODUCAO_AUTORIZADO")

    def test_placeholders_include_e_sub_primeiro(self):
        os.environ["BV_WEBHOOK_TOKEN_SHA256"] = "abc"
        os.makedirs(f"{self.d}/workflows/shared"); os.makedirs(f"{self.d}/workflows/sub")
        open(f"{self.d}/workflows/shared/r.js", "w").write('var a = "x";\n')
        wf = {"name": "R", "nodes": [{"p": "{{BV:webhook.path}}|{{BV:TOKEN_SHA256}}|{{BV:INCLUDE:shared/r.js}}"}],
              "connections": {}, "settings": {}}
        json.dump(wf, open(f"{self.d}/workflows/bv-recepcao.json", "w"))
        json.dump(dict(WF, name="S"), open(f"{self.d}/workflows/sub/entregar-rajada.json", "w"))
        self.cfg.update(workflows={"bv-recepcao": "wfR"}, workflows_sub={"entregar_rajada": "wfS"}, webhook={"path": "pp"})
        json.dump(self.cfg, open(f"{self.d}/config/ambientes/integracao.json", "w"))
        api = FakeApi()
        self.assertEqual(self.run_main(["integracao"], api)[0], 0)
        puts = [x for x in api.corpos if x[0] == "PUT"]
        self.assertEqual([p[1] for p in puts], ["/workflows/wfS", "/workflows/wfR"])
        self.assertEqual(puts[1][2]["nodes"][0]["p"], 'pp|abc|var a = "x";\n')

    def test_placeholder_num_vira_numero_cru(self):
        out = dep.renderizar('{"t": "{{BV:NUM:a.b}}", "s": "{{BV:a.b}}"}', {"a": {"b": 300}}, self.d)
        self.assertEqual(json.loads(out), {"t": 300, "s": "300"})
        for ruim in ({"a": {"b": "x"}}, {"a": {}}):
            with self.assertRaises(dep.Falha):
                dep.renderizar('"{{BV:NUM:a.b}}"', ruim, self.d)

    def test_placeholder_sem_valor_falha(self):
        with self.assertRaises(dep.Falha):
            dep.renderizar("{{BV:nao.existe}}", {}, self.d)

    def test_criar_grava_id_e_recusa_repeticao(self):
        json.dump({"workflows": {"bv-verificacao": ""}}, open(f"{self.d}/config/ambientes/integracao.json", "w"))
        api = FakeApi()
        rc, out, _ = self.run_main(["integracao", "--criar", "bv-verificacao"], api)
        self.assertEqual((rc, out.strip()), (0, "bv-verificacao -> novo1"))
        self.assertEqual(json.load(open(f"{self.d}/config/ambientes/integracao.json"))["workflows"]["bv-verificacao"], "novo1")
        self.assertEqual(self.run_main(["integracao", "--criar", "bv-verificacao"], api)[0], 1)

    def test_criar_recusa_nome_existente(self):
        json.dump({"workflows": {"bv-verificacao": ""}}, open(f"{self.d}/config/ambientes/integracao.json", "w"))
        api = FakeApi(existentes=["BV Verificacao"])
        self.assertEqual(self.run_main(["integracao", "--criar", "bv-verificacao"], api)[0], 1)
        self.assertNotIn(("POST", "/workflows"), api.chamadas)

    def test_criar_sub_grava_em_workflows_sub_e_deploy_seguinte_atualiza(self):
        os.makedirs(f"{self.d}/workflows/sub")
        json.dump(dict(WF, name="Sub"), open(f"{self.d}/workflows/sub/entregar-rajada.json", "w"))
        json.dump({"workflows": {"bv-verificacao": "wf1"}, "workflows_sub": {"entregar_rajada": ""}},
                  open(f"{self.d}/config/ambientes/integracao.json", "w"))
        api = FakeApi()
        rc, out, _ = self.run_main(["integracao", "--criar", "entregar_rajada"], api)
        self.assertEqual((rc, out.strip()), (0, "entregar_rajada -> novo1"))
        cfg = json.load(open(f"{self.d}/config/ambientes/integracao.json"))
        self.assertEqual(cfg["workflows_sub"]["entregar_rajada"], "novo1")
        self.assertEqual(cfg["workflows"], {"bv-verificacao": "wf1"})  # principal intacto
        self.assertEqual(self.run_main(["integracao", "--criar", "entregar_rajada"], api)[0], 1)  # id preenchido
        api2 = FakeApi()
        self.assertEqual(self.run_main(["integracao", "--so", "entregar_rajada"], api2)[0], 0)
        self.assertEqual({r for _, r in api2.chamadas}, {"/workflows/novo1", "/workflows/novo1/publish"})

    def test_criar_principal_continua_em_workflows(self):
        json.dump({"workflows": {"bv-verificacao": ""}, "workflows_sub": {}}, open(f"{self.d}/config/ambientes/integracao.json", "w"))
        self.assertEqual(self.run_main(["integracao", "--criar", "bv-verificacao"], FakeApi())[0], 0)
        cfg = json.load(open(f"{self.d}/config/ambientes/integracao.json"))
        self.assertEqual((cfg["workflows"]["bv-verificacao"], cfg["workflows_sub"]), ("novo1", {}))

    def test_criar_producao_recusado(self):
        os.environ["BV_DEPLOY_PRODUCAO_AUTORIZADO"] = "sim"
        try:
            self.assertEqual(self.run_main(["producao", "--confirmar-id", "wfP", "--criar", "bv-verificacao"], FakeApi())[0], 2)
        finally:
            os.environ.pop("BV_DEPLOY_PRODUCAO_AUTORIZADO")


if __name__ == "__main__":
    unittest.main()
