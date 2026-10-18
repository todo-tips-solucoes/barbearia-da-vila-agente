---
title: "Autenticação, ambientes, paginação e erros"
slug: autenticacao-e-erros
source: https://api.gracesonline.com.br/docs/autenticacao
fetched: 2026-10-18
---
# Autenticação, ambientes, paginação e erros

> Fonte: <https://api.gracesonline.com.br/docs/autenticacao> · [Voltar ao índice](README.md)

## Autenticação

- Toda requisição leva o cabeçalho **`X-Api-Key: <chave>`**, sempre sobre HTTPS. Sem TLS ou sem chave, a requisição falha.
- A chave pertence ao estabelecimento. **Nunca exponha a chave no front-end**: ela fica no servidor.
- Não há SDK; qualquer cliente HTTP serve.
- Para validar a chave: `GET /public/v1/auth/validar` → `200` (válida) ou `401` (inválida). É a chamada que o portal usa no login.

```bash
curl "https://api.gracesonline.com.br/public/v1/agenda/servicos" \
  -H "X-Api-Key: $GRACES_API_KEY"
```

## Ambientes

| Ambiente | Host | Base URL |
|---|---|---|
| Produção | `api.gracesonline.com.br` | `https://api.gracesonline.com.br/public/v1` |
| Homologação | `api-staging.gracesonline.com.br` | `https://api-staging.gracesonline.com.br/public/v1` |

Segundo a fonte, "a mesma chave vale para o ambiente correspondente": muda o endereço base, não há prefixo na chave.

> **Verificado em 2026-10-18:** a chave de `.env.smoke` (`GRACES_API_KEY`) responde `200` em **produção** e `401 NAO_AUTENTICADO` em **homologação**. Ou seja, hoje não existe chave de staging: os testes rodam contra **dados reais**. Use o profissional de teste `ZZ TESTE INTEGRACAO - NAO AGENDAR` (ver [Dados da loja](06-dados-da-loja.md)) e cancele o que criar.
>
> Em `.env.smoke`, `GRACES_BASE_URL_*` guarda **só o host**, sem `https://` e sem `/public/v1`. Monte a URL assim: `https://${host}/public/v1`.

## Health checks

`GET /health/live` e `GET /health/ready`, para monitoramento e probes (fonte: changelog, jun 2026).

## Paginação

- Endpoints de lista aceitam `pageNumber` (padrão `1`) e `pageSize` (padrão `50`, máximo `200`).
- Os metadados vêm no **cabeçalho de resposta `X-Pagination`** (JSON). Exemplo real:

```json
{"pageNumber":1,"pageSize":50,"totalItemCount":0,"pageCount":0,"hasNextPage":false,"hasPreviousPage":false}
```

Endpoints paginados: `GET /agenda/clientes`, `/agenda/agendamentos`, `/agenda/historico`, `/agenda/completa` (por profissional) e `/agenda/pacotes` (por pacote).

## Erros

As falhas seguem o formato **ProblemDetails (RFC 7807)**, com um `code` estável e a mensagem em `detail`.

| HTTP | `code` | Significado |
|---|---|---|
| 400 | `PARAMETRO_INVALIDO`, `CORPO_INVALIDO` | Parâmetro ou corpo inválido. |
| 401 | `NAO_AUTENTICADO` | Chave ausente, inválida ou revogada. |
| 403 | `LOJA_FORA_ESCOPO`, `ACESSO_NEGADO` | Loja fora do escopo da chave, ou submódulo desabilitado. |
| 404 | `NAO_ENCONTRADO` | Recurso não encontrado. |
| 409 | `CONFLITO` | Conflito de regra de negócio (ex.: status incompatível com a operação). |

Exemplos reais (2026-10-18):

```json
{"type":"https://docs.gracesonline.com.br/public-api/errors/corpo-invalido","title":"Requisição inválida","status":400,
 "detail":"The value 'xx' is not valid.","instance":"/public/v1/agenda/horarios-livres","code":"CORPO_INVALIDO","traceId":"00-…"}
```

```json
{"type":"https://docs.gracesonline.com.br/public-api/errors/nao-autenticado","title":"Não autenticado","status":401,
 "detail":"Api-key ausente ou inválida no header X-Api-Key.","instance":"/public/v1/agenda/servicos","code":"NAO_AUTENTICADO","traceId":"00-…"}
```

**Para o agente:** decida pelo `code` (é estável), nunca pelo texto de `detail`. Ele pode vir em inglês, como no exemplo acima. Registre o `traceId` nos logs para abrir chamado com a Graces.
