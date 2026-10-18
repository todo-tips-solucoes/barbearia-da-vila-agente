# Contrato: webhook da conexão (Chat Master Veloz, QR Pro, conexão 145)

**Status: CAPTURADO (19 eventos, conexão 145, 2026-10-18).** Só os campos da seção "Contrato observado" são
contrato; cada um cita o fixture de origem em `tests/fixtures/chatmaster/`. O que não foi observado está em
"Hipóteses não observadas" e continua sem implementação.

## Endpoint de recepção (nosso)

| Ambiente | Método | Path | webhookId |
|----------|--------|------|-----------|
| TESTE | POST | `{{BV:webhook.path}}` de `config/ambientes/integracao.json` | `{{BV:webhook.webhook_id}}` |
| PROD | POST | idem em `producao.json` (vazio até o owner informar a conexão) | idem |

Respostas: `200` sem corpo para todo evento autenticado (aceito ou descartado, FR-006); `401` sem
corpo para credencial ausente ou inválida (FR-005); `400` sem corpo para payload malformado (FR-007).
Autenticação: research D4.

Limite de tamanho: payload acima de `payload.max_kb` (config, `[PROPOSTA]`) é rejeitado com `400`
sem log de conteúdo (FR-022). A captura mede o tamanho real dos eventos de mídia para calibrar o valor.

## Contrato observado

Corpo em `body` do evento do n8n. Valores textuais livres foram anonimizados nos fixtures (`xxxx`).

| Campo | Tipo | Observação | Fixture |
|-------|------|------------|---------|
| `body.acao` | string | `start` (mensagem recebida, texto/imagem), `from_internal` (eco interno da mesma mensagem), outros valores de evento sem `mensagem` | 02, 01, 04, 05 |
| `body.fromMe` | boolean | `false` nas mensagens do cliente; ausente nos eventos sem `mensagem` | 02 |
| `body.isGroup` | boolean | `false` em todos os eventos capturados | 02 |
| `body.sender` | string | contato (telefone; nunca logar) | 02 |
| `body.chamadoId` | número | id do ticket | 02 |
| `body.queueId`, `body.companyId`, `body.defaultWhatsapp_x` | número | fila, empresa, conexão (145) | 02 |
| `body.token_origin` | string | credencial da conexão (nunca logar) | 02 |
| `body.mensagem` (acao `start`) | array | `[0].type` (`text`, `image`), `[0].text`; mídia: `[0].fileUrl`, `[0].fileMimeType`, `[0].originalData` | 02, 13 |
| `body.mensagem` (acao `from_internal`) | objeto | `id`, `wid`, `body`, `mediaType` (`conversation`, `image`), `fromMe`, `ticketId`, `contactId`, `createdAt` | 01, 12 |
| `body.ticketData` | objeto | ticket, contato, fila, tags, `whatsapp.token` (segredo) | 02 |

Identificador da mensagem: `mensagem.wid`/`mensagem.id` só no formato `from_internal`; o formato `start` não traz id observado.

## Hipóteses não observadas (não implementar)

- Áudio: o evento 17 tem `type` não repetido (anonimizado), logo o valor do tipo de áudio não foi confirmado.
- Mensagem enviada pela loja (`fromMe=true`) e grupo (`isGroup=true`): não apareceram na captura.
- Base64 de mídia em `mediaData[0].buffer`: não observado; a mídia chega por `fileUrl`.
