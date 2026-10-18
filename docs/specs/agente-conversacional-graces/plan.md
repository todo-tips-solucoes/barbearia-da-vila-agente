# Plano de implementação: agente-conversacional-graces

**Feature**: `agente-conversacional-graces` | **Spec**: [spec.md](spec.md) | **Base**: `recepcao-buffer`, `recepcao-robustez`, `infra-base`

## Summary

O stub `entregar-rajada` vira o agente: um nó AI Agent do n8n com `gpt-5.6-luna` que recebe o turno da
recepção no contrato já existente, conversa com o cliente e usa um sub-workflow novo, `bv-graces`,
como ferramentas (identificar, cadastrar, serviços, barbeiros, horários livres, agendamentos do
cliente, agendar, reagendar, cancelar). O histórico e o estado do pedido ficam no Postgres do ambiente.
As regras duras saem do prompt e vão para o código: filtro do barbeiro de teste e de "2º vez" antes do
modelo, confirmação em duas fases (proposta num turno, escrita num turno posterior), limites de
4 mensagens e 1 pergunta no `Compor`, opções de lista validadas contra o que a Graces devolveu,
idempotência por `turno_id`. Saída pelo Chat Master QR Pro (texto, lista Pro, digitando). Só TESTE;
escritas na Graces vão sempre para o barbeiro de teste. Decisões em [research.md](research.md).

## Technical Context

**Language/Version**: JSON de workflow n8n + JS nos Code nodes (`workflows/shared/agente.js`), SQL na
migração, Python 3 stdlib nos scripts.
**Primary Dependencies**: n8n 2.43.5 com `@n8n/n8n-nodes-langchain.agent` 3,
`lmChatOpenAi` 1.3, `toolWorkflow` 2.2 (versões em produção no GOLD, mesma instância); OpenAI
`gpt-5.6-luna`; API Graces `public/v1`; API Chat Master QR Pro. Nenhum pacote novo.
**Storage**: Postgres 17 `barbearia_vila_teste` (migração 0006: `turnos`, `conversas`, `propostas`,
`falhas_agente`; `mensagens` e `contatos` existentes). Redis só o da recepção (posse).
**Testing**: `node tests/agente.test.js`, `python3 -I -m unittest discover -s tests`,
`scripts/smoke-agente.py` no TESTE, `get_workflow_details` do MCP do n8n após o deploy no TESTE (`validate_workflow` só valida código do Workflow SDK, não JSON: `docs/specs/recepcao-robustez/tasks.md:113`).
**Target Platform**: `https://n8n2.todo-tips.com`, stack `n8n` da VPS, só TESTE (fonte: briefing e `docs/decisoes-pre-00c.md`).
**Project Type**: workflows n8n + scripts de deploy/teste.
**Performance Goals**: primeira mensagem em ≤ 20 s no p90 (SC-009); turno inteiro < `lock.ttl_s` (120 s).
**Constraints**: Graces só em produção, escrita só no barbeiro de teste e cancelada no fim (FR-024);
WhatsApp real só para contato de teste; sem segredo no repositório; sem PII em falhas.
**Scale/Scope**: uma loja, um contato por vez por posse da recepção.
**NEEDS CLARIFICATION**: nenhum de design. Desconhecidos factuais viram sondas na primeira fase:
S0 (tipos de nó pelo MCP), S1 (como informar a conexão com token da empresa nos envios), S2 (formato
da resposta de lista e limites). S1 sem resposta = bloqueio humano. Pendências do owner P1 (cliente de
teste na Graces) e P2 (contato de teste real) bloqueiam só as tarefas que escrevem ou enviam de verdade.

## Constitution Check

| Princípio | Status | Notas |
|-----------|--------|-------|
| II / II-bis trilha e registro | PASS | artefatos em `docs/specs/agente-conversacional-graces/`; PR pelo owner |
| III validação estática | PASS | `node tests/*.test.js`, unittest, `verificar-repo.py`, `varrer-segredos.py` |
| IV / IV-bis dependências e identidade | PASS | nenhum pacote novo |
| V fonte oficial | PASS | endpoints citam `graces-api/` e `chatmasterveloz-api/`; nós citam o GOLD; o resto `[PROPOSTA]` |
| VI pt-BR | PASS | |
| VII idempotência | PASS | migração `IF NOT EXISTS`; turno, saída e proposta idempotentes (Decision 8) |
| VIII parametrização | PASS | prompt versionado no repo (`agente.js`) é código e segue o rito |
| IX Graces fonte da verdade | PASS | só dados da Graces na conversa; teste e "2º vez" filtrados em código (Decision 4) |
| X conversa humanizada | PASS | IA assumida; 4 mensagens/1 pergunta/digitando impostos em código; lista Pro para toda escolha |
| XI escrita segura | PASS | duas fases (Decision 3); erro por `code`; incerta verificada antes (Decision 9). Pacote: fora desta feature por FR-023 (sempre avulso), entra em `regras-negocio-agenda` |
| XII skills e validação n8n | PASS | nó AI Agent + sub-workflow como ferramenta; conferência pelo MCP `get_workflow_details` após deploy no TESTE (`validate_workflow` não se aplica a JSON, recepcao-robustez `tasks.md:113`) |
| XIII isolamento | PASS | só TESTE; PROD parametrizado; deploy de PROD recusa chaves `teste.*` |
| XIV segredos e dado mínimo | PASS | chaves só em credenciais do n8n; `falhas_agente` sem PII; `pedido` só ids e rótulos |
| XV teste antes de produção | PASS | suíte `smoke-agente.py`; barbeiro de teste e limpeza no `finally` |
| XVI zero fabricação | PASS | S1/S2 medem o que a doc não diz; nada afirmado sem fonte; `data-veracity-verifier` antes de fechar |

