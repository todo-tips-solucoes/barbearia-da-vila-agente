# Contrato: webhook da conexão (Chat Master Veloz, QR Pro, conexão 145)

**Status: PENDENTE DE CAPTURA.** Nenhum nome de campo abaixo é contrato. Este arquivo é reescrito
pela tarefa de captura (FR-002/FR-004) com os campos observados nos eventos reais, cada um com o
fixture de origem em `tests/fixtures/chatmaster/`. Até lá, nenhum nó que lê o payload é implementado.

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

## Hipóteses a confirmar na captura (fonte: documentação, não contrato)

| Pergunta | O que a doc diz | Fonte |
|----------|-----------------|-------|
| Tipo de evento | campo `acao`; mensagem gera `start` e depois `fila-data` (QR Code) | `chatmasterveloz-api/15-webhooks/webhooks-da-conexao.md` |
| Direção | `fromMe` (`false` = cliente) | idem |
| Contato | `sender` | idem |
| Grupo | `isGroup` | idem |
| Identificador da mensagem | `mensagem.wid` | idem |
| Texto no QR Code | "o texto está em `msg.message`" | idem |
| Token da conexão | `token_origin`, `connection_token`, `ticketData.whatsapp.token` | idem |
| Mídia na biblioteca Pro | base64 em `mensagem[0].mediaData[0].buffer`, `mimetype`, `originalname` | `15-webhooks/arquivos-no-webhook.md` |
| Tags | chave `action` em vez de `acao` em parte dos avisos | `webhooks-da-conexao.md` |

## Contrato observado

[A CAPTURAR] — tabela campo → tipo → exemplo anonimizado → fixture, por evento: texto, áudio, imagem,
mensagem enviada pela loja, evento que não é mensagem, rajada.
