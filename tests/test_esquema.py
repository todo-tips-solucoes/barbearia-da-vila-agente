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


M2 = open("db/migrations/0002_recepcao_buffer.sql").read()


class Migracao0002(unittest.TestCase):
    def test_colunas_indice_e_check(self):
        for c in ("processada_em timestamptz", "midia_url text", "turno_id uuid", "turno_em timestamptz"):
            self.assertIn(c, M2)
        self.assertIn("mensagens_pendentes_idx ON mensagens (contato_id, criado_em, id)", M2)
        self.assertIn("WHERE direcao = 'entrada' AND processada_em IS NULL", M2)
        self.assertIn("tipo IN ('texto','audio','imagem')", M2)

    def test_idempotente(self):
        for l in M2.splitlines():
            if l.startswith(("ALTER TABLE mensagens ADD COLUMN", "CREATE INDEX")):
                self.assertIn("IF NOT EXISTS", l)
        self.assertIn("DROP CONSTRAINT IF EXISTS", M2)
        # backfill so na primeira aplicacao, dentro do guarda de coluna inexistente
        self.assertLess(M2.index("IF NOT EXISTS (SELECT 1"), M2.index("UPDATE mensagens SET processada_em"))


M3 = open("db/migrations/0003_falhas_recepcao.sql").read()


class Migracao0003(unittest.TestCase):
    def test_tabela_sem_pii_e_idempotente(self):
        self.assertIn("CREATE TABLE IF NOT EXISTS falhas_recepcao", M3)
        for c in ("tipo", "motivo", "contato_id", "ocorrida_em"):
            self.assertIn(c, M3)
        for proibido in ("telefone", "conteudo", "token"):
            self.assertNotIn(proibido, M3.lower().split("\n", 1)[1])


if __name__ == "__main__":
    unittest.main()
