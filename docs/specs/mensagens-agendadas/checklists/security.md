# Security Checklist: Mensagens agendadas

**Purpose**: qualidade dos requisitos de segurança, dado mínimo e isolamento de teste
**Created**: 2026-10-20
**Feature**: [spec.md](../spec.md)

Suposições (execução autônoma do feature-00c): profundidade Standard, público revisor de PR.

## Autorização da resposta

- [x] CHK001 - Uma resposta com id de confirmação de OUTRO contato é recusada? [Completude, contracts/bv-confirmacao.md "Entrada" (`mensagem_id` do mesmo `contato_id`)] {auto}
- [x] CHK002 - O formato aceito do id (`bvc:<int>:(s|n)`) está restrito, com descarte do resto? [Clareza, contracts/bv-confirmacao.md "Reconhecimento"] {auto}
- [x] CHK003 - A ferramenta do agente só age sobre confirmações abertas do próprio contato? [Cobertura, research D8; contracts/bv-confirmacao.md] {auto}
- [x] CHK004 - Texto do cliente segue como dado, nunca instrução, na ferramenta nova? [Consistência, research D8 (LLM decide equivalência; efeito só via claim)] {auto}

## Dados e logs

- [x] CHK005 - O registro guarda só o necessário (sem texto do cliente)? [Completude, Spec §FR-021; data-model.md `dados`] {auto}
- [x] CHK006 - Falhas e motivos são sem PII? [Clareza, Spec §FR-015; data-model.md `motivo`, falhas_agente] {auto}
- [x] CHK007 - A execução do sub-workflow de confirmação não persiste dados no n8n? [Cobertura, contracts/bv-confirmacao.md (`saveData*`=`none`)] {auto}
- [ ] CHK008 - A execução do `bv-mensagens` (que carrega telefone e texto) tem política de retenção definida? [Gap, plan.md não define `saveData*` do `bv-mensagens`] {auto}

## Isolamento TESTE/PROD

- [x] CHK009 - Envio real limitado à lista de escrita no TESTE? [Completude, Spec §FR-018; research D12] {auto}
- [x] CHK010 - Escrita na Graces restrita ao barbeiro de teste no TESTE? [Completude, Spec US4-4; contracts/bv-confirmacao.md passo 5] {auto}
- [x] CHK011 - PROD fica inativo (ids vazios, deploy recusa)? [Consistência, research D12; plan.md Constitution XIII] {auto}
- [x] CHK012 - A reconciliação em TESTE não alcança agendamentos de clientes reais? [Cobertura, research D9 (filtra barbeiro de teste e lista de escrita)] {auto}

## Abuso

- [x] CHK013 - Toques repetidos não geram chamadas repetidas à Graces? [Cobertura, Spec §FR-008; claim em contracts/bv-confirmacao.md passo 4] {auto}
- [ ] CHK014 - Há limite de respostas automáticas por contato para toques repetidos em sequência (spam de "repetida")? [Gap] {auto}

## Notes

- CHK008 e CHK014 viram tarefas (create-tasks): `saveData*` do `bv-mensagens` e teto de respostas `confirmacao_repetida` por contato.
