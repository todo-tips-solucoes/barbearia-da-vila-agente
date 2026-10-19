# Security Checklist: Regras de negócio sobre a agenda da Graces

**Purpose**: Qualidade dos requisitos de autorização, proteção de dados e escrita irreversível
**Created**: 2026-10-19
**Feature**: [spec.md](../spec.md)

## Autorização e dados

- [x] CHK026 - Texto do cliente e dados da Graces são tratados como dado, não instrução? [Spec §FR-013] {auto}
- [x] CHK027 - A exibição de dados de terceiros é limitada ao terceiro e ao remetente? [Spec §US4-5] {auto}
- [x] CHK028 - Cadastro irreversível exige confirmação explícita e autorização do owner em testes? [Spec §FR-007, FR-014] {auto}
- [x] CHK029 - O barbeiro de teste nunca é oferecido a clientes? [Spec §FR-002, briefing] {auto}
- [x] CHK030 - Erros expostos ao cliente omitem detalhes técnicos e `code`/`traceId` logados sem dados pessoais? [Spec §FR-009] {auto}
- [ ] CHK031 - A spec exige que terceiro com celular diferente nunca vire `idCliente` (sem ver, remarcar, cancelar ou agendar), fechando o IDOR por nome (A01/API1)? [Gap, Spec §FR-006; research.md Decision 6 F-SEC-1] {auto}
- [ ] CHK032 - Tetos anti-varredura/lixo (`buscas_max_sessao/dia`, `cadastros_max_dia`) são requisitos da spec e não só de config? [Gap, contracts/config-regras.md F-SEC-2] {auto}
- [ ] CHK033 - Nome completo mínimo de 2 palavras para a busca e o critério de "mesmo nome" (normalização) são mensuráveis? [Ambiguity, research.md Decision 6] {auto}
- [ ] CHK034 - O celular lido da resposta de busca nunca chega ao modelo/mensagem (requisito explícito de não exposição)? [Assumption, research.md Decision 6] {auto}
- [ ] CHK035 - Os gates validate-documentation e owasp-security foram re-executados após a mudança de block-003 (onda 5)? [Gap, process] {humano}

## Notes

- Os gates da onda 5 NÃO foram re-rodados; CHK035 fica aberto como follow-up antes de execute-task.
- CHK031-CHK034: a evidência existe em research/contracts, mas não na spec; marcados [Gap] de rastreabilidade (spec defasada).
