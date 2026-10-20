# Workflows n8n

Fonte versionada dos workflows. Os JSON usam placeholders `{{BV:...}}` (config do ambiente, `{{BV:INCLUDE:shared/rajada.js}}`, `{{BV:TOKEN_SHA256}}`); `scripts/deploy-n8n.sh <integracao|producao>` renderiza e publica. Ids em `config/ambientes/*.json` e `docs/infra.md`.

| Workflow | Arquivo | TESTE (id) | PROD |
|----------|---------|------------|------|
| bv-recepcao | `bv-recepcao.json` | `iaUbATlT7xkZArVd` | nao criado (config vazio) |
| entregar-rajada (agente) | `sub/entregar-rajada.json` | `ilzXqBWGtcczlGEu` | nao criado |
| bv-captura | `bv-captura.json` | `wXcRwAdqRnGgRzA9` | nunca (deploy recusa) |
| bv-verificacao | `bv-verificacao.json` | `uoDF0RFEgzAtKUay` | nao criado |
| bv-graces | `sub/bv-graces.json` | `mjhd7O0AzrqNVrf0` | nao criado (recusa `teste.*`) |
| bv-vigia | `bv-vigia.json` | `fzJA2yWESqiPXyib` | nao criado (config vazio) |
| interpretar-midia | `sub/interpretar-midia.json` | vazio ate o deploy (`workflows_sub.interpretar_midia`) | nao criado |

## bv-recepcao

Webhook `POST` com auth por SHA-256 de `body.token_origin` (401), normalizacao (400 malformado, 200 descartado/aceito), grava em `mensagens`, espera `buffer.janela_s`, entrega o turno (um por contato, posse no Redis) a `entregar-rajada` e marca `processada_em`. Contrato: `docs/specs/recepcao-buffer/contracts/entrega-turno.md`. O stub atrasa `teste.atraso_entrega_s`; a feature 3 o substitui.

Smoke no TESTE: `python3 -I scripts/smoke-recepcao.py` (contatos `+55000000xxxx`, limpa Postgres/Redis de TESTE no fim; `teto` (~80 s) e `ttl` (~5 min) rodam a parte; `falha` (SC-007) e `redis` (CA-4, senha invalida so na credencial do workflow de TESTE, restaurada no fim) rodam por padrao).

Falhas: `falhas_recepcao` (migracao 0003) guarda so tipo, motivo, `contato_id` e instante, para payload malformado, falha de entrega e erro de comando no Redis. Limite conhecido: o no Redis do n8n reconecta sem fim quando a conexao/autenticacao falha, entao nesse caso nada e registrado e a mensagem fica pendente (nao se perde; a proxima mensagem do contato a entrega). A posse so e liberada por quem ainda e dono (FR-012): o `DEL` depende de o turno ainda possuir as linhas (`count(*)`) ou, em turno vazio, de estar dentro de `lock.ttl_s`.

Robustez da recepcao (feature `recepcao-robustez`, so TESTE): o `200` de aceita sai so depois de `Inserir mensagem` devolver `id` (`Gravada?`); falha em `Upsert contato`/`Inserir mensagem` registra `gravacao|contato_falhou` ou `gravacao|mensagem_falhou` (sem PII) e responde `500` (mesmo se o registro falhar). Texto sem `idCanal` e deduplicado por conteudo na mesma query (`marcas_conteudo`: contato + sha256 do texto, janela `dedup.conteudo_janela_s`; `Limpar marcas` apaga as vencidas); midia e mensagem com id seguem a regra por id. Risco aceito: um "ok" repetido de proposito dentro da janela e descartado. A execucao tem `executionTimeout` = `execucao.timeout_s` (300 s `[PROPOSTA]`): medido que o n8n cancela a execucao com no Redis pendurado (status `canceled`), mas o error workflow NAO dispara no cancelamento, entao esse caso nao e registrado em `falhas_recepcao` (pendente de decisao do owner). `deploy-n8n.sh --criar NOME` grava o id em `workflows_sub` quando o nome esta la. Smoke novo: `gravacao` (S1/S2) e `dedupe` (S4).

## Notas

- PROD fica inativo: sem `BV_DEPLOY_PRODUCAO_AUTORIZADO=sim` + `--confirmar-id` o deploy recusa (exit 2); `webhook.path` de PROD esta vazio.
- Texto do canal nao traz id de mensagem: duplicata so e barrada para midia (id = fileUrl). Pendente com o owner.

## bv-vigia

