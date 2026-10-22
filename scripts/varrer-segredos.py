"""Varre os arquivos versionados (git ls-files) atras de segredos. Exit 1 com achados `arquivo:linha`, sem o valor.
Uso (da raiz): python3 -I scripts/varrer-segredos.py"""
import re
import subprocess
import sys

PADROES = {
    "chave privada": re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----"),
    "chave sk-": re.compile(r"\bsk-[A-Za-z0-9_-]{20,}"),
    "JWT": re.compile(r"\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}"),
    "Bearer literal": re.compile(r"Bearer\s+[A-Za-z0-9._~+/=-]{24,}"),
    "atribuicao de segredo": re.compile(
        r"(?i)(password|senha|secret|token|api[_-]?key)\w*\s*[=:]\s*['\"]?[A-Za-z0-9+/_-]{20,}"),
}


def varrer(arquivos):
    achados = []
    for arq in arquivos:
        try:
            with open(arq, encoding="utf-8") as f:
                linhas = f.read().splitlines()
        except (UnicodeDecodeError, OSError):
            continue
        for n, l in enumerate(linhas, 1):
            for nome, rx in PADROES.items():
                if rx.search(l):
                    achados.append(f"{arq}:{n}: possivel {nome}")
    return achados


def main():
    arquivos = subprocess.run(["git", "ls-files"], capture_output=True, text=True, check=True).stdout.split("\n")
    achados = varrer([a for a in arquivos if a])
    for a in achados:
        print(a)
    print(f"varrer-segredos: {len(achados)} achado(s)")
    return 1 if achados else 0


if __name__ == "__main__":
    sys.exit(main())
