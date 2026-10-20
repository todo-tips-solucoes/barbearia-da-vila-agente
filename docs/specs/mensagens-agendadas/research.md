# Research: mensagens-agendadas

**Feature**: `mensagens-agendadas` | **Data**: 2026-10-20 | **Spec**: [spec.md](spec.md) | **Sonda**: [sonda-botao.md](sonda-botao.md)

Fontes usadas: `graces-api/04-agendamentos.md`, `chatmasterveloz-api/12-botoes-no-whatsapp/api-botao-quick-reply-pro.md`,
`chatmasterveloz-api/01-mensagem/api-criar-agendamento.md`, [sonda-botao.md](sonda-botao.md) (medida pelo owner/pai em 2026-10-20),
fixtures `tests/fixtures/chatmaster/evento-21.json` a `evento-25.json`, código atual (`workflows/shared/*.js`,
`workflows/sub/*.json`, `db/migrations/0001..0009`). Nenhum eixo estrutural novo: n8n, Postgres e Chat Master já decididos pelo owner.

## Decision 1: agendador próprio no n8n para os três tipos

**Decision**: um workflow novo, `bv-mensagens`, com Schedule Trigger de 1 min (`mensagens.varredura_s`), varre
`mensagens_agendadas` (situação `pendente`, `previsto_para <= now()`, `proxima_tentativa_em` nula ou vencida),
reserva as linhas de forma atômica (`FOR UPDATE SKIP LOCKED` + `reservada_em`) e envia:

