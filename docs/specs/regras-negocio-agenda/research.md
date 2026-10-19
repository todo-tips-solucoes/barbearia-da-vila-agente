# Research: regras-negocio-agenda

Fontes citadas: G = `graces-api/`, C = `chatmasterveloz-api/`, F3 = `docs/specs/agente-conversacional-graces/`.
Tudo o que não tem fonte está marcado `[PROPOSTA]` ou vira sonda. Nenhum eixo estrutural é decidido
aqui: linguagem, stack (n8n + Code nodes JS), arquitetura (AI Agent + sub-workflow `bv-graces`),
persistência (Postgres do ambiente) e ambiente-alvo (TESTE em `n8n2.todo-tips.com`) já vêm da feature 3
e de `docs/decisoes-pre-00c.md`.

## Decision 1: estender a feature 3, sem peça nova de arquitetura

**Decision**: a feature mexe em `workflows/shared/graces.js` (regras e protocolo de estágios),
`workflows/shared/agente.js` (`Compor`, prompt, filtro "2ª vez"), `workflows/sub/bv-graces.json`
(laço de estágios, Decision 2), `workflows/sub/entregar-rajada.json` (ferramentas novas) e numa
migração `0007`. Nenhum workflow, credencial ou serviço novo.

**Rationale**: FR-015 manda estender `entregar-rajada` e `bv-graces`; a feature 3 já impõe em código
as regras que esta feature amplia (F3 `contracts/ferramentas-graces.md` "Regras impostas em código").

**Alternatives considered**: sub-workflow novo por regra (terceiros, encadeamento): duplica
`Contexto`/`Persistir` do `bv-graces` e o trava de proposta; rejeitado.

## Decision 2: estágios do `bv-graces` em laço com teto, medido na sonda S3

**Decision**: hoje o `bv-graces` tem 3 estágios HTTP desenrolados (A, E1, E2). Encadeamento com
verificação após timeout precisa de mais (pior caso com 3 serviços: revalidação + 4 por serviço =
13). O `bv-graces` passa a ter **um** estágio HTTP em laço: `Planejar` → `Tem chamada?` → `Graces` →
`Passo` → volta a `Tem chamada?`. `bvGPasso` devolve `{reqs, st}` ou `{final}`; um contador
`st.estagio` em código encerra com `{ok:false, code:'estagios_esgotados'}` acima de
`graces.max_estagios` (16 `[PROPOSTA]`). O `Persistir` só roda no `final`.

Sonda **S3** (primeira fase, TESTE): publicar o `bv-graces` com a ligação de volta e conferir, pelo MCP
`get_workflow_details` e por uma execução real com 3 estágios, que o n8n 2.43.5 executa o ciclo e
preserva `st` entre voltas. Ciclo em workflow não aparece nas fontes já citadas no repositório, por
isso é medido, não afirmado (XVI). **Fallback** se S3 falhar: o `deploy-n8n.py` desenrola o par
`Graces`/`Passo` em `graces.max_estagios` cópias a partir de um só modelo no JSON versionado (mesmo
contrato de `bvGPasso`).

**Rationale**: um só nó HTTP e um só Code de passo mantêm a lógica testável em `graces.js`
(`node tests/graces.test.js`), sem 13 pares de nós copiados.

**Alternatives considered**: (a) o modelo chamar a ferramenta várias vezes, uma escrita por chamada:
a ordem e a verificação ficariam no prompt, contra FR-013; (b) várias requisições num só nó HTTP:
o nó dispara os itens sem ordem garantida, e a criação precisa ser em ordem (FR-008); rejeitados.

## Decision 3: oferta completa de inícios (FR-001, FR-002)

**Decision**:

- `horarios_livres` guarda em `conversas.opcoes` **todos** os inícios devolvidos (nada de
  `slice(max_itens)` nem "pergunte manhã/tarde"). A oferta ganha `completa:true`.
- No `Compor`, quando o modelo emite um bloco `OPCOES` que referencia a oferta de horários, o código
  envia **todos** os itens da oferta, em ordem cronológica, em listas de até `lista.max_itens`; cada
  lista é uma mensagem e conta no limite de `saida.max_mensagens` (constituição X). O texto humano
  vai no `Desc` da primeira lista; as seguintes levam `Desc` curto de continuação
  (`textos.lista_continua`, `[PROPOSTA]`). O modelo não escolhe subconjunto.
