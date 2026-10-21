# Contrato: CLI `scripts/suite-validacao.py` e `scripts/_smoke.py`

`[PROPOSTA — a validar na implementação]` (interface nova).

## Uso

```sh
python3 -I scripts/suite-validacao.py [--so R1 R2 ...] [--pendentes RELATORIO.json] \
  [--concorrencia N] [--teto-tokens N] | --limpar
```

| Opção | Padrão | Efeito |
|---|---|---|
| `--so` | todos | só os roteiros listados |
| `--pendentes` | — | só os roteiros `pendente` ou `erro_infra` do relatório indicado (FR-009) |
| `--concorrencia` | 2 | threads para os roteiros sem agendamento; a fila `>= 520` é sempre serial |
| `--teto-tokens` | 3000000 | teto de tokens medidos (agente + avaliadora) |
| `--limpar` | — | só a limpeza (`encerrar()` do smoke-agente) |

Pré-condições (sai com código 2 e mensagem sem segredo): `CHATMASTER_TOKEN_TESTE` e `OPENAI_API_KEY` presentes;
`ambiente == "integracao"`; `teste.contatos_escrita == []`; `teste.redirecionar_escrita == true`;
`verificar_implantado()` ok.

Saída: caminho do relatório, p50/p95, tokens, lista `FALHAS`. Código: 0 todos aprovados; 1 algum reprovado ou
`erro_infra`; 2 pré-condição; 3 limpeza falhou (imprime a ação manual).

## `scripts/_smoke.py`

| Nome | Assinatura | Origem |
|---|---|---|
| `RAIZ` | caminho da raiz do repositório | igual aos smokes |
| `carregar_env` | `(*arquivos)` → None; raiz da worktree, depois checkout principal; `setdefault` | `_env` dos smokes |
| `CFG`, `URL` | config `integracao.json` e webhook | smokes |
| `post` | `(corpo, url=URL, raw=None, timeout=120)` → `(status, texto)` | smoke-agente/smoke-recepcao |
| `checar` | `(falhas, nome, ok, detalhe="")` | smokes |
| `sql` | `(q, banco="barbearia_vila_teste")` → texto | `_vps.psql` |

Cada smoke mantém o nome antigo (`_env`, `checar`, `sql`, `post`) como alias, então chamadas e saída não mudam.

## Avaliadora (API externa existente)

`POST https://api.openai.com/v1/responses` com `model`, `input` e `text.format` (`json_schema`); lê
`output` e `usage`. Fonte: https://platform.openai.com/docs/api-reference/responses/create. Esquema pedido:
`{"K1": {"nota": 1-5, "justificativa": "..."}, ...}` só para os critérios do roteiro.
