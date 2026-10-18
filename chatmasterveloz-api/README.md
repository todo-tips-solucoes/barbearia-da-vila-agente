# Chat Master Veloz — Referência de APIs

Cópia local da documentação oficial <https://clihelper.chatmasterveloz.com/docs/apis>, sincronizada em **2026-10-14**.
Pasta autocontida: pode ser copiada para qualquer projeto.

## Essencial

- **Base URL das chamadas:** `https://api.chatmasterveloz.com` (todas as rotas ficam em `https://api.chatmasterveloz.com/api/...`)
- **Autenticação:** header `Authorization: Bearer {token}` — o token é cadastrado **na conexão** (cada conexão/número tem o seu).
- **Content-Type:** `application/json` (exceto envios de arquivo via multipart, quando indicado).
- **Documentação navegável:** `https://clihelper.chatmasterveloz.com/docs/...` (o host `api` não serve a documentação).

### Etiquetas de plano/conexão

| Etiqueta | Significado |
|---|---|
| `Todas` | Chamada disponível em todas as bibliotecas. |
| `Pro` | Biblioteca Pro — API por QR Code. |
| `Básica` | Biblioteca Básica — API por QR Code. |
| `Oficial` | Biblioteca Oficial — API Oficial da Meta. |
| `Oficial Hub` | API Oficial da Meta, envio de template pelo Hub. |
| `Webchat` | Widget WebChat; o visitante é identificado por `sessionId`. |

> Nem toda chamada existe nas três bibliotecas, e o mesmo recurso pode ter rotas e payloads diferentes em cada uma. Veja a matriz em [Bibliotecas](00-introducao/bibliotecas.md).

## Arquivos

- `README.md` — este índice.
- `endpoints.json` — catálogo legível por máquina (método, endpoint, plano, exemplo de payload, cURL, link da fonte).
- `NN-categoria/<slug>.md` — uma página por artigo, com frontmatter YAML.
- `_assets/` — imagens dos artigos (baixadas para uso offline).
- `_tools/sync.py` — regenera tudo a partir do site (`python3 -I _tools/sync.py`).

## Observações sobre a fonte

- Exceção de rota: `API Deletar TODOS os Contatos` usa `DELETE {base}/contacts-delete` (fora de `/api`), exatamente como está na documentação oficial.
- Algumas páginas trazem mais de um endpoint (ex.: encerrar tickets por inatividade: conexão atual × todas). No `endpoints.json` eles aparecem em `all_endpoints`.
- Webhooks não têm endpoint para chamar: são configurados no painel e a plataforma faz POST no seu endereço. As páginas de webhook descrevem o campo `acao`, que identifica o tipo de evento, e trazem exemplos de payload. A própria fonte avisa que os payloads mudam entre versões, então valide com eventos reais.
- Os exemplos em PHP da fonte foram substituídos pelo cURL equivalente, que a própria documentação oferece.

## Como reutilizar em outro projeto

1. Copie a pasta inteira (`chatmasterveloz-api/`) para o outro projeto.
2. Para atualizar: `python3 -I _tools/sync.py` (só biblioteca padrão; reescreve as páginas e o índice).
3. Para geração de código ou validação automática, leia o `endpoints.json`.
4. Se usar Claude Code, aponte no `CLAUDE.md` do projeto: "Referência da API Chat Master Veloz em `docs/chatmasterveloz-api/README.md`".

## Índice

### Introdução

| Artigo | Plano | Método | Rota |
|---|---|---|---|
| [APIs](00-introducao/apis.md) | — | — | — |
| [Pré-Requisitos das APIs](00-introducao/pre-requisitos-apis.md) | — | — | — |
| [Conteúdos sobre APIs](00-introducao/conteudos-sobre-apis.md) | — | — | — |
| [API x Webhook](00-introducao/api-x-webhook.md) | — | — | — |
| [Estrutura de API](00-introducao/estrutura-de-api.md) | — | — | — |
| [Bibliotecas](00-introducao/bibliotecas.md) | — | — | — |

### Mensagem ⭐ prioritária

