// Logica pura das mensagens agendadas (sem rede). Incluida nos Code nodes via {{BV:INCLUDE:shared/mensagens.js}}.
// Contrato: docs/specs/mensagens-agendadas/{research.md D3/D5/D6/D9, data-model.md, contracts/}.
// Datas da Graces: horario local de Sao Paulo, sem offset ("AAAA-MM-DDTHH:mm:ss"). Saida em ISO UTC.
const BV_M_TZ = 'America/Sao_Paulo';

function bvMParseLocal(s) { // "AAAA-MM-DDTHH:mm[:ss]" -> ms "ingenuos" (relogio de parede em UTC)
  const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/.exec(String(s || ''));
  return m ? Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0)) : NaN;
}

function bvMOffsetMs(instante) { // (relogio de parede em SP) - (UTC), em ms, para um instante
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: BV_M_TZ, hourCycle: 'h23', year: 'numeric', month: '2-digit',
    day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(new Date(instante)).map((x) => [x.type, x.value]));
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - Math.floor(instante / 1000) * 1000;
}

function bvMLocalParaInstante(naive) { // relogio de parede em SP -> instante real (duas passadas cobrem a troca de offset)
  const a = naive - bvMOffsetMs(naive);
  return naive - bvMOffsetMs(a);
}

// Confirmacao: confirmacao_hora ("HH:mm") do dia anterior; lembrete: inicio - lembrete_antes_min; pos: fim + pos_depois_min.
// Devolve { programar: [{tipo, previsto_para}], ignorar: [{tipo, motivo: 'ja_passou'}] }; agora = Date|ms|ISO.
function bvMProgramar(ag, agora, cfg) {
  const ini = bvMParseLocal(ag && ag.inicio);
  let fim = bvMParseLocal(ag && ag.fim);
  if (!Number.isFinite(ini)) throw new Error('inicio invalido');
  if (!Number.isFinite(fim) || fim < ini) fim = ini;
  const hm = /^(\d{1,2}):(\d{2})$/.exec(cfg.confirmacao_hora || '18:00');
  const dia = ini - (ini % 86400000); // meia-noite (parede) do dia do inicio
  const alvos = [
    ['confirmacao', dia - 86400000 + (+hm[1] * 60 + +hm[2]) * 60000],
    ['lembrete', ini - cfg.lembrete_antes_min * 60000],
    ['pos_atendimento', fim + cfg.pos_depois_min * 60000],
  ];
  const t0 = new Date(agora).getTime();
  const out = { programar: [], ignorar: [] };
  for (const [tipo, naive] of alvos) {
    const inst = bvMLocalParaInstante(naive);
    if (inst <= t0) out.ignorar.push({ tipo, motivo: 'ja_passou', previsto_para: new Date(inst).toISOString() });
    else out.programar.push({ tipo, previsto_para: new Date(inst).toISOString() });
  }
  return out;
}

const bvMDig = (s) => String(s || '').replace(/\D/g, '');

// m: { texto }; contato: telefone (digitos ou "<id>@lid"); cfg: { wid, botao, topo, titulo_sim, titulo_nao }; id = mensagens_agendadas.id
function bvMLista(m, id, contato, cfg) {
  const number = /@lid$/.test(String(contato)) ? String(contato) : bvMDig(contato);
  return { path: '/api/messages/whatsmeow/sendListPRO', body: { number, openTicket: '1', queueId: '0', whatsappId: cfg.wid,
    body: { Desc: m.texto, ButtonText: cfg.botao, TopText: cfg.topo,
      List: [{ RowId: `bvc:${id}:s`, title: cfg.titulo_sim, desc: '' }, { RowId: `bvc:${id}:n`, title: cfg.titulo_nao, desc: '' }] } } };
}

function bvMTexto(m, contato, cfg) {
  const lid = /@lid$/.test(String(contato));
  return { path: lid ? '/api/messages/whatsmeow/sendTextPROLid' : '/api/messages/send',
    body: { number: lid ? String(contato) : bvMDig(contato), openTicket: '0', queueId: '0', whatsappId: cfg.wid, body: m.texto } };
}

