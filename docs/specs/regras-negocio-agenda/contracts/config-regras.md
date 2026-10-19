# Contrato: chaves de config novas

`[PROPOSTA — a validar na implementação]`, em `config/ambientes/integracao.json` e `producao.json`,
lidas por placeholders `{{BV:...}}` (F3 `contracts/config-agente.md`). Valor ausente aborta o deploy.

| Chave | TESTE | PROD | Fonte / status |
|-------|-------|------|----------------|
| `graces.max_estagios` | 16 | idem | research Decision 2 |
| `graces.max_consultas_estagio` | 20 | idem | research Decision 7 |
| `encadeamento.max_servicos` | 3 | idem | research Decision 7 |
| `terceiro.buscas_max_sessao` | 3 | idem | research Decision 6 |
| `terceiro.buscas_max_dia` / `terceiro.cadastros_max_dia` | 5 / 1 | idem | research Decision 6 (F-SEC-2) |
| `agente.iteracoes_max` | 8 (era 6) | idem | research Decision 12 |
| `textos.lista_continua` | redação `[PROPOSTA]` | idem | Desc das listas 2..4 |
| `textos.modo_diferentes` / `textos.modo_separados` | redação `[PROPOSTA]` | idem | FR-012 |
| `textos.encaminhar_equipe` | "Vou passar você para a equipe da barbearia, que resolve isso direitinho. Já já alguém te responde por aqui, tá?" (aprovado pelo owner, block-004) | idem | ajustável pelo owner |
| `handoff.setor_id` / `handoff.whatsapp_id` | 78 / 145 | idem (PROD fica inativo) | `docs/decisoes-pre-00c.md` |

Sem mudança: `lista.max_itens` 10 e `saida.max_mensagens` 4 (capacidade de 40 inícios por turno,
research Decision 3); `cadastroLiberado` continua o literal `false` dos Code nodes do `bv-graces` (F3); liberar exige autorização expressa do owner (FR-007, FR-014).