- confirmação: **lista** `POST /api/messages/whatsmeow/sendListPRO` (o mesmo envio do `entregar-rajada`,
  `openTicket: '1'`, `queueId: '0'`) com duas linhas cujos `RowId` são `bvc:<mensagem_id>:s` (título
  `mensagens.titulo_sim`, "Confirmar presença") e `bvc:<mensagem_id>:n` (`mensagens.titulo_nao`, "Não vou
  poder"). Decisão do owner (dec-007, 2026-10-20): "o seletor de botao [...] apenas para api oficial. vamos
  evitar de usar para api qrcode. para confirmação de agendamento use o botao em lista." O `sendButtonsPRO`
  da sonda (b) **não é usado**;
- lembrete e pós-atendimento: o mesmo construtor de texto do `entregar-rajada` (`/api/messages/send`, ou
  `sendTextPROLid` para contato `@lid`, `openTicket: '0'`).

Cancelar ou reagendar passa a ser só `UPDATE` local (`situacao = 'cancelada'`): a mensagem nunca saiu do
nosso banco, então não há o que apagar no canal.

Garantias da varredura (SC-007): `mensagens.reserva_s` maior que o timeout HTTP do envio com folga; uma reserva
vencida encontrada pela varredura seguinte vira `falhou` (motivo `incerto`), nunca reenvio; o `UPDATE` final do
resultado exige `situacao = 'pendente' AND reservada_em = <a própria reserva>`. Teto de envios por varredura
(`mensagens.max_por_varredura`) e por contato/dia (`mensagens.max_por_contato_dia`) contra disparo em massa por
defeito. A execução do `bv-mensagens` não salva dados (`saveData*` = `none`). O usuário "Agente IA" (id 100,
FR-004) segue o mesmo envio do agente, que hoje não passa campo de usuário; **[PENDENTE]**: conferir na
implementação se a doc da API tem campo de usuário e, se tiver, incluí-lo nos dois fluxos.

**Rationale**: a sonda (a) mediu que o agendamento nativo (`POST /api/schedules`) não envia botão na QR Pro
(`interativo: null` no eco) e gerou um evento `acao: "closed"`. A confirmação já precisaria do agendador
próprio. Usar o mesmo agendador para lembrete e pós evita dois mecanismos, elimina a exclusão no canal (e suas
falhas: FR-013, US3-5) e deixa a idempotência inteira no Postgres. Equivalência com a spec: FR-010/FR-011/FR-013
("apagar no canal") ficam satisfeitos pela garantia mais forte de que nada pendente sai, porque o envio só
ocorre a partir do registro local com situação `pendente`; o comportamento visto pelo cliente é o mesmo.
FR-INFRA-SCHED já previa o fallback de varredura de 1 min.

**Alternatives considered**: `/api/schedules` para lembrete/pós e agendador só para a confirmação (dois
mecanismos, exclusão remota sujeita a falha, evento `closed` sem efeito conhecido); `/api/schedules` para tudo
(sem botão: rejeitado pela sonda).

## Decision 2: revalidar na Graces antes de enviar

**Decision**: antes de cada envio, `GET /agenda/agendamentos?idCliente=<graces_cliente_id>&proximos=true`. Se
o `idAgenda` não aparece ou o `horaInicio` mudou, a linha vira `cancelada` (motivo `orfa`) sem enviar. A
confirmação só sai se `idStatusAgenda = 2` ("A confirmar"); com outro status vira `cancelada` (motivo
`status_<n>`). Linha sem `graces_cliente_id` (criada pela reconciliação) é revalidada pela `GET /agenda/completa` do
dia do início, procurando o `idAgenda` (revisão 2026-10-20, item 6). A ocorrência vale por `(idAgenda, horaInicio)`
(recorrente repete o `idAgenda`). Lembrete e pós com status 10 ("Não vou poder") viram `cancelada` (motivo `recusada`):
decisão do owner em 2026-10-20 ("Cancelar os dois").

**Rationale**: IX (Graces é a fonte da verdade) e US3-6; cobre cancelamento pela equipe entre duas
reconciliações. `POST /agenda/confirmacao` só funciona com status 2 (`04-agendamentos.md`).

**Alternatives considered**: confiar só na reconciliação de 15 min (deixa janela de envio indevido).

## Decision 3: programação imediata a partir do `bv-graces`

**Decision**: quando a proposta termina `executada` (agendar, conjunto, reagendar, trocar_servico, cancelar),
o `bv-graces` calcula as linhas com a função pura `bvMProgramar(ag, agora, cfg)` em `workflows/shared/mensagens.js`
e as grava no mesmo `Persistir` (CTEs novos): cancelar → cancela as pendentes do `idAgenda`; reagendar → cancela
as pendentes e insere o conjunto novo; agendar/conjunto → insere por `idAgenda`. A mesma função é usada pela
reconciliação (Decision 7).

Horários (America/Sao_Paulo, sem offset, como a Graces):

| Tipo | Horário | Regra |
|------|---------|-------|
| confirmacao | 18:00 do dia anterior ao início (`mensagens.confirmacao_hora`) | se já passou, não programa |
| lembrete | início − 2 h (`mensagens.lembrete_antes_min`) | se já passou, não programa |
| pos_atendimento | término + 1 h (`mensagens.pos_depois_min`) | término = `horaFim` da Graces ou início + `tempoPadrao` |

O que não é programado gera um registro de motivo (Decision 9), nunca envio atrasado (FR-003).

**Rationale**: SC-001 exige a programação ao concluir o agendamento; esperar a reconciliação de 15 min perderia o
lembrete de agendamentos próximos. `POST /agenda` devolve `idAgenda` (`04-agendamentos.md`, linha 81) e o PUT
mantém o `idAgenda`; o término vem de `horaFim` (GET) ou de `tempoPadrao` do serviço já carregado no agente.

**Alternatives considered**: programar só pela reconciliação (atraso de até 15 min); workflow separado
disparado pelo agente (mais uma chamada que pode falhar sem ganho).

## Decision 4: esquema (migração 0010)

**Decision**: `db/migrations/0010_mensagens_agendadas.sql` evolui a tabela de 0001: troca
`UNIQUE (graces_agendamento_id, tipo)` por índice único parcial `WHERE situacao = 'pendente'`, acrescenta a
situação `falhou` e as colunas de [data-model.md](data-model.md). As falhas vão para `falhas_agente` com o tipo
novo `mensagem` (mesma tabela já lida pelos relatórios do agente; `falhas_recepcao` é da borda do webhook).

**Rationale**: no reagendamento, um lembrete já enviado para o horário antigo não pode impedir o lembrete do
horário novo (FR-011/FR-012); idempotência continua garantida entre pendentes (FR-002). Migração idempotente (VII).

**Alternatives considered**: manter o UNIQUE e reaproveitar a linha (perde o histórico de enviada, viola FR-012).

## Decision 5: retentativa e envio incerto

**Decision**: recusa explícita do canal (HTTP 4xx/5xx com resposta) → até 3 tentativas em 1, 5 e 15 min
(`mensagens.retentativas_min`): envio inicial + até 3 retentativas; depois `falhou`. Status 0/timeout (incerto) → `falhou` com motivo `incerto`,
sem reenvio. A reconciliação não recria uma mensagem que já está `enviada` ou `falhou` para o mesmo
`idAgenda`, tipo e `previsto_para`.

**Rationale**: SC-007 (nunca duplicado) vence a entrega a qualquer custo; Clarify Q4 fixou 3 tentativas.

**Alternatives considered**: reenviar após timeout (risco de duplicata, rejeitado).

## Decision 6: resposta à lista — título como caminho primário, id quando medido

**Decision**: a seleção de lista chega hoje "pelo fluxo normal da recepção como mensagem de texto" com o título
da opção (`docs/specs/agente-conversacional-graces/contracts/saida-chatmaster.md`, "Resposta a uma lista";
`chatmasterveloz-api/.../api-mensagem-de-lista-pro.md:15`); o formato exato no webhook QR Pro segue
**não medido** (sonda S2 daquela feature; não há fixture de seleção de lista). Por analogia com o botão (sonda b),
é provável um segundo evento `from_internal` com o `RowId` no `dataJson`, mas isso não é afirmado aqui.

**Atualização medida (2026-10-20, sonda da lista, sonda-botao.md)**: cada seleção gera DOIS eventos: `start`
(`fromMe` false, só o título) e `from_internal` (`fromMe` false) com `mensagem.dataJson` (string JSON) contendo
`rawData.event.Message.listResponseMessage.singleSelectReply.selectedRowID` (o `RowId` enviado) e
`contextInfo.stanzaID` (= `wid` da lista enviada). Portanto o **caminho id é o primário** (`bvMReconhecer`:
`origem=id`, `bvc:<int>:(s|n)`); o título é o fallback para quando o `from_internal` não chega (espera
`mensagens.espera_texto_s`). O reenvio da mesma escolha gera um evento idêntico: o claim idempotente
(`resposta IS NULL`) evita segunda chamada à Graces, e a seleção de confirmação não gera turno do agente (o `start`
com título de confirmação aberta é desviado para `bv-confirmacao`, sem buffer). O texto abaixo é o desenho anterior à medição.

- **Caminho título (primário no desenho original; agora fallback)**: evento `start` cujo texto é exatamente `mensagens.titulo_sim` ou
  `mensagens.titulo_nao` e o contato tem confirmação enviada sem resposta → `bv-confirmacao` pelo caminho `texto`
  (sem buffer, sem turno do agente). Se há exatamente uma confirmação enviada sem resposta do contato, resolve
  por ela; com duas ou mais, segue como mensagem normal para o agente (que pergunta qual, via Decision 8).
  **Revisão 2026-10-20 (itens 1 e 5)**: o `from_internal` (id) e o `start` (título) chegam para o MESMO toque. O título é
  consumido (nunca vai ao agente) quando há confirmação respondida há menos de 2 × `mensagens.espera_texto_s` (o id
  já tratou o toque: `repetida`, em silêncio) ou quando há confirmação aberta, nenhuma proposta `pendente` do contato
  (dentro de `proposta.validade_min`) e a última saída para o contato foi a lista (`agendada-<id>`, tipo `lista`); senão
  é texto comum do agente ("Confirmo" ao resumo de um agendamento novo). Depois da espera, com 2+ abertas o título
  nunca escolhe: sem o id, responde `textos.confirmacao_escolher` pedindo para o cliente escolher.
- **Caminho id (após captura)**: se a captura de uma seleção real (pendência P3) mostrar o `RowId` em algum
  evento (ex.: `from_internal` com `fromMe: false`), a normalização (`shared/rajada.js`) passa a classificá-lo
  como `resposta_lista` quando o id tem prefixo `bvc:` e chama `bv-confirmacao` com o `mensagem_id` exato
  (FR-007 sem ambiguidade). Nesse caso o caminho título espera `mensagens.espera_texto_s` (10 s) para o evento
  com id chegar e vira no-op silencioso se a confirmação já foi respondida (dedupe dos dois eventos do mesmo
  toque). Os demais `from_internal` continuam descartados.
- Efeito idempotente: `UPDATE mensagens_agendadas SET resposta = $2, respondida_em = now() WHERE id = $1 AND
  resposta IS NULL RETURNING ...`. Só quem reivindica a linha chama a Graces e responde.

Segurança do caminho id: o id só é lido da estrutura de resposta de lista do evento (nunca do texto do cliente)
e o claim exige o mesmo `contato_id`. **Fallback se a lista não exibir (P4)**: Clarify Q3 — confirmação só em texto
pedindo para responder SIM ou NÃO, tratada pelo caminho de texto livre (Decision 8).

**Rationale**: o título funciona com o que a recepção já recebe; o id único no `RowId` elimina a ambiguidade
assim que o formato for medido. O claim torna a ordem de chegada irrelevante.

**Alternatives considered**: `sendButtonsPRO` com `selectedID` medido (vetado pelo owner, dec-007); títulos
diferentes por agendamento (ex.: com a hora) para desambiguar só pelo texto (`[PROPOSTA]` de evolução se o id
não vier no webhook); só o `from_internal` (perde a resposta se o evento faltar).

## Decision 7: efeito na Graces e respostas

**Decision**: `POST /agenda/confirmacao {idAgenda, confirmado}`; `confirmado: false` marca status 10 e não libera
o horário (`04-agendamentos.md`). Em TESTE, só `idAgenda` do barbeiro de teste (XI/XIII; a linha guarda
`id_profissional`). Antes de chamar: linha `cancelada` ou toque depois do início → sem Graces, texto
`textos.confirmacao_desatualizada`. Erro → `textos.confirmacao_falhou` (cordial) + falha registrada. Status 0/5xx: até 2 novas chamadas (1 s e 5 s);
como a confirmação só vale com status 2, o 409 (medido: repetir a confirmação devolve 409) é conferido por
`GET /agenda/agendamentos?idCliente` (ou `/agenda/completa` do dia, sem cliente): status 3 para confirmar / 10 para
recusar = sucesso; divergente = `desatualizada` (o claim é devolvido e a linha fica encerrada, motivo `divergente`);
sem leitura = `falhou`, atendendo FR-015. Ocorrência de série recorrente (`dados.recorrente`) manda `data`.
Confirmação já `enviada` sem resposta cujo agendamento o agente cancela, remarca ou troca fica encerrada (`motivo`
`cancelada_agente`/`reagendada`, `resposta` NULL; sem migração: `motivo` em `enviada` era sempre NULL): o toque na
lista antiga responde `textos.confirmacao_desatualizada`, sem Graces, e ela some do contexto do agente.
Respostas por textos de config: `confirmacao_ok`, `confirmacao_recusada` (oferece remarcar ou cancelar),
`confirmacao_repetida`, `confirmacao_desatualizada`, `confirmacao_falhou`; gravadas como `saida` em `mensagens`.
"Não vou poder" grava em `conversas.pedido.confirmacao_recusada` o `idAgenda`, para o agente conduzir a remarcação
no turno seguinte (FR-006).

**Rationale**: resposta imediata e previsível ao toque (SC-003 ≤ 30 s), sem gastar turno do LLM; a conversa normal
continua no agente.

**Alternatives considered**: gerar um turno sintético do agente para cada toque (custo, latência, risco de o
agente repetir a confirmação).

## Decision 8: texto livre (FR-009)

**Decision**: o agente ganha a ferramenta `confirmar_presenca {mensagem_id, confirmado}` (o `contato_id` é
injetado pelo workflow a partir do turno, nunca vem do modelo) (`toolWorkflow` para
`bv-confirmacao`, origem `agente`), e o `Ler contexto` do `entregar-rajada` passa a listar as confirmações
enviadas sem resposta cujo início ainda não chegou (Clarify Q2: janela até o início). O agente decide se a frase é
claramente equivalente; o `bv-confirmacao` aplica o mesmo claim e devolve o resultado para o agente responder.

**Rationale**: só o LLM distingue "vou sim" de "vou sim remarcar"; a regra de efeito fica num único lugar.

**Alternatives considered**: regex de frases (frágil, falso positivo grave).

## Decision 9: reconciliação periódica (FR-016)

**Decision**: ramo de 15 min do `bv-mensagens` (`mensagens.reconciliacao_min`): `GET /agenda/completa` de hoje
a hoje+7 (`mensagens.reconciliacao_dias`), casa `celularCliente` (`ddiCelular` + dígitos) com `contatos.telefone`;
cancela pendentes cujo `idAgenda` sumiu ou mudou de horário; cria as faltantes por `bvMProgramar`. Em TESTE,
considera só o barbeiro de teste e os contatos de `teste.contatos_escrita`. Contato não encontrado → motivo
`sem_contato` (FR-017), uma vez por `idAgenda`. Revisão 2026-10-20: a janela começa ontem (mesmo início do `Ler
estado`, para o pós de ontem não virar órfã); `idAgenda` repetido na janela (recorrente) é pulado e registrado uma vez
(`recorrente:<idAgenda>`), porque a chave única é `(idAgenda, tipo)`. Limite: recorrente com uma só ocorrência na janela
não é detectável pela `/agenda/completa` (não traz `recorrente`). Fora do TESTE, lê todos os barbeiros menos o de teste e
casa os contatos pelos telefones da própria agenda.

**Rationale**: `/agenda/completa` é o endpoint indicado para lembretes internos e cobre exatamente ±7 dias.

**Alternatives considered**: uma consulta por cliente (N chamadas; sem lista de clientes com agendamento).

## Decision 10: evento `acao: "closed"`

**Decision**: continua descartado pela recepção (`nao_mensagem`). Sem `/api/schedules` o evento não é esperado.
A lista vai com `openTicket: '1'` + `queueId: '0'`, que "mantém o status do ticket" (`0` encerraria, contrato
`saida-chatmaster.md`); lembrete e pós vão por `send` com `openTicket: '0'` ("não abre ticket"), igual ao agente.
**[PENDENTE de medição]**: confirmar no smoke que nenhum dos dois fecha um ticket de handoff aberto; se fechar,
bloquear o envio para contato com handoff aberto.

## Decision 11: status inicial do agendamento criado

**Decision**: **[PENDENTE de medição]** — a fonte não diz com que `idStatusAgenda` o `POST /agenda` cria o
agendamento. O smoke cria um agendamento com o barbeiro de teste e lê o status. Se nascer 2, o fluxo segue como
desenhado. Se nascer 3 (Confirmado), a confirmação não se aplica: a Decision 2 já a cancela com motivo
`status_3`, e o owner decide se a confirmação deve ser enviada mesmo assim (sem botão de efeito).

## Decision 12: parametrização e PROD inativo

**Decision**: chaves novas `mensagens.*` (inclui `atraso_max_min` `[PROPOSTA]` 30, `reserva_s`, `max_por_varredura`,
`max_por_contato_dia`, `repetida_max_por_hora`) e `textos.confirmacao_*`/`textos.lembrete`/`textos.pos` em
`config/ambientes/integracao.json` e `producao.json`; PROD com ids de workflow vazios e o deploy recusando (XIII).
Envio real só para `teste.contatos_escrita` (FR-018); demais contatos ficam `cancelada` com motivo `fora_da_lista`.
As travas de TESTE (só barbeiro de teste, `fora_da_lista`, `fora_do_teste`, envio simulado) valem só com
`ambiente = integracao` (revisão 2026-10-20, item 8). `producao.json` renderiza os workflows da feature (chaves sem
id de PROD ficam vazias: `implantar` pede `--criar`; `teste.*` segue recusado no deploy de PROD, sem id inventado).

## Decision 13: anonimizador de fixtures

**Decision**: `scripts/capturar-webhook.py fixtures` passa a numerar a partir do maior `evento-NN.json`
existente (sem sobrescrever) e a anonimizar recursivamente dentro de strings JSON (`dataJson`). As fixtures
22 e 24 tiveram `acao` mascarado (`"xxxxx"`/`"xxxxxx"`); a sonda registra os valores reais (`start` e `closed`),
que são restaurados (campo estrutural, não PII).

## Pendências

| Id | Item | Como fecha |
|----|------|------------|
| P1 | Status inicial do `POST /agenda` (Decision 11) | **MEDIDO (pai, sonda-botao.md "P1")**: nasce `idStatusAgenda` 2; `POST /agenda/confirmacao` `{confirmado:true}` → 200 e status 3; repetir → 409 "não está com status 'A confirmar'" (tratar 409 como já confirmado, idempotente) |
| P2 | Efeito de `openTicket: '0'` em ticket de handoff (Decision 10) | smoke com handoff aberto |
| P3 | **FECHADO** (ver Decision 6, atualização medida). Formato do evento de seleção de lista no webhook QR Pro: `start` só com título + `from_internal` com `selectedRowID`/`stanzaID` | o pai captura UMA seleção real pelo `bv-captura` (owner autorizou); vira fixture `evento-26+` e ativa o caminho id (Decision 6) |
| P4 | (lista de 3 linhas medida OK na sonda; 2 linhas ainda no smoke) Lista de 2 linhas com `RowId` `bvc:<id>:s` aceita e exibida | primeiro envio real ao owner no smoke |
