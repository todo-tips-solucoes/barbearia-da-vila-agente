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


MIDIA = {"hosts_audio": ["a.example.com"], "hosts_imagem": [], "mimes_audio": ["audio/ogg"], "mimes_imagem": ["image/png"],
         "prefixos_audio": [], "prefixos_imagem": [], "descricao_max_chars": 600, "audio_max_s": 120, "audio_max_mb": 10,
         "imagem_max_mb": 10, "max_por_turno": 2, "download_timeout_s": 10, "openai_timeout_s": 25, "execucao_timeout_s": 75,
         "transcricao_modelo": "whisper-1", "imagem_detalhe": "auto", "retencao_h": 23.9}


MENS = {"ativo": True, "confirmacao_hora": "18:00", "lembrete_antes_min": 120, "pos_depois_min": 60, "varredura_s": 60, "reserva_s": 120,
        "atraso_max_min": 30, "retentativas_min": [1, 5, 15], "reconciliacao_min": 15, "reconciliacao_dias": 7, "espera_texto_s": 10,
        "titulo_sim": "Confirmo", "titulo_nao": "Nao vou", "repetida_max_por_hora": 2, "max_por_varredura": 20, "max_por_contato_dia": 6}
TXT_M = {k: "x" for k in vr.TEXTOS_MENSAGENS}


def cfg(prefixo, banco, db=2, **extra):
    base = {"redis": {"prefixo": prefixo, "db": db}, "postgres": {"database": banco, "credencial_id": ""},
            "midia": dict(MIDIA), "workflows_sub": {"interpretar_midia": ""},
            "textos": {"midia_nao_entendida": "x", "midia_grande": "y", **TXT_M}, "mensagens": {**MENS, "ativo": banco.endswith("_teste")}, "graces": {"timeout_ms": 15000}}
    return {**base, **extra}


OK = {"integracao": cfg("bv:teste:", "barbearia_vila_teste"), "producao": cfg("bv:prod:", "barbearia_vila")}


class T(unittest.TestCase):
    def test_regras_de_mensagens(self):  # 5.1.3
        import copy
        def erros(amb="integracao", **m):
            c = copy.deepcopy(OK)
            c[amb]["mensagens"].update(m)
            return "\n".join(vr.regras_mensagens(amb, c[amb]))
        self.assertEqual(erros(), "")
        self.assertIn("reserva_s deve ser maior", erros(reserva_s=30))
        self.assertIn("confirmacao_hora", erros(confirmacao_hora="6pm"))
        self.assertIn("retentativas_min", erros(retentativas_min=[]))
        self.assertIn("reconciliacao_dias", erros(reconciliacao_dias=8))
        self.assertIn("diferentes", erros(titulo_nao="Confirmo"))
        self.assertIn("titulo_sim", erros(titulo_sim="x" * 25))
        self.assertIn("inativas", erros("producao", ativo=True))
        self.assertEqual(erros("producao"), "")  # ativo false passa
        c = copy.deepcopy(OK)  # ids de bv-mensagens/bv_confirmacao em PROD nao falham mais (publicadas desligadas)
        c["producao"].update(workflows={"bv-mensagens": "wfM"}, workflows_sub={"bv_confirmacao": "wfC"})
        self.assertEqual(vr.regras_mensagens("producao", c["producao"]), [])
        c = copy.deepcopy(OK)
        del c["integracao"]["mensagens"]["atraso_max_min"]
        del c["integracao"]["textos"]["lembrete"]
        e = "\n".join(vr.regras_mensagens("integracao", c["integracao"]))
        self.assertIn("mensagens.atraso_max_min ausente", e)
        self.assertIn("textos.lembrete ausente", e)

    def test_config_valida(self):
        self.assertEqual(vr.verificar(OK, ""), [])

    def test_regras_de_midia(self):  # 6.2.3
        def com(**m):
            c = cfg("bv:teste:", "barbearia_vila_teste", lock={"ttl_s": 120, "espera_s": 3, "tentativas": 45})
            c["midia"].update(m)
            return {"integracao": c, "producao": OK["producao"]}
        self.assertEqual(vr.verificar(com(), ""), [])
        for m, trecho in ((dict(hosts_audio=["https://a.com"]), "so o host"), (dict(hosts_imagem=["a.com/"]), "so o host"),
                          (dict(prefixos_audio=["b/"]), "comecar com '/'"), (dict(descricao_max_chars=0), "descricao_max_chars"),
                          (dict(execucao_timeout_s=120), "menor que lock.ttl_s")):
            self.assertIn(trecho, " ".join(vr.verificar(com(**m), "")), m)
        c = com()
        del c["integracao"]["midia"]["retencao_h"]
        c["integracao"]["textos"]["midia"] = "velho"
        del c["integracao"]["workflows_sub"]["interpretar_midia"]
        e = " ".join(vr.verificar(c, ""))
        for t in ("midia.retencao_h ausente", "textos.midia foi substituido", "workflows_sub.interpretar_midia ausente"):
            self.assertIn(t, e)

    def test_workflows_de_midia_sem_execucao_salva(self):  # 6.2.3
        self.assertEqual(vr.verificar_workflows(RAIZ), [])

    def test_lock_e_paths(self):
        ok = {"integracao": cfg("bv:teste:", "barbearia_vila_teste", lock={"ttl_s": 120, "espera_s": 3, "tentativas": 45},
                                webhook={"path": "a"}),
              "producao": cfg("bv:prod:", "barbearia_vila", webhook={"path": ""})}
        self.assertEqual(vr.verificar(ok, ""), [])
        ruim = {"integracao": cfg("bv:teste:", "barbearia_vila_teste", lock={"ttl_s": 120, "espera_s": 3, "tentativas": 10},
                                  webhook={"path": "a"}),
                "producao": cfg("bv:prod:", "barbearia_vila", webhook={"path": "a"})}
        e = " ".join(vr.verificar(ruim, ""))
        self.assertIn("lock.espera_s", e)
        self.assertIn("webhook.path", e)

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
            f.write("ok\nPASSWORD=" + "abcdefghijklmnopqrstuvwx\n")  # concatenado para o varredor nao acusar o proprio fixture
        try:
            achados = vs.varrer([f.name])
        finally:
            os.unlink(f.name)
        self.assertEqual(len(achados), 1)
        self.assertTrue(achados[0].endswith(":2: possivel atribuicao de segredo"))
        self.assertNotIn("abcdefgh", achados[0])


if __name__ == "__main__":
    unittest.main()
