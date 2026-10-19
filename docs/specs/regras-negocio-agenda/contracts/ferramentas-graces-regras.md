# Contrato: ferramentas do agente, acréscimos desta feature

Estende F3 `docs/specs/agente-conversacional-graces/contracts/ferramentas-graces.md` (chamada,
entradas fixas, saída comum e regras 1–6 continuam valendo). Interface das ferramentas (nomes,
campos de entrada e saída, `code` internos em minúsculas) é `[PROPOSTA — a validar na implementação]`.
Endpoints e campos da Graces são **reais** e citam `graces-api/` (G).

## Campos novos aceitos por `bvGNormalizar`

`id_opcoes_servicos` (lista de 2..`encadeamento.max_servicos` ids curtos),
`id_opcoes_agendamentos` (lista de 2..`encadeamento.max_servicos` ids curtos), `celular` (só dígitos,
10–11, DDD + número). Campo desconhecido continua recusado (`campo_desconhecido`). Operações novas
em `BVG_OPS`: `buscar_pessoa`, `escolher_pessoa`, `cadastrar_terceiro`.

## Ferramentas alteradas

| Ferramenta | Mudança | Graces |
|------------|---------|--------|
| `cadastrar_cliente` (primeiro contato) | antes do `POST`, busca pelo `nome`; mesmo nome completo (2+ palavras, normalizado) com celular diferente do WhatsApp → `{ok:false, code:'encaminhar_equipe', motivo:'nome_outro_celular'}`, sem `POST` (research Decision 6) | `GET /agenda/clientes?busca=` (G `02`:17-39), depois `POST /agenda/clientes` (G `02`:50-68) |
| `listar_servicos` | texto que casa "2ª vez" é limpo antes da busca; resultado traz `orientacao` "ofereça o regular, sem desconto" (FR-005) | `GET /agenda/servicos?texto=` (G `01`) |
| `horarios_livres` | oferta completa, sem corte (FR-001); com `id_opcoes_servicos`, encadeamento (abaixo) | `GET /agenda/horarios-livres` (G `03`:21-44) |
| `agendar` fase 2 | revalida horário(s) + linha de base de agendamentos; POST com `idServico` (sem pacote, princípio XI); aceita `id_opcao_horario` de oferta `sequencia` (gera `agendar_conjunto`); verificação após incerteza; 1 repetição | `POST /agenda` (G `04`:56-84), `GET /agenda/agendamentos` (G `04`:33-49) |
| `reagendar` | recusa serviço "2ª vez"; verificação após incerteza | `PUT /agenda/{idAgenda}` (G `04`:86-107) |
| `cancelar` | aceita `id_opcoes_agendamentos` → `cancelar_conjunto`; verificação após incerteza | `DELETE /agenda/{idAgenda}` (G `04`:110-121) |

## Ferramentas novas

| Ferramenta | Entrada do modelo | Graces | Saída ao modelo |
|------------|-------------------|--------|-----------------|
| `buscar_pessoa` | `nome` (3–80) | `GET /agenda/clientes?busca=` (G `02`:17-26) | `{pessoas:[{id, nome}]}` (só nome e sobrenome); `[]` → `orientacao` "não achei; proponha cadastrar"; > `lista.max_itens` → "peça o nome completo" |
| `escolher_pessoa` | `id_opcao` (oferta `pessoa`) | — (usa `mesmo_celular`, calculado na busca a partir do `celular` da resposta, G `02`:39) | mesmo celular do remetente: `{ok, nome}`; celular diferente ou ausente: `{ok:false, code:'encaminhar_equipe', motivo:'terceiro_outro_celular'}` sem gravar `idCliente`; recusa `confirmacao_no_mesmo_turno` se no turno da busca |
| `cadastrar_terceiro` | fase 1: `nome`, `celular?`; fase 2: `proposta_id` | fase 2: `POST /agenda/clientes {nomeCliente, ddiCelular:"55", celular}` (G `02`:50-68) | fase 1: `{proposta_id, resumo}` ("cadastrar Fulano com o seu celular"); fase 2: `{ok}` e o terceiro vira `pedido.idCliente` |

