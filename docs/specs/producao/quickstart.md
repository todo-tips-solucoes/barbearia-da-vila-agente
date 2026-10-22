# Quickstart: producao

Pré-condições: owner autorizou o deploy e o banco (registrado); `BV_DEPLOY_PRODUCAO_AUTORIZADO=sim` só no terminal de quem
tem autorização; `.env`/`.env.n8n` fora do repositório.

## Cenário 1: ambiente de dados
1. `python3 -I scripts/preparar-bancos.py --alvo producao`
2. `python3 -I scripts/migrar.py --alvo producao --dry-run`, depois sem `--dry-run`
3. `python3 -I scripts/criar-credenciais-n8n.py --alvo producao`
4. `python3 -I scripts/backup-bancos.py --alvo producao --retencao 14 --validar`
**Expected**: banco com 0001 a 0010 e nenhum dado de TESTE; credenciais só no n8n2; dump validado.
**Erro**: migração falha no meio -> parar, não ir ao deploy, restaurar do dump.

## Cenário 2: deploy ordenado
1. `scripts/deploy-n8n.sh producao --criar <sub>` para cada sub-workflow, depois a recepção e os demais.
2. Antes de cada publicação `validate_node_config`; depois `get_workflow_details`.
**Expected**: cada workflow `[PROD]`, ativo, `versionId` igual a `activeVersionId`, nós e settings esperados; `[TESTE]` intactos; só n8n2.
**Erro**: validação falha -> não publica, rollback anotado.

## Cenário 3: webhook e TESTE
1. Anotar o webhook atual da 145; apontar para a recepção de PROD.
2. Mensagem do número do owner -> execução em PROD, nenhuma em TESTE.
3. `python3 -I scripts/suite-validacao.py` no TESTE.
**Expected**: PROD responde só ao owner; suíte 17/17.

## Cenário 4: quickstart das features 1 a 6 em PROD
1. Para cada feature (recepção, agente, regras de agenda, mídia, mensagens agendadas, robustez) exercitar só leitura e
   conversa com 5511967296849.
2. Passo que exigir escrita na agenda de barbeiro real -> **não executar**, bloqueio humano.
3. Enviar o resultado ao WhatsApp do owner.
**Expected**: nenhum outro número recebe mensagem; `mensagens.ativo` segue `false`; bloqueio humano final aguarda o ok.

## Cenário 5: limpeza e backup
1. Inserir (no banco de restore descartável) uma mensagem com 13 meses e outra recente; rodar `limpar-mensagens.py`.
**Expected**: só a antiga some; contato e agendamentos ficam; segunda execução apaga 0.
**Roundtrip E2E**: a mensagem do owner no Cenário 3 passa pelo webhook real e é conferida na execução do n8n2 (sem mock).
