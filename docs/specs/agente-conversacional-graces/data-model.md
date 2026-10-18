# Data Model: agente-conversacional-graces

Migração nova `db/migrations/0006_agente.sql`, idempotente (`IF NOT EXISTS`), aplicada por
`scripts/migrar.py` no banco do ambiente (`barbearia_vila_teste` no TESTE). Nomes de tabela e coluna
são `[PROPOSTA — a validar na implementação]`; tipos seguem o padrão das migrações 0001–0005.
Nenhuma tabela guarda token, chave ou payload bruto da Graces/Chat Master (constituição XIV).

## Entity: Turno (`turnos`, nova)

| Campo | Tipo | Regra |
|-------|------|-------|
| `turno_id` | uuid PK | vem da recepção (`entrega-turno.md`) |
| `contato_id` | bigint FK `contatos(id)` ON DELETE CASCADE | |
| `estado` | text | `em_andamento` \| `concluido` \| `falhou` |
| `iniciado_em` | timestamptz | default `now()` |
| `concluido_em` | timestamptz | nulo enquanto `em_andamento` |

Transições: `em_andamento → concluido` (respostas enviadas ou contingência) e
`em_andamento → falhou` (erro antes de qualquer envio; a recepção reentrega). Um turno `concluido`
nunca volta (FR-018). Retenção: apagado junto com o contato; limpeza por idade fica com a política
LGPD de `infra-base`.

## Entity: Conversa (`conversas`, nova, 1:1 com `contatos`)

| Campo | Tipo | Regra |
|-------|------|-------|
| `contato_id` | bigint PK FK `contatos(id)` ON DELETE CASCADE | |
| `sessao_iniciada_em` | timestamptz | reiniciada quando a última entrada passou de `conversa.janela_recencia_min` |
| `ultima_entrada_em` | timestamptz | instante da última mensagem do cliente tratada |
| `pedido` | jsonb | `{etapa, idCliente, nomeCliente, idServico, servico, idProfissional, barbeiro, data, origem_agendamento?}`; só ids e rótulos curtos |
| `opcoes` | jsonb | última oferta: `{tipo, itens:[{id, rotulo, valor}]}`; `valor` é o id real (idServico, idProfissional, `HH:mm`, idAgenda) |
| `atualizado_em` | timestamptz | |

Regras: `pedido` e `opcoes` só são escritos pelo `bv-graces` (dados vindos da Graces) e pelo fluxo,
nunca com texto livre do modelo. Ao abrir sessão nova, `pedido` vai para `pedido_anterior` dentro do
mesmo jsonb com `abandonado=true` (Decision 2) e `opcoes` é zerado.

## Entity: Proposta (`propostas`, nova)

| Campo | Tipo | Regra |
|-------|------|-------|
| `id` | uuid PK | também enviado como `idIntegracao` no `POST /agenda` |
| `contato_id` | bigint FK | |
| `turno_id` | uuid | turno em que foi criada |
| `acao` | text | `agendar` \| `reagendar` \| `cancelar` \| `trocar_servico` |
| `dados` | jsonb | ids para a escrita: `idCliente`, `idServico`, `idProfissional` (escolhido), `idProfissional_escrita` (TESTE: o de teste), `data`, `horaInicio`, `idAgenda`, `horaInicioOriginal`, `valor` |
| `estado` | text | `pendente` \| `executando` \| `executada` \| `incerta` \| `falhou` \| `substituida` \| `expirada` |
| `resultado` | jsonb | `{idAgenda?, code?, status?, traceId?}` |
| `criada_em`, `atualizada_em` | timestamptz | |

Índice único parcial: uma `pendente` por `contato_id`. Transições:

```text
pendente -> executando (UPDATE ... WHERE estado='pendente', turno posterior ao turno_id, dentro de proposta.validade_min)
pendente -> substituida (nova proposta do mesmo contato) | expirada (validade vencida)
executando -> executada (2xx) | falhou (4xx com code) | incerta (timeout/5xx)
incerta -> executada | falhou (após GET /agenda/agendamentos?idCliente=)
```

Só `executada` muda a Graces. A suíte de TESTE usa esta tabela para saber o que cancelar (SC-010).

## Entity: Mensagem de saída (`mensagens`, existente)

Sem mudança de esquema. O agente grava `direcao='saida'`, `tipo='texto'` (lista também é `texto`,
conteúdo = texto + títulos das opções), `mensagem_id_canal = 'out-<turno_id>-<n>'` (UNIQUE já
existente, 0001:14). A linha é inserida antes do envio; o resultado do envio fica em `falhas_agente`
quando não for 2xx. A leitura do histórico usa `mensagens` filtrado por `contato_id` e
`criado_em >= conversas.sessao_iniciada_em`, limitado a `agente.mensagens_contexto`.

## Entity: Contato (`contatos`, existente)

Sem mudança de esquema. `nome` e `graces_cliente_id` passam a ser preenchidos quando o celular tem
exatamente um cliente na Graces ou o cliente diz para quem é; com vários clientes no celular, o
escolhido fica em `conversas.pedido.idCliente` (pode mudar por turno, ex.: pai e filho).

## Entity: Falha do agente (`falhas_agente`, nova)

| Campo | Tipo | Regra |
|-------|------|-------|
| `id` | bigint identity PK | |
| `tipo` | text | `graces` \| `chatmaster` \| `agente` \| `turno` |
| `motivo` | text | snake_case curto, ex. `erro_modelo`, `envio_falhou`, `escrita_incerta`, `turno_duplicado` |
| `operacao` | text nulo | ferramenta ou endpoint lógico (`agendar`, `enviar_lista`) |
| `code` | text nulo | `code` do ProblemDetails da Graces |
| `status_http` | int nulo | |
| `trace_id` | text nulo | `traceId` da Graces |
| `contato_id` | bigint nulo | sem telefone, nome ou texto (FR-017) |
| `criado_em` | timestamptz | |

`CHECK` de `tipo` com a lista acima. Nunca guarda corpo de request/response.

## Entity: Opção de escolha (em `conversas.opcoes`)

`{id, rotulo, valor}`: `id` curto e estável dentro da oferta (vira `RowId` da lista Pro), `rotulo` é
o `title` exibido (truncado a `lista.max_titulo`), `valor` é o id real usado pelas ferramentas. O
modelo só referencia `id`; o `Compor` recusa `id` fora da oferta corrente.
