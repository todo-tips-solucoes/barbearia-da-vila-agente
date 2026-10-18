---
title: "Dados reais da loja na Graces (snapshot)"
slug: dados-da-loja
source: GET /public/v1/agenda/servicos, /servicos/profissionais, /agenda/configuracao, /agenda/clientes/configuracao (produção)
fetched: 2026-10-18
---
# Dados reais da loja na Graces (snapshot de 2026-10-18)

> [Voltar ao índice](README.md) · Lido da API de **produção** com a chave de `.env.smoke`. É uma **fotografia**: o agente deve buscar o catálogo na API em tempo de execução (com cache curto) e usar esta página só como referência de desenvolvimento e para fixtures de teste.

Loja: **Barbearia da Vila** — Av. Mascote, 867, Vila Mascote, São Paulo/SP. Dados cadastrais completos em `../informacaoes_barbearia.txt`.

## Serviços ativos (32) e quem executa

"Min." é o `tempoPadrao` (minutos). A duração real do agendamento vem de `/horarios-livres` (`minutos`). "todos" = os 5 barbeiros reais.

| Serviço (descricaoAgenda) | idServico | Min. | R$ | Profissionais (sem o de teste) |
|---|---|---|---|---|
| APLICAÇÃO | `4fe45a3f-ce5e-4a07-a01e-b8a429edbe11` | 40 | 50.00 | todos |
| barba design | `23f2faf7-e848-45e3-b822-ef16af69a2df` | 40 | 65.00 | todos |
| Barba Design 2º vez | `65c4047f-6505-4806-bb62-2e83d6047a1e` | 40 | 32.50 | todos |
| BARBA EXPRESS | `9cb16e74-c1fb-48d5-b46f-5bb156da1dc0` | 40 | 40.00 | todos |
| Barba Express 2º vez | `60b36d80-2e05-4ffc-bbd1-8ff09744b275` | 40 | 20.00 | todos |
| Barba lisa | `9d914461-aa60-4cc3-8032-3ee345a30736` | 40 | 65.00 | todos |
| Barboterapia | `ba33381d-a8e2-4080-9bb3-2f390350f6a0` | 40 | 95.00 | todos |
| Cabelo adulto + barba | `87786a8a-706d-4695-acca-ecfc4c27fd14` | 80 | 140.00 | todos |
| Cabelo máquina + barba | `febb3111-6490-40af-ba73-c690f2f345ef` | 80 | 120.00 | todos |
| Camuflagem | `8e5b681a-d595-4762-bd8b-ccc4fcd6f71b` | 40 | 85.00 | todos |
| Camuflagem Barba | `61e826f4-d7c9-49bb-b09c-4162c624e6e8` | 40 | 50.00 | todos |
| Coloração | `53d9a702-2e1d-4afc-846d-5c2067dbf9fc` | 40 | 120.00 | todos |
| corte adulto | `046519b1-e111-44b4-8779-3e64366f9d8f` | 40 | 85.00 | todos |
| corte adulto 2º vez | `0d71f168-7bc7-46b2-b1fc-f1bee4a7c81c` | 40 | 42.50 | todos |
| corte com maquina | `82a3b44e-1b9b-4a05-82cb-6a10d90fc27a` | 40 | 65.00 | todos |
| Corte de unha | `3a463424-b8a3-49a3-b209-784679589b37` | 40 | 20.00 | **nenhum** (só o de teste) |
| Corte Infantil 2º vez | `0dd5817f-45ae-4069-9eb0-fdb375d331e8` | 40 | 32.50 | todos |
| Corte Infantil ate 11 anos | `e11a4ebe-3564-4846-9ede-f1de686db806` | 40 | 65.00 | todos |
| corte juvenil 12 a 17 anos | `9abc6d08-3d86-43cf-a4b6-fb180132af44` | 40 | 75.00 | todos |
| Corte Juvenil 2º vez | `79eb1aa9-c48e-47e9-8743-b47e900f75ba` | 40 | 37.50 | todos |
| CORTE MAQUINA SIMPLES (1 PENTE) | `e47a1677-042c-4bf6-bfa7-4fb4116414bf` | 40 | 55.00 | todos |
| Depilação | `a339c362-859e-4abd-91a2-2d8860372ec3` | 30 | 25.00 | Kiel, jayme, Black, Pedro Henrique |
| DEPILAÇÃO DE NARIZ | `540c2efc-3540-42ed-b229-d667505fa3db` | 30 | 25.00 | todos |
| DEPILAÇÃO DE ORELHA | `d3242c9e-7aed-49c3-aaab-9d0e43fa199a` | 30 | 25.00 | Pedro Henrique, Rodrigo |
| ESCOVA | `dc8a1193-3da4-4c28-8a92-3525a9095742` | 40 | 40.00 | todos |
| ESFOLIAÇÃO | `bdbcee58-0f7b-4435-94e1-30c7bdd6d38a` | 30 | 12.00 | **nenhum** (só o de teste) |
| MÃO MASCULINO | `86c5d9a3-62f2-4f17-a970-e5ed9bfd371c` | 60 | 38.00 | **nenhum** (só o de teste) |
| Pezinho | `f33e1f84-56b7-441e-a52e-a8ebc3f8ef01` | 30 | 30.00 | todos |
| PÉ MASCULINO | `807bc103-0761-41c6-8094-508d33d497fa` | 60 | 42.00 | **nenhum** (só o de teste) |
| relaxamento | `38f1046b-5aad-4559-ab1d-6262057b7552` | 40 | 140.00 | todos |
| Selagem | `bffdc0e3-9e43-4eaf-b890-be4b6fd4c03f` | 40 | 120.00 | todos |
| Ttratamento e Hidratação | `91425e58-6228-4bed-9886-1dcf02509e33` | 40 | 65.00 | todos |

