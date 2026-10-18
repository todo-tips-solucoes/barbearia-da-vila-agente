---
title: "API Criar Usuário"
slug: api-criar-usuario
category: "Equipe"
plan: Todas
method: POST
endpoint: https://api.chatmasterveloz.com/api/users
source: https://clihelper.chatmasterveloz.com/docs/api-criar-usuario
fetched: 2026-10-14
---
# API Criar Usuário  `Todas`

> Fonte: <https://clihelper.chatmasterveloz.com/docs/api-criar-usuario> · [Voltar ao índice](../README.md)

🧩 Cria **um usuário** na Equipe da empresa.

**API:** Todas

### Endpoint

```
https://api.chatmasterveloz.com/api/users
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
    "name": "Ana",
    "email": "[email protected]",
    "password": "segredo123",
    "profile": "user",
    "queueIds": [4, 5],
    "whatsappIds": [12],
    "number": "5511911111111"
}
```

➡️ **“name”:** nome do usuário, com pelo menos 2 caracteres. **Obrigatório.**

➡️ **“email”:** o e-mail de login. **Único em todo o sistema**, e não só na sua empresa — um e-mail já usado por outra empresa é recusado. **Obrigatório.**

➡️ **“password”:** senha com pelo menos 5 caracteres. **Obrigatório.**

➡️ **“profile”:** o perfil — `user` (padrão), `admin` ou `supervisor`.

➡️ **“queueIds”:** IDs dos Setores do usuário.

➡️ **“whatsappIds”:** IDs das conexões que ele pode atender. Sem este campo, ele atende todas.

➡️ **“number”:** número de celular ou ramal do usuário.

⚠️ **O `whatsappId`, no singular, é a conexão padrão do usuário** — e não a conexão da chamada. Com o token da empresa, o mesmo campo serve para as duas coisas: para autenticar sem dar conexão padrão ao usuário, mande a conexão na query da URL e deixe o corpo sem ele.

◽ **O limite de usuários do plano vale aqui.** A API não passa por cima dele.

◽ **Expediente e carga:** `startWork` e `endWork` (`HH:mm`, padrão das 00:00 às 23:59), `limiteDeAtendimentos` (máximo de atendimentos ao mesmo tempo), `carteiraQueueId`, `inactive` (nasce inativo).

◽ **Permissões:** `restricted`, `restrictToQueues`, `blockNumberView`, `receiveNotifications`, `notifyGroups`, `canAccessContacts`, `canAccessCampaigns`, `canCreateTags`, `canAssignTags`, `canRemoveTags`, `canUseContactNotes`, `canAuditSales`, `canUseAnswerFromIA`, `canViewContactSummary`, `canUseRespostaNaVolta`, `canForceHybrid`.

##### Utilize o código em requisições HTTPS com ferramentas como cURL ou bibliotecas de integração.

```bash
curl -X POST 'https://api.chatmasterveloz.com/api/users' \
  -H 'Authorization: Bearer {seutokenaqui}' \
  -H 'Content-Type: application/json' \
  --data '{"name":"Ana","email":"ana@empresa.com.br","password":"segredo123","profile":"user","queueIds":[4,5],"whatsappIds":[12],"number":"5511911111111"}'
```
