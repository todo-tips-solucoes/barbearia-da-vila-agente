# Pesquisa: recepcao-buffer

Nenhuma decisão abaixo toca eixo estrutural novo: linguagem, stack (n8n + Postgres + Redis da stack
`n8n`), persistência e ambiente já foram fixados pelo owner em `docs/decisoes-pre-00c.md`
("Rodar igual ao `goldincision_licienciados`") e pela feature `infra-base`. A referência de
arquitetura é a feature homônima do Gold (`/home/projetos/goldincision_licienciados/docs/specs/recepcao-buffer/`),
validada no TESTE dele.

## Decision 1 - Captura via histórico de execuções do n8n, sem armazenamento novo

**Decision**: o workflow `bv-captura` (só TESTE) tem um Webhook (POST, path e webhookId próprios)
que responde 200 e termina, com `saveDataSuccessExecution: all`. Os eventos brutos ficam só no
histórico de execuções do n8n; `scripts/capturar-webhook.py` os lê pela API pública
(`GET /executions?workflowId=…`, `GET /executions/{id}?includeData=true`), gera os fixtures
anonimizados em `tests/fixtures/chatmaster/` e apaga as execuções (`DELETE /executions/{id}`).
Nenhum evento bruto é gravado em disco versionado nem em tabela.
**Anonimização** (gate owasp, finding HIGH): troca telefone, nome, texto, mídia base64 e IDs por
sintéticos, e também **todo campo de token** (qualquer chave contendo `token`, mais qualquer valor
igual ao token conhecido da conexão); `varrer-segredos.py` e `tests/test_fixtures.py` falham se
o token ou um telefone real aparecer. O `bv-captura` não autentica (o campo de token ainda não é
conhecido): mitigação = janela curta, só eventos do celular de teste viram fixture, e os tipos
observados são conferidos pelo executor antes do contrato.
**Rationale**: FR-002/FR-003, Constituição XIV (dado de cliente mínimo). A conexão 145 é a
conexão padrão da empresa: durante a troca chegam mensagens de clientes reais, que são apagadas
junto com as execuções; só eventos do número de teste do owner viram fixture.
**Alternatives**: tabela `capturas` (exigiria migração só no TESTE e limpeza); arquivo na VPS (fora
do escopo da stack `n8n`).
**Rotas `[HIPÓTESE — a conferir]`**: `docs/infra.md` só confirma `/credentials*` no
`GET /api/v1/openapi.yml` da instância. As rotas de execuções acima NÃO estão confirmadas: a primeira
task de execução lê o `openapi.yml` e usa os caminhos exatos de lá; se não houver listagem com dados
e exclusão de execuções, a captura muda para gravação em tabela temporária no TESTE (alternativa
abaixo) e isso é registrado como Decisão.

## Decision 2 - Registrar e restaurar o webhook da conexão 145

**Decision**: troca e restauração por `POST /api/whatsapp/update` com `whatsappId: 145` e só o
campo `webhook` (os demais ficam como estão). A URL vigente é lida antes da troca em
`POST /api/whatsapp-status` e anotada fora do git (arquivo local `.captura-145.url`, modo 600,
no `.gitignore`). Restauração conferida relendo o status.
**Fonte**: `chatmasterveloz-api/06-conexoes/api-atualizar-conexao.md` ("só o que vier no corpo muda";
"a resposta também diz o que foi de fato alterado") e `api-status-das-conexoes.md`.
**Lacuna**: a doc de `whatsapp-status` diz que cada conexão vem com "nome, canal, status e mensagens
automáticas", sem citar o webhook. Se a resposta real não trouxer a URL, a troca NÃO é feita e a
execução abre bloqueio humano pedindo ao owner a URL atual vista no painel (Conexões → editar →
Integrações). Nunca trocar sem a URL original anotada (FR-001).

## Decision 3 - O contrato do payload sai só da captura

