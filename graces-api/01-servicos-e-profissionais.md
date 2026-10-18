---
title: "Serviços e profissionais"
slug: servicos-e-profissionais
source: https://api.gracesonline.com.br/docs/servicos
fetched: 2026-10-18
endpoints:
  - GET /public/v1/agenda/servicos
  - GET /public/v1/servicos/profissionais
---
# Serviços e profissionais

> Fonte: <https://api.gracesonline.com.br/docs/servicos> · [Voltar ao índice](README.md) · Catálogo real em [Dados da loja](06-dados-da-loja.md)

O catálogo de serviços ativos na loja e a equipe que executa cada um.

## GET `/public/v1/agenda/servicos`

Lista os serviços ativos na loja, com duração e preço. Pode filtrar por texto.

| Query | Tipo | Obrig. | Descrição |
|---|---|---|---|
| `texto` | string | não | Filtro pela descrição (3+ caracteres). |

```bash
curl "https://api.gracesonline.com.br/public/v1/agenda/servicos?texto=corte" -H "X-Api-Key: $GRACES_API_KEY"
```

Resposta `200` (array; **forma real** observada em 2026-10-18):

```json
[
  { "idServico": "046519b1-e111-44b4-8779-3e64366f9d8f", "descricaoAgenda": "corte adulto",
    "tempoPadrao": 40, "valorPadrao": 85.0, "ativo": true }
]
```

> ⚠️ **Divergência com o portal:** o portal mostra `"tempoPadrao": "00:45"` (string HH:mm), mas a API real devolve um **inteiro em minutos** (`40`). Trate os dois formatos.
>
> A duração que vale para agendar é a de `GET /agenda/horarios-livres` (`minutos`), que considera o tempo próprio do profissional (`origemMinutos: "profissional"`). `tempoPadrao` é só o padrão da franquia.

Não é paginado (a resposta veio sem `X-Pagination`).

## GET `/public/v1/servicos/profissionais`

Lista os profissionais que executam um serviço (ativos e com acesso à loja), para cruzar serviço × profissional na reserva.

| Query | Tipo | Obrig. | Descrição |
|---|---|---|---|
| `idServico` | guid | **sim** | Serviço para o qual listar os profissionais. |

```bash
curl "https://api.gracesonline.com.br/public/v1/servicos/profissionais?idServico=046519b1-e111-44b4-8779-3e64366f9d8f" \
  -H "X-Api-Key: $GRACES_API_KEY"
```

Resposta `200`:

```json
[
  { "idProfissional": "0a327f00-021a-457e-a236-ce7c4aea4c25", "apelido": "Kiel",
    "nomeCompleto": "…", "funcao": "Barbeiro" }
]
```

Observações:

- Não existe endpoint que liste **todos** os profissionais. A lista sai cruzando os serviços (o rota antiga foi movida para `/servicos/profissionais` em jun 2026).
- O `apelido` pode vir com **espaço no final** (ex.: `"Rodrigo "`). Aplique `trim()` antes de mostrar ou comparar.
- **Filtre o profissional de teste** `ZZ TESTE INTEGRACAO - NAO AGENDAR`: ele aparece em todos os serviços e não pode ser oferecido ao cliente.
