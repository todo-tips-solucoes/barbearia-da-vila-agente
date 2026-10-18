# Quickstart: regras-negocio-agenda

Só TESTE. Escrita na Graces sempre no barbeiro de teste (`1cee0bb9-e58b-4428-9e9b-1db184db7943`),
cliente Paulo (5511967296849), tudo cancelado no `finally` (FR-014). Envio real só ao 5511967296849
pela conexão 145, e só nos cenários marcados `[real]`; os demais usam contatos simulados.

## Validação local (antes de qualquer deploy)

```text
node tests/graces.test.js && node tests/agente.test.js
python3 -I -m unittest discover -s tests
python3 -I scripts/verificar-repo.py && python3 -I scripts/varrer-segredos.py
```

Cobertura obrigatória em `tests/graces.test.js` (respostas no formato de `graces-api/`):

| Id | Cenário | Expected |
|----|---------|----------|
| u1 | `horarios_livres` com 14 inícios | oferta com os 14, `completa:true`, sem `orientacao` de filtro |
| u2 | `Compor` com oferta de 23 horários e modelo citando 2 ids | 3 listas (10, 10, 3), em ordem cronológica |
| u3 | "qualquer barbeiro", 2 barbeiros com inícios sobrepostos | união por início; cada um com barbeiro; nunca o de teste |
| u4 | `agendar` fase 1, pacotes com seção válida | `pergunta_pacote`, sem proposta |
| u5 | idem com seção de `dataValidade` anterior à data | proposta avulsa, sem pergunta |
| u6 | fase 2 `pacote`, duas seções | POST com `idClienteItemPacote` = `secoes[0]` e sem `idServico` |
| u7 | fase 2 `pacote`, reconsulta vazia | `falhou`, `pacote_indisponivel`, nenhum POST |
| u8 | `agendar`/`reagendar` com serviço "corte adulto 2º vez", "BARBA 2a VEZ", "2ª vez" | `servico_nao_oferecido` nas fases 1 e 2 |
| u9 | POST status 0, agendamentos com o item novo | `executada`, `verificada:true`, 1 POST só |
| u10 | POST status 0, agendamentos sem o item, repetição 200 | `executada`, exatamente 2 POST |
| u11 | POST status 503 duas vezes, item ausente nas duas leituras | `incerta`, 2 POST, contingência, `escrita_incerta` |
| u12 | POST status 0 e leitura de agendamentos falha | `incerta`, 1 POST só |
| u13 | cada `code` de FR-009, `detail` em inglês e em português | reação da tabela da research Decision 9; `detail` ausente da saída |
| u14 | encadeamento 2 serviços, um barbeiro com sequência e outro sem | só inícios do barbeiro com sequência |
| u15 | encadeamento sem barbeiro único | `sem_barbeiro_unico`, oferta `modo_encadeamento`, sem horário |
| u16 | conjunto: 1º POST 200, 2º 409 | `parcial`, `criados` = 1º, `faltaram` = 2º, sem 3ª chamada |
| u17 | `buscar_pessoa` com 2 resultados | rótulos só com nome e sobrenome; `escolher_pessoa` no mesmo turno recusado |
| u18 | `cadastrar_terceiro` com `cadastroLiberado` falso | `cadastro_desabilitado`, nenhuma chamada |
| u19 | `cadastrar_terceiro` liberado (mock), sem `celular` | POST com o celular do remetente, só na fase 2 em turno posterior |
| u20 | laço com 17 estágios | `estagios_esgotados` |
| u21 | terceiro escolhido com celular diferente do remetente | `meus_agendamentos`, `cancelar`, `reagendar` e pacote recusados com `terceiro_sem_vinculo`; `agendar` avulso aceito |

## Sondas (primeira fase)

- **S3** laço de estágios: publicar o `bv-graces` no TESTE com a ligação de volta; conferir pelo MCP
  `get_workflow_details` e por uma execução real de `horarios_livres` encadeado (3 estágios) que o
  ciclo roda e preserva o estado. **Expected**: execução com 3 voltas e saída igual à do teste u14.
  Falhou → fallback desenrolado (research Decision 2).
- **S4** `[real]` `{humano}` 4 listas seguidas ao 5511967296849. **Expected**: o owner vê as 4 na
  ordem e um toque na 3ª lista chega ao agente como a opção certa.

## Roteiros no TESTE (`scripts/smoke-agente.py`, um por vez)

1. **r1 todos os inícios**: pedir corte para um dia útil com o barbeiro de teste via chamada direta ao
   `bv-graces` → **Expected**: `conversas.opcoes.itens` = `horarios` de uma consulta paralela feita
   pelo smoke à Graces (SC-001).
2. **r2 dia lotado**: data sem vaga (`horarios: []`) → **Expected**: texto sugere outro dia; nenhuma
   lista; nenhum horário inventado.
3. **r3 horário tomado**: proposta criada, o smoke ocupa o horário no barbeiro de teste, cliente diz
   "sim" → **Expected**: proposta `falhou` com novas opções; a ocupação do smoke é cancelada.
4. **r4 sem pacote**: Paulo agenda → **Expected**: nenhuma pergunta de pacote; proposta avulsa;
   agendamento criado e cancelado (SC-002, parte "0%").
5. **r5 2ª vez pelo nome**: "quero corte adulto 2ª vez" → **Expected**: nenhuma oferta "2º vez";
   chamada direta `agendar` com o id dessa variante recusada (SC-003).
6. **r6 terceiro existente**: "é para o Paulo" (busca pelo nome do próprio cliente de teste) → "sim"
   → **Expected**: proposta com `idCliente` do encontrado; criado e cancelado (SC-004). Nenhum
   `POST /agenda/clientes`.
7. **r7 dois serviços**: corte + barba com o barbeiro de teste → **Expected**: 2 agendamentos, o 2º
   começando em `horaInicio` do 1º + `minutos`; ambos cancelados (SC-005).
8. **r8 conjunto parcial**: o smoke ocupa o horário do 2º serviço entre a proposta e o "sim" →
   **Expected**: `parcial`; mensagem diz o que foi e o que não foi agendado; o 1º é cancelado no
   `finally`.
9. **r9 cancelar conjunto**: cria 2 e pede "cancela os dois" → **Expected**: 2 `DELETE`, resultado por
   item.
10. **r10 limpeza**: ao fim de toda rodada → **Expected**: 0 agendamentos futuros do Paulo no barbeiro
    de teste (SC-008).

Caminho `pacote` real e cadastro real de terceiro: fora do smoke até P3 e autorização expressa do
owner (research Decisions 4 e 6).
