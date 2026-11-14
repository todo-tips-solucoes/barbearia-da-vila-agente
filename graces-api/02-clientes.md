---
title: "Clientes"
slug: clientes
source: https://api.gracesonline.com.br/docs/clientes
fetched: 2026-10-18
endpoints:
  - GET /public/v1/agenda/clientes
  - POST /public/v1/agenda/clientes
  - GET /public/v1/agenda/clientes/configuracao
---
# Clientes

> Fonte: <https://api.gracesonline.com.br/docs/clientes> · [Voltar ao índice](README.md)

Busca de clientes por celular ou nome, e cadastro de clientes novos. **Não existe atualização nem exclusão** de cliente pela API.

## GET `/public/v1/agenda/clientes`

Busca por celular (match exato) **ou** por nome. Informe um dos dois. Resposta paginada (`X-Pagination`).

| Query | Tipo | Obrig. | Descrição |
|---|---|---|---|
| `celular` | string | um dos dois | Busca exata (10+ dígitos). Aceita máscara e DDI: `(11) 9 1212-1212`, `+55 11 91212-1212` e `11912121212` são equivalentes. |
| `busca` | string | um dos dois | Busca por nome (3+ caracteres). |
| `pageNumber` | integer | não | Página (padrão 1). |
| `pageSize` | integer | não | Itens por página (padrão 50; máx. 200). |

```bash
curl "https://api.gracesonline.com.br/public/v1/agenda/clientes?celular=11999998888" -H "X-Api-Key: $GRACES_API_KEY"
```

Resposta `200`:

```json
[
  {
    "idCliente": "a1b2c3d4-...", "nomeCliente": "Marina", "sobrenomeCliente": "Alves",
    "razaoSocial": null, "email": "marina@exemplo.com", "documento": "12345678900",
    "ddiCelular": "55", "celular": "11999998888", "numeroCadastro": 4821, "dataNascimento": "1990-05-13"
  }
]
```

Sem resultado: `200` com `[]` (verificado).

**Para o agente:** identifique o cliente pelo **número do WhatsApp** (busca por `celular`). A busca por nome é ambígua e devolve várias pessoas. Use-a só como apoio, e confirme com o cliente antes de assumir que é ele. Pode haver **mais de um cadastro com o mesmo celular**: nesse caso, pergunte o nome.

## POST `/public/v1/agenda/clientes`

Cadastra um cliente novo (pessoa física). **Só cria**: não aceita `idCliente` e não atualiza cadastro existente. Antes de criar, busque pelo celular para não duplicar.

Corpo (JSON):

| Campo | Tipo | Obrig. | Descrição |
|---|---|---|---|
| `nomeCliente` | string | **sim** | Nome do cliente. |
| `documento` | string | config. | CPF (conforme a configuração da loja). |
| `ddiCelular` | string | se houver celular | DDI do celular (ex.: `55`). |
| `celular` | string | config. | Celular com DDD (só dígitos). |
| `ddiTelefone` | string | se houver telefone | DDI do telefone fixo. |
| `telefone` | string | não | Telefone fixo com DDD. |
| `email` | string | config. | E-mail. |
| `dataNascimento` | string | não | `AAAA-MM-DD`. |
| `genero` | string | não | Gênero. |
| `apelido` | string | não | Apelido. |
| `rg` | string | não | RG. |

**Comportamento medido (2026-11-14, fora da documentação oficial):**

- `sobrenomeCliente` é aceito no corpo, embora não esteja documentado, e é gravado exatamente como enviado, mesmo com várias palavras (`"Integracao Nao Agendar"`). `nomeCliente` também fica como enviado: a Graces não redivide o nome. Sem `sobrenomeCliente`, o nome inteiro vai para `nomeCliente` e a loja não acha o cliente pelo sobrenome no portal (queixa da loja; cadastros antigos como "Paulo Sudre" + "Lamarao" mostram a divisão errada).
- `genero` é texto livre na validação, mas `"Masculino"` devolve `500 ERRO_INTERNO` sem criar nada; `"M"` grava. A GET não devolve o gênero (só o portal mostra).
- Campos que a API **não** conhece (`sobrenome`, `sexo`, `origem`, `comoConheceu`, `indicacao`, `observacao` e variações): ignorados em silêncio. Não há campo de "como conheceu" pela API; o agente guarda isso em `contatos.como_conheceu` (migração 0011).
- Sondagem sem criar: um objeto `{}` num campo conhecido dá `400 CORPO_INVALIDO`; num desconhecido, segue para a validação de negócio.
- Cliente fictício de teste criado nessa medição (sem exclusão pela API): `Zz Teste` / `Integracao Nao Agendar`, celular `11900000017`, id `9503b3d1-6768-4b49-97a3-5320e86e916a`. É o `cadastro.cliente_teste_id` do TESTE.
- A busca por `busca=` devolve `[]` para qualquer termo nesta loja, inclusive o nome exato desse cliente.

**Para o agente (owner, 2026-11-14):** cadastre com `nomeCliente` = primeira palavra, `sobrenomeCliente` = o resto, celular do WhatsApp da conversa, `genero` `"M"` e `dataNascimento` quando o cliente informar.

Os campos obrigatórios dependem da configuração da loja (`GET /agenda/clientes/configuracao`). **Na Barbearia da Vila (2026-10-18): só o celular é obrigatório**; CPF, e-mail e endereço são opcionais. Ver [Dados da loja](06-dados-da-loja.md#regras-de-cadastro-de-cliente).

```bash
curl -X POST "https://api.gracesonline.com.br/public/v1/agenda/clientes" \
  -H "X-Api-Key: $GRACES_API_KEY" -H "Content-Type: application/json" \
  -d '{ "nomeCliente": "Marina Alves", "ddiCelular": "55", "celular": "11999998888" }'
```

Resposta `200`:

```json
{ "sucesso": true, "idCliente": "a1b2c3d4-...", "mensagem": "Cliente cadastrado." }
```

## GET `/public/v1/agenda/clientes/configuracao`

Configuração do formulário de cadastro de cliente: campos obrigatórios e regras do grupo "Cliente".

Resposta `200` (array de chaves):

```json
[
  { "idConfiguracaoEmpresa": "…", "idEmpresa": "…", "valor": "true",
    "chaveConfiguracao": { "chave": "CelularObrigatorio", "descricao": "Tornar obrigatório o celular no cadastro de clientes." } }
]
```

`valor` é sempre **string** (`"true"`, `"false"`, `"12"`). Converta antes de usar.