// status HTTP do envio; tentativas = recusas ANTERIORES. 2xx enviada; 0/ausente = incerto (nunca reenvia, SC-007);
// recusa: retentativas_min ([1,5,15]) e depois falhou.
function bvMResultadoEnvio(status, tentativas, cfg, agora) {
  const s = Number(status);
  if (s >= 200 && s < 300) return { situacao: 'enviada' };
  if (!Number.isFinite(s) || s < 100) return { situacao: 'falhou', motivo: 'incerto' };
  const n = (tentativas || 0) + 1, esp = cfg.retentativas_min || [1, 5, 15];
  if (n > esp.length) return { situacao: 'falhou', motivo: 'recusada_canal', tentativas: n };
  return { situacao: 'pendente', tentativas: n, proxima_tentativa_em: new Date(new Date(agora).getTime() + esp[n - 1] * 60000).toISOString() };
}

// Evento do webhook (body). Caminho id (from_internal com selectedRowID, medido na sonda da lista): {origem:'id', mensagem_id,
// confirmado, stanza}; caminho titulo (start, texto exato; fallback): {origem:'titulo', confirmado}. Qualquer outra coisa: null.
// O id so vem da estrutura da lista, nunca do texto do cliente. Idempotencia fica no claim do bv-confirmacao.
function bvMReconhecer(ev, cfg) {
  if (!ev || ev.fromMe === true) return null;
  const msg = ev.mensagem;
  if (ev.acao === 'from_internal' && msg && typeof msg === 'object' && !Array.isArray(msg)) {
    let r;
    try { r = JSON.parse(msg.dataJson).rawData.event.Message.listResponseMessage; } catch (e) { return null; }
    const id = r && r.singleSelectReply && r.singleSelectReply.selectedRowID;
    const m = typeof id === 'string' && /^bvc:(\d{1,15}):(s|n)$/.exec(id);
    if (!m) return null;
    const stanza = r.contextInfo && r.contextInfo.stanzaID;
    return { origem: 'id', mensagem_id: +m[1], confirmado: m[2] === 's', stanza: typeof stanza === 'string' ? stanza : null };
  }
  if (ev.acao === 'start' && Array.isArray(msg) && msg.length === 1 && msg[0] && msg[0].type === 'text' && typeof msg[0].text === 'string') {
    const t = msg[0].text.trim();
    if (t === cfg.titulo_sim) return { origem: 'titulo', confirmado: true };
    if (t === cfg.titulo_nao) return { origem: 'titulo', confirmado: false };
  }
  return null;
}

// agenda: itens de /agenda/completa achatados [{idAgenda,idProfissional,horaInicio,horaFim,idStatusAgenda,ddiCelular,celularCliente,nomeServico,profissional}];
// linhas: mensagens_agendadas [{id,graces_agendamento_id,tipo,situacao,previsto_para,inicio}]; contatos: [{id,telefone}].
// Nao recria o que ja tem linha (enviada/falhou/cancelada) do mesmo idAgenda, tipo e previsto_para.
// Devolve { cancelar:[{id,motivo}], criar:[{...item, contato_id, tipo, previsto_para}], sem_contato:[idAgenda], recorrente:[idAgenda] }.
// shortcut: idAgenda que aparece mais de uma vez na janela (serie recorrente) e pulado e registrado (`recorrente`): a chave unica e
// (idAgenda, tipo) e duas ocorrencias derrubariam o upsert; recorrente com uma so ocorrencia na janela nao e detectavel (a /completa nao
// traz `recorrente`). Upgrade: chave por (idAgenda, inicio) numa migracao.
function bvMReconciliar(agenda, linhas, contatos, agora, cfg) {
  const t0 = new Date(agora).getTime();
  const limite = t0 + (cfg.reconciliacao_dias || 7) * 86400000;
  const out = { cancelar: [], criar: [], sem_contato: [], recorrente: [] };
  const vivos = new Set();
  const cancelados = new Set();
  const iso = (v) => new Date(v).toISOString();
  const vezes = {};
  for (const it of agenda) vezes[it.idAgenda] = (vezes[it.idAgenda] || 0) + 1;
  for (const it of agenda) {
    if (it.idStatusAgenda === 9) continue; // nao compareceu: nada a programar
    vivos.add(it.idAgenda);
    if (vezes[it.idAgenda] > 1) { if (!out.recorrente.includes(it.idAgenda)) out.recorrente.push(it.idAgenda); continue; }
    const tel = bvMDig(it.ddiCelular) + bvMDig(it.celularCliente);
    const c = tel.length > bvMDig(it.ddiCelular).length ? contatos.find((x) => bvMDig(x.telefone) === tel) : null;
    if (!c) { out.sem_contato.push(it.idAgenda); continue; }
    const { programar } = bvMProgramar({ inicio: it.horaInicio, fim: it.horaFim }, agora, cfg);
    for (const p of programar) {
      const meus = linhas.filter((l) => l.graces_agendamento_id === it.idAgenda && l.tipo === p.tipo);
      if (meus.some((l) => l.situacao !== 'pendente' && iso(l.previsto_para) === p.previsto_para)) continue;
      const pend = meus.find((l) => l.situacao === 'pendente');
      if (pend && iso(pend.previsto_para) === p.previsto_para) continue;
      if (pend && !cancelados.has(pend.id)) { cancelados.add(pend.id); out.cancelar.push({ id: pend.id, motivo: 'reagendada' }); }
      out.criar.push({ ...it, contato_id: c.id, tipo: p.tipo, previsto_para: p.previsto_para });
    }
  }
  for (const l of linhas) { // pendente cujo agendamento sumiu da janela: orfa
    if (l.situacao === 'pendente' && !vivos.has(l.graces_agendamento_id) && !cancelados.has(l.id)
        && bvMLocalParaInstante(bvMParseLocal(l.inicio)) <= limite) out.cancelar.push({ id: l.id, motivo: 'orfa' });
  }
  return out;
}