- Capacidade por turno = `saida.max_mensagens × lista.max_itens` (4 × 10 = 40). Grade observada:
  segunda (10 h abertas) com intervalo de 40 min deu 14 inícios (G `03`:31-34; G `06`:80). O maior
  dia aberto tem 14 h (terça a sexta, G `06`:74) e o menor serviço tem 30 min (G `06`:40-46): se o
  intervalo acompanhar a duração (não medido), são no máximo 28 inícios por barbeiro, abaixo de 40. Se uma
  oferta passar da capacidade, a última linha da última lista vira "ver mais horários" (id `mais`),
  que reenvia o restante no turno seguinte sem nova consulta; nada é ocultado, só adiado
  (`[PROPOSTA]`, caso não observado nos dados).
- "Qualquer barbeiro": união por início; cada início leva o barbeiro que o tem livre, escolhido pela
  ordem de `listar_barbeiros` (`[PROPOSTA]`; G `03`:44 só manda consultar cada um e juntar). Um início livre em dois barbeiros aparece uma vez, com o
  primeiro. O título mostra `HH:mm Apelido` (já é assim na F3).
- "O mais cedo possível": o modelo pode responder com o primeiro início em texto; a oferta completa
  continua em `conversas.opcoes` e qualquer início dela continua válido.
- Nunca se calcula fechamento nem duração: o que entra na oferta é só `horarios` da resposta
  (G `03`:38-42). Duração mostrada/usada = `minutos` da mesma resposta (G `03`:31, :40).

Sonda **S4** (humano, owner no aparelho): enviar 4 listas seguidas ao 5511967296849 pela conexão 145
e conferir que chegam na ordem e que o toque em cada uma volta ao agente. S2 mostrou que a API aceita
listas de 1, 10 e 11 itens com `200` (`docs/infra.md:114`); a exibição no aparelho foi observada pelo
owner (F3 `tasks.md:52`), mas não 4 listas seguidas.

**Rationale**: SC-001 exige conjunto idêntico; o limite de 4 mensagens é MUST da constituição X;
40 itens cobrem a grade observada.

**Alternatives considered**: uma linha por par início × barbeiro (até 5× mais itens, estoura a
capacidade com "qualquer barbeiro"); `lista.max_itens` maior sem medição (S2 só mediu até 11).

## Decision 4: removida (pacote)

O agente não trata de pacote nem de abatimento (constituição 3.0.0, princípio XI; owner, block-004). Agenda sempre por `idServico`, sem consultar `/agenda/pacotes`. Numeração de Decisions mantida.

## Decision 5: "2ª vez" recusado também na escrita (FR-005)

**Decision**: `BV_SEGUNDA_VEZ` (`agente.js:7`) continua filtrando listas. Passam a recusar com
`code:'servico_nao_oferecido'`: fase 1 e fase 2 de `agendar`, `trocar_servico`, encadeamento e
`reagendar` (cujo serviço é mantido pelo PUT, G `04`:108) quando o nome do serviço devolvido pela
Graces (ou `descricaoAgendaOnline` da seção) casar com o padrão. `cancelar` continua permitido.
Teste cobre as 5 variantes reais (G `06`:21-38, "2º vez"), "2ª vez", "2a vez", caixa alta e sem
acento. Pedido pelo nome: `listar_servicos` com texto que casa o padrão remove o trecho "2ª vez",
busca o regular e devolve orientação "ofereça o serviço regular, sem falar em desconto" (US3-2).

**Rationale**: G `06`:54 não documenta quando há direito; constituição IX.

## Decision 6: agendar para terceiro (FR-006, FR-007)

**Decision**: três ferramentas novas no `bv-graces`:

- `buscar_pessoa(nome)` → `GET /agenda/clientes?busca=` (3+ caracteres, G `02`:24). Grava oferta
  `pessoa` com rótulo `nomeCliente sobrenomeCliente` apenas; nunca celular, e-mail, documento ou
  nascimento (US4-5). Mais de `lista.max_itens` resultados → não oferece; orienta pedir o nome
  completo. Teto de `terceiro.buscas_max_sessao` (3 `[PROPOSTA]`) por sessão contra varredura de
  nomes. 0 resultado grava `pedido.terceiro_sem_cadastro = nome`.
- `escolher_pessoa(id_opcao)` → só executa em turno **posterior** ao da busca (mesma trava de turno
  da fase 2), então o "é o(a) Fulano?" precisa de resposta do cliente (US4-2, US4-3). Grava
  `pedido.idCliente` = terceiro e `pedido.para_terceiro = true`; o remetente fica em
  `pedido.idCliente_remetente`.
