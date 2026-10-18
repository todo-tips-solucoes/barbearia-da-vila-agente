---
title: "API Criar Tag"
slug: api-criar-tag
category: "Tags"
plan: Todas
method: POST
endpoint: https://api.chatmasterveloz.com/api/tags
source: https://clihelper.chatmasterveloz.com/docs/api-criar-tag
fetched: 2026-10-14
---
# API Criar Tag  `Todas`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-criar-tag> · [Voltar ao índice](../README.md)

🧩 Cria **uma tag** no cadastro da empresa.

**API:** Todas

### Endpoint

```
https://api.chatmasterveloz.com/api/tags
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

```json
{
    "name": "Orçamento enviado",
    "color": "#0a84ff",
    "tagType": "Atendimento"
}
```

➡️ **“name”:** nome da tag, com pelo menos 3 caracteres e único na empresa. **Obrigatório.**

◽ A comparação ignora maiúsculas e espaços nas pontas: `Suporte`, `suporte` e `Suporte ` são a mesma tag.

➡️ **“color”:** cor da tag, em hexadecimal.

➡️ **“kanban”:** `1` faz a tag virar **coluna do Kanban**; `0` deixa a tag comum. Sem ele, `0`.

➡️ **“prioridade”:** ordem da coluna no Kanban, do menor para o maior. Sem ele, `0`.

➡️ **“tagType”:** tipo da tag — `Atendimento`, `Encerramento` ou `CRM`. Sem ele, a tag nasce como `Atendimento`.

◽ O tipo não é conferido: o que você mandar é gravado como está, e um tipo inventado deixa a tag fora das telas que filtram por tipo.

➡️ **“active”:** `false` cria a tag já inativa. Sem ele, a tag nasce ativa.

➡️ **“conversao”:** nome do evento de conversão que o Pixel dispara quando a tag entra num atendimento.

◽ Só tem efeito com o Pixel configurado no painel.

◽ A tag nasce pública — todo operador a enxerga.

◽ Campos fora desta lista não são gravados.

◽ Criar a tag não a coloca em atendimento nenhum.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X POST 'https://api.chatmasterveloz.com/api/tags' \
  -H 'Authorization: Bearer {seutokenaqui}' \
  -H 'Content-Type: application/json' \
  --data '{"name":"Orçamento enviado","color":"#0a84ff","tagType":"Atendimento"}'
```