const BV_M_SEMANA = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
function bvMDia(inicio) { // "2026-10-22T14:00:00" -> "quinta-feira (22/10)"
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(inicio || ''));
  return m ? `${BV_M_SEMANA[new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).getUTCDay()]} (${m[3]}/${m[2]})` : '';
}

// Preenche {chave} com os valores; chave desconhecida some (nunca vaza o marcador para o cliente).
const bvMTemplate = (t, v) => String(t || '').replace(/\{(\w+)\}/g, (_, k) => (v[k] === undefined || v[k] === null ? '' : String(v[k])));

function bvMTextoDe(linha, textos) {
  const d = linha.dados || {};
  return bvMTemplate(textos[linha.tipo === 'pos_atendimento' ? 'pos' : linha.tipo], { servico: d.servico, barbeiro: d.barbeiro, dia: bvMDia(linha.inicio), hora: String(linha.inicio || '').slice(11, 16) });
}

// /agenda/completa ([{idProfissional, apelido, agendamentos:[...]}]) -> lista plana; /agenda/agendamentos (ja plana) passa igual.
function bvMAgendaDe(body) {
  if (!Array.isArray(body)) return null;
  const out = [];
  for (const x of body) {
    if (x && Array.isArray(x.agendamentos)) for (const a of x.agendamentos) out.push({ ...a, idProfissional: x.idProfissional, profissional: String(x.apelido || '').trim() });
    else if (x) out.push(x);
  }
  return out;
}

// Ocorrencia de (idAgenda, inicio) na resposta (recorrente: mesmo idAgenda em varias ocorrencias, so a do inicio vale).
const bvMOcorrencia = (lista, idAgenda, inicio) => lista.find((a) => a && a.idAgenda === idAgenda && String(a.horaInicio).slice(0, 16) === String(inicio).slice(0, 16));

// Decide o destino de uma linha reservada: enviar | cancelar(motivo) | adiar (libera a reserva, tenta na proxima varredura).
// resp: { status, body } do GET /agenda/agendamentos do cliente ou da /agenda/completa do dia (linha sem graces_cliente_id); null = nao revalida.
// cfg: { wid, botao, topo, titulo_sim, titulo_nao, textos, teste?: { testeId, escrita: [digitos] } } (teste so no ambiente integracao)
function bvMDecidir(linha, resp, cfg) {
  const tel = String(linha.telefone || '');
  if (cfg.teste) { // trava de TESTE: so o barbeiro de teste e contatos da lista de escrita (FR-012, XIII)
    if (linha.id_profissional !== cfg.teste.testeId) return { acao: 'cancelar', motivo: 'fora_do_teste' };
    if (!cfg.teste.escrita.map(bvMDig).includes(bvMDig(tel))) return { acao: 'cancelar', motivo: 'fora_da_lista' };
  }
  if (linha.handoff_aberto) return { acao: 'adiar' }; // equipe conversando: nao interromper (plan; P2 a medir no smoke)
  if (resp) {
    const lista = resp.status >= 200 && resp.status < 300 ? bvMAgendaDe(resp.body) : null;
    if (!lista) return { acao: 'adiar' };
    const ag = bvMOcorrencia(lista, linha.graces_agendamento_id, linha.inicio);
    if (!ag) return { acao: 'cancelar', motivo: 'orfa' };
    if (linha.tipo === 'confirmacao' && ag.idStatusAgenda !== 2) return { acao: 'cancelar', motivo: `status_${ag.idStatusAgenda}` };
    if (ag.idStatusAgenda === 10) return { acao: 'cancelar', motivo: 'recusada' }; // "Nao vou poder": owner decidiu cancelar lembrete e pos
    if (linha.tipo === 'pos_atendimento' && ag.idStatusAgenda === 9) return { acao: 'cancelar', motivo: 'status_9' };
  }
  const texto = bvMTextoDe(linha, cfg.textos);
  const env = linha.tipo === 'confirmacao' ? bvMLista({ texto }, linha.id, tel, cfg) : bvMTexto({ texto }, tel, cfg);
  return { acao: 'enviar', texto, tipo_msg: linha.tipo === 'confirmacao' ? 'lista' : 'texto', req: env };
}