- `cadastrar_terceiro` em duas fases: fase 1 (`nome` igual a `terceiro_sem_cadastro`, `celular`
  opcional) cria proposta `cadastrar_terceiro` com resumo explícito: "cadastrar Fulano com o seu
  celular" quando `celular` ausente (FR-007, block-001); fase 2 (`proposta_id`, turno posterior) faz
  `POST /agenda/clientes {nomeCliente, ddiCelular:"55", celular}` (G `02`:50-68). Recusada com
  `cadastro_desabilitado` enquanto `cfg.cadastroLiberado` for falso (TESTE: falso; FR-014). Uma vez
  por sessão.

**Escopo do terceiro (gate owasp-security, F-SEC-1, A01/API1; decidido pelo owner em block-003,
dec-022, `docs/decisoes-pre-00c.md:97`)**: escolher uma pessoa pelo nome não prova vínculo com ela.
Na fase de `escolher_pessoa`, o `bv-graces` compara o celular do cadastro escolhido (lido da resposta
de `busca`, nunca mostrado ao modelo) com o celular do remetente, ambos só em dígitos e sem o DDI 55:

- **mesmo celular** (família no mesmo número, G `02`:46): acesso total, igual ao do titular
  (`meus_agendamentos`, `reagendar`, `cancelar`);
- **celular diferente**: o agente **não agenda**. `escolher_pessoa` devolve
  `{ok:false, code:'encaminhar_equipe', motivo:'terceiro_outro_celular'}`, não grava
  `pedido.idCliente` nem `para_terceiro` e nenhuma ferramenta age sobre essa pessoa (ver, remarcar,
  cancelar ou agendar). O modelo responde com `textos.encaminhar_equipe` e o pedido é
  encaminhado à equipe, que cadastra o número correto para os próximos agendamentos.

Fail-closed: celular ausente no cadastro escolhido conta como diferente.

**Primeiro contato (mesma resposta do owner)**: `identificar_cliente` (F3) busca pelo número do
WhatsApp; achou → acesso total ao próprio cadastro. Não achou → o modelo pede o nome e
`cadastrar_cliente` cadastra com esse número. Antes do `POST`, o `bv-graces` faz
`GET /agenda/clientes?busca=<nome>` (G `02`:17-26): se algum resultado tiver o mesmo nome completo
(nome + sobrenome, sem acento, caixa e espaços extras) e celular diferente, **não cadastra** (nem
mescla nem duplica) e devolve `{ok:false, code:'encaminhar_equipe', motivo:'nome_outro_celular'}`,
para a equipe atualizar o número. Nome com uma palavra só não bloqueia (casaria homônimos demais);
segue para o cadastro normal. Continua sujeito a `cfg.cadastroLiberado` (falso no TESTE).

**Terceiro sem cadastro e sem celular próprio** (block-001, mantido): cadastra com o celular de quem
pede, após confirmação, pelo `cadastrar_terceiro` acima.

**Encaminhamento à equipe (transferência já nesta feature; owner, block-004, 2026-10-19)**: em todo `encaminhar_equipe` o `bv-graces` (a) devolve `code` e `motivo`; (b) o modelo responde com `textos.encaminhar_equipe`; (c) registra em `falhas_agente` `encaminhar_equipe|<motivo>`, sem nome nem celular; (d) transfere o ticket por `POST /api/tickets/updateAPI` com `{ticketId, queueId:78}` (`chatmasterveloz-api/03-ticket/api-atualizar-ticket.md`, fonte do `ticketId`: webhook, `recepcao-buffer/contracts/webhook-chatmaster.md`); (e) grava `conversas.pedido.handoff=true` e o agente para de responder nessa conversa. `/api/tickets/changequeue` é proibido: move todos os atendimentos da conexão. Etiqueta 521 e funil são da `crm-etiquetas-handoff`. Sonda S5 (TESTE, conexão 145): confirmar que `updateAPI` só com `queueId` não altera status/operador e que a conversa aparece no setor 78; a doc não diz. Sem confirmação, bloqueio humano.

**Resultado da sonda S5 (2026-10-19, TESTE, conexão 145, owner block-006)**: `POST /api/tickets/updateAPI` com `{ticketId, queueId:"78"}` no ticket do número de teste respondeu 200; `status` (open) e `userId` (1) ficaram iguais antes e depois, `queueId` 78. Limite: o ticket já estava no setor 78, então a mudança de outro setor para 78 não foi exercitada; nada precisou ser restaurado. A leitura do ticket usa o mesmo endpoint só com `ticketId` (`api-obter-um-ticket.md`); o `ticketId` foi descoberto por `GET /api/contacts/alltickets` (filtrando `whatsappId` 145).

