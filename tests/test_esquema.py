import re, unittest

SQL = open("db/migrations/0001_esquema_inicial.sql").read()
TABELAS = {
    "contatos": ["id", "telefone", "nome", "graces_cliente_id", "criado_em", "atualizado_em"],
    "mensagens": ["id", "contato_id", "mensagem_id_canal", "direcao", "tipo", "conteudo", "criado_em"],
    "mensagens_agendadas": ["id", "contato_id", "tipo", "previsto_para", "graces_agendamento_id",
                            "agendamento_canal_id", "situacao", "criado_em", "atualizado_em"],
    "handoffs": ["id", "contato_id", "motivo", "situacao", "iniciado_em", "encerrado_em"],
    "schema_migrations": ["versao", "nome", "sha256", "aplicada_em"],
}


def corpo(t):
    return re.search(rf"CREATE TABLE IF NOT EXISTS {t} \((.*?)\n\);", SQL, re.S).group(1)


class Esquema(unittest.TestCase):
    def test_colunas_exatas(self):
        for t, cols in TABELAS.items():
            achadas = [l.split()[0] for l in corpo(t).splitlines()
                       if l.strip() and l.split()[0] not in ("UNIQUE", "CHECK")]
            self.assertEqual(achadas, cols, t)

    def test_checks_e_fks(self):
        for trecho in ("IN ('entrada','saida')", "IN ('confirmacao','lembrete','pos_atendimento')",
                       "IN ('pendente','enviada','cancelada')", "IN ('aberto','encerrado')",
                       "(situacao = 'aberto') = (encerrado_em IS NULL)", "UNIQUE (graces_agendamento_id, tipo)"):
            self.assertIn(trecho, SQL)
        self.assertEqual(SQL.count("REFERENCES contatos(id) ON DELETE CASCADE"), 3)

    def test_indices(self):
        for trecho in ("mensagens (contato_id, criado_em)", "mensagens_agendadas (situacao, previsto_para)",
                       "UNIQUE INDEX IF NOT EXISTS handoffs_aberto_unico_idx ON handoffs (contato_id) WHERE situacao = 'aberto'"):
            self.assertIn(trecho, SQL)
        self.assertIn("telefone text NOT NULL UNIQUE", SQL)
        self.assertIn("mensagem_id_canal text UNIQUE", SQL)

    def test_sem_campos_sensiveis(self):
        for proibido in ("email", "e_mail", "documento", "cpf", "nascimento", "endereco"):
            self.assertNotIn(proibido, SQL.lower())


if __name__ == "__main__":
    unittest.main()
