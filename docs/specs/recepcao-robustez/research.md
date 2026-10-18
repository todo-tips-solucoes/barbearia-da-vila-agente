# Pesquisa: recepcao-robustez

Nenhuma decisão abaixo toca eixo estrutural: a stack segue n8n 2.43.5 + Postgres 17 + Redis 7.2
DB 2 (versões: `docs/specs/recepcao-buffer/plan.md`, Technical Context). Todas as decisões são
operacionais, dentro do workflow `bv-recepcao` já em `develop`.

## Decision 1 - Responder ao Chat Master só depois de gravar (FR-001..FR-005)

**Decision**: no `workflows/bv-recepcao.json`, a saída `aceita` do `Roteador` passa a ir direto
para `Upsert contato` → `Inserir mensagem`; o `Responder 200 aceita` sai de antes da gravação e
fica depois dela, atrás de um If `Gravada?` (a query devolveu `id`). Sem linha devolvida
(duplicada por id ou por conteúdo, Decision 2) → `Responder 200 descartada`. `Upsert contato` e
`Inserir mensagem` ganham `onError = continueErrorOutput`; as duas saídas de erro vão para
`Registrar falha gravacao` (`tipo = 'gravacao'`, motivo em código, `contato_id` quando já existir;
`onError = continueRegularOutput`) → `Responder 500`.

**Rationale**: hoje (código lido) o 200 sai antes de qualquer escrita, então uma falha do Postgres
perde a mensagem com o canal achando que ela chegou. Com o registro em `continueRegularOutput`,
o 500 sai mesmo que o próprio registro falhe (FR-004). `Inserir mensagem` precisa de
`alwaysOutputData` para o If ver o caso "0 linhas" em vez de a execução parar sem responder.

**Alternatives considered**: manter o 200 adiantado e só alertar (a decisão do owner aceita
"alertar a falha" como alternativa) — rejeitada, porque o alerta depende do mesmo Postgres que
falhou e o canal não teria como reenviar.

**Lacuna (V/XVI)**: a política de reenvio do Chat Master diante de 5xx não está documentada em
`chatmasterveloz-api/` (busca por retry/reenvio sem resultado). O status `500` é `[PROPOSTA]`;
o plano não afirma que o canal reenvia. FR-005 é garantido do nosso lado: um reenvio, se vier,
grava uma vez só (Decision 2 e `ON CONFLICT` por id).

## Decision 2 - Dedupe por conteúdo no Postgres, no mesmo statement da gravação (FR-010..FR-012)

**Decision**: tabela nova `marcas_conteudo (contato_id, hash_conteudo, visto_em)` com PK
`(contato_id, hash_conteudo)`. A query de `Inserir mensagem` vira um único statement: uma CTE faz
`INSERT ... ON CONFLICT (contato_id, hash_conteudo) DO UPDATE SET visto_em = now() WHERE
marcas_conteudo.visto_em < now() - janela RETURNING`, e a mensagem só é inserida se for mídia, se
tiver `idCanal`, ou se a CTE devolveu linha. O hash é `sha256()` do texto em UTF-8, função nativa
do Postgres desde a versão 11 (a stack roda 17). Marcas vencidas são apagadas por um nó separado
depois da resposta (`Limpar marcas`, `continueRegularOutput`). Janela em
`dedup.conteudo_janela_s = 10` (decisão do owner, dec-031).

**Rationale**: (a) um só statement é uma só transação: se a gravação falhar, a marca também é
desfeita e o reenvio após o 500 não é descartado (FR-005); (b) `ON CONFLICT DO UPDATE ... WHERE`
serializa duas chegadas simultâneas do mesmo texto pelo bloqueio da linha, sem corrida; (c) tira o
Redis do caminho síncrono do webhook, então o Redis pendurado não atrasa a resposta ao canal;
(d) a marca guarda só `contato_id` e hash, nunca texto nem telefone (FR-012, SC-006).

**Alternatives considered**: `SET NX EX` no Redis antes da gravação — rejeitada: põe antes da
resposta exatamente a dependência que pode pendurar (Decision 3) e exige compensação (`DEL`) se a
gravação falhar. `NOT EXISTS` em `mensagens` com janela de tempo — rejeitada: em READ COMMITTED
duas chegadas simultâneas passam as duas pelo `NOT EXISTS`.

**Risco aceito pelo owner**: um "ok" repetido de propósito em menos de 10 s é descartado.
Hoje todo texto chega com `idCanal = null` (`workflows/shared/rajada.js`, shortcut documentado),
então a dedupe por conteúdo vale para todo texto até o owner informar o id do canal.

## Decision 3 - Toda operação Redis passa por um sub-workflow com tempo máximo (FR-006..FR-009)

