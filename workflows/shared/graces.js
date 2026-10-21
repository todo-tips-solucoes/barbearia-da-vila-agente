// Logica pura das ferramentas da Graces (sem rede). contracts/ferramentas-graces.md. Incluida DEPOIS de shared/agente.js
// nos Code nodes de bv-graces ({{BV:INCLUDE:...}}). Protocolo: bvGPlano -> chamadas HTTP -> bvGPasso (em laco, ate graces.max_estagios).
// Regras duras em codigo: FR-007 (duas fases), FR-012 (barbeiro de teste), FR-020 (idCliente so do pedido/telefone),
// escrita so em TESTE e sempre redirecionada ao barbeiro de teste (research Decision 10).
if (typeof module !== 'undefined' && typeof bvFiltrarBarbeiros === 'undefined') Object.assign(globalThis, require('./agente.js'));
if (typeof module !== 'undefined' && typeof bvMProgramar === 'undefined') Object.assign(globalThis, require('./mensagens.js'));

const BVG_CAMPOS = ['operacao', 'contato_id', 'telefone', 'turno_id', 'ambiente', 'texto', 'id_opcao', 'id_opcao_servico',
  'id_opcao_barbeiro', 'qualquer', 'data', 'id_opcao_horario', 'id_opcao_agendamento', 'substitui_id_opcao_agendamento',
  'proposta_id', 'nome', 'celular', 'id_opcoes_servicos', 'id_opcoes_agendamentos'];
const BVG_OPS = ['identificar_cliente', 'cadastrar_cliente', 'escolher_cliente', 'listar_servicos', 'listar_barbeiros',
  'horarios_livres', 'meus_agendamentos', 'agendar', 'reagendar', 'cancelar', 'buscar_pessoa', 'escolher_pessoa', 'cadastrar_terceiro', 'funcionamento'];