| Artigo | Plano | Método | Rota |
|---|---|---|---|
| [Mensagem](01-mensagem/api-mensagem.md) | — | — | — |
| [API Digitando…](01-mensagem/api-digitando.md) | Básica | POST | `/api/messages/isTyping` |
| [API Digitando….](01-mensagem/api-digitando-pro.md) | Pro | POST | `/api/messages/whatsmeow/sendComposingPRO` |
| [API Gravando…](01-mensagem/api-gravando.md) | Básica | POST | `/api/messages/isRecording` |
| [API Gravando….](01-mensagem/api-gravando-pro.md) | Pro | POST | `/api/messages/whatsmeow/sendComposingPRO` |
| [API Oficial Digitando](01-mensagem/api-oficial-digitando.md) | Oficial | POST | `/api/messages/typing` |
| [API Mensagem de Texto](01-mensagem/api-mensagem-de-texto.md) | Básica | POST | `/api/messages/send` |
| [API Mensagem de Texto via LID](01-mensagem/api-mensagem-de-texto-via-lid.md) | Pro | POST | `/api/messages/whatsmeow/sendTextPROLid` |
| [API WebChat Mensagem de Texto](01-mensagem/api-webchat-mensagem-de-texto.md) | Webchat | POST | `/api/webchat/messages/send` |
| [API Oficial Mensagem](01-mensagem/api-oficial-mensagem.md) | Oficial | POST | `/api/messages/sendOfficialData` |
| [API Oficial Mensagem Template](01-mensagem/api-oficial-mensagem-template.md) | Oficial | POST | `/api/messages/sendMetaCustom` |
| [API Oficial Mensagem Template sem variável](01-mensagem/api-oficial-mensagem-template-sem-variavel.md) | Oficial | POST | `/api/messages/sendMetaCustom` |
| [API Chat Externo Enviar Link](01-mensagem/api-chat-externo-enviar-link.md) | Oficial | POST | `/api/chat-externo/enviar-link` |
| [API Chat Externo Mensagem de Texto](01-mensagem/api-chat-externo-mensagem-de-texto.md) | Oficial | POST | `/api/chat-externo/mensagem` |
| [API Oficial Template sem variável (Hub)](01-mensagem/api-oficial-template-sem-variavel-hub.md) | Oficial Hub | POST | `/api/messages/sendOfficial` |
| [API Oficial Template com variável (Hub)](01-mensagem/api-oficial-template-com-variavel-hub.md) | Oficial Hub | POST | `/api/messages/sendOfficial` |
| [API Oficial Template Customizado (Hub)](01-mensagem/api-oficial-template-customizado-hub.md) | Oficial Hub | POST | `/api/messages/sendOfficialCustom` |
| [API Mensagem Interna](01-mensagem/api-mensagem-interna.md) | Todas | POST | `/api/messages/internal/send` |
| [API Mensagem para Grupos](01-mensagem/api-mensagem-para-grupos.md) | Básica | POST | `/api/messages/sendGroup` |
| [API Mensagem para Grupos](01-mensagem/api-mensagem-para-grupos-pro.md) | Pro | POST | `/api/messages/whatsmeow/sendTextGroupPRO` |
| [API Mensagem de Lista](01-mensagem/api-mensagem-de-lista.md) | Básica | POST | `/api/messages/sendList` |
| [API Mensagem de Lista](01-mensagem/api-mensagem-de-lista-pro.md) | Pro | POST | `/api/messages/whatsmeow/sendListPRO` |
| [API Oficial Mensagem de Lista](01-mensagem/api-oficial-mensagem-de-lista.md) | Oficial | POST | `/api/messages/sendInteractive` |
| [API Criar Agendamento](01-mensagem/api-criar-agendamento.md) | Todas | POST | `/api/schedules` |
| [API Deletar Agendamento](01-mensagem/api-deletar-agendamento.md) | Todas | POST | `/api/schedules/delete` |
| [API Enviar Contato](01-mensagem/api-enviar-contato.md) | Básica | POST | `/api/messages/sendContact` |
| [API Enviar Figurinha](01-mensagem/api-enviar-figurinha.md) | Pro | POST | `/api/figurinhas/enviar` |
| [API Listar Figurinhas](01-mensagem/api-listar-figurinhas.md) | Todas | GET | `/api/figurinhas` |
| [API Listar Mensagens do Ticket](01-mensagem/api-listar-mensagens-do-ticket.md) | Todas | GET | `/api/tickets/{ticketId}/messages?limit=50&pageNumber=1` |
| [API Listar Mensagens do Ticket sem as Internas](01-mensagem/api-listar-mensagens-do-ticket-sem-as-internas.md) | Todas | POST | `/api/messages/list` |
| [API Listar Mensagens por Protocolo](01-mensagem/api-listar-mensagens-por-protocolo.md) | Todas | GET | `/api/tickets/messages/{protocol}` |
| [API Criar Mensagens Template Meta](01-mensagem/api-criar-mensagens-template-meta.md) | Oficial | POST | `/api/waba-templates` |
| [API Listar Todas Mensagens Template Meta](01-mensagem/api-listar-todas-mensagens-template-meta.md) | Oficial | GET | `/api/whatsapptemplates` |
| [API Listar Mensagens Template Meta](01-mensagem/api-listar-mensagens-template-meta.md) | Oficial | GET | `/api/waba-templates?status=APPROVED&category=UTILITY` |
| [API Obter uma Mensagem Template Meta](01-mensagem/api-obter-uma-mensagem-template-meta.md) | Oficial | GET | `/api/waba-templates/{id}` |
| [API Editar Mensagem no Painel](01-mensagem/api-editar-mensagem-no-painel.md) | Todas | POST | `/api/messages/edit` |

