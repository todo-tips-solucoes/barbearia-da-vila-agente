// Logica pura das ferramentas da Graces (sem rede). contracts/ferramentas-graces.md. Incluida DEPOIS de shared/agente.js
// nos Code nodes de bv-graces ({{BV:INCLUDE:...}}). Protocolo: bvGPlano -> chamadas HTTP -> bvGPasso (ate 3 estagios).
// Regras duras em codigo: FR-007 (duas fases), FR-012 (barbeiro de teste), FR-020 (idCliente so do pedido/telefone),
// escrita so em TESTE e sempre redirecionada ao barbeiro de teste (research Decision 10).
if (typeof module !== 'undefined' && typeof bvFiltrarBarbeiros === 'undefined') Object.assign(globalThis, require('./agente.js'));

const BVG_CAMPOS = ['operacao', 'contato_id', 'telefone', 'turno_id', 'ambiente', 'texto', 'id_opcao', 'id_opcao_servico',
  'id_opcao_barbeiro', 'qualquer', 'data', 'id_opcao_horario', 'id_opcao_agendamento', 'substitui_id_opcao_agendamento',
  'proposta_id', 'nome'];
const BVG_OPS = ['identificar_cliente', 'cadastrar_cliente', 'escolher_cliente', 'listar_servicos', 'listar_barbeiros',
  'horarios_livres', 'meus_agendamentos', 'agendar', 'reagendar', 'cancelar'];
const BVG_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BVG_OPC = /^[A-Za-z0-9_-]{1,12}$/;
const BVG_ACOES = { agendar: 'agendar,trocar_servico', reagendar: 'reagendar', cancelar: 'cancelar' };

const bvgRecusa = (code, orientacao) => ({ ok: false, code, orientacao });
const bvgFim = (resultado, efeitos = {}) => ({ final: { resultado, efeitos } });
const bvgOpcaoInvalida = () => bvgRecusa('opcao_desconhecida', 'opção não oferecida, pergunte de novo');

// Entrada: recusa campo desconhecido e valida formato (bordo de confianca). Devolve {ok:true, in} ou {ok:false, resultado}.
function bvGNormalizar(raw, cfg) {
  const r = raw && typeof raw === 'object' ? raw : {};
  if (Object.keys(r).some((k) => !BVG_CAMPOS.includes(k))) return { ok: false, resultado: bvgRecusa('campo_desconhecido', 'pedido inválido') };
  const v = {};
  for (const k of BVG_CAMPOS) {
    const x = r[k];
    if (x === undefined || x === null || x === '') continue;
    v[k] = typeof x === 'string' ? x.trim() : x;
  }
  v.qualquer = v.qualquer === true || v.qualquer === 'true';
  const ruim = (c) => ({ ok: false, resultado: bvgRecusa('entrada_invalida', `campo ${c} inválido`) });
  if (!BVG_OPS.includes(v.operacao)) return ruim('operacao');
  if (!/^\d{1,18}$/.test(String(v.contato_id))) return ruim('contato_id');
  if (!/^\+?\d{10,15}$/.test(String(v.telefone))) return ruim('telefone');
  if (!BVG_UUID.test(String(v.turno_id))) return ruim('turno_id');
  if (v.ambiente !== cfg.ambiente) return { ok: false, resultado: bvgRecusa('ambiente_incorreto', 'configuração inválida') };
  if (v.data !== undefined && (!/^\d{4}-\d{2}-\d{2}$/.test(v.data) || Number.isNaN(Date.parse(v.data)))) return ruim('data');
  if (v.proposta_id !== undefined && !BVG_UUID.test(v.proposta_id)) return ruim('proposta_id');
  for (const k of ['id_opcao', 'id_opcao_servico', 'id_opcao_barbeiro', 'id_opcao_horario', 'id_opcao_agendamento', 'substitui_id_opcao_agendamento']) {
    if (v[k] !== undefined && !BVG_OPC.test(String(v[k]))) return ruim(k);
  }
  if (v.texto !== undefined && String(v.texto).length > 80) return ruim('texto');
  if (v.nome !== undefined && (String(v.nome).length < 2 || String(v.nome).length > 80)) return ruim('nome');
  v.contato_id = String(v.contato_id);
  const falta = {
    escolher_cliente: !v.id_opcao,
    listar_barbeiros: !v.id_opcao_servico,
    horarios_livres: !v.data || !(v.id_opcao_barbeiro || v.qualquer),
    cadastrar_cliente: !v.nome,
    agendar: !(v.id_opcao_horario || v.proposta_id),
    reagendar: !(v.proposta_id || (v.id_opcao_agendamento && v.id_opcao_horario)),
    cancelar: !(v.proposta_id || v.id_opcao_agendamento),
  }[v.operacao];
  return falta ? { ok: false, resultado: bvgRecusa('faltam_dados', 'faltam dados para esta ferramenta') } : { ok: true, in: v };
}

