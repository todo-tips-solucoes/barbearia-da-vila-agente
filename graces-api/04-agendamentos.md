---
title: "Agendamentos"
slug: agendamentos
source: https://api.gracesonline.com.br/docs/agendamentos
fetched: 2026-10-18
endpoints:
  - GET /public/v1/agenda/agendamentos
  - POST /public/v1/agenda
  - PUT /public/v1/agenda/{idAgenda}
  - DELETE /public/v1/agenda/{idAgenda}
  - POST /public/v1/agenda/confirmacao
  - GET /public/v1/agenda/pacotes
  - GET /public/v1/agenda/historico
  - GET /public/v1/agenda/completa
---
# Agendamentos

> Fonte: <https://api.gracesonline.com.br/docs/agendamentos> · [Voltar ao índice](README.md) · Para disponibilidade, ver [03](03-disponibilidade-e-configuracao.md)

Datas no fuso da loja, sem offset.

## Status da agenda (`idStatusAgenda`)

| id | `status` | Observação |
|---|---|---|
| 2 | A confirmar | Único status em que `POST /agenda/confirmacao` funciona. |
| 3 | Confirmado | |
| 9 | Não compareceu | |
| 10 | Não confirmado | Resultado de confirmação recusada (`confirmado: false`). |

A fonte lista só esses quatro. O status "cancelado" não aparece: agendamento cancelado deixa de ser listado. *(Isso é inferência, não está escrito no portal; validar.)*

## GET `/public/v1/agenda/agendamentos` — agenda de um cliente

Agendamentos de um cliente: os futuros, ou os dos últimos 60 dias. Séries recorrentes são expandidas em ocorrências. Paginado (`X-Pagination`).

| Query | Tipo | Obrig. | Descrição |
|---|---|---|---|
| `idCliente` | guid | **sim** | Cliente consultado. |
| `proximos` | boolean | não | `true` (padrão) = futuros; `false` = últimos 60 dias. |
| `pageNumber` / `pageSize` | integer | não | Paginação (50; máx. 200). |

```json
[
  {
    "idAgenda": "3fa85f64-...", "horaInicio": "2026-06-30T10:00:00", "horaFim": "2026-06-30T10:45:00",
    "idServico": "8f3a9c2d-...", "descricaoServico": "Corte feminino",
    "idProfissional": "b7c8d9e0-...", "profissional": "Júlia",
    "idStatusAgenda": 3, "status": "Confirmado", "recorrente": false, "servicoPacote": null
  }
]
```

**Para o agente:** é o ponto de partida para **cancelar** e **reagendar**. Liste, peça ao cliente para escolher **qual** agendamento, e guarde `idAgenda`, `horaInicio` (vira `horaInicioOriginal` no PUT), `idProfissional`, `idServico` e `recorrente`.

## POST `/public/v1/agenda` — criar agendamento

Valida se o serviço está ativo na loja, se o profissional é elegível e a janela de antecedência. Informe **`idServico` (avulso) ou `idClienteItemPacote` (seção de pacote), exatamente um dos dois**.

| Campo | Tipo | Obrig. | Descrição |
|---|---|---|---|
| `idCliente` | guid | **sim** | Cliente. |
| `idServico` | guid | um dos dois | Serviço. Obrigatório se não enviar `idClienteItemPacote`. |
| `idClienteItemPacote` | guid | um dos dois | Seção de pacote a consumir (ver `/agenda/pacotes`). O serviço vem da seção. |
| `idProfissional` | guid | **sim** | Profissional. |
| `data` | string | **sim** | `AAAA-MM-DD`, de hoje em diante. |
| `horaInicio` | string | **sim** | `HH:mm`. |
| `idIntegracao` | string | não | Identificador do parceiro para rastreio (volta igual na resposta). |

- Enviar os dois, ou nenhum, entre `idServico` e `idClienteItemPacote` → `400`. O que não for usado pode ir ausente, `null` ou `""`.
- Por seção de pacote: a seção é reservada na hora e some da lista de disponíveis. Ela precisa estar em aberto, ser do cliente e da loja, e o pacote não pode vencer antes da data.