### Mídias ⭐ prioritária

| Artigo | Plano | Método | Rota |
|---|---|---|---|
| [Mídias](02-midias/api-midias.md) | — | — | — |
| [API Enviar Imagem por URL](02-midias/api-enviar-imagem-por-url.md) | Básica | POST | `/api/messages/sendURLImage` |
| [API Enviar Imagem por URL](02-midias/api-enviar-imagem-por-url-pro.md) | Pro | POST | `/api/messages/whatsmeow/sendUrlFilesWhatsmeowPRO` |
| [API Oficial Enviar Imagem por URL](02-midias/api-oficial-enviar-imagem-por-url.md) | Oficial | POST | `/api/messages/official/sendMediaByURL` |
| [API Enviar Áudio por URL](02-midias/api-enviar-audio-por-url.md) | Básica | POST | `/api/messages/sendURLAudio` |
| [API Enviar Áudio por URL](02-midias/api-enviar-audio-por-url-pro.md) | Pro | POST | `/api/messages/whatsmeow/sendUrlFilesWhatsmeowPRO` |
| [API Oficial Enviar Áudio por URL](02-midias/api-oficial-enviar-audio-por-url.md) | Oficial | POST | `/api/messages/official/sendMediaByURL` |
| [API Enviar Áudio Base64](02-midias/api-enviar-audio-base64-pro.md) | Pro | POST | `/api/messages/whatsmeow/sendBase64AudioWhatsmeowPRO` |
| [API Enviar Vídeo por URL](02-midias/api-enviar-video-por-url.md) | Básica | POST | `/api/messages/sendURLVideo` |
| [API Enviar Vídeo por URL](02-midias/api-enviar-video-por-url-pro.md) | Pro | POST | `/api/messages/whatsmeow/sendUrlFilesWhatsmeowPRO` |
| [API Oficial Enviar Vídeo por URL](02-midias/api-oficial-enviar-video-por-url.md) | Oficial | POST | `/api/messages/official/sendMediaByURL` |
| [API Enviar Documento por URL](02-midias/api-enviar-documento-por-url.md) | Básica | POST | `/api/messages/sendURLDocument` |
| [API Enviar Documento por URL](02-midias/api-enviar-documento-por-url-pro.md) | Pro | POST | `/api/messages/whatsmeow/sendUrlFilesWhatsmeowPRO` |
| [API Oficial Enviar Documento por URL](02-midias/api-oficial-enviar-documento-por-url.md) | Oficial | POST | `/api/messages/official/sendMediaByURL` |
| [API Chat Externo Enviar Arquivo por URL](02-midias/api-chat-externo-enviar-arquivo-por-url.md) | Oficial | POST | `/api/chat-externo/midia` |
| [API Chat Externo Enviar Arquivos](02-midias/api-chat-externo-enviar-arquivos.md) | Oficial | POST | `/api/chat-externo/midia` |
| [API Enviar Arquivos](02-midias/api-enviar-arquivos.md) | Básica | POST | `/api/messages/send` |
| [API WebChat Enviar Arquivos](02-midias/api-webchat-enviar-arquivos.md) | Webchat | POST | `/api/webchat/messages/send` |
| [API Enviar Imagem por URL para Grupos](02-midias/api-enviar-imagem-por-url-para-grupos-pro.md) | Pro | POST | `/api/messages/whatsmeow/sendUrlFilesWhatsmeowGroupPRO` |
| [API Enviar Áudio por URL para Grupos](02-midias/api-enviar-audio-por-url-para-grupos-pro.md) | Pro | POST | `/api/messages/whatsmeow/sendUrlFilesWhatsmeowGroupPRO` |
| [API Enviar Vídeo por URL para Grupos](02-midias/api-enviar-video-por-url-para-grupos-pro.md) | Pro | POST | `/api/messages/whatsmeow/sendUrlFilesWhatsmeowGroupPRO` |
| [API Enviar Documento por URL para Grupos](02-midias/api-enviar-documento-por-url-para-grupos-pro.md) | Pro | POST | `/api/messages/whatsmeow/sendUrlFilesWhatsmeowGroupPRO` |
| [API Enviar Arquivos por URL para Grupos](02-midias/api-enviar-arquivos-por-url-para-grupos-pro.md) | Pro | POST | `/api/messages/whatsmeow/sendUrlFilesWhatsmeowGroupPRO` |

