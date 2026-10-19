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


M4 = open("db/migrations/0004_recepcao_robustez.sql").read()


class Migracao0004(unittest.TestCase):
    def test_check_gravacao_e_marcas(self):
        self.assertIn("DROP CONSTRAINT IF EXISTS falhas_recepcao_tipo_check", M4)
        self.assertIn("'redis_indisponivel','payload_invalido','entrega','gravacao'", M4)
        self.assertIn("CREATE TABLE IF NOT EXISTS marcas_conteudo", M4)
        self.assertIn("PRIMARY KEY (contato_id, hash_conteudo)", M4)
        self.assertIn("REFERENCES contatos(id) ON DELETE CASCADE", M4)
        self.assertIn("CREATE INDEX IF NOT EXISTS marcas_conteudo_visto_em_idx ON marcas_conteudo (visto_em)", M4)

    def test_marca_sem_texto_nem_telefone(self):
        corpo = M4.split("CREATE TABLE IF NOT EXISTS marcas_conteudo", 1)[1].split(");", 1)[0]
        for proibido in ("telefone", "texto", "conteudo ", "token"):
            self.assertNotIn(proibido, corpo.replace("hash_conteudo", ""))


if __name__ == "__main__":
    unittest.main()


M6 = open("db/migrations/0006_agente.sql").read()


class Migracao0006(unittest.TestCase):
    def test_tabelas_checks_e_fks(self):
        for t in ("turnos", "conversas", "propostas", "falhas_agente"):
            self.assertIn(f"CREATE TABLE IF NOT EXISTS {t} (", M6)
        for trecho in ("IN ('em_andamento','concluido','falhou')", "IN ('agendar','reagendar','cancelar','trocar_servico')",
                       "IN ('pendente','executando','executada','incerta','falhou','substituida','expirada')",
                       "IN ('graces','chatmaster','agente','turno')",
                       "propostas (contato_id) WHERE estado = 'pendente'"):
            self.assertIn(trecho, M6)
        self.assertEqual(M6.count("REFERENCES contatos(id) ON DELETE CASCADE"), 4)

    def test_idempotente_e_sem_sensiveis(self):
        for l in M6.splitlines():
            if l.startswith(("CREATE TABLE", "CREATE INDEX", "CREATE UNIQUE")):
                self.assertIn("IF NOT EXISTS", l)
        for proibido in ("token", "payload", "telefone", "email", "cpf"):
            self.assertNotIn(proibido, "\n".join(l for l in M6.lower().splitlines() if not l.startswith("--")))


M7 = open("db/migrations/0007_regras_agenda.sql").read()


class Migracao0007(unittest.TestCase):
    def test_amplia_checks_de_forma_idempotente(self):
        for c in ("propostas_acao_check", "propostas_estado_check"):
            self.assertIn(f"DROP CONSTRAINT IF EXISTS {c}", M7)
            self.assertIn(f"ADD CONSTRAINT {c}", M7)
        for v in ("'agendar_conjunto'", "'cancelar_conjunto'", "'cadastrar_terceiro'", "'parcial'"):
            self.assertIn(v, M7)
        self.assertNotIn("CREATE TABLE", M7)


M8 = open("db/migrations/0008_ticket_contato.sql").read()


class Migracao0008(unittest.TestCase):
    def test_ticket_id_idempotente(self):
        self.assertIn("ADD COLUMN IF NOT EXISTS ticket_id bigint", M8)
        self.assertNotIn("CREATE TABLE", M8)