```bash
curl -X POST "https://api.gracesonline.com.br/public/v1/agenda" \
  -H "X-Api-Key: $GRACES_API_KEY" -H "Content-Type: application/json" \
  -d '{ "idCliente": "a1b2c3d4-...", "idServico": "046519b1-...", "idProfissional": "0a327f00-...",
        "data": "2026-10-20", "horaInicio": "14:00", "idIntegracao": "whatsapp-agente" }'
```

```json
{ "sucesso": true, "idAgenda": "3fa85f64-...", "mensagem": "Agendamento criado.", "idIntegracao": "whatsapp-agente" }
```

**Para o agente:** sempre consulte `/horarios-livres` **imediatamente antes** de criar: o horário pode ter sido ocupado durante a conversa. Se o POST falhar com `400`/`409`, ofereça a grade atualizada. Use `idIntegracao` para identificar a origem (ex.: id da conversa) e facilitar a auditoria. A fonte **não diz se o POST é idempotente**: não repita a chamada automaticamente depois de um timeout; antes, consulte `/agenda/agendamentos` do cliente.

## PUT `/public/v1/agenda/{idAgenda}` — reagendar

Altera data/hora e profissional, **mantendo a duração**. Em recorrência, materializa a ocorrência indicada por `horaInicioOriginal`.

| Campo | Tipo | Obrig. | Descrição |
|---|---|---|---|
| `horaInicioOriginal` | string | (ver nota) | Data e hora atuais da ocorrência, `AAAA-MM-DDTHH:mm:ss`. Identifica a ocorrência, inclusive em recorrência. |
| `horaInicioNovo` | string | (ver nota) | Nova data e hora de início, `AAAA-MM-DDTHH:mm:ss`. |
| `idProfissional` | guid | **sim** | Profissional (mantém o atual ou troca). |

> O portal marca como obrigatório (`*`) só `idProfissional`, mas reagendar sem `horaInicioNovo` não faz sentido. Envie sempre os três.

```bash
curl -X PUT "https://api.gracesonline.com.br/public/v1/agenda/3fa85f64-5717-4562-b3fc-2c963f66afa6" \
  -H "X-Api-Key: $GRACES_API_KEY" -H "Content-Type: application/json" \
  -d '{ "horaInicioOriginal": "2026-06-30T10:00:00", "horaInicioNovo": "2026-06-30T11:00:00", "idProfissional": "b7c8d9e0-..." }'
```

```json
{ "sucesso": true, "idAgenda": "3fa85f64-...", "mensagem": "Agendamento alterado." }
```

Formatos: o POST usa `data` + `horaInicio` (`HH:mm`) separados; o PUT usa data e hora juntas (`AAAA-MM-DDTHH:mm:ss`). O PUT **não troca o serviço**: para mudar de serviço, cancele e crie outro.

## DELETE `/public/v1/agenda/{idAgenda}` — cancelar

Agendamento não recorrente: cancelamento simples. Recorrente: informe `?data=` para cancelar só aquela ocorrência (ela vira exceção na série).

| Parâmetro | Onde | Obrig. | Descrição |
|---|---|---|---|
| `idAgenda` | path | **sim** | Agendamento a cancelar. |
| `data` | query | se recorrente | Ocorrência a cancelar (`AAAA-MM-DD`). |

```bash
curl -X DELETE "https://api.gracesonline.com.br/public/v1/agenda/3fa85f64-5717-4562-b3fc-2c963f66afa6?data=2026-06-30" \
  -H "X-Api-Key: $GRACES_API_KEY"
```

```json
{ "sucesso": true, "idAgenda": "3fa85f64-...", "mensagem": "Agendamento cancelado." }
```

**Para o agente:** é irreversível pela API (não existe "descancelar"). **Sempre confirme com o cliente** (serviço, dia, hora, profissional) antes de chamar.

## POST `/public/v1/agenda/confirmacao` — confirmar ou recusar presença

Confirma ou recusa um agendamento (callback de lembrete ou self-service). O status atual precisa ser **"A confirmar" (2)**; fora disso, espere `409 CONFLITO`.