### Ticket ⭐ prioritária

| Artigo | Plano | Método | Rota |
|---|---|---|---|
| [Ticket](03-ticket/api-ticket.md) | — | — | — |
| [API Criar Ticket](03-ticket/api-criar-ticket.md) | Todas | POST | `/api/tickets/createTicketAPI` |
| [API Obter um Ticket](03-ticket/api-obter-um-ticket.md) | Todas | POST | `/api/tickets/updateAPI` |
| [API Listar Tickets do Painel](03-ticket/api-listar-tickets-do-painel.md) | Todas | GET | `/api/tickets/get` |
| [API Buscar Tickets por Filtro](03-ticket/api-buscar-tickets-por-filtro.md) | Todas | POST | `/api/tickets/search` |
| [API Listar Tickets por Tag](03-ticket/api-listar-contatos-por-tag.md) | Todas | GET | `/api/contacts/findbytag` |
| [API Listar Tickets do Contato](03-ticket/api-listar-tickets-do-contato.md) | Todas | GET | `/api/contacts/alltickets` |
| [API Listar Protocolos de um Ticket](03-ticket/api-listar-protocolos-de-um-ticket.md) | Todas | POST | `/api/tickets/getproto` |
| [API Atualizar Ticket](03-ticket/api-atualizar-ticket.md) | Todas | POST | `/api/tickets/updateAPI` |
| [API Adicionar Tags ao Ticket](03-ticket/api-adicionar-tags-ao-ticket.md) | Todas | POST | `/api/tickets/{ticketId}/tags` |
| [API Remover Tags do Ticket](03-ticket/api-remover-tags-do-ticket.md) | Todas | DELETE | `/api/tickets/{ticketId}/tags` |
| [API Atualizar Tags do Ticket](03-ticket/api-atualizar-tags-do-ticket.md) | Todas | POST | `/api/tags/add` |
| [API Transferir Tickets para um Setor](03-ticket/api-transferir-tickets-para-um-setor.md) | Todas | POST | `/api/tickets/changequeue` |
| [API Transferir Tickets entre Conexões](03-ticket/api-transferir-tickets-entre-conexoes.md) | Todas | POST | `/api/tickets/changeconnection` |
| [API Encerrar Ticket](03-ticket/api-encerrar-ticket.md) | Todas | POST | `/api/messages/finish` |
| [API Encerrar Ticket em Massa](03-ticket/api-encerrar-ticket-em-massa.md) | Todas | POST | `/api/tickets/closestatus` |
| [API Encerrar Tickets por "Dias de Inatividade"](03-ticket/api-encerrar-tickets-por-dias-de-inatividade.md) | Todas | POST | `/api/tickets/closeforced` |
| [API Apagar Ticket](03-ticket/api-apagar-ticket.md) | Todas | DELETE | `/api/tickets/{ticketId}` |
| [API Janela de Atendimento](03-ticket/api-janela-de-atendimento.md) | Todas | GET | `/api/tickets/{ticketId}/janela` |
| [API Janela de Atendimento pelo Número](03-ticket/api-janela-de-atendimento-pelo-numero.md) | Todas | GET | `/api/janela?number=5511955892164` |

### Contatos ⭐ prioritária

