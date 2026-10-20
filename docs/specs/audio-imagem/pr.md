# PR: audio-imagem — áudio e imagem no atendimento WhatsApp (só TESTE)

> Texto preparado pelo orquestrador. Não foi aberta: só o owner abre e mescla.

## Resumo
O agente passa a entender nota de voz e imagem enviadas pelo cliente. A recepção grava e reconhece a mídia; o sub-workflow novo `interpretar-midia` transcreve o áudio (`whisper-1`) ou descreve a imagem (`gpt-5.6-luna`); o `entregar-rajada` monta o turno com o texto derivado e responde uma vez só; o `bv-vigia` apaga URL e conteúdo da mídia com mais de 24 h. Tipo sem suporte ou falha vira resposta natural de "não entendi", nunca silêncio. Escopo: só TESTE (FR-016, Constituição XIII).

## Mudanças
- Recepção: reconhece áudio/imagem, grava mídia mínima, dedupe por evento.
- Sub-workflow `interpretar-midia`: hosts permitidos por tipo, sem redirecionamento, falha fechada, limites antes e depois do download; imagem baixada em memória (Code); filtro de silêncio na transcrição (`verbose_json`, `no_speech_prob > 0,6`).
- `entregar-rajada` e prompt do agente: texto derivado tratado como dado, não instrução; máx. 2 mídias por turno; prompt não transcreve dados pessoais de imagem e recusa assunto fora da barbearia; nome do cliente só vindo de ferramenta.
- Retenção: `bv-vigia` com `midia.retencao_h`; cron `config/vps/barbearia-limpar-midia.cron` para o áudio em disco.
- Config `midia.*` e regras novas em `scripts/verificar-repo.py`; testes `tests/midia.test.js`, `tests/rajada.test.js`; `scripts/smoke-agente.py` (cenários m1-m8).
- Artefatos SDD em `docs/specs/audio-imagem/`.

## Testes e evidências (de `tasks.md`/`research.md`)
- Sondas reais: nota de voz Ogg/Opus (7 s) transcrita pelo `whisper-1` (2.1/D3); imagem `gpt-5.6-luna` 200 (2.2/D4); host de imagem real `object.ce1.eveo.com.br` (2.5/D5).
- Ponta a ponta no TESTE (pai): áudio de 3 s transcrito e respondido (msg 1292); áudio de 137 s -> `midia_falha` longo e `textos.midia_grande` (msg 1299); imagens JPEG 90322/47117 bytes descritas e respondidas, imagem fora do assunto reconduzida (msg 1295); host vazio -> `host_recusado` com recusa natural; texto puro sem regressão.
- Smoke agêntico m1-m8 com áudios reais do owner: todos ok (duas mídias ilegíveis -> uma resposta; reenvio -> uma linha; retenção: vencida sem URL/conteúdo e com `sha256:`, recente intacta; áudio mudo -> `vazio`). SC-005: n=20, p95 8,7 s (≤ 30 s), conforme relato do pai.
- Imagem em memória: nenhum arquivo em `binaryData/workflows/FbQLbUHauxMMIjI4`; áudio: pasta com 0 arquivos ~15 min depois (cron).
- Veracidade (7.5.1): `data-veracity-verifier` sem dado de payload fabricado.
- Graces: nada criado, nada a cancelar.

## Riscos aceitos pelo owner
- H3 (block-002): cópias do conteúdo fora da limpeza de 24 h (respostas de saída, retenção OpenAI, backups).
- H4 (block-004): sem teto de bytes no nó HTTP; defesa em camadas, residual até o timeout.
- Injeção via mídia mitigada, não eliminada; reenvio após 24 h não deduplicado; 3ª mídia da rajada vira "não entendi"; áudio em disco até ~15 min (block-005).

## Passos de produção (owner; não feitos)
1. Incluir o id do workflow de PROD no cron da VPS e instalar (hoje só o id do TESTE).
2. Preencher `midia.hosts_imagem` de PROD (hoje `[]`).
3. Conferir o nome do container `n8n-n8n-1` usado pelo cron.
4. Configurar alerta de gasto OpenAI.
5. Publicar `interpretar-midia`, `entregar-rajada`, recepção e `bv-vigia` em PROD pelo script de deploy e repetir o quickstart (itens 11-17).
6. Não medido: `detail: original`; `content-type` genérico do storage.

## Rito
Seguir `docs/rito-dev.md`; mesclar só depois de revisar este texto.
