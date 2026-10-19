# Contrato: chaves de config da mídia

`[PROPOSTA — a validar na implementacao]` Chaves novas; valores com fonte indicada na tabela.

Arquivos: `config/ambientes/integracao.json` (TESTE) e `config/ambientes/producao.json` (PROD, mesmas
chaves, credenciais/ids vazios como hoje). Placeholders `{{BV:a.b}}` / `"{{BV:NUM:a.b}}"` renderizados
pelo `scripts/deploy-n8n.py`. Regras conferidas por `scripts/verificar-repo.py`.

Todos os valores numéricos são `[PROPOSTA]` (política de design, spec FR-006/dec-009), exceto onde a
fonte está indicada.

| Chave | Valor inicial | Fonte / nota |
|-------|---------------|--------------|
| `midia.hosts_audio` | `["object.ce1.eveo.com.br"]` | host observado em `evento-20.json` |
| `midia.hosts_imagem` | `[]` | host de imagem não observado: falha fechada (FR-006) |
| `midia.mimes_audio` | `["audio/ogg"]` | `fileMimeType` de `evento-20.json` sem parâmetros; comparação pelo tipo antes do `;` |
| `midia.mimes_imagem` | `["image/png","image/jpeg","image/webp","image/gif"]` | tipos aceitos em https://developers.openai.com/api/docs/guides/images-vision |
| `midia.prefixos_audio` | `[]` | prefixos de caminho (começam com `/`) por host de áudio; vazio = qualquer caminho do host (H1) |
| `midia.prefixos_imagem` | `[]` | idem para imagem; vazio = qualquer caminho |
| `midia.descricao_max_chars` | `600` | `[PROPOSTA]`; teto da descrição de imagem (H2) |
| `midia.audio_max_s` | `120` | `[PROPOSTA]` |
| `midia.audio_max_mb` | `10` | `[PROPOSTA]`; teto oficial 25 MB (guia speech-to-text) |
| `midia.imagem_max_mb` | `10` | `[PROPOSTA]` |
| `midia.max_por_turno` | `2` | `[PROPOSTA]`; pior caso 2 × (10 + 25) = 70 s |
| `midia.download_timeout_s` | `10` | `[PROPOSTA]` |
| `midia.openai_timeout_s` | `25` | `[PROPOSTA]` |
| `midia.execucao_timeout_s` | `75` | `[PROPOSTA]`; deixa ao menos 45 s do `lock.ttl_s` (120) ao agente e às saídas |
| `midia.transcricao_modelo` | `whisper-1` | disponível na chave (`docs/decisoes-pre-00c.md:79`) |
| `midia.imagem_detalhe` | `auto` | valores oficiais `low/high/original/auto` (guia images-vision) |
| `midia.retencao_h` | `23.9` | `[PROPOSTA]`; 24 h menos o intervalo de 5 min do `bv-vigia` |
| `workflows_sub.interpretar_midia` | id | gravado por `deploy-n8n.py --criar interpretar-midia` |
| `textos.midia_nao_entendida` | texto natural | substitui `textos.midia`; ex.: "Não consegui entender o que você mandou. Pode mandar de novo ou me escrever?" |
| `textos.midia_grande` | texto natural | áudio longo ou arquivo grande: pedir mais curto ou por escrito |

Regras novas em `verificar-repo.py`: as chaves acima existem nos dois ambientes; hosts sem esquema
nem barra; `midia.execucao_timeout_s < lock.ttl_s`; `textos.midia` deixa de existir; `midia.prefixos_*` existem e cada prefixo começa com `/`;
`midia.descricao_max_chars` é inteiro > 0.

O modelo de visão é `agente.modelo` (já existe, `gpt-5.6-luna`, spec FR-005). A credencial é
`credenciais.openai` (já existe, FR-013).