| Artigo | Plano | Método | Rota |
|---|---|---|---|
| [Contatos](04-contatos/api-contatos.md) | — | — | — |
| [API Criar Contato](04-contatos/api-criar-contato.md) | Todas | POST | `/api/contacts` |
| [API Criar Contato (com validação)](04-contatos/api-criar-contato-com-validacao.md) | Básica | POST | `/api/contactswv` |
| [API Validar Contato](04-contatos/api-validar-contato.md) | Básica | POST | `/api/isValid` |
| [API Obter um Contato](04-contatos/api-obter-um-contato.md) | Todas | GET | `/api/contacts/single` |
| [API Listar Contatos](04-contatos/api-listar-contatos.md) | Todas | GET | `/api/contacts/all` |
| [API Listar Contatos de uma Tag](04-contatos/api-listar-contatos-de-uma-tag.md) | Todas | GET | `/api/tags/{tagId}/contacts?searchParam=` |
| [API Atualizar Contato](04-contatos/api-atualizar-contato.md) | Todas | POST | `/api/contact/update` |
| [API Deletar TODOS os Contatos](04-contatos/api-deletar-todos-os-contatos.md) | Todas | DELETE | `/contacts-delete` |

### CRM ⭐ prioritária

| Artigo | Plano | Método | Rota |
|---|---|---|---|
| [CRM](05-crm/api-crm.md) | — | — | — |
| [API Listar Funis](05-crm/api-listar-funis.md) | Todas | GET | `/api/crm/v2/funis` |
| [API Listar Origens de Venda](05-crm/api-listar-origens-de-venda.md) | Todas | GET | `/api/crm/v2/origens` |
| [API Listar Motivos de Perda](05-crm/api-listar-motivos-de-perda.md) | Todas | GET | `/api/crm/v2/motivos-perda` |
| [API Relatório de Anúncios](05-crm/api-relatorio-de-anuncios.md) | Todas | GET | `/api/anuncios?dataInicio=2026-09-01&dataFim=2026-09-30` |
| [API Listar Leads por Anúncio](05-crm/api-listar-leads-por-anuncio.md) | Todas | GET | `/api/anuncios/leads?anuncioId=&dataInicio=2026-09-01&dataFim=2026-09-30` |
| [API Criar Oportunidade](05-crm/api-criar-oportunidade.md) | Todas | POST | `/api/crm/v2/oportunidades` |
| [API Listar Oportunidades](05-crm/api-listar-oportunidades.md) | Todas | GET | `/api/crm/v2/oportunidades?status=OPEN&pageNumber=1&pageSize=20` |
| [API Obter uma Oportunidade](05-crm/api-obter-uma-oportunidade.md) | Todas | GET | `/api/crm/v2/oportunidades/{oportunidadeId}` |
| [API Atualizar Oportunidade](05-crm/api-atualizar-oportunidade.md) | Todas | PUT | `/api/crm/v2/oportunidades/{oportunidadeId}` |
| [API Mover Oportunidade de Raia](05-crm/api-mover-oportunidade-de-raia.md) | Todas | PUT | `/api/crm/v2/oportunidades/{oportunidadeId}/mover` |
| [API Deletar Oportunidade](05-crm/api-deletar-oportunidade.md) | Todas | DELETE | `/api/crm/v2/oportunidades/{oportunidadeId}` |
| [API Criar Produto](05-crm/api-criar-produto.md) | Todas | POST | `/api/products` |
| [API Atualizar Produto](05-crm/api-atualizar-produto.md) | Todas | PUT | `/api/products` |
| [API Deletar Produto](05-crm/api-deletar-produto.md) | Todas | DELETE | `/api/products` |
| [API Criar Oportunidade V1](05-crm/api-criar-oportunidade-v1.md) | Todas | POST | `/api/oportunidade` |
| [API Atualizar Oportunidade V1](05-crm/api-atualizar-oportunidade-v1.md) | Todas | PUT | `/api/oportunidade` |
| [API Deletar Oportunidade V1](05-crm/api-deletar-oportunidade-v1.md) | Todas | DELETE | `/api/oportunidade` |

### Conexões

