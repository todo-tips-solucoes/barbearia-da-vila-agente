#!/usr/bin/env python3
"""Aponta o webhook da conexao de PROD (chatmaster.whatsapp_id do producao.json) para a recepcao de PROD e manda uma
mensagem de teste ao owner (alerta.contato) por ela, na fila do agente. So o owner roda (trava de PROD).

Uso: BV_DEPLOY_PRODUCAO_AUTORIZADO=sim python3 -I scripts/virar-conexao-prod.py [--sem-teste]
O token da conta da conexao de PROD vem do .env.smoke (variavel do Chat Master de producao; owner, 2026-11-15) e nunca e impresso.
Recusa se a conexao nao estiver CONNECTED: sem isso o WhatsApp nao entrega nada.
"""
import json
import os
import sys
import urllib.error
import urllib.request

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CM = "https://api.chatmasterveloz.com"


def env_smoke():
    d = {}
    for linha in open(os.path.join(RAIZ, ".env.smoke"), encoding="utf-8"):
        if "=" in linha and not linha.startswith("#"):
            k, v = linha.strip().split("=", 1)
            d[k] = v.strip().strip('"').strip("'")
    return d


def cm(tok, rota, corpo):
    req = urllib.request.Request(CM + rota, method="POST", data=json.dumps(corpo).encode(),
                                 headers={"Authorization": f"Bearer {tok}", "Content-Type": "application/json", "User-Agent": "bv-virar-conexao/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            t = r.read().decode()
            return json.loads(t) if t else {}
    except urllib.error.HTTPError as e:  # sem corpo: pode conter dado sensivel
        raise SystemExit(f"{rota} -> HTTP {e.code}") from None


def conexao(tok, wid):
    return next((w for w in cm(tok, "/api/whatsapp-status", {}).get("whatsapps", []) if str(w.get("id")) == str(wid)), None)


def main():
    if os.environ.get("BV_DEPLOY_PRODUCAO_AUTORIZADO") != "sim":
        print("recusado: exige BV_DEPLOY_PRODUCAO_AUTORIZADO=sim (so o owner).", file=sys.stderr)
        return 2
    cfg = json.load(open(os.path.join(RAIZ, "config", "ambientes", "producao.json"), encoding="utf-8"))
    tok = env_smoke().get("CHATMASTER_TOKEN_PRODUCAO", "")
    if not tok:
        print("recusado: CHATMASTER_TOKEN_PRODUCAO ausente no .env.smoke.", file=sys.stderr)
        return 2
    wid = str(cfg["chatmaster"]["whatsapp_id"])
    url = f"{cfg['n8n_url'].rstrip('/')}/webhook/{cfg['webhook']['path']}"
    c = conexao(tok, wid)
    if not c:
        print(f"recusado: conexao {wid} nao existe nesta conta.", file=sys.stderr)
        return 1
    if c.get("status") != "CONNECTED":
        print(f"recusado: conexao {wid} com status {c.get('status')}; leia o QR Code no Chat Master e rode de novo.", file=sys.stderr)
        return 1
    cm(tok, "/api/whatsapp/update", {"whatsappId": int(wid), "webhook": url})
    c = conexao(tok, wid)
    if not c or c.get("webhook") != url:
        print(f"falhou: o webhook da conexao {wid} nao ficou na recepcao de PROD.", file=sys.stderr)
        return 1
    print(f"webhook da conexao {wid} -> recepcao de PROD (conferido)")
    if "--sem-teste" not in sys.argv:
        cm(tok, "/api/messages/send", {"number": cfg["alerta"]["contato"], "openTicket": "0", "queueId": str(cfg["chatmaster"]["queue_id"]),
                                       "whatsappId": wid, "body": f"Teste da conexão {wid}: o agente da Barbearia da Vila está respondendo por aqui."})
        print("mensagem de teste enviada ao owner")
    return 0


if __name__ == "__main__":
    sys.exit(main())
