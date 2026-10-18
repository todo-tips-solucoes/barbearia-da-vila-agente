# Contexto do projeto — Barbearia da Vila - Agente

Parâmetros do ciclo gerados pelo cockpit; as seções seguintes são preenchidas à mão por quem
conhece o projeto. Não apague as seções: o agente as lê antes de mudanças não triviais.

Este arquivo é gerado uma vez pelo configurador; depois disso é do projeto e nunca mais é alterado.
Board vazio significa que o projeto não usa board.

```text
Repositório remoto:     todo-tips-solucoes/barbearia-da-vila-agente
Branch de integração:   develop
Branch de produção:     main
Gerenciador de pacotes: nenhum
Typecheck:              echo sem typecheck: projeto n8n sem código tipado
Lint:                   find workflows -name '*.json' -print0 | xargs -0 -r -n1 python3 -I -m json.tool >/dev/null
Build:                  echo sem build: workflows n8n são publicados como JSON
Deploy de integração:   scripts/deploy-n8n.sh integracao
Deploy de produção:     scripts/deploy-n8n.sh producao
Identidades de commit:  paulotodo:154374725+paulotodo@users.noreply.github.com
Board:                  
Princípio III:          ligado
```

## Arquitetura

> A preencher: visão geral dos componentes, fronteiras entre eles e decisões estruturais que o
> agente precisa respeitar.

## Convenções de domínio

> A preencher: vocabulário do negócio, regras que o código deve respeitar e onde estão
> documentadas.

## Áreas sensíveis

> A preencher: partes do sistema que exigem atenção redobrada (dados, segurança, integrações,
> migrações) e quem deve ser consultado antes de mexer nelas.