**Decision**: sub-workflow novo `workflows/sub/redis-op.json` (`workflows_sub.redis_op`). Entrada
`{op, chave, valor, ttl_s}` com `op ∈ {get, set, incr, delete}`; um Code node recusa chave fora de
`{{BV:redis.prefixo}}`; um Switch leva ao nó Redis da operação. `settings.executionTimeout =
{{BV:redis.timeout_s}}` (`redis.timeout_s = 5`, `[PROPOSTA]`). Os 7 nós Redis do `bv-recepcao`
(`Marcar ultima`, `Ler ultima`, `Ler posse`, `Tomar posse`, 3× `Liberar posse`) viram nós
`Execute Workflow` (`waitForSubWorkflow = true`, `onError = continueErrorOutput`). A saída de erro
vai para `Registrar falha Redis` com motivo em código: `tempo_esgotado` (timeout),
`credencial_recusada` (mensagem com `WRONGPASS`/`NOAUTH`, se chegar) ou `indisponivel` (demais).
A mensagem de erro bruta nunca é gravada. Como a instância n8n é compartilhada, o `redis-op`
restringe quem pode chamá-lo pela política de chamador das configurações do workflow
(https://docs.n8n.io/workflows/settings/, "This workflow can be called by"), aceitando só o
`bv-recepcao` do mesmo ambiente; a checagem de prefixo segue como segunda barreira (gate
owasp-security pós-plan, achado M1).

**Rationale**: o próprio repositório registra, observado no smoke do `recepcao-buffer`
(`scripts/smoke-recepcao.py`, cenário `redis()`), que o nó Redis do n8n com senha errada ou host
inalcançável "reconecta sem fim" e não sai pela saída de erro. Como o nó não tem tempo máximo
próprio, o tempo máximo precisa vir de fora dele; o "Timeout Workflow" das configurações de
workflow do n8n (https://docs.n8n.io/workflows/settings/) é o mecanismo nativo disponível.

**RESULTADO DA SONDA 1.1 (2026-10-18, TESTE, onda-007): HIPÓTESE REFUTADA.** Pai (Webhook + Execute
Workflow `onError=continueErrorOutput`, `waitForSubWorkflow`) chamando sub com nó Redis e
`executionTimeout=5`: com a credencial válida o pai respondeu em 0,16-0,20 s (3 chamadas; custo
do laço de posse desprezível). Com credencial Redis de senha inválida o pai NÃO recebeu erro nem
saída alguma em 60 s (limite do cliente de medição; esperado ≤ 7 s): o `executionTimeout` do sub
não encerrou a chamada. Logo, 1.1.6 exige bloqueio humano com as opções (a)-(c) abaixo e NÃO se
seguem as fases 4 e 5.2. Recursos da sonda (2 pares de workflows, credencial temporária
`cCxPlFTsqhTYRsMZ`) apagados; sem execuções presas.

Texto original da hipótese (mantido para rastro) - **HIPÓTESE NÃO MEDIDA**: que o `executionTimeout` de um sub-workflow é aplicado quando ele é
chamado por `Execute Workflow` e que o pai recebe erro na saída de erro. A documentação citada
descreve o timeout do workflow, não o caso de sub-workflow. Por isso a primeira tarefa da
implementação é uma sonda em TESTE (credencial Redis inválida temporária, no padrão do cenário
`redis()` do smoke), medindo tempo e saída. Se a hipótese falhar: bloqueio humano, com opções
(a) mover `ultima`/`posse` para o Postgres; (b) `executionTimeout` do `bv-recepcao` inteiro +
error workflow que registra a falha (tempo máximo maior que 5 s por causa das esperas do buffer);
(c) aceitar o limite documentado.

**Limite conhecido**: com o nó pendurado, credencial recusada provavelmente só aparece como
`tempo_esgotado` (o n8n não devolve a mensagem `WRONGPASS`). A sonda mede; se for o caso, o
contrato registra que "credencial recusada" e "indisponível" se confundem em `tempo_esgotado`.

**Alternatives considered**: `executionTimeout` só no `bv-recepcao` — rejeitada como primeira
opção porque as esperas (`buffer.janela_s`, até `lock.espera_s × lock.tentativas`) obrigam um
tempo máximo bem acima de 5 s (SC-002). Code node com cliente Redis próprio — rejeitada: exigiria
liberar módulo externo no n8n compartilhado (fora do escopo, XIII).

## Decision 4 - `--criar` grava o id na seção certa (FR-013..FR-015)

**Decision**: em `scripts/deploy-n8n.py`, `criar()` escolhe a seção pelo mesmo critério que
`main()` já usa para achar o arquivo: `workflows_sub` quando o nome está em `workflows_sub`,
`workflows` caso contrário. A checagem "já tem id" e a gravação usam a mesma seção. PROD e nome
existente na instância continuam recusados. Some o comentário `shortcut:` de `main()`. O
`redis_op` é criado com `--criar redis_op` (exercita o conserto).

**Rationale**: hoje `criar()` grava em `cfg["workflows"]` e checa só ali; para sub-workflow o
deploy normal procura em `workflows_sub` e não acha o id.

**Alternatives considered**: flag `--sub` — rejeitada, o config já diz qual nome é sub.

## Decision 5 - Esquema

**Decision**: `db/migrations/0004_recepcao_robustez.sql`, idempotente: recria o CHECK de
`falhas_recepcao.tipo` com `gravacao`; cria `marcas_conteudo` e o índice em `visto_em`.
`falhas_recepcao.motivo` já é texto livre; os novos códigos ficam no contrato.