const BVG_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BVG_OPC = /^[A-Za-z0-9_-]{1,12}$/;
const BVG_ACOES = { agendar: 'agendar,trocar_servico,agendar_conjunto', reagendar: 'reagendar', cancelar: 'cancelar,cancelar_conjunto', cadastrar_terceiro: 'cadastrar_terceiro' };

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
  if (v.celular !== undefined && !/^\d{10,11}$/.test(String(v.celular))) return ruim('celular');
  for (const k of ['id_opcoes_servicos', 'id_opcoes_agendamentos']) { // o modelo pode mandar "1,2" ou '["1","2"]': aceita e converte; lista vazia = ausente
    if (typeof v[k] === 'string') { try { const j = JSON.parse(v[k]); v[k] = Array.isArray(j) ? j : v[k]; } catch (e) { /* nao e JSON */ } }
    if (typeof v[k] === 'string') v[k] = v[k].split(/[\s,;]+/).filter(Boolean);
    if (Array.isArray(v[k]) && v[k].length === 0) delete v[k];
  }
  for (const k of ['id_opcoes_servicos', 'id_opcoes_agendamentos']) { // FR-008: lista de 2..max_servicos ids curtos
    if (v[k] !== undefined && !(Array.isArray(v[k]) && v[k].length >= 2 && v[k].length <= ((cfg.encadeamento || {}).max_servicos || 3) && v[k].every((x) => BVG_OPC.test(String(x))))) return ruim(k);
  }
  v.contato_id = String(v.contato_id);
  const falta = {
    escolher_cliente: !v.id_opcao,
    listar_barbeiros: !v.id_opcao_servico,
    horarios_livres: !v.data || !(v.id_opcao_barbeiro || v.qualquer || v.id_opcoes_servicos || v.id_opcao || v.id_opcao_agendamento),
    cadastrar_cliente: !v.nome,
    buscar_pessoa: !v.nome || v.nome.length < 3,
    escolher_pessoa: !v.id_opcao,
    cadastrar_terceiro: !(v.proposta_id || v.nome),
    agendar: !(v.id_opcao_horario || v.proposta_id),
    reagendar: !(v.proposta_id || (v.id_opcao_agendamento && v.id_opcao_horario)),
    cancelar: !(v.proposta_id || v.id_opcao_agendamento || v.id_opcoes_agendamentos),
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

const bvgNaoOferecido = () => bvgRecusa('servico_nao_oferecido', 'esse serviço não é oferecido por aqui; ofereça o serviço regular, sem falar em desconto');

function bvgEscritaPermitida(cfg) {
  if (cfg.ambiente === 'producao' || !cfg.redirecionar) {
    return bvgRecusa('escrita_desabilitada', 'agendar por aqui ainda não está liberado; chame a equipe da loja');
  }
  return null;
}

// Cancelar fase 1 (R7): remarcar ou cancelar vai como opcoes; o agendamento escolhido segue no pedido (bvgResolver).
const bvgDecisaoCanc = (resultado, efeitos, cfg) => {
  const of = bvMontarOferta('decisao_cancelamento', [{ rotulo: 'Remarcar', valor: 'remarcar' }, { rotulo: 'Cancelar mesmo', valor: 'cancelar' }], cfg);
  return bvgFim({ ...resultado, opcoes: of.itens.map((x) => ({ id: x.id, rotulo: x.rotulo })), orientacao: 'ofereça remarcar ou cancelar como opções; Remarcar: horarios_livres com o agendamento; Cancelar mesmo: cancelar com o proposta_id' }, { ...efeitos, opcoes: of });
};
const bvgDia = (d) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;
const bvgReais = (v) => (v == null ? '' : ` (R$ ${Number(v).toFixed(2).replace('.', ',')})`);
const bvgSoDigitos = (t) => String(t).replace(/\D/g, '');
// Celular so em digitos, sem DDI 55 (comparacao de terceiro, FR-006/block-003).
const bvgCelular = (t) => { const d = bvgSoDigitos(t == null ? '' : t); return d.length > 11 && d.startsWith('55') ? d.slice(2) : d; };
const bvgNomeNorm = (t) => bvNormalizarDescricao(t).toLowerCase().replace(/\s+/g, ' ').trim();
const bvgSomaMin = (hh, m) => { const t = Number(hh.slice(0, 2)) * 60 + Number(hh.slice(3, 5)) + Number(m); return `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`; };
// Encaminhar a equipe (research Decision 6): pedido.handoff=true ANTES da transferencia (fail-closed); a chamada
// updateAPI {ticketId, queueId} fica no Code node (ticketId do estado da conversa, nunca do modelo) apos a sonda S5.
const bvgEncaminhar = (motivo, operacao, cfg) => bvgFim(
  { ok: false, code: 'encaminhar_equipe', motivo, orientacao: 'responda com o texto de encaminhamento à equipe, sem dar nomes nem detalhes', texto: cfg.textos && cfg.textos.encaminhar_equipe },
  { pedido: { handoff: true }, handoff: { queueId: (cfg.handoff && cfg.handoff.setor_id) || 78 }, falha: { motivo: `encaminhar_equipe|${motivo}`, operacao, code: 'encaminhar_equipe', status: 0, trace: null } });

function bvGPlano(i, ctx0, cfg) {
  const ctx = { pedido: (ctx0 && ctx0.pedido) || {}, opcoes: (ctx0 && ctx0.opcoes) || {}, proposta: ctx0 && ctx0.proposta, info: ctx0 && ctx0.info, dia: (ctx0 && ctx0.dia) || {} };
  const st = { in: i, ctx, meta: { op: i.operacao } };
  const chamar = (reqs, meta = {}) => ({ reqs, st: { ...st, meta: { ...st.meta, ...meta } } });
  const idCliente = ctx.pedido.idCliente;
  if (ctx.pedido.handoff) return bvgFim(bvgRecusa('handoff_ativo', 'conversa transferida para a equipe; não responda mais'));
  const ter = cfg.terceiro || {};
  switch (i.operacao) {
    case 'identificar_cliente':
      return chamar([{ m: 'GET', path: '/agenda/clientes', qs: { celular: bvgSoDigitos(i.telefone) } }]);
    case 'cadastrar_cliente': {
      if (!cfg.cadastroLiberado) return bvgFim(bvgRecusa('cadastro_desabilitado', 'não consigo cadastrar agora; chame a equipe da loja'));
      if (!ctx.pedido.cliente_sem_cadastro) return bvgFim(bvgRecusa('identifique_primeiro', 'identifique o cliente pelo telefone antes de cadastrar'));
      const post = { m: 'POST', path: '/agenda/clientes', body: { nomeCliente: i.nome, ddiCelular: '55', celular: bvgCelular(i.telefone) } };
      // Nome de 2+ palavras: antes do POST, busca o mesmo nome completo com outro celular (nunca cadastra duplicado/mescla).
      if (bvgNomeNorm(i.nome).split(' ').length < 2 || i.nome.length < 3) return chamar([post]);
      return chamar([{ m: 'GET', path: '/agenda/clientes', qs: { busca: i.nome } }], { etapa: 'busca_nome', post });
    }
    case 'buscar_pessoa': {
      if (bvgNomeNorm(i.nome).split(' ').length < 2) return bvgFim(bvgRecusa('nome_incompleto', 'peça o nome e o sobrenome da pessoa'));
      if ((ctx.pedido.buscas_pessoa || 0) >= (ter.buscas_max_sessao ?? 3) || (ctx.dia.buscas || 0) >= (ter.buscas_max_dia ?? 5)) return bvgFim(bvgRecusa('limite_buscas', 'limite de buscas atingido; ofereça chamar a equipe da loja'));
      return chamar([{ m: 'GET', path: '/agenda/clientes', qs: { busca: i.nome } }], { nome: i.nome });
    }
    case 'escolher_pessoa': {
      const c = bvgResolver(i.id_opcao, 'pessoa', ctx);
      if (!c) return bvgFim(bvgOpcaoInvalida());
      if (ctx.pedido.busca_pessoa_turno === i.turno_id) return bvgFim(bvgRecusa('confirmacao_no_mesmo_turno', 'pergunte ao cliente se é essa pessoa e só escolha depois que ele responder'));
      if (!c.mesmo_celular) return bvgEncaminhar('terceiro_outro_celular', 'escolher_pessoa', cfg); // fail-closed: celular ausente conta como diferente; idCliente nao e gravado
      return bvgFim({ ok: true, nome: c.nome }, { pedido: { idCliente_remetente: ctx.pedido.idCliente_remetente || ctx.pedido.idCliente, idCliente: c.idCliente, para_terceiro: true } });
    }
    case 'cadastrar_terceiro': {
      if (i.proposta_id) return bvgFase2(i, ctx, cfg, chamar);
      if (!cfg.terceiroLiberado) return bvgFim(bvgRecusa('cadastro_desabilitado', 'não consigo cadastrar agora; chame a equipe da loja'));
      if (!idCliente) return bvgFim(bvgRecusa('cliente_nao_identificado', 'identifique o cliente primeiro'));
      if (ctx.pedido.cadastro_terceiro_feito || (ctx.dia.cadastros || 0) >= (ter.cadastros_max_dia ?? 1)) return bvgFim(bvgRecusa('limite_cadastros', 'limite de cadastros atingido; chame a equipe da loja'));
      if (!ctx.pedido.terceiro_sem_cadastro || bvgNomeNorm(ctx.pedido.terceiro_sem_cadastro) !== bvgNomeNorm(i.nome)) return bvgFim(bvgRecusa('busque_primeiro', 'busque a pessoa pelo nome (buscar_pessoa) antes de cadastrar'));
      const cel = i.celular || bvgCelular(i.telefone);
      const resumo = `Cadastrar ${i.nome} com o ${i.celular ? 'celular informado' : 'seu celular'}`;
      return bvgFim({ ok: true, aguardando_confirmacao: true, resumo }, { proposta_nova: { acao: 'cadastrar_terceiro', dados: { nome: i.nome, celular: cel, celular_do_remetente: !i.celular }, resumo } });
    }
    case 'escolher_cliente': {
      const c = bvgResolver(i.id_opcao, 'cliente', ctx);
      if (!c) return bvgFim(bvgOpcaoInvalida());
      return bvgFim({ ok: true }, { pedido: { idCliente: c.idCliente, cliente_sem_cadastro: false, cliente_nome: c.primeiroNome } });
    }
    case 'listar_servicos':
    {
      // FR-005: pedido pelo nome "2a vez" busca o regular, sem desconto.
      const t = i.texto ? i.texto.replace(/\b2\s*[ªaºo°]?\s*vez\b/gi, '').replace(/\s+/g, ' ').trim() : '';
      return chamar([{ m: 'GET', path: '/agenda/servicos', qs: t.length >= 3 ? { texto: t } : {} }], { limpou2v: !!i.texto && t !== i.texto });
    }
    case 'listar_barbeiros': {
      const s = bvgResolver(i.id_opcao_servico, 'servico', ctx);
      if (!s) return bvgFim(bvgOpcaoInvalida());
      return chamar([{ m: 'GET', path: '/servicos/profissionais', qs: { idServico: s.idServico } }], { servico: { ...s, opcao_id: i.id_opcao_servico } });
    }
    case 'horarios_livres': {
      if (i.id_opcao) { // FR-012: resposta do cliente a modo_encadeamento (barbeiros diferentes | separados); nunca escolhida pelo modelo
        const modo = bvgResolver(i.id_opcao, 'modo_encadeamento', ctx);
        const ss = ctx.pedido.servicos;
        if (!modo || !Array.isArray(ss) || !ss.length) return bvgFim(bvgOpcaoInvalida());
        if (modo === 'separados') {
          return bvgFim({ ok: true, modo: 'separados', servicos: ss.map((x) => ({ id: x.opcao_id, nome: x.nome })), orientacao: `agende um serviço por vez: comece por ${ss[0].nome} (listar_barbeiros com id_opcao_servico ${ss[0].opcao_id}) e, depois de confirmado, siga para o próximo` }, { opcoes: {}, pedido: { modo_encadeamento: 'separados', servico: ss[0] } });
        }
        return chamar(ss.map((x) => ({ m: 'GET', path: '/servicos/profissionais', qs: { idServico: x.idServico } })), { enc: true, etapa: 'dif_prof', servicos: ss, data: i.data });
      }
      if (i.id_opcoes_servicos) {
        const ss = i.id_opcoes_servicos.map((x) => bvgResolver(x, 'servico', ctx));
        if (ss.some((x) => !x)) return bvgFim(bvgOpcaoInvalida());
        if (ss.some((x) => bvSegundaVez(x.nome))) return bvgFim(bvgNaoOferecido());
        return chamar(ss.map((s) => ({ m: 'GET', path: '/servicos/profissionais', qs: { idServico: s.idServico } })), { enc: true, etapa: 'enc_prof', servicos: ss, data: i.data });
      }
      const ag = i.id_opcao_agendamento ? bvgResolver(i.id_opcao_agendamento, 'agendamento', ctx) : null;
      const s = ag ? { idServico: ag.idServico, nome: ag.servico, opcao_id: 'ag' } : (i.id_opcao_servico ? bvgResolver(i.id_opcao_servico, 'servico', ctx) : ctx.pedido.servico);
      if (!s) return bvgFim(bvgRecusa('servico_nao_escolhido', 'escolha o serviço antes (listar_servicos)'));
      // Reagendar sem barbeiro escolhido: barbeiros do servico do agendamento neste passo (poupa duas rodadas do modelo, R8)
      if (ag && !i.id_opcao_barbeiro) return chamar([{ m: 'GET', path: '/servicos/profissionais', qs: { idServico: s.idServico } }], { etapa: 'ag_prof', servico: s, qualquer: true, data: i.data });
      // FR-002/FR-012: defesa extra, o barbeiro de teste nunca entra na uniao nem se vier no pedido.
      const bs = bvFiltrarBarbeiros(i.qualquer ? (ctx.pedido.barbeiros || []) : [bvgResolver(i.id_opcao_barbeiro, 'barbeiro', ctx)].filter(Boolean), cfg.testeId);
      if (!bs.length) return bvgFim(i.qualquer ? bvgRecusa('barbeiros_nao_listados', 'chame listar_barbeiros antes') : bvgOpcaoInvalida());
      const reqs = bs.slice(0, 10).map((b) => ({ m: 'GET', path: '/agenda/horarios-livres', qs: { idServico: s.idServico, idProfissional: b.idProfissional, data: i.data } }));
      return chamar(reqs, { servico: s, barbeiros: bs.slice(0, 10), qualquer: !!i.qualquer, data: i.data });
    }
    case 'funcionamento': // horario da loja por dia da semana (graces-api/03 GET /agenda/configuracao), so leitura
      return chamar([{ m: 'GET', path: '/agenda/configuracao' }]);
    case 'meus_agendamentos':
      // Sem cliente na sessao: identifica pelo telefone neste passo (poupa uma rodada do modelo, R8)
      if (!idCliente && !ctx.pedido.cliente_sem_cadastro) return chamar([{ m: 'GET', path: '/agenda/clientes', qs: { celular: bvgSoDigitos(i.telefone) } }], { etapa: 'ident' });
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
  const sq = i.operacao === 'agendar' && i.id_opcao_horario ? bvgResolver(i.id_opcao_horario, 'sequencia', ctx) : null;
  if (sq) { // FR-008: um POST por servico, em sequencia, confirmados num unico resumo
    if (i.substitui_id_opcao_agendamento || sq.itens.some((x) => x.idProfissional === cfg.testeId)) return bvgFim(bvgOpcaoInvalida());
    if (sq.itens.some((x) => bvSegundaVez(x.servico))) return bvgFim(bvgNaoOferecido());
    const itens = sq.itens.map((x, k) => ({ ordem: k + 1, idServico: x.idServico, servico: x.servico, idProfissional: x.idProfissional, barbeiro: x.apelido, data: sq.data, hora: x.hora, minutos: x.minutos, valor: x.valor }));
    const mesmo = itens.every((x) => x.idProfissional === itens[0].idProfissional);
    const resumo = mesmo ? `${itens.map((x) => `${x.servico} às ${x.hora}${bvgReais(x.valor)}`).join(' + ')} com ${itens[0].barbeiro} em ${bvgDia(sq.data)}`
      : `${itens.map((x) => `${x.servico} às ${x.hora} com ${x.barbeiro}${bvgReais(x.valor)}`).join(' + ')} em ${bvgDia(sq.data)}`;
    return bvgFim({ ok: true, aguardando_confirmacao: true, resumo }, { proposta_nova: { acao: 'agendar_conjunto', dados: { idCliente: ctx.pedido.idCliente, itens }, resumo } });
  }
  if (i.operacao === 'cancelar' && i.id_opcoes_agendamentos) {
    const ags = i.id_opcoes_agendamentos.map((x) => bvgResolver(x, 'agendamento', ctx));
    if (ags.some((a) => !a)) return bvgFim(bvgOpcaoInvalida());
    if (ags.some((a) => a.idProfissional !== cfg.testeId)) return bvgFim(fora);
    const itens = ags.map((a, k) => ({ ordem: k + 1, idAgenda: a.idAgenda, horaInicio: a.horaInicio, recorrente: !!a.recorrente, servico: a.servico }));
    const resumo = `Cancelar ${itens.map((x) => `${x.servico} em ${bvgDia(x.horaInicio)} às ${x.horaInicio.slice(11, 16)}`).join(' e ')}`;
    return bvgDecisaoCanc({ ok: true, aguardando_confirmacao: true, sugerir_remarcar: true, resumo }, { proposta_nova: { acao: 'cancelar_conjunto', dados: { itens, resumo }, resumo } }, cfg);
  }
  const ag = i.id_opcao_agendamento ? bvgResolver(i.id_opcao_agendamento, 'agendamento', ctx) : null;
  const h = i.id_opcao_horario ? bvgResolver(i.id_opcao_horario, 'horario', ctx) : null;
  const antigo = i.substitui_id_opcao_agendamento ? bvgResolver(i.substitui_id_opcao_agendamento, 'agendamento', ctx) : null;
  const ag0 = (antigo || ag);
  if (ag0 && ag0.idProfissional !== cfg.testeId) return bvgFim(fora); // nunca altera agenda de barbeiro real
  if (h && h.idProfissional === cfg.testeId) return bvgFim(bvgOpcaoInvalida()); // FR-012: o modelo nao escolhe o de teste
  const alvo = i.operacao === 'reagendar' ? ag : h; // serviço que seria escrito; cancelar segue permitido
  if (i.operacao !== 'cancelar' && alvo && bvSegundaVez(alvo.servico)) return bvgFim(bvgNaoOferecido()); // FR-005
  const agAnt = { idAgenda: ag0 && ag0.idAgenda, horaInicio: ag0 && ag0.horaInicio, recorrente: !!(ag0 && ag0.recorrente) };
  if (i.operacao === 'agendar') {
    if (!h || (i.substitui_id_opcao_agendamento && !antigo)) return bvgFim(bvgOpcaoInvalida());
    const dados = { idCliente: ctx.pedido.idCliente, idServico: h.idServico, servico: h.servico, idProfissional: h.idProfissional, barbeiro: h.apelido, data: h.data, hora: h.hora, valor: h.preco, minutos: h.minutos };
    if (antigo) dados.antigo = agAnt;
    const resumo = `${antigo ? 'Trocar serviço: ' : ''}${h.servico} com ${h.apelido} em ${bvgDia(h.data)} às ${h.hora}${bvgReais(h.preco)}`;
    return bvgFim({ ok: true, aguardando_confirmacao: true, resumo }, { proposta_nova: { acao: antigo ? 'trocar_servico' : 'agendar', dados, resumo } });
  }
  if (!ag) return bvgFim(bvgOpcaoInvalida());
  if (i.operacao === 'reagendar') {
    if (!h) return bvgFim(bvgOpcaoInvalida());
    if (h.idServico !== ag.idServico) return bvgFim(bvgRecusa('servico_diferente', 'os horários são de outro serviço; consulte horarios_livres com este agendamento'));
    const dados = { ...agAnt, idServico: ag.idServico, servico: ag.servico, idProfissional: h.idProfissional, barbeiro: h.apelido, data: h.data, hora: h.hora, minutos: h.minutos };
    const resumo = `Remarcar ${ag.servico} de ${bvgDia(ag.horaInicio)} ${ag.horaInicio.slice(11, 16)} para ${bvgDia(h.data)} às ${h.hora} com ${h.apelido}`;
    return bvgFim({ ok: true, aguardando_confirmacao: true, resumo }, { proposta_nova: { acao: 'reagendar', dados, resumo } });
  }
  const resumo = `Cancelar ${ag.servico} em ${bvgDia(ag.horaInicio)} às ${ag.horaInicio.slice(11, 16)} com ${ag.profissional}`;
  return bvgDecisaoCanc({ ok: true, aguardando_confirmacao: true, sugerir_remarcar: true, resumo }, { proposta_nova: { acao: 'cancelar', dados: { ...agAnt, servico: ag.servico, barbeiro: ag.profissional, resumo }, resumo } }, cfg);
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
  if (p.acao !== 'cancelar' && bvSegundaVez(d.servico)) return bvgFim(bvgNaoOferecido(), { proposta_upd: { id: p.id, estado: 'falhou', resultado: { ok: false, code: 'servico_nao_oferecido' } } });
  const prof = cfg.redirecionar ? cfg.testeId : d.idProfissional; // research Decision 10: toda escrita vai ao barbeiro de teste
  const meta = { fase2: true, proposta: p, prof, redir: !!cfg.redirecionar };
  if (p.acao === 'cadastrar_terceiro') {
    if (!cfg.terceiroLiberado) return bvgFim(bvgRecusa('cadastro_desabilitado', 'não consigo cadastrar agora; chame a equipe da loja'), { proposta_upd: { id: p.id, estado: 'falhou', resultado: { ok: false, code: 'cadastro_desabilitado' } } });
    return chamar([{ m: 'POST', path: '/agenda/clientes', body: { nomeCliente: d.nome, ddiCelular: '55', celular: d.celular } }], { ...meta, etapa: 'cadastro' });
  }
  if (p.acao === 'agendar_conjunto') {
    if ((d.itens || []).some((x) => bvSegundaVez(x.servico))) return bvgFim(bvgNaoOferecido(), { proposta_upd: { id: p.id, estado: 'falhou', resultado: { ok: false, code: 'servico_nao_oferecido' } } });
    return chamar(d.itens.map((x) => ({ m: 'GET', path: '/agenda/horarios-livres', qs: { idServico: x.idServico, idProfissional: bvgProfDe(x, meta), data: x.data } })), { ...meta, etapa: 'reval_c', res: [] });
  }
  if (p.acao === 'cancelar_conjunto') return chamar([bvgReqItem(p, 0, meta)], { ...meta, etapa: 'escrita_c', k: 0, res: [] });
  if (p.acao === 'cancelar') {
    return chamar([{ m: 'DELETE', path: `/agenda/${d.idAgenda}`, qs: d.recorrente ? { data: String(d.horaInicio).slice(0, 10) } : {} }], { ...meta, etapa: 'escrita' });
  }
  // reval + linha de base de agendamentos (Decision 8); idCliente so do pedido/proposta (FR-020)
  const ic = d.idCliente || ctx.pedido.idCliente;
  const reqs = [{ m: 'GET', path: '/agenda/horarios-livres', qs: { idServico: d.idServico, idProfissional: prof, data: d.data } }];
  if (ic) reqs.push({ m: 'GET', path: '/agenda/agendamentos', qs: { idCliente: ic, proximos: true } });
  return chamar(reqs, { ...meta, etapa: 'reval', idCliente: ic });
}

// Requisicao do item k de um conjunto (POST por servico ou DELETE por agendamento).
// Barbeiro do item: redirecionado (TESTE) vai ao de teste; senao o do proprio item (barbeiros diferentes por servico, FR-012).
const bvgProfDe = (x, meta) => (meta.redir ? meta.prof : (x.idProfissional || meta.prof));
function bvgReqItem(p, k, meta) {
  const x = p.dados.itens[k];
  if (p.acao === 'cancelar_conjunto') return { m: 'DELETE', path: `/agenda/${x.idAgenda}`, qs: x.recorrente ? { data: String(x.horaInicio).slice(0, 10) } : {} };
  return { m: 'POST', path: '/agenda', body: { idCliente: p.dados.idCliente, idServico: x.idServico, idProfissional: bvgProfDe(x, meta), data: x.data, horaInicio: x.hora, idIntegracao: `bv-${String(p.id).slice(0, 8)}-${x.ordem}` } };
}

// Efeito `mensagens` (research D3): o que programar/cancelar nas mensagens agendadas apos escrita bem-sucedida na Graces.
// shortcut: sem `minutos` o fim vale o inicio (pos-atendimento sai 1 h apos o inicio); upgrade: ler horaFim do GET.
function bvgItemMsg(idAgenda, x, idCliente, prof) {
  const hora = x.hora, fim = Number(x.minutos) > 0 ? bvgSomaMin(hora, x.minutos) : hora;
  return { idAgenda, idCliente, idProfissional: prof, inicio: `${x.data}T${hora}:00`, fim: `${x.data}T${fim}:00`, servico: x.servico, barbeiro: x.barbeiro || x.apelido, recorrente: !!x.recorrente };
}
function bvgMsgs(p, meta, novoId) {
  const d = p.dados || {}, ic = d.idCliente || meta.idCliente;
  const canc = (id, motivo) => ({ idAgenda: id, motivo });
  if (p.acao === 'agendar') return novoId ? { criar: [bvgItemMsg(novoId, d, ic, meta.prof)], cancelar: [] } : null;
  if (p.acao === 'trocar_servico') return novoId ? { criar: [bvgItemMsg(novoId, d, ic, meta.prof)], cancelar: [canc(d.antigo.idAgenda, 'cancelada_agente')] } : null;
  if (p.acao === 'reagendar') return { criar: [bvgItemMsg(d.idAgenda, d, ic, meta.prof)], cancelar: [canc(d.idAgenda, 'reagendada')] };
  if (p.acao === 'cancelar') return { criar: [], cancelar: [canc(d.idAgenda, 'cancelada_agente')] };
  return null;
}

const bvgResp = (r) => ({ status: Number((r && r.status) || 0), body: r && r.body });

// FR-009: reacao decidida SO pelo `code` (research Decision 9); `detail` nunca e lido. Status so separa "sem resposta".
const BVG_PARAM = ['parametro_invalido', 'data fora das regras da loja ou opção inválida; ofereça alternativas'];
const BVG_CONFIG = ['configuracao', 'a agenda está indisponível agora; ofereça chamar a equipe da loja'];
const BVG_CODES = {
  PARAMETRO_INVALIDO: BVG_PARAM, CORPO_INVALIDO: BVG_PARAM,
  NAO_AUTENTICADO: BVG_CONFIG, LOJA_FORA_ESCOPO: BVG_CONFIG, ACESSO_NEGADO: BVG_CONFIG,
  NAO_ENCONTRADO: ['nao_encontrado', 'não encontrei isso na agenda; recarregue a lista correspondente e pergunte de novo'],
  CONFLITO: ['conflito', 'esse horário foi ocupado; recarregue a grade e ofereça outra opção'],
};

function bvGErro(resp, op) {
  const s = resp.status || 0;
  const b = resp.body && typeof resp.body === 'object' ? resp.body : {};
  const code = String(b.code || (s ? `HTTP_${s}` : 'SEM_RESPOSTA')).replace(/[^\w.-]/g, '').slice(0, 60);
  const trace = /^[\w.-]{1,80}$/.test(String(b.traceId || '')) ? String(b.traceId) : null;
  const incerto = s === 0 || s >= 500;
  const conhecido = Object.prototype.hasOwnProperty.call(BVG_CODES, b.code) ? BVG_CODES[b.code] : null;
  const tipo = conhecido ? conhecido[0] : incerto ? 'sem_resposta' : 'code_desconhecido';
  let orientacao = conhecido ? conhecido[1]
    : incerto ? 'a agenda não respondeu; não repita sozinho, confira com meus_agendamentos'
      : 'não consegui concluir na agenda agora; ofereça chamar a equipe da loja, sem repetir a mesma chamada';
  if (tipo === 'parametro_invalido' && op === 'horarios_livres') orientacao = 'dia fechado ou fora do prazo; sugira outro dia';
  return { code, status: s, trace, incerto, tipo, orientacao, falha: { motivo: `graces|${tipo}`, operacao: op, code, status: s, trace } };
}

// Laco de estagios (FR-015): conta o estagio e encerra acima de graces.max_estagios sem nova chamada.
function bvGPasso(st, resps0, cfg) {
  const n = ((st && st.estagio) || 0) + 1;
  const teto = (cfg.graces || {}).max_estagios || 16;
  if (n > teto) return bvgFim({ ok: false, code: 'estagios_esgotados', orientacao: 'a agenda não concluiu a tempo; não repita sozinho, confira com meus_agendamentos ou chame a equipe da loja' }, { falha: { motivo: 'graces|estagios_esgotados', operacao: st && st.meta && st.meta.op, code: 'estagios_esgotados', status: 0, trace: null } });
  const r = bvgPassoUm({ ...st, estagio: n }, resps0, cfg);
  return r.reqs ? { ...r, st: { ...r.st, estagio: n } } : r;
}

// Um estagio depois das chamadas HTTP (bvGPasso conta o estagio e aplica o teto do laco). st vem do estagio anterior; resps alinhado a st.reqs.
function bvgPassoUm(st, resps0, cfg) {
  const { in: i, ctx, meta } = st;
  const resps = (resps0 || []).map(bvgResp);
  const r0 = resps[0] || { status: 0 };
  const ok200 = (r) => r.status >= 200 && r.status < 300;
  const falha = (op, r, extra = {}) => { const e = bvGErro(r, op); return bvgFim({ ok: false, code: e.code, orientacao: e.orientacao, ...extra }, { falha: e.falha }); };
  if (meta.fase2) return bvgPassoEscrita(st, resps, cfg);
  const op = meta.op;
  if (meta.enc) {
    const ruim = resps.find((r) => !ok200(r));
    return ruim ? falha(op, ruim) : bvgPassoEnc(st, resps, cfg);
  }
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
    case 'cadastrar_cliente': {
      if (meta.etapa === 'busca_nome') { // mesmo nome completo com outro celular: nao cadastra, encaminha (Decision 6)
        const nome = bvgNomeNorm(i.nome), meu = bvgCelular(i.telefone);
        const homonimo = lista.some((c) => c && bvgNomeNorm(`${c.nomeCliente || ''} ${c.sobrenomeCliente || ''}`) === nome && bvgCelular(c.celular) !== meu);
        return homonimo ? bvgEncaminhar('nome_outro_celular', 'cadastrar_cliente', cfg) : { reqs: [meta.post], st: { ...st, meta: { ...meta, etapa: 'post' } } };
      }
      return r0.body && r0.body.idCliente ? bvgFim({ ok: true }, { pedido: { idCliente: r0.body.idCliente, cliente_sem_cadastro: false } }) : falha(op, { status: 500 });
    }
    case 'buscar_pessoa': {
      // Rotulo so com nome e sobrenome; o celular da resposta so vira o booleano mesmo_celular (nunca chega ao modelo).
      const meu = bvgCelular(i.telefone);
      const ps = lista.filter((c) => c && c.idCliente).map((c) => ({ idCliente: c.idCliente, nome: `${c.nomeCliente || ''} ${c.sobrenomeCliente || ''}`.trim(), mesmo_celular: !!meu && bvgCelular(c.celular) === meu }));
      const reg = { motivo: 'busca_pessoa', operacao: 'buscar_pessoa', code: 'OK', status: 200, trace: null }; // contador diario (buscas_max_dia)
      const pedido = { buscas_pessoa: (ctx.pedido.buscas_pessoa || 0) + 1, busca_pessoa_turno: i.turno_id };
      if (!ps.length) return bvgFim({ ok: true, pessoas: [], orientacao: 'não achei; proponha cadastrar (cadastrar_terceiro)' }, { pedido: { ...pedido, terceiro_sem_cadastro: i.nome }, falha: reg });
      if (ps.length > cfg.lista.max_itens) return bvgFim({ ok: true, pessoas: [], orientacao: 'muitos resultados; peça o nome completo' }, { pedido, falha: reg });
      const of = bvMontarOferta('pessoa', ps.map((x) => ({ rotulo: x.nome, valor: x })), cfg);
      return bvgFim({ ok: true, pessoas: of.itens.map((x) => ({ id: x.id, nome: x.rotulo })), orientacao: 'pergunte se é essa pessoa; só use escolher_pessoa depois da resposta do cliente' }, { opcoes: of, pedido, falha: reg });
    }
    case 'listar_servicos': {
      const ss = bvFiltrarServicos(lista.filter((s) => s && s.ativo !== false).map((s) => ({ ...s, nome: String(s.descricaoAgenda || '') })));
      const of = bvMontarOferta('servico', ss.map((s) => ({ rotulo: s.nome, valor: { idServico: s.idServico, nome: s.nome, preco: s.valorPadrao, minutos: s.tempoPadrao } })), cfg);
      const orientacao = meta.limpou2v ? 'ofereça o serviço regular, sem falar em desconto' : ss.length > of.itens.length ? 'há mais serviços; peça ao cliente um termo para filtrar' : undefined;
      return bvgFim({ ok: true, total: ss.length, servicos: of.itens.map((x) => ({ id: x.id, nome: x.valor.nome, preco: x.valor.preco })), orientacao }, { opcoes: of });
    }
    case 'listar_barbeiros': {
      const bs = bvFiltrarBarbeiros(lista.map((b) => ({ id: b.idProfissional, apelido: String(b.apelido || '').trim(), nome: b.nomeCompleto })), cfg.testeId);
      const of = bvMontarOferta('barbeiro', bs.map((b) => ({ rotulo: b.apelido, valor: { idProfissional: b.id, apelido: b.apelido } })), cfg);
      return bvgFim({ ok: true, barbeiros: of.itens.map((x) => ({ id: x.id, nome: x.rotulo })), orientacao: of.itens.length ? undefined : 'nenhum barbeiro disponível para este serviço' },
        { opcoes: of, pedido: { servico: meta.servico, barbeiros: of.itens.map((x) => ({ opcao_id: x.id, ...x.valor })), horario: null } });
    }
    case 'horarios_livres': {
      if (meta.etapa === 'ag_prof') {
        const bs = bvFiltrarBarbeiros(lista.map((b) => ({ idProfissional: b.idProfissional, apelido: String(b.apelido || '').trim(), nome: b.nomeCompleto })), cfg.testeId).slice(0, 10);
        if (!bs.length) return bvgFim({ ok: true, total: 0, orientacao: 'nenhum barbeiro disponível para este serviço' });
        const reqs = bs.map((b) => ({ m: 'GET', path: '/agenda/horarios-livres', qs: { idServico: meta.servico.idServico, idProfissional: b.idProfissional, data: meta.data } }));
        return { reqs, st: { ...st, meta: { ...meta, etapa: null, barbeiros: bs } } };
      }
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
      }), cfg, true); // FR-001: oferta completa; o Compor divide em listas
      const res = { ok: true, data: meta.data, total: horas.length, completa: true, opcoes: of.itens.map((x) => ({ id: x.id, hora: x.valor.hora, barbeiro: x.valor.apelido })) };
      if (!horas.length) res.orientacao = 'dia lotado; sugira outro dia';
      return bvgFim(res, { opcoes: of, pedido: { servico: s } });
    }
    case 'funcionamento': {
      const hs = (r0.body && Array.isArray(r0.body.horarios) ? r0.body.horarios : []).filter((h) => h && h.dia)
        .map((h) => ({ dia: String(h.dia), abre: String(h.horaInicio || ''), fecha: String(h.horaFim || '') }));
      return bvgFim({ ok: true, horarios: hs, orientacao: hs.length ? 'dia fora da lista: diga que não tem essa informação e passe os contatos da loja' : 'sem horário de funcionamento; passe os contatos da loja' });
    }
    case 'meus_agendamentos': {
      if (meta.etapa === 'ident') { // 0 ou varios cadastros: devolve a propria identificacao (pedir nome | escolher_cliente)
        const id = bvgPassoUm({ ...st, meta: { op: 'identificar_cliente' } }, resps0, cfg);
        const ped = id.final.efeitos.pedido;
        if (!ped.idCliente) return id;
        return { reqs: [{ m: 'GET', path: '/agenda/agendamentos', qs: { idCliente: ped.idCliente, proximos: true } }], st: { ...st, meta: { ...meta, etapa: null, ident: ped } } };
      }
      const ags = lista.filter((a) => a && a.idAgenda && (cfg.ambiente !== 'producao' || (a.idProfissional !== cfg.testeId && !/\bteste\b/i.test(String(a.profissional || '')))));
      const of = bvMontarOferta('agendamento', ags.map((a) => ({
        rotulo: `${bvgDia(String(a.horaInicio))} ${String(a.horaInicio).slice(11, 16)} ${a.descricaoServico || ''}`.trim(),
        valor: { idAgenda: a.idAgenda, horaInicio: a.horaInicio, idServico: a.idServico, servico: a.descricaoServico, idProfissional: a.idProfissional, profissional: String(a.profissional || '').trim(), recorrente: !!a.recorrente },
      })), cfg);
      const ident = meta.ident ? { nome: meta.ident.cliente_nome } : {};
      return bvgFim({ ok: true, ...ident, agendamentos: of.itens.map((x) => ({ id: x.id, servico: x.valor.servico, barbeiro: x.valor.profissional, inicio: x.valor.horaInicio })), orientacao: of.itens.length ? undefined : 'nenhum agendamento futuro' }, { opcoes: of, pedido: { ...(meta.ident || {}), agendamentos: of.itens.map((x) => ({ opcao_id: x.id, ...x.valor })) } });
    }
    default:
      return falha(op, { status: 500 });
  }
}

