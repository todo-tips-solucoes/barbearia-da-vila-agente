#!/usr/bin/env python3
"""Sincroniza a documentação de APIs do Chat Master Veloz para Markdown local.

Uso (só biblioteca padrão, Python 3.8+):
    python3 -I _tools/sync.py            # regenera tudo na pasta pai deste script
    python3 -I _tools/sync.py --out DIR  # gera em outro diretório

Saída:
    README.md                    índice geral (base URL, autenticação, planos, tabela de endpoints)
    endpoints.json               catálogo legível por máquina
    <NN-categoria>/<slug>.md     uma página por artigo, com frontmatter YAML
"""
import argparse
import datetime as dt
import html
import json
import re
import sys
import time
import unicodedata
import urllib.request
from html.parser import HTMLParser
from pathlib import Path

DOCS_HOST = "https://clihelper.chatmasterveloz.com"
INDEX_PATH = "/docs/apis"
API_BASE = "https://api.chatmasterveloz.com"
# O domínio antigo ainda aparece nas páginas de origem; normalizado no fetch.
OLD_API_BASE = "https://api2.chatmasterveloz.com"
UA = "Mozilla/5.0 (docs-sync; +local)"

# Categorias usadas primeiro neste projeto (marcadas no índice).
PRIORITARIAS = {"Mensagem", "Mídias", "Ticket", "Contatos", "CRM", "Tarefas",
                "Botões no WhatsApp", "Webhooks"}

# Definições conforme a página "Bibliotecas" da fonte.
PLANOS = {
    "Todas": "Chamada disponível em todas as bibliotecas.",
    "Pro": "Biblioteca Pro — API por QR Code.",
    "Básica": "Biblioteca Básica — API por QR Code.",
    "Oficial": "Biblioteca Oficial — API Oficial da Meta.",
    "Oficial Hub": "API Oficial da Meta, envio de template pelo Hub.",
    "Webchat": "Widget WebChat; o visitante é identificado por `sessionId`.",
}


