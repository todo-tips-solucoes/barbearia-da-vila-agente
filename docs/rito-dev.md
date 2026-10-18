# Rito de desenvolvimento — Barbearia da Vila - Agente

Do `git fetch` até a PR mergeada, validada e encerrada. O agente conduz o rito fase a fase, sem
pular gates. Parâmetros: `cockpit.config` (resumo em `.cockpit/LEIAME.md`). Faltou uma chave: nomeie
a chave e pare; nunca siga com valor presumido.

## Gates gerais

- Nunca push direto em `develop` ou `main`, nunca force-push e nunca
  merge sem PR.
- Nunca `git add -A` nem `git add .`: stage sempre por caminhos explícitos.
- Parada obrigatória no review (Fase 6): quem aprova e mergeia é um humano.
- Validação de typecheck, lint e build segue o Princípio III da constituição (valor configurado:
  `ligado`).
- Nunca promover com o ambiente de integração quebrado ou sem smoke feito nele; nunca smoke em
  produção sem rollback anotado.
- A identidade de quem aprova cada PR não vem do `cockpit.config`: pergunte ao humano na Fase 4.

## Etapa preparatória — Sincronizar

Traga a base e confirme que veio, comparando com uma fonte de rede diferente. Se a comparação
falhar ou o `gh api` não responder, pare: não comece nada até a base conferir.

```bash
git fetch origin develop
local_sha="$(git rev-parse origin/develop)"
remoto_sha="$(gh api repos/todo-tips-solucoes/barbearia-da-vila-agente/branches/develop --jq .commit.sha)"
[ -n "$remoto_sha" ] && [ "$local_sha" = "$remoto_sha" ]
```

## Fase 1 — Branch

Crie a branch a partir de `origin/develop` conferido, em worktree, com base explícita:
`feature/<slug>`, `fix/<slug>`, `chore/<slug>` ou `docs/<slug>`. `hotfix/<slug>` sai de
`main` e só com incidente real.

```bash
/parallel-work <prefixo>/<slug> --base origin/develop
```

Em hotfix, a base é `origin/main`. Entre na worktree antes de editar qualquer arquivo.

## Fase 2 — Desenvolver

Consulte antes as convenções do projeto em `docs/project-context.md`. Gerenciador de pacotes:
`nenhum` (citado, nunca invocado para instalar por conta do agente).

## Fase 3 — Commit

Conventional Commits em português, escopo = área do diff. Stage por caminhos explícitos, nunca
`--no-verify`, identidade conforme `docs/CICLO-GIT.md`.

```bash
git add <caminhos explícitos>
git commit -m "<tipo>(<escopo>): <descrição em português>"
```

## Fase 4 — Abrir PR

```bash
git push -u origin <branch>
gh pr create --base develop --title "<tipo>(<escopo>): <descrição>"
```

A base é `develop`; só um hotfix abre a PR com base `main`. Declare a trilha e os caminhos tocados no corpo. Pergunte
agora ao humano quem aprova esta PR.

## Fase 5 — CI (loop até verde)

```bash
gh pr checks <número> --watch
```

Checks de referência: `echo sem typecheck: projeto n8n sem código tipado`, `find workflows -name '*.json' -print0 | xargs -0 -r -n1 python3 -I -m json.tool >/dev/null`, `echo sem build: workflows n8n são publicados como JSON`. Vermelho: corrija no
branch, faça push e cheque de novo.

## Fase 6 — Review (PONTO DE PARADA)

O agente para aqui. Entrega: (1) pontos de alteração, (2) `RECOMENDAÇÃO: aprovar` ou
`RECOMENDAÇÃO: pedir mudanças`, com o porquê medido, (3) o comando pronto para o humano colar.
O agente nunca aprova nem mergeia. Ao retomar, confira `gh pr view <número> --repo todo-tips-solucoes/barbearia-da-vila-agente`.

## Fase 7 — Merge

Só após aprovação humana explícita:

```bash
gh pr merge <número> --squash --delete-branch
```

Deploy de integração, quando configurado: `scripts/deploy-n8n.sh integracao`.

## Fase 8 — Smoke no ambiente de integração

Confira o workflow de deploy mais recente da branch `develop` (`gh run list`),
exercite o fluxo alterado e confirme console e log limpos. Falhou: corrija com nova PR (Fase 1).
A URL do ambiente é perguntada ao humano na hora.

## Fase 9 — Promoção para produção

Se `develop` e `main` forem a mesma branch, esta fase é **no-op**: o
deploy da Fase 7 já é o de produção.

Caso contrário, confira antes se já existe uma PR de promoção aberta e reaproveite-a:

```bash
gh pr list --base main --head develop
gh pr create --base main --head develop --title "chore(release): promover develop para main"
```

A promoção tem parada igual à da Fase 6, e faça merge com **merge commit** (`gh pr merge <número> --merge`), nunca squash
e nunca `--delete-branch`. Deploy de produção: `scripts/deploy-n8n.sh producao`; se for manual, confira o alvo antes de rodar.

## Fase 10 — Smoke em produção (rollback antes)

Anote o rollback antes de testar: SHA de `main` anterior à promoção e o reverso de
qualquer migração de dado. Exercite o fluxo promovido; falhou: execute o rollback, confirme
produção verde e só então diagnostique.

## Fase 11 — Encerramento

Remova a worktree e a branch da frente e atualize a base (`develop`, ou
`main` quando a Fase 9 foi no-op ou em hotfix).

## Relatório ao humano

Ao fim de cada fase, informe em uma ou duas linhas: fase concluída, evidência (PR, checks, run,
smoke) e próxima ação. Se um gate bloquear, diga o que se espera de quem.