// Encadeamento (FR-008/FR-012, Decision 7): so inicios presentes nas grades de cada servico, em sequencia, com o mesmo barbeiro.
function bvgPassoEnc(st, resps, cfg) {
  const { meta } = st;
  const n = meta.servicos.length;
  const pedido = { servicos: meta.servicos.map((s, k) => ({ opcao_id: String(k + 1), idServico: s.idServico, nome: s.nome, preco: s.preco })) };
  const semUnico = () => {
    const of = bvMontarOferta('modo_encadeamento', [{ rotulo: 'Barbeiros diferentes', valor: 'barbeiros_diferentes' }, { rotulo: 'Agendar separado', valor: 'separados' }], cfg);
    return bvgFim({ ok: true, sem_barbeiro_unico: true, opcoes: of.itens.map((x) => ({ id: x.id, rotulo: x.rotulo })), orientacao: 'nenhum barbeiro faz todos os serviços em sequência; pergunte por opção se prefere barbeiros diferentes ou agendar separado' }, { opcoes: of, pedido });
  };
  if (meta.etapa === 'enc_prof') {
    const sets = meta.servicos.map((_, k) => bvFiltrarBarbeiros((Array.isArray(resps[k].body) ? resps[k].body : []).map((b) => ({ id: b.idProfissional, apelido: String(b.apelido || '').trim(), nome: b.nomeCompleto })), cfg.testeId));
    const teto = Math.max(1, Math.floor(((cfg.graces || {}).max_consultas_estagio || 20) / n));
    const comuns = sets[0].filter((b) => sets.every((x) => x.some((y) => y.id === b.id))).slice(0, teto);
    if (!comuns.length) return semUnico();
    const reqs = comuns.flatMap((b) => meta.servicos.map((s) => ({ m: 'GET', path: '/agenda/horarios-livres', qs: { idServico: s.idServico, idProfissional: b.id, data: meta.data } })));
    return { reqs, st: { ...st, meta: { ...meta, etapa: 'enc_grade', barbeiros: comuns } } };
  }
  if (meta.etapa === 'dif_prof') return bvgDifProf(st, resps, cfg);
  if (meta.etapa === 'dif_grade') return bvgDifGrade(st, resps, cfg);
  const seqs = [];
  meta.barbeiros.forEach((b, bi) => {
    const gr = meta.servicos.map((_, k) => resps[bi * n + k].body || {});
    (Array.isArray(gr[0].horarios) ? gr[0].horarios : []).forEach((ini) => {
      let t = ini;
      const itens = [];
      for (let k = 0; k < n; k++) {
        const g = gr[k], s = meta.servicos[k];
        if (!Array.isArray(g.horarios) || !g.horarios.includes(t) || !(Number(g.minutos) > 0)) break;
        itens.push({ idServico: s.idServico, servico: s.nome, idProfissional: b.id, apelido: b.apelido, hora: t, minutos: g.minutos, valor: s.preco });
        t = bvgSomaMin(t, g.minutos);
      }
      if (itens.length === n) seqs.push({ hora: ini, apelido: b.apelido, valor: { data: meta.data, itens } });
    });
  });
  if (!seqs.length) return semUnico();
  seqs.sort((x, y) => (x.hora < y.hora ? -1 : x.hora > y.hora ? 1 : 0));
  const of = bvMontarOferta('sequencia', seqs.map((q) => ({ rotulo: `${q.hora} ${q.apelido}`, valor: q.valor })), cfg, true);
  return bvgFim({ ok: true, data: meta.data, total: seqs.length, completa: true, opcoes: of.itens.map((x) => ({ id: x.id, hora: x.valor.itens[0].hora, barbeiro: x.valor.itens[0].apelido })) },
    { opcoes: of, pedido: { ...pedido, modo_encadeamento: 'mesmo_barbeiro' } });
}