def fetch(path):
    req = urllib.request.Request(DOCS_HOST + path, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode("utf-8", "replace").replace(OLD_API_BASE, API_BASE)


def strip_noise(h):
    return re.sub(r"<script.*?</script>|<style.*?</style>|<svg.*?</svg>", "", h, flags=re.S)


def slugify(s):
    s = unicodedata.normalize("NFKD", s.lower()).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


# ---------------------------------------------------------------- menu
NAV_RE = re.compile(
    r'<a class="nav-i[^"]*"[^>]*data-doc-nivel="(\d)"[^>]*href="(/docs/[^"]+)"[^>]*>(.*?)</a>', re.S)


def parse_menu(index_html):
    h = strip_noise(index_html)
    i = h.find('class="doc-nav"')
    j = h.find("</nav>", i) if i >= 0 else -1
    nav = h[i:j] if j > 0 else h[i:]
    items, top, cat = [], None, None
    for nivel, href, inner in NAV_RE.findall(nav):
        t = re.search(r'<span class="titulo-nav">(.*?)</span>', inner, re.S)
        b = re.search(r'class="doc-badge"[^>]*>(.*?)</span>', inner, re.S)
        slug = href.split("/docs/")[1]
        title = html.unescape(t.group(1)).strip() if t else ""
        badge = html.unescape(b.group(1)).strip() if b else ""
        nivel = int(nivel)
        has_children = "chevron" in inner
        if nivel == 1:
            # "APIs" é a raiz da introdução; outros itens de nível 1 (ex.: Webhooks) são categorias
            top = cat = None if slug == "apis" else title
            items.append(dict(slug=slug, title=title, plan=badge,
                              category=cat or "Introdução", kind="intro" if cat is None else "categoria"))
        elif nivel == 2 and top is None:
            # dentro de "APIs": item com filhos é categoria, exceto o grupo de conteúdos introdutórios
            if has_children and slug != "conteudos-sobre-apis":
                cat = title
                items.append(dict(slug=slug, title=title, plan=badge, category=cat, kind="categoria"))
            else:
                cat = "Introdução"
                items.append(dict(slug=slug, title=title, plan=badge, category=cat, kind="intro"))
        else:
            items.append(dict(slug=slug, title=title, plan=badge,
                              category=cat or "Introdução", kind="artigo"))
    # remove duplicados mantendo a ordem
    seen, out = set(), []
    for it in items:
        if it["slug"] not in seen:
            seen.add(it["slug"])
            out.append(it)
    return out


# ---------------------------------------------------------------- html -> markdown
class MD(HTMLParser):
    BLOCK = {"p", "div", "section", "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li",
             "pre", "table", "tr", "blockquote"}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.out, self.stack, self.lists = [], [], []
        self.in_pre = False
        self.pre_lang = ""
        self.pre_buf = []
        self.href = None
        self.link_buf = None
        self.cell_row = None
        self.rows = None
        self.last_h6 = None
        self.fields = {}
        self.endpoints = []
        self.curls = []

    # util
    def w(self, s):
        if self.link_buf is not None:
            self.link_buf.append(s)
        elif self.cell_row is not None and self.cell_row and isinstance(self.cell_row[-1], list):
            self.cell_row[-1].append(s)
        else:
            self.out.append(s)

    def nl(self, n=2):
        self.out.append("\n" * n)

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if self.in_pre:
            if tag == "button" and a.get("data-curl"):
                self.curls.append(a["data-curl"])
            return
        if tag in ("h1", "h2", "h3", "h4", "h5", "h6"):
            self.nl()
            lvl = int(tag[1])
            # h6 da fonte é rótulo de campo (Endpoint, Método...) -> vira ###
            self.w("#" * (3 if lvl == 6 else max(2, lvl)) + " ")
            self.cur_h = tag
            self.h_buf_start = len(self.out)
        elif tag == "p":
            self.nl()
        elif tag == "br":
            self.w("  \n")
        elif tag in ("strong", "b"):
            self.w("**")
        elif tag in ("em", "i"):
            self.w("_")
        elif tag == "code":
            self.w("`")
        elif tag == "pre":
            self.nl()
            self.in_pre = True
            self.pre_buf = []
            self.pre_lang = ""
        elif tag in ("ul", "ol"):
            self.lists.append([tag, 0])
            self.nl(1)
        elif tag == "li":
            self.nl(1)
            depth = len(self.lists) - 1
            if self.lists and self.lists[-1][0] == "ol":
                self.lists[-1][1] += 1
                self.w("   " * depth + f"{self.lists[-1][1]}. ")
            else:
                self.w("  " * max(depth, 0) + "- ")
        elif tag == "a":
            href = a.get("href", "")
            if href.startswith("/"):
                href = DOCS_HOST + href
            self.href = href
            self.link_buf = []
        elif tag == "img":
            cls = a.get("class", "")
            if "doc-emoji" in cls:
                self.w(a.get("alt", ""))
            else:
                src = a.get("src", "")
                if src.startswith("/"):
                    src = DOCS_HOST + src
                self.w(f"![{a.get('alt', '')}]({src})")
        elif tag == "iframe":
            src = a.get("src", "")
            self.nl()
            self.w(f"[Vídeo incorporado]({src})")
        elif tag == "blockquote":
            self.nl()
            self.w("> ")
        elif tag == "table":
            self.nl()
            self.rows = []
        elif tag == "tr":
            self.cell_row = []
        elif tag in ("td", "th"):
            if self.cell_row is not None:
                self.cell_row.append([])

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)

    def handle_endtag(self, tag):
        if self.in_pre:
            if tag == "pre":
                self.in_pre = False
                code = "".join(self.pre_buf).rstrip("\n")
                if self.pre_lang == "php":
                    # O PHP de exemplo da fonte é a mesma requisição do cURL abaixo.
                    if self.curls:
                        self.w("```bash\n" + pretty_curl(self.curls[-1]) + "\n```")
                    else:
                        self.w("```php\n" + code + "\n```")
                else:
                    lang = self.pre_lang if self.pre_lang not in ("javascript",) else "json"
                    if lang == "json":
                        try:
                            json.loads(code)
                        except Exception:
                            lang = "jsonc"
                    self.w(f"```{lang}\n" + code + "\n```")
                    if self.last_h6 and self.last_h6 not in self.fields:
                        self.fields[self.last_h6] = code.strip()
                    if self.last_h6 and self.last_h6.startswith("Endpoint"):
                        self.endpoints.append(dict(label=self.last_h6, url=first_line(code)))
                self.nl()
            return
        if tag in ("h1", "h2", "h3", "h4", "h5", "h6"):
            if tag == "h6":
                self.last_h6 = "".join(self.out[self.h_buf_start:]).strip()
            self.nl()
        elif tag == "p":
            self.nl()
        elif tag in ("strong", "b"):
            self.w("**")
        elif tag in ("em", "i"):
            self.w("_")
        elif tag == "code":
            self.w("`")
        elif tag in ("ul", "ol"):
            if self.lists:
                self.lists.pop()
            self.nl()
        elif tag == "a" and self.link_buf is not None:
            text = "".join(self.link_buf).strip()
            self.link_buf = None
            self.w(f"[{text}]({self.href})" if self.href else text)
        elif tag in ("td", "th"):
            pass
        elif tag == "tr" and self.cell_row is not None:
            if self.rows is not None:
                self.rows.append(["".join(c).strip().replace("|", "\\|").replace("\n", " ")
                                  for c in self.cell_row])
            self.cell_row = None
        elif tag == "table" and self.rows is not None:
            rows, self.rows = self.rows, None
            if rows:
                n = max(len(r) for r in rows)
                rows = [r + [""] * (n - len(r)) for r in rows]
                lines = ["| " + " | ".join(rows[0]) + " |", "|" + "---|" * n]
                lines += ["| " + " | ".join(r) + " |" for r in rows[1:]]
                self.w("\n".join(lines))
            self.nl()
        elif tag == "blockquote":
            self.nl()

    def handle_data(self, data):
        if self.in_pre:
            if getattr(self, "skip_button", False):
                return
            self.pre_buf.append(data)
            return
        if self.rows is not None and self.cell_row is None:
            return  # espaço entre <table>/<tr>, fora de célula
        data = re.sub(r"\s+", " ", data)
        self.w(data)

    def feed_article(self, h):
        self.feed(h)
        self.close()
        md = "".join(self.out)
        md = re.sub(r"[ \t]+\n", "\n", md)
        md = re.sub(r"\n{3,}", "\n\n", md)
        md = re.sub(r"\*\*\s*\*\*", "", md)
        md = re.sub(r"\n[ \t]+\|", "\n|", md)  # espaços herdados antes das tabelas
        return md.strip() + "\n"


