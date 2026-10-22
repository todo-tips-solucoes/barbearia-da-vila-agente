# Contrato: `config/ambientes/<ambiente>.json`

`[PROPOSTA — a validar na implementacao]` — formato novo deste projeto, derivado do
`config/ambientes/integracao.json` do Gold. Sem segredos. Lido por todos os scripts e pelas features
seguintes. Ids vazios (`""`) significam "ainda não criado"; nenhum id é inventado.

```json
{
  "ambiente": "integracao",
  "rotulo": "TESTE",
  "n8n_url": "https://n8n2.todo-tips.com",
  "postgres": { "database": "barbearia_vila_teste", "credencial_id": "" },
  "redis": { "prefixo": "bv:teste:", "db": 2, "db_confirmado": false },
  "credenciais": { "redis": "", "verificacao": "", "openai": "", "graces": "", "chatmaster": "" },
  "workflows": { "bv-verificacao": "" }
}
```

`producao.json`: `ambiente: "producao"`, `rotulo: "PROD"`, `database: "barbearia_vila"`,
`prefixo: "bv:prod:"`, sem a chave `bv-verificacao` em `workflows` (só TESTE).

## Regras (verificadas por `scripts/verificar-repo.py`)

1. `redis.prefixo` termina em `:`; o prefixo de um ambiente não é prefixo textual do outro (FR-008).
2. `redis.db` ∉ {0, 1}; escrita no Redis recusada enquanto `db_confirmado` for `false`.
3. `postgres.database` ∈ {`barbearia_vila`, `barbearia_vila_teste`} conforme o ambiente.
4. Todo id não vazio aparece em `docs/infra.md` (FR-014).
5. Nenhuma chave com nome de segredo (`password`, `senha`, `token`, `key`, `secret`) — ver
   `varrer-segredos.py`.
