<!--
Sync Impact Report
- Version: 1.1.0 → 2.0.0 (MAJOR)
- Princípios modificados: X (Conversa humanizada e identidade) redefinido. Múltipla escolha passa a ser
  sempre por botão de lista (decisão do owner em 2026-10-18), no lugar de "conversa, não menus" e
  "botão somente na confirmação".
- Seções adicionadas: nenhuma
- Seções removidas: nenhuma
- Artefatos que precisam atualização: docs/briefing.md e docs/roadmap.md (atualizados nesta mesma PR);
  specs futuras de agente-conversacional-graces e regras-negocio-agenda
- TODOs pendentes: nenhum
- Histórico: 1.0.0 → 1.1.0 (MINOR) acrescentou os princípios IX-XVI
-->

# Constituição de Barbearia da Vila - Agente

> Governança do desenvolvimento deste projeto. Gerada pelo cockpit a partir do `cockpit.config`;
> os princípios abaixo são do ciclo e valem como ponto de partida. Os princípios que só fazem
> sentido para este projeto entram na seção final, escritos por quem o mantém.
>
> Este arquivo é gerado uma vez pelo configurador; depois disso é do projeto e nunca mais é alterado.

## Core Principles

> Os princípios do ciclo. O título fica em inglês porque o `/feature-00c` procura exatamente essa
> seção. A numeração começa em II porque o Princípio I (agnosticismo) é do próprio cockpit, não
> do projeto.

### II. Toda mudança percorre uma trilha

A trilha é decidida pelo **caminho** dos arquivos tocados, nunca pela extensão. A base de toda
frente é `develop`; a única exceção é `hotfix/<slug>`, que nasce de
`main` e só existe com incidente real. Quando as duas branches são a mesma, não há
promoção: o merge na integração já é a entrega em produção.

| Trilha | Quando | Etapas |
|---|---|---|
| **Completa** | qualquer arquivo fora de `docs/`, `README.md` e imagens; e sempre esta constituição | worktree, implementação pelo `/feature-00c`, revisão de código, PR, gate humano, registro em `docs/specs/<short-name>/` |
| **Docs** | só `docs/**` (exceto esta constituição), `README.md` e imagens | worktree, escrita, validação de renderização, uma rodada de revisão, PR, gate humano |

**MUST:**

- Toda mudança de trilha completa ou docs MUST nascer em worktree criada com base explícita
  (`/parallel-work <branch> --base origin/develop`, ou `origin/main`
  em hotfix), nunca em checkout na árvore principal.
- Esta constituição e qualquer revert de emergência MUST NOT seguir a trilha Docs.
- Uma PR MUST NOT ser mergeada sem aprovação explícita de um humano; o agente prepara,
  acompanha o CI e para no gate de review.

### II-bis. O registro da frente entra na própria PR

O que explica uma mudança viaja com ela.

**MUST:**

- Toda PR de trilha completa MUST trazer, em `docs/specs/<short-name>/`, os artefatos da frente
  (especificação, plano, tarefas e achados da revisão).
- A trilha MUST ser declarada no corpo da PR, com a lista dos caminhos tocados.

### III. Onde roda a validação estática

Valor configurado neste projeto: **ligado**.

- **Quando `ligado`:** validação local é proibida. Typecheck (`echo sem typecheck: projeto n8n sem código tipado`), lint
  (`find workflows -name '*.json' -print0 | xargs -0 -r -n1 python3 -I -m json.tool >/dev/null`) e build (`echo sem build: workflows n8n são publicados como JSON`) rodam apenas no CI; a validação de comportamento é o
  smoke no ambiente de integração e o smoke em produção.
- **Quando `desligado`:** este princípio não se aplica ao projeto. Typecheck, lint e build podem
  rodar localmente, e o CI continua sendo o gate obrigatório da PR.

Leia apenas o ramo que corresponde ao valor configurado acima; o outro não vale.

### IV. Ferramentas externas são dependências, não cópias

O ciclo compõe ferramentas de terceiros em vez de reimplementá-las. Quando um trecho de código de
terceiro precisa ser copiado, a cópia é exceção declarada, nunca o caminho padrão.

**MUST:**

- Ferramentas externas MUST ser instaladas e atualizadas pela pessoa, pelos canais oficiais de
  cada uma, nunca por um script do projeto.
- Toda cópia de código de terceiro MUST vir acompanhada do aviso de licença com o texto original.

### IV-bis. Identidade de commit declarada

Cada commit sai com a identidade do próprio autor. Conta compartilhada não commita.

Identidades declaradas (formato `nome:email`, separadas por `;`):

```text
paulotodo:154374725+paulotodo@users.noreply.github.com
```

**MUST:**

- Antes de commitar, `git var GIT_AUTHOR_IDENT` e `git var GIT_COMMITTER_IDENT` MUST ambos
  corresponder a uma das identidades declaradas.
- Entrar na lista, sair dela ou mudar a própria identidade MUST ser emenda desta constituição:
  a mudança é feita em `IDENTIDADES` no `cockpit.config`, re-renderizada pelo configurador e
  aprovada na PR como emenda.
- O agente MUST NOT alterar a identidade configurada por conta própria.

### V. Fonte oficial antes de afirmar

Nenhuma afirmação sobre comportamento de ferramenta externa entra no projeto sem a documentação
oficial lida antes, com o link registrado. Nenhum número, contagem ou comportamento é inventado.

**MUST:**

- Toda afirmação sobre ferramenta externa MUST citar a página oficial.
- Um dado factual sem fonte MUST ser marcado como não medido ou removido.

### VI. Português do Brasil

O projeto é lido por pessoas antes de ser lido por agentes.

**MUST:**

