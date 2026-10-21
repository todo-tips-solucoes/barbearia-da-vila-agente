# Plano das próximas features (2026-10-21)

Levantamento feito em `origin/develop` 8a83962, depois do merge da #13. Fontes: `docs/roadmap.md`,
`docs/decisoes-pre-00c.md`, as tabelas "Pendências" de `docs/specs/*/research.md`, os itens `[ ]`/`[~]`/`[!]` de
`tasks.md`, os corpos das PRs #1 a #13, `config/ambientes/producao.json` e os `shortcut:` do código. Cada feature
roda com `/feature-00c <short-name>`, pelo rito (`docs/rito-dev.md`). O owner aprova e mescla.

## Estado

- As features 1 a 6 do roadmap, mais a `recepcao-robustez`, estão mescladas na `develop` e rodam só no TESTE.
- A `main` não recebeu nada: são 99 commits só na `develop`, e o job `promotion-pr` falhou nas 3 últimas execuções
  (19 e 20/10). O log não mostra a causa.
- Faltam três features do roadmap: 7 `crm-etiquetas-handoff`, 8 `suite-validacao` e 9 `followup`.
- PROD não existe. O banco `barbearia_vila`, as credenciais e os workflows não foram criados, e o número e a conexão de
  PROD não foram informados (`decisoes-pre-00c.md`).
- O princípio XV da constituição exige a suíte de conversas roteirizadas antes de qualquer promoção a PROD.

## Ordem proposta

| # | short-name | Depende de | Por que nesta posição |
|---|---|---|---|
| A | `suite-validacao` | develop atual | Bloqueia PROD (XV) e é a rede de segurança para a refatoração B, que mexe em quase todos os workflows |
| B | `refatoracao-compartilhados` | A | Tira a duplicação antes que C e D repitam os mesmos trechos (envio, travas de teste, falhas) |
| C | `crm-etiquetas-handoff` | B | Torna a trava de handoff real: hoje nenhum workflow grava em `handoffs` (mensagens-agendadas, Decision 15) |
| D | `followup` | C, A | Usa o estado do funil e do handoff; validada pela suíte |
| E | `producao` | A a D | Primeira subida a PROD, com a trava `BV_DEPLOY_PRODUCAO_AUTORIZADO`, e a promoção `develop` → `main` |

A e B podem trocar de ordem se o owner preferir reduzir a duplicação primeiro. Nesse caso, a B se valida pelos smokes
que já existem: `smoke-recepcao`, `smoke-agente` e `smoke-mensagens`.

## A. `suite-validacao`

**Escopo** (roadmap 8):
- conversas roteirizadas versionadas, disparadas contra o webhook do TESTE com contatos simulados `n < 520`;
- LLM avaliadora conferindo tom, regras de negócio e ausência de dado inventado;
- Graces só no barbeiro de teste, com limpeza no fim.

**Cobertura inicial:**
- agendar, reagendar e cancelar com a sugestão de remarcar;
- "cancelei, vamos marcar outro";
- não retomar coleta antiga num "Oi";
- todos os inícios em que o serviço cabe;
- nunca oferecer "2ª vez" nem o barbeiro de teste;
- terceiros e vários serviços;
- áudio e imagem (`midia-real.local.json`);
- confirmação, lembrete e pós (reaproveitar o `smoke-mensagens`).