// Resolve id_opcao_* so contra o que foi ofertado a este contato (oferta corrente ou escolhas guardadas no pedido).
function bvgResolver(id, tipo, ctx) {
  if (id === undefined) return null;
  const o = ctx.opcoes;
  if (o && o.tipo === tipo) { const r = bvResolverOpcao(id, o); if (r.ok) return r.item.valor; }
  const p = ctx.pedido;
  if (tipo === 'servico' && p.servico && String(p.servico.opcao_id) === String(id)) return p.servico;
  if (tipo === 'barbeiro') return (p.barbeiros || []).find((b) => String(b.opcao_id) === String(id)) || null;
  if (tipo === 'agendamento') return (p.agendamentos || []).find((a) => String(a.opcao_id) === String(id)) || null; // horarios_livres troca a oferta: a escolha do agendamento fica no pedido
  return null;
}

function bvgEscritaPermitida(cfg) {
  if (cfg.ambiente === 'producao' || !cfg.redirecionar) {
    return bvgRecusa('escrita_desabilitada', 'agendar por aqui ainda não está liberado; chame a equipe da loja');
  }
  return null;
}

const bvgDia = (d) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;
const bvgReais = (v) => (v == null ? '' : ` (R$ ${Number(v).toFixed(2).replace('.', ',')})`);
const bvgSoDigitos = (t) => String(t).replace(/\D/g, '');

