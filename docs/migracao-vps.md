# Migração da Barbearia da Vila para o servidor próprio

Plano de 2026-10-23. Sem segredos. Origem: VPS `178.156.134.167` (stack `n8n`, instância `n8n2.todo-tips.com`). Destino: `srv1726158` / `2.25.163.213` (este servidor; antes "descartado" em `referencia.md`, revisto pelo owner em 2026-10-23).

## 1. Levantamento

### Destino (`srv1726158`)

| Item | Estado |
|---|---|
| SO | Ubuntu 26.04.1 LTS (`resolute`), fuso `Etc/UTC` |
| Recursos | 4 vCPU, 15 GiB RAM (~6 GiB já em uso pelas sessões do Claude Code), 182 GB livres |
| Rede | IPv4 `2.25.163.213`, IPv6 `2a02:4780:75:6cbd::1`; só a porta 22 aberta; `ufw` inativo |
| Docker | **não instalado**; Swarm inexistente |

### Origem (stack `n8n` na VPS `178.156.134.167`)

| Item | Valor |
|---|---|
| Orquestração | Docker 28.1.1 com Compose via Portainer, **sem Swarm**; Traefik como proxy (Let's Encrypt, `leresolver`) |
| n8n | `docker.n8n.io/n8nio/n8n:2.43.5`, `GENERIC_TIMEZONE=America/Sao_Paulo`, `NODE_FUNCTION_ALLOW_BUILTIN=crypto`, `N8N_RUNNERS_TASK_TIMEOUT=300`, `N8N_DISABLED_MODULES=instance-ai`, DNS 1.1.1.1/8.8.8.8, `--dns-result-order=ipv4first`, IPv6 desligado no container. Tem `license.cert` e acesso MCP ligado |
| Postgres | 17; databases `barbearia_vila` (8,4 MB) e `barbearia_vila_teste` (8,8 MB), roles homônimos |
| Redis | 7.2, DB 2, prefixos `bv:teste:` e `bv:prod:` (buffer, lock e dedupe, com TTL curto: **não precisa migrar**) |
| Segredos | `/root/barbearia_vila/infra.env`; a senha do Redis está **em texto puro** no compose |
| Crons | `/etc/cron.d/barbearia-backup-limpeza` (06:30 UTC, 14 dias, limpeza LGPD) e `/etc/cron.d/barbearia-limpar-midia` (`docker exec n8n-n8n-1 …`) |
| DNS | `n8n2.todo-tips.com` é CNAME de `hetzner.todo-tips.com` (178.156.134.167); zona no Google Cloud DNS |

### O que é da Barbearia na instância n8n2

A instância tem 231 workflows: **17 da Barbearia**, ~75 do Gold (com o **[PROD] do Gold** no ar) e ~108 de outros projetos. Por isso o domínio `n8n2` não pode simplesmente mudar de servidor (ver decisão D1).

| Workflow | TESTE | PROD |
|---|---|---|
| Verificação | `uoDF0RFEgzAtKUay` | `M07jjghR3IJClmDW` |
| Recepção | `iaUbATlT7xkZArVd` | `yUEWTZpNYMfIotdg` |
| Vigia da recepção | `fzJA2yWESqiPXyib` | `hbHUY1RLNS5SJ3sP` |
| Entregar rajada (agente) | `ilzXqBWGtcczlGEu` | `QTP7ezx661uFp7Wj` |
| Ferramentas da Graces | `mjhd7O0AzrqNVrf0` | `K0yVUwFr5gucXRQd` |
| Interpretar mídia | `FbQLbUHauxMMIjI4` | `IiVgK4hASaCzzbVM` |
| Confirmação de presença | `e9BYiK0G3Xs3uQ3P` | `jI5eK7tHfFYuqCJS` |
| Mensagens agendadas | `0B7Fe4qIe3eWipWI` | (não publicado, `mensagens.ativo=false`) |
| Captura (só TESTE) | `wXcRwAdqRnGgRzA9` | — |
| Alerta fora de banda (só PROD) | — | `qbA6tXtfzHLZr11T` |

Credenciais (7): Postgres TESTE `X3WoZnCScCKqBdg2`, Postgres PROD `lKwTwGxPO9zHbthQ`, Redis `chtScO4j08LclN89`, Verificação `i7qS8QNvswOIbepF`, OpenAI `3e2ki13KTZskEv7O`, Graces `NCWLnCOpE4DgIUVU`, Chat Master `FKqysWSzX8p4X1re`.

**A PROD está no ar.** Desde 2026-10-22 ela atende todos os números pela conexão 145, cujo webhook aponta para a recepção [PROD] do n8n2. Houve tráfego real em 2026-10-23.

## 2. Arquitetura no destino

Docker Swarm de um nó, com uma stack (`bv`) e segredos em `docker secret`:

| Serviço | Imagem | Observação |
|---|---|---|
| `traefik` | traefik v3 (versão fixa) | Portas 80 e 443, Let's Encrypt (HTTP-01), provider Swarm |
| `n8n` | `n8nio/n8n:2.43.5` (a mesma da origem) | Mesmas variáveis da origem; `N8N_ENCRYPTION_KEY` **nova**; volume `n8n_data` |
| `postgres` | `postgres:17` | Database `n8n` + `barbearia_vila` + `barbearia_vila_teste`; sem porta publicada |
| `redis` | `redis:7.2-alpine` | Senha por secret (não mais no compose), DB 2, `maxmemory` 512 MB, AOF |

- **Rede:** overlay interna `bv`. Postgres e Redis só na rede interna; os hosts `postgres` e `redis` continuam iguais, então os workflows não mudam.
- **Firewall:** `ufw` com 22, 80 e 443 abertos.
- **Limites:** reservas e limites de memória por serviço, porque o servidor divide a RAM com as sessões do Claude Code.
- **Arquivos:** compose e scripts no repo (`infra/stack-bv.yml`); segredos em `/root/barbearia_vila/` (modo 600), nunca no git.

### Ids: TESTE recriado, PROD a decidir

O plano original exportava workflows e credenciais da origem com o CLI do n8n (`export:credentials --decrypted`) para manter os ids. Na F4 a leitura de segredos da VPS de produção foi barrada pelo classificador de segurança da sessão, e o TESTE não precisa dela: foi **recriado do zero pelo próprio repo**, com ids novos gravados em `config/ambientes/integracao.json`:

- banco `barbearia_vila_teste` vazio (`preparar-bancos.py` + `migrar.py`, 0001–0010), com senha nova gerada aqui;
- credenciais por `criar-credenciais-n8n.py` (segredos do `.env.smoke` local e do `infra.env` daqui; token de verificação novo);
- workflows por `deploy-n8n.sh integracao --criar` e depois o deploy normal.

Para a PROD (F6), o banco `barbearia_vila` tem dados reais de clientes e precisa vir da origem (dump), o que exige autorização explícita do owner para essa leitura. As credenciais e os workflows de PROD podem ser recriados do mesmo jeito que os do TESTE.

## 3. Fases

| Fase | O que | Afeta a PROD? |
|---|---|---|
| F0 | Decisões D1–D6 e insumos do owner | não |
| F1 | Instalar Docker Engine (repo oficial; se o `resolute` não tiver pacote, usar o `noble`), `swarm init`, `ufw`. **Feito em 2026-10-23:** Docker 29.9.2 pelo repo `resolute` (chave `9DC8…CD88` conferida); Swarm de um nó com `--advertise-addr`/`--listen-addr` em `127.0.0.1` (2377 e 7946 fora da internet). `ufw` adiado para a F2, porque as sessões do Claude Code escutam portas em todas as interfaces e é preciso confirmar antes que bloqueá-las não derruba o acesso remoto | não |
| F2 | Subir a stack `bv` (Traefik, n8n, Postgres, Redis) com um domínio novo; certificado emitido; owner criado no n8n novo. **Feito em 2026-10-23:** `infra/stack-bv.yml` (Traefik v3.7.15, n8n 2.43.5, Postgres 17.10, Redis 7.2.16 com senha por secret) e `infra/stack-portainer.yml` (2.45.2, admin por secret). Segredos por `infra/criar-segredos.sh`, com cópia em `/root/barbearia_vila/infra.env` (600). `https://n8nv.todo-tips.com` (healthz 200, owner criado por dentro do container antes de abrir) e `https://portainerv.todo-tips.com` (login admin ok); certificados Let's Encrypt até 2027-01-21; HTTP redireciona para HTTPS. Postgres e Redis só na rede interna `bv_bv` | não |
| F3 | **Feita (2026-10-23).** `_vps.py` roda local e acha o container pelo serviço do Swarm (`bv_postgres`, `bv_redis`); senha do Redis em `REDIS_PASSWORD` do `infra.env`. Crons, `backup-bancos.py` e `criar-credenciais-n8n.py` adaptados; `verificar-infra.py` não precisou de mudança. TESTE aponta para o n8nv; a PROD (`producao.json`) segue no n8n2 até a F6. Docs, `CLAUDE.md`, `referencia.md` (local) e memória atualizados | não |
| F4 | **Feita (2026-10-23), recriando o TESTE no n8nv** (ver "Ids" acima): banco, 6 credenciais e 9 workflows publicados; `database n8n` fechado ao PUBLIC (`REVOKE CONNECT`); verificação 200 com token e 403 sem; `smoke-recepcao` ok, exceto o cenário SC-007, que dependia do stub `__falha__` que o agente real substituiu (obsoleto antes da migração). Faltam: `smoke-agente`, `smoke-mensagens` e desativar os [TESTE] no n8n2 | não |
| F5 | Ensaio da troca: dump/restore de `barbearia_vila` no destino, sem ativar a PROD, para medir o tempo real da janela | não |
| F6 | **Janela de troca da PROD** (combinada com o owner, em horário de pouco tráfego); passo a passo abaixo | **sim, ~10 min** |
| F7 | Pós-troca: crons de backup e mídia no destino, primeiro backup e restore de teste, observação por 48 h | não |
| F8 | Desativar na origem (só com ok do owner, após 7 dias): arquivar os 17 workflows e as 7 credenciais no n8n2, remover os 2 crons da VPS e guardar um dump final dos dois bancos antes de apagá-los | não |

### F6: janela de troca

1. Despublicar na origem os gatilhos da PROD: recepção, vigia e alerta.
2. Tirar o dump final de `barbearia_vila` e restaurar no destino.
3. Ativar os workflows [PROD] no destino.
4. Apontar o webhook da conexão 145 para `https://<novo-domínio>/webhook/bv-recepcao-680eee2d-…`, com `capturar-webhook.py` e a URL anterior anotada.
5. Testar com o número de teste do owner: uma mensagem, a resposta do agente e a gravação no banco.
6. **Rollback** (se o passo 5 falhar): voltar o webhook da 145 para a URL do n8n2 e reativar os gatilhos de PROD na origem. O banco de origem fica intacto até o fim da F8.

Mensagens que chegarem entre os passos 1 e 4 caem num webhook inativo. Antes da janela é preciso confirmar se o Chat Master reenvia em caso de falha; se não reenviar, a janela precisa ser a menor possível.

## 4. Decisões do owner

Respondidas em 2026-10-23:

- **D1:** subdomínio novo só da Barbearia, com o `n8n2` intacto.
- **D2:** o owner cria os registros DNS.
- **D4:** instalar o Portainer, ao contrário da recomendação, com acesso por subdomínio próprio atrás do Traefik.
- **D5:** instalar o hook de guarda de PROD antes da F6.

- **Subdomínios:** `n8nv.todo-tips.com` e `portainerv.todo-tips.com`, criados pelo owner como CNAME de `hostinger.todo-tips.com`, sem AAAA.
- **D3:** o owner não sabe se a licença vale para outra instância; seguir sem licença e conferir se o acesso MCP funciona. O owner conecta o MCP no claude.ai.
- **D6:** a troca pode ser a qualquer hora; segundo o owner, o sistema ainda não está em uso. O Chat Master **não reenvia** a mensagem quando o webhook falha.

Contexto original de cada decisão:

- **D1. Domínio.** O `n8n2.todo-tips.com` também atende o Gold PROD e outros ~108 workflows, então não pode vir para cá sem levar esses projetos. **Recomendação:** um subdomínio novo só da Barbearia (por exemplo `n8n-bv.todo-tips.com`) apontando para `2.25.163.213`, com o n8n2 intacto. Mover o domínio `n8n2` exigiria trocar a URL de toda a operação do Gold e dos outros projetos.
- **D2. DNS.** A zona `todo-tips.com` está no Google Cloud DNS. Quem cria o registro A (e o AAAA, se quiser)? Se houver credencial de API, eu crio.
- **D3. Licença do n8n.** O n8n2 tem `license.cert`. A instância nova precisa da mesma licença (ou de uma chave nova, se a atual for por instância)? Também é preciso conectar o MCP do n8n no claude.ai a essa instância, e esse passo é do owner na interface do claude.ai.
- **D4. Portainer.** Na origem a stack é gerida pelo Portainer. **Recomendação:** não instalar; a stack fica versionada no repo e é publicada por `docker stack deploy`.
- **D5. Mesmo servidor para dev e PROD.** Este servidor roda as sessões do Claude Code como root. Com a PROD aqui, um comando errado do agente atinge a produção direto. **Recomendação:** instalar o hook de guarda de PROD (proposto em `infra.md`, nunca instalado) antes da F6 e manter a trava `BV_DEPLOY_PRODUCAO_AUTORIZADO`.
- **D6. Janela da F6.** Data, horário e quem testa com o número do owner.

## 5. Riscos

| Risco | Mitigação |
|---|---|
| Perder mensagens de clientes durante a troca | Janela curta e ensaiada (F5), horário de pouco tráfego, rollback em um passo |
| Credenciais decifradas em trânsito | `scp` direto entre servidores, modo 600, apagar após importar, nunca no git nem no chat |
| RAM dividida com as sessões do Claude Code | Limites por serviço; medir após a F4 |
| Ubuntu 26.04 recente demais para o repositório do Docker | Usar o pacote do `noble`, ou `docker.io` do Ubuntu como alternativa |
| Fim do alerta "se o n8n2 cair" | O alerta passa a monitorar o novo servidor; continua sem vigia externo (limite já conhecido) |
