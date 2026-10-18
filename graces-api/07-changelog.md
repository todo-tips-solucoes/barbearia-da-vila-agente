---
title: "Changelog da API"
slug: changelog
source: https://api.gracesonline.com.br/docs/changelog
fetched: 2026-10-18
---
# Changelog da API Pública (v1)

> Fonte: <https://api.gracesonline.com.br/docs/changelog> · [Voltar ao índice](README.md)

| Data | Tipo | Mudança |
|---|---|---|
| 16 set 2026 | Mudança | **`GET /agenda/secao` descontinuado.** Use `GET /agenda/pacotes` com `idServico` e pegue a primeira seção da lista (já vem na ordem de consumo). `POST /agenda` não mudou. |
| 15 set 2026 | Novo | **Agendamento por seção de pacote:** `POST /agenda` aceita `idClienteItemPacote` como alternativa a `idServico`. `GET /agenda/pacotes` lista o que o cliente tem em aberto. Mudança aditiva. |
| 15 set 2026 | Novo | **`GET /agenda/horarios-livres`:** grade de horários livres já calculada. `/agenda/horarios` continua devolvendo as ocupações. |
| 11 ago 2026 | Novo | `ddiCelular` e `celularCliente` em cada agendamento de `/agenda/completa`; `ddiCelular` na busca de clientes. Aditivo. |
| 23 jun 2026 | Novo | Portal do desenvolvedor (acesso com o token de produção do estabelecimento). |
| jun 2026 | Melhoria | Profissionais passou para `/servicos/profissionais`; o cadastro de clientes passou a só criar; `idLoja` saiu da documentação (uso multi-loja é orientado pela equipe da Graces). |
| jun 2026 | Novo | Health checks `/health/live` e `/health/ready`. |
| jun 2026 | Lançamento | API Pública de Agenda v1: agenda, serviços, profissionais, clientes e configuração, com autenticação por `X-Api-Key`. |

## Seções do portal ainda "Em breve" (2026-10-18)

Vendas & comandas · Webhooks · SDKs & bibliotecas · Galeria de apps. **Não há webhooks**: o agente não recebe aviso de mudanças na agenda feitas pela recepção. Para saber o estado atual, ele precisa consultar a API.
