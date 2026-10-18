# Modelo de dados: recepcao-robustez

Migração nova `db/migrations/0004_recepcao_robustez.sql`, idêntica em `barbearia_vila_teste` e
`barbearia_vila`, idempotente (VII). Só TESTE recebe dados nesta feature.

## Entity: Falha de recepção (`falhas_recepcao`, existente desde 0003)

| Campo | Tipo | Mudança |
|-------|------|---------|
| `tipo` | text, CHECK | passa a aceitar `gravacao` além de `redis_indisponivel`, `payload_invalido`, `entrega` |
| `motivo` | text NOT NULL | novos códigos, ver tabela abaixo |
| `contato_id` | bigint, nulo | nulo quando a falha ocorre antes de existir contato |
| `ocorrida_em` | timestamptz | inalterado |

| `tipo` | `motivo` | Quando |
|--------|----------|--------|
| `gravacao` | `contato_falhou` | erro em `Upsert contato` |
| `gravacao` | `mensagem_falhou` | erro em `Inserir mensagem` |
| `redis_indisponivel` | `tempo_esgotado` / `credencial_recusada` / `indisponivel` | erro de `redis-op` (research D3) |

Nunca telefone, texto, token ou mensagem de erro bruta (FR-002, FR-008, SC-006).

## Entity: Marca de conteúdo recente (`marcas_conteudo`, nova)

| Campo | Tipo | Regra |
|-------|------|-------|
| `contato_id` | bigint NOT NULL, FK `contatos(id)` ON DELETE CASCADE | PK parte 1 |
| `hash_conteudo` | bytea NOT NULL | `sha256` do texto em UTF-8; PK parte 2 |
| `visto_em` | timestamptz NOT NULL DEFAULT now() | início da janela |

Índice em `visto_em` (limpeza). Transições: inexistente → criada (texto aceito); dentro da janela
→ inalterada (texto descartado); vencida → `visto_em = now()` (texto aceito, nova janela);
vencida → apagada por `Limpar marcas`. Só texto sem `idCanal` gera marca.

## Entity: Mensagem (`mensagens`, existente)

Sem coluna nova. Gravação passa a acontecer antes da resposta ao canal e, para texto sem
`idCanal`, condicionada à marca (research D2). Pendência (`processada_em IS NULL`) segue sendo o
que garante a entrega no turno seguinte quando o Redis falha (FR-009).
