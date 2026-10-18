---
title: "API Chat Externo Enviar Arquivos"
slug: api-chat-externo-enviar-arquivos
category: "Mídias"
plan: Oficial
method: POST
endpoint: https://api.chatmasterveloz.com/api/chat-externo/midia
source: https://clihelper.chatmasterveloz.com/docs/api-chat-externo-enviar-arquivos
fetched: 2026-10-14
---
# API Chat Externo Enviar Arquivos  `Oficial`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-chat-externo-enviar-arquivos> · [Voltar ao índice](../README.md)

🧩 Envia **arquivos do seu computador** que aparecem apenas no **Chat Externo**, sem sair pelo canal.

**API:** Oficial

### Endpoint

```
https://api.chatmasterveloz.com/api/chat-externo/midia
```

### Método

```
POST
```

### Autenticação

```
Bearer {seutokenaqui}
```

### Payload

```php
array(
    'ticketId' => 700,
    'body' => 'Segue a proposta em PDF',
    'medias[0]' => new CURLFile('/caminho/proposta.pdf'),
    'medias[1]' => new CURLFile('/caminho/tabela.png')
  )
```

➡️ **“ticketId”:** ID do Ticket. **Obrigatório.**

◽ É o número entre parênteses no cabeçalho da conversa. Em **João da Silva (52) | #25678**, o ticketId é o **52**.

➡️ **“medias”:** o arquivo, ou os arquivos. **Cada arquivo vira uma mensagem.Obrigatório.**

◽ Imagem, áudio, vídeo ou documento — o tipo é reconhecido pelo próprio arquivo.

➡️ **“body”:** opcional. A legenda. Sem ela, vale o nome do arquivo.

◽ `caption` funciona como sinônimo de `body`.

⚠️ **A conexão do atendimento precisa estar em Modo Alternativo (Chat Externo por Link).** Fora dele a chamada é recusada, porque a mensagem não teria como chegar ao cliente.

◽ A mensagem aparece no painel do operador e na página do cliente, e **não sai** pelo WhatsApp.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```php
<?php

$curl = curl_init();

curl_setopt_array($curl, array(
  CURLOPT_URL => 'https://api.chatmasterveloz.com/api/chat-externo/midia',
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_ENCODING => '',
  CURLOPT_MAXREDIRS => 10,
  CURLOPT_TIMEOUT => 0,
  CURLOPT_FOLLOWLOCATION => true,
  CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
  CURLOPT_CUSTOMREQUEST => 'POST',
  CURLOPT_POSTFIELDS => array(
    'ticketId' => 700,
    'body' => 'Segue a proposta em PDF',
    'medias[0]' => new CURLFile('/caminho/proposta.pdf'),
    'medias[1]' => new CURLFile('/caminho/tabela.png')
  ),
  CURLOPT_HTTPHEADER => array(
    'Authorization: Bearer {seutokenaqui}' //Token cadastrado na conexão
  ),
));

$response = curl_exec($curl);

curl_close($curl);
echo $response;
```
