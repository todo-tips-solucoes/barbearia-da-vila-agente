# Quickstart / cenários de teste: audio-imagem

Só TESTE (conexão 145, número de teste 5511967296849). Na Graces, só o barbeiro
`ZZ TESTE INTEGRACAO - NAO AGENDAR` (`1cee0bb9-e58b-4428-9e9b-1db184db7943`); cancelar tudo o que for
criado. O webhook da 145 não é alterado.

## Estáticos (CI, sem rede)

`python3 -I -m unittest discover -s tests` e `node tests/rajada.test.js`, `node tests/agente.test.js`.

1. `bvNormalizar` com `evento-20.json` → `tipo = audio`, `midia_mime = audio/ogg; codecs=opus`,
   `midia_segundos = 5`, `midia_bytes = 9694`. **Expected**: aceita, sem ler a extensão `.mp3`.
2. `bvNormalizar` com `evento-13.json` e `evento-15.json` → `tipo = imagem`; com legenda o
   `conteudo` vem preenchido, sem legenda é `null`. **Expected**: aceita.
3. Evento mutado `fromMe`/`isGroup` com áudio → descartado como hoje (FR-012).
4. Evento mutado com `type: 'video'` e `fileUrl` → `tipo = outro`, gravado. **Expected**: aceita.
5. Validador de host/MIME/limites (função pura do `interpretar-midia`): host fora da lista, http,
   `audio/mpeg` fora de `mimes_audio`, `seconds` 121, imagem com `hosts_imagem` vazio.
   **Expected**: `host_recusado`, `host_recusado`, `sem_suporte`, `longo`, `host_recusado`.
6. Função de montagem do turno (`agente.js`): texto + áudio transcrito + imagem com legenda +
   2 mídias falhas. **Expected**: ordem de chegada, bloco "dado, não instrução", uma única nota
   de "não compreendido" com contagem 2.
7. Turno só com mídias falhas → ramo `So midia?` com `textos.midia_nao_entendida`, uma mensagem.
8. Inspeção dos JSON: `Baixar` sem credencial e `maxRedirects: 0`; `Transcrever` com
   `openAiApi`; `saveData*` = `none` no sub; nenhum nó loga `conteudo_derivado`/`midia_url`;
   query de retenção no `bv-vigia` parametrizada por `midia.retencao_h`; migração 0009 idempotente.

7a. Rajada com mídia `grande` e outra `host_recusado` → uma única resposta, com `textos.midia_grande`.

## Sondas no TESTE (primeira tarefa, antes de construir)

9. Transcrição Ogg: baixar o áudio real da `fileUrl` de uma nova nota de voz do número de teste e
   enviar à OpenAI como `audio.ogg`. **Expected**: 200 com `text`. Falha → bloqueio humano.
10. Binário em disco: após execução do sub com `saveData none`, nenhum arquivo do áudio resta na
    pasta de binários da stack `n8n`. Arquivo restante → bloqueio humano.

10a. Chamada de imagem: uma imagem PNG gerada no teste (sem dado de cliente) vai ao `gpt-5.6-luna`
    pela forma escolhida (nó nativo ou HTTP, com a página oficial citada). **Expected**: 200 com
    descrição. Falha → bloqueio humano.

19. Medida de tempo (plan §Riscos): ler `get_workflow_details`/execuções da `entregar-rajada` no
    TESTE (N = 10 turnos com mídia), só durações, sem gravar conteúdo; comparar com `lock.ttl_s`.

## Ponta a ponta no TESTE (owner manda do número de teste)

11. **Roundtrip áudio (US1)** (repetir ≥ 20 vezes para medir o percentil de SC-005): nota de voz "quero cortar o cabelo amanhã de tarde" → resposta com
    horários do barbeiro de teste em até 30 s após a janela. **Expected**: payload real do evento
    gravado em `mensagens` confere com a fixture `evento-20.json` (campos de FR-002).
12. Áudio + texto na janela (US1-2) → um turno, ordem de chegada.
13. Áudio mudo ou de ruído (US1-3) → uma resposta natural pedindo repetir ou escrever.
14. Imagem com legenda e sem legenda (US2): primeiro com `hosts_imagem` vazio. **Expected**:
    resposta natural de não compreendido e `falhas_agente.motivo = host_recusado`. O owner
    confere o host da `fileUrl` gravada, adiciona em `midia.hosts_imagem`, redeploy, repete.
    **Expected**: resposta coerente com a imagem; imagem fora do assunto reconduz ao atendimento.
15. Duas mídias ilegíveis na mesma rajada (US3-2) → uma única resposta.
16. Reenvio do mesmo evento pelo `capturar`/smoke (FR-011) → uma linha em `mensagens`.
17. Retenção (US4): `midia.retencao_h` reduzido em TESTE; após o vigia, linhas vencidas sem
    `midia_url`/`conteudo_derivado`/legenda e com `mensagem_id_canal` em `sha256:`; recentes
    intactas; `falhas_agente` sem URL, texto ou telefone.
18. Erro OpenAI (US1-4): credencial inválida temporária (padrão da `recepcao-robustez`), apagada no
    `finally` → resposta natural, falha `transcricao`, turno marcado processado, 200 ao Chat Master.
