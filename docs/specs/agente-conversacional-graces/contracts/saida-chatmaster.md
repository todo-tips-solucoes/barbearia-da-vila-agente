# Contrato: saída do agente para o Chat Master (QR Pro)

`[EXISTENTE]` endpoints e corpos são **reais** (fonte em `chatmasterveloz-api/`). A forma de informar a conexão
com token da empresa é **desconhecida** e será medida na sonda S1 (research Decision 6).

Base `https://api.chatmasterveloz.com`, header `Authorization: Bearer <token>` por credencial
Header Auth (C `README.md:8-10`). `number` = telefone do turno, só dígitos (C
`01-mensagem/api-mensagem-de-texto.md:48`).

## Do modelo ao `Compor`

O modelo devolve texto livre e, opcionalmente, um bloco final:

```text
OPCOES:
<id> | <título>
```

`[PROPOSTA]` (formato herdado do GOLD, `workflows/shared/funil.js:504`). O `Compor` devolve até
`saida.max_mensagens` itens `{n, tipo:"texto"|"lista", texto, opcoes?}`; só o último pode ser lista.

## Por mensagem `n` (1..4)

1. Gravar `mensagens` saída `out-<turno_id>-<n>` (`ON CONFLICT DO NOTHING RETURNING`); sem linha = já
   enviada, pula.
2. Contato em `teste.contatos_simulados` → envio simulado (status 200), sem chamada externa.
3. Digitando: `POST /api/messages/whatsmeow/sendComposingPRO`
   `{"number":"<n>","body":"composing","caption":""}` (C `api-digitando-pro.md:22, 40-51`).
4. Wait de `clamp(len(texto) × digitando.ms_por_char, digitando.min_ms, digitando.max_ms)`.
5. Envio:
   - texto: `POST /api/messages/send` `{"number","openTicket":"0","queueId":"0","body"}`
     (C `api-mensagem-de-texto.md:17-54`; `openTicket` 0 não abre ticket, :50; `queueId` só tem efeito com `openTicket` 1, :52);
   - lista: `POST /api/messages/whatsmeow/sendListPRO`
     `{"number","openTicket":"1","queueId":"0","body":{"Desc","ButtonText","TopText","List":[{"RowId","title","desc"}]}}`
     (C `api-mensagem-de-lista-pro.md:22, 40-93`; `openTicket` 1 + `queueId` 0 mantém o status do
     ticket, `0` encerraria o ticket).
   - Campo da conexão (`whatsappId` = `{{BV:chatmaster.whatsapp_id}}`): `[A MEDIR — sonda S1]`.
6. Resposta não 2xx → `falhas_agente` (`chatmaster|envio_falhou`, `status_http`) e as posições
   seguintes não são enviadas.

`Desc` = texto humano da pergunta; `ButtonText` e `TopText` = `textos.lista_botao` e
`textos.lista_topo` (`[PROPOSTA]` de redação); `RowId` = `id` da opção; `title` = rótulo truncado a
`lista.max_titulo`; `desc` = detalhe curto (ex.: valor do serviço, barbeiro do horário).

## Resposta a uma lista

Chega pelo fluxo normal da recepção como mensagem de texto. A documentação diz só que "o título da
opção é a resposta devolvida" (C `api-mensagem-de-lista-pro.md:15`); o formato no webhook QR Pro é
`[A MEDIR — sonda S2]`. O agente casa título ou texto livre com `conversas.opcoes`.