Tetos contra varredura e lixo irreversível (F-SEC-2): `terceiro.buscas_max_dia` (5) e
`terceiro.cadastros_max_dia` (1) por contato, contados em `falhas_agente`/`propostas` do dia, além do
teto por sessão; a busca exige ao menos duas palavras no nome.

Homônimo do remetente: aparece na oferta como qualquer pessoa e passa pela confirmação. Testes:
busca e escolha com o Paulo (mesmo celular); celular diferente, primeiro contato e cadastro só por
`node tests/graces.test.js` (mock), nunca cadastro real sem autorização expressa do owner (FR-014).

**Rationale**: G `05`:45 deixa a regra para a barbearia; decidida em block-001, block-003 e
`docs/decisoes-pre-00c.md` (linhas 45, 97 e 98). O cadastro é irreversível (G `02`:15).

## Decision 7: encadeamento de serviços (FR-008, FR-012)

**Decision**:

- `horarios_livres` aceita `id_opcoes_servicos` (lista de 2 a `encadeamento.max_servicos`, 3
  `[PROPOSTA]`), em ordem.
- Estágio 1: `GET /servicos/profissionais?idServico=` por serviço (G `01`), sem o de teste.
  Estágio 2: `GET /agenda/horarios-livres` por serviço × barbeiro elegível (teto
  `graces.max_consultas_estagio`, 20 `[PROPOSTA]`).
- Um início `s` cabe na sequência com o barbeiro `b` se `s` está na grade do serviço 1 de `b`,
  `s + minutos₁` na grade do serviço 2 de `b`, e assim por diante, usando só `horarios` e `minutos`
  devolvidos (G `03`:31-42). Nenhum horário é calculado fora das grades.
- Mesmo barbeiro primeiro: se algum barbeiro tem sequência, a oferta só traz sequências de um
  barbeiro (FR-012). Se nenhum tem, devolve oferta `modo_encadeamento` com `barbeiros_diferentes` e
  `separados` (lista, US/FR-012); `barbeiros_diferentes` refaz a busca permitindo barbeiro por
  serviço (primeiro barbeiro, na ordem de `listar_barbeiros`, que tem o próximo início livre);
  `separados` volta ao fluxo de um serviço por vez.
- Proposta `agendar_conjunto`: `dados.itens[]` em ordem, cada um com serviço, barbeiro, data, hora,
  valor. Resumo único com cada serviço,
  horário e valor (US5-2). Nada é criado antes do "sim" (fase 2 em turno posterior).

**Rationale**: as durações da loja variam (30, 40, 60 e 80 min, G `06`:19-48) e a grade observada anda
de `intervaloMinutos` em `intervaloMinutos` (G `03`:31, :38). Quando `s + minutos₁` não cai na grade
do serviço seguinte, aquele início simplesmente não é oferecido: só entra o que está nas grades,
nunca um horário calculado. Isso pode dar zero sequências e levar ao FR-012. Combos já existem como
serviço único ("Cabelo adulto + barba", 80 min, G `06`:26), e o prompt orienta preferi-los quando o
cliente pedir exatamente aquele par (`[PROPOSTA]`).

## Decision 8: escrita nunca repetida às cegas, verificada em código (FR-010)

**Decision**: a F3 devolvia `incerta` e deixava a conferência ao modelo (`graces.js:184`). Agora o
`bv-graces` faz em código, no laço da Decision 2:

1. A revalidação (fase 2) também lê `GET /agenda/agendamentos?idCliente=&proximos=true`
   (G `04`:33-49) como linha de base.
2. Timeout ou 5xx na escrita → próximo estágio relê os agendamentos e compara:
   POST = agendamento novo (fora da linha de base) com mesmo serviço , barbeiro
   escrito e `horaInicio = data + hora`; PUT = `idAgenda` com `horaInicio` novo; DELETE = `idAgenda`
   ausente (G `04`:31, inferência marcada na própria fonte; confirmar no smoke r9).
3. Aplicada → sucesso. Não aplicada → repete **uma** vez. Nova incerteza → nova verificação; se ainda
   não aplicada ou se a leitura falhar → `incerta`, contingência (`textos.contingencia`) e registro
   `graces|escrita_incerta` com `code` e `traceId`. Nunca uma terceira escrita.
