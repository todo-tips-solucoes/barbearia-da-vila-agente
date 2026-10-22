# Contrato: scripts de infraestrutura (CLI)

`[PROPOSTA — a validar na implementacao]`. Todos rodam da raiz do repositório, com `python3 -I`
(stdlib). Exit codes comuns: **0** ok; **1** falha de execução (SSH, API, SQL, verificação); **2** uso
inválido ou alvo recusado (antes de qualquer efeito). Nenhum imprime segredo; saída de erro passa por
scrub (padrão `_scrub` do Gold). Alvo `teste` ≡ ambiente `integracao`; `producao` ≡ PROD.

| Script | Uso | Escopo de escrita | Idempotência |
|--------|-----|-------------------|--------------|
| `scripts/_vps.py` | módulo + CLI de diagnóstico; lista fechada de operações: `psql <banco>` (stdin), `redis <db> <cmd…>`, `sondar <item>`, `pg_dump <banco>`. Outras → exit 2 | VPS, só stack `n8n` (`n8n-postgres-1`, `n8n-redis-1`) e `/root/barbearia_vila/` | — |
| `scripts/preparar-bancos.py --alvo teste\|producao` | cria role + database + REVOKE/GRANT CONNECT; gera senha só se ausente no `infra.env` | Postgres `n8n-postgres-1`, `/root/barbearia_vila/infra.env` | role/db existentes mantidos; senha nunca trocada |
| `scripts/migrar.py --alvo teste\|producao [--dry-run]` | aplica `db/migrations/NNNN_*.sql` | database do alvo | `schema_migrations` + sha256; divergência → exit 1 |
| `scripts/criar-credenciais-n8n.py [--alvo teste\|producao]` | cria credenciais do n8n por nome; imprime `nome → id` | n8n (credenciais) | nome existente → pula |
| `scripts/deploy-n8n.sh integracao [--so NOME]` | GET → PUT → publish de cada workflow com id no config | n8n (workflows do config) | PUT sobre o mesmo id; nunca POST |
| `scripts/deploy-n8n.sh integracao --criar NOME` | cria o workflow uma única vez e imprime o id | n8n | recusa se id no config ou nome já existe |
| `scripts/deploy-n8n.sh producao --confirmar-id ID` | idem PROD; exige `BV_DEPLOY_PRODUCAO_AUTORIZADO=sim` e `ID` = id de PROD do config | n8n PROD | igual |
| `scripts/backup-bancos.py --alvo teste\|producao\|todos --retencao N` | `pg_dump -Fc` + rotação dos próprios arquivos | `/root/barbearia_vila/backups/` | arquivo novo por execução; rotação só do próprio padrão |
| `scripts/verificar-infra.py [--redis] [--acesso] [--backup] [--idempotencia]` | sondagens **somente leitura** e checagens pós-preparação | nenhum (exceto `SET/DEL` sob `bv:teste:verif:` com `--redis`, após DB confirmado) | — |
| `scripts/limpar-redis.py --alvo teste\|producao [--padrao SUFIXO]` | `SCAN MATCH <prefixo><sufixo>*` + `DEL` em lote; PROD exige a mesma trava do deploy | Redis DB do config, só chaves do prefixo do alvo | repetível |
| `scripts/varrer-segredos.py` | varre `git ls-files`; achados `arquivo:linha` sem o valor | nenhum | — |
| `scripts/verificar-repo.py` | regras de `config-ambiente.md` + ids no `docs/infra.md` | nenhum | — |

## Travas de PROD (FR-011)

Qualquer operação que escreva em PROD (`preparar-bancos`, `migrar`, `criar-credenciais`, `deploy`,
`limpar-redis` com `--alvo producao`) exige `BV_DEPLOY_PRODUCAO_AUTORIZADO=sim`; `deploy` exige ainda
`--confirmar-id`. Sem a trava: exit 2, mensagem clara, nenhuma chamada remota.

## API pública do n8n usada

Rotas usadas pelo Gold e registradas por ele como confirmadas em `<N8N_API_URL>/api/v1/openapi.yml`:
`GET /workflows`, `GET/PUT /workflows/{id}`, `POST /workflows/{id}/publish`, `POST /credentials`.
`GET /credentials/schema/{tipo}` e a listagem de credenciais por nome MUST ser reconfirmadas no
`openapi.yml` da instância antes de codificar (research P4/P5). Autenticação: header da API key
lido de `N8N_API_KEY` (`.env.n8n`), nunca impresso.