// Barbeiros diferentes por servico (FR-012): primeiro barbeiro, na ordem de listar_barbeiros, que tem o inicio exato (fim do anterior) na grade.
function bvgDifProf(st, resps, cfg) {
  const { meta } = st;
  const n = meta.servicos.length;
  const teto = Math.max(1, Math.floor(((cfg.graces || {}).max_consultas_estagio || 20) / n));
  const sets = meta.servicos.map((_, k) => bvFiltrarBarbeiros((Array.isArray(resps[k].body) ? resps[k].body : []).map((b) => ({ id: b.idProfissional, apelido: String(b.apelido || '').trim(), nome: b.nomeCompleto })), cfg.testeId).slice(0, teto));
  if (sets.some((x) => !x.length)) return bvgFim(bvgRecusa('sem_barbeiro_servico', 'nenhum barbeiro disponível para um dos serviços; ofereça chamar a equipe da loja'));
  const reqs = sets.flatMap((bs, k) => bs.map((b) => ({ m: 'GET', path: '/agenda/horarios-livres', qs: { idServico: meta.servicos[k].idServico, idProfissional: b.id, data: meta.data } })));
  return { reqs, st: { ...st, meta: { ...meta, etapa: 'dif_grade', sets } } };
}

function bvgDifGrade(st, resps, cfg) {
  const { meta } = st;
  const pedido = { servicos: meta.servicos.map((s, k) => ({ opcao_id: String(k + 1), idServico: s.idServico, nome: s.nome, preco: s.preco })), modo_encadeamento: 'barbeiros_diferentes' };
  let o = 0;
  const grades = meta.sets.map((bs) => bs.map((b) => { const r = resps[o++].body || {}; return { b, horarios: Array.isArray(r.horarios) ? r.horarios : [], minutos: Number(r.minutos) }; }));
  const inicios = [...new Set(grades[0].flatMap((g) => g.horarios))].sort();
  const seqs = [];
  inicios.forEach((ini) => {
    let t = ini;
    const itens = [];
    for (let k = 0; k < meta.servicos.length; k++) {
      const g = grades[k].find((x) => x.minutos > 0 && x.horarios.includes(t));
      if (!g) break;
      const s = meta.servicos[k];
      itens.push({ idServico: s.idServico, servico: s.nome, idProfissional: g.b.id, apelido: g.b.apelido, hora: t, minutos: g.minutos, valor: s.preco });
      t = bvgSomaMin(t, g.minutos);
    }
    if (itens.length === meta.servicos.length) seqs.push({ hora: ini, apelidos: [...new Set(itens.map((x) => x.apelido))], valor: { data: meta.data, itens } });
  });
  if (!seqs.length) return bvgFim({ ok: true, data: meta.data, total: 0, completa: true, opcoes: [], orientacao: 'nenhuma sequência cabe nesse dia, nem com barbeiros diferentes; ofereça outro dia ou agendar cada serviço separado' }, { pedido });
  const of = bvMontarOferta('sequencia', seqs.map((q) => ({ rotulo: `${q.hora} ${q.apelidos.join(' e ')}`, valor: q.valor })), cfg, true);
  return bvgFim({ ok: true, data: meta.data, total: seqs.length, completa: true, barbeiros_diferentes: true, opcoes: of.itens.map((x) => ({ id: x.id, hora: x.valor.itens[0].hora, barbeiros: x.valor.itens.map((i) => i.apelido) })) }, { opcoes: of, pedido });
}

