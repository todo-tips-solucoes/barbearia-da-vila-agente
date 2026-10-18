# Quickstart: recepcao-buffer

Tudo no TESTE. Nenhum cenário toca PROD (SC-008).

## C1 - Captura dos eventos reais (US1)

1. `python3 -I scripts/capturar-webhook.py anotar` → lê a conexão 145 em `whatsapp-status` e grava a URL atual em `.captura-145.url` (sem URL na resposta: para e pede ao owner).
2. `deploy-n8n.sh integracao --so bv-captura` → publica o webhook de captura.
3. `capturar-webhook.py trocar` → `whatsapp/update` com o webhook de captura.
4. Owner, do celular de teste, envia ao número da conexão 145: (a) um texto "teste 1"; (b) um áudio curto; (c) uma imagem; (d) três textos seguidos "a", "b", "c" em menos de 8 s. A loja responde uma mensagem pelo painel (evento enviado pela loja).
5. `capturar-webhook.py restaurar` → volta a URL anotada e relê o status.
6. `capturar-webhook.py fixtures` → lê as execuções, mantém só eventos do celular de teste, anonimiza, grava `tests/fixtures/chatmaster/`, apaga todas as execuções da captura e lista os tipos de evento observados.

**Expected**: fixtures para texto, áudio, imagem, rajada, envio da loja e evento não-mensagem; URL da 145 igual à anotada (SC-006); `tests/test_fixtures.py` sem PII (SC-005).
**Erro**: falha entre 3 e 5 → `capturar-webhook.py restaurar` é rodado antes de qualquer outra coisa.

## C2 - Recepção e descarte (US2)

1. `scripts/smoke-recepcao.py --recepcao` posta cada fixture com contato sintético.
2. **Expected**: texto/áudio/imagem viram linhas `entrada` com tipo certo; envio da loja, não-mensagem e tipo não suportado: `200`, nenhuma linha, nenhuma chave Redis; malformado: `400`; sem token válido: `401`.

## C3 - Rajada (US3)

1. Posta 3 textos do mesmo contato com 2 s entre eles; em paralelo, 1 texto de outro contato.
2. **Expected**: um único `turno_id` com as 3 mensagens em ordem, `turno_em` entre 8 e 10 s após a 3ª (SC-001/SC-002); o outro contato tem turno próprio.
3. Variante teto: posta 1 mensagem a cada 5 s por 70 s → entrega forçada aos ~60 s.

## C4 - Um turno por vez (US4)

1. Com o stub atrasando 3 s, posta mensagem; logo após `turno_em`, posta outra do mesmo contato.
2. **Expected**: segundo turno com `turno_em` posterior ao `processada_em` do primeiro; nenhuma perda. 50 mensagens concorrentes em 10 contatos: nunca dois turnos sobrepostos por contato (SC-003).
3. Falha: com a entrega forçada a falhar (contato sintético marcado), as mensagens voltam a pendentes e saem na próxima mensagem (SC-007).

## C5 - Duplicata e isolamento (edge + US5)

1. Posta o mesmo fixture duas vezes → uma linha só.
2. Confere que nenhuma chave `bv:prod:` nem linha em `barbearia_vila` foi criada; `deploy-n8n.sh producao` sem trava/sem `webhook.path` de PROD → aborta.

## Limpeza

`smoke-recepcao.py --limpar` apaga linhas dos contatos sintéticos e chaves `bv:teste:ultima:*`/`lock:*` deles.