| Campo | Tipo | Obrig. | Descrição |
|---|---|---|---|
| `idAgenda` | guid | **sim** | Agendamento. |
| `confirmado` | boolean | **sim** | `true` → 3 (Confirmado); `false` → 10 (Não confirmado). |
| `data` | string | se recorrente | Ocorrência (`AAAA-MM-DD`). |

```json
{ "sucesso": true, "idAgenda": "3fa85f64-...", "idStatusAgenda": 3, "mensagem": "Agendamento confirmado." }
```

Recusar (`false`) **não cancela**: só muda o status para 10. Para liberar o horário, use o `DELETE`.

## GET `/public/v1/agenda/pacotes` — pacotes em aberto do cliente

Pacotes do cliente na loja que ainda têm seções agendáveis. Use para descobrir o `idClienteItemPacote`.

| Query | Tipo | Obrig. | Descrição |
|---|---|---|---|
| `idCliente` | guid | **sim** | Dono dos pacotes. |
| `idServico` | guid | não | Restringe às seções desse serviço. |
| `pageNumber` / `pageSize` | int | não | Paginação **por pacote** (50; máx. 200). |

```json
[
  { "idClientePacote": "b4d5e6f7-...", "descricao": "Pacote 10 Massagens",
    "dataInclusao": "2026-03-12T10:04:31", "dataValidade": "2026-09-12T00:00:00",
    "secoes": [ { "idClienteItemPacote": "c7e1f2a3-...", "idProdutoServico": "8f3a9c2d-...", "descricaoAgendaOnline": "Massagem Relaxante" } ] }
]
```

- Só lista o que é agendável: pacote em aberto e na validade, com seções em aberto, não vencidas e não reservadas. `dataValidade: null` = sem prazo.
- **As seções já vêm na ordem de consumo.** Com `idServico`, use **a primeira seção da lista**. Não reimplemente a regra.
- `GET /agenda/secao` foi **descontinuado** em 16/09/2026; use este endpoint.

**Para o agente:** a barbearia vende pacotes ("4 serviços com 20% de desconto"). Antes de agendar, consulte `/agenda/pacotes?idCliente=…&idServico=…`. Se houver seção, agende com `idClienteItemPacote` para abater do pacote, em vez de cobrar o serviço de novo.

## GET `/public/v1/agenda/historico` — serviços já realizados

Execuções do cliente (serviços, sessões de pacote, retornos), da mais recente para a mais antiga. Paginado.

| Query | Tipo | Obrig. |
|---|---|---|
| `idCliente` | guid | **sim** |
| `pageNumber` / `pageSize` | integer | não |

```json
[ { "idComanda": "c0ffee00-...", "numeroComanda": 1843, "dataAbertura": "2026-05-20T14:00:00",
    "idServico": "8f3a9c2d-...", "descricaoServico": "Corte feminino", "valorTotal": 90.00, "profissional": "Júlia" } ]
```

Útil para sugerir "o de sempre": último serviço e barbeiro.

## GET `/public/v1/agenda/completa` — agenda da loja

Profissionais online e os agendamentos e bloqueios de cada um (recorrências expandidas), numa janela de **até ±7 dias a partir de hoje**. Paginado **por profissional**.

| Query | Tipo | Obrig. | Descrição |
|---|---|---|---|
| `dataInicio` | string | **sim** | `AAAA-MM-DD`. |
| `dataFim` | string | **sim** | Ambas dentro de ±7 dias de hoje. |
| `pageNumber` / `pageSize` | integer | não | Profissionais por página. |

```json
[ { "idProfissional": "b7c8d9e0-...", "apelido": "Júlia", "funcao": "Cabeleireira", "corColuna": "#2A3760",
    "agendamentos": [ { "idAgenda": "3fa85f64-...", "horaInicio": "2026-06-30T10:00:00", "horaFim": "2026-06-30T10:45:00",
      "idStatusAgenda": 3, "status": "Confirmado", "nomeCliente": "Marina", "ddiCelular": "55",
      "celularCliente": "(11) 98888-7777", "nomeServico": "Corte feminino" } ] } ]
```

Traz dados de **todos** os clientes da loja. Não use para responder a um cliente: é para relatórios e lembretes internos.
