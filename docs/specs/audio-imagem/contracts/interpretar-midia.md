# Contrato: `interpretar-midia` (`entregar-rajada` → sub-workflow)

`[PROPOSTA — a validar na implementacao]` Contrato interno novo.

## Chamada

Execute Workflow (espera o resultado) para `workflows/sub/interpretar-midia.json`, id injetado por
`{{BV:workflows_sub.interpretar_midia}}` (gravado por `deploy-n8n.py --criar`). Gatilho "When
Executed by Another Workflow". No nó chamador: `alwaysOutputData: true` e
`onError: continueRegularOutput`. Settings do sub: `saveDataSuccessExecution` e
`saveDataErrorExecution` = `none`, `saveManualExecutions` = `false`, `executionTimeout` =
`midia.execucao_timeout_s`.

Chamado só quando o turno tem item com `tipo` ≠ `texto`. No máximo `midia.max_por_turno` itens
por chamada; os excedentes não são baixados, voltam com `motivo = 'excedente'` e contam como não
compreendidos. Motivo do teto: o turno inteiro precisa caber em `lock.ttl_s` (120 s, contrato
`recepcao-buffer/contracts/entrega-turno.md`).

## Entrada

```json
{
  "contato_id": 123,
  "itens": [
    { "mensagem_id": 11, "tipo": "audio", "midia_url": "https://...", "midia_mime": "audio/ogg; codecs=opus",
      "midia_segundos": 5, "midia_bytes": 9694 },
    { "mensagem_id": 12, "tipo": "imagem", "midia_url": "https://...", "midia_mime": null,
      "midia_segundos": null, "midia_bytes": 202663 }
  ]
}
```

Os valores de exemplo de áudio vêm de `tests/fixtures/chatmaster/evento-20.json`; os de imagem, de
`evento-13.json` (`fileLength`; MIME mascarado na fixture, por isso `null`).

## Saída

```json
{ "resultados": [
  { "mensagem_id": 11, "texto": "quero cortar o cabelo amanhã de tarde", "motivo": null },
  { "mensagem_id": 12, "texto": null, "motivo": "host_recusado" }
] }
```

- Um resultado por item de entrada, mesma ordem. `texto` não vazio ⇔ `motivo = null`.
- `motivo` ∈ códigos de `data-model.md` (Falha de mídia) + `excedente`.
- Saída ausente ou erro do sub (nó chamador com `continueRegularOutput`): o `entregar-rajada`
  trata todos os itens de mídia como `motivo = 'interpretacao'` sem gravar nada.

## Efeitos

- `UPDATE mensagens SET conteudo_derivado = $2, midia_falha = NULL WHERE id = $1` para cada
  sucesso; `SET midia_falha = $2` para cada falha (query parametrizada).
- Uma linha em `falhas_agente` (`tipo='midia'`) por falha, sem conteúdo pessoal.
- Nenhum log de URL, binário, transcrição ou descrição. Binário só em memória da execução.

## Cadeia de nós (desenho)

```text
Gatilho -> Validar (Code: https, host do tipo, MIME, limites antes) -> Pode baixar? (IF)
  sim -> Baixar (HTTP GET, sem auth, maxRedirects 0, timeout, arquivo, neverError)
      -> Conferir (Code: status, tamanho real, nome/MIME do binário pelo fileMimeType)
      -> Áudio ou imagem? (Switch)
           áudio  -> Transcrever (HTTP POST /v1/audio/transcriptions, openAiApi) -> Texto áudio
           imagem -> Descrever (nó OpenAI nativo ou HTTP, ver research D4)     -> Texto imagem
  não -> (motivo já definido)
-> Juntar (Merge append) -> Gravar (Postgres) -> Registrar falhas (Postgres) -> Resumo (Code)
```

Todos os nós de rede: `onError: continueRegularOutput`. Nós validados por `validate_node_config`
antes do deploy e conferidos por `get_workflow_details` depois (FR-015).