4. Reprocessamento do turno: a proposta só sai de `pendente` por `UPDATE ... WHERE estado='pendente'`
   (F3 `data-model.md`), então nenhuma escrita se repete (US6-5).

**Rationale**: G `04`:84 (idempotência do POST desconhecida), G `05`:97, constituição XI.

## Decision 9: erros pelo `code` (FR-009)

**Decision**: `bvGErro` passa a decidir pelo `code` (G `00`:57-63), com o status só para separar
"sem resposta" de erro com corpo:

| `code` | Reação ao modelo | Registro |
|--------|------------------|----------|
| `PARAMETRO_INVALIDO`, `CORPO_INVALIDO` | "data fora das regras da loja ou opção inválida; ofereça alternativas", sem detalhe | `graces|parametro_invalido` |
| `NAO_AUTENTICADO`, `LOJA_FORA_ESCOPO`, `ACESSO_NEGADO` | contingência; "a agenda está indisponível, ofereça chamar a equipe" | `graces|configuracao` |
| `NAO_ENCONTRADO` | recarregar a lista correspondente e perguntar de novo | `graces|nao_encontrado` |
| `CONFLITO` | recarregar a grade e oferecer outra opção | `graces|conflito` |
| ausente com status 0 ou 5xx | escrita: Decision 8; leitura: contingência | `graces|sem_resposta` |
| desconhecido ou ausente (demais) | contingência genérica | `graces|code_desconhecido` |

Todo registro guarda `code` e `traceId`, nunca `detail` nem dados pessoais (F3 `falhas_agente`).
Teste com `detail` em inglês e em português para o mesmo `code` (SC-007).

"Alerta à operação": o registro em `falhas_agente` com `motivo='configuracao'`. Canal de alerta
fora de banda não existe no projeto; a transferência para humano é o handoff do ticket (Decision 6). Fica registrado como limite, não como pendência desta feature.

## Decision 10: falha parcial e cancelamento de conjunto (FR-011, US5-5)

**Decision**: a fase 2 de `agendar_conjunto` cria os itens em ordem; cada item tem `estado`
(`pendente|criado|falhou|incerto`) em `propostas.resultado.itens`. Falha definitiva num item para a
sequência (os seguintes ficam `pendente`, nada é criado fora de ordem). A proposta termina
`parcial`, o resultado ao modelo lista o que foi criado e o que faltou, e `pedido.faltantes` guarda os
serviços restantes; a nova tentativa é uma proposta nova só com eles (nunca recria os criados).
`cancelar` aceita `id_opcoes_agendamentos` (lista) e gera `cancelar_conjunto`: um `DELETE` por item,
cada um com a verificação da Decision 8, e resultado por item.

## Decision 11: TESTE e limpeza (FR-014)

**Decision**: mantém a F3 (redirecionamento de toda escrita ao barbeiro de teste, cliente Paulo,
contatos simulados; `docs/infra.md:112`). Encadeamento em TESTE escreve todos os itens no barbeiro
de teste, revalidando a sequência na grade dele. O smoke cancela no `finally` todo `idAgenda` de
`propostas.resultado` (inclusive `itens[]` e `parcial`) e confere 0 agendamentos ativos do barbeiro de
teste para o Paulo (SC-008). O timeout é simulado em `node tests/graces.test.js` (resposta status 0
seguida de agendamentos com o item criado, e com o item ausente), porque forçar timeout real na
Graces de produção não é controlável (SC-006).

## Decision 12: prompt e limites do agente

**Decision**: o prompt (`bvPrompt`) ganha as regras de uso das ferramentas novas e a instrução de não
listar horários no texto (o código manda as listas). `agente.iteracoes_max` passa de 6 para 8
`[PROPOSTA]` (encadeamento e terceiro somam até 2 chamadas por turno); medir latência no smoke
(SC-009 da F3: p90 ≤ 20 s).

## Riscos

- Turno longo: 13 estágios × `graces.timeout_ms` no pior caso passa de `lock.ttl_s` (120 s). Coberto
  pela trava da proposta (sem escrita dupla), mas o turno pode terminar em contingência.
- Encadeamento com "qualquer barbeiro": até 3 × 5 consultas num estágio; latência a medir.
- Lista de pessoas por nome mostra nomes de outros clientes (homônimos) ao remetente: limitado a
  nome e sobrenome, teto de buscas e de resultados; aceito por US4-3.
