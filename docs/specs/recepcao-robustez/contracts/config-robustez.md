# Contrato: chaves novas de `config/ambientes/<ambiente>.json`

`[PROPOSTA — a validar na implementacao]` Extensão de
`docs/specs/recepcao-buffer/contracts/config-recepcao.md`. Sem segredos.

| Chave | TESTE | PROD | Uso |
|-------|-------|------|-----|
| `execucao.timeout_s` | 300 | 300 | `executionTimeout` do `bv-recepcao` inteiro (FR-006, dec-020) `[PROPOSTA — sem fonte externa; deve exceder buffer.teto_s + lock.espera_s × lock.tentativas + buffer.janela_s; confirmar com o owner]` |
| `dedup.conteudo_janela_s` | 10 | 10 | janela da dedupe por conteúdo (FR-010; decisão do owner, dec-031) |

PROD recebe as chaves com o mesmo valor e id vazio: parametrizado e inativo (FR-016).