// Conjunto (Decision 10): escrita em ordem; para no primeiro item que falha; nunca recria item criado.
// shortcut: item incerto de conjunto nao e verificado nem repetido (vira `incerta`); upgrade: reusar a verificacao da Decision 8 por item.
function bvgPassoConjunto(st, r0, cfg) {
  const { meta } = st;
  const p = meta.proposta, itens = p.dados.itens, k = meta.k;
  const cancela = p.acao === 'cancelar_conjunto';
  const ok = r0.status >= 200 && r0.status < 300 && !(r0.body && r0.body.sucesso === false);
  const e = ok ? null : bvGErro(r0, p.acao);
  const res = [...meta.res, ok ? { ordem: k + 1, estado: 'criado', idAgenda: (r0.body && r0.body.idAgenda) || itens[k].idAgenda } : { ordem: k + 1, estado: e.incerto ? 'incerto' : 'falhou', code: e.code, trace_id: e.trace }];
  if (ok && k + 1 < itens.length) return { reqs: [bvgReqItem(p, k + 1, meta)], st: { ...st, meta: { ...meta, k: k + 1, res } } };
  const hora = (x) => (cancela ? String(x.horaInicio).slice(11, 16) : x.hora);
  const criados = itens.filter((_, j) => res[j] && res[j].estado === 'criado').map((x) => ({ servico: x.servico, hora: hora(x) }));
  const faltaram = itens.filter((_, j) => !res[j] || res[j].estado !== 'criado').map((x) => ({ servico: x.servico }));
  const msgs = cancela ? { criar: [], cancelar: itens.filter((_, j) => res[j] && res[j].estado === 'criado').map((x) => ({ idAgenda: x.idAgenda, motivo: 'cancelada_agente' })) }
    : { criar: itens.map((x, j) => (res[j] && res[j].estado === 'criado' ? bvgItemMsg(res[j].idAgenda, x, p.dados.idCliente, bvgProfDe(x, meta)) : null)).filter(Boolean), cancelar: [] };
  const fim = (estado, resultado, extra = {}) => bvgFim({ ...resultado, criados, faltaram }, { ...extra, mensagens: msgs, proposta_upd: { id: p.id, estado, resultado: { ok: !!resultado.ok, code: resultado.code, itens: res } } });
  if (ok) return fim('executada', { ok: true }, { opcoes: {}, pedido: { servico: null, barbeiros: null, horario: null, agendamentos: null, faltantes: null } });
  const falha = { ...e.falha, motivo: criados.length ? 'conjunto_parcial' : e.falha.motivo, operacao: p.acao };
  if (e.incerto) return fim('incerta', { ok: false, code: 'incerta', orientacao: 'a agenda não respondeu num dos itens; avise o cliente, não repita e confira com meus_agendamentos' }, { falha: { ...falha, motivo: 'graces|escrita_incerta' } });
  if (!criados.length) return fim('falhou', { ok: false, code: e.code, orientacao: e.orientacao }, { falha });
  // FR-009/FR-011: CONFLITO no meio nao recria nem cancela o que foi criado; recarregar a grade so dos servicos que faltaram
  const orientacao = 'conjunto parcial: diga o que foi agendado e o que não foi; não recrie nem cancele o que existe; ofereça nova tentativa só para o que faltou (horarios_livres do serviço restante)';
  const pend = itens.filter((_, j) => !res[j] || res[j].estado !== 'criado').map((x) => ({ idServico: x.idServico, nome: x.servico, preco: x.valor }));
  return fim('parcial', { ok: false, code: 'conjunto_parcial', orientacao }, { falha, opcoes: {}, pedido: { horario: null, faltantes: cancela ? null : pend } });
}