| Artigo | Plano | Método | Rota |
|---|---|---|---|
| [Conexões](06-conexoes/api-conexoes.md) | — | — | — |
| [API Criar Conexão](06-conexoes/api-criar-conexao.md) | Pro | POST | `/api/nova-conexao` |
| [API Status das Conexões](06-conexoes/api-status-das-conexoes.md) | Todas | POST | `/api/whatsapp-status` |
| [API Atualizar Conexão](06-conexoes/api-atualizar-conexao.md) | Todas | POST | `/api/whatsapp/update` |
| [API Reiniciar Conexões](06-conexoes/api-reiniciar-conexoes.md) | Todas | POST | `/api/whatsapp-restart` |
| [API Obter QR Code](06-conexoes/api-obter-qr-code.md) | Pro | POST | `/api/whatsappqrcodepro` |
| [API Importar Sessão](06-conexoes/api-importar-sessao.md) | Pro | POST | `/api/whatsapp/importSession` |

### Setores

| Artigo | Plano | Método | Rota |
|---|---|---|---|
| [Setores](07-setores/api-setores.md) | — | — | — |
| [API Listar Setores da Empresa](07-setores/api-listar-setores-da-empresa.md) | Todas | GET | `/api/company/queues` |
| [API Atualizar Setor](07-setores/api-atualizar-setor.md) | Todas | POST | `/api/queues/update` |
| [API Próximo Operador do Rodízio](07-setores/api-proximo-operador-do-rodizio.md) | Todas | POST | `/api/queues/{queueId}/next-user` |

### Equipe

| Artigo | Plano | Método | Rota |
|---|---|---|---|
| [Equipe](08-equipe/api-equipe.md) | — | — | — |
| [API Criar Usuário](08-equipe/api-criar-usuario.md) | Todas | POST | `/api/users` |
| [API Listar Usuários da Empresa](08-equipe/api-listar-usuarios-da-empresa.md) | Todas | GET | `/api/company/users` |
| [API Transferir Carteira de Clientes](08-equipe/api-transferir-carteira-de-clientes.md) | Todas | POST | `/api/contacts/changecarteira` |

### Fluxos

| Artigo | Plano | Método | Rota |
|---|---|---|---|
| [Fluxos](09-fluxos/api-fluxos.md) | — | — | — |
| [API Listar Fluxos](09-fluxos/api-listar-fluxos.md) | Todas | GET | `/api/flowbuilder` |
| [API Mensagem via Flowbuilder](09-fluxos/api-mensagem-via-flowbuilder.md) | Todas | POST | `/api/messages/flowbuilderStart` |
| [API Mensagem via Typebot](09-fluxos/api-mensagem-via-typebot.md) | Todas | POST | `/api/messages/typebotStart` |

### Tags

| Artigo | Plano | Método | Rota |
|---|---|---|---|
| [Tags](10-tags/api-tags.md) | — | — | — |
| [API Listar Tags da Empresa](10-tags/api-listar-tags-da-empresa.md) | Todas | GET | `/api/tags?todas=&tipo=` |
| [API Criar Tag](10-tags/api-criar-tag.md) | Todas | POST | `/api/tags` |
| [API Deletar Tag](10-tags/api-deletar-tag.md) | Todas | DELETE | `/api/tags/{tagId}` |

### Tarefas ⭐ prioritária

| Artigo | Plano | Método | Rota |
|---|---|---|---|
| [Tarefas](11-tarefas/api-tarefas.md) | — | — | — |
| [API Criar Tarefa](11-tarefas/api-criar-tarefa.md) | Todas | POST | `/api/tasks/create` |
| [API Obter o Status de uma Tarefa](11-tarefas/api-obter-o-status-de-uma-tarefa.md) | Todas | GET | `/api/tasks/{tarefaId}/status` |
| [API Listar Tarefas](11-tarefas/api-listar-tarefas.md) | Todas | GET | `/api/tasks/list?status=&priority=medium&userId=` |
| [API Finalizar Tarefa](11-tarefas/api-finalizar-tarefa.md) | Todas | POST | `/api/tasks/{tarefaId}/complete` |
| [API Atualizar Tarefa](11-tarefas/api-atualizar-tarefa.md) | Todas | PUT | `/api/tasks/{tarefaId}` |
| [API Deletar Tarefa](11-tarefas/api-deletar-tarefa.md) | Todas | DELETE | `/api/tasks/{tarefaId}` |

### Botões no WhatsApp ⭐ prioritária