## Saídas novas

- `horarios_livres` encadeado sem barbeiro único:
  `{ok:true, sem_barbeiro_unico:true, opcoes:[{id, rotulo:'Barbeiros diferentes'}, {id, rotulo:'Agendar separado'}]}`.
- Fase 2 de conjunto: `{ok:false|true, criados:[{servico, hora}], faltaram:[{servico}], code?:'conjunto_parcial'}`.
- Escrita verificada após timeout: igual ao sucesso normal, com `verificada:true` (não mostrada ao cliente).

## Regras impostas em código (acréscimos às regras 1–6 da F3)

7. Oferta de horários nunca é truncada no `bv-graces`; o `Compor` envia todos os itens da oferta em
   listas de até `lista.max_itens`, até `saida.max_mensagens` (FR-001).
10. Serviço cujo nome casa `BV_SEGUNDA_VEZ` é recusado em `agendar`, `trocar_servico`,
    `agendar_conjunto` e `reagendar` (fases 1 e 2) com `servico_nao_oferecido` (FR-005).
11. `escolher_pessoa` e fase 2 de `cadastrar_terceiro` só em turno posterior; cadastro só com
    `cfg.cadastroLiberado`, uma vez por sessão, e só com o nome que a busca não achou (FR-006, FR-007).
11b. Terceiro com celular diferente do remetente (ou sem celular no cadastro): `escolher_pessoa`
    devolve `encaminhar_equipe` e não grava `pedido.idCliente`; nada é agendado, lido, remarcado,
    ou cancelado dessa pessoa. Mesmo celular = acesso total (block-003, dec-022,
    research Decision 6, F-SEC-1). Primeiro contato: `cadastrar_cliente` não cadastra quando o mesmo
    nome completo já existe com outro celular (`encaminhar_equipe`). Busca exige 2+ palavras; tetos
    diários de 5 buscas e 1 cadastro de terceiro por contato.
11c. `encaminhar_equipe`: saída com `code` e `motivo` (`terceiro_outro_celular` | `nome_outro_celular`), texto
    `textos.encaminhar_equipe`, registro em `falhas_agente` (`encaminhar_equipe|<motivo>`) sem nome nem celular e
    transferência do ticket: `POST https://api.chatmasterveloz.com/api/tickets/updateAPI` com
    `{ticketId, queueId:78}` e token da conexão 145 (`chatmasterveloz-api/03-ticket/api-atualizar-ticket.md`),
    seguida de `conversas.pedido.handoff=true` (o agente não responde mais). Falha: `falhas_agente`
    `handoff_falhou`, sem outro endpoint. Proibido `/api/tickets/changequeue` (move todos os tickets da
    conexão). Etiqueta 521 e funil: `crm-etiquetas-handoff`.
    Segurança (owasp-security, F-SEC-3, API1/ASI02): `ticketId` vem só do estado da conversa gravado
    pelo webhook, nunca de argumento do modelo; o token da conexão fica no Code node, nunca no prompt;
    `pedido.handoff=true` é gravado ANTES da chamada (fail-closed: falha deixa o agente calado).
12. Encadeamento só oferece inícios presentes nas grades de cada serviço, em sequência, com mesmo
    barbeiro quando existe; sem barbeiro único, só pergunta (FR-008, FR-012).
13. Escrita com status 0 ou 5xx: relê agendamentos e compara antes de qualquer nova escrita; no
    máximo 1 repetição; nunca terceira escrita (FR-010).
14. Conjunto: escrita em ordem; para no primeiro item que falha; nunca recria item `criado` (FR-011).
15. Reação a erro pelo `code` (tabela da research Decision 9); `detail` nunca é lido (FR-009).
16. Laço de estágios com teto `graces.max_estagios`; acima, `estagios_esgotados` e contingência.
