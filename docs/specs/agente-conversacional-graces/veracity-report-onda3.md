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