// ---- bv-confirmacao (contracts/bv-confirmacao.md) ----
// Entrada do sub-workflow: valida o formato (fronteira de confianca; contato_id da ferramenta do agente e injetado pelo workflow).
function bvMConfNormalizar(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const bad = (campo) => ({ ok: false, code: 'entrada_invalida', campo });
  if (!/^\d{1,18}$/.test(String(r.contato_id))) return bad('contato_id');
  if (!['titulo', 'id', 'agente'].includes(r.origem)) return bad('origem');
  if (!(r.confirmado === true || r.confirmado === false || r.confirmado === 'true' || r.confirmado === 'false')) return bad('confirmado');
  const temId = r.mensagem_id !== undefined && r.mensagem_id !== null && r.mensagem_id !== '';
  if (temId && !/^\d{1,15}$/.test(String(r.mensagem_id))) return bad('mensagem_id');
  if (r.origem !== 'titulo' && !temId) return bad('mensagem_id');
  return { ok: true, contato_id: String(r.contato_id), origem: r.origem, confirmado: r.confirmado === true || r.confirmado === 'true', mensagem_id: temId ? String(r.mensagem_id) : null };
}

// rows: confirmacoes do contato [{id, situacao, resposta, motivo, recente, id_profissional, futuro, repetidas, ...}] (so as do proprio contato).
// motivo preenchido numa `enviada` = encerrada (agendamento cancelado/remarcado depois do envio): lista antiga, desatualizada.
// recente = respondida ha pouco (o from_internal do MESMO toque ja chegou): o titulo nunca escolhe outra linha.
// Devolve { acao: 'claim', row } ou { acao: 'fim', code, row? } (code: desatualizada|ambigua|fora_do_teste|repetida).
function bvMConfEscolher(rows, ent, cfg) {
  const ativas = (rows || []).filter((r) => r && r.situacao === 'enviada' && !r.resposta && !r.motivo && r.futuro);
  let row;
  if (ent.mensagem_id) {
    row = (rows || []).find((r) => String(r.id) === String(ent.mensagem_id));
    if (!row) return { acao: 'fim', code: 'desatualizada' };
  } else {
    const gemea = (rows || []).find((r) => r && r.resposta && r.recente);
    if (gemea) return { acao: 'fim', code: 'repetida', row: gemea };
    if (ativas.length > 1) return { acao: 'fim', code: 'ambigua', row: ativas[0] }; // 2+ sem id: pede para escolher (row so da o telefone)
    if (!ativas.length) return { acao: 'fim', code: 'desatualizada' };
    row = ativas[0];
  }
  if (cfg.testeId && row.id_profissional !== cfg.testeId) return { acao: 'fim', code: 'fora_do_teste', row };
  if (row.situacao !== 'enviada' || !row.futuro || row.motivo) return { acao: 'fim', code: 'desatualizada', row };
  if (row.resposta) return { acao: 'fim', code: 'repetida', row };
  return { acao: 'claim', row };
}

// Resposta da Graces ao POST /agenda/confirmacao. tent = tentativa ja feita (0-based). 0/5xx: ate 2 novas chamadas (1 s, 5 s).
// 409 (medido, P1): o agendamento nao esta mais "A confirmar" => `conferir` (GET do agendamento, bvMConfConferir) antes de afirmar.
function bvMConfAvaliar(status, tent, confirmado) {
  const s = Number(status) || 0;
  if (s >= 200 && s < 300) return { code: confirmado ? 'confirmada' : 'recusada' };
  if (s === 409) return { code: 'conferir' };
  if ((s === 0 || s >= 500) && tent < 2) return { code: 'retry', espera_s: [1, 5][tent] };
  return { code: 'falhou', status: s };
}

