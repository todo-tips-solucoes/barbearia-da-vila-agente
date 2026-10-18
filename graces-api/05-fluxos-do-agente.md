---
title: "Fluxos do agente de atendimento (agendar, reagendar, cancelar)"
slug: fluxos-do-agente
source: composição dos endpoints documentados em 00–04 (não é página do portal)
fetched: 2026-10-18
---
# Fluxos do agente de atendimento

> [Voltar ao índice](README.md) · Esta página **não vem do portal**: ela combina os endpoints documentados em 00–04 nos fluxos de conversa do agente. Quando algo aqui é inferência, está marcado como tal.

Base: `https://api.gracesonline.com.br/public/v1` · Cabeçalho: `X-Api-Key` · Datas no fuso de São Paulo, sem offset.

## Mapa intenção → chamadas

| Intenção do cliente | Chamadas, em ordem |
|---|---|
| Identificar quem fala | `GET /agenda/clientes?celular={whatsapp}` → se `[]`, cadastrar |
| Ver serviços e preços | `GET /agenda/servicos` (filtrar os sem barbeiro real) |
| Ver barbeiros de um serviço | `GET /servicos/profissionais?idServico=` (remover o de teste) |
| Ver horários livres | `GET /agenda/horarios-livres?idServico=&idProfissional=&data=` (um por barbeiro) |
| **Agendar** | identificar → serviço → barbeiro → data → `horarios-livres` → confirmar → (`pacotes`) → `POST /agenda` |
| **Reagendar** | identificar → `GET /agenda/agendamentos` → escolher → `horarios-livres` → confirmar → `PUT /agenda/{idAgenda}` |
| **Cancelar** | identificar → `GET /agenda/agendamentos` → escolher → confirmar → `DELETE /agenda/{idAgenda}` |
| "Quais são meus horários?" | `GET /agenda/agendamentos?idCliente=&proximos=true` |
| Confirmar presença (lembrete) | `POST /agenda/confirmacao` (só se status = 2) |
| "O de sempre" | `GET /agenda/historico?idCliente=` → último serviço e barbeiro |
| Horário de funcionamento | `GET /agenda/configuracao` |

## 1. Identificar o cliente (sempre o primeiro passo)

```
GET /agenda/clientes?celular=5511999998888      # número do remetente no WhatsApp
```

