# Contrato: chaves novas de `config/ambientes/<ambiente>.json`

`[PROPOSTA — a validar na implementacao]` Extensão de
`docs/specs/recepcao-buffer/contracts/config-recepcao.md`. Sem segredos.

| Chave | TESTE | PROD | Uso |
|-------|-------|------|-----|
| `redis.timeout_s` | 5 | 5 | `executionTimeout` do `redis-op` (FR-006) `[PROPOSTA — sem fonte externa; confirmar com o owner]` |
| `dedup.conteudo_janela_s` | 10 | 10 | janela da dedupe por conteúdo (FR-010; decisão do owner, dec-031) |
| `workflows_sub.redis_op` | id criado por `--criar redis_op` | `""` | deploy (FR-013) |

PROD recebe as chaves com o mesmo valor e id vazio: parametrizado e inativo (FR-016).
