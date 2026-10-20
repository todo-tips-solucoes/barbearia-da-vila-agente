"""Smoke das mensagens agendadas no TESTE (docs/specs/mensagens-agendadas/quickstart.md). So contatos SIMULADOS +5500000000xxx (n < 520, como o
smoke-agente): nenhum envio real ao Chat Master (a varredura cancela contato fora de teste.contatos_escrita e o bv-confirmacao so grava a saida).
Escreve na Graces so no barbeiro de teste e com o cliente de teste autorizado; o finally cancela o que criou e apaga os contatos simulados.
O que exige o numero do owner (envio real da lista, retentativa por falha do canal, handoff aberto x envio P2) fica na FASE 6, com o pai.
Uso: python3 -I scripts/smoke-mensagens.py [m1 m2 m3 m4 m6 ...] | --limpar        (m6 espera a reconciliacao: ~16 min; so por nome)
  m1 travas da varredura (fora_da_lista, fora_do_teste, ja_passou, reserva vencida = incerto)
  m2 selecao por id: confirma na Graces (status 3), repetir e idempotente
  m3 selecao por titulo (fallback): "Não vou poder" -> status 10 + conversas.pedido.confirmacao_recusada
  m4 desatualizada e fora do teste: sem Graces
  m6 reconciliacao: agendamento da Graces sem contato -> uma falha `sem_contato` por idAgenda. Limite: com teste.contatos_escrita vazio
     (exigido aqui) o Ler estado nao acha contato nenhum, entao so o caminho sem_contato e exercitado; criar/cancelar da reconciliacao
     ficam nos testes de unidade (bvMReconciliar) e no E2E da FASE 6 com o numero do owner.
Segredos de .env.smoke/.env.n8n (nunca impressos). Exit 1 se algum cenario falhar."""
import importlib.util
import json
import os
import sys
import time
import uuid

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(RAIZ, "scripts"))
_s = importlib.util.spec_from_file_location("smoke_agente", os.path.join(RAIZ, "scripts", "smoke-agente.py"))
sa = importlib.util.module_from_spec(_s)
_s.loader.exec_module(sa)  # reusa sql/post/graces/evento do smoke do agente (o main dele nao roda ao importar)

CFG, M = sa.CFG, sa.CFG["mensagens"]
TESTE_ID = sa.TESTE_ID
checar = sa.checar
_agendas, _contatos = [], []


def contato(n):
    t = sa.tel(n)
    if n >= 520:
        raise SystemExit("smoke-mensagens: contato simulado exige n < 520")
    sa.sql(f"INSERT INTO contatos (telefone) VALUES ('{t}') ON CONFLICT (telefone) DO NOTHING;")
    _contatos.append(t)
    return int(sa.sql(f"SELECT id FROM contatos WHERE telefone='{t}';"))


def esperar(sql_cond, limite_s, passo=5):
    fim = time.time() + limite_s
    while time.time() < fim:
        r = sa.sql(sql_cond)
        if r and r != "0":
            return r
        time.sleep(passo)
    return ""


def linha(cid, tipo="lembrete", **o):
    """Insere uma mensagens_agendadas. o: situacao, previsto ('now() - interval ...'), prof, ag, cliente, inicio, extra (SQL de colunas)."""
    ag = o.get("ag", f"smoke-{uuid.uuid4().hex[:10]}")
    sit = o.get("situacao", "pendente")
    env = "now()" if sit == "enviada" else "NULL"
    q = (f"INSERT INTO mensagens_agendadas (contato_id, tipo, previsto_para, graces_agendamento_id, situacao, graces_cliente_id, id_profissional, inicio, dados, enviada_em, reservada_em) "
         f"VALUES ({cid}, '{tipo}', {o.get('previsto', 'now()')}, '{ag}', '{sit}', {repr(o['cliente']) if o.get('cliente') else 'NULL'}, '{o.get('prof', TESTE_ID)}', "
         f"{repr(o['inicio']) if o.get('inicio') else '(now() AT TIME ZONE ' + chr(39) + 'America/Sao_Paulo' + chr(39) + ') + interval ' + chr(39) + '1 day' + chr(39)}, "
         f"'{{\"servico\":\"Corte\",\"barbeiro\":\"Teste\",\"fim\":\"\"}}', {env}, {o.get('reservada', 'NULL')}) RETURNING id;")
    return int(sa.sql(q).split()[0]), ag


def estado_linha(i):
    return sa.sql(f"SELECT situacao || '/' || COALESCE(motivo,'') || '/' || COALESCE(resposta,'') FROM mensagens_agendadas WHERE id={i};")