- **1 resultado** → use o `idCliente`. Cumprimente pelo `nomeCliente`.
- **Vários** (mesmo celular, pessoas diferentes, ex.: pai e filho) → pergunte para quem é o atendimento.
- **`[]`** → peça o nome e cadastre:
  ```
  POST /agenda/clientes  { "nomeCliente": "<nome>", "ddiCelular": "55", "celular": "<DDD+número, só dígitos>" }
  → { "sucesso": true, "idCliente": "…" }
  ```
  Na loja, só o celular é obrigatório ([06](06-dados-da-loja.md#regras-de-cadastro-de-cliente)).
- O WhatsApp entrega o número com DDI (`55…`). A busca aceita com ou sem DDI. No cadastro, separe `ddiCelular` e `celular`.

> Agendar **para outra pessoa** (ex.: filho): busque pelo nome (`busca=`) ou cadastre a pessoa. Pode faltar celular próprio, e o celular é obrigatório na loja. *Regra de negócio a definir com a barbearia.*

## 2. Agendar

1. **Serviço** — `GET /agenda/servicos`. Ligue a fala do cliente ("corte e barba") a `descricaoAgenda` ("Cabelo adulto + barba"). Os nomes no cadastro são inconsistentes (maiúsculas, "Ttratamento"): compare sem diferenciar maiúsculas e acentos. Na dúvida, mostre as opções.
2. **Barbeiro** — `GET /servicos/profissionais?idServico=…`, sem o `ZZ TESTE…`. Se o cliente não tiver preferência, considere todos.
3. **Data** — interprete "amanhã", "sábado" etc. no fuso de São Paulo e confira com o funcionamento (`/agenda/configuracao`).
4. **Horários** — `GET /agenda/horarios-livres` para cada barbeiro elegível. Ofereça poucas opções (ex.: 3 a 5) perto do que o cliente pediu. `horarios: []` = dia lotado: sugira o dia seguinte. `400` = loja fechada ou fora do prazo: explique e sugira outra data.
5. **Pacote** — `GET /agenda/pacotes?idCliente=…&idServico=…`. Se vier seção, use a **primeira** (`secoes[0].idClienteItemPacote`) e avise o cliente que vai abater do pacote.
6. **Confirmação explícita** — resuma serviço, barbeiro, dia, hora e valor (ou "abatido do pacote") e espere o "sim".
7. **Revalidar e criar** — consulte `/horarios-livres` de novo e, se o horário ainda estiver na grade:
   ```
   POST /agenda { "idCliente", "idServico" | "idClienteItemPacote", "idProfissional",
                  "data": "AAAA-MM-DD", "horaInicio": "HH:mm", "idIntegracao": "<id da conversa>" }
   ```
8. **Resposta** — `sucesso: true` → confirme ao cliente com data por extenso. Erro → ver §5.

## 3. Reagendar

1. `GET /agenda/agendamentos?idCliente=…&proximos=true`. Se houver mais de um, liste (serviço, dia, hora, barbeiro) e peça para escolher.
2. Guarde `idAgenda`, `idServico`, `idProfissional` e `horaInicio` (`AAAA-MM-DDTHH:mm:ss`).
3. Nova data e barbeiro (o mesmo ou outro) → `GET /agenda/horarios-livres` com o **`idServico` do agendamento**.
4. Confirme "de X para Y" com o cliente.
5. ```
   PUT /agenda/{idAgenda} { "horaInicioOriginal": "<horaInicio atual>",
                            "horaInicioNovo": "AAAA-MM-DDTHH:mm:ss", "idProfissional": "<guid>" }
   ```
- O PUT **mantém o serviço e a duração**. Para trocar de serviço: cancelar e criar outro (dois passos, confirmados juntos).
- Recorrente: `horaInicioOriginal` identifica a ocorrência; só ela é alterada.

## 4. Cancelar

1. Liste os próximos (`GET /agenda/agendamentos`) e peça para o cliente escolher.
2. **Confirme explicitamente**: o cancelamento não tem volta pela API.
3. ```
   DELETE /agenda/{idAgenda}                      # não recorrente
   DELETE /agenda/{idAgenda}?data=AAAA-MM-DD      # recorrente: só essa ocorrência
   ```
4. Ofereça remarcar (volta ao fluxo 2).

> "Não vou poder ir" respondendo a um lembrete: `POST /agenda/confirmacao {confirmado:false}` só marca *Não confirmado* (10) e **não libera o horário**. Para liberar, use o `DELETE`. Qual dos dois usar é decisão de negócio.

## 5. Tratamento de erros (resumo)

| Resposta | O que o agente faz |
|---|---|
| `200` com `horarios: []` | "Não há vaga nesse dia com esse barbeiro"; ofereça outro barbeiro ou dia. |
| `400 PARAMETRO_INVALIDO` / `CORPO_INVALIDO` | Bug do agente (formato de data/hora, GUID): registre e não exponha detalhes. Em `horarios-livres`/`POST`, também pode ser loja fechada, fora do prazo ou barbeiro que não faz o serviço → ofereça alternativas. |
| `401` | Chave inválida: falha de configuração. Encaminhe para um humano e alerte a operação. |
| `403 LOJA_FORA_ESCOPO` / `ACESSO_NEGADO` | Falha de configuração: encaminhe para um humano. |
| `404 NAO_ENCONTRADO` | Agendamento ou cliente não existe mais: recarregue a lista e pergunte de novo. |
| `409 CONFLITO` | Regra de negócio (ex.: status incompatível, horário tomado): recarregue a grade e ofereça outra opção. |
| Timeout / 5xx | **Não repita escrita às cegas**: consulte `/agenda/agendamentos` para ver se o POST/PUT/DELETE foi aplicado. |

Registre sempre `code` e `traceId` ([00](00-autenticacao-e-erros.md#erros)).

## 6. Regras de ouro

- **Nunca** ofereça horário que não veio de `/horarios-livres` na mesma conversa.
- **Nunca** agende com o profissional `ZZ TESTE INTEGRACAO - NAO AGENDAR` (id `1cee0bb9-e58b-4428-9e9b-1db184db7943`), exceto em teste automatizado.
- **Sempre** peça confirmação explícita antes de `POST`, `PUT` e `DELETE`.
- Mostre ao cliente só os dados **dele**. `/agenda/completa` tem dados de todos os clientes.
- A chave de API fica só no servidor do agente (variável de ambiente), nunca no prompt do LLM nem em logs.
- Datas: `data` e `horaInicio` separados no POST; `AAAA-MM-DDTHH:mm:ss` no PUT; tudo no horário de São Paulo, **sem `Z` nem offset**.
