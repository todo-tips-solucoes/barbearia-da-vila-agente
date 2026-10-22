#!/usr/bin/env python3
"""Manda ao WhatsApp do owner (alerta.contato de PROD) o texto lido do stdin, pela conexao 145.

Uso: python3 -I scripts/avisar-owner.py < texto.txt
So o numero fixo da config; nunca outro destino. O token vem do .env.smoke (capturar-webhook.carregar_env), nunca impresso.
"""
import importlib.util
import json
import os
import sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_spec = importlib.util.spec_from_file_location("cw", os.path.join(RAIZ, "scripts", "capturar-webhook.py"))
cw = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(cw)


def corpo(texto, cfg):
    return {"number": cfg["alerta"]["contato"], "openTicket": "0", "queueId": "0",
            "whatsappId": str(cfg["chatmaster"]["whatsapp_id"]), "body": texto}


def main():
    texto = sys.stdin.read().strip()
    if not texto or len(texto) > 4000:
        print("recusado: texto vazio ou acima de 4000 caracteres", file=sys.stderr)
        return 2
    cfg = json.load(open(os.path.join(RAIZ, "config", "ambientes", "producao.json"), encoding="utf-8"))
    cw.carregar_env(RAIZ)
    tok = os.environ.get("CHATMASTER_TOKEN_TESTE", "")  # mesma conexao 145 (owner, 2026-10-21)
    try:
        cw.http("POST", cw.CM + "/api/messages/send", {"Authorization": f"Bearer {tok}"}, corpo(texto, cfg))
    except cw.Falha as e:
        print(str(e), file=sys.stderr)
        return 1
    print("enviado ao owner")
    return 0


if __name__ == "__main__":
    sys.exit(main())
