# Graces — Referência da API Pública (agenda)

Cópia estruturada do portal <https://api.gracesonline.com.br/docs/>, sincronizada em **2026-10-18**, com os dados reais da loja e os fluxos do **agente de atendimento da Barbearia da Vila** (agendar, reagendar e cancelar pelo WhatsApp).
O portal exige login com a chave de API. Esta pasta é autocontida e **não contém a chave**.

## Essencial

- **Base URL:** `https://api.gracesonline.com.br/public/v1` (homologação: `https://api-staging.gracesonline.com.br/public/v1`)
- **Autenticação:** cabeçalho `X-Api-Key: $GRACES_API_KEY` (em `../.env.smoke`), sempre HTTPS e só no servidor.
- **A chave atual só funciona em produção** (staging → `401`). Testes rodam em dados reais, usando o profissional `ZZ TESTE INTEGRACAO - NAO AGENDAR`.
- **Content-Type:** `application/json` · **Fuso:** horário da loja (São Paulo), datas **sem offset**.
- **Paginação:** `pageNumber`/`pageSize` (50, máx. 200); metadados no cabeçalho `X-Pagination`.
- **Erros:** ProblemDetails (RFC 7807). Decida pelo campo `code`.
- **Sem webhooks** (seção "em breve"): o estado da agenda só se obtém consultando a API.

## Referência rápida

| Método | Rota (`/public/v1` +) | Para quê | Página |
|---|---|---|---|
| GET | `/agenda/servicos` | Catálogo de serviços (duração, preço) | [01](01-servicos-e-profissionais.md) |
| GET | `/servicos/profissionais?idServico=` | Barbeiros que fazem o serviço | [01](01-servicos-e-profissionais.md) |
| GET | `/agenda/clientes?celular=` \| `?busca=` | Achar o cliente | [02](02-clientes.md) |
| POST | `/agenda/clientes` | Cadastrar cliente (só cria) | [02](02-clientes.md) |
| GET | `/agenda/clientes/configuracao` | Campos obrigatórios do cadastro | [02](02-clientes.md) |
| GET | `/agenda/horarios-livres` ⭐ | **Horários livres** (serviço + barbeiro + dia) | [03](03-disponibilidade-e-configuracao.md) |
| GET | `/agenda/horarios` | Ocupações do barbeiro no dia | [03](03-disponibilidade-e-configuracao.md) |
| GET | `/agenda/configuracao` | Funcionamento e antecedência | [03](03-disponibilidade-e-configuracao.md) |
| GET | `/agenda/agendamentos?idCliente=` | Agendamentos do cliente | [04](04-agendamentos.md) |
| POST | `/agenda` | **Agendar** | [04](04-agendamentos.md#post-publicv1agenda--criar-agendamento) |
| PUT | `/agenda/{idAgenda}` | **Reagendar** | [04](04-agendamentos.md#put-publicv1agendaidagenda--reagendar) |
| DELETE | `/agenda/{idAgenda}` | **Cancelar** | [04](04-agendamentos.md#delete-publicv1agendaidagenda--cancelar) |
| POST | `/agenda/confirmacao` | Confirmar/recusar presença | [04](04-agendamentos.md) |
| GET | `/agenda/pacotes?idCliente=` | Seções de pacote para abater | [04](04-agendamentos.md) |
| GET | `/agenda/historico?idCliente=` | Serviços já feitos | [04](04-agendamentos.md) |
| GET | `/agenda/completa` | Agenda da loja (±7 dias) | [04](04-agendamentos.md) |
| GET | `/auth/validar` | Testar a chave | [00](00-autenticacao-e-erros.md) |

## Arquivos

| Arquivo | Conteúdo |
|---|---|
| [00-autenticacao-e-erros.md](00-autenticacao-e-erros.md) | Chave, ambientes, paginação, erros e códigos. |
| [01-servicos-e-profissionais.md](01-servicos-e-profissionais.md) | Catálogo e equipe. |
| [02-clientes.md](02-clientes.md) | Busca e cadastro de clientes. |
| [03-disponibilidade-e-configuracao.md](03-disponibilidade-e-configuracao.md) | Horários livres, ocupações, funcionamento. |
| [04-agendamentos.md](04-agendamentos.md) | Status, criar, reagendar, cancelar, confirmar, pacotes, histórico, agenda da loja. |
| [05-fluxos-do-agente.md](05-fluxos-do-agente.md) | **Roteiro do agente**: intenção → chamadas, erros, regras de ouro. |
| [06-dados-da-loja.md](06-dados-da-loja.md) | Snapshot real: 32 serviços com IDs, 5 barbeiros + 1 de teste, funcionamento, regras de cadastro, divergências com `informacaoes_barbearia.txt`. |
| [07-changelog.md](07-changelog.md) | Histórico da API e seções ainda não lançadas. |
| [endpoints.json](endpoints.json) | Catálogo legível por máquina (para gerar tools e clientes HTTP, ou validar). |

## Divergências entre o portal e a API real (verificadas em 2026-10-18)

| Ponto | Portal diz | API real devolve |
|---|---|---|
| `tempoPadrao` em `/agenda/servicos` | `"00:45"` (string) | `40` (inteiro, minutos) |
| `dia` em `/agenda/configuracao` | `1` (número) | `"Segunda-Feira"` (texto) |
| Chave em staging | "a mesma chave vale para o ambiente correspondente" | `401` com a chave atual |
| `apelido` do profissional | — | pode ter espaço no final (`"Rodrigo "`) |

## Lacunas da fonte (não presuma; valide antes de depender)

- Significado de `prazoMinimoAntecedencia = 0` / `prazoMaximo = 0` (valores atuais da loja).
- Se `POST /agenda` é idempotente (por exemplo, via `idIntegracao`).
- Status de um agendamento cancelado (não aparece na tabela de status).
- Limites de requisições (rate limit): não documentados.
- Respostas de erro específicas de cada endpoint: o portal só mostra exemplos de `200`.

## Como usar

- Se usar Claude Code, aponte no `CLAUDE.md` do projeto: "Referência da API Graces em `graces-api/README.md`; fluxos do agente em `graces-api/05-fluxos-do-agente.md`".
- Catálogo, barbeiros e horários mudam: o agente busca na API em tempo de execução. A página [06](06-dados-da-loja.md) é só fotografia.
- Para atualizar esta pasta: faça login no portal com a chave e compare com estas páginas. O portal é uma SPA (sem OpenAPI público); em 2026-10-18 o conteúdo foi extraído renderizando as páginas num Chromium headless.
