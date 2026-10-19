# Contrato externo: OpenAI (transcrição e imagem)

Contrato de serviço existente. Só o que está na documentação oficial lida em 2026-10-19 é afirmado;
o resto está marcado "não medido".

## Transcrição `[EXISTENTE]`

- `POST https://api.openai.com/v1/audio/transcriptions`, `multipart/form-data`.
  Fonte: https://developers.openai.com/api/docs/api-reference/audio/createTranscription
- Campos usados: `file` (binário), `model` (`midia.transcricao_modelo`), `language` (`pt`).
  Fonte dos campos: exemplos `-F file=... -F model=...` da página acima; `language` como dica de
  idioma para modelos que aceitam um só idioma (guia
  https://developers.openai.com/api/docs/guides/speech-to-text).
- Resposta usada: campo `text` do JSON.
- Formatos aceitos pelo guia: mp3, mp4, mpeg, mpga, m4a, wav, webm. **Ogg não está na lista.**
  Envio de Ogg/Opus nomeado `.ogg`: funciona no projeto de referência (commit `3beeb3e`, `git show` no repositório
  `goldincision_licienciados`), **não medido aqui** — sonda obrigatória na primeira tarefa.
- Limite: "Files can be up to 25 MB" (guia).
- Autenticação: credencial n8n `openAiApi` "Barbearia Vila OpenAI" (`predefinedCredentialType`);
  a chave nunca aparece no workflow.

## Imagem (forma da chamada medida em 2026-10-19, sonda 2.2)

- **Medido**: `POST https://api.openai.com/v1/responses` com `model = gpt-5.6-luna` e
  `input = [{"role":"user","content":[{"type":"input_text","text":"<prompt>"},{"type":"input_image","image_url":"data:image/png;base64,<...>","detail":"auto"}]}]`
  → 200; texto em `output[].content[].text` do item `type = message`. PNG 64x64 gerado no teste
  (sem dado de cliente). `POST /v1/chat/completions` com `image_url: {url, detail}` também → 200.
- **Escolha para o sub**: nó HTTP Request na Responses API (credencial `openAiApi`
  predefinida); o nó OpenAI nativo do n8n não foi testado.

### Não medido antes da sonda (histórico)

- Entrada documentada: `{"type": "input_image", "image_url": "data:<mime>;base64,<...>",
  "detail": "<low|high|original|auto>"}`. Fonte:
  https://developers.openai.com/api/docs/guides/images-vision
- Tipos aceitos: PNG, JPEG, WEBP, GIF não animado (mesma página).
- **Não medido**: caminho HTTP e corpo completo da requisição (a página lida não os mostra); se o
  nó OpenAI nativo do n8n aceita binário para análise de imagem com o modelo `gpt-5.6-luna`; se o
  modelo aceita `detail: original`. Resolvidos na tarefa do sub-workflow, com a página oficial
  citada no commit, antes de escrever o nó.
- Saída usada: o texto da resposta do modelo (descrição).

## Erros

Status ≠ 2xx ou tempo esgotado → `motivo = transcricao` ou `interpretacao`; `status_http` vai para
`falhas_agente`. Corpo do erro não é gravado (pode ecoar conteúdo).
