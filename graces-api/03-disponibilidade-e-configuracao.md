---
title: "Disponibilidade e configuração da agenda"
slug: disponibilidade-e-configuracao
source: https://api.gracesonline.com.br/docs/agendamentos
fetched: 2026-10-18
endpoints:
  - GET /public/v1/agenda/horarios-livres
  - GET /public/v1/agenda/horarios
  - GET /public/v1/agenda/configuracao
---
# Disponibilidade e configuração da agenda

> Fontes: <https://api.gracesonline.com.br/docs/agendamentos>, <https://api.gracesonline.com.br/docs/configuracao> · [Voltar ao índice](README.md)

Todas as datas e horas seguem o **fuso da loja** (São Paulo) e vêm **sem offset**: `2026-06-30T10:00:00`.

## GET `/public/v1/agenda/horarios-livres` ⭐ (use este para oferecer horários)

Grade pronta dos horários em que ainda cabe o serviço, já sem as ocupações.

| Query | Tipo | Obrig. | Descrição |
|---|---|---|---|
| `idServico` | guid | **sim** | Serviço a agendar (define a duração do slot). |
| `idProfissional` | guid | **sim** | Profissional consultado. |
| `data` | string | **sim** | Dia (`AAAA-MM-DD`), de hoje em diante. |

Resposta `200` (real, corte adulto, 2026-10-19):

```json
{
  "data": "2026-10-19", "minutos": 40, "origemMinutos": "profissional", "intervaloMinutos": 40,
  "funcionamento": { "horaInicio": "12:00", "horaFim": "22:00" },
  "horarios": ["12:00","12:40","13:20","14:00","14:40","15:20","16:00","16:40","17:20","18:00","18:40","20:00","20:40","21:20"]
}
```

Regras:

- A grade começa na abertura da loja e anda de `intervaloMinutos` em `intervaloMinutos`. Um horário só entra se o serviço couber inteiro antes do fechamento.
- `origemMinutos`: `profissional` (tempo próprio do profissional para o serviço) ou `franquia` (tempo padrão do serviço).
- Para **hoje**, a antecedência mínima da loja corta o começo da grade.
- **Dia sem vaga → `200` com `horarios: []`**. Não é erro.
- **`400`** quando: a loja não abre no dia; a data passa do prazo máximo; o serviço não está disponível na loja; ou o profissional não executa o serviço.
- A consulta é **por profissional**. Se o cliente aceitar "qualquer barbeiro", consulte cada profissional do serviço (sem o de teste) e junte os resultados.
- **Medido em 2026-10-28 (barbeiro de teste):** a grade é uma treliça fixa de `intervaloMinutos` (40) a partir da abertura, para qualquer serviço (até os de 30 e 80 min). Um atendimento lançado fora dela pelo portal (12:50–13:30) derruba os inícios 12:40 e 13:20, e o início 13:30 **nunca** aparece. Para oferecer esses encaixes, o agente junta a grade com o fim de cada ocupação de `GET /agenda/horarios` e confere se o serviço cabe no livre (`bvgLivre` em `workflows/shared/graces.js`). O `POST /agenda` aceita início fora da treliça.
- `GET /agenda/horarios` traz também a jornada do barbeiro como bloqueio (`tipo: 2`, ex.: 08:00–09:20 antes de ele começar), então "fora das ocupações e dentro do funcionamento" é livre de verdade.

## GET `/public/v1/agenda/horarios`

Ocupações de um profissional num dia (agendamentos existentes e bloqueios). **Não** gera a grade de horários livres; para isso, use `/horarios-livres`.

Mesmos parâmetros (`idServico`, `idProfissional`, `data`, todos obrigatórios).

```json
{ "data": "2026-10-19", "minutos": 40,
  "horarios": [ { "horaInicio": "19:20", "horaFim": "20:00", "tipo": 1 } ] }
```

`tipo`: `1` = agendamento · `2` = bloqueio.

## GET `/public/v1/agenda/configuracao`

Antecedência mínima e máxima de reserva, e horário de funcionamento por dia da semana.

| Campo | Tipo | Descrição |
|---|---|---|
| `prazoMinimoAntecedencia` | integer | Antecedência mínima para reservar, em **minutos**. |
| `prazoMaximo` | integer | Janela máxima para reservar, em **dias**. |
| `horarios` | array | `{ dia, horaInicio, horaFim }` por dia da semana. |

Resposta **real** (2026-10-18):

```json
{ "prazoMinimoAntecedencia": 0, "prazoMaximo": 0,
  "horarios": [
    {"dia":"Segunda-Feira","horaInicio":"12:00","horaFim":"22:00"},
    {"dia":"Terça-Feira","horaInicio":"08:00","horaFim":"22:00"},
    {"dia":"Quarta-Feira","horaInicio":"08:00","horaFim":"22:00"},
    {"dia":"Quinta-Feira","horaInicio":"08:00","horaFim":"22:00"},
    {"dia":"Sexta-Feira","horaInicio":"08:00","horaFim":"22:00"},
    {"dia":"Sábado","horaInicio":"08:00","horaFim":"19:30"},
    {"dia":"Domingo","horaInicio":"08:00","horaFim":"16:00"} ] }
```

> ⚠️ **Divergências com o portal:**
> - `dia` vem como **texto em português** (`"Segunda-Feira"`), não como número (`1`) como no exemplo do portal.
> - Na loja, `prazoMinimoAntecedencia` e `prazoMaximo` estão em **`0`**. A fonte não diz o que `0` significa (sem limite? desligado?), então **não presuma**: confie no `400` de `/horarios-livres` e do `POST /agenda` para saber se a data é aceita.