Re-check pós-design: PASS. Peças novas: um sub-workflow (`bv-graces`), uma migração, um módulo JS e um
script de smoke. Sem nó de memória (Decision 2) e sem laço de nó não verificado (Decision 7).

## Project Structure

```text
docs/specs/agente-conversacional-graces/{plan,research,data-model,quickstart}.md, contracts/
workflows/sub/entregar-rajada.json        # stub -> agente (mesmo id e contrato)
workflows/sub/bv-graces.json              # novo: ferramentas da Graces
workflows/shared/agente.js                # novo: prompt, compor, opções, filtros, recência, digitação
db/migrations/0006_agente.sql             # novo: turnos, conversas, propostas, falhas_agente
config/ambientes/{integracao,producao}.json   # chaves de contracts/config-agente.md
scripts/criar-credenciais-n8n.py          # + openAiApi, Header Auth Graces e Chat Master
scripts/deploy-n8n.py                     # recusa teste.* em PROD
scripts/smoke-agente.py                   # novo: sondas S1/S2 e roteiros do quickstart
tests/agente.test.js, tests/test_workflows_agente.py   # novos
tests/{test_criar_credenciais,test_deploy_n8n,test_esquema}.py   # estendidos
docs/infra.md, workflows/README.md        # ids novos e limites medidos
```

## Fluxo do `entregar-rajada`

```text
Gatilho (turno) -> Registrar turno (INSERT turnos ON CONFLICT) -> Já tratado? -sim-> Responder ok
  -> Ler contexto (contato, conversa, histórico da sessão; abre sessão nova se > janela)
  -> Só mídia? -sim-> Compor fixo (textos.midia)
  -> Decidir (prompt + turno, agente.js) -> Agente [Modelo, 10 ferramentas -> bv-graces]
       -(erro)-> Montar contingência + falhas_agente
  -> Compor (4 msgs, 1 pergunta, OPCOES validadas, filtro teste)
  -> posição 1..4: Gravar saída (ON CONFLICT) -> Simulado? -> Digitando -> Wait -> Enviar texto|lista
       -(não 2xx)-> falhas_agente, para a sequência
  -> Concluir turno (estado, conversas.ultima_entrada_em) -> Responder {ok:true}
```

`bv-graces`: Gatilho (`operacao`, fixos, entradas do modelo) -> Switch por `operacao` -> HTTP Graces
(timeout `graces.timeout_ms`, `neverError`) -> Normalizar (filtros, opções em `conversas.opcoes`,
`code`) -> grava proposta/falha quando cabe -> Responder.

## Convenções de Borda

| Camada | Estilo | Validação | Fonte da verdade |
|--------|--------|-----------|------------------|
| Colunas Postgres | snake_case | migração + `test_esquema.py` | `db/migrations/0006_agente.sql` |
| Payload Graces | camelCase da API (`idServico`, `horaInicio`) | `Normalizar` no `bv-graces` | `graces-api/` |
| Payload Chat Master | campos da API (`number`, `body.List[].RowId`) | teste estático do workflow | `chatmasterveloz-api/` |
| Entradas/saídas das ferramentas | snake_case (`id_opcao_horario`, `proposta_id`) | `bv-graces` recusa campo desconhecido | `contracts/ferramentas-graces.md` |
| Config | snake_case com unidade no nome | `verificar-repo.py` | `contracts/config-agente.md` |
| Datas | `AAAA-MM-DD`, `HH:mm`, `AAAA-MM-DDTHH:mm:ss` sem offset (São Paulo) | `Normalizar` | `graces-api/05-fluxos-do-agente.md:108` |

SQL: só parâmetros (`$1…`), nunca concatenação de texto do cliente ou do modelo (Decision 17).

Mapper: o `Normalizar` do `bv-graces` traduz a Graces para opções `{id, rotulo, valor}`; o modelo nunca
vê nem envia ids da Graces diretamente.

## Complexity Tracking

Sem violações.

## Riscos

- S1 falhar (sem forma documentada de informar a conexão): envio real bloqueado até o owner decidir
  (token da conexão 145 ou orientação do Chat Master). O resto da feature segue com envio simulado.
- Latência do luna com 10 ferramentas e várias chamadas de `horarios-livres` ("qualquer barbeiro" =
  até 5 chamadas): medir no cenário 16; se passar de 20 s, cortar por barbeiros mais próximos ou
  paralelizar no `bv-graces`.
- Turno acima de `lock.ttl_s`: turno duplicado possível; coberto pela idempotência (Decision 8), mas a
  segunda execução responde falha e a mensagem volta ao turno seguinte.
- Gravar a saída antes do envio: se o envio falha depois de gravar, a mensagem não é reenviada naquele
  turno (registrada em `falhas_agente`); preferido a mensagem duplicada.
- `POST /agenda` sem idempotência conhecida: escrita incerta é verificada por consulta, mas a
  comparação por serviço/profissional/início pode errar se o cliente já tinha um agendamento igual.
- Cadastro de cliente em produção (P1) não tem desfazer; só com autorização do owner.
- Cota da OpenAI (429 persistente visto no GOLD): vira contingência e falha registrada; sem alerta fora
  de banda nesta feature.
