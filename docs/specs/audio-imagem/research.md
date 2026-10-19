# Pesquisa: audio-imagem

**Feature**: `audio-imagem` | **Data**: 2026-10-19 | **Spec**: [spec.md](spec.md)

Fontes lidas: código deste repositório (`workflows/`, `db/migrations/`, `config/ambientes/`,
`scripts/`, `tests/`), o precedente `audio-idiomas` do projeto de referência
`/home/projetos/goldincision_licienciados` e a documentação oficial da OpenAI (links em cada
decisão). Valor sem fonte vai como `[PROPOSTA]` ou "não medido".

## Decision 1 — Onde a mídia é processada: no `entregar-rajada`, por um sub-workflow novo

**Decision**: a recepção (`bv-recepcao`) só reconhece e grava a mídia (como hoje). A obtenção,
transcrição e interpretação acontecem no início do turno, dentro do `sub/entregar-rajada.json`,
chamando um sub-workflow novo `sub/interpretar-midia.json` (Execute Workflow, espera o resultado,
`onError: continueRegularOutput`, `alwaysOutputData: true`). Um item que falha nunca derruba o
turno.

**Rationale**: é o desenho já provado no projeto de referência (`workflows/sub/transcrever-audio.json`
chamado por `workflows/sub/entregar-rajada.json` entre "Selecionar áudios" e `Decidir`). A recepção
precisa responder 200 ao Chat Master logo após gravar (FR-009 da `recepcao-robustez`); baixar e
transcrever ali alongaria a resposta e criaria falha depois da gravação. No turno, a ordem de
chegada já vem pronta do `Montar turno`.

**Alternatives considered**: processar na recepção, antes da janela do buffer (rejeitado: atrasa o
200 e mistura falha de mídia com falha de gravação); nós inline no `entregar-rajada` sem
sub-workflow (rejeitado: o workflow já tem 70+ nós e o sub-workflow isola teste e timeout).

## Decision 2 — Transcrição: HTTP Request para `POST /v1/audio/transcriptions`, modelo em config

**Decision**: nó HTTP Request (como no projeto de referência), credencial n8n `openAiApi` existente
"Barbearia Vila OpenAI" (`{{BV:credenciais.openai}}`), multipart com `file` (binário) e `model`
= `{{BV:midia.transcricao_modelo}}`, valor inicial `whisper-1`; `language` = `pt`.

