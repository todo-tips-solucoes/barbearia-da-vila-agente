# Contrato: chaves de config do agente

`[PROPOSTA — a validar na implementação]` chaves novas em `config/ambientes/integracao.json` e `producao.json`, lidas por placeholders
`{{BV:...}}` no deploy. PROD fica parametrizado e inativo (spec, escopo de ambiente).

| Chave | TESTE | PROD | Fonte / status |
|-------|-------|------|----------------|
| `agente.modelo` | `gpt-5.6-luna` | idem | `docs/decisoes-pre-00c.md:31` |
| `agente.raciocinio` | `low` | idem | GOLD `config/ambientes/integracao.json:53`; latência a medir |
| `agente.iteracoes_max` | 6 | idem | GOLD; `[PROPOSTA]` para este agente |
| `agente.mensagens_contexto` | 20 | idem | GOLD; `[PROPOSTA]` |
| `agente.turnos_max_contato_hora` | 20 | idem | `[PROPOSTA]`, research Decision 17 |
| `conversa.janela_recencia_min` | 120 | idem | spec, Clarifications |
| `proposta.validade_min` | 30 | idem | `[PROPOSTA]` |
| `saida.max_mensagens` | 4 | idem | FR-015 |
| `saida.max_chars_mensagem` | 700 | idem | GOLD `funil.js:599`; `[PROPOSTA]` |
| `lista.max_itens` | 10 | idem | `[PROPOSTA]`, sonda S2 |
| `lista.max_titulo` | 24 | idem | `[PROPOSTA]`, sonda S2 |
| `digitando.ms_por_char` / `min_ms` / `max_ms` | 40 / 800 / 4000 | idem | `[PROPOSTA]` |
| `graces.host` | `api.gracesonline.com.br` | idem | `graces-api/README.md:8` (a chave só vale em produção) |
| `graces.timeout_ms` | 15000 | idem | `[PROPOSTA]` |
| `graces.barbeiro_teste_id` | `1cee0bb9-e58b-4428-9e9b-1db184db7943` | idem (para filtrar) | `graces-api/06-dados-da-loja.md:65` |
| `credenciais.openai` / `graces` / `chatmaster` | id criado por `criar-credenciais-n8n.py` | `""` até o owner | já existem vazias no config |
| `workflows_sub.bv_graces` | id criado por `deploy-n8n.sh --criar bv-graces` | `""` | |
| `teste.redirecionar_escrita` | `true` | ausente (= false) | research Decision 10 |
| `teste.contatos_escrita` | contato real indicado pelo owner (P2) | ausente | pendência P2 |
| `teste.contatos_simulados` | os `teste.contatos_sinteticos` existentes | ausente | GOLD `workflows/README.md:65` |
| `teste.cliente_teste_id` | `idCliente` autorizado pelo owner (P1) | ausente | pendência P1 |
| `textos.contingencia` / `midia` / `humano` / `reformular` / `lista_botao` / `lista_topo` | redação `[PROPOSTA]` | idem | ajustável pelo owner |
| `loja.endereco` / `loja.contatos` | copiados de `informacaoes_barbearia.txt` | idem | só para perguntas de endereço/contato |

Regras de deploy (já existentes em `scripts/deploy-n8n.py`, estendidas):

- valor ausente aborta o deploy; PROD exige `BV_DEPLOY_PRODUCAO_AUTORIZADO=sim` + `--confirmar-id`;
- deploy de PROD aborta se existir qualquer chave `teste.*` em `producao.json`;
- nenhum segredo no config: só ids de credencial (constituição XIV).
