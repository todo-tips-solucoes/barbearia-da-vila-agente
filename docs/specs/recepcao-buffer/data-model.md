# Modelo de dados: recepcao-buffer

Base: `db/migrations/0001_esquema_inicial.sql` (tabelas `contatos`, `mensagens`). Migração nova
`0002_recepcao_buffer.sql`, idêntica em TESTE e PROD, idempotente (`IF NOT EXISTS`).

## Entity: Mensagem normalizada (`mensagens`, alterada)

| Campo | Tipo | Regra |
|-------|------|-------|
| `id` | bigint | existente |
| `contato_id` | bigint FK | existente |
| `mensagem_id_canal` | text UNIQUE | existente; idempotência (FR-014). Origem no payload: [A CAPTURAR] |
| `direcao` | text | existente; a recepção só grava `entrada` |
| `tipo` | text | existente; valores aceitos na entrada: `texto`, `audio`, `imagem` (CHECK novo só para `direcao='entrada'`) |
| `conteudo` | text NULL | texto da mensagem; NULL para mídia sem legenda |
| `midia_url` | text NULL | **nova**; só se a captura mostrar URL de download (research D9) |
| `turno_id` | uuid NULL | **nova**; turno em que a mensagem foi entregue |
| `turno_em` | timestamptz NULL | **nova**; início da entrega do turno (mede SC-002) |
| `processada_em` | timestamptz NULL | **nova**; NULL = pendente; preenchida após entrega com sucesso |
| `criado_em` | timestamptz | existente; momento de chegada |

Índice parcial `mensagens_pendentes_idx ON mensagens (contato_id, criado_em, id) WHERE direcao='entrada' AND processada_em IS NULL`.
Na mesma migração, entradas já existentes recebem `processada_em = criado_em` (não reentregar histórico).

**Transições**: pendente (`turno_id` NULL) → em turno (`turno_id`, `turno_em`) → processada
(`processada_em`). Falha na entrega: em turno → pendente (`turno_id`/`turno_em` voltam a NULL).

## Entity: Mídia recebida (`midias_recebidas`, nova e condicional)

Criada só se a captura confirmar mídia embutida em base64 (research D9).

| Campo | Tipo | Regra |
|-------|------|-------|
| `mensagem_id` | bigint PK FK → `mensagens(id)` ON DELETE CASCADE | 1:1 |
| `mimetype` | text NOT NULL | do payload, [A CAPTURAR] |
| `dados` | bytea NOT NULL | conteúdo decodificado |
| `expira_em` | timestamptz NOT NULL | `criado_em + midia.retencao_h` |

Índice `midias_recebidas_expira_idx (expira_em)`. Apagada pela feature 3 após uso ou ao expirar.

## Entity: Contato (`contatos`, sem alteração)

Upsert por `telefone` na entrada; `nome` só se vier no payload e for necessário (XIV).

## Chaves Redis (DB 2, prefixo do ambiente)

| Chave | Valor | Validade |
|-------|-------|----------|
| `<prefixo>ultima:<contato_id>` | `mensagens.id` da última entrada | `redis.ttl.ultima_s` (120) |
| `<prefixo>lock:<contato_id>` | contador `INCR` (1 = posse) | `lock.ttl_s` (120) |

Sem telefone nas chaves (FR-019). Prefixos `bv:teste:` / `bv:prod:` (infra-base).

## Turno (derivado)

Pendentes do contato marcadas com o mesmo `turno_id`, em ordem `criado_em, id`. Formato de entrega
em `contracts/entrega-turno.md`.

## Evento recebido / Fixture

Não persistidos em banco. Evento bruto vive só no histórico de execuções do `bv-captura` até ser
apagado (research D1). Fixture: JSON anonimizado em `tests/fixtures/chatmaster/<caso>.json`, mesma
estrutura e tipos do evento, valores pessoais trocados por sintéticos.