**Decision**: `contracts/webhook-chatmaster.md` nasce com status `PENDENTE DE CAPTURA`. A doc local
(`15-webhooks/webhooks-da-conexao.md`, `arquivos-no-webhook.md`) entra apenas como lista de
**hipóteses a confirmar** (citadas com a página), nunca como contrato. Pontos que a captura decide:
qual dos dois avisos por mensagem é tratado (a doc diz `start` + `fila-data` em QR Code, e que no
QR o texto está em `msg.message`); identificador da mensagem para idempotência; campo de direção;
grupo; onde vem a mídia na biblioteca Pro (doc: base64 em `mensagem[0].mediaData[0].buffer`, que é
o formato do `start`, em conflito com "trate o segundo aviso"); presença de `token_origin`.
**Rationale**: FR-004, Constituição XVI. A doc avisa que "os campos mudam de uma versão da
plataforma para outra".
**Bloqueio previsto**: a captura precisa que o owner envie, do celular de teste para o número da
conexão 145, as mensagens roteirizadas (quickstart, cenário C1). A execução registra bloqueio humano
com o texto exato e o número de destino; o contrato e todo nó que lê o payload esperam por ele.

## Decision 4 - Autenticação do webhook (FR-005)

**Decision**: a conexão só aceita uma URL (`webhook`), sem cabeçalho customizado (fonte:
`api-atualizar-conexao.md`, `webhooks-da-conexao.md` "Onde ligar"). Duas camadas:
1. path e webhookId imprevisíveis por ambiente (UUID), nunca reutilizados entre TESTE e PROD;
2. verificação do token da conexão que vem no corpo (doc: `token_origin`, `connection_token`), comparado
   por **hash**: o workflow guarda só o SHA-256 do token esperado (`{{BV:webhook.token_sha256}}`,
   injetado pelo deploy a partir de `.env.n8n`, fora do git) e calcula o SHA-256 do valor recebido
   com o nó Crypto. Diferente ou ausente = recusa (HTTP 401, sem corpo com dados).
`bv-recepcao` e `entregar-rajada` rodam com `saveDataSuccessExecution: none` (erros continuam
salvos): o histórico do n8n não acumula token nem PII de cada evento (gate owasp, MEDIUM).
**Rationale**: Constituição XIV proíbe token em workflow JSON; o hash não serve para chamar a API.
Corrige a fraqueza do Gold (token em claro no workflow publicado, checagem desligada no TESTE).
**Condicional**: se a captura mostrar que nenhum campo de token chega nos eventos QR Pro, o fallback
é segredo na querystring da URL (`?k=`), conferido também por hash — só se a captura mostrar a
querystring preservada. Sem nenhum dos dois: bloqueio humano.
**Alternatives**: Basic Auth na URL (doc não confirma suporte do Chat Master); Header Auth do n8n
(Chat Master não envia cabeçalho próprio).

## Decision 5 - Postgres é a fonte da verdade da rajada; Redis só relógio e posse

Igual ao Gold (Decision 1 de lá). A rajada é o conjunto de `mensagens` de entrada do contato com
`processada_em IS NULL`, ordem `criado_em, id`. Redis (DB 2, prefixo do ambiente) guarda
`ultima:<contato_id>` e `lock:<contato_id>`. Mensagem aceita nunca fica só em memória (SC-007).
Chave Redis usa `contato_id`, não telefone (FR-019: telefone fora de chaves e logs).

## Decision 6 - Buffer "última mensagem vence" com teto

Igual ao Gold (Decision 2): grava `ultima = mensagem_id`, espera `buffer.janela_s` (8), relê; só a
execução da última mensagem entrega, exceto se a pendente mais antiga passou de `buffer.teto_s` (60,
Clarifications da spec). Mensagem que chega no instante do vencimento: está no Postgres antes de
gravar o token, então entra no turno corrente (se a leitura de pendentes ainda não ocorreu) ou no
seguinte (a própria execução dela entrega) - nunca perdida; duplicação impedida pelo lock + marcação.

## Decision 7 - Posse do contato (lock) e marcação só após sucesso

Igual ao Gold (Decision 3 + ajustes validados): `GET lock`; livre → `INCR` + `EXPIRE lock.ttl_s`
(120); valor 1 = posse. Negado → espera `lock.espera_s` (3) e repete até `lock.tentativas` (45).
Com posse: lê pendentes, grava `turno_id` (UUID) e `turno_em` nelas, chama `entregar-rajada`, marca
`processada_em` só no sucesso, libera (`DEL`) sempre. Falha da entrega: as linhas voltam a
`turno_id NULL` e a execução termina em erro visível (registro de falha, SC-007). Processamento
travado: a validade de 120 s libera o contato (FR-013).
Nota do Gold: o nó Redis `INCR` devolve o valor sob a própria chave; repetir `INCR` renovaria a
validade de um lock travado, por isso o `GET` antes.

