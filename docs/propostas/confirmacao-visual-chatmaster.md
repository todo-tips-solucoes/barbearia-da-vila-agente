# Proposta: confirmação de presença visível no Chat Master

Estudo feito em 2026-11-15 a pedido do owner, sobre a base de conhecimento do Chat Master (`/home/chatmasterveloz/base-conhecimento`, snapshot do manual de 2026-09-13). Nada disto está implementado; depende das decisões no fim.

## O que o Chat Master faz sozinho

- **Etiquetas de atendimento** ("Confirmado", "Cancelado"): ficam no ticket e podem virar colunas de um Kanban. Só esse tipo de etiqueta aparece no ticket.
- **Setor de confirmação**: o ticket fica em "Aguardando" e o "Mover Após" / "Tempo de Escala" o transfere para outro setor se ninguém responder no prazo.
- **Fluxo (FlowBuilder)** com bloco Menu (botões ou lista "Confirmo" / "Não vou poder"): ramifica pela resposta, põe a etiqueta e muda o setor. No QR Pro, os botões podem depender de ativação pelo suporte.
- **Remarketing de etiqueta**: dispara um fluxo um tempo fixo depois que a etiqueta é posta.

## O que não existe

- **Remover etiqueta numa data e hora**: nenhuma etiqueta tem validade, e não há como agendar a remoção. O remarketing conta o tempo a partir de quando a etiqueta foi posta, não do horário do corte.
- **Agendamento de mensagem que dispara fluxo**: o módulo de Agendamentos só envia texto.
- **Remover uma etiqueta pela API**: `POST /api/tags/add` substitui todas as etiquetas do ticket. Para tirar uma, reenvia-se a lista sem ela.

## Desenho sugerido

1. **Pergunta**: na véspera, o agente pergunta pelo WhatsApp com a lista "Confirmo" / "Não vou poder". Isso já existe no projeto (`bv-confirmacao`, desligado em PROD), grava na Graces e já trata a resposta.
2. **Visual**: com a resposta, o agente põe a etiqueta "Confirmado" ou "Cancelado" no ticket (`/api/tags/add`, preservando as outras) e, se a loja quiser, move o ticket para o setor de confirmação (`/api/tickets/updateAPI`).
3. **Remoção no horário do corte**: a tabela `mensagens_agendadas` ganha um item "tirar etiqueta" no horário marcado. O sincronizador, que já roda a cada minuto, chama `/api/tags/add` sem a etiqueta nessa hora. Custo: 1 chamada por agendamento.
4. **Sem resposta**: depois de N horas sem resposta, a etiqueta "Sem resposta" ajuda a equipe a ligar.

## Decisões do owner

- Ids das etiquetas (Confirmado, Cancelado e, se quiser, Sem resposta) e do setor de confirmação, criados por você no Chat Master.
- Se o ticket deve mudar de setor ou só ganhar a etiqueta.
- Quando perguntar: véspera às 18:00, como já existia, ou junto com o lembrete de 24 horas antes (que hoje só informa).
- Prazo para "Sem resposta".
