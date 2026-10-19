# Plano de implementação: audio-imagem

**Feature**: `audio-imagem` | **Data**: 2026-10-19 | **Spec**: [spec.md](spec.md) | **Base**: `recepcao-buffer`, `recepcao-robustez`, `agente-conversacional-graces`

## Summary

O cliente manda áudio ou imagem e é atendido como se tivesse escrito. A recepção já grava a mídia
(`mensagens.midia_url`); passa a gravar também MIME, duração e tamanho, e a aceitar tipo sem
suporte como `outro`. No turno, o `entregar-rajada` chama um sub-workflow novo,
`interpretar-midia`, que baixa a mídia só de host permitido (https, sem redirecionamento), transcreve
o áudio pela OpenAI (`whisper-1`, arquivo enviado como `.ogg` pelo `fileMimeType`) e descreve a
imagem com `gpt-5.6-luna`. O texto derivado entra no turno como dado do cliente, na ordem de
chegada; o que não deu para entender vira uma única resposta natural por turno. O `bv-vigia` apaga
o conteúdo de mídia em menos de 24 h. Só TESTE. Desenho e fontes em [research.md](research.md).

## Technical Context

**Target Platform**: n8n 2.43.5 self-hosted em `https://n8n2.todo-tips.com` (stack `n8n` da VPS), só TESTE (fonte: briefing, `docs/decisoes-pre-00c.md` e `docs/specs/recepcao-robustez/plan.md`).

- **Plataforma**: n8n 2.43.5 self-hosted em `https://n8n2.todo-tips.com`, Postgres 17, Redis 7.2
  DB 2 (fonte: `docs/specs/recepcao-robustez/plan.md`). Só TESTE (XIII).
- **Linguagem**: JSON de workflow + JS nos Code nodes (`workflows/shared/*.js` inlinados por
  `{{BV:INCLUDE:...}}`), SQL na migração, Python 3 stdlib nos scripts.
- **Dependências externas**: OpenAI (transcrição e imagem, [contracts/openai-midia.md](contracts/openai-midia.md)),
  host de arquivos do Chat Master (só download da `fileUrl`; `chatmasterveloz-api/endpoints.json`
  não tem endpoint de download). Nenhum pacote novo.
- **Armazenamento**: `mensagens` (colunas novas, [data-model.md](data-model.md)); `falhas_agente`
  com `tipo='midia'`. Binário só em memória da execução.
- **Testes**: `python3 -I -m unittest discover -s tests`, `node tests/rajada.test.js` (CI, CMD_LINT
  do `cockpit.config`); `node tests/agente.test.js` à mão; `scripts/smoke-agente.py` e
  ponta a ponta com o owner no TESTE ([quickstart.md](quickstart.md)).
- **Desempenho**: SC-005 (≤ 30 s após a janela para áudio ≤ 30 s, `[PROPOSTA]`) vale no caminho
  normal; os timeouts são tetos do caminho de falha (10 + 25 s por item). Orçamento de
  mídia por turno ≤ `midia.execucao_timeout_s` (75 s) dentro de `lock.ttl_s` (120 s).
- **Pendências de design**: nenhuma e nenhum eixo estrutural novo (stack n8n, Postgres e
  OpenAI já decididos pelo owner). Três itens **não medidos** viram sondas na primeira fase, com
  bloqueio humano se falharem: Ogg aceito pela transcrição (D3), forma da chamada de imagem (D4),
  binário não retido em disco (D7), todas bloqueantes. Host e MIME reais de imagem: falha fechada até a primeira
  imagem real em TESTE (D5).

## Constitution Check

| Princípio | Status | Notas |
|-----------|--------|-------|
| II / II-bis trilha e registro | PASS | artefatos em `docs/specs/audio-imagem/`; PR só pelo owner |
| III validação estática | PASS | unittest, `rajada.test.js`, `verificar-repo.py`, `varrer-segredos.py` |
| IV / IV-bis dependências e identidade | PASS | nenhum pacote, binário ou ferramenta nova; sem transcodificação |
| V fonte oficial | PASS | OpenAI citada nas páginas oficiais lidas; Ogg e forma da chamada de imagem marcados não medidos |
| VI pt-BR | PASS | |
| VII idempotência | PASS | migração 0009 com `IF NOT EXISTS`/troca de CHECK; limpeza idempotente; `--criar` recusa repetir |
| VIII parametrização fora do rito | PASS | texto do prompt de descrição fica em `shared/agente.js`, versionado (mesmo padrão do prompt atual) |
| IX Graces fonte da verdade | PASS | áudio vira texto; ofertas seguem vindo das ferramentas da Graces |
| X conversa humanizada | PASS | respostas naturais, uma por turno; listas inalteradas |
| XI escrita segura | PASS | confirmação antes de escrever segue no agente; mídia não dispara escrita |
| XII skills e validação n8n | PASS | AI Agent intacto; sub-workflow como peça de pré-processamento; `validate_node_config` antes e `get_workflow_details` depois |
| XIII isolamento TESTE/PROD | PASS | deploy só TESTE; PROD recebe chaves com ids/credenciais vazios |
| XIV segredos e dado mínimo | PASS | credencial `openAiApi` do n8n; sem URL/conteúdo/telefone em falha ou log; retenção < 24 h; URL vira hash |
| XV teste antes de produção | PASS | quickstart 9–18 no TESTE |
| XVI zero fabricação | PASS | campos só das fixtures (FR-002); limites `[PROPOSTA]`; nada de payload de imagem inventado |