def agenda_teste(hora_idx=0):
    """Agendamento real do cliente de teste no barbeiro de teste (nasce status 2, medido P1). Devolve (idAgenda, 'AAAA-MM-DDTHH:mm:ss')."""
    sv = next(x for x in sa.graces_get("/agenda/servicos?texto=corte") if x.get("ativo", True) and "adulto" in x["descricaoAgenda"].lower() and not sa._seg_vez(x["descricaoAgenda"]))
    for dia in sa.dias(10)[1:]:
        hs = sa.grade(sv["idServico"], TESTE_ID, dia).get("horarios", [])
        if len(hs) > hora_idx:
            r = sa.graces_post("/agenda", {"idCliente": sa.PAULO, "idServico": sv["idServico"], "idProfissional": TESTE_ID, "data": dia, "horaInicio": hs[hora_idx]})
            if isinstance(r, dict) and r.get("idAgenda"):
                _agendas.append(r["idAgenda"])
                return r["idAgenda"], f"{dia}T{hs[hora_idx]}:00"
    raise SystemExit("sem horario livre do barbeiro de teste nos proximos dias")


def status_graces(ag):
    for a in sa.graces_get(f"/agenda/agendamentos?idCliente={sa.PAULO}&proximos=true"):
        if a["idAgenda"] == ag:
            return a["idStatusAgenda"]
    return None


def evento_lista(n, rowid, titulo="Confirmo"):
    b = json.load(open(os.path.join(RAIZ, "tests", "fixtures", "chatmaster", "evento-25.json"), encoding="utf-8"))["body"]
    dj = {"rawData": {"event": {"Message": {"listResponseMessage": {"title": titulo, "listType": 1, "singleSelectReply": {"selectedRowID": rowid}, "contextInfo": {"stanzaID": "SMOKE"}}}}}}
    b.update(acao="from_internal", fromMe=False, sender=sa.tel(n), token_origin=sa.TOKEN, mensagem={"body": titulo, "dataJson": json.dumps(dj)})
    return b


def confirmacao_aberta(n, **o):
    cid = contato(n)
    ag, ini = agenda_teste(o.pop("idx", 0))
    i, _ = linha(cid, "confirmacao", situacao="enviada", ag=ag, cliente=sa.PAULO, inicio=ini, **o)
    # a lista como ultima saida (como o Gravar resultado grava): sem ela o titulo vai ao agente (revisao, item 5)
    sa.sql(f"INSERT INTO mensagens (contato_id, mensagem_id_canal, direcao, tipo, conteudo) VALUES ({cid}, 'agendada-{i}', 'saida', 'lista', 'smoke');")
    return cid, i, ag


def m1():
    print("M1 travas da varredura (sem envio real)")
    cid = contato(505)
    atraso, reserva = M["atraso_max_min"], M["reserva_s"]
    a, _ = linha(cid, previsto="now() - interval '1 minute'")
    b, _ = linha(cid, previsto=f"now() - interval '{atraso + 5} minutes'")
    c, _ = linha(cid, previsto="now() - interval '2 minutes'", reservada=f"now() - interval '{reserva + 30} seconds'")
    d, _ = linha(cid, previsto="now() - interval '1 minute'", prof="outro-profissional")
    esperar(f"SELECT (count(*) = 4)::int FROM mensagens_agendadas WHERE id IN ({a},{b},{c},{d}) AND situacao <> 'pendente'", M["varredura_s"] * 3 + 30)  # as 4, nao a primeira
    checar("contato fora de teste.contatos_escrita: cancelada/fora_da_lista (nada enviado)", estado_linha(a) == "cancelada/fora_da_lista/", estado_linha(a))
    checar("passou da tolerancia: cancelada/ja_passou", estado_linha(b) == "cancelada/ja_passou/", estado_linha(b))
    checar("reserva vencida: falhou/incerto, sem reenvio", estado_linha(c) == "falhou/incerto/", estado_linha(c))
    checar("barbeiro que nao e o de teste: cancelada/fora_do_teste", estado_linha(d) == "cancelada/fora_do_teste/", estado_linha(d))
    checar("falha de reserva vencida registrada sem PII", sa.sql(f"SELECT count(*) FROM falhas_agente WHERE contato_id={cid} AND motivo='mensagem|envio_incerto' AND code='RESERVA_VENCIDA';") == "1")


def m2():
    print("M2 selecao por id: confirma na Graces e a repeticao e idempotente")
    cid, i, ag = confirmacao_aberta(506)
    checar("agendamento nasce A confirmar (status 2)", status_graces(ag) == 2, str(status_graces(ag)))
    sa.post(evento_lista(506, f"bvc:{i}:s"))
    checar("resposta gravada", esperar(f"SELECT count(*) FROM mensagens_agendadas WHERE id={i} AND resposta='confirmada'", 40) == "1", estado_linha(i))
    checar("Graces confirmou (status 3)", status_graces(ag) == 3, str(status_graces(ag)))
    checar("resposta ao cliente gravada (saida)", sa.sql(f"SELECT count(*) FROM mensagens WHERE contato_id={cid} AND mensagem_id_canal LIKE 'conf-confirmada-%';") == "1")
    sa.post(evento_lista(506, f"bvc:{i}:s"))  # reenvio: evento identico
    time.sleep(25)
    checar("repeticao: resposta e status inalterados", estado_linha(i) == "enviada//confirmada" and status_graces(ag) == 3, f"{estado_linha(i)} {status_graces(ag)}")
    checar("repeticao: no maximo um texto de repetida", int(sa.sql(f"SELECT count(*) FROM mensagens WHERE contato_id={cid} AND mensagem_id_canal LIKE 'conf-repetida-%';")) <= 1)
    checar("id de outro formato e ignorado (nenhuma resposta nova)", sa.post(evento_lista(506, "bv_conf_teste_sim"))[0] == 200)


