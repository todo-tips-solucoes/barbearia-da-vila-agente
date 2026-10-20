# Data model: mensagens-agendadas

**Migração**: `db/migrations/0010_mensagens_agendadas.sql` (idempotente, VII), sobre a tabela criada em `0001`.
Banco `barbearia_vila_teste` (TESTE); PROD recebe a mesma migração, inativo.

## Entity: mensagens_agendadas (evolução)

| Campo | Tipo | Regra | Origem |
|-------|------|-------|--------|
| id | bigint identity | PK; vai no `RowId` da lista (`bvc:<id>:s`/`bvc:<id>:n`) | 0001 |
| contato_id | bigint FK contatos | destinatário | 0001 |
| tipo | text | `confirmacao` \| `lembrete` \| `pos_atendimento` | 0001 |
| previsto_para | timestamptz | horário de envio (calculado em São Paulo) | 0001 |
| graces_agendamento_id | text | `idAgenda` | 0001 |
| agendamento_canal_id | text | sem uso (não há agendamento no canal, research D1); mantida, nula | 0001 |
| situacao | text | `pendente` \| `enviada` \| `cancelada` \| `falhou` (novo) | 0001 + 0010 |
| graces_cliente_id | text | `idCliente` do agendamento (pode ser terceiro); usado na revalidação | novo |
| id_profissional | text | `idProfissional`; trava de TESTE (só barbeiro de teste) | novo |
| inicio | timestamp (sem fuso) | `horaInicio` da Graces, como a Graces devolve | novo |
| dados | jsonb | só `{servico, barbeiro, fim}` para compor o texto; nunca texto do cliente (FR-021) | novo |
| tentativas | smallint default 0 | envios recusados | novo |
| proxima_tentativa_em | timestamptz null | backoff 1/5/15 min | novo |
| reservada_em | timestamptz null | posse da varredura; vencida após `mensagens.reserva_s` | novo |
| enviada_em | timestamptz null | preenchida com `enviada` | novo |
| motivo | text null | código sem PII: `ja_passou`, `fora_da_lista`, `sem_contato`, `orfa`, `status_<n>`, `incerto`, `recusada_canal`, `reagendada`, `cancelada_agente`, `fora_do_teste`, `teto` | novo |
| resposta | text null | `confirmada` \| `recusada` (só `confirmacao`) | novo |
| respondida_em | timestamptz null | | novo |
| criado_em / atualizado_em | timestamptz | | 0001 |

Constraints e índices:

- `DROP CONSTRAINT mensagens_agendadas_graces_agendamento_id_tipo_key`; `CREATE UNIQUE INDEX ... (graces_agendamento_id, tipo) WHERE situacao = 'pendente'` (FR-002 entre pendentes; histórico enviado preservado, FR-012).
- `CHECK (situacao IN ('pendente','enviada','cancelada','falhou'))`; `CHECK ((situacao = 'enviada') = (enviada_em IS NOT NULL))`; `CHECK (resposta IS NULL OR tipo = 'confirmacao')`.
- Índice `(contato_id, tipo) WHERE situacao = 'enviada' AND resposta IS NULL` (lookup da resposta por contato).
- Mantém `mensagens_agendadas_situacao_previsto_idx`.

### State transitions

```text
pendente --envio 2xx--> enviada --resposta--> enviada(resposta)
pendente --cancelar/reagendar/orfa/status!=2/fora_da_lista--> cancelada
pendente --recusa canal (retentativas<3)--> pendente(proxima_tentativa_em)
pendente --recusa após 3 retentativas | timeout | reserva vencida--> falhou
```

`enviada`, `cancelada` e `falhou` são finais; só `pendente` é apagada (cancelada) num cancelamento/reagendamento.

## Entity: falhas_agente (tipo novo)

`CHECK (tipo IN ('graces','chatmaster','agente','turno','midia','mensagem'))`. Uma linha por falha desta feature:
`motivo` (`mensagem|envio_falhou`, `mensagem|envio_incerto`, `mensagem|graces_confirmacao`, `mensagem|reconciliacao`),
`operacao` (tipo da mensagem ou `confirmar`), `code`, `status_http`, `contato_id`. Sem telefone, nome ou texto.

## Entity: conversas.pedido (chave nova)

`confirmacao_recusada: {idAgenda, em}` gravado no "não vou poder" (research D7) para o agente oferecer remarcar ou
cancelar no turno seguinte; limpo quando o agente remarca/cancela ou após o início do atendimento.

## Entity: mensagens (uso)

As respostas do `bv-confirmacao` e os textos enviados pelo `bv-mensagens` entram como `direcao = 'saida'`, como as
saídas do agente, para o histórico do turno seguinte.

## Valores calculados (não persistidos)

`bvMProgramar({idAgenda, idCliente, idProfissional, inicio, fim, servico, barbeiro}, agora, cfg)` →
`[{tipo, previsto_para}]` + `[{tipo, motivo:'ja_passou'}]`. Datas tratadas como horário local de São Paulo
(`America/Sao_Paulo`), inclusive virada de dia/mês; o Brasil não tem horário de verão desde 2019, mas o cálculo
usa o fuso nomeado e não um offset fixo.