function bvGPlano(i, ctx0, cfg) {
  const ctx = { pedido: (ctx0 && ctx0.pedido) || {}, opcoes: (ctx0 && ctx0.opcoes) || {}, proposta: ctx0 && ctx0.proposta, info: ctx0 && ctx0.info };
  const st = { in: i, ctx, meta: { op: i.operacao } };
  const chamar = (reqs, meta = {}) => ({ reqs, st: { ...st, meta: { ...st.meta, ...meta } } });
  const idCliente = ctx.pedido.idCliente;
  switch (i.operacao) {
    case 'identificar_cliente':
      return chamar([{ m: 'GET', path: '/agenda/clientes', qs: { celular: bvgSoDigitos(i.telefone) } }]);
    case 'cadastrar_cliente': {
      if (!cfg.cadastroLiberado) return bvgFim(bvgRecusa('cadastro_desabilitado', 'não consigo cadastrar agora; chame a equipe da loja'));
      if (!ctx.pedido.cliente_sem_cadastro) return bvgFim(bvgRecusa('identifique_primeiro', 'identifique o cliente pelo telefone antes de cadastrar'));
      const d = bvgSoDigitos(i.telefone);
      return chamar([{ m: 'POST', path: '/agenda/clientes', body: { nomeCliente: i.nome, ddiCelular: '55', celular: d.length > 11 && d.startsWith('55') ? d.slice(2) : d } }]);
    }
    case 'escolher_cliente': {
      const c = bvgResolver(i.id_opcao, 'cliente', ctx);
      if (!c) return bvgFim(bvgOpcaoInvalida());
      return bvgFim({ ok: true }, { pedido: { idCliente: c.idCliente, cliente_sem_cadastro: false, cliente_nome: c.primeiroNome } });
    }
    case 'listar_servicos':
      return chamar([{ m: 'GET', path: '/agenda/servicos', qs: i.texto && i.texto.length >= 3 ? { texto: i.texto } : {} }]);
    case 'listar_barbeiros': {
      const s = bvgResolver(i.id_opcao_servico, 'servico', ctx);
      if (!s) return bvgFim(bvgOpcaoInvalida());
      return chamar([{ m: 'GET', path: '/servicos/profissionais', qs: { idServico: s.idServico } }], { servico: { ...s, opcao_id: i.id_opcao_servico } });
    }
    case 'horarios_livres': {
      const ag = i.id_opcao_agendamento ? bvgResolver(i.id_opcao_agendamento, 'agendamento', ctx) : null;
      const s = ag ? { idServico: ag.idServico, nome: ag.servico, opcao_id: 'ag' } : (i.id_opcao_servico ? bvgResolver(i.id_opcao_servico, 'servico', ctx) : ctx.pedido.servico);
      if (!s) return bvgFim(bvgRecusa('servico_nao_escolhido', 'escolha o serviço antes (listar_servicos)'));
      const bs = i.qualquer ? (ctx.pedido.barbeiros || []) : [bvgResolver(i.id_opcao_barbeiro, 'barbeiro', ctx)].filter(Boolean);
      if (!bs.length) return bvgFim(i.qualquer ? bvgRecusa('barbeiros_nao_listados', 'chame listar_barbeiros antes') : bvgOpcaoInvalida());
      const reqs = bs.slice(0, 10).map((b) => ({ m: 'GET', path: '/agenda/horarios-livres', qs: { idServico: s.idServico, idProfissional: b.idProfissional, data: i.data } }));
      return chamar(reqs, { servico: s, barbeiros: bs.slice(0, 10), qualquer: !!i.qualquer, data: i.data });
    }
    case 'meus_agendamentos':
      if (!idCliente) return bvgFim(bvgRecusa('cliente_nao_identificado', 'identifique o cliente primeiro'));
      return chamar([{ m: 'GET', path: '/agenda/agendamentos', qs: { idCliente, proximos: true } }]);
    default:
      return i.proposta_id ? bvgFase2(i, ctx, cfg, chamar) : bvgFase1(i, ctx, cfg);
  }
}

// Fase 1: so cria a proposta pendente com o resumo; nada e escrito na Graces (FR-006).
function bvgFase1(i, ctx, cfg) {
  const bloq = bvgEscritaPermitida(cfg);
  if (bloq) return bvgFim(bloq);
  if (!ctx.pedido.idCliente) return bvgFim(bvgRecusa('cliente_nao_identificado', 'identifique o cliente primeiro'));
  const fora = bvgRecusa('escrita_fora_do_teste', 'só é possível mexer em agendamentos de teste neste ambiente');
  const ag = i.id_opcao_agendamento ? bvgResolver(i.id_opcao_agendamento, 'agendamento', ctx) : null;
  const h = i.id_opcao_horario ? bvgResolver(i.id_opcao_horario, 'horario', ctx) : null;
  const antigo = i.substitui_id_opcao_agendamento ? bvgResolver(i.substitui_id_opcao_agendamento, 'agendamento', ctx) : null;
  const ag0 = (antigo || ag);
  if (ag0 && ag0.idProfissional !== cfg.testeId) return bvgFim(fora); // nunca altera agenda de barbeiro real
  if (h && h.idProfissional === cfg.testeId) return bvgFim(bvgOpcaoInvalida()); // FR-012: o modelo nao escolhe o de teste
  const agAnt = { idAgenda: ag0 && ag0.idAgenda, horaInicio: ag0 && ag0.horaInicio, recorrente: !!(ag0 && ag0.recorrente) };
  if (i.operacao === 'agendar') {
    if (!h || (i.substitui_id_opcao_agendamento && !antigo)) return bvgFim(bvgOpcaoInvalida());
    const dados = { idCliente: ctx.pedido.idCliente, idServico: h.idServico, servico: h.servico, idProfissional: h.idProfissional, barbeiro: h.apelido, data: h.data, hora: h.hora, valor: h.preco };
    if (antigo) dados.antigo = agAnt;
    const resumo = `${antigo ? 'Trocar serviço: ' : ''}${h.servico} com ${h.apelido} em ${bvgDia(h.data)} às ${h.hora}${bvgReais(h.preco)}`;
    return bvgFim({ ok: true, aguardando_confirmacao: true, resumo }, { proposta_nova: { acao: antigo ? 'trocar_servico' : 'agendar', dados, resumo } });
  }
  if (!ag) return bvgFim(bvgOpcaoInvalida());
  if (i.operacao === 'reagendar') {
    if (!h) return bvgFim(bvgOpcaoInvalida());
    if (h.idServico !== ag.idServico) return bvgFim(bvgRecusa('servico_diferente', 'os horários são de outro serviço; consulte horarios_livres com este agendamento'));
    const dados = { ...agAnt, idServico: ag.idServico, servico: ag.servico, idProfissional: h.idProfissional, barbeiro: h.apelido, data: h.data, hora: h.hora };
    const resumo = `Remarcar ${ag.servico} de ${bvgDia(ag.horaInicio)} ${ag.horaInicio.slice(11, 16)} para ${bvgDia(h.data)} às ${h.hora} com ${h.apelido}`;
    return bvgFim({ ok: true, aguardando_confirmacao: true, resumo }, { proposta_nova: { acao: 'reagendar', dados, resumo } });
  }
  const resumo = `Cancelar ${ag.servico} em ${bvgDia(ag.horaInicio)} às ${ag.horaInicio.slice(11, 16)} com ${ag.profissional}`;
  return bvgFim({ ok: true, aguardando_confirmacao: true, sugerir_remarcar: true, resumo }, { proposta_nova: { acao: 'cancelar', dados: { ...agAnt, servico: ag.servico, barbeiro: ag.profissional, resumo }, resumo } });
}