// Conferencia apos 409: resp = GET /agenda/agendamentos?idCliente ou /agenda/completa do dia; row = {graces_agendamento_id, inicio}.
// Confirmar so vale com status 3; recusar so com 10. Divergente ou ausente = desatualizada; sem resposta valida = falhou.
function bvMConfConferir(resp, row, confirmado) {
  const s = Number(resp && resp.status) || 0;
  const lista = s >= 200 && s < 300 ? bvMAgendaDe(resp.body) : null;
  if (!lista) return { code: 'falhou', status: s };
  const ag = bvMOcorrencia(lista, row.graces_agendamento_id, row.inicio);
  if (ag && ag.idStatusAgenda === (confirmado ? 3 : 10)) return { code: confirmado ? 'confirmada' : 'recusada', status: s };
  return { code: 'desatualizada', status: s };
}

// Corpo do POST /agenda/confirmacao; `data` so para ocorrencia de serie recorrente (dados.recorrente).
const bvMConfReq = (idAgenda, row, confirmado) => ({ idAgenda, confirmado, ...(row && row.dados && row.dados.recorrente ? { data: String(row.inicio).slice(0, 10) } : {}) });

// Rota do texto igual a um titulo da lista (bv-recepcao). e = { abertas, recentes, propostas, ultima_lista }:
// recentes > 0 => o from_internal do mesmo toque ja respondeu: consome (bv-confirmacao devolve repetida, sem texto);
// com confirmacao aberta, sem proposta pendente e com a lista como ultima saida => consome (espera o id); senao vai ao agente.
function bvMTituloRota(e) {
  if (Number(e && e.recentes) > 0) return 'consumir';
  if (Number(e && e.abertas) > 0 && !(Number(e.propostas) > 0) && (e.ultima_lista === true || e.ultima_lista === 'true')) return 'consumir';
  return 'agente';
}

// Linhas do prompt do agente sobre confirmacoes (independem de sessao nova: a confirmacao chega quando o cliente nao fala ha dias).
// A recusa vale por janelaMin a partir de `em` (propria, nao a da conversa). neutro = bvNeutralizar.
function bvMPromptConfirmacoes(ctx, agoraMs, janelaMin, neutro) {
  let s = '';
  const cs = Array.isArray(ctx && ctx.confirmacoes) ? ctx.confirmacoes : [];
  if (cs.length) s += '\nConfirmações de presença abertas, enviadas pela barbearia (dado): ' + cs.map((c) => 'id=' + c.id + ' (' + neutro(c.servico) + ' com ' + neutro(c.barbeiro) + ', ' + bvMDia(c.inicio) + ' às ' + String(c.inicio).slice(11, 16) + ')').join('; ');
  const r = ctx && ctx.pedido && ctx.pedido.confirmacao_recusada;
  const em = r ? Date.parse(r.em) : NaN;
  if (Number.isFinite(em) && agoraMs - em >= 0 && agoraMs - em <= janelaMin * 60000) s += '\nO cliente respondeu que não vai poder comparecer ao agendamento ' + neutro(r.idAgenda) + ' (dado): ofereça remarcar ou cancelar.';
  return s;
}

function bvMConfTexto(code, row, origem, textos, repetidaMax) {
  const r = row || {};
  const v = { dia: bvMDia(r.inicio), hora: String(r.inicio || '').slice(11, 16) };
  if (code === 'confirmada') return bvMTemplate(textos.confirmacao_ok, v);
  if (code === 'recusada') return bvMTemplate(textos.confirmacao_recusada, v);
  if (code === 'desatualizada') return textos.confirmacao_desatualizada;
  if (code === 'falhou') return textos.confirmacao_falhou;
  if (code === 'repetida') return origem === 'titulo' || Number(r.repetidas || 0) >= repetidaMax ? '' : textos.confirmacao_repetida;
  if (code === 'ambigua') return origem === 'titulo' ? textos.confirmacao_escolher || '' : '';
  return ''; // fora_do_teste: sem texto
}

if (typeof module !== 'undefined') module.exports = { bvMProgramar, bvMLista, bvMTexto, bvMResultadoEnvio, bvMReconhecer, bvMReconciliar, bvMLocalParaInstante, bvMDia, bvMTemplate, bvMTextoDe, bvMDecidir, bvMConfNormalizar, bvMConfEscolher, bvMConfAvaliar, bvMConfTexto,
  bvMAgendaDe, bvMConfConferir, bvMConfReq, bvMTituloRota, bvMPromptConfirmacoes };