Agendado a cada 5 min (TESTE). Apaga de `tentativas_recepcao` as linhas mais velhas que `execucao.timeout_s` + 30 s e registra cada uma em `falhas_recepcao` (`redis_indisponivel|tempo_esgotado`, so `contato_id`, sem PII). Alem disso, o no `Reter midia` expurga a midia de `mensagens` mais velha que `midia.retencao_h` (`midia_url`, `midia_mime`, `conteudo`, `conteudo_derivado` NULL; `mensagem_id_canal` vira `sha256:<hex>`; idempotente). Cobre o no Redis pendurado, que o `executionTimeout` cancela sem disparar error workflow. A mensagem segue pendente (`processada_em` nulo) e e entregue no turno seguinte do contato. Criacao: `scripts/deploy-n8n.sh integracao --criar bv-vigia`.

## bv-graces

Sub-workflow das 10 ferramentas do agente (`contracts/ferramentas-graces.md`). Logica pura em `shared/graces.js` (testes: `node tests/graces.test.js`, `tests/test_workflows_agente.py`). Fluxo: `Normalizar` (recusa campo desconhecido) -> `Contexto` (SQL com a reivindicacao atomica da proposta na fase 2) -> `Planejar` -> HTTP Graces (ate 3 estagios: leitura/revalidacao, escrita, 2a escrita do `trocar_servico`) -> `Efeitos` -> `Persistir` (conversa, proposta, `falhas_agente`). Escrita so em TESTE e sempre redirecionada ao barbeiro de teste; so em barbeiro de teste se mexe em agendamentos existentes. `cadastrar_cliente` fica travado (`cadastroLiberado:false`) ate o P1; `cadastrar_terceiro` usa a trava propria `terceiroLiberado` (config `terceiro.cadastro_liberado`: true no PROD, false no TESTE). O `Contexto` devolve `dia` (`buscas`, `cadastros` do dia de Sao Paulo) para os limites diarios. Limite conhecido: `listar_servicos` nao filtra servico "sem barbeiro real" (exigiria uma chamada por servico); `listar_barbeiros` devolve vazio com orientacao.

## entregar-rajada (agente)

Substitui o stub (mesmo id e contrato de turno). Fluxo: `Registrar turno` (idempotente por `turno_id`) -> `Ler contexto` -> `Preparar` (recencia, historico, prompt) -> `Sessao` -> `Tem midia?` -> `Itens de midia` -> `Interpretar midia` (sub `interpretar-midia`, `continueRegularOutput`) -> so midia (`textos.midia_nao_entendida`/`textos.midia_grande`, a `grande` vence) / limite por hora (`textos.humano`) / `Agente` (AI Agent 3, `lmChatOpenAi` 1.3, 10 `toolWorkflow` para `bv-graces`, sem memoria) -> `Compor` -> `Saidas` -> posicoes 1..4 (`Gravar saida` -> `Simulado?` -> digitando -> `Espera` -> envio -> `Enviado?`) -> `Concluir turno`. Erro do agente: `falhas_agente` + `textos.contingencia`. Envio real so para `teste.contatos_escrita` (vazio ate o P2): os demais contatos sao simulados. O smoke da recepcao (`smoke-recepcao.py`) dependia dos marcadores `__lento__`/`__falha__` do stub e nao se aplica mais a este workflow. Executado no TESTE por `scripts/smoke-agente.py` (OpenAI e Graces reais, contatos simulados `+5500000000xxx`, nenhum envio ao Chat Master; politica: ver docs/infra.md "Agente: ids, ordem do fluxo e politica de teste"). Smoke achou e corrigiu o no `Sessao` (`''::jsonb` num ramo de `CASE` e avaliado no planejamento do Postgres: usar `NULLIF($3::text,'')::jsonb`).

## interpretar-midia

Sub-workflow chamado pelo `entregar-rajada` (no `Interpretar midia`, `continueRegularOutput`) so quando o turno tem audio, imagem ou `outro`. Cadeia: `Validar` (host, MIME, limites) -> `Tipo da midia`; audio: `Baixar` (sem credencial, sem redirecionamento, timeout `midia.download_timeout_s`) -> `Conferir` -> `Transcrever` (OpenAI); imagem: `Baixar imagem` (Code, em memoria, sem binario n8n) -> `Descrever` (`/v1/responses`) -> `Juntar` -> `Gravar` (`conteudo_derivado`/`midia_falha`) -> `Registrar falhas` (`falhas_agente.tipo='midia'`, so codigo e host) -> `Resumo`. Execucoes nao sao salvas (`saveData*` = `none`) e nada de URL, transcricao ou descricao vai a log. Contrato: `docs/specs/audio-imagem/contracts/interpretar-midia.md`. Criacao: `scripts/deploy-n8n.sh integracao --criar interpretar_midia` (a chave do config usa `_`), antes de publicar o `entregar-rajada`.