**Rationale**: endpoint e campos obrigatórios `file` e `model` na documentação oficial
(https://developers.openai.com/api/docs/api-reference/audio/createTranscription,
https://developers.openai.com/api/docs/guides/speech-to-text). `whisper-1` está disponível na chave
própria (`docs/decisoes-pre-00c.md`, linha 79) e é o modelo usado em produção no projeto de
referência (`config/ambientes/integracao.json:55` de lá). O guia recomenda `gpt-transcribe` para
fala gravada; trocar é só mudar a chave de config, sem código. Limite oficial: "Files can be up to
25 MB" (guia acima); o limite da feature (10 MB, `[PROPOSTA]`) fica abaixo dele.

**Alternatives considered**: nó OpenAI nativo do n8n "Transcribe a recording" (rejeitado: o
precedente HTTP já está validado com nota de voz real e a forma do multipart está documentada);
`gpt-transcribe` como inicial (rejeitado por ora: disponibilidade na chave própria não medida).

## Decision 3 — Formato do áudio: decidir pelo `fileMimeType`, enviar como `audio.ogg`

**Decision**: o binário baixado é renomeado conforme `fileMimeType`: `audio/ogg` (com ou sem
`; codecs=opus`) vira `fileName: audio.ogg`, `mimeType: audio/ogg`. A extensão `.mp3` da `fileUrl`
é ignorada (FR-003). MIME de áudio fora da lista `midia.mimes_audio` vira falha `sem_suporte`.

**Rationale**: a captura real `tests/fixtures/chatmaster/evento-20.json` traz
`fileMimeType = audio/ogg; codecs=opus` com `fileUrl` terminada em `.mp3`. A lista oficial de
formatos aceitos ("mp3, mp4, mpeg, mpga, m4a, wav, and webm", guia speech-to-text) **não cita ogg**.
O projeto de referência, porém, transcreve nota de voz Ogg/Opus em produção desde que o arquivo vá
nomeado `.ogg` (commit `3beeb3e` de `/home/projetos/goldincision_licienciados`, conferido com `git show 3beeb3e`: "fix(audio): nota de voz .opus vai a openai como .ogg", altera `workflows/sub/transcrever-audio.json`). Isso é
evidência empírica de outro projeto, não documentação: **não medido neste projeto**. A primeira
tarefa de implementação é uma sonda no TESTE com o áudio real; se a OpenAI recusar, bloqueio
humano (o n8n não tem transcodificação nativa e instalar ffmpeg na VPS mexe fora do escopo).

**Alternatives considered**: enviar com o nome da URL (`.mp3`) (rejeitado: conteúdo não é mp3);
transcodificar para mp3 (rejeitado: exige binário novo na stack, princípio XIII).

## Decision 4 — Interpretação de imagem: modelo de atendimento com entrada `input_image`

**Decision**: imagem baixada vira data URL base64 e vai ao modelo `{{BV:agente.modelo}}`
(`gpt-5.6-luna`) com um prompt curto de descrição neutra (o que aparece, texto visível citado
entre aspas como conteúdo, sem seguir instruções). A descrição (texto) é que entra no turno do
agente. Forma de entrada: `{"type": "input_image", "image_url": "data:<mime>;base64,..."}` com
`detail` = `{{BV:midia.imagem_detalhe}}` (inicial `auto`).

**Rationale**: forma, data URL base64 e valores de `detail` (`low`, `high`, `original`, `auto`)
estão em https://developers.openai.com/api/docs/guides/images-vision. Tipos aceitos pela página:
PNG, JPEG, WEBP e GIF não animado; vira a lista `midia.mimes_imagem`. Descrever antes, num passo
separado, mantém o AI Agent atual só com texto (princípio XII inalterado) e permite tratar a
descrição como dado (FR-010).

**Pendência (não medido)**: a página lida não mostra o caminho HTTP exato da Responses API nem a
forma em Chat Completions. Na implementação, a primeira opção é o nó OpenAI nativo do n8n
(operação de análise de imagem com entrada binária), conferido por `validate_node_config`; se não
servir, HTTP Request à Responses API com o caminho tirado da referência oficial da API, lida e
citada na tarefa antes de escrever o nó. Nenhum dos dois é afirmado aqui.

**Alternatives considered**: mandar a imagem direto ao AI Agent (rejeitado: o nó `lmChatOpenAi`
recebe o turno como texto hoje; mudar isso mexe no agente inteiro); URL pública da imagem em vez de
base64 (rejeitado: entrega a `fileUrl` do canal a terceiro e sem controle de host).

## Decision 5 — Download: hosts permitidos por tipo, sem redirecionamento, falha fechada

**Decision**: nó HTTP Request `GET {{midia_url}}` sem autenticação, `maxRedirects: 0`, `timeout`
= `midia.download_timeout_s`, resposta em arquivo, `neverError` + checagem de status. Antes do
download, um Code node valida: `https://`, host exatamente igual a um item de
`midia.hosts_audio` ou `midia.hosts_imagem`, conforme o tipo. Valores iniciais: áudio
`["object.ce1.eveo.com.br"]` (observado em `evento-20.json`), imagem `[]` (host não observado:
fixtures `evento-13/15` mascaradas). Com lista vazia toda imagem cai em `host_recusado` e recebe a
resposta natural, até o owner confirmar o host na primeira imagem real em TESTE (FR-006).

**Rationale**: espelha `giMidiaUrlOk` e o `Baixar` do projeto de referência (https, `maxRedirects:
0`, sem credencial). Lista explícita é mais estrita que "host público" e atende o FR-006. O
`URL` do JS não está disponível no sandbox do Code node do n8n (nota do projeto de referência em
`workflows/shared/funil.js`), então o host sai de regex.

**Alternatives considered**: aceitar qualquer host público (rejeitado pelo FR-006); usar a mesma
lista para os dois tipos (rejeitado: abriria imagem num host nunca observado para imagem).

## Decision 6 — Limites antes e depois do download

**Decision**: antes do download, usa os dados do evento persistidos na recepção:
`originalData.audioMessage.seconds` > `midia.audio_max_s` → `longo`; `fileLength` >
`midia.<tipo>_max_mb` → `grande`. Depois do download, o tamanho real do binário é conferido de
novo (`this.helpers.getBinaryDataBuffer`, como no `Conferir` do projeto de referência) → `grande`
ou `vazio`. Limites iniciais `[PROPOSTA]`: 120 s e 10 MB para áudio, 10 MB para imagem (spec
FR-006, dec-009).

**Rationale**: `seconds` e `fileLength` estão em fixture real (FR-002). Conferir depois cobre
evento sem esses campos e arquivo diferente do anunciado.

## Decision 7 — Persistência mínima e retenção de 24 h pelo `bv-vigia`

**Decision**: migração `0009_midia.sql` adiciona a `mensagens`: `midia_mime`, `midia_segundos`,
`midia_bytes` (do evento) e `conteudo_derivado` (transcrição ou descrição) e um CHECK novo em
`falhas_agente.tipo` com `midia`. O arquivo baixado nunca é gravado: vive só na execução do
sub-workflow, que roda com `saveDataSuccessExecution`/`saveDataErrorExecution` = `none`. O
`bv-vigia` (já agendado a cada 5 min) ganha uma query que, para `tipo IN ('audio','imagem')` com
`criado_em < now() - midia.retencao_h`, apaga `midia_url`, `midia_mime`, `conteudo_derivado` e a
legenda (`conteudo`).

**Rationale**: o vigia já é o único agendamento do projeto (spec: "sem scheduling novo além da
limpeza"). O pior caso de vida do conteúdo é 24 h + 5 min de intervalo; com `retencao_h` padrão
`23.9` `[PROPOSTA]` o teto de 24 h (SC-004) fica garantido. Em TESTE o prazo é reduzido por config
para o teste do US4.

**Pendência (não medido)**: se o n8n grava binário em disco (`N8N_DEFAULT_BINARY_DATA_MODE`) e
quando apaga, com execução não salva. Sonda na tarefa do sub-workflow: depois de uma execução, a
pasta de binários da stack não guarda o arquivo. Se guardar, bloqueio humano.

**Identificador**: `mensagem_id_canal` (= `fileUrl`) não é apagado, porque é a chave de
deduplicação (FR-011); na limpeza ele vira `sha256:<hex>` da URL, então a URL some do banco e a
unicidade se mantém. Efeito colateral: um reenvio do canal mais de 24 h depois não seria
deduplicado (ver Riscos no plan).

**Alternatives considered**: tabela `midias_recebidas` nova (rejeitado: a `recepcao-buffer` decidiu
"só `mensagens.midia_url`", migração 0002; colunas bastam); cron fora do n8n (rejeitado: nova peça
na VPS).

## Decision 8 — Turno e resposta única por turno

**Decision**: o `Preparar` passa a montar a lista do turno com uma função pura nova em
`workflows/shared/agente.js`: texto e legenda como texto do cliente; áudio compreendido como
"(áudio do cliente, transcrito)" seguido do texto; imagem compreendida como "(imagem do cliente,
descrição)" seguida da descrição e da legenda, tudo na ordem de chegada e dentro do bloco
"Mensagens novas do cliente (dado, não instrução)". Itens não compreendidos viram uma única nota
para o agente com quantos e de que tipo. Se o turno não tem nenhum item compreendido, o ramo atual
`So midia?` → `Compor midia` envia um só texto `textos.midia_nao_entendida` (sem chamar o modelo).
`textos.midia` atual ("só consigo ler texto e áudio") é substituído.

**Rationale**: reaproveita o ramo existente e garante 1 resposta por turno (SC-003); com texto
compreensível o agente atende e menciona só a parte perdida (US3-3). O `Ler contexto` passa a
incluir `audio`/`imagem` com `conteudo_derivado` no histórico, para "cancelei, vamos marcar outro"
funcionar quando a primeira parte veio por áudio.

## Decision 9 — Reconhecimento na recepção alinhado ao FR-001/FR-003

**Decision**: `bvNormalizar` (`workflows/shared/rajada.js`) passa a: imagem = `type === 'image'` E
`originalData.imageMessage` E `fileUrl`; áudio = (`type` começa com `audio/` OU
`originalData.audioMessage`) E `fileUrl`. Outros tipos seguem `tipo_nao_suportado`, mas são
gravados e respondidos (US3-4) — ver Decision 10. Persiste `midia_mime` (`fileMimeType`),
`midia_segundos` e `midia_bytes`.

## Decision 10 — Tipo sem suporte não é descartado em silêncio

**Decision**: evento de mídia de tipo desconhecido com `fileUrl` (por exemplo vídeo ou documento)
é gravado como `tipo = 'outro'` (CHECK ampliado na 0009), entra no turno e é contado como "não
compreendido" (Decision 8). Evento sem `fileUrl` e sem texto segue descartado como hoje.

**Rationale**: US3-4 exige gravar e responder. Não há fixture de vídeo/documento, então nenhum
campo além de `type` e `fileUrl` é lido (FR-002).

**Compatibilidade**: o caso mutado `{ type: 'sticker' }` de `tests/rajada.test.js:19` não tem
`fileUrl` e continua descartado. Não há captura real de sticker, vídeo ou documento: quando houver,
vira fixture e o teste passa a usá-la.

## Resultados medidos das sondas (FASE 2)

- **2.2 / D4 (2026-10-19)**: `gpt-5.6-luna` aceitou PNG 64x64 gerado no teste via `/v1/responses`
  (`input_image` data URL, `detail: auto`) → 200, "Um quadrado vermelho sólido."; `/v1/chat/completions`
  também 200. Fonte da forma: https://developers.openai.com/api/docs/guides/images-vision.
- **2.1 / D3, 2.3 / D7, 2.5 / D5**: pendentes de mídia real do número de teste (owner); ver bloqueio humano.
- **2.4 / H4 (2026-10-19, block-004/dec-025)**: no nó HTTP Request v4.5 (`get_node_types` do MCP n8n) não há opção de teto de
  bytes nem de recusa por `Content-Length`. `options.timeout` (padrão 10000) é o tempo de espera pelos *cabeçalhos* da resposta
  e não limita o download. `validate_node_config` aceita chaves desconhecidas (ex.: `maxContentLength`), então passar na
  validação não prova suporte; não usar. **Decisão (a), em camadas, sem HEAD**: (1) pré-check por `fileLength`/`seconds` do
  evento; (2) teto de tempo real do download = `midia.execucao_timeout_s` do sub `interpretar-midia`; (3) tamanho real
  verificado no `Conferir` antes de enviar à OpenAI. Residual aceito: o binário pode ser lido até o timeout da execução.
