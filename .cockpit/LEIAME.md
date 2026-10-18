# Configuração do ciclo — Barbearia da Vila - Agente

Arquivo gerado por `configurar.sh` a partir de `cockpit.config`. Para
alterar, edite o `cockpit.config` e rode `./configurar.sh --atualizar`.

Os valores ficam num bloco de texto, sem formatação, para que `|`, crases e
outros caracteres de comando apareçam exatamente como no `cockpit.config`.

```text
Repositório remoto:     todo-tips-solucoes/barbearia-da-vila-agente
Branch de integração:   develop
Branch de produção:     main
Gerenciador de pacotes: nenhum
Typecheck:              echo sem typecheck: projeto n8n sem código tipado
Lint:                   find workflows -name '*.json' -print0 | xargs -0 -r -n1 python3 -I -m json.tool >/dev/null && python3 -I scripts/verificar-repo.py && python3 -I scripts/varrer-segredos.py && python3 -I -m unittest discover -s tests
Build:                  echo sem build: workflows n8n são publicados como JSON
Deploy de integração:   scripts/deploy-n8n.sh integracao
Deploy de produção:     scripts/deploy-n8n.sh producao
Identidades de commit:  paulotodo:154374725+paulotodo@users.noreply.github.com
Board:                  
Princípio III:          ligado
```
