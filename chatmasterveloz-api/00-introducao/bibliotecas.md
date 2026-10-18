---
title: "Bibliotecas"
slug: bibliotecas
category: "Introdução"
source: https://clihelper.chatmasterveloz.com/docs/bibliotecas
fetched: 2026-10-14
---
# Bibliotecas

> Fonte: <https://clihelper.chatmasterveloz.com/docs/bibliotecas> · [Voltar ao índice](../README.md)

🧩 A plataforma trabalha com três bibliotecas (libs) de API do WhatsApp, e **nem toda chamada existe nas três**. Consulte estas tabelas antes de desenhar a integração, para saber o que cada uma entrega.

**Pro** — API por QR Code.

**Básica** — API por QR Code.

**Oficial** — API Oficial da Meta.

### Mensagem

| Recurso | Pro | Básica | Oficial |
|---|---|---|---|
| Digitando… | ✔️ | ✔️ | ✔️ |
| Gravando… | ✔️ | ✔️ | ❌ |
| Mensagem de Texto | ✔️ | ✔️ | ✔️ |
| Mensagem de Texto via LID | ✔️ | ❌ | ❌ |
| Mensagem Interna | ✔️ | ✔️ | ✔️ |
| Mensagem para Grupos | ✔️ | ✔️ | ❌ |
| Mensagem de Lista | ✔️ | ✔️ | ✔️ |
| Mensagem Template | ❌ | ❌ | ✔️ |
| Mensagem Template pelo Hub | ❌ | ❌ | ✔️ |
| Enviar Contato | ❌ | ✔️ | ❌ |
| Enviar Figurinha | ✔️ | ❌ | ✔️ |
| Listar Figurinhas | ✔️ | ✔️ | ✔️ |
| Criar e Deletar Agendamento | ✔️ | ✔️ | ✔️ |
| Listar Mensagens do Ticket | ✔️ | ✔️ | ✔️ |
| Listar Mensagens por Protocolo | ✔️ | ✔️ | ✔️ |
| Editar Mensagem no Painel | ✔️ | ✔️ | ✔️ |
| Mensagens Template da Meta (criar, listar, obter) | ❌ | ❌ | ✔️ |

### Chat Externo

| Recurso | Pro | Básica | Oficial |
|---|---|---|---|
| Enviar o Link do Chat Externo | ❌ | ❌ | ✔️ |
| Mensagem de Texto no Chat Externo | ❌ | ❌ | ✔️ |
| Enviar Arquivos e Arquivo por URL no Chat Externo | ❌ | ❌ | ✔️ |

◽ As chamadas do Chat Externo exigem, além da biblioteca, que a Conexão do atendimento esteja em **Modo Alternativo**. Fora dele a chamada é recusada.

### Mídias

| Recurso | Pro | Básica | Oficial |
|---|---|---|---|
| Enviar Imagem por URL | ✔️ | ✔️ | ✔️ |
| Enviar Áudio por URL | ✔️ | ✔️ | ✔️ |
| Enviar Vídeo por URL | ✔️ | ✔️ | ✔️ |
| Enviar Documento por URL | ✔️ | ✔️ | ✔️ |
| Enviar Áudio em Base64 | ✔️ | ❌ | ❌ |
| Enviar Arquivos do computador | ✔️ | ✔️ | ❌ |
| Imagem, Áudio, Vídeo, Documento ou Arquivos por URL para Grupos | ✔️ | ❌ | ❌ |

### Ticket

| Recurso | Pro | Básica | Oficial |
|---|---|---|---|
| Criar Ticket | ✔️ | ✔️ | ✔️ |
| Obter um Ticket | ✔️ | ✔️ | ✔️ |
| Listar Tickets do Painel | ✔️ | ✔️ | ✔️ |
| Buscar Tickets por Filtro | ✔️ | ✔️ | ✔️ |
| Listar Tickets por Tag | ✔️ | ✔️ | ✔️ |
| Listar Tickets do Contato | ✔️ | ✔️ | ✔️ |
| Listar Protocolos de um Ticket | ✔️ | ✔️ | ✔️ |
| Atualizar Ticket | ✔️ | ✔️ | ✔️ |
| Adicionar, Remover e Atualizar Tags do Ticket | ✔️ | ✔️ | ✔️ |
| Transferir Tickets para um Setor | ✔️ | ✔️ | ✔️ |
| Transferir Tickets entre Conexões | ✔️ | ✔️ | ✔️ |
| Encerrar Ticket, em massa e por dias de inatividade | ✔️ | ✔️ | ✔️ |
| Apagar Ticket | ✔️ | ✔️ | ✔️ |
| Janela de Atendimento, pelo Ticket e pelo número | ✔️ | ✔️ | ✔️ |

### Contatos

