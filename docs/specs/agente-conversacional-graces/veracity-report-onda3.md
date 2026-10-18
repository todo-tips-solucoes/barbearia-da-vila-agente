# data-veracity-verifier — plan (onda-003)

Veredito: has_unsourced (2 itens), recomendação do verificador: human_block. Todos os demais dados conferem nas fontes.

## UNSOURCED
1. research.md:129 e quickstart.md:17 (sonda S0): nome da tool MCP `get_node_types` sem fonte permitida. Marcar [A MEDIR S0] ou citar fonte. (Nota do pai: a tool existe nesta sessão como `mcp__claude_ai_n8n__get_node_types` na lista de tools deferidas do harness.)
2. plan.md:53 (Princípio XII), research.md Decision 14 e plan.md Testing: "`validate_workflow` do MCP antes do commit". docs/specs/recepcao-robustez/tasks.md:113 registra que `validate_workflow` valida código do Workflow SDK, não JSON. Reconhecer a limitação e dizer como a validação acontece de fato.

## Citação errada
- research.md Decision 5: `api-oficial-mensagem-de-lista.md:99` → linhas 54 e 105.

## Imprecisões menores
- research.md Decision 10 P1: citar graces-api/02-clientes.md:15 ("Não existe atualização nem exclusão"), não a linha 50.
- research.md Decision 6: `whatsappId` também aparece em 08-equipe/api-criar-usuario.

# Validação MCP do bv-graces (pai, após a onda-009)

- `get_workflow_details` (MCP n8n) em `mjhd7O0AzrqNVrf0`: 19 nós, `active=true`, `executionTimeout` 300, versão ativa = versão atual (`0b04e929-…`). Os `{{BV:INCLUDE:…}}` restantes estão só em comentários do código incluído.
- `validate_node_config` (MCP n8n): Gatilho (executeWorkflowTrigger 1.1), "Entrada valida?" (if 2.2) e "Contexto" (postgres 2.5) válidos. "Graces A" (httpRequest 4.2) **inválido no esquema**: `sendQuery` e `sendBody` esperam booleano e recebem expressão string (`={{ … }}`). O mesmo vale para "Graces E1" e "Graces E2". Esse padrão não aparece em nenhum outro workflow do repo nem do Gold. Corrigir: usar booleanos fixos e, se preciso, separar os nós por método. Exemplo: um nó sem body para GET/DELETE e outro com body para POST/PUT. Validar de novo com `validate_node_config`.
- Também: `proposta.validade_min` está fixo em `30` no SQL do nó "Contexto", em vez de vir da config.

## Revalidação MCP do bv-graces (pai, após a onda-010)

- `validate_node_config`: "Graces A" (sem corpo; `sendQuery: true`, `sendBody: false`) e "Graces A corpo" (`sendBody: true`, `specifyBody: json`) estão **válidos**. E1 e E2 e seus nós "corpo" têm parâmetros idênticos aos de A.
- `get_workflow_details`: 25 nós, `active=true`, versão ativa igual à atual (`593fc103-…`), `executionTimeout` 300.
- `validade_min`: não é um valor fixo. O fonte usa `{{BV:proposta.validade_min}}`, e o 30 vem da config. Ponto encerrado.
- Ainda não houve execução real. O gatilho (executeWorkflowTrigger) não pode ser executado direto pelo MCP, então o caminho POST/PUT só será exercido no smoke da Fase 7.