**Pendências que a suíte fecha:**
- o toque na lista voltando ao agente (regras S4);
- `cadastrar_cliente` real (agente P1, 4.2.6);
- a busca por nome com `?busca=` devolvendo `[]` (PR #8);
- `contato_falhou` ao vivo e o timeout de 300 s (`infra.md`).

**Garantias:**
- **Deduplicação:** a suíte reusa os helpers dos smokes (`tel`, `post`, `checar`, `_env`) num módulo único
  `scripts/_smoke.py`. Os três smokes passam a importá-lo; hoje há cópias entre `smoke-recepcao.py` e `smoke-agente.py`.
- **Desempenho:** registrar a latência por turno (p50/p95) e falhar acima do limite que o owner definir.
- **Segurança:**
  - nenhum dado real nos roteiros;
  - a avaliadora recebe só a transcrição simulada;
  - a chave da avaliadora fica fora do repositório.
- **Escalabilidade:** execução em paralelo por contato, com limite de concorrência configurável.

**Insumos a pedir antes** (de uma vez):
- modelo e chave da LLM avaliadora (a mesma `gpt-5.6-luna` ou outro);
- teto de custo por rodada;
- limite de latência aceito;
- roteiros que o owner quer ver, com a fala do cliente.

## B. `refatoracao-compartilhados`

Sem mudança de comportamento: os smokes e a suíte A precisam dar o mesmo resultado antes e depois.

| Duplicação | Onde | Destino |
|---|---|---|
| Payload de envio do Chat Master (`sendListPRO`, `sendTextPROLid`, `/api/messages/send`) | nó `Saidas` do `entregar-rajada` e `bvMLista`/`bvMTexto` (`shared/mensagens.js`) | um módulo `shared/canal.js` incluído pelos dois |
| Normalização de dígitos | `bvMDig`, `bvgSoDigitos`, `dig` inline do `Saidas` | uma função em `shared/canal.js` |
| Trava de TESTE (`contatos_escrita` + barbeiro de teste) | `Saidas`, `bvMDecidir`, `bvMConfEscolher`, `bvgEscritaPermitida`, `bv-graces` | uma função `bvTesteEscrita(cfg, telefone, profissional)` |
| Cadeia de saída repetida 4× (`Gravar saida`, `Digitando`, `Espera`, `Enviar` e `Falha envio` 1..4) | `entregar-rajada` | um laço só, mantendo a ordem e a cadência; medir que a latência não piora |
| SQL idêntica (`Fim`, `Fim Redis indisponivel`, `Fim sem posse`; `Registrar falha *`) | `bv-recepcao` | um nó por SQL, com convergência das saídas |
| `INSERT INTO falhas_agente` (13 ocorrências em 6 workflows) | todos | um formato único de falha, montado em `shared/` e gravado com SQL igual (o render dá para incluir o texto) |
| Bloco `cfg` literal duplicado | `Decidir` e `Resultado` do `bv-mensagens` | um nó de config lido por `$('Config')` |
| `carregar_env` em duas variantes | `capturar-webhook.py`, `deploy-n8n.py` | `scripts/_env.py` |

**Também nesta feature:**
- `verificar-repo.py` passa a conferir `workflows_sub` (hoje `interpretar_midia` não está em `infra.md` nem no README e o CI
  não acusa);
- uma regra nova que proíbe montar payload do Chat Master fora de `shared/canal.js`;
- docs desatualizadas: `CLAUDE.md` (constituição 1.1.0, "Ainda não há código"), `workflows/README.md:13,25,30`, a
  contagem de nós em `infra.md:128` e a pasta vazia `docs/specs/barbearia-da-vila-agente/`;
- o texto das mensagens agendadas passa a usar o alias "barbeiro de teste", como o `bv-graces` (Decision 15);
- a causa do `promotion-pr` vermelho e o `CODEOWNERS` exigido pelo `aprovacao-de-dono`.

**Desempenho:** comparar a duração do turno antes e depois (`execucao`), pela suíte A.

**Insumos:** nenhum do owner, só a aprovação da ordem.

## C. `crm-etiquetas-handoff`

**Escopo** (roadmap 7):
- funil 5 (raias 25 a 31) movido conforme a conversa;
- etiquetas por categoria de serviço, por barbeiro e "Cliente novo";
- handoff para o setor 78 com a etiqueta 521, e o agente para de responder.

**O que fecha:**
- **P2 de verdade:** o handoff grava em `handoffs`, e o `bv-mensagens` passa a reter o envio de fato.
- **Atendimento humano que começa no painel:** detectar pelo ticket da 145 (`GET /api/contacts/alltickets`: `status`,
  `userId`, `queueId`). Hoje o ticket do owner aparece com `pending`, `queueId` 1 e `userId` null. O candidato é
  `userId` diferente de 100 ou `queueId` 78. Precisa ser **medido** com atendente real antes de decidir.
- **Encerramento do handoff:** pelo `closed` (Decision 10 da `mensagens-agendadas`) ou pelo ticket, a medir.

**Garantias:**
- **Desempenho e escalabilidade:** a consulta ao ticket só no momento do envio agendado e na entrada da recepção, nunca em
  varredura de todos os contatos; cache curto por contato no Redis.
- **Segurança:** escrita no CRM só no TESTE durante o desenvolvimento, com o contato do owner.

**Insumos a pedir antes:**
1. O owner aceita o ticket da 145 no painel e depois devolve. Isso mede `status`, `userId` e `queueId` com atendente real e
   o evento de webhook que chega.
2. A raia de cada etapa da conversa (25 a 31).
3. A lista categoria de serviço → etiqueta e se as etiquetas por barbeiro já existem.
4. Quando o handoff termina: atendente encerra, tempo sem mensagem ou os dois.
5. Autorização para escrever no CRM e nas etiquetas no TESTE.

## D. `followup`

**Escopo** (roadmap 9):
- uma retomada gentil 2 h depois da última mensagem, só quando o cliente parou no meio de um agendamento;
- respeita a janela do canal e não duplica envio.

**Reuso:**
- a fila `mensagens_agendadas`, com um tipo novo `followup`, e a varredura do `bv-mensagens`, com a reserva, a tolerância e
  os limites por contato que já existem;
- a trava de handoff de C.

Nada de workflow agendado novo.

**Insumos:** o texto do followup; se vale fora do horário de funcionamento; se repete ou não (o roadmap diz "uma").

## E. `producao`

**Pré-requisitos:** A a D mescladas e a suíte verde no TESTE.

**Passos**, cada um com rollback anotado (rito):
1. Bancos e credenciais: `preparar-bancos`, `migrar` (0001 a 0010) e `criar-credenciais-n8n` com `--alvo producao`;
   backup de PROD; a frequência e a retenção do backup (infra P3) definidas e com cron.
2. `producao.json`: credenciais, `postgres.credencial_id`, `webhook.path`/`webhook_id`, `chatmaster.whatsapp_id`, os ids de
   todos os workflows e sub-workflows (faltam as chaves `bv-recepcao`, `bv-vigia` e `bv-verificacao`) e
   `midia.hosts_imagem`.
3. Deploy na ordem dos sub-workflows para a recepção, com `validate_node_config` antes e `get_workflow_details` depois de
   cada um.
4. VPS: o id de PROD no cron da mídia, o nome do container e o hook de guarda de PROD (infra 8.1.3).
5. Quickstart de cada feature em PROD com um contato autorizado. Só depois liberar a todos e ligar `mensagens.ativo`.
6. Promoção `develop` → `main` pela PR de promoção.

**Insumos:**
- o número e a conexão de PROD;
- a autorização explícita do deploy;
- a política de backup;
- alerta fora de banda (Postgres fora, cota e gasto da OpenAI: CHK032);
- LGPD: retenção do histórico e base legal (infra P7, fora de escopo até agora);
- revisão dos valores `[PROPOSTA]`: `execucao.timeout_s` 300, `atraso_max_min` 30, `agente.iteracoes_max` 8, `midia.*`,
  `lista.*`, `digitando.*`, `graces.timeout_ms` e os textos.

## Riscos aceitos que seguem valendo

- Redis isolado só por prefixo, sem ACL.
- O dedupe por conteúdo descarta um "ok" repetido de propósito.
- Mídia: cópias fora da limpeza de 24 h e sem teto de bytes no HTTP.
- `POST /agenda` sem idempotência.
- Um turno acima de `lock.ttl_s` pode se duplicar.
- Um "Confirmo" digitado junto com o toque é descartado.
- As séries recorrentes ficam de fora das mensagens agendadas.

Nenhum deles muda com este plano. Revisá-los fica na E.
