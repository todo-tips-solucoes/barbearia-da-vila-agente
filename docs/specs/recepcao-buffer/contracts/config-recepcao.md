# Contrato: chaves novas de `config/ambientes/<ambiente>.json`

`[PROPOSTA — a validar na implementacao]` Extensão de `docs/specs/infra-base/contracts/config-ambiente.md`.
Sem segredos; valores numéricos em segundos/horas no nome da chave.

| Chave | TESTE | PROD | Uso |
|-------|-------|------|-----|
| `webhook.path` | UUID gerado uma vez | `""` até o owner | path da recepção (FR-016/017) |
| `webhook.webhook_id` | UUID gerado uma vez | `""` até o owner | webhookId do nó |
| `chatmaster.whatsapp_id` | `145` | `""` até o owner | conexão (fonte: `docs/decisoes-pre-00c.md`) |
| `buffer.janela_s` | 8 | 8 | espera de silêncio (FR-009) |
| `buffer.teto_s` | 60 | 60 | espera máxima da rajada (FR-011) |
| `lock.ttl_s` | 120 | 120 | posse do contato (FR-013) |
| `lock.espera_s` | 3 | 3 | intervalo entre tentativas |
| `lock.tentativas` | 45 | 45 | `espera_s × tentativas >= ttl_s` |
| `redis.ttl.ultima_s` | 120 | 120 | validade do token `ultima` |
| `midia.retencao_h` | 24 | 24 | só se `midias_recebidas` existir |
| `teste.atraso_entrega_s` | 3 | ausente | stub de entrega no TESTE |
| `teste.contatos_sinteticos` | lista de telefones fictícios | ausente | smoke; nunca número real |
| `workflows.bv-recepcao`, `workflows_sub.entregar_rajada`, `workflows.bv-captura` | ids | ids (sem captura) | deploy |

Valor fora do config: `webhook.token_sha256` (deploy lê de `.env.n8n`, nunca versionado). PROD com
`webhook.path` ou `chatmaster.whatsapp_id` vazio = deploy de PROD aborta. `verificar-repo.py` passa
a exigir que `webhook.path` de TESTE e PROD sejam diferentes quando ambos preenchidos.