- Prosa de documentos e mensagens MUST estar em português do Brasil, com acentuação correta;
  identificadores, comandos e chaves ficam como estão no código.
- Mensagens de commit MUST seguir Conventional Commits, com descrição em português.

### VII. Scripts portáveis, idempotentes e contidos

Um script roda igual nos sistemas suportados, pode ser executado duas vezes sem efeito colateral
e só escreve onde foi mandado.

**MUST:**

- Rodar qualquer script uma segunda vez MUST produzir o mesmo estado final, sem duplicar
  registros nem sobrescrever edição local sem aviso.
- Um script MUST escrever apenas dentro do escopo que declara.

### VIII. Parametrização de agentes fica fora do rito de código

Prompts, kits e configurações de agentes mantidos em plataforma externa são parametrização, não
código do projeto, e não percorrem o rito de código. Prompts e configurações versionados no próprio
repositório são código como qualquer outro.

**MUST:**

- Parametrização de agentes em plataforma externa MUST NOT ser tratada como mudança de código:
  não abre frente, não exige `/feature-00c` e não entra no diff de uma PR do projeto.
- Pedido para construir, corrigir ou refatorar código que vá para uma PR MUST seguir o rito e a
  trilha do Princípio II.
- Exploração descartável (prova de conceito) MUST NOT entrar no diff de uma PR.

## Princípios próprios do projeto

> Princípios específicos de Barbearia da Vila - Agente, numerados a partir de IX. Adicionados na
> emenda 1.1.0 (2026-10-18), autorizada pelo operador.

### IX. A Graces é a fonte da verdade

**MUST:**

- O agente MUST oferecer apenas horários, serviços, barbeiros, preços e faixas de idade que vieram
  da Graces na própria conversa; `informacaoes_barbearia.txt` MUST NOT prevalecer sobre ela.
- O agente MUST NOT expor nem agendar com o barbeiro de teste (o que tem "TESTE" no nome).
- Serviços "2ª vez" MUST NOT ser oferecidos nem agendados.

### X. Conversa humanizada e identidade

**MUST:**

- O agente MUST assumir que é IA (assistente virtual da Barbearia da Vila), com tom humanizado.
- O agente MUST responder em até 4 mensagens curtas, com "digitando…" proporcional e uma pergunta
  por mensagem.
- Toda múltipla escolha (horários, barbeiros, serviços, pacote ou avulso etc.) MUST ser enviada como
  botão de lista (mensagem de lista da biblioteca Pro), acompanhada de um texto curto e humano. Se o
  cliente responder escrevendo em vez de tocar, o agente MUST entender a resposta do mesmo jeito.
  A confirmação de presença usa botão Quick Reply.
- O agente MUST NOT retomar uma coleta antiga a partir de um simples "Oi".

### XI. Escrita segura na agenda

**MUST:**

- O agente MUST confirmar com o cliente antes de agendar, reagendar ou cancelar.
- Erros da Graces MUST ser tratados pelo campo `code`; uma escrita MUST NOT ser repetida às cegas
  após timeout, e sim verificada antes.
- Havendo pacote, o agente MUST perguntar se o cliente usa a sessão do pacote ou paga avulso.

### XII. Skills e validação de n8n

**MUST:**

- Workflows MUST ser construídos com as skills de n8n disponíveis e validados antes de cada commit.
- O agente MUST ser um nó AI Agent com sub-workflows como ferramentas; o Agent de primeira
  classe do n8n MUST NOT ser usado.

### XIII. Isolamento TESTE/PROD e da VPS

**MUST:**

- TESTE e PROD MUST ter banco (`barbearia_vila_teste` / `barbearia_vila`), prefixos Redis, path e
  webhookId próprios.
- Alterações na VPS MUST ficar restritas à stack `n8n`.
- O agente-00c MUST fazer deploy apenas no TESTE; push, PR e PROD MUST ter aprovação humana do owner.

### XIV. Nenhum segredo no repositório; dados de clientes mínimos

**MUST:**

- Credenciais, tokens e senhas MUST viver apenas nas credenciais do n8n e em `.env` fora do
  repositório, e MUST NOT aparecer em workflow JSON, script, documento, log ou mensagem de commit.
- Dados de clientes (nome, telefone, histórico) MUST ser coletados e persistidos apenas no
  necessário (LGPD).

### XV. Teste antes de produção

**MUST:**

- Toda mudança de workflow MUST passar pela suíte de conversas roteirizadas contra o webhook de
  TESTE antes de ser promovida a PROD.
- Testes na Graces MUST usar sempre o barbeiro de teste e MUST cancelar o que criaram.

### XVI. Veracidade de Dados — Zero Fabricação (NON-NEGOTIABLE)

**MUST:**

- Nenhum artefato pode conter dado factual inventado. Assinaturas de request/response, URLs,
  endpoints, querystrings (inclusive payloads do Chat Master e da Graces) e valores concretos
  (financeiros, quantidades, status, IDs, datas, resultados de API) só podem ser escritos se
  vierem de fonte rastreável (código, OpenAPI, documentação oficial, resposta real observada).
  Esgotadas as fontes, a ação correta é bloqueio humano, nunca suposição plausível.

## Governança

Esta constituição vence qualquer outro documento do projeto. Emenda é PR com aprovação explícita
de um humano registrada no corpo da PR; a versão segue SemVer (MAJOR: princípio removido ou
redefinido; MINOR: princípio ou regra adicionada; PATCH: redação). A primeira versão é a 1.0.0,
ratificada no merge da PR que adota esta constituição.

**Version**: 2.0.0 | **Ratified**: no merge da PR que adota esta constituição | **Last Amended**: 2026-10-18
