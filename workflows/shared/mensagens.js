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
  // Lembretes no Chat Master (owner, 2026-11-15): mensagens.lembretes = [{tipo, antes_min}] substitui confirmacao/lembrete/pos
  const alvos = Array.isArray(cfg.lembretes) ? cfg.lembretes.map((l) => [l.tipo, ini - Number(l.antes_min) * 60000]) : [
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

// Lista da conexao Pro, montada num lugar so (agente, confirmacao de presenca e decisao). contato: telefone (digitos ou "<id>@lid");
// itens: [{ id, rotulo }]; cfg: { wid, fila, botao, topo }. openTicket '0', como o texto: com '1' e o setor do agente, a lista tirava
// do setor humano um chamado em atendimento e o punha em "Aguardando" no setor do agente (medido no TESTE em 23/11); com '0' o
// chamado fica como esta e a mensagem e entregue e registrada do mesmo jeito.
function bvMListaDe(texto, itens, contato, cfg) {
  const number = /@lid$/.test(String(contato)) ? String(contato) : bvMDig(contato);
  return { path: '/api/messages/whatsmeow/sendListPRO', body: { number, openTicket: '0', queueId: cfg.fila || '0', whatsappId: cfg.wid,
    body: { Desc: texto, ButtonText: cfg.botao, TopText: cfg.topo, List: (itens || []).map((o) => ({ RowId: o.id, title: o.rotulo, desc: '' })) } } };
}

// Confirmacao de presenca: cfg tambem traz { titulo_sim, titulo_nao }; id = mensagens_agendadas.id
function bvMLista(m, id, contato, cfg) {
  return bvMListaDe(m.texto, [{ id: `bvc:${id}:s`, rotulo: cfg.titulo_sim }, { id: `bvc:${id}:n`, rotulo: cfg.titulo_nao }], contato, cfg);
}

// Recusa de presenca (owner, 18/11): "remarcar ou cancelar?" vai em lista, com uma confirmacao de cancelamento pendente por tras.
// O toque volta ao agente como texto ("Remarcar" / "Cancelar mesmo") e os ids sao os da oferta gravada na conversa.
const BVM_DECISAO = [{ id: '1', rotulo: 'Remarcar', valor: 'remarcar' }, { id: '2', rotulo: 'Cancelar mesmo', valor: 'cancelar' }];
function bvMListaDecisao(m, contato, cfg) {
  return bvMListaDe(m.texto, BVM_DECISAO, contato, cfg);
}
// Estado que a recusa deixa na conversa: a oferta (decisao) e a proposta de cancelar, no mesmo formato da fase 1 de `cancelar`.
function bvMDecisaoCancelar(row, idAgenda) {
  const r = row || {}, d = r.dados || {};
  if (!idAgenda || !r.inicio) return null;
  const servico = String(d.servico || 'horário');
  const resumo = `Cancelar ${servico} em ${bvMDia(r.inicio)} às ${String(r.inicio).slice(11, 16)}`;
  return { dados: { idAgenda, horaInicio: String(r.inicio), recorrente: !!d.recorrente, servico, resumo }, opcoes: { tipo: 'decisao_cancelamento', itens: BVM_DECISAO } };
}
function bvMTexto(m, contato, cfg) {
  const lid = /@lid$/.test(String(contato));
  return { path: lid ? '/api/messages/whatsmeow/sendTextPROLid' : '/api/messages/send',
    body: { number: lid ? String(contato) : bvMDig(contato), openTicket: '0', queueId: cfg.fila || '0', whatsappId: cfg.wid, body: m.texto } };
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
    // dataJson chega codificado DUAS vezes (texto JSON dentro de texto JSON, medido no E2E): decodifica ate virar objeto
    try { let d = msg.dataJson; for (let k = 0; k < 3 && typeof d === 'string'; k++) d = JSON.parse(d); r = d.rawData.event.Message.listResponseMessage; } catch (e) { return null; }
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

// Nome como se escreve (owner, 2026-11-15): "GABRIEL" ou "gabriel" vira "Gabriel"; grafia mista ("McDonald") fica como veio.
function bvMNomeProprio(t) {
  return String(t == null ? '' : t).trim().split(/\s+/).filter(Boolean).map((w) => {
    const lw = w.toLocaleLowerCase('pt-BR');
    return w === lw || w === w.toLocaleUpperCase('pt-BR') ? lw.charAt(0).toLocaleUpperCase('pt-BR') + lw.slice(1) : w;
  }).join(' ');
}

// Um lembrete so para quem tem mais de um servico no mesmo dia (owner, 2026-11-16). linha.grupo = [{id, servico, barbeiro}] na ordem do
// horario, vindo da consulta: a primeira e a lider (manda o lembrete, citando todos) e as outras sao seguidoras (nao mandam).
const bvMGrupo = (l) => (Array.isArray(l.grupo) && l.grupo.length > 1 && l.grupo.some((x) => String(x.id) === String(l.id)) ? l.grupo : null);
const bvMSeguidora = (l) => { const g = bvMGrupo(l); return !!g && String(g[0].id) !== String(l.id); };
// "corte adulto e barba design" com o mesmo barbeiro; barbeiros diferentes: "corte adulto com Kiel e barba design" + barbeiro do ultimo
function bvMServicos(linha) {
  const d = linha.dados || {}, g = bvMGrupo(linha);
  if (!g || bvMSeguidora(linha)) return { servico: d.servico, barbeiro: d.barbeiro };
  const e = (xs) => (xs.length > 1 ? xs.slice(0, -1).join(', ') + ' e ' + xs[xs.length - 1] : xs[0]);
  const bs = g.map((x) => String(x.barbeiro || '').trim());
  if (bs.every((b) => b === bs[0])) return { servico: e(g.map((x) => x.servico)), barbeiro: bs[0] };
  return { servico: e(g.map((x, k) => (k < g.length - 1 && bs[k] ? `${x.servico} com ${bs[k]}` : x.servico))), barbeiro: bs[bs.length - 1] };
}

function bvMTextoDe(linha, textos) {
  const d = linha.dados || {};
  const nome = bvMNomeProprio(String(d.nome || '').trim().split(/\s+/)[0]);
  return bvMTemplate(textos[linha.tipo === 'pos_atendimento' ? 'pos' : linha.tipo], { nome, ...bvMServicos(linha), dia: bvMDia(linha.inicio), hora: String(linha.inicio || '').slice(11, 16) })
    .replace(/,\s*!/g, '!'); // sem nome: "Oi, !" vira "Oi!"
}

// Retomada de agendamento abandonado (owner, 2026-11-16; roadmap feature 9). linha: { contato_id, telefone, nome, servico, proposta:
// { acao, dados } | null }; cfg: { wid, fila, textos: { retomada_confirmar, retomada_continuar } }. Com proposta pendente lembra o
// resumo; sem ela, convida a continuar. Devolve { texto, req } (req no formato do envio de texto do Chat Master).
function bvMRetomada(linha, cfg) {
  const dia = (d) => (/^\d{4}-\d{2}-\d{2}/.test(String(d)) ? `${String(d).slice(8, 10)}/${String(d).slice(5, 7)}` : '');
  const um = (x) => `${x.servico || 'seu horário'}${x.barbeiro ? ` com ${x.barbeiro}` : ''}${x.data ? ` em ${dia(x.data)}` : ''}${x.hora ? ` às ${x.hora}` : ''}`;
  const p = linha.proposta, d = (p && p.dados) || {};
  let resumo = '';
  if (p && Array.isArray(d.itens) && d.itens.length) resumo = d.itens.map(um).join(' + ');
  else if (p && p.acao === 'reagendar') resumo = `a remarcação do seu ${um(d)}`;
  else if (p && d.servico) resumo = `o seu ${um(d)}`;
  const nome = bvMNomeProprio(String(linha.nome || '').trim().split(/\s+/)[0]);
  const texto = bvMTemplate(resumo ? cfg.textos.retomada_confirmar : cfg.textos.retomada_continuar, { nome, resumo, servico: linha.servico ? `o seu ${linha.servico}` : 'o seu horário' })
    .replace(/,\s*!/g, '!');
  return { texto, req: bvMTexto({ texto }, linha.telefone, cfg) };
}

// Instante ISO -> relogio de parede de Sao Paulo "AAAA-MM-DD<sep>HH:mm" (o Chat Master le sendAt no fuso da empresa; medido 2026-11-15)
function bvMLocal(iso, sep) {
  const t = new Date(iso).getTime();
  return new Date(t + bvMOffsetMs(t)).toISOString().slice(0, 16).replace('T', sep);
}

// Sincronizacao com o modulo de Agendamentos do Chat Master (owner, 2026-11-15). A tabela mensagens_agendadas segue a fonte unica;
// o Chat Master e espelho visual e quem envia. So ha chamada quando algo difere (cria, atualiza horario/texto, apaga).
// linhas: [{id, tipo, situacao, previsto_para (ISO), inicio, dados, canal_id, canal_previsto_para, canal_texto, contato_id, telefone,
// contato_canal_id (null = nao buscado, 0 = nao existe no Chat Master)}]. Devolve uma acao por linha; contato e buscado/criado uma vez por rodada.
function bvMSincPlano(linhas, agora, cfg) {
  const t0 = new Date(agora).getTime(), folga = (cfg.antecedencia_min_s || 120) * 1000;
  const contatoFeito = new Set();
  return (Array.isArray(linhas) ? linhas : []).map((l) => {
    const base = { id: l.id, contato_id: l.contato_id };
    const futuro = new Date(l.previsto_para).getTime() > t0 + folga;
    // Etiqueta da confirmacao (owner, 2026-11-15): resposta ao lembrete de 24 h -> Confirmado/Cancelado no ticket; tira no horario marcado
    const etq = l.etiqueta_id === null || l.etiqueta_id === undefined || l.etiqueta_id === '' ? null : Number(l.etiqueta_id);
    const horario = bvMLocalParaInstante(bvMParseLocal(l.inicio));
    if (etq > 0 && !l.etiqueta_removida_em && horario <= t0) {
      return { ...base, acao: 'desetiquetar', req: { m: 'DELETE', path: `/api/tickets/${encodeURIComponent(String(l.etiqueta_ticket_id))}/tags`, body: { tags: [etq] } } };
    }
    if (l.tipo === 'lembrete_dia' && l.resposta && etq === null) {
      const tag = Number(((cfg.etiquetas || {})[l.resposta === 'confirmada' ? 'confirmado' : 'cancelado']) || 0);
      const tick = Number(l.ticket_id || 0);
      if (!tag || !tick || horario <= t0) return { ...base, acao: 'sem_etiqueta' };
      return { ...base, acao: 'etiquetar', etiqueta_id: tag, etiqueta_ticket_id: tick, req: { m: 'POST', path: `/api/tickets/${tick}/tags`, body: { tags: [tag] } } };
    }
    if (l.situacao !== 'pendente') { // cancelada/falhou com agendamento no Chat Master
      if (!l.canal_id) return { ...base, acao: 'nada' };
      return futuro ? { ...base, acao: 'apagar', req: { m: 'POST', path: '/api/schedules/delete', body: { scheduleId: String(l.canal_id) } } } : { ...base, acao: 'liberar' };
    }
    // Seguidora de um grupo (bvMGrupo): a lider manda um lembrete so. Se ja tinha agendamento no Chat Master, apaga; depois fica
    // parada e e reavaliada (a lider pode ser cancelada e ela virar lider); no horario dela, encerra como `junto`.
    if (bvMSeguidora(l) && futuro && l.canal_id) return { ...base, acao: 'apagar', req: { m: 'POST', path: '/api/schedules/delete', body: { scheduleId: String(l.canal_id) } } };
    if (bvMSeguidora(l) && !l.canal_id) return { ...base, acao: 'junto', fim: !futuro, previsto_para: l.previsto_para };
    const texto = bvMTextoDe(l, cfg.textos);
    if (l.canal_id) {
      if (new Date(l.previsto_para).getTime() <= t0) return { ...base, acao: 'enviada' };
      const mesmo = l.canal_previsto_para && new Date(l.canal_previsto_para).getTime() === new Date(l.previsto_para).getTime() && l.canal_texto === texto;
      if (mesmo) return { ...base, acao: 'nada' };
      return { ...base, acao: 'atualizar', texto, previsto_para: l.previsto_para, req: { m: 'PUT', path: `/api/schedules/${encodeURIComponent(String(l.canal_id))}`, body: { body: texto, sendAt: bvMLocal(l.previsto_para, ' ') } } };
    }
    if (!futuro) return { ...base, acao: 'ja_passou' };
    // bigint do Postgres chega ao Code node como TEXTO ('0', '138449'): sem converter, '0' === 0 falhava e o contato inexistente
    // voltava a ser buscado a cada rodada, sem falha registrada, travando a fila em PROD (2026-11-15)
    const num0 = (x) => (x === null || x === undefined || x === '' ? null : Number(x));
    const cid = num0(l.contato_canal_id), tk = num0(l.ticket_id), encerrar = l.ticket_encerrar === true || l.ticket_encerrar === 'true';
    const num = /@lid$/.test(String(l.telefone)) ? '' : bvMDig(l.telefone);
    // Contato sem ticket na conexao (cliente do balcao): o owner pediu um ticket atrelado antes do lembrete e que se verifique antes
    // se ja existe ticket nesta conexao (2026-11-15). ticket_id null = nao verificado; 0 = verificado e sem ticket -> cria.
    // Ticket que o proprio sincronizador criou: encerra antes do lembrete (owner, 2026-11-15); ticket que ja existia nao e tocado
    if (cid > 0 && tk > 0 && encerrar) {
      if (contatoFeito.has(l.contato_id)) return { ...base, acao: 'aguardar_contato' };
      contatoFeito.add(l.contato_id);
      return { ...base, acao: 'encerrar_ticket', req: { m: 'POST', path: '/api/tickets/updateAPI', body: { ticketId: String(tk), status: 'closed' } } };
    }
    if (cid > 0 && !(tk > 0)) {
      if (contatoFeito.has(l.contato_id)) return { ...base, acao: 'aguardar_contato' };
      contatoFeito.add(l.contato_id);
      if (tk === 0 || !num) return { ...base, acao: 'criar_ticket', req: { m: 'POST', path: '/api/tickets/createTicketAPI', body: { contactId: Number(cid) } } };
      return { ...base, acao: 'buscar_ticket', conexao: String(cfg.wid), req: { m: 'GET', path: '/api/contacts/alltickets', body: { number: num } } };
    }
    if (cid > 0) {
      return { ...base, acao: 'criar', texto, previsto_para: l.previsto_para, req: { m: 'POST', path: '/api/schedules', body: { body: texto, sendAt: bvMLocal(l.previsto_para, 'T'), contactId: String(cid),
        userId: String(cfg.user_id), openTicket: '0', queueId: String(cfg.fila || '0'), whatsappId: String(cfg.wid), repetir: '0', repetirTodo: '0', quantasVezes: '0' } } };
    }
    if (!num) return { ...base, acao: 'sem_contato' };
    if (contatoFeito.has(l.contato_id)) return { ...base, acao: 'aguardar_contato' };
    contatoFeito.add(l.contato_id);
    if (cid === 0) return { ...base, acao: 'criar_contato', req: { m: 'POST', path: '/api/contacts', body: { name: String((l.dados || {}).nome || num).slice(0, 80), number: num } } };
    return { ...base, acao: 'buscar_contato', req: { m: 'GET', path: '/api/contacts/single', body: { number: num } } };
  });
}

// Resultado de uma acao planejada (status/body da chamada, ou sem chamada) -> o que gravar. Falha: retentativa com retentativas_min
// e, esgotadas, situacao falhou; sem resposta na criacao = incerto (nunca recria: SC-007).
function bvMSincResultado(p, status, body, tentativas, cfg, agora) {
  const ok = status >= 200 && status < 300, id = p.id;
  const contatoDe = (b) => { // GET /contacts/single devolve { "<id>": {id,...} }; vazio = nao existe
    if (!b || typeof b !== 'object') return null;
    if (Number.isInteger(b.id)) return b.id;
    const v = Object.values(b).find((x) => x && Number.isInteger(x.id)); // { "<id>": {...} }, { existingContact: {...} }, { contact: {...} }
    return v ? v.id : (Object.keys(b).length ? null : 0);
  };
  const falha = (code) => {
    const r = bvMResultadoEnvio(status, tentativas, cfg, agora);
    const pendente = !['apagar', 'liberar', 'etiquetar', 'desetiquetar'].includes(p.acao); // apagar/etiquetar que falha nao mexe na situacao
    return { id, falhou: true, situacao: pendente ? (r.situacao === 'enviada' ? 'pendente' : r.situacao) : null, motivo: pendente ? (r.motivo || null) : null, tentativas: r.tentativas ?? (tentativas || 0) + 1, proxima: r.proxima_tentativa_em || null, code: code || (status ? `HTTP_${status}` : 'SEM_RESPOSTA'), status: status || 0, operacao: p.acao };
  };
  switch (p.acao) {
    case 'criar': if (ok && body && body.id) return { id, canal_id: String(body.id), canal_previsto_para: p.previsto_para, canal_texto: p.texto }; return falha();
    case 'atualizar':
      if (ok) return { id, canal_id_igual: true, canal_previsto_para: p.previsto_para, canal_texto: p.texto };
      if (status === 404) return { id, limpar_canal: true }; // sumiu do Chat Master (apagado na tela): a proxima rodada recria
      return falha();
    case 'apagar': if (ok || status === 404) return { id, limpar_canal: true }; return falha();
    case 'liberar': return { id, limpar_canal: true };
    case 'etiquetar': return ok ? { id, etiqueta_id: p.etiqueta_id, etiqueta_ticket_id: p.etiqueta_ticket_id } : falha();
    case 'desetiquetar': return ok || status === 404 ? { id, etiqueta_removida: true } : falha();
    case 'sem_etiqueta': return { id, etiqueta_id: 0 };
    case 'enviada': return { id, situacao: 'enviada' };
    case 'ja_passou': return { id, situacao: 'cancelada', motivo: 'ja_passou' };
    case 'sem_contato': return { id, situacao: 'cancelada', motivo: 'sem_contato_canal' };
    case 'junto': // seguidora: sem chamada; reavalia em ate 30 min (sem ocupar a varredura) e encerra no horario dela
      return p.fim ? { id, situacao: 'cancelada', motivo: 'junto' } : { id, proxima: new Date(Math.min(new Date(p.previsto_para).getTime(), new Date(agora).getTime() + 30 * 60000)).toISOString() };
    case 'buscar_contato': { const c = ok ? contatoDe(body) : null; return c === null ? falha() : { id, contato_id: p.contato_id, contato_canal_id: c }; }
    case 'criar_contato': { const c = ok ? contatoDe(body) : null; return c > 0 ? { id, contato_id: p.contato_id, contato_canal_id: c } : falha(ok ? 'SEM_ID' : undefined); } // sem id: falha visivel, nunca repete em silencio
    case 'buscar_ticket': { // lista de tickets do contato em todas as conexoes: so vale um desta conexao
      if (!ok || !Array.isArray(body)) return falha();
      const t = body.find((x) => x && Number.isInteger(x.id) && String(x.whatsappId) === String(p.conexao));
      return { id, contato_id: p.contato_id, ticket_id: t ? t.id : 0 };
    }
    case 'criar_ticket': return ok && body && Number.isInteger(body.id) ? { id, contato_id: p.contato_id, ticket_id: body.id, ticket_encerrar: true } : falha(ok ? 'SEM_ID' : undefined);
    case 'encerrar_ticket': return ok ? { id, contato_id: p.contato_id, ticket_encerrar: false } : falha();
    default: return { id };
  }
}

// Agendamento feito por pacote: em /agenda/agendamentos a Graces devolve o servico dentro de servicoPacote ({ idServico,
// descricaoServico }), sem os campos de cima (medido em 23/11 com clientes de PROD: o agente listava o agendamento sem o nome do
// servico, dizia "Cancelar undefined" e nao conseguia remarcar). Sobe os dois campos para o formato do agendamento avulso e marca
// `pacote`; quem ja tem idServico fica como veio. Um lugar so, usado pelo agente (bvgResp) e pelos lembretes (bvMAgendaDe).
const bvMComServico = (a) => (a && typeof a === 'object' && a.servicoPacote && typeof a.servicoPacote === 'object' && a.servicoPacote.idServico && !a.idServico
  ? { ...a, idServico: a.servicoPacote.idServico, descricaoServico: a.descricaoServico || a.servicoPacote.descricaoServico, pacote: true } : a);

// /agenda/completa ([{idProfissional, apelido, agendamentos:[...]}]) -> lista plana; /agenda/agendamentos (ja plana) passa igual.
function bvMAgendaDe(body) {
  if (!Array.isArray(body)) return null;
  const out = [];
  for (const x of body) {
    if (x && Array.isArray(x.agendamentos)) for (const a of x.agendamentos) out.push(bvMComServico({ ...a, idProfissional: x.idProfissional, profissional: String(x.apelido || '').trim() }));
    else if (x) out.push(bvMComServico(x));
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
  // 400 na primeira chamada (PROD, 16/11): agendamento recorrente exige `data` e a reconciliacao nao sabe que ele e recorrente.
  // Uma nova tentativa, com a data da ocorrencia; se o 400 se repetir, e falha.
  if (s === 400 && tent === 0) return { code: 'retry', espera_s: 1, com_data: true };
  return { code: 'falhou', status: s };
}

// Conferencia apos 409: resp = GET /agenda/agendamentos?idCliente ou /agenda/completa do dia; row = {graces_agendamento_id, inicio}.
// Confirmar so vale com status 3; recusar so com 10. Divergente ou ausente = desatualizada; sem resposta valida = falhou.
function bvMConfConferir(resp, row, confirmado) {
  const s = Number(resp && resp.status) || 0;
  const lista = s >= 200 && s < 300 ? bvMAgendaDe(resp.body) : null;
  if (!lista) return { code: 'falhou', status: s };
  // A ocorrencia de uma serie semanal apareceu com outro idAgenda no dia (PROD, 17/11: o lembrete da vespera levava o id da serie e o
  // da hora, outro id no mesmo inicio); o cliente confirmou e ouviu que o horario nao valia. Na leitura do proprio cliente, vale o
  // agendamento dele no mesmo inicio. So para confirmar: a recusa segue com o id do lembrete.
  const ag = bvMOcorrencia(lista, row.graces_agendamento_id, row.inicio)
    || (confirmado && row.graces_cliente_id ? lista.find((x) => x && String(x.horaInicio).slice(0, 16) === String(row.inicio).slice(0, 16)) : undefined);
  if (ag && ag.idStatusAgenda === (confirmado ? 3 : 10)) return { code: confirmado ? 'confirmada' : 'recusada', status: s };
  // Lembrete desatualizado (17/11: o cliente confirmou presenca, ouviu so "esse horario nao esta mais valendo" e marcou outro):
  // com a leitura feita pelo cliente (idCliente), a resposta diz o que esta marcado agora. Sem o cliente a leitura e do dia inteiro
  // (de todos), entao `atual` fica nulo e vale o texto antigo.
  const atual = row.graces_cliente_id ? lista.filter((a) => a && a.idAgenda && a.horaInicio).slice(0, 5).map((a) => ({ servico: String(a.descricaoServico || a.servico || 'horário'), inicio: String(a.horaInicio) })) : null;
  return { code: 'desatualizada', status: s, atual };
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
// A recusa vale por janelaMin a partir de `em` (propria, nao a da conversa). neutro = bvNeutralizar. semConversa: turno sem historico.
function bvMPromptConfirmacoes(ctx, agoraMs, janelaMin, neutro, semConversa) {
  let s = '';
  const cs = Array.isArray(ctx && ctx.confirmacoes) ? ctx.confirmacoes : [];
  if (cs.length) s += '\nConfirmações de presença abertas, enviadas pela barbearia (dado): ' + cs.map((c) => 'id=' + c.id + ' (' + neutro(c.servico) + ' com ' + neutro(c.barbeiro) + ', ' + bvMDia(c.inicio) + ' às ' + String(c.inicio).slice(11, 16) + ')').join('; ');
  // Lembrete de 1 hora (17/11): sai pelo Chat Master e nao entra no historico; o "Simm" de resposta chegava ao agente sem contexto
  // e virava "Como posso ajudar?". Com confirmacao aberta vale a linha de cima (o sim confirma a presenca). Sem o nome do barbeiro.
  // semConversa: so quando nao ha conversa em andamento; no meio dela o "sim" responde a ultima pergunta do agente (um resumo, p. ex.).
  const l = ctx && ctx.lembrete_hora;
  if (l && !cs.length && semConversa) s += '\nLembrete enviado pela barbearia há pouco (dado): ' + neutro(l.servico || 'horário') + ', hoje às ' + String(l.inicio).slice(11, 16) + '. O lembrete não pede resposta: se a mensagem nova for só um "sim", "ok" ou agradecimento, o cliente está respondendo a ele; responda em uma frase curta, no tom de "combinado, até já", sem perguntar como pode ajudar.';
  const r = ctx && ctx.pedido && ctx.pedido.confirmacao_recusada;
  const em = r ? Date.parse(r.em) : NaN;
  if (Number.isFinite(em) && agoraMs - em >= 0 && agoraMs - em <= janelaMin * 60000) s += '\nO cliente respondeu que não vai poder comparecer ao agendamento ' + neutro(r.idAgenda) + ' (dado), e a decisão "remarcar ou cancelar?" já foi enviada a ele em lista: não a repita. Se a última oferta ainda for essa decisão, siga o que ela diz; se a confirmação do cancelamento tiver vencido, chame meus_agendamentos e cancelar (fase 1) desse agendamento e peça só a confirmação. Quer remarcar: pergunte o dia e o horário que ele prefere e siga a remarcação.';
  return s;
}

function bvMConfTexto(code, row, origem, textos, repetidaMax, atual) {
  const r = row || {};
  const v = { dia: bvMDia(r.inicio), hora: String(r.inicio || '').slice(11, 16) };
  if (code === 'confirmada') return bvMTemplate(textos.confirmacao_ok, v);
  if (code === 'recusada') return bvMTemplate(textos.confirmacao_recusada, v);
  if (code === 'desatualizada' && Array.isArray(atual) && textos.confirmacao_desatualizada_atual) {
    return atual.length ? bvMTemplate(textos.confirmacao_desatualizada_atual, { lista: atual.map((a) => `${a.servico}, ${bvMDia(a.inicio)} às ${String(a.inicio).slice(11, 16)}`).join('; ') })
      : textos.confirmacao_desatualizada_sem || textos.confirmacao_desatualizada;
  }
  if (code === 'desatualizada') return textos.confirmacao_desatualizada;
  if (code === 'falhou') return textos.confirmacao_falhou;
  if (code === 'repetida') return origem === 'titulo' || Number(r.repetidas || 0) >= repetidaMax ? '' : textos.confirmacao_repetida;
  if (code === 'ambigua') return origem === 'titulo' ? textos.confirmacao_escolher || '' : '';
  return ''; // fora_do_teste: sem texto
}

// Vigia da fila humana: o aviso "a equipe nao conseguiu te responder" nao sai quando a equipe respondeu e, depois dela, o cliente so
// agradeceu ou se despediu (PROD, 23/11: 2 de 3 avisos sairam depois de "Obrigado" a um atendimento ja resolvido). Na duvida, avisa:
// cumprimento sozinho, "sim", pergunta, numero ou horario ("ok 14:30" e escolha, nao despedida), letra fora de a-z e emoji que nao e
// de fecho nao contam. Por palavras, sem regex com repeticao sobre texto do cliente.
const bvMJunta = (w) => w.replace(/(.)\1+/g, '$1'); // "valeuu" = "valeu", "okk" = "ok"
const BVM_GRATO = new Set(['ok', 'okay', 'oki', 'blz', 'beleza', 'obrigado', 'obrigada', 'obrigados', 'obrigadao', 'obg', 'obgd', 'obgda', 'brigado', 'brigada', 'brigadao', 'valeu',
  'vlw', 'flw', 'falou', 'fechou', 'show', 'perfeito', 'otimo', 'otima', 'combinado', 'fechado', 'certo', 'certinho', 'joia', 'legal', 'maravilha', 'top', 'tmj', 'tranquilo', 'tchau',
  'abraco', 'abs', 'grato', 'grata', 'gratidao', 'agradeco', 'agradecido', 'agradecida', 'thanks', 'entendi', 'entendido', 'ciente', 'amem', 'igualmente'].map(bvMJunta));
const BVM_GRATO_APOIO = new Set(['muito', 'mesmo', 'isso', 'sim', 'ss', 'ta', 'entao', 'bom', 'boa', 'dia', 'tarde', 'noite', 'eu', 'que', 'te', 'voce', 'vc', 'voces', 'vcs', 'ate',
  'mais', 'logo', 'la', 'amanha', 'deus', 'abencoe', 'tudo', 'pela', 'pelo', 'atencao', 'ajuda', 'atendimento', 'irmao', 'mano', 'amigo', 'pessoal', 'galera',
  'k', 'rs', 'rsrs', 'ha', 'haha', 'he', 'hehe'].map(bvMJunta));
const BVM_EMOJI_FECHO = new Set([...'👍👌🙏🤝✅😊😉😀😁🙂🙌👏💪🤗😄😃🫡🤙'].concat(['❤', '♥']));
function bvMSoAgradeceu(textos) {
  const l = Array.isArray(textos) ? textos : [];
  return l.length > 0 && l.length <= 6 && l.every((t) => {
    const cru = String(t == null ? '' : t);
    if (!cru.trim() || cru.length > 80 || cru.includes('?') || /\d/.test(cru)) return false;
    const txt = cru.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase();
    if (/[^\P{L}a-z]/u.test(txt)) return false; // outro alfabeto: nao da para saber o que diz
    const emojis = [...cru].filter((ch) => /\p{Extended_Pictographic}/u.test(ch));
    if (emojis.some((ch) => !BVM_EMOJI_FECHO.has(ch))) return false; // 😡, 👎, 🤔 pedem resposta
    const ps = txt.split(/[^a-z]+/).filter(Boolean).map(bvMJunta);
    if (!ps.length) return emojis.length > 0; // so um joinha fecha a conversa; so pontuacao, nao
    return ps.some((w) => BVM_GRATO.has(w)) && ps.every((w) => BVM_GRATO.has(w) || BVM_GRATO_APOIO.has(w));
  });
}
// Linha do encerramento da fila humana ({equipe_respondeu, depois: mensagens do cliente depois da ultima da equipe}) -> o aviso sai?
// Linha sem esses campos (turno que estourou o tempo) sempre avisa.
function bvMAvisaFila(l) {
  if (!l || l.equipe_respondeu !== true) return true;
  let d = l.depois;
  try { if (typeof d === 'string') d = JSON.parse(d); } catch (e) { return true; }
  return !bvMSoAgradeceu(d);
}

if (typeof module !== 'undefined') module.exports = { bvMComServico, bvMListaDe, bvMSoAgradeceu, bvMAvisaFila, bvMServicos, bvMSeguidora, bvMRetomada, bvMNomeProprio, bvMSincPlano, bvMSincResultado, bvMLocal, bvMProgramar, bvMLista, bvMListaDecisao, bvMDecisaoCancelar, bvMTexto, bvMResultadoEnvio, bvMReconhecer, bvMReconciliar, bvMLocalParaInstante, bvMDia, bvMTemplate, bvMTextoDe, bvMDecidir, bvMConfNormalizar, bvMConfEscolher, bvMConfAvaliar, bvMConfTexto,
  bvMAgendaDe, bvMConfConferir, bvMConfReq, bvMTituloRota, bvMPromptConfirmacoes };