## Decision 8 - Idempotência (FR-014)

`mensagens.mensagem_id_canal UNIQUE` (já na `0001`) com `INSERT … ON CONFLICT DO NOTHING`: sem linha
nova = duplicado, a execução termina sem tocar o buffer. A janela de deduplicação é a vida da linha
(maior que qualquer janela configurável); a retenção do histórico é pendência LGPD do owner (P7 em
`docs/infra.md`). O campo exato do identificador vem da captura (Decision 3).

## Decision 9 - Mídia da biblioteca Pro

**Decision**: se a captura confirmar a mídia embutida em base64, ela vai para a tabela
`midias_recebidas` (bytea + mimetype), referenciada pela mensagem; a feature 3 lê, transcreve ou
interpreta e a apaga. Expira em `midia.retencao_h` (24) por limpeza no próprio fluxo de recepção
(`DELETE … WHERE expira_em < now()` a cada entrada, barato pelo índice). Se a captura mostrar URL de
download, guarda-se a URL em `mensagens.midia_url` e a tabela não é criada.
**Rationale**: FR-008 ("referência da mídia preservada"), FR-019 (dado mínimo, com expiração).
Payload base64 é grande (doc `arquivos-no-webhook.md`); fica fora do Redis.
**Tipos não suportados** (vídeo, figurinha, documento, localização…) e grupos: descartados antes do
buffer, com log do motivo sem dado pessoal (FR-006). A feature 3 pode rever isso.

## Decision 10 - Ponto de entrega `entregar-rajada` substituível

Igual ao Gold (Decision 4). `workflows/sub/entregar-rajada.json` recebe o turno
(`contracts/entrega-turno.md`) e devolve sucesso/falha. No TESTE é um stub: espera
`teste.atraso_entrega_s` (3, para exercitar US4) e retorna sucesso, sem enviar nada ao WhatsApp. A
feature 3 troca o corpo sem tocar a recepção.

## Decision 11 - Deploy: placeholders, includes e sub-workflows

`scripts/deploy-n8n.py` hoje faz GET → PUT → publish de `workflows/<nome>.json` por id do config.
Extensão no padrão do Gold: (a) `{{BV:<chave>}}` resolvido de `config/ambientes/<amb>.json` (+
`webhook.token_sha256` de `.env.n8n`), placeholder sem valor aborta; (b) `// @bv-include <arq>.js`
substituído por `workflows/shared/<arq>.js`; (c) `workflows/sub/*.json` publicados antes e o id
injetado por `{{BV:workflows_sub.<nome>}}`; (d) `bv-captura` recusado em produção. PROD continua com
a trava `BV_DEPLOY_PRODUCAO_AUTORIZADO=sim` + `--confirmar-id`; com `webhook.path` de PROD vazio o
deploy de PROD aborta (FR-017).

## Decision 12 - Testes

- Unitários (CI, sem rede): `tests/rajada.test.js` (node, `workflows/shared/rajada.js`: decisão de
  entrega, consolidação, normalização com fixtures), `tests/test_deploy_n8n.py` (placeholders,
  include, sub antes, recusa de captura em PROD), `tests/test_esquema.py` (migração 0002),
  `tests/test_fixtures.py` (varredura de PII nos fixtures, SC-005).
- Integração no TESTE: `scripts/smoke-recepcao.py` posta fixtures no webhook de TESTE com contatos
  sintéticos (telefones fictícios marcados em `teste.contatos_sinteticos`) e confere no Postgres
  TESTE (`turno_id`, `processada_em`) os cenários US2–US5 e SC-001..SC-004/SC-007; limpa o que criou
  (linhas dos contatos sintéticos e chaves `bv:teste:`).
- Validação MCP do n8n (`validate_workflow`) de cada workflow antes do commit (Constituição XII).
