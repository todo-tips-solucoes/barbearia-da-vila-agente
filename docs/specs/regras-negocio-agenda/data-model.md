# Data Model: regras-negocio-agenda

Migração nova `db/migrations/0007_regras_agenda.sql`, idempotente, aplicada por `scripts/migrar.py`
em `barbearia_vila_teste`. Só amplia os `CHECK` de `propostas` (F3 `db/migrations/0006_agente.sql:25,27`);
nenhuma tabela nova. Nomes de estados e de chaves jsonb são `[PROPOSTA — a validar na implementação]`.
Nenhuma coluna guarda celular, documento ou corpo de resposta da Graces (constituição XIV).

## Entity: Proposta (`propostas`, ampliada)

| Campo | Mudança |
|-------|---------|
| `acao` | `CHECK` passa a aceitar também `agendar_conjunto`, `cancelar_conjunto`, `cadastrar_terceiro` |
| `estado` | `CHECK` passa a aceitar também `parcial` |
| `dados` | `agendar_conjunto`: `{idCliente, itens:[{ordem, idServico, servico, idProfissional, barbeiro, data, hora, minutos, valor}]}`. `cancelar_conjunto`: `{itens:[{ordem, idAgenda, horaInicio, recorrente, servico}]}`. `cadastrar_terceiro`: `{nome, celular, celular_do_remetente}` (`celular` só dígitos, DDD + número; é o do remetente quando o terceiro não tem, FR-007; apagado de `dados` quando a proposta termina) |
| `resultado` | + `itens:[{ordem, estado, idAgenda?, code?, trace_id?}]`, `tentativas` (0..1 repetição), `verificada` (bool) |

A migração troca o `CHECK` por `ALTER TABLE ... DROP CONSTRAINT IF EXISTS` + `ADD CONSTRAINT` com os
nomes que o Postgres gerou na 0006 (conferir com `\d propostas` no TESTE antes de escrever a 0007),
mantendo a idempotência (constituição VII).

Transições (acréscimos ao F3 `data-model.md`):

```text
executando -> executada   (todos os itens criados/cancelados, inclusive após verificação)
executando -> parcial     (algum item criado e um item seguinte falhou; só agendar_conjunto/cancelar_conjunto)
executando -> incerta     (escrita sem resposta, verificada sem conclusão ou repetição também incerta)
executando -> falhou      (nenhum item aplicado; inclui servico_nao_oferecido)
```

Item de conjunto: `pendente -> criado | falhou | incerto`; depois de um `falhou`, os seguintes ficam
`pendente` (não executados). `parcial` e `incerta` nunca voltam a `executando`: a nova tentativa é
proposta nova só com os itens que faltaram (FR-011).

`cadastrar_terceiro` com `cfg.cadastroLiberado` falso termina `falhou` com `cadastro_desabilitado`
sem chamar a Graces.

## Entity: Conversa (`conversas`, sem mudança de esquema)

Chaves novas no jsonb `pedido` (só ids e rótulos curtos vindos da Graces ou do fluxo):

| Chave | Conteúdo |
|-------|----------|
| `handoff` | `true` após `encaminhar_equipe` e transferência ao setor 78; o agente não responde mais nessa conversa |
| `servicos` | encadeamento: `[{opcao_id, idServico, nome, preco}]` em ordem |
| `modo_encadeamento` | `mesmo_barbeiro` \| `barbeiros_diferentes` \| `separados` |
| `faltantes` | serviços de um conjunto `parcial` que não foram criados |
| `para_terceiro` | `true` quando `idCliente` é de um terceiro com o **mesmo** celular do remetente (acesso total); terceiro com outro celular nunca vira `idCliente` (block-003) |
| `idCliente_remetente` | `idCliente` do remetente, guardado ao trocar para o terceiro |
| `terceiro_sem_cadastro` | nome buscado sem resultado (habilita `cadastrar_terceiro` com esse nome) |
| `buscas_pessoa` | contador de `buscar_pessoa` na sessão (teto `terceiro.buscas_max_sessao`) |
| `busca_pessoa_turno` | `turno_id` da última busca (trava de turno de `escolher_pessoa`) |
| `oferta_restante` | itens da oferta de horários que passaram da capacidade do turno (Decision 3) |

`pedido` volta a `{}` (com `pedido_anterior`) ao abrir sessão nova, como na F3; `para_terceiro` não
sobrevive à sessão.

Tipos novos de `opcoes.tipo`: `pessoa` (`valor =
{idCliente, nome, mesmo_celular}`; `mesmo_celular` é calculado na busca e o celular em si não é guardado), `modo_encadeamento` (`barbeiros_diferentes`, `separados`), `sequencia` (início de
um encadeamento: `valor = {data, itens:[{idServico, idProfissional, apelido, hora, minutos, valor}]}`).
A oferta de horários ganha `completa: true`.

## Entity: Falha do agente (`falhas_agente`, sem mudança de esquema)

Motivos novos (texto livre já aceito): `configuracao`, `parametro_invalido`, `nao_encontrado`,
`conflito`, `sem_resposta`, `code_desconhecido`, `escrita_incerta`, `escrita_repetida`,
`estagios_esgotados`, `conjunto_parcial`, `encaminhar_equipe|terceiro_outro_celular`,
`encaminhar_equipe|nome_outro_celular` (research Decision 6; sem nome nem celular), `handoff_falhou` (transferência ao setor 78 falhou). Sempre com `code` e `trace_id` quando houver; nunca `detail`.

## Entity: Serviço, Pessoa atendida (só Graces)

Não são persistidos: vêm da Graces a cada consulta. Serviço "2ª vez" = `descricaoAgenda` (ou
`descricaoAgendaOnline` da seção) que casa `BV_SEGUNDA_VEZ` (`workflows/shared/agente.js:7`). Pessoa atendida = `pedido.idCliente` (remetente ou terceiro).

Primeiro contato: `identificar_cliente` (F3) acha o remetente pelo celular do WhatsApp; sem cadastro,
`pedido.cliente_sem_cadastro = true` e `cadastrar_cliente` só cria se a busca pelo nome não achar o
mesmo nome completo com outro celular; achando, `encaminhar_equipe` e `pedido.idCliente` fica nulo.
