---
title: "API WebChat Enviar Arquivos"
slug: api-webchat-enviar-arquivos
category: "Mídias"
plan: Webchat
method: POST
endpoint: https://api.chatmasterveloz.com/api/webchat/messages/send
source: https://clihelper.chatmasterveloz.com/docs/api-webchat-enviar-arquivos
fetched: 2026-10-14
---
# API WebChat Enviar Arquivos  `Webchat`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-webchat-enviar-arquivos> · [Voltar ao índice](../README.md)

🧩 Envia **um ou mais arquivos de mídia** (imagem, vídeo, áudio ou documento) para um visitante ativo no widget WebChat, identificado pelo **sessionId**. Os arquivos viajam junto da requisição (multipart).

**API:** WebChat

### Endpoint

```
https://api.chatmasterveloz.com/api/webchat/messages/send
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
    'sessionId' => 'session_1745772400000_abc123',
    'body' => 'Segue o documento solicitado',
    'medias[0]' => new CURLFile('/caminho/arquivo.pdf'),
    'medias[1]' => new CURLFile('/caminho/imagem.png')
  )
```

➡️ **“sessionId”:** identificador único da sessão do visitante no widget. É gerado pelo widget e pode ser obtido via webhook, pela mensagem-marcador do ticket ou pela página de visitantes ao vivo.

➡️ **“body”:** texto opcional. Quando informado, vira a **legenda do primeiro arquivo**; os demais recebem “Arquivo: nome-original” como legenda padrão.

➡️ **“medias”:** o arquivo (ou os arquivos) a enviar. Pode ser repetido para mandar vários na mesma requisição, com até 20 MB cada. O tipo — imagem, vídeo, áudio ou documento — é reconhecido automaticamente pelo mimetype.

◽ Extensões aceitas: `.jpg` `.png` `.gif` `.webp` `.mp4` `.webm` `.mp3` `.ogg` `.pdf` `.doc` `.docx` `.xls` `.xlsx` `.csv`.

◽ Tipos MIME aceitos: `image/*`, `video/*`, `audio/*`, `application/pdf`, `application/msword`, entre outros.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```php
<?php

$curl = curl_init();

curl_setopt_array($curl, array(
  CURLOPT_URL => 'https://api.chatmasterveloz.com/api/webchat/messages/send',
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_ENCODING => '',
  CURLOPT_MAXREDIRS => 10,
  CURLOPT_TIMEOUT => 0,
  CURLOPT_FOLLOWLOCATION => true,
  CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
  CURLOPT_CUSTOMREQUEST => 'POST',
  CURLOPT_POSTFIELDS => array(
    'sessionId' => 'session_1745772400000_abc123',
    'body' => 'Segue o documento solicitado',
    'medias[0]' => new CURLFile('/caminho/arquivo.pdf'),
    'medias[1]' => new CURLFile('/caminho/imagem.png')
  ),
  CURLOPT_HTTPHEADER => array(
    'Authorization: Bearer {seutokenaqui}' //Token cadastrado na conexão
  ),
));

$response = curl_exec($curl);

curl_close($curl);
echo $response;
```