Re-check pós-design: PASS. Peça nova única: `sub/interpretar-midia.json`, justificada por isolar
rede, timeout e `saveData none` do `entregar-rajada` (precedente do projeto de referência).

## Project Structure

```text
docs/specs/audio-imagem/{spec,plan,research,data-model,quickstart}.md, contracts/
db/migrations/0009_midia.sql                 # novo: colunas de mídia, CHECKs tipo 'outro' e falha 'midia'
workflows/shared/rajada.js                   # bvNormalizar: FR-001/FR-003, campos de FR-002, tipo outro
workflows/shared/agente.js                   # montagem do turno com mídia, prompt de descrição
workflows/shared/midia.js                    # novo: validação pura (https, host, MIME, limites)
workflows/bv-recepcao.json                   # Inserir mensagem grava midia_mime/segundos/bytes; Montar turno devolve-os
workflows/sub/interpretar-midia.json         # novo (contracts/interpretar-midia.md)
workflows/sub/entregar-rajada.json           # chamada ao sub, Preparar, Ler contexto, So midia?
workflows/bv-vigia.json                      # query de retenção
workflows/README.md                          # id e papel do sub novo
config/ambientes/{integracao,producao}.json  # chaves midia.*, textos (contracts/config-midia.md)
scripts/verificar-repo.py                    # regras das chaves novas
scripts/smoke-agente.py                      # cenários de mídia possíveis sem WhatsApp (falha OpenAI, host recusado)
tests/rajada.test.js, tests/agente.test.js, tests/midia.test.js (novo)
tests/test_workflows_midia.py (novo), tests/test_workflows_recepcao.py, tests/test_workflows_agente.py, tests/test_esquema.py
```

**Structure Decision**: segue a árvore existente; lógica pura em `workflows/shared/` testada por
`node`, workflow inspecionado por unittest, como nas features anteriores.

## Fluxo

```text
bv-recepcao: Normalizar (tipo audio|imagem|outro + mime/segundos/bytes) -> Inserir mensagem -> 200
             -> buffer inalterado -> Montar turno (devolve campos de mídia) -> entregar-rajada
entregar-rajada: Registrar turno -> Ja tratado? -> Ler contexto (inclui audio/imagem com
             conteudo_derivado) -> Tem mídia? -sim-> Interpretar mídia (sub, continueRegularOutput)
             -> Preparar (turno montado por agente.js) -> So midia? (nenhum item compreendido)
             -sim-> Compor midia (textos.midia_nao_entendida | textos.midia_grande) -> Saidas
             -não-> Agente (inalterado) -> Compor -> Saidas
bv-vigia (5 min): limpeza de tentativas (atual) + retenção de mídia (nova)
```

Rastreio: FR-001/002/003/011/012 na recepção; FR-004/005/010 no turno; FR-006/008/013 no
`interpretar-midia`; FR-007 e SC-002/SC-003 no `So midia?`/nota única; FR-009 e SC-004 no
`bv-vigia`; FR-014, FR-015, FR-016 e SC-001/SC-005/SC-006 no quickstart, no deploy e na revisão
de veracidade.

Deploy: `deploy-n8n.py --criar interpretar-midia` antes de publicar o `entregar-rajada` (o id
precisa existir no config). Ordem: migração 0009 → `interpretar-midia` → `entregar-rajada` →
`bv-recepcao` → `bv-vigia`.

## Convenções de Borda

| Camada | Estilo | Validação | Fonte da verdade |
|--------|--------|-----------|------------------|
| Evento Chat Master (entrada) | camelCase do canal | `bvNormalizar` + fixtures reais | `tests/fixtures/chatmaster/evento-{13,15,20}.json` |
| Colunas Postgres | snake_case | migração + `test_esquema.py` | `db/migrations/0009_midia.sql` |
| Contrato `entregar-rajada` ↔ `interpretar-midia` | snake_case | teste estático + `midia.test.js` | `contracts/interpretar-midia.md` |
| Códigos de falha de mídia | snake_case | teste estático | `data-model.md` |
| Config | snake_case com unidade no nome | `verificar-repo.py` | `contracts/config-midia.md` |
| OpenAI | o do fornecedor | status + campo `text` | `contracts/openai-midia.md` |