| Artigo | Plano | Método | Rota |
|---|---|---|---|
| [Botões no WhatsApp](12-botoes-no-whatsapp/api-botoes-no-whatsapp.md) | — | — | — |
| [Pré-Requisitos dos Botões](12-botoes-no-whatsapp/pre-requisitos-botoes.md) | — | — | — |
| [API Botão Carrossel](12-botoes-no-whatsapp/api-botao-carrossel.md) | Pro | POST | `/api/messages/whatsmeow/sendCarousel` |
| [API Botão Copia e Cola](12-botoes-no-whatsapp/botao-copia-e-cola-api.md) | Básica | POST | `/api/messages/sendCopyPaste` |
| [API Botão Copia e Cola](12-botoes-no-whatsapp/api-botao-copia-e-cola-pro.md) | Pro | POST | `/api/messages/whatsmeow/sendButtonsPRO` |
| [API Botão URL](12-botoes-no-whatsapp/botao-url-api.md) | Básica | POST | `/api/messages/sendURLBTN` |
| [API Botão URL](12-botoes-no-whatsapp/api-botao-url-pro.md) | Pro | POST | `/api/messages/whatsmeow/sendButtonsPRO` |
| [API Oficial Botão URL](12-botoes-no-whatsapp/api-oficial-botao-url.md) | Oficial | POST | `/api/messages/sendCTAURL` |
| [API Botão Quick Reply](12-botoes-no-whatsapp/botao-quick-reply-api.md) | Básica | POST | `/api/messages/sendBTN2` |
| [API Botão Quick Reply](12-botoes-no-whatsapp/api-botao-quick-reply-pro.md) | Pro | POST | `/api/messages/whatsmeow/sendButtonsPRO` |
| [API Oficial Botão Quick Reply](12-botoes-no-whatsapp/api-oficial-botao-quick-reply.md) | Oficial | POST | `/api/messages/sendInteractive` |
| [API Botão Ligação](12-botoes-no-whatsapp/api-botao-ligacao-pro.md) | Pro | POST | `/api/messages/whatsmeow/sendButtonsPRO` |
| [API Botão Pix](12-botoes-no-whatsapp/api-botao-pix-pro.md) | Pro | POST | `/api/messages/whatsmeow/sendButtonsPRO` |

### E-mail

| Artigo | Plano | Método | Rota |
|---|---|---|---|
| [E-mail](13-e-mail/api-email.md) | — | — | — |
| [API Enviar E-mail](13-e-mail/api-enviar-e-mail.md) | Todas | POST | `/api/email/send` |

### Extras

| Artigo | Plano | Método | Rota |
|---|---|---|---|
| [Extras](14-extras/api-extras.md) | — | — | — |
| [API Listar Configurações da Empresa](14-extras/api-listar-configuracoes-da-empresa.md) | Todas | GET | `/api/companies/{companyId}/settings` |
| [API Atualizar Configurações da Empresa](14-extras/api-atualizar-configuracoes-da-empresa.md) | Todas | PUT | `/api/companies/{companyId}/settings` |
| [API Listar Avaliações](14-extras/api-listar-avaliacoes.md) | Todas | GET | `/api/ratings?dateStart=2026-09-01&dateEnd=2026-09-30&pageNumber=1&pageSize=20` |
| [API Enviar Status de Texto](14-extras/api-enviar-status-de-texto.md) | Pro | POST | `/api/messages/whatsmeow/sendTextStatus` |
| [API Enviar Status de Imagem](14-extras/api-enviar-status-de-imagem.md) | Pro | POST | `/api/messages/whatsmeow/sendImageStatus` |
| [API Enviar Status de Vídeo](14-extras/api-enviar-status-de-video.md) | Pro | POST | `/api/messages/whatsmeow/sendVideoStatus` |
| [API Horário de Expediente](14-extras/api-horario-de-expediente.md) | Todas | POST | `/api/queue` |

### Webhooks ⭐ prioritária

| Artigo | Plano | Método | Rota |
|---|---|---|---|
| [Webhooks](15-webhooks/webhooks.md) | — | — | — |
| [Qual Webhook Usar](15-webhooks/qual-webhook-usar.md) | — | — | — |
| [Webhook da Conexão](15-webhooks/webhooks-da-conexao.md) | — | — | — |
| [Webhook do Setor](15-webhooks/webhook-de-setor.md) | — | — | — |
| [Webhook Eventos](15-webhooks/webhook-eventos.md) | — | — | — |
| [Webhook Triggers](15-webhooks/webhook-triggers.md) | — | — | — |
| [Arquivos no Webhook](15-webhooks/arquivos-no-webhook.md) | — | — | — |