class MDLang(MD):
    """Captura language-xxx do <code> dentro de <pre> e ignora o texto do botão cURL."""

    def handle_starttag(self, tag, attrs):
        if self.in_pre and tag == "code":
            cls = dict(attrs).get("class", "") or ""
            m = re.search(r"language-(\w+)", cls)
            self.pre_lang = m.group(1) if m else ""
            return
        if self.in_pre and tag == "button":
            self.skip_button = True
        super().handle_starttag(tag, attrs)

    def handle_endtag(self, tag):
        if self.in_pre and tag == "button":
            self.skip_button = False
            return
        super().handle_endtag(tag)


def extract_article(page_html):
    h = strip_noise(page_html)
    m = re.search(r'<div class="corpo-artigo"[^>]*>', h)
    if not m:
        # páginas de categoria/índice: usa o corpo inteiro do doc-corpo
        m = re.search(r'<div class="doc-corpo"[^>]*>', h)
        if not m:
            return "", {}, [], []
    start = m.end()
    end = h.find('<nav class="doc-navart"', start)
    if end < 0:
        end = h.find("</main>", start)
    body = h[start:end]
    p = MDLang()
    md = p.feed_article(body)
    return md, p.fields, p.curls, p.endpoints


def pretty_curl(c):
    return re.sub(r" (-H|--data|--form|-F|-d) ", r" \\\n  \1 ", c)


