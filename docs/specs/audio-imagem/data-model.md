# Modelo de dados: audio-imagem

**Feature**: `audio-imagem` | **Migração**: `db/migrations/0009_midia.sql` (nova, idempotente,
aplicada por `scripts/migrar.py`) | **Bancos**: `barbearia_vila_teste` (aplicada) e
`barbearia_vila` (só quando o owner promover).

Nenhuma tabela nova. Nomes de colunas e códigos abaixo são `[PROPOSTA]` deste plano (contrato
novo, não dado de sistema externo).

## Entity: Mídia recebida (linha de `mensagens` com `tipo` de mídia)

| Campo | Tipo | Origem | Observação |
|-------|------|--------|------------|
| `tipo` | text | `bvNormalizar` | CHECK de entrada passa a `('texto','audio','imagem','outro')` |
| `midia_url` | text | `mensagem[0].fileUrl` | já existe (0002); apagado na retenção |
| `mensagem_id_canal` | text UNIQUE | = `fileUrl` (hoje) | já existe; deduplicação (FR-011); na retenção vira `sha256:<hex>` da URL |
| `conteudo` | text | `mensagem[0].text` (legenda) | já existe; apagado na retenção quando `tipo` é mídia |
| `midia_mime` | text NULL | `mensagem[0].fileMimeType` | novo; apagado na retenção |
| `midia_segundos` | integer NULL | `originalData.audioMessage.seconds` | novo; só áudio |
| `midia_bytes` | bigint NULL | `fileLength` do bloco `audioMessage` ou `imageMessage` | novo |
| `conteudo_derivado` | text NULL | transcrição ou descrição | novo; gravado pelo `interpretar-midia`; apagado na retenção |
| `midia_falha` | text NULL | código de falha (tabela abaixo) | novo; sem conteúdo pessoal |
| `criado_em` | timestamptz | já existe | base do prazo de 24 h |

Campos de evento usados: só os de FR-002 (`fileUrl`, `fileMimeType`, `text`, `caption`,
`seconds`, `fileLength`, `PTT`).

### Transições

```text
gravada (recepção) --turno--> interpretada (conteudo_derivado preenchido)
                         \--> falhou (midia_falha preenchido, conteudo_derivado NULL)
qualquer estado --criado_em + midia.retencao_h--> expurgada (midia_url, midia_mime, conteudo,
                                                            conteudo_derivado = NULL,
                                                            mensagem_id_canal = sha256:<hex>)
```

`processada_em`, `turno_id` e `turno_em` seguem a semântica da `recepcao-buffer`: falha de mídia
não impede marcar o turno processado (o cliente recebe a resposta natural); falha do
sub-workflow inteiro faz o `entregar-rajada` seguir com os itens como "não compreendidos".

## Entity: Conteúdo derivado

Coluna `mensagens.conteudo_derivado` (acima). Texto puro, sem limite próprio além do retorno da
OpenAI. Nunca vai para log, `falhas_agente`, Redis ou execução salva. Vinculado à mensagem e, por
ela, ao contato; apagado junto com a mídia.

## Entity: Falha de mídia

Registrada em `falhas_agente` (já existe, 0006) com `tipo = 'midia'` (CHECK ampliado na 0009),
`motivo` = código abaixo, `contato_id`, `criado_em`. `operacao`, `code`, `status_http` podem
guardar o status HTTP da OpenAI ou do download; `trace_id` fica NULL. Nunca URL, arquivo,
transcrição, descrição, telefone ou chave.

| Código (`motivo` / `midia_falha`) | Quando |
|------------------------------------|--------|
| `host_recusado` | `fileUrl` não é https ou host fora da lista do tipo |
| `longo` | `midia_segundos` > `midia.audio_max_s` |
| `grande` | `midia_bytes` ou binário baixado > limite do tipo |
| `sem_suporte` | MIME fora de `midia.mimes_audio`/`midia.mimes_imagem`, ou `tipo = 'outro'` |
| `download` | status ≠ 2xx, redirecionamento, tempo esgotado |
| `vazio` | binário de 0 byte, ou transcrição/descrição vazia |
| `transcricao` | OpenAI de transcrição respondeu erro ou esgotou o tempo |
| `interpretacao` | OpenAI de imagem respondeu erro ou esgotou o tempo |

## Retenção

Query nova no `bv-vigia` (a cada 5 min):

- alvo: `mensagens` com `tipo IN ('audio','imagem','outro')`, `criado_em < now() -
  make_interval(hours => midia.retencao_h)` e algum dos campos de conteúdo ainda preenchido;
- efeito: `midia_url`, `midia_mime`, `conteudo`, `conteudo_derivado` = NULL e
  `mensagem_id_canal` = `'sha256:' || encode(sha256(convert_to(mensagem_id_canal,'UTF8')),'hex')`
  (a URL deixa de existir no banco; a unicidade se mantém). Mantém `tipo`, `midia_segundos`,
  `midia_bytes`, `midia_falha` e datas;
- filtro inclui `mensagem_id_canal NOT LIKE 'sha256:%'`;
- idempotente: a segunda rodada não encontra linha.

Escopo do apagamento (FR-009/SC-004): só as colunas de mídia de `mensagens`; respostas de saída, retenção da OpenAI e backups do Postgres ficam fora.

`midia.retencao_h` padrão `23.9` `[PROPOSTA]` (24 h menos o intervalo do vigia); em TESTE pode
ser reduzido para o teste do US4.