// Fase 2: a proposta ja vem reivindicada (UPDATE atomico no Contexto: pendente, mesmo contato, turno anterior, na validade).
function bvgFase2(i, ctx, cfg, chamar) {
  const bloq = bvgEscritaPermitida(cfg);
  const p = ctx.proposta;
  if (bloq) return bvgFim(bloq, p ? { proposta_upd: { id: p.id, estado: 'falhou', resultado: { ok: false, code: bloq.code } } } : {});
  if (!p) {
    const f = ctx.info;
    if (!f) return bvgFim(bvgRecusa('proposta_invalida', 'não achei essa confirmação; refaça o resumo'));
    if (f.mesmo_turno) return bvgFim(bvgRecusa('confirmacao_no_mesmo_turno', 'peça a confirmação ao cliente e só execute depois que ele responder'));
    if (f.estado !== 'pendente') return bvgFim(bvgRecusa('proposta_nao_pendente', 'essa confirmação já foi usada; refaça o resumo'));
    return bvgFim(bvgRecusa('proposta_expirada', 'a confirmação venceu; refaça o resumo e peça de novo'), {}); // expirada: a pendente fica para o proximo "substituida"
  }
  const d = p.dados || {};
  const prof = cfg.redirecionar ? cfg.testeId : d.idProfissional; // research Decision 10: toda escrita vai ao barbeiro de teste
  const meta = { fase2: true, proposta: p, prof };
  if (p.acao === 'cancelar') {
    return chamar([{ m: 'DELETE', path: `/agenda/${d.idAgenda}`, qs: d.recorrente ? { data: String(d.horaInicio).slice(0, 10) } : {} }], { ...meta, etapa: 'escrita' });
  }
  return chamar([{ m: 'GET', path: '/agenda/horarios-livres', qs: { idServico: d.idServico, idProfissional: prof, data: d.data } }], { ...meta, etapa: 'reval' });
}

const bvgResp = (r) => ({ status: Number((r && r.status) || 0), body: r && r.body });