// Escrita incerta (Decision 8): status 0/5xx -> relê agendamentos e compara; no maximo 1 repeticao; nunca terceira escrita.
const bvgNumAgenda = (lista) => (Array.isArray(lista) ? lista : []).filter((a) => a && a.idAgenda);
function bvgAplicada(p, d, meta, lista) {
  const ags = bvgNumAgenda(lista);
  if (p.acao === 'cancelar') return !ags.some((a) => a.idAgenda === d.idAgenda);
  const ini = `${d.data}T${d.hora}`;
  if (p.acao === 'reagendar') return ags.some((a) => a.idAgenda === d.idAgenda && String(a.horaInicio).startsWith(ini));
  return ags.some((a) => !(meta.base || []).includes(a.idAgenda) && a.idServico === d.idServico && a.idProfissional === meta.prof && String(a.horaInicio).startsWith(ini));
}

function bvgPassoEscrita(st, resps, cfg) {
  const { meta } = st;
  const p = meta.proposta, d = p.dados || {};
  const r0 = resps[0] || { status: 0 };
  const sucesso2xx = (r) => r.status >= 200 && r.status < 300 && !(r.body && r.body.sucesso === false);
  const ok = sucesso2xx(r0);
  const limpa = { opcoes: {}, pedido: { servico: null, barbeiros: null, horario: null, agendamentos: null } };
  const termina = (estado, resultado, extra = {}) => bvgFim(resultado, { ...extra, proposta_upd: { id: p.id, estado, resultado: { ok: !!resultado.ok, code: resultado.code } } });
  const err = (op, r) => { const e = bvGErro(r, op); return { e, f: e.falha }; };
  const prox = (etapa, reqs, extra = {}) => ({ reqs, st: { ...st, meta: { ...meta, etapa, ...extra } } });
  if (meta.etapa === 'cadastro') {
    if (ok && r0.body && r0.body.idCliente) {
      const ped = (st.ctx && st.ctx.pedido) || {};
      return termina('executada', { ok: true, cadastrado: true }, { pedido: { idCliente: r0.body.idCliente, idCliente_remetente: ped.idCliente_remetente || ped.idCliente, para_terceiro: true, terceiro_sem_cadastro: null, cadastro_terceiro_feito: true } });
    }
    const { e, f } = err('cadastrar_terceiro', ok ? { status: 500 } : r0);
    return termina(e.incerto ? 'incerta' : 'falhou', { ok: false, code: e.incerto ? 'incerta' : e.code, orientacao: e.orientacao }, { falha: f });
  }
  if (meta.etapa === 'reval_c') {
    const itens = p.dados.itens;
    const ruim = resps.findIndex((r) => r.status !== 200);
    if (ruim >= 0) { const { e, f } = err('horarios_livres', resps[ruim]); return termina(e.incerto ? 'incerta' : 'falhou', { ok: false, code: e.incerto ? 'incerta' : e.code, orientacao: e.orientacao }, { falha: f }); }
    const livre = itens.every((x, j) => resps[j].body && Array.isArray(resps[j].body.horarios) && resps[j].body.horarios.includes(x.hora));
    if (!livre) return termina('falhou', { ok: false, code: 'horario_indisponivel', orientacao: 'a sequência não está mais livre; consulte horarios_livres de novo e ofereça outras opções' }, { opcoes: {} });
    return prox('escrita_c', [bvgReqItem(p, 0, meta)], { k: 0, res: [] });
  }
  if (meta.etapa === 'escrita_c') return bvgPassoConjunto(st, r0, cfg);
  if (meta.etapa === 'reval') {
    const livre = r0.status === 200 && r0.body && Array.isArray(r0.body.horarios) && r0.body.horarios.includes(d.hora);
    if (!livre) { // US1-4: horario tomado -> falhou + novas opcoes do mesmo dia
      const hs = r0.status === 200 && Array.isArray(r0.body && r0.body.horarios) ? r0.body.horarios.filter((x) => /^\d{2}:\d{2}$/.test(x)) : [];
      const of = bvMontarOferta('horario', hs.map((hh) => ({ rotulo: hh, valor: { data: d.data, hora: hh, idProfissional: d.idProfissional, apelido: d.barbeiro, idServico: d.idServico, servico: d.servico, preco: d.valor } })), cfg);
      const { e, f } = r0.status === 200 ? { e: null, f: null } : err('horarios_livres', r0);
      return termina('falhou', { ok: false, code: 'horario_indisponivel', orientacao: 'esse horário não está mais livre; ofereça as novas opções', opcoes: of.itens.map((x) => ({ id: x.id, hora: x.valor.hora })) }, { opcoes: of, falha: f });
    }
    const base = resps[1] && sucesso2xx(resps[1]) && Array.isArray(resps[1].body) ? bvgNumAgenda(resps[1].body).map((a) => a.idAgenda) : null; // linha de base so de ids
    const hora = d.hora;
    const w = p.acao === 'reagendar'
      ? { m: 'PUT', path: `/agenda/${d.idAgenda}`, body: { horaInicioOriginal: d.horaInicio, horaInicioNovo: `${d.data}T${hora}:00`, idProfissional: meta.prof } }
      : { m: 'POST', path: '/agenda', body: { idCliente: d.idCliente, idServico: d.idServico, idProfissional: meta.prof, data: d.data, horaInicio: hora, idIntegracao: `bv-${String(p.id).slice(0, 8)}` } };
    return prox('escrita', [w], { base, w, tent: 0 });
  }
  if (meta.etapa === 'escrita' || meta.etapa === 'escrita2') {
    const op = meta.etapa === 'escrita2' ? 'cancelar_antigo' : p.acao;
    const repetida = (meta.tent || 0) > 0;
    const sucessoFim = () => {
      if (p.acao === 'trocar_servico' && meta.etapa === 'escrita') {
        const a = d.antigo || {};
        return prox('escrita2', [{ m: 'DELETE', path: `/agenda/${a.idAgenda}`, qs: a.recorrente ? { data: String(a.horaInicio).slice(0, 10) } : {} }], { novoId: (r0.body && r0.body.idAgenda) || null });
      }
      const msg = { agendar: 'agendado', trocar_servico: 'serviço trocado', reagendar: 'remarcado', cancelar: 'cancelado' }[p.acao];
      const res = { ok: true, [msg.replace(' ', '_')]: true };
      if (meta.verificada) res.verificada = true;
      const novoId = meta.etapa === 'escrita2' ? meta.novoId : (r0.body && r0.body.idAgenda);
      return termina('executada', res, { ...limpa, mensagens: bvgMsgs(p, meta, novoId), ...(repetida ? { falha: { motivo: 'graces|escrita_repetida', operacao: p.acao, code: 'REPETIDA', status: 0, trace: null } } : {}) });
    };
    if (ok) return sucessoFim();
    const { e, f } = err(op, r0);
    if (meta.etapa === 'escrita2') return termina('incerta', { ok: false, code: 'novo_criado_antigo_nao_cancelado', orientacao: 'o novo agendamento foi criado, mas não consegui cancelar o antigo; avise o cliente e peça para cancelar o antigo' }, { falha: f });
    if (!e.incerto) return termina('falhou', { ok: false, code: e.code, orientacao: e.orientacao }, { falha: f });
    const incerta = (fl) => termina('incerta', { ok: false, code: 'incerta', orientacao: 'a agenda não respondeu; não repita, use a contingência e confira com meus_agendamentos' }, { falha: { ...fl, motivo: 'graces|escrita_incerta' } });
    if (p.acao !== 'cancelar' && p.acao !== 'reagendar' && !meta.base) return incerta(f); // sem linha de base nao ha como comparar
    return prox('verifica', [{ m: 'GET', path: '/agenda/agendamentos', qs: { idCliente: meta.idCliente || d.idCliente, proximos: true } }], { falhaEscrita: f });
  }
  if (meta.etapa === 'verifica') {
    const f = meta.falhaEscrita;
    const incerta = () => termina('incerta', { ok: false, code: 'incerta', orientacao: 'a agenda não respondeu; não repita, use a contingência e confira com meus_agendamentos' }, { falha: { ...f, motivo: 'graces|escrita_incerta' } });
    if (!sucesso2xx(r0) || !Array.isArray(r0.body)) return incerta(); // leitura falhou: nenhuma nova escrita
    if (bvgAplicada(p, d, meta, r0.body)) {
      const msg = { agendar: 'agendado', trocar_servico: 'serviço trocado', reagendar: 'remarcado', cancelar: 'cancelado' }[p.acao];
      const ini = `${d.data}T${d.hora}`;
      const novo = p.acao === 'agendar' || p.acao === 'trocar_servico'
        ? (bvgNumAgenda(r0.body).find((a) => !(meta.base || []).includes(a.idAgenda) && a.idServico === d.idServico && a.idProfissional === meta.prof && String(a.horaInicio).startsWith(ini)) || {}).idAgenda : null;
      if (p.acao === 'trocar_servico') { const a = d.antigo || {}; return prox('escrita2', [{ m: 'DELETE', path: `/agenda/${a.idAgenda}`, qs: a.recorrente ? { data: String(a.horaInicio).slice(0, 10) } : {} }], { novoId: novo || null }); }
      return termina('executada', { ok: true, [msg.replace(' ', '_')]: true, verificada: true }, { ...limpa, mensagens: bvgMsgs(p, meta, novo) });
    }
    if ((meta.tent || 0) >= 1) return incerta(); // nunca uma terceira escrita
    return prox('escrita', [meta.w], { tent: 1 });
  }
  return termina('falhou', { ok: false, code: 'etapa_invalida', orientacao: 'não consegui concluir; tente de novo' });
}

