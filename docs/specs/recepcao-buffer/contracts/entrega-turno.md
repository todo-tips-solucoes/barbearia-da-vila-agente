# Contrato: entrega do turno (recepção → `entregar-rajada`)

`[PROPOSTA — a validar na implementacao]` Contrato interno novo, consumido pela feature 3 (FR-020).

## Chamada

Execute Workflow (`wait for completion`) para `workflows/sub/entregar-rajada.json`, id injetado por
`{{BV:workflows_sub.entregar_rajada}}`. Gatilho do sub: "When Executed by Another Workflow".

## Entrada

```json
{
  "turno_id": "uuid",
  "contato_id": 123,
  "telefone": "5511900000000",
  "total": 2,
  "itens": [
    { "mensagem_id": 10, "tipo": "texto", "conteudo": "texto", "midia_url": null, "recebida_em": "ISO-8601" },
    { "mensagem_id": 11, "tipo": "audio", "conteudo": null, "midia_url": null, "recebida_em": "ISO-8601" }
  ]
}
```

- `itens` em ordem de chegada (`criado_em, id`); `total = itens.length >= 1`.
- `tipo` ∈ {`texto`, `audio`, `imagem`}. Mídia: `midia_url` (se houver URL) ou linha em
  `midias_recebidas` com `mensagem_id` (base64 do QR Pro; research D9).
- `telefone` vai só porque a feature 3 precisa responder; não é logado.

## Saída

`{ "ok": true }` = turno tratado; a recepção marca `processada_em` e libera o contato.
Qualquer outra saída ou erro = falha; as mensagens voltam a pendentes e o contato é liberado.

## Semântica de posse

- A recepção detém `lock:<contato_id>` durante toda a chamada; o sub NÃO libera o lock.
- Tempo máximo: `lock.ttl_s` (120). Sub que passar disso perde a garantia de exclusividade
  (FR-013); a feature 3 deve caber nesse tempo ou pedir aumento do TTL.
- Mensagens que chegam durante a chamada formam o turno seguinte (FR-012).