function bvGErro(resp, op) {
  const s = resp.status || 0;
  const b = resp.body && typeof resp.body === 'object' ? resp.body : {};
  const code = String(b.code || (s ? `HTTP_${s}` : 'SEM_RESPOSTA')).replace(/[^\w.-]/g, '').slice(0, 60);
  const trace = /^[\w.-]{1,80}$/.test(String(b.traceId || '')) ? String(b.traceId) : null;
  const incerto = s === 0 || s >= 500;
  const orientacao = incerto ? 'a agenda não respondeu; não repita sozinho, confira com meus_agendamentos'
    : (s === 401 || s === 403) ? 'a agenda está indisponível agora; ofereça chamar a equipe da loja'
      : s === 404 ? 'não encontrei isso na agenda; confira com o cliente'
        : (s === 400 && op === 'horarios_livres') ? 'dia fechado ou fora do prazo; sugira outro dia'
          : 'a agenda recusou; ofereça outra opção, sem repetir a mesma chamada';
  return { code, status: s, trace, incerto, orientacao, falha: { motivo: `${op}_${incerto ? 'incerta' : 'erro'}`, operacao: op, code, status: s, trace } };
}

// Um estagio depois das chamadas HTTP. st vem do estagio anterior; resps alinhado a st.reqs.
function bvGPasso(st, resps0, cfg) {
  const { in: i, ctx, meta } = st;
  const resps = (resps0 || []).map(bvgResp);
  const r0 = resps[0] || { status: 0 };
  const ok200 = (r) => r.status >= 200 && r.status < 300;
  const falha = (op, r, extra = {}) => { const e = bvGErro(r, op); return bvgFim({ ok: false, code: e.code, orientacao: e.orientacao, ...extra }, { falha: e.falha }); };
  if (meta.fase2) return bvgPassoEscrita(st, resps, cfg);
  const op = meta.op;
  if (!resps.some(ok200)) return falha(op, r0);
  const lista = Array.isArray(r0.body) ? r0.body : [];
  switch (op) {
    case 'identificar_cliente': {
      const cs = lista.filter((c) => c && c.idCliente).map((c) => ({ idCliente: c.idCliente, nome: `${c.nomeCliente || ''} ${c.sobrenomeCliente || ''}`.trim(), primeiroNome: String(c.nomeCliente || '').trim() }));
      if (cs.length === 0) return bvgFim({ ok: true, encontrado: false, orientacao: 'cliente não cadastrado; peça o nome para cadastrar' }, { pedido: { idCliente: null, cliente_sem_cadastro: true } });
      if (cs.length === 1) return bvgFim({ ok: true, encontrado: true, nome: cs[0].primeiroNome }, { pedido: { idCliente: cs[0].idCliente, cliente_sem_cadastro: false, cliente_nome: cs[0].primeiroNome } });
      const of = bvMontarOferta('cliente', cs.map((c) => ({ rotulo: c.nome, valor: c })), cfg);
      return bvgFim({ ok: true, varios: true, opcoes: of.itens.map((x) => ({ id: x.id, nome: x.rotulo })), orientacao: 'mais de um cadastro neste telefone; pergunte quem é e use escolher_cliente' },
        { opcoes: of, pedido: { idCliente: null, cliente_sem_cadastro: false } });
    }
    case 'cadastrar_cliente':
      return r0.body && r0.body.idCliente ? bvgFim({ ok: true }, { pedido: { idCliente: r0.body.idCliente, cliente_sem_cadastro: false } }) : falha(op, { status: 500 });
    case 'listar_servicos': {
      const ss = bvFiltrarServicos(lista.filter((s) => s && s.ativo !== false).map((s) => ({ ...s, nome: String(s.descricaoAgenda || '') })));
      const of = bvMontarOferta('servico', ss.map((s) => ({ rotulo: s.nome, valor: { idServico: s.idServico, nome: s.nome, preco: s.valorPadrao, minutos: s.tempoPadrao } })), cfg);
      return bvgFim({ ok: true, total: ss.length, servicos: of.itens.map((x) => ({ id: x.id, nome: x.valor.nome, preco: x.valor.preco })), orientacao: ss.length > of.itens.length ? 'há mais serviços; peça ao cliente um termo para filtrar' : undefined }, { opcoes: of });
    }
    case 'listar_barbeiros': {
      const bs = bvFiltrarBarbeiros(lista.map((b) => ({ id: b.idProfissional, apelido: String(b.apelido || '').trim(), nome: b.nomeCompleto })), cfg.testeId);
      const of = bvMontarOferta('barbeiro', bs.map((b) => ({ rotulo: b.apelido, valor: { idProfissional: b.id, apelido: b.apelido } })), cfg);
      return bvgFim({ ok: true, barbeiros: of.itens.map((x) => ({ id: x.id, nome: x.rotulo })), orientacao: of.itens.length ? undefined : 'nenhum barbeiro disponível para este serviço' },
        { opcoes: of, pedido: { servico: meta.servico, barbeiros: of.itens.map((x) => ({ opcao_id: x.id, ...x.valor })), horario: null } });
    }
    case 'horarios_livres': {
      const porHora = new Map();
      resps.forEach((r, k) => {
        if (!ok200(r) || !r.body || !Array.isArray(r.body.horarios)) return;
        const b = meta.barbeiros[k];
        r.body.horarios.forEach((hh) => { if (/^\d{2}:\d{2}$/.test(hh) && !porHora.has(hh)) porHora.set(hh, { b, minutos: r.body.minutos }); });
      });
      const horas = [...porHora.keys()].sort();
      const s = meta.servico;
      const of = bvMontarOferta('horario', horas.map((hh) => {
        const { b, minutos } = porHora.get(hh);
        return { rotulo: meta.qualquer ? `${hh} ${b.apelido}` : hh, valor: { data: meta.data, hora: hh, idProfissional: b.idProfissional, apelido: b.apelido, idServico: s.idServico, servico: s.nome, preco: s.preco, minutos } };
      }), cfg);
      const res = { ok: true, data: meta.data, total: horas.length, opcoes: of.itens.map((x) => ({ id: x.id, hora: x.valor.hora, barbeiro: x.valor.apelido })) };
      if (!horas.length) res.orientacao = 'dia lotado; sugira outro dia';
      else if (horas.length > of.itens.length) res.orientacao = 'há mais horários; pergunte a preferência (manhã/tarde) para filtrar';
      return bvgFim(res, { opcoes: of, pedido: { servico: s } });
    }
    case 'meus_agendamentos': {
      const ags = lista.filter((a) => a && a.idAgenda && (cfg.ambiente !== 'producao' || (a.idProfissional !== cfg.testeId && !/\bteste\b/i.test(String(a.profissional || '')))));
      const of = bvMontarOferta('agendamento', ags.map((a) => ({
        rotulo: `${bvgDia(String(a.horaInicio))} ${String(a.horaInicio).slice(11, 16)} ${a.descricaoServico || ''}`.trim(),
        valor: { idAgenda: a.idAgenda, horaInicio: a.horaInicio, idServico: a.idServico, servico: a.descricaoServico, idProfissional: a.idProfissional, profissional: String(a.profissional || '').trim(), recorrente: !!a.recorrente },
      })), cfg);
      return bvgFim({ ok: true, agendamentos: of.itens.map((x) => ({ id: x.id, servico: x.valor.servico, barbeiro: x.valor.profissional, inicio: x.valor.horaInicio })), orientacao: of.itens.length ? undefined : 'nenhum agendamento futuro' }, { opcoes: of, pedido: { agendamentos: of.itens.map((x) => ({ opcao_id: x.id, ...x.valor })) } });
    }
    default:
      return falha(op, { status: 500 });
  }
}