// Parametros da query "Persistir" (so $1..$17; nenhum valor entra no texto do SQL).
// msg = { ativo, agora, cfg (mensagens.*), escrita: [digitos] | null }: sem `ativo` (PROD) nada e programado/cancelado.
// $15 = linhas a inserir (tipo, previsto_para, motivo 'ja_passou' quando nao programa), $16 = cancelamentos, $17 = lista de escrita
// (trava do TESTE; null fora do ambiente integracao = sem trava `fora_da_lista`).
function bvgMsgParams(e, msg) {
  const m = e.mensagens;
  if (!m || !msg || !msg.ativo) return [null, null, null];
  const linhas = [];
  for (const it of m.criar) {
    const dados = { servico: it.servico, barbeiro: it.barbeiro, fim: it.fim, ...(it.recorrente ? { recorrente: true } : {}) };
    const r = bvMProgramar({ inicio: it.inicio, fim: it.fim }, msg.agora, msg.cfg);
    const base = { idAgenda: it.idAgenda, idCliente: it.idCliente, idProfissional: it.idProfissional, inicio: it.inicio, dados };
    r.programar.forEach((x) => linhas.push({ ...base, tipo: x.tipo, previsto_para: x.previsto_para, motivo: null }));
    r.ignorar.forEach((x) => linhas.push({ ...base, tipo: x.tipo, previsto_para: x.previsto_para, motivo: x.motivo }));
  }
  return [JSON.stringify(linhas), JSON.stringify(m.cancelar), msg.escrita == null ? null : JSON.stringify(msg.escrita.map(String))];
}

function bvGParams(i, efeitos, msg) {
  const e = efeitos || {};
  const j = (x) => (x === undefined || x === null ? null : JSON.stringify(x));
  const n = e.proposta_nova, u = e.proposta_upd, f = e.falha;
  return [i.contato_id, j(e.opcoes), j(e.pedido), i.turno_id, n ? n.acao : null, n ? j(n.dados) : null,
    u ? u.id : '', u ? u.estado : null, u ? j(u.resultado) : null,
    f ? f.motivo : null, f ? f.operacao : null, f ? f.code : null, f ? f.status : null, f ? f.trace : null,
    ...bvgMsgParams(e, msg)];
}

if (typeof module !== 'undefined') module.exports = { bvGNormalizar, bvGPlano, bvGPasso, bvGErro, bvGParams, BVG_ACOES };