| Recurso | Pro | Básica | Oficial |
|---|---|---|---|
| Criar Contato | ✔️ | ✔️ | ✔️ |
| Criar Contato (com validação) | ✔️ | ✔️ | ❌ |
| Validar Contato | ✔️ | ✔️ | ❌ |
| Obter um Contato | ✔️ | ✔️ | ✔️ |
| Listar Contatos | ✔️ | ✔️ | ✔️ |
| Listar Contatos de uma Tag | ✔️ | ✔️ | ✔️ |
| Atualizar Contato | ✔️ | ✔️ | ✔️ |
| Deletar TODOS os Contatos | ✔️ | ✔️ | ✔️ |

### CRM

| Recurso | Pro | Básica | Oficial |
|---|---|---|---|
| Listar Funis, Origens de Venda e Motivos de Perda | ✔️ | ✔️ | ✔️ |
| Criar, Listar, Obter, Atualizar, Mover e Deletar Oportunidade | ✔️ | ✔️ | ✔️ |
| Criar, Atualizar e Deletar Oportunidade (versão anterior) | ✔️ | ✔️ | ✔️ |
| Criar, Atualizar e Deletar Produto | ✔️ | ✔️ | ✔️ |
| Relatório de Anúncios e Leads por Anúncio | ✔️ | ✔️ | ✔️ |

### Conexões

| Recurso | Pro | Básica | Oficial |
|---|---|---|---|
| Criar Conexão | ✔️ | ❌ | ❌ |
| Obter QR Code | ✔️ | ❌ | ❌ |
| Importar Sessão | ✔️ | ❌ | ❌ |
| Status das Conexões | ✔️ | ✔️ | ✔️ |
| Atualizar Conexão | ✔️ | ✔️ | ✔️ |
| Reiniciar Conexões | ✔️ | ✔️ | ✔️ |

### Setores

| Recurso | Pro | Básica | Oficial |
|---|---|---|---|
| Listar Setores da Empresa | ✔️ | ✔️ | ✔️ |
| Atualizar Setor | ✔️ | ✔️ | ✔️ |
| Próximo Operador do Rodízio | ✔️ | ✔️ | ✔️ |

### Equipe

| Recurso | Pro | Básica | Oficial |
|---|---|---|---|
| Criar Usuário | ✔️ | ✔️ | ✔️ |
| Listar Usuários da Empresa | ✔️ | ✔️ | ✔️ |
| Transferir Carteira de Clientes | ✔️ | ✔️ | ✔️ |

### Fluxos

| Recurso | Pro | Básica | Oficial |
|---|---|---|---|
| Listar Fluxos | ✔️ | ✔️ | ✔️ |
| Mensagem via Flowbuilder | ✔️ | ✔️ | ✔️ |
| Mensagem via Typebot | ✔️ | ✔️ | ✔️ |

### Tags

| Recurso | Pro | Básica | Oficial |
|---|---|---|---|
| Listar Tags da Empresa | ✔️ | ✔️ | ✔️ |
| Criar Tag | ✔️ | ✔️ | ✔️ |
| Deletar Tag | ✔️ | ✔️ | ✔️ |

### Tarefas

| Recurso | Pro | Básica | Oficial |
|---|---|---|---|
| Criar Tarefa | ✔️ | ✔️ | ✔️ |
| Obter o Status de uma Tarefa | ✔️ | ✔️ | ✔️ |
| Listar Tarefas | ✔️ | ✔️ | ✔️ |
| Atualizar Tarefa | ✔️ | ✔️ | ✔️ |
| Finalizar Tarefa | ✔️ | ✔️ | ✔️ |
| Deletar Tarefa | ✔️ | ✔️ | ✔️ |

### Botões no WhatsApp

| Recurso | Pro | Básica | Oficial |
|---|---|---|---|
| Botão Carrossel | ✔️ | ❌ | ❌ |
| Botão Copia e Cola | ✔️ | ✔️ | ❌ |
| Botão URL | ✔️ | ✔️ | ✔️ |
| Botão Quick Reply | ✔️ | ✔️ | ✔️ |
| Botão Ligação | ✔️ | ❌ | ❌ |
| Botão Pix | ✔️ | ❌ | ❌ |

### E-mail

| Recurso | Pro | Básica | Oficial |
|---|---|---|---|
| Enviar E-mail | ✔️ | ✔️ | ✔️ |

### Extras

| Recurso | Pro | Básica | Oficial |
|---|---|---|---|
| Listar e Atualizar Configurações da Empresa | ✔️ | ✔️ | ✔️ |
| Listar Avaliações | ✔️ | ✔️ | ✔️ |
| Enviar Status de Texto, Imagem ou Vídeo | ✔️ | ❌ | ❌ |
| Horário de Expediente | ✔️ | ✔️ | ✔️ |

◽ Três chamadas de template saem pelo **Hub**, e não pela Conexão Oficial direta — o artigo de cada uma diz isso no selo.

◽ O **Webchat** não é uma das três bibliotecas, e por isso não entra nestas tabelas: as duas chamadas dele têm artigo próprio, com o selo do Webchat.