**Serviços sem barbeiro real** (só o profissional de teste executa): *Corte de unha, ESFOLIAÇÃO, MÃO MASCULINO, PÉ MASCULINO*. O agente **não deve oferecê-los**, ou deve encaminhar para atendimento humano.

Variantes "2º vez" (metade do preço) existem para corte adulto, infantil, juvenil, barba design e barba express. A fonte não documenta **quando** o cliente tem direito a elas: é regra de negócio a confirmar com a barbearia.

## Profissionais

| Apelido | idProfissional | Função | Nº de serviços |
|---|---|---|---|
| Kiel | `0a327f00-021a-457e-a236-ce7c4aea4c25` | Barbeiro | 27 |
| jayme | `b623cd84-6068-4a57-9ce6-2f7d9a37a11e` | Barbeiro | 27 |
| Black | `81954555-4b90-4f30-ac5f-262be481843d` | Barbeiro | 27 |
| Pedro Henrique | `a7ec6dd6-84ac-40e8-85df-2a89dfc2691f` | Barbeiro | 28 |
| Rodrigo | `461af8a7-51ba-4206-bb7e-7555300f8317` | Barbeiro | 27 |
| ZZ TESTE INTEGRACAO - NAO AGENDAR ⚠️ TESTE | `1cee0bb9-e58b-4428-9e9b-1db184db7943` | Barbeiro | 32 |

> ⚠️ **`ZZ TESTE INTEGRACAO - NAO AGENDAR`** é um profissional de **teste**, criado para integrações. Ele executa todos os 32 serviços. **Nunca o ofereça a clientes**; use-o só em testes automatizados contra produção (e cancele o que criar). Filtre pelo `idProfissional` acima, não pelo nome.

## Funcionamento e regras de reserva (`GET /agenda/configuracao`)

| Dia | Abre | Fecha |
|---|---|---|
| Segunda-Feira | 12:00 | 22:00 |
| Terça a Sexta | 08:00 | 22:00 |
| Sábado | 08:00 | 19:30 |
| Domingo | 08:00 | 16:00 |

`prazoMinimoAntecedencia = 0` e `prazoMaximo = 0`. O significado de `0` não está documentado; ver [03](03-disponibilidade-e-configuracao.md#get-publicv1agendaconfiguracao).

Grade observada (corte adulto, segunda 2026-10-19): `intervaloMinutos = 40`, slots de 40 em 40 min a partir da abertura.

## Regras de cadastro de cliente

| Chave | Valor | Descrição |
|---|---|---|
| `CelularObrigatorio` | `true` | Celular obrigatório no cadastro. |
| `CpfObrigatorio` | `false` | CPF opcional. |
| `EmailObrigatorio` | `false` | E-mail opcional. |
| `EnderecoObrigatorio` | `false` | Endereço opcional. |
| `AutorizacaoCadastroDesatualizado` | `12` | Pedir autorização se o cadastro estiver desatualizado há 12 meses. |
| `IncluirClienteBonus` | `true` | Todo cliente novo entra no programa de bônus. |
| `PaisPadraoLoja` | `1` | País padrão da loja (o id 1 deve ser o Brasil; não documentado). |

Para cadastrar pelo WhatsApp, basta **nome + celular** (`ddiCelular: "55"`).

## Divergências entre a Graces e `informacaoes_barbearia.txt`

O agente deve tratar **a Graces como fonte da verdade para agenda, serviços e preços**. O arquivo de texto confirma isso para o horário (correção de 2026-10-06). Os demais itens precisam de decisão da barbearia:

| Item | `informacaoes_barbearia.txt` | Graces |
|---|---|---|
| Corte infantil | 0 a 12 anos — R$ 65,00 | "Corte Infantil ate 11 anos" — R$ 65,00 |
| Corte juvenil | 13 a 17 anos — R$ 75,00 | "corte juvenil 12 a 17 anos" — R$ 75,00 |
| Corte raspado | "a partir de" R$ 55,00 | "CORTE MAQUINA SIMPLES (1 PENTE)" R$ 55,00 e "corte com maquina" R$ 65,00 |
| Barba desenhada/lisa | R$ 65,00 | "barba design" e "Barba lisa", R$ 65,00 cada |
| Depilação orelha/nariz | R$ 20,00 | R$ 25,00 cada (nariz, orelha, "Depilação") |
| Demais serviços | não listados | Barboterapia, Coloração, Selagem, Camuflagem etc. |
| Pacotes | "4 serviços com 20% de desconto" | Vendidos fora da API; o agente só consome seções via `/agenda/pacotes`. |