def m3():
    print("M3 selecao por titulo (fallback): Nao vou poder")
    cid, i, ag = confirmacao_aberta(507)
    sa.post(sa.evento(507, M["titulo_nao"]))
    checar("recusada gravada (espera do id + chamada)", esperar(f"SELECT count(*) FROM mensagens_agendadas WHERE id={i} AND resposta='recusada'", M["espera_texto_s"] + 60) == "1", estado_linha(i))
    checar("Graces registrou recusa (status 10)", status_graces(ag) == 10, str(status_graces(ag)))
    checar("conversas.pedido.confirmacao_recusada gravado para o agente", sa.sql(f"SELECT count(*) FROM conversas WHERE contato_id={cid} AND pedido ? 'confirmacao_recusada';") == "1")
    checar("o titulo nao virou turno do agente", sa.sql(f"SELECT count(*) FROM mensagens WHERE contato_id={cid} AND direcao='entrada';") == "0")


def m4():
    print("M4 desatualizada e fora do teste: sem Graces")
    cid = contato(508)
    a, _ = linha(cid, "confirmacao", situacao="cancelada")
    b, _ = linha(cid, "confirmacao", situacao="enviada", prof="outro-profissional")
    sa.post(evento_lista(508, f"bvc:{a}:s"))
    sa.post(evento_lista(508, f"bvc:{b}:s"))
    time.sleep(30)
    checar("cancelada: sem resposta, texto de desatualizada gravado", estado_linha(a) == "cancelada//" and sa.sql(f"SELECT count(*) FROM mensagens WHERE contato_id={cid} AND mensagem_id_canal LIKE 'conf-desatualizada-%';") == "1")
    checar("outro profissional: sem claim e falha fora_do_teste registrada", estado_linha(b) == "enviada//" and sa.sql(f"SELECT count(*) FROM falhas_agente WHERE contato_id={cid} AND motivo='mensagem|fora_do_teste';") == "1", estado_linha(b))


def m6():
    print(f"M6 reconciliacao: ~{M['reconciliacao_min'] + 2} min")
    ag, _ = agenda_teste(2)
    code = f"sem_contato:{ag}"
    checar("sem contato: exatamente uma falha por idAgenda", esperar(f"SELECT count(*) FROM falhas_agente WHERE code='{code}'", M["reconciliacao_min"] * 60 + 120, 20) == "1")


def encerrar():
    for a in _agendas:
        sa._del(a)
    for t in _contatos:
        sa.sql(f"DELETE FROM contatos WHERE telefone='{t}';")  # cascade: mensagens, mensagens_agendadas, conversas, falhas
    # so as falhas dos agendamentos deste smoke (nunca as sem_contato reais do dia); --limpar sem _agendas nao apaga nenhuma
    codes = ",".join(f"'sem_contato:{a}'" for a in _agendas if all(ch.isalnum() or ch == "-" for ch in a))
    if codes:
        sa.sql(f"DELETE FROM falhas_agente WHERE code IN ({codes}) AND contato_id IS NULL;")


CENARIOS = dict(m1=m1, m2=m2, m3=m3, m4=m4, m6=m6)

if __name__ == "__main__":
    sa._env(".env.smoke", ".env.n8n")
    sa.TOKEN = os.environ.get("CHATMASTER_TOKEN_TESTE", "")
    arg = sys.argv[1:]
    if arg == ["--limpar"]:
        encerrar()
        sys.exit(0)
    nomes = arg or [k for k in CENARIOS if k != "m6"]
    if not sa.TOKEN or any(n not in CENARIOS for n in nomes):
        sys.exit("CHATMASTER_TOKEN_TESTE ausente ou cenario desconhecido")
    if CFG["teste"]["contatos_escrita"] or not CFG["workflows"].get("bv-mensagens") or not CFG["workflows_sub"].get("bv_confirmacao"):
        sys.exit("smoke-mensagens: exige teste.contatos_escrita vazio e bv-mensagens/bv_confirmacao implantados (ids no config)")
    try:
        for n in nomes:
            CENARIOS[n]()
    finally:
        encerrar()
    print("FALHAS:", sa._falhas or "nenhuma")
    sys.exit(1 if sa._falhas else 0)