IMG_RE = re.compile(r"\]\((" + re.escape(DOCS_HOST) + r"/[^)\s]+\.(?:png|jpe?g|gif|webp))\)", re.I)


def localize_images(md, out):
    """Baixa as imagens do artigo para _assets/ e reescreve os links como relativos."""
    def repl(m):
        url = m.group(1)
        name = url.rsplit("/", 1)[1]
        dest = out / "_assets" / name
        if not dest.exists():
            dest.parent.mkdir(parents=True, exist_ok=True)
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=30) as r:
                dest.write_bytes(r.read())
        return f"](../_assets/{name})"
    return IMG_RE.sub(repl, md)


LINK_RE = re.compile(r"\]\(" + re.escape(DOCS_HOST) + r"/docs/([\w-]+)(#[\w-]+)?\)")


def first_line(s):
    return (s or "").strip().splitlines()[0].strip() if s else ""


# ---------------------------------------------------------------- main
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=str(Path(__file__).resolve().parent.parent))
    ap.add_argument("--delay", type=float, default=0.3)
    args = ap.parse_args()
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    menu = parse_menu(fetch(INDEX_PATH))
    cats = []
    for it in menu:
        if it["category"] not in cats:
            cats.append(it["category"])
    cat_dir = {c: f"{i:02d}-{slugify(c)}" for i, c in enumerate(cats)}

    local = {it["slug"]: f"{cat_dir[it['category']]}/{it['slug']}.md" for it in menu}
    today = dt.date.today().isoformat()
    catalog, errors = [], []
    for n, it in enumerate(menu, 1):
        src = DOCS_HOST + "/docs/" + it["slug"]
        try:
            md, fields, curls, eps = extract_article(fetch("/docs/" + it["slug"]))
        except Exception as e:  # noqa: BLE001
            errors.append(f"{it['slug']}: {e}")
            print(f"[{n}/{len(menu)}] ERRO {it['slug']}: {e}", file=sys.stderr)
            continue
        endpoint = eps[0]["url"] if eps else ""
        method = first_line(fields.get("Método")).upper()
        auth = first_line(fields.get("Autenticação"))
        rel = local[it["slug"]]
        md = LINK_RE.sub(lambda m: f"](../{local[m.group(1)]}{m.group(2) or ''})"
                         if m.group(1) in local else m.group(0), md)
        md = localize_images(md, out)
        entry = dict(title=it["title"], slug=it["slug"], category=it["category"],
                     plan=it["plan"] or None, kind=it["kind"], method=method or None,
                     endpoint=endpoint or None,
                     path=endpoint.replace(API_BASE, "") if endpoint else None,
                     all_endpoints=eps if len(eps) > 1 else None,
                     auth=auth or None, payload_example=fields.get("Payload"),
                     curl=pretty_curl(curls[-1]) if curls else None, file=rel, source=src)
        catalog.append(entry)

        fm = ["---", f"title: {json.dumps(it['title'], ensure_ascii=False)}",
              f"slug: {it['slug']}", f"category: {json.dumps(it['category'], ensure_ascii=False)}"]
        if it["plan"]:
            fm.append(f"plan: {it['plan']}")
        if method:
            fm.append(f"method: {method}")
        if endpoint:
            fm.append(f"endpoint: {endpoint}")
        fm += [f"source: {src}", f"fetched: {today}", "---", ""]
        head = f"# {it['title']}" + (f"  `{it['plan']}`" if it["plan"] else "") + "\n\n"
        head += f"> Fonte: <{src}> · [Voltar ao índice](../README.md)\n\n"
        p = out / rel
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text("\n".join(fm) + head + md, encoding="utf-8")
        print(f"[{n}/{len(menu)}] {rel}")
        time.sleep(args.delay)

    (out / "endpoints.json").write_text(json.dumps(
        dict(source=DOCS_HOST + INDEX_PATH, api_base=API_BASE, fetched=today,
             auth="Authorization: Bearer {token}", endpoints=catalog),
        ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    write_readme(out, catalog, cats, cat_dir, today)
    if errors:
        print("\nFalhas:\n" + "\n".join(errors), file=sys.stderr)
        sys.exit(1)


def write_readme(out, catalog, cats, cat_dir, today):
    L = ["# Chat Master Veloz — Referência de APIs", "",
         f"Cópia local da documentação oficial <{DOCS_HOST}{INDEX_PATH}>, sincronizada em **{today}**.",
         "Pasta autocontida: pode ser copiada para qualquer projeto.", "",
         "## Essencial", "",
         f"- **Base URL das chamadas:** `{API_BASE}` (todas as rotas ficam em `{API_BASE}/api/...`)",
         "- **Autenticação:** header `Authorization: Bearer {token}` — o token é cadastrado **na conexão** "
         "(cada conexão/número tem o seu).",
         "- **Content-Type:** `application/json` (exceto envios de arquivo via multipart, quando indicado).",
         f"- **Documentação navegável:** `{DOCS_HOST}/docs/...` (o host `api` não serve a documentação).",
         "", "### Etiquetas de plano/conexão", "", "| Etiqueta | Significado |", "|---|---|"]
    L += [f"| `{k}` | {v} |" for k, v in PLANOS.items()]
    L += ["", "> Nem toda chamada existe nas três bibliotecas, e o mesmo recurso pode ter rotas e payloads "
          "diferentes em cada uma. Veja a matriz em [Bibliotecas](00-introducao/bibliotecas.md).", "",
          "## Arquivos", "",
          "- `README.md` — este índice.",
          "- `endpoints.json` — catálogo legível por máquina (método, endpoint, plano, exemplo de payload, cURL, link da fonte).",
          "- `NN-categoria/<slug>.md` — uma página por artigo, com frontmatter YAML.",
          "- `_assets/` — imagens dos artigos (baixadas para uso offline).",
          "- `_tools/sync.py` — regenera tudo a partir do site (`python3 -I _tools/sync.py`).", "",
          "## Observações sobre a fonte", "",
          "- Exceção de rota: `API Deletar TODOS os Contatos` usa `DELETE {base}/contacts-delete` (fora de `/api`), "
          "exatamente como está na documentação oficial.",
          "- Algumas páginas trazem mais de um endpoint (ex.: encerrar tickets por inatividade: conexão atual × todas). "
          "No `endpoints.json` eles aparecem em `all_endpoints`.",
          "- Webhooks não têm endpoint para chamar: são configurados no painel e a plataforma faz POST no seu endereço. "
          "As páginas de webhook descrevem o campo `acao`, que identifica o tipo de evento, e trazem exemplos de payload. "
          "A própria fonte avisa que os payloads mudam entre versões, então valide com eventos reais.",
          "- Os exemplos em PHP da fonte foram substituídos pelo cURL equivalente, que a própria documentação oferece.", "",
          "## Como reutilizar em outro projeto", "",
          "1. Copie a pasta inteira (`chatmasterveloz-api/`) para o outro projeto.",
          "2. Para atualizar: `python3 -I _tools/sync.py` (só biblioteca padrão; reescreve as páginas e o índice).",
          "3. Para geração de código ou validação automática, leia o `endpoints.json`.",
          "4. Se usar Claude Code, aponte no `CLAUDE.md` do projeto: "
          "\"Referência da API Chat Master Veloz em `docs/chatmasterveloz-api/README.md`\".", "",
          "## Índice", ""]
    for c in cats:
        items = [e for e in catalog if e["category"] == c]
        if not items:
            continue
        star = " ⭐ prioritária" if c in PRIORITARIAS else ""
        L += [f"### {c}{star}", "", "| Artigo | Plano | Método | Rota |", "|---|---|---|---|"]
        for e in items:
            rota = f"`{e['path']}`" if e["path"] else "—"
            L.append(f"| [{e['title']}]({e['file']}) | {e['plan'] or '—'} | {e['method'] or '—'} | {rota} |")
        L.append("")
    (out / "README.md").write_text("\n".join(L), encoding="utf-8")


if __name__ == "__main__":
    main()