function bvgPassoEscrita(st, resps, cfg) {
  const { meta } = st;
  const p = meta.proposta, d = p.dados || {};
  const r0 = resps[0] || { status: 0 };
  const ok = r0.status >= 200 && r0.status < 300 && !(r0.body && r0.body.sucesso === false);
  const limpa = { opcoes: {}, pedido: { servico: null, barbeiros: null, horario: null, agendamentos: null } };
  const termina = (estado, resultado, extra = {}) => bvgFim(resultado, { ...extra, proposta_upd: { id: p.id, estado, resultado: { ok: !!resultado.ok, code: resultado.code } } });
  const err = (op, r) => { const e = bvGErro(r, op); return { e, f: e.falha }; };
  if (meta.etapa === 'reval') {
    const livre = r0.status === 200 && r0.body && Array.isArray(r0.body.horarios) && r0.body.horarios.includes(d.hora);
    if (!livre) { // US1-4: horario tomado -> falhou + novas opcoes do mesmo dia
      const hs = r0.status === 200 && Array.isArray(r0.body && r0.body.horarios) ? r0.body.horarios.filter((x) => /^\d{2}:\d{2}$/.test(x)) : [];
      const of = bvMontarOferta('horario', hs.map((hh) => ({ rotulo: hh, valor: { data: d.data, hora: hh, idProfissional: d.idProfissional, apelido: d.barbeiro, idServico: d.idServico, servico: d.servico, preco: d.valor } })), cfg);
      const { e, f } = r0.status === 200 ? { e: null, f: null } : err('horarios_livres', r0);
      return termina('falhou', { ok: false, code: 'horario_indisponivel', orientacao: 'esse horário não está mais livre; ofereça as novas opções', opcoes: of.itens.map((x) => ({ id: x.id, hora: x.valor.hora })) }, { opcoes: of, falha: f });
    }
    const hora = d.hora;
    const w = p.acao === 'reagendar'
      ? { m: 'PUT', path: `/agenda/${d.idAgenda}`, body: { horaInicioOriginal: d.horaInicio, horaInicioNovo: `${d.data}T${hora}:00`, idProfissional: meta.prof } }
      : { m: 'POST', path: '/agenda', body: { idCliente: d.idCliente, idServico: d.idServico, idProfissional: meta.prof, data: d.data, horaInicio: hora, idIntegracao: `bv-${String(p.id).slice(0, 8)}` } };
    return { reqs: [w], st: { ...st, meta: { ...meta, etapa: 'escrita' } } };
  }
  if (meta.etapa === 'escrita' || meta.etapa === 'escrita2') {
    const op = meta.etapa === 'escrita2' ? 'cancelar_antigo' : p.acao;
    if (!ok) {
      const { e, f } = err(op, r0);
      if (meta.etapa === 'escrita2') return termina('incerta', { ok: false, code: 'novo_criado_antigo_nao_cancelado', orientacao: 'o novo agendamento foi criado, mas não consegui cancelar o antigo; avise o cliente e peça para cancelar o antigo' }, { falha: f });
      return termina(e.incerto ? 'incerta' : 'falhou', { ok: false, code: e.incerto ? 'incerta' : e.code, orientacao: e.orientacao }, { falha: f });
    }
    if (p.acao === 'trocar_servico' && meta.etapa === 'escrita') {
      const a = d.antigo || {};
      return { reqs: [{ m: 'DELETE', path: `/agenda/${a.idAgenda}`, qs: a.recorrente ? { data: String(a.horaInicio).slice(0, 10) } : {} }], st: { ...st, meta: { ...meta, etapa: 'escrita2' } } };
    }
    const msg = { agendar: 'agendado', trocar_servico: 'serviço trocado', reagendar: 'remarcado', cancelar: 'cancelado' }[p.acao];
    return termina('executada', { ok: true, [msg.replace(' ', '_')]: true }, limpa);
  }
  return termina('falhou', { ok: false, code: 'etapa_invalida', orientacao: 'não consegui concluir; tente de novo' });
}

// Parametros da query "Persistir" (so $1..$14; nenhum valor entra no texto do SQL).
function bvGParams(i, efeitos) {
  const e = efeitos || {};
  const j = (x) => (x === undefined || x === null ? null : JSON.stringify(x));
  const n = e.proposta_nova, u = e.proposta_upd, f = e.falha;
  return [i.contato_id, j(e.opcoes), j(e.pedido), i.turno_id, n ? n.acao : null, n ? j(n.dados) : null,
    u ? u.id : '', u ? u.estado : null, u ? j(u.resultado) : null,
    f ? f.motivo : null, f ? f.operacao : null, f ? f.code : null, f ? f.status : null, f ? f.trace : null];
}

if (typeof module !== 'undefined') module.exports = { bvGNormalizar, bvGPlano, bvGPasso, bvGErro, bvGParams, BVG_ACOES };