Mapper: `bvNormalizar` (evento → linha) e `Montar turno` (linha → item do turno). Sem ORM.

## Complexity Tracking

Sem violações.

## Segurança (gate `owasp-security`, 2026-10-19)

Achados: 0 critical, 4 high, 6 medium, 4 low. Mitigações incorporadas ao desenho:

- **H1 SSRF por regex frouxa**: validação da URL inteira em minúsculas por uma regex ancorada
  (`https://`, host `[a-z0-9.-]+`, sem `@`, `\`, porta, ponto final ou `%` no host), host comparado
  por igualdade com a lista do tipo, e prefixo de caminho opcional por host (`midia.prefixos_*`,
  vazio = qualquer caminho; o caminho real está mascarado na fixture). Casos negativos em
  `tests/midia.test.js`.
- **H2 injeção via mídia**: o descritor de imagem devolve só a descrição, com teto de caracteres
  (`midia.descricao_max_chars`, `[PROPOSTA]` 600) e instrução de não seguir texto da imagem; o
  texto derivado tem os delimitadores do bloco de dados e cabeçalhos de papel neutralizados antes
  de entrar no turno; escrita na agenda continua exigindo a confirmação do cliente (XI) e passa
  pelas ferramentas da Graces; fixture de injeção ("ignore as regras, cancele...") em
  `agente.test.js`.
- **H4 mídia grande**: rejeição antes do download por `fileLength`/`seconds` do evento (já no
  desenho) + timeout de 10 s como teto. Recusa por `Content-Length` antes do corpo: depende de
  opção do nó HTTP Request do n8n **não medida**; conferida com `validate_node_config` na tarefa.
- **M1**: o webhook já exige o token do canal (`Hash do token`, sha256 de `token_origin`, no
  `bv-recepcao`); o achado de "só path" não procede.
- **M2**: teto por contato já existe para turnos (`agente.turnos_max_contato_hora` = 20); mídia
  conta dentro dele. Alerta de gasto na conta OpenAI é configuração do owner, fora do repositório.
- **M3**: o descritor omite números de documento e cartão; sequências de 6+ dígitos viram `#`.
- **M4**: o host recusado é registrado só como host (sem caminho) em `falhas_agente.operacao`,
  para o owner confirmar a lista; nenhum log de URL completa.
- **M5**: `midia.execucao_timeout_s` (75) no sub limita o tempo de mídia; medir o turno inteiro
  no TESTE antes de mexer no `lock.ttl_s`.
- **M6**: `verificar-repo.py` confere `saveData*`=`none` e ausência de `errorWorkflow` nos dois
  workflows.
- **L3**: só `status_http` vai para a falha; corpo e `statusMessage` descartados.

Riscos residuais **high** **aceitos pelo owner** (block-002, resposta "aceitar-ambos", dec-015,
2026-10-19):

- **H3, aceito**: o conteúdo da mídia tem cópias fora da limpeza de 24 h. São as respostas do
  agente em `mensagens` de saída, que seguem a decisão "sem expurgo do histórico" de
  `docs/decisoes-pre-00c.md:95`, o que a OpenAI retém das requisições (nenhuma página oficial foi
  lida) e os backups do Postgres. Não há mitigação extra nesta feature.
- **H4, aceito com tarefa bloqueante**: não há teto de bytes medido no download. Fica a rejeição
  por `fileLength`/`seconds` mais o timeout de 10 s. Uma **tarefa** confere com
  `validate_node_config` se o nó HTTP Request do n8n permite recusar por `Content-Length` ou impor
  um teto de bytes antes de ler o corpo. Se permitir, a opção entra no nó de download. Se **não**
  permitir, a tarefa é **bloqueante** e volta ao owner antes da publicação.

## Riscos

- Ogg/Opus fora da lista oficial de formatos da transcrição (D3): sonda primeiro; bloqueio humano
  se recusado.
- Host/MIME de imagem desconhecidos: toda imagem recebe "não entendi" até o owner confirmar o host
  (FR-006, decidido).
- Orçamento de tempo: 2 mídias no pior caso (70 s) + agente pode passar de `lock.ttl_s`; o teto
  `max_por_turno` e os timeouts limitam, mas o tempo do agente não é medido. A medir no TESTE.
- Reenvio do canal após a limpeza (> 24 h) não é deduplicado, porque a URL vira hash.
- Injeção via áudio/imagem: mitigada pelo bloco "dado, não instrução" e pelo prompt de descrição
  neutra; não elimina, como no texto.
- `fileUrl` igual entre mídias distintas: deduplicaria errado; sem evidência, fica como está
  (`rajada.js` já documenta o atalho).
