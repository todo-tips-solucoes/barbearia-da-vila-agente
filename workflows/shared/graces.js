// Logica pura das ferramentas da Graces (sem rede). contracts/ferramentas-graces.md. Incluida DEPOIS de shared/agente.js
// nos Code nodes de bv-graces ({{BV:INCLUDE:...}}). Protocolo: bvGPlano -> chamadas HTTP -> bvGPasso (em laco, ate graces.max_estagios).
// Regras duras em codigo: FR-007 (duas fases), FR-012 (barbeiro de teste), FR-020 (idCliente so do pedido/telefone),
// TESTE: escrita sempre redirecionada ao barbeiro de teste (research Decision 10). PROD: agenda real com graces.escrita_liberada.
if (typeof module !== 'undefined' && typeof bvFiltrarBarbeiros === 'undefined') Object.assign(globalThis, require('./agente.js'));
if (typeof module !== 'undefined' && typeof bvMProgramar === 'undefined') Object.assign(globalThis, require('./mensagens.js'));

const BVG_CAMPOS = ['operacao', 'contato_id', 'telefone', 'turno_id', 'ambiente', 'texto', 'id_opcao', 'id_opcao_servico',
  'id_opcao_barbeiro', 'qualquer', 'data', 'id_opcao_horario', 'id_opcao_agendamento', 'substitui_id_opcao_agendamento',
  'proposta_id', 'nome', 'id_opcoes_servicos', 'id_opcoes_agendamentos', 'periodo', 'hora', 'nascimento', 'como_conheceu', 'motivo'];
const BVG_OPS = ['identificar_cliente', 'cadastrar_cliente', 'escolher_cliente', 'listar_servicos', 'listar_barbeiros',
  'horarios_livres', 'meus_agendamentos', 'agendar', 'reagendar', 'cancelar', 'funcionamento', 'transferir_atendimento'];
// Motivos de transferir_atendimento (owner, 2026-11-16): a equipe atende nesta mesma conversa, entao em vez de mandar o cliente
// para e-mail ou Instagram o agente transfere. Valor desconhecido vira nao_resolvi; ausente vale barbeiro_equipe (clausula do Jayme).
// O valor e a frase que abre o texto de encaminhamento (texto pronto: o modelo so repete).
const BVG_MOTIVOS = {
  barbeiro_equipe: '',
  ja_cliente: 'Como você já é cliente, seu cadastro deve estar com outro número. ',
  outra_pessoa: '',
  pacote: 'A equipe confere o seu pacote por aqui. ',
  pediu_pessoa: '',
  atraso: 'Entendi! Quem confirma isso é a equipe. ',
  nao_resolvi: '',
};
const BVG_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BVG_OPC = /^[A-Za-z0-9_-]{1,12}$/;
const BVG_ACOES = { agendar: 'agendar,trocar_servico,agendar_conjunto', reagendar: 'reagendar', cancelar: 'cancelar,cancelar_conjunto' };

// Periodo pedido pelo cliente (suite R1: pediu tarde e recebeu o dia inteiro a partir das 08:00): [inicio, fim) em HH:MM.
const BVG_PERIODOS = { manha: ['00:00', '12:00'], tarde: ['12:00', '18:00'], noite: ['18:00', '24:00'] };
// Hora aproximada dita pelo cliente (owner, 2026-10-28): so inicios ate horarios.margem_min (60) dela; sem nenhum, os 2 mais proximos de cada lado.
const bvgMargemMin = (cfg) => Number((cfg.horarios || {}).margem_min) || 60;
const bvgAvisoPerto = (hora, cfg) => `nenhum início até ${bvgMargemMin(cfg)} min das ${hora}; a lista traz os mais próximos: diga isso ao cliente`;
function bvgPertoDaHora(itens, hora, cfg, h = (x) => x.hora) { // itens em ordem de hora
  if (!hora) return { itens, aproximada: false };
  const min = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  const dif = (x) => min(h(x)) - min(hora);
  const perto = itens.filter((x) => Math.abs(dif(x)) <= bvgMargemMin(cfg));
  if (perto.length || !itens.length) return { itens: perto, aproximada: false };
  return { itens: [...itens.filter((x) => dif(x) < 0).slice(-2), ...itens.filter((x) => dif(x) > 0).slice(0, 2)], aproximada: true };
}
const bvgRecusa = (code, orientacao) => ({ ok: false, code, orientacao });
const bvgFim = (resultado, efeitos = {}) => ({ final: { resultado, efeitos } });
const bvgOpcaoInvalida = () => bvgRecusa('opcao_desconhecida', 'opção não oferecida: mande a lista de novo (no máximo duas vezes; depois ofereça passar para a equipe)');

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
  if (v.motivo !== undefined) v.motivo = Object.prototype.hasOwnProperty.call(BVG_MOTIVOS, String(v.motivo)) ? String(v.motivo) : 'nao_resolvi';
  // Nascimento: o modelo as vezes repete o formato do cliente (DD/MM/AAAA) ou escreve "nao informado"; converte ou trata como ausente
  if (typeof v.nascimento === 'string') {
    const m = v.nascimento.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) v.nascimento = `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    else if (!/\d/.test(v.nascimento)) delete v.nascimento;
  }
  const ruim = (c) => ({ ok: false, resultado: bvgRecusa('entrada_invalida', `campo ${c} inválido`) });
  if (!BVG_OPS.includes(v.operacao)) return ruim('operacao');
  if (!/^\d{1,18}$/.test(String(v.contato_id))) return ruim('contato_id');
  if (!/^\+?\d{10,15}$/.test(String(v.telefone))) return ruim('telefone');
  if (!BVG_UUID.test(String(v.turno_id))) return ruim('turno_id');
  if (v.ambiente !== cfg.ambiente) return { ok: false, resultado: bvgRecusa('ambiente_incorreto', 'configuração inválida') };
  if (v.data !== undefined && (!/^\d{4}-\d{2}-\d{2}$/.test(v.data) || Number.isNaN(Date.parse(v.data)))) return ruim('data');
  if (v.proposta_id !== undefined && !BVG_UUID.test(v.proposta_id)) return ruim('proposta_id');
  if (v.periodo !== undefined && !BVG_PERIODOS[v.periodo]) return ruim('periodo');
  if (v.hora !== undefined && !/^([01]\d|2[0-3]):[0-5]\d$/.test(v.hora)) return ruim('hora');
  // Suite R18 (2026-11-16): depois de ver horarios o modelo nao tem mais o id do servico e manda o NOME; recusar fazia o
  // agente desistir ("a consulta nao aceitou o servico"). O nome vira servico_nome e e casado com o que foi ofertado/escolhido.
  if (v.id_opcao_servico !== undefined && !BVG_OPC.test(String(v.id_opcao_servico))) { v.servico_nome = String(v.id_opcao_servico).slice(0, 80); delete v.id_opcao_servico; }
  for (const k of ['id_opcao', 'id_opcao_servico', 'id_opcao_barbeiro', 'id_opcao_horario', 'id_opcao_agendamento', 'substitui_id_opcao_agendamento']) {
    if (v[k] !== undefined && !BVG_OPC.test(String(v[k]))) return ruim(k);
  }
  if (v.texto !== undefined && String(v.texto).length > 80) return ruim('texto');
  if (v.como_conheceu !== undefined && String(v.como_conheceu).length > 80) return ruim('como_conheceu');
  if (v.nascimento !== undefined && !bvgNascimentoOk(v.nascimento)) return ruim('nascimento');
  if (v.nome !== undefined && (String(v.nome).length < 2 || String(v.nome).length > 80)) return ruim('nome');
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
    horarios_livres: !v.data, // sem barbeiro: usa o escolhido no pedido (bvgPlano)
    cadastrar_cliente: !v.nome,
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
  if (tipo === 'servico' && p.ultimo && p.ultimo.servico && String(p.ultimo.servico.opcao_id) === String(id)) return p.ultimo.servico; // 'ult': ultimo atendimento
  if (tipo === 'barbeiro') return (p.barbeiros || []).find((b) => String(b.opcao_id) === String(id)) || null;
  if (tipo === 'agendamento') return (p.agendamentos || []).find((a) => String(a.opcao_id) === String(id)) || null; // horarios_livres troca a oferta: a escolha do agendamento fica no pedido
  if (p.horarios_oferta && p.horarios_oferta.tipo === tipo) { const r = bvResolverOpcao(id, p.horarios_oferta); if (r.ok) return r.item.valor; } // meus_agendamentos troca a oferta: os horarios mostrados ficam no pedido (C7, 2026-10-25)
  return null;
}

// Busca de servico (atendimentos de 2026-11-15): a Graces filtra por trecho do nome, e "cabelo" so achava os combos com barba
// ("Cabelo adulto + barba"); quem pedia so o corte recebia as opcoes de R$ 150 e ia embora. Cabelo/cortar sem barba busca os
// cortes (so os de cabelo: "Corte de unha" sai); cabelo (ou corte) com barba busca os combos.
const bvgSoCabelo = (t) => { const n = bvgNomeNorm(t); return /\b(cabelos?|cortar)\b/.test(n) && !/\bbarbas?\b/.test(n); };
function bvgTermosServico(t) {
  const n = bvgNomeNorm(t);
  if (/\b(cabelos?|cortar|cortes?)\b/.test(n) && /\bbarbas?\b/.test(n)) return ['cabelo'];
  return bvgSoCabelo(t) ? ['corte'] : [t];
}

// Servico da chamada: pelo id ofertado; pelo nome (so entre o ofertado, o escolhido e o do ultimo atendimento); ou o ja escolhido.
// Devolve null quando o id ou o nome nao casam com nada (nunca troca de servico em silencio).
function bvgServicoDe(i, ctx, ult) {
  if (i.id_opcao_servico) { const s = bvgResolver(i.id_opcao_servico, 'servico', ctx); return s ? { ...s, opcao_id: s.opcao_id || i.id_opcao_servico } : null; }
  const u = ult && ult.servico;
  if (!i.servico_nome) return ctx.pedido.servico || u || null;
  const of = ctx.opcoes && ctx.opcoes.tipo === 'servico' && Array.isArray(ctx.opcoes.itens) ? ctx.opcoes.itens.map((x) => ({ ...x.valor, opcao_id: x.id })) : [];
  const n = bvgNomeNorm(i.servico_nome);
  return [...of, ctx.pedido.servico, u].filter(Boolean).find((x) => bvgNomeNorm(x.nome) === n) || null;
}

const bvgNaoOferecido = () => bvgRecusa('servico_nao_oferecido', 'esse serviço não é oferecido por aqui; ofereça o serviço regular, sem falar em desconto');

function bvgEscritaPermitida(cfg) {
  // PROD: agenda real com graces.escrita_liberada (owner, 2026-11-15); sem ela, so contato de teste no barbeiro de teste (2026-10-22)
  if (cfg.ambiente === 'producao' ? !(cfg.escritaLiberada || cfg.testeLiberado) : !cfg.redirecionar) {
    return bvgRecusa('escrita_desabilitada', 'agendar por aqui ainda não está liberado; chame a equipe da loja');
  }
  return null;
}

// Cancelar fase 1 (R7): remarcar ou cancelar vai como opcoes; o agendamento escolhido segue no pedido (bvgResolver).
const bvgDecisaoCanc = (resultado, efeitos, cfg) => {
  const of = bvMontarOferta('decisao_cancelamento', [{ rotulo: 'Remarcar', valor: 'remarcar' }, { rotulo: 'Cancelar mesmo', valor: 'cancelar' }], cfg);
  return bvgFim({ ...resultado, opcoes: of.itens.map((x) => ({ id: x.id, rotulo: x.rotulo })), orientacao: 'diga qual é o agendamento e pergunte, no texto, se ele prefere remarcar ou cancelar mesmo (as duas opções vão em lista junto; nunca pergunte só se pode cancelar); Remarcar: pergunte o dia e o horário que ele prefere e só então horarios_livres com id_opcao_agendamento; Cancelar mesmo: o toque é a confirmação, chame cancelar só com o proposta_id' }, { ...efeitos, opcoes: of });
};
const bvgDia = (d) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;
const bvgDiaSem = (d) => bvDiaSemana(String(d)); // "sexta-feira, 20/11": o resumo leva o dia da semana pronto
// Agendamentos que o agente enxerga: em PROD o barbeiro de teste so aparece para contato de teste.
const bvgAgsVisiveis = (lista, cfg) => (Array.isArray(lista) ? lista : []).filter((a) => a && a.idAgenda && (cfg.ambiente !== 'producao' || cfg.testeLiberado || (a.idProfissional !== cfg.testeId && !/\bteste\b/i.test(String(a.profissional || '')))));
// Agendamentos futuros do cliente no pedido (revisao de 17/11): o modelo os ve no contexto e a fase 1 avisa de duplicidade.
// Lidos na identificacao e em meus_agendamentos; cada escrita desta conversa os atualiza (bvgFuturos).
const bvgFut = (a) => ({ idAgenda: a.idAgenda, idServico: a.idServico, horaInicio: String(a.horaInicio), servico: a.descricaoServico || a.servico || '' });
function bvgFuturos(ped, acao, d, novoId) {
  const fs = Array.isArray(ped && ped.futuros) ? ped.futuros : [];
  const novo = (x, id) => ({ idAgenda: id || null, idServico: x.idServico, horaInicio: `${x.data}T${x.hora}:00`, servico: x.servico });
  const sem = (id) => fs.filter((a) => a.idAgenda !== id);
  if (acao === 'agendar') return [...fs, novo(d, novoId)];
  if (acao === 'trocar_servico') return [...sem((d.antigo || {}).idAgenda), novo(d, novoId)];
  if (acao === 'reagendar') return [...sem(d.idAgenda), novo(d, d.idAgenda)];
  if (acao === 'cancelar') return sem(d.idAgenda);
  return fs;
}
// Duplicidade (revisao de 17/11): novo agendamento no mesmo dia ou do mesmo servico de um que o cliente ja tem sai com aviso.
function bvgJaTem(ped, itens) {
  const fs = Array.isArray(ped.futuros) ? ped.futuros : [];
  const a = fs.find((f) => itens.some((x) => String(f.horaInicio).slice(0, 10) === x.data)) || fs.find((f) => f.idServico && itens.some((x) => f.idServico === x.idServico));
  // pergunta de sim ou nao (suite, 18/11): "e mais um ou e para trocar?" deixava o "pode confirmar" do cliente sem resposta possivel
  return a ? { ja_tem: `${a.servico || 'agendamento'} em ${bvgDiaSem(a.horaInicio)} às ${String(a.horaInicio).slice(11, 16)}`, orientacao: 'o cliente já tem esse agendamento: mande o resumo normalmente, avise em uma frase que ele já tem esse horário e pergunte só se pode confirmar mais este (o sim dele confirma; não fale em confirmar os dois: o outro já está marcado); se ele disser que é para trocar aquele, use meus_agendamentos e reagendar' } : {};
}
// Texto final da escrita (revisao de 17/11): o modelo montava a confirmacao de memoria e trocava o dia ou o horario.
function bvgFeito(p) {
  const r = String((p.dados || {}).resumo || '').replace(/^(Trocar serviço: |Remarcar |Cancelar )/, '');
  const v = { agendar: 'Agendado', agendar_conjunto: 'Agendado', trocar_servico: 'Serviço trocado', reagendar: 'Remarcado', cancelar: 'Cancelado', cancelar_conjunto: 'Cancelado' }[p.acao];
  const outro = /^cancelar/.test(p.acao) ? '; depois, numa pergunta só, ofereça marcar outro horário' : '';
  return r && v ? { feito: `${v}: ${r}`, orientacao: `diga ao cliente que está feito, com o seu jeito caloroso de falar e exatamente estes dados (serviço, barbeiro, dia da semana, data e horário); não copie esta linha seca, e não mude nem recalcule nada${outro}` } : {};
}
const bvgReais = (v) => (v == null ? '' : ` (R$ ${Number(v).toFixed(2).replace('.', ',')})`);
const bvgSoDigitos = (t) => String(t).replace(/\D/g, '');
// Celular so em digitos, sem DDI 55 (cadastro do cliente e comparacao de homonimo).
const bvgCelular = (t) => { const d = bvgSoDigitos(t == null ? '' : t); return d.length > 11 && d.startsWith('55') ? d.slice(2) : d; };
const bvgNomeNorm = (t) => bvNormalizarDescricao(t).toLowerCase().replace(/\s+/g, ' ').trim();
// Cadastro proprio (owner, 2026-11-14): a loja pesquisa pelo sobrenome no portal, entao nome = 1a palavra e sobrenome = o resto,
// em campos separados (a Graces grava sobrenomeCliente como enviado; medido em 2026-11-14). Palavra toda minuscula ou toda
// maiuscula ganha so a inicial maiuscula; particulas (da, de, dos...) ficam minusculas; o resto fica como o cliente escreveu.
const BVG_PARTICULAS = new Set(['da', 'das', 'de', 'do', 'dos', 'e', 'di', 'du', 'del', 'la']);
function bvgNomeSobrenome(t) {
  const ps = String(t == null ? '' : t).replace(/[^\p{L}\p{M}' -]/gu, ' ').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean).map((w, k) => {
    const lw = w.toLocaleLowerCase('pt-BR');
    if (k > 0 && BVG_PARTICULAS.has(lw)) return lw;
    return w === lw || w === w.toLocaleUpperCase('pt-BR') ? lw.charAt(0).toLocaleUpperCase('pt-BR') + lw.slice(1) : w;
  });
  if (ps.length < 2 || ps.slice(1).every((w) => BVG_PARTICULAS.has(w))) return null;
  return { nome: ps[0], sobrenome: ps.slice(1).join(' ') };
}
// Data real (2026-02-30 nao passa), de 1900 ate hoje.
function bvgNascimentoOk(d) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(d))) return false;
  const t = new Date(`${d}T12:00:00Z`);
  return !Number.isNaN(t.getTime()) && t.toISOString().slice(0, 10) === d && d >= '1900-01-01' && t.getTime() <= Date.now();
}
// Genero do cadastro: o owner pediu sempre masculino; a Graces aceita 'M' e devolve 500 para 'Masculino' (medido em 2026-11-14).
const BVG_GENERO = 'M';
const bvgSomaMin = (hh, m) => { const t = Number(hh.slice(0, 2)) * 60 + Number(hh.slice(3, 5)) + Number(m); return `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`; };
// Inicios reais (owner, 2026-10-28, ajuste 2): a grade da Graces anda de 40 em 40 min desde a abertura e perde a brecha que a
// loja abre fora dela (atendimento das 09:30 as 10:50 lancado no portal; medido em 2026-10-28). Junta a grade com os fins das
// ocupacoes (GET /agenda/horarios: agendamentos e bloqueios, inclusive a jornada do barbeiro) e so mantem o que cabe inteiro no
// livre. Sem ocupacoes validas (resposta nao 200) ou sem grade, vale so a grade: nunca supoe livre.
// shortcut: nada antes do 1o inicio da grade (e o piso da antecedencia de hoje), e grade vazia = sem encaixe; upgrade: piso pela configuracao da loja.
function bvgLivre(grade, ocupResp) {
  const hs = (grade && Array.isArray(grade.horarios) ? grade.horarios : []).filter((h) => /^\d{2}:\d{2}$/.test(h)).sort();
  const minutos = Number(grade && grade.minutos);
  const fecha = grade && grade.funcionamento ? String(grade.funcionamento.horaFim) : '';
  const ocup = ocupResp && ocupResp.status === 200 && ocupResp.body && Array.isArray(ocupResp.body.horarios) ? ocupResp.body.horarios : null;
  const oc = (ocup || []).filter((o) => o && /^\d{2}:\d{2}$/.test(o.horaInicio) && /^\d{2}:\d{2}$/.test(o.horaFim));
  const base = !!ocup && hs.length > 0 && minutos > 0 && /^\d{2}:\d{2}$/.test(fecha);
  const cabe = (t) => { const fim = bvgSomaMin(t, minutos); return base ? t >= hs[0] && fim > t && fim <= fecha && oc.every((o) => fim <= o.horaInicio || t >= o.horaFim) : hs.includes(t); };
  return { minutos, cabe, inicios: base ? [...new Set([...hs, ...oc.map((o) => o.horaFim).filter(cabe)])].sort() : hs };
}
const bvgReqsLivre = (pares) => [...pares.map((q) => ({ m: 'GET', path: '/agenda/horarios-livres', qs: q })), ...pares.map((q) => ({ m: 'GET', path: '/agenda/horarios', qs: q }))];
// Encaminhar a equipe (research Decision 6): pedido.handoff=true ANTES da transferencia (fail-closed); a chamada
// updateAPI {ticketId, queueId} fica no Code node (ticketId do estado da conversa, nunca do modelo) apos a sonda S5.
const bvgEncaminhar = (motivo, operacao, cfg) => bvgFim(
  { ok: false, code: 'encaminhar_equipe', motivo, orientacao: 'a conversa foi transferida para a equipe, que continua por aqui: responda com o texto de encaminhamento (texto), sem dar nomes, detalhes nem outro contato', texto: cfg.textos && cfg.textos.encaminhar_equipe },
  { pedido: { handoff: true }, handoff: { queueId: (cfg.handoff && cfg.handoff.setor_id) || 78 } /* setor do config (TESTE 78, PROD 106) */, falha: { motivo: `encaminhar_equipe|${motivo}`, operacao, code: 'encaminhar_equipe', status: 0, trace: null } });

function bvGPlano(i, ctx0, cfg) {
  const ctx = { pedido: (ctx0 && ctx0.pedido) || {}, opcoes: (ctx0 && ctx0.opcoes) || {}, proposta: ctx0 && ctx0.proposta, info: ctx0 && ctx0.info, dia: (ctx0 && ctx0.dia) || {} };
  const st = { in: i, ctx, meta: { op: i.operacao } };
  const chamar = (reqs, meta = {}) => ({ reqs, st: { ...st, meta: { ...st.meta, ...meta } } });
  const idCliente = ctx.pedido.idCliente;
  if (ctx.pedido.handoff) return bvgFim(bvgRecusa('handoff_ativo', 'conversa transferida para a equipe; não responda mais'));
  switch (i.operacao) {
    case 'identificar_cliente':
      return chamar([{ m: 'GET', path: '/agenda/clientes', qs: { celular: bvgSoDigitos(i.telefone) } }]);
    case 'cadastrar_cliente': {
      if (!cfg.cadastroLiberado) return bvgFim(bvgRecusa('cadastro_desabilitado', 'não consigo cadastrar agora; chame a equipe da loja'));
      if (!ctx.pedido.cliente_sem_cadastro) return bvgFim(bvgRecusa('identifique_primeiro', 'identifique o cliente pelo telefone antes de cadastrar'));
      const ns = bvgNomeSobrenome(i.nome);
      if (!ns) return bvgFim(bvgRecusa('nome_incompleto', 'peça o nome completo, com nome e sobrenome'));
      const cad = { ns, como: i.como_conheceu || null };
      // TESTE (redirecionar_escrita): cadastro e irreversivel, entao nada vai a Graces; a conversa segue como o cliente de teste.
      if (cfg.redirecionar) return cfg.clienteTesteId ? bvgCadastrado(cad, cfg.clienteTesteId) : bvgFim(bvgRecusa('cadastro_desabilitado', 'não consigo cadastrar agora; chame a equipe da loja'));
      const body = { nomeCliente: ns.nome, sobrenomeCliente: ns.sobrenome, ddiCelular: '55', celular: bvgCelular(i.telefone), genero: BVG_GENERO };
      if (i.nascimento) body.dataNascimento = i.nascimento;
      // Antes do POST, busca o mesmo nome completo com outro celular (nunca cadastra duplicado/mescla).
      return chamar([{ m: 'GET', path: '/agenda/clientes', qs: { busca: `${ns.nome} ${ns.sobrenome}` } }], { etapa: 'busca_nome', post: { m: 'POST', path: '/agenda/clientes', body }, cad });
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
      return chamar(bvgTermosServico(t).map((x) => ({ m: 'GET', path: '/agenda/servicos', qs: x.length >= 3 ? { texto: x } : {} })), { limpou2v: !!i.texto && t !== i.texto, soCabelo: bvgSoCabelo(t) });
    }
    case 'listar_barbeiros': {
      const s = bvgServicoDe(i, ctx, ctx.pedido.ultimo);
      if (!s) return bvgFim(i.id_opcao_servico || i.servico_nome ? bvgOpcaoInvalida() : bvgRecusa('servico_nao_escolhido', 'escolha o serviço antes (listar_servicos)'));
      return chamar([{ m: 'GET', path: '/servicos/profissionais', qs: { idServico: s.idServico } }], { servico: s, escolhido: ctx.pedido.barbeiro || null });
    }
    case 'horarios_livres': {
      if (i.id_opcao) { // FR-012: resposta do cliente a modo_encadeamento (barbeiros diferentes | separados); nunca escolhida pelo modelo
        const modo = bvgResolver(i.id_opcao, 'modo_encadeamento', ctx);
        const ss = ctx.pedido.servicos;
        if (!modo || !Array.isArray(ss) || !ss.length) return bvgFim(bvgOpcaoInvalida());
        if (modo === 'separados') {
          return bvgFim({ ok: true, modo: 'separados', servicos: ss.map((x) => ({ id: x.opcao_id, nome: x.nome })), orientacao: `agende um serviço por vez: comece por ${ss[0].nome} (listar_barbeiros com id_opcao_servico ${ss[0].opcao_id}) e, depois de confirmado, siga para o próximo` }, { opcoes: {}, pedido: { modo_encadeamento: 'separados', servico: ss[0] } });
        }
        return chamar(ss.map((x) => ({ m: 'GET', path: '/servicos/profissionais', qs: { idServico: x.idServico } })), { enc: true, etapa: 'dif_prof', servicos: ss, data: i.data, hora: i.hora });
      }
      if (i.id_opcoes_servicos) {
        const ss = i.id_opcoes_servicos.map((x) => bvgResolver(x, 'servico', ctx));
        if (ss.some((x) => !x)) return bvgFim(bvgOpcaoInvalida());
        if (ss.some((x) => bvSegundaVez(x.nome))) return bvgFim(bvgNaoOferecido());
        return chamar(ss.map((s) => ({ m: 'GET', path: '/servicos/profissionais', qs: { idServico: s.idServico } })), { enc: true, etapa: 'enc_prof', servicos: ss, data: i.data, hora: i.hora });
      }
      const ag = i.id_opcao_agendamento ? bvgResolver(i.id_opcao_agendamento, 'agendamento', ctx) : null;
      const ult = ctx.pedido.ultimo || {};
      const s = ag ? { idServico: ag.idServico, nome: ag.servico, opcao_id: 'ag' } : bvgServicoDe(i, ctx, ult);
      if (!s) return bvgFim(i.id_opcao_servico || i.servico_nome ? bvgOpcaoInvalida() : bvgRecusa('servico_nao_escolhido', 'escolha o serviço antes (listar_servicos)'));
      // Remarcar mantem o barbeiro (atendimentos de 2026-11-15): a busca ia a todos os barbeiros e a proposta trocava o barbeiro em
      // silencio (quase sempre para o primeiro da lista). Vale o barbeiro do agendamento, ou o que o cliente escolheu para esta
      // remarcacao; outros barbeiros so com qualquer=true. Barbeiro so da equipe: encaminha. O de teste (TESTE) segue para a uniao.
      if (ag && !i.id_opcao_barbeiro && !i.qualquer) {
        const esc = ctx.pedido.barbeiro && ctx.pedido.barbeiro_ag === ag.idAgenda ? ctx.pedido.barbeiro : null;
        const b = esc || { idProfissional: ag.idProfissional, apelido: String(ag.profissional || '').trim() };
        if (bvBarbeiroHumano(b, cfg.humanos)) return bvgEncaminhar('barbeiro_humano', 'horarios_livres', cfg);
        if (bvFiltrarBarbeiros([b], cfg.testeId, cfg.testeLiberado, cfg.humanos).length) {
          return chamar(bvgReqsLivre([{ idServico: s.idServico, idProfissional: b.idProfissional, data: i.data }]), { servico: s, barbeiros: [b], qualquer: false, data: i.data, periodo: i.periodo, hora: i.hora, agId: ag.idAgenda });
        }
      }
      // Reagendar com qualquer barbeiro: barbeiros do servico do agendamento neste passo (poupa duas rodadas do modelo, R8).
      // agQualquer: a lista NAO e do barbeiro do agendamento (cliente aceitou outro, ou o do agendamento nao pode ser ofertado)
      if (ag && !i.id_opcao_barbeiro) return chamar([{ m: 'GET', path: '/servicos/profissionais', qs: { idServico: s.idServico } }], { etapa: 'ag_prof', servico: s, qualquer: true, data: i.data, periodo: i.periodo, hora: i.hora, agQualquer: true });
      // FR-002/FR-012: defesa extra, o barbeiro de teste nunca entra na uniao nem se vier no pedido.
      // Memoria (teste do owner, 2026-10-22): sem id_opcao_barbeiro, vale o barbeiro que o cliente ja escolheu na sessao
      // "Qualquer barbeiro" sem a lista de barbeiros deste servico (ex.: servico do ultimo atendimento): busca os barbeiros neste passo
      const listados = (ctx.pedido.barbeiros || []).length && ctx.pedido.servico && ctx.pedido.servico.idServico === s.idServico;
      if (i.qualquer && !i.id_opcao_barbeiro && !listados) return chamar([{ m: 'GET', path: '/servicos/profissionais', qs: { idServico: s.idServico } }], { etapa: 'ag_prof', servico: s, qualquer: true, data: i.data, periodo: i.periodo, hora: i.hora });
      // O barbeiro do ultimo atendimento so vale para o servico dele
      const padrao = ctx.pedido.barbeiro || (ult.barbeiro && ult.servico && ult.servico.idServico === s.idServico ? ult.barbeiro : null);
      if (!i.qualquer && !i.id_opcao_barbeiro && !padrao) return bvgFim(bvgRecusa('barbeiro_nao_escolhido', 'pergunte com qual barbeiro (listar_barbeiros) ou use qualquer'));
      const bs = bvFiltrarBarbeiros(i.qualquer ? (ctx.pedido.barbeiros || []) : [i.id_opcao_barbeiro ? bvgResolver(i.id_opcao_barbeiro, 'barbeiro', ctx) : padrao].filter(Boolean), cfg.testeId, cfg.testeLiberado, cfg.humanos);
      if (!bs.length) return bvgFim(i.qualquer ? bvgRecusa('barbeiros_nao_listados', 'chame listar_barbeiros antes') : bvgOpcaoInvalida());
      const reqs = bvgReqsLivre(bs.slice(0, 10).map((b) => ({ idServico: s.idServico, idProfissional: b.idProfissional, data: i.data })));
      // habitual: o barbeiro veio do ultimo atendimento, nao de uma escolha nesta conversa (sem horario com ele, o passo mostra os outros)
      const habitual = !i.qualquer && !i.id_opcao_barbeiro && !ctx.pedido.barbeiro && !!padrao;
      return chamar(reqs, { servico: s, barbeiros: bs.slice(0, 10), qualquer: !!i.qualquer, data: i.data, periodo: i.periodo, hora: i.hora, habitual, agId: ag ? ag.idAgenda : null });
    }
    case 'transferir_atendimento': // barbeiro so da equipe (clausula petrea, owner 2026-11-14): a equipe continua o agendamento
      // cliente novo e cadastrado antes, para a equipe ja recebe-lo pronto (o modelo as vezes pulava: suite R21, 2026-11-16)
      // (so para o barbeiro da equipe: quem ja e cliente, pediu uma pessoa ou avisou atraso vai direto)
      const mot = i.motivo || 'barbeiro_equipe';
      if (mot === 'barbeiro_equipe' && ctx.pedido.cliente_sem_cadastro && cfg.cadastroLiberado) return bvgFim(bvgRecusa('cadastre_primeiro', 'cliente novo: faça antes o cadastro rápido (nome completo, data de nascimento e como conheceu) com cadastrar_cliente e só então transfira'));
      // Cadastro em outro numero (owner, 2026-11-16): antes de transferir, pedir o contato pelo numero do cadastro; a transferencia
      // so vale num turno seguinte, depois da resposta do cliente (o modelo as vezes transferia direto: suite R24)
      if ((mot === 'ja_cliente' || mot === 'outra_pessoa') && (!ctx.pedido.pediu_numero || ctx.pedido.pediu_numero === i.turno_id)) {
        // a ferramenta entrega o texto pronto: quando o modelo pedia o numero por conta propria, ela nao ficava sabendo (suite R24)
        const pedir = mot === 'ja_cliente'
          ? 'Como você já é cliente, seu cadastro deve estar com outro número. Você consegue me chamar pelo número que está no cadastro? Se não for possível, me avisa que eu passo para a equipe continuar por aqui.'
          : 'O atendimento é feito pelo número que está no cadastro de quem vai ser atendido. Essa pessoa consegue me chamar pelo número dela? Se não for possível, me avisa que eu passo para a equipe continuar por aqui.';
        return bvgFim({ ok: false, code: 'peca_o_numero_do_cadastro', texto: pedir, orientacao: 'ainda não transferiu: responda só com o texto (texto); se o cliente responder que não é possível, chame esta ferramenta de novo com o mesmo motivo, que então ela transfere' },
          { pedido: { pediu_numero: i.turno_id } });
      }
      const enc = bvgEncaminhar(mot === 'barbeiro_equipe' ? 'barbeiro_humano' : mot, 'transferir_atendimento', cfg);
      enc.final.resultado.texto = BVG_MOTIVOS[mot] + (enc.final.resultado.texto || '');
      return enc;
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

// Clausula petrea: horario, sequencia ou agendamento existente com barbeiro so da equipe (defesa: ele nunca e ofertado).
function bvgTocaHumano(i, ctx, cfg) {
  const h = (x) => !!bvBarbeiroHumano(x && { idProfissional: x.idProfissional, apelido: x.apelido || x.profissional || x.barbeiro }, cfg.humanos);
  const sq = i.id_opcao_horario ? bvgResolver(i.id_opcao_horario, 'sequencia', ctx) : null;
  return [i.id_opcao_horario && bvgResolver(i.id_opcao_horario, 'horario', ctx), i.id_opcao_agendamento && bvgResolver(i.id_opcao_agendamento, 'agendamento', ctx),
    i.substitui_id_opcao_agendamento && bvgResolver(i.substitui_id_opcao_agendamento, 'agendamento', ctx), ...((sq && sq.itens) || [])].some(h);
}

// Fase 1: so cria a proposta pendente com o resumo; nada e escrito na Graces (FR-006).
function bvgFase1(i, ctx, cfg) {
  const bloq = bvgEscritaPermitida(cfg);
  if (bloq) return bvgFim(bloq);
  if (!ctx.pedido.idCliente && ctx.pedido.cliente_sem_cadastro) return bvgFim(bvgRecusa('cadastre_primeiro', 'cliente sem cadastro: faça agora o cadastro rápido (nome completo, data de nascimento e como conheceu) com cadastrar_cliente e, com ele feito, chame esta ferramenta de novo com a mesma opção'));
  if (!ctx.pedido.idCliente) return bvgFim(bvgRecusa('cliente_nao_identificado', 'identifique o cliente primeiro'));
  // Teto por contato e dia (owner, 17/11): acima dele quem agenda e a equipe; sem ele um numero so conseguia lotar a agenda.
  // Conta as escritas de agendar deste contato no dia (ctx.dia.agendados, do Contexto); trocar de servico nao e agendamento novo.
  if (i.operacao === 'agendar' && !i.substitui_id_opcao_agendamento && cfg.agendamentosMaxDia > 0 && (ctx.dia.agendados || 0) >= cfg.agendamentosMaxDia) return bvgEncaminhar('limite_agendamentos', 'agendar', cfg);
  const fora = bvgRecusa('escrita_fora_do_teste', 'só é possível mexer em agendamentos de teste neste ambiente');
  if (i.operacao !== 'cancelar' && bvgTocaHumano(i, ctx, cfg)) return bvgEncaminhar('barbeiro_humano', i.operacao, cfg);
  const prod = cfg.ambiente === 'producao';
  const real = prod && !!cfg.escritaLiberada; // PROD liberada: agenda real de todos os barbeiros (menos o de teste e os so da equipe)
  const soTeste = prod && !real; // PROD em teste fechado: toda escrita so no barbeiro de teste
  const sq = i.operacao === 'agendar' && i.id_opcao_horario ? bvgResolver(i.id_opcao_horario, 'sequencia', ctx) : null;
  if (sq) { // FR-008: um POST por servico, em sequencia, confirmados num unico resumo
    if (i.substitui_id_opcao_agendamento || sq.itens.some((x) => x.idProfissional === cfg.testeId) !== soTeste) return bvgFim(bvgOpcaoInvalida());
    if (soTeste && sq.itens.some((x) => x.idProfissional !== cfg.testeId)) return bvgFim(fora);
    if (sq.itens.some((x) => bvSegundaVez(x.servico))) return bvgFim(bvgNaoOferecido());
    const itens = sq.itens.map((x, k) => ({ ordem: k + 1, idServico: x.idServico, servico: x.servico, idProfissional: x.idProfissional, barbeiro: x.apelido, data: sq.data, hora: x.hora, minutos: x.minutos, valor: x.valor }));
    const mesmo = itens.every((x) => x.idProfissional === itens[0].idProfissional);
    const resumo = mesmo ? `${itens.map((x) => `${x.servico} às ${x.hora}${bvgReais(x.valor)}`).join(' + ')} com ${itens[0].barbeiro} em ${bvgDiaSem(sq.data)}`
      : `${itens.map((x) => `${x.servico} às ${x.hora} com ${x.barbeiro}${bvgReais(x.valor)}`).join(' + ')} em ${bvgDiaSem(sq.data)}`;
    return bvgFim({ ok: true, aguardando_confirmacao: true, resumo, ...bvgJaTem(ctx.pedido, itens) }, { proposta_nova: { acao: 'agendar_conjunto', dados: { idCliente: ctx.pedido.idCliente, itens, resumo }, resumo } });
  }
  if (i.operacao === 'cancelar' && i.id_opcoes_agendamentos) {
    const ags = i.id_opcoes_agendamentos.map((x) => bvgResolver(x, 'agendamento', ctx));
    if (ags.some((a) => !a)) return bvgFim(bvgOpcaoInvalida());
    if (!real && ags.some((a) => a.idProfissional !== cfg.testeId)) return bvgFim(fora);
    const itens = ags.map((a, k) => ({ ordem: k + 1, idAgenda: a.idAgenda, horaInicio: a.horaInicio, recorrente: !!a.recorrente, servico: a.servico }));
    const resumo = `Cancelar ${itens.map((x) => `${x.servico} em ${bvgDiaSem(x.horaInicio)} às ${x.horaInicio.slice(11, 16)}`).join(' e ')}`;
    return bvgDecisaoCanc({ ok: true, aguardando_confirmacao: true, sugerir_remarcar: true, resumo }, { proposta_nova: { acao: 'cancelar_conjunto', dados: { itens, resumo }, resumo } }, cfg);
  }
  const ag = i.id_opcao_agendamento ? bvgResolver(i.id_opcao_agendamento, 'agendamento', ctx) : null;
  const h = i.id_opcao_horario ? bvgResolver(i.id_opcao_horario, 'horario', ctx) : null;
  const antigo = i.substitui_id_opcao_agendamento ? bvgResolver(i.substitui_id_opcao_agendamento, 'agendamento', ctx) : null;
  const ag0 = (antigo || ag);
  if (!real && ag0 && ag0.idProfissional !== cfg.testeId) return bvgFim(fora); // TESTE e PROD fechada: nunca altera agenda de barbeiro real
  if (h && soTeste && h.idProfissional !== cfg.testeId) return bvgFim(fora); // PROD fechada: nunca escreve na agenda de barbeiro real
  if (h && !soTeste && h.idProfissional === cfg.testeId) return bvgFim(bvgOpcaoInvalida()); // FR-012: o modelo nao escolhe o de teste
  // Quem escolhe e o cliente (16/11: o agente pedia confirmacao de um horario que o cliente nao disse): no turno da busca, so vai ao
  // resumo o horario pedido que esta livre ou o unico da lista; os demais esperam a resposta do cliente.
  const bu = ctx.pedido.busca;
  if (h && i.operacao !== 'cancelar' && bu && bu.turno === i.turno_id && bu.n > 1 && bu.livre !== String(i.id_opcao_horario)) {
    return bvgFim(bvgRecusa('cliente_nao_escolheu', 'o cliente ainda não escolheu esse horário: diga o que não há (se for o caso), mostre as opções e pergunte qual ele prefere; só chame esta ferramenta com a escolha dele'));
  }
  const alvo = i.operacao === 'reagendar' ? ag : h; // serviço que seria escrito; cancelar segue permitido
  if (i.operacao !== 'cancelar' && alvo && bvSegundaVez(alvo.servico)) return bvgFim(bvgNaoOferecido()); // FR-005
  const agAnt = { idAgenda: ag0 && ag0.idAgenda, horaInicio: ag0 && ag0.horaInicio, recorrente: !!(ag0 && ag0.recorrente) };
  if (i.operacao === 'agendar') {
    if (!h || (i.substitui_id_opcao_agendamento && !antigo)) return bvgFim(bvgOpcaoInvalida());
    const dados = { idCliente: ctx.pedido.idCliente, idServico: h.idServico, servico: h.servico, idProfissional: h.idProfissional, barbeiro: h.apelido, data: h.data, hora: h.hora, valor: h.preco, minutos: h.minutos };
    if (antigo) dados.antigo = agAnt;
    const resumo = `${antigo ? 'Trocar serviço: ' : ''}${h.servico} com ${h.apelido} em ${bvgDiaSem(h.data)} às ${h.hora}${bvgReais(h.preco)}`;
    return bvgFim({ ok: true, aguardando_confirmacao: true, resumo, ...(antigo ? {} : bvgJaTem(ctx.pedido, [h])) }, { proposta_nova: { acao: antigo ? 'trocar_servico' : 'agendar', dados: { ...dados, resumo }, resumo } });
  }
  if (!ag) return bvgFim(bvgOpcaoInvalida());
  if (i.operacao === 'reagendar') {
    if (!h) return bvgFim(bvgOpcaoInvalida());
    if (h.idServico !== ag.idServico) return bvgFim(bvgRecusa('servico_diferente', 'os horários são de outro serviço; consulte horarios_livres com este agendamento'));
    const dados = { ...agAnt, idServico: ag.idServico, servico: ag.servico, idProfissional: h.idProfissional, barbeiro: h.apelido, data: h.data, hora: h.hora, minutos: h.minutos };
    const resumo = `Remarcar ${ag.servico} de ${bvgDia(ag.horaInicio)} ${ag.horaInicio.slice(11, 16)} para ${bvgDiaSem(h.data)} às ${h.hora} com ${h.apelido}`;
    return bvgFim({ ok: true, aguardando_confirmacao: true, resumo }, { proposta_nova: { acao: 'reagendar', dados: { ...dados, resumo }, resumo } });
  }
  // barbeiro de teste e barbeiro so da equipe nunca aparecem ao cliente: com o nome no resumo, a frase inteira da confirmacao era
  // cortada na saida e sobrava so "Prontinho!" (suite R34/R35, 18/11)
  const oculto = ag.idProfissional === cfg.testeId || !!bvBarbeiroHumano({ idProfissional: ag.idProfissional, apelido: ag.profissional }, cfg.humanos);
  const resumo = `Cancelar ${ag.servico} em ${bvgDiaSem(ag.horaInicio)} às ${ag.horaInicio.slice(11, 16)}${oculto ? '' : ` com ${ag.profissional}`}`;
  // Recusou a presenca deste agendamento (item 19): a pergunta "remarcar ou cancelar?" ja foi feita no texto da recusa; a lista
  // de decisao voltava a mesma pergunta. So a confirmacao do cancelamento.
  if (ctx.pedido.confirmacao_recusada && String(ctx.pedido.confirmacao_recusada.idAgenda) === String(ag.idAgenda)) {
    return bvgFim({ ok: true, aguardando_confirmacao: true, resumo, orientacao: 'ele já ouviu a oferta de remarcar: peça só a confirmação do cancelamento, em uma frase; com o sim, chame cancelar só com o proposta_id' },
      { opcoes: {}, proposta_nova: { acao: 'cancelar', dados: { ...agAnt, servico: ag.servico, barbeiro: ag.profissional, resumo }, resumo } });
  }
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
    if (f.estado === 'pendente' && f.antes_da_pergunta) return bvgFim(bvgRecusa('confirmacao_antes_da_pergunta', 'a mensagem do cliente chegou antes de ele ver o pedido de confirmação: peça a confirmação de novo, em uma frase, e espere a resposta'));
    if (f.estado !== 'pendente') return bvgFim(bvgRecusa('proposta_nao_pendente', 'essa confirmação já foi usada; refaça o resumo'));
    return bvgFim(bvgRecusa('proposta_expirada', 'a confirmação venceu; refaça o resumo e peça de novo'), {}); // expirada: a pendente fica para o proximo "substituida"
  }
  const d = p.dados || {};
  if (!/^cancelar/.test(p.acao) && [d, ...(Array.isArray(d.itens) ? d.itens : [])].some((x) => bvBarbeiroHumano(x && { idProfissional: x.idProfissional, apelido: x.barbeiro }, cfg.humanos))) {
    return bvgFim(bvgRecusa('barbeiro_humano', 'esse barbeiro só é agendado pela equipe; chame transferir_atendimento'), { proposta_upd: { id: p.id, estado: 'falhou', resultado: { ok: false, code: 'barbeiro_humano' } } });
  }
  if (p.acao !== 'cancelar' && bvSegundaVez(d.servico)) return bvgFim(bvgNaoOferecido(), { proposta_upd: { id: p.id, estado: 'falhou', resultado: { ok: false, code: 'servico_nao_oferecido' } } });
  const real = cfg.ambiente === 'producao' && !!cfg.escritaLiberada;
  // PROD liberada: escreve no barbeiro da proposta e nunca no de teste; PROD fechada: defesa extra, a escrita so vai ao de teste
  if (real && !/^cancelar/.test(p.acao) && [d, ...(Array.isArray(d.itens) ? d.itens : [])].some((x) => x && x.idProfissional === cfg.testeId)) {
    return bvgFim(bvgRecusa('barbeiro_de_teste', 'esse horário não está disponível; ofereça outro'), { proposta_upd: { id: p.id, estado: 'falhou', resultado: { ok: false, code: 'barbeiro_de_teste' } } });
  }
  const redir = !!cfg.redirecionar || (cfg.ambiente === 'producao' && !real);
  const prof = redir ? cfg.testeId : d.idProfissional; // research Decision 10: toda escrita vai ao barbeiro de teste
  // nome do cliente nos lembretes (owner, 2026-11-15)
  const meta = { fase2: true, proposta: p, prof, redir, nome: String(ctx.pedido.cliente_nome || '') };
  if (p.acao === 'agendar_conjunto') {
    if ((d.itens || []).some((x) => bvSegundaVez(x.servico))) return bvgFim(bvgNaoOferecido(), { proposta_upd: { id: p.id, estado: 'falhou', resultado: { ok: false, code: 'servico_nao_oferecido' } } });
    return chamar(bvgReqsLivre(d.itens.map((x) => ({ idServico: x.idServico, idProfissional: bvgProfDe(x, meta), data: x.data }))), { ...meta, etapa: 'reval_c', res: [] });
  }
  if (p.acao === 'cancelar_conjunto') return chamar([bvgReqItem(p, 0, meta)], { ...meta, etapa: 'escrita_c', k: 0, res: [] });
  if (p.acao === 'cancelar') {
    return chamar([{ m: 'DELETE', path: `/agenda/${d.idAgenda}`, qs: d.recorrente ? { data: String(d.horaInicio).slice(0, 10) } : {} }], { ...meta, etapa: 'escrita' });
  }
  // reval + linha de base de agendamentos (Decision 8); idCliente so do pedido/proposta (FR-020)
  const ic = d.idCliente || ctx.pedido.idCliente;
  const qs = { idServico: d.idServico, idProfissional: prof, data: d.data };
  const reqs = [{ m: 'GET', path: '/agenda/horarios-livres', qs }];
  if (ic) reqs.push({ m: 'GET', path: '/agenda/agendamentos', qs: { idCliente: ic, proximos: true } });
  reqs.push({ m: 'GET', path: '/agenda/horarios', qs }); // ocupacoes por ultimo: a linha de base continua em resps[1]
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
function bvgItemMsg(idAgenda, x, idCliente, prof, nome) {
  const hora = x.hora, fim = Number(x.minutos) > 0 ? bvgSomaMin(hora, x.minutos) : hora;
  return { idAgenda, idCliente, idProfissional: prof, inicio: `${x.data}T${hora}:00`, fim: `${x.data}T${fim}:00`, servico: x.servico, barbeiro: x.barbeiro || x.apelido, recorrente: !!x.recorrente, ...(nome ? { nome } : {}) };
}
function bvgMsgs(p, meta, novoId) {
  const d = p.dados || {}, ic = d.idCliente || meta.idCliente;
  const canc = (id, motivo) => ({ idAgenda: id, motivo });
  if (p.acao === 'agendar') return novoId ? { criar: [bvgItemMsg(novoId, d, ic, meta.prof, meta.nome)], cancelar: [] } : null;
  if (p.acao === 'trocar_servico') return novoId ? { criar: [bvgItemMsg(novoId, d, ic, meta.prof, meta.nome)], cancelar: [canc(d.antigo.idAgenda, 'cancelada_agente')] } : null;
  if (p.acao === 'reagendar') return { criar: [bvgItemMsg(d.idAgenda, d, ic, meta.prof, meta.nome)], cancelar: [canc(d.idAgenda, 'reagendada')] };
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

const BVG_ORIENT_CADASTRO = 'cliente sem cadastro neste número: responda dúvidas e siga o agendamento (serviço, barbeiro, horários) sem cadastro; só quando ele escolher o horário peça, numa mensagem só, o nome completo, a data de nascimento e como conheceu a barbearia, chame cadastrar_cliente e então agendar com o horário escolhido';
// Cadastro feito (POST ou, no TESTE, o cliente de teste): o pedido passa a ter o cliente; como_conheceu vai para contatos.
const bvgCadastrado = (cad, idCliente) => bvgFim(
  { ok: true, cadastrado: true, nome: cad.ns.nome, orientacao: 'cadastro feito: agradeça em poucas palavras e, nesta mesma resposta, chame agendar com o horário que ele já tinha escolhido e mande o resumo (se o cadastro foi para transferir, chame transferir_atendimento; sem horário escolhido, continue de onde o agendamento parou); não pergunte como pode ajudar' },
  { pedido: { idCliente, cliente_sem_cadastro: false, cliente_nome: cad.ns.nome, identificado: true }, ...(cad.como ? { contato: { como_conheceu: cad.como } } : {}) });

// Ultimo atendimento (owner, 2026-11-14): agendar "pelo ultimo corte dele". Estagio hist: GET /agenda/historico (mais recente
// primeiro); estagio ult: o servico tem de seguir no catalogo (ativo, sem "2a vez") e o barbeiro, fazer o servico e nao ser o de
// teste. Qualquer falha ou ausencia so tira a sugestao: o cliente continua identificado.
function bvgPassoUltimo(st, resps, cfg) {
  const { meta } = st;
  const ped = meta.ped;
  const ok = (r) => r && r.status >= 200 && r.status < 300 && Array.isArray(r.body);
  // futuros: 2a resposta do estagio hist (falha na leitura = lista vazia, como o historico); o estagio ult a recebe pelo meta
  const fut = meta.etapa === 'hist' ? (ok(resps[1]) ? bvgAgsVisiveis(resps[1].body, cfg).slice(0, 10).map(bvgFut) : []) : (meta.fut || []);
  const so = (ult) => bvgFim({ ok: true, encontrado: true, nome: ped.cliente_nome, futuros: fut, ...(ult ? { ultimo: { servico: ult.servico.nome, barbeiro: ult.barbeiro ? ult.barbeiro.apelido : null } } : {}) },
    { pedido: { ...ped, ultimo: ult || null, futuros: fut } });
  if (meta.etapa === 'hist') {
    const h = ok(resps[0]) ? resps[0].body.find((x) => x && BVG_UUID.test(String(x.idServico || ''))) : null;
    if (!h) return so(null);
    const hum = bvBarbeiroHumano({ idProfissional: h.idProfissional, apelido: String(h.profissional || '') }, cfg.humanos);
    if (hum) return bvgFim({ ok: true, encontrado: true, nome: ped.cliente_nome, futuros: fut, ultimo: { humano: hum.nome } }, { pedido: { ...ped, ultimo: { humano: hum.nome }, futuros: fut } });
    return { reqs: [{ m: 'GET', path: '/agenda/servicos', qs: {} }, { m: 'GET', path: '/servicos/profissionais', qs: { idServico: h.idServico } }], st: { ...st, meta: { ...meta, etapa: 'ult', h, fut } } };
  }
  const s = ok(resps[0]) ? bvFiltrarServicos(resps[0].body.filter((x) => x && x.ativo !== false).map((x) => ({ ...x, nome: String(x.descricaoAgenda || '') })))
    .find((x) => x.idServico === meta.h.idServico) : null;
  if (!s) return so(null);
  const b = ok(resps[1]) ? bvFiltrarBarbeiros(resps[1].body.map((x) => ({ idProfissional: x.idProfissional, apelido: String(x.apelido || '').trim(), nome: x.nomeCompleto })), cfg.testeId, cfg.testeLiberado, cfg.humanos)
    .find((x) => x.idProfissional === meta.h.idProfissional) : null;
  return so({ servico: { idServico: s.idServico, nome: s.nome, preco: s.valorPadrao, minutos: s.tempoPadrao, opcao_id: 'ult' }, barbeiro: b ? { idProfissional: b.idProfissional, apelido: b.apelido } : null });
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
  if (op === 'identificar_cliente' && meta.etapa) return bvgPassoUltimo(st, resps, cfg); // historico e catalogo: falha nao desfaz a identificacao
  if (!resps.some(ok200)) return falha(op, r0);
  const lista = Array.isArray(r0.body) ? r0.body : [];
  switch (op) {
    case 'identificar_cliente': {
      const cs = lista.filter((c) => c && c.idCliente).map((c) => ({ idCliente: c.idCliente, nome: bvMNomeProprio(`${c.nomeCliente || ''} ${c.sobrenomeCliente || ''}`), primeiroNome: bvMNomeProprio(String(c.nomeCliente || '').trim().split(/\s+/)[0]) }));
      if (cs.length === 0) return bvgFim({ ok: true, encontrado: false, cadastro_necessario: true, orientacao: BVG_ORIENT_CADASTRO }, { pedido: { idCliente: null, cliente_sem_cadastro: true, identificado: true } });
      if (cs.length === 1) {
        const ped = { idCliente: cs[0].idCliente, cliente_sem_cadastro: false, cliente_nome: cs[0].primeiroNome, identificado: true };
        if (meta.sem_historico) return bvgFim({ ok: true, encontrado: true, nome: ped.cliente_nome }, { pedido: ped });
        return { reqs: [{ m: 'GET', path: '/agenda/historico', qs: { idCliente: ped.idCliente, pageSize: 10 } }, { m: 'GET', path: '/agenda/agendamentos', qs: { idCliente: ped.idCliente, proximos: true } }], st: { ...st, meta: { ...meta, etapa: 'hist', ped } } };
      }
      const of = bvMontarOferta('cliente', cs.map((c) => ({ rotulo: c.nome, valor: c })), cfg);
      return bvgFim({ ok: true, varios: true, opcoes: of.itens.map((x) => ({ id: x.id, nome: x.rotulo })), orientacao: 'mais de um cadastro neste telefone; pergunte quem é e use escolher_cliente' },
        { opcoes: of, pedido: { idCliente: null, cliente_sem_cadastro: false, identificado: true } });
    }
    case 'cadastrar_cliente': {
      if (meta.etapa === 'busca_nome') { // mesmo nome completo com outro celular: nao cadastra, encaminha (Decision 6)
        const nome = bvgNomeNorm(`${meta.cad.ns.nome} ${meta.cad.ns.sobrenome}`), meu = bvgCelular(i.telefone);
        const homonimo = lista.some((c) => c && bvgNomeNorm(`${c.nomeCliente || ''} ${c.sobrenomeCliente || ''}`) === nome && bvgCelular(c.celular) !== meu);
        return homonimo ? bvgEncaminhar('nome_outro_celular', 'cadastrar_cliente', cfg) : { reqs: [meta.post], st: { ...st, meta: { ...meta, etapa: 'post' } } };
      }
      return r0.body && r0.body.idCliente ? bvgCadastrado(meta.cad, r0.body.idCliente) : falha(op, { status: 500 });
    }
    case 'listar_servicos': {
      const vistos = new Set(); // uma busca por termo: junta sem repetir
      const juntas = resps.filter(ok200).flatMap((r) => (Array.isArray(r.body) ? r.body : [])).filter((s) => s && !vistos.has(s.idServico) && vistos.add(s.idServico));
      // Mais pedidos primeiro (owner, 2026-11-16): a API devolve em ordem alfabetica e a lista do WhatsApp so cabe 10; o corte adulto,
      // 55% da agenda, era o 13o. cfg.destaque = nomes na ordem medida; quem nao esta nela segue depois, na ordem da API.
      const dest = (cfg.destaque || []).map((x) => String(x).trim().toLowerCase());
      const peso = (s) => { const k = dest.indexOf(s.nome.trim().toLowerCase()); return k < 0 ? dest.length : k; };
      const ss = bvFiltrarServicos(juntas.filter((s) => s.ativo !== false).map((s) => ({ ...s, nome: String(s.descricaoAgenda || '') })))
        .filter((s) => !meta.soCabelo || !/\bunhas?\b/i.test(s.nome))
        .map((s, k) => [peso(s), k, s]).sort((a, b) => a[0] - b[0] || a[1] - b[1]).map((x) => x[2]);
      const of = bvMontarOferta('servico', ss.map((s) => ({ rotulo: s.nome, valor: { idServico: s.idServico, nome: s.nome, preco: s.valorPadrao, minutos: s.tempoPadrao } })), cfg);
      const orientacao = meta.limpou2v ? 'ofereça o serviço regular, sem falar em desconto' : ss.length > of.itens.length ? 'a lista traz os serviços mais pedidos e há outros: se o cliente não achar o que quer, peça um termo para filtrar' : undefined;
      return bvgFim({ ok: true, total: ss.length, servicos: of.itens.map((x) => ({ id: x.id, nome: x.valor.nome, preco: x.valor.preco })), orientacao }, { opcoes: of });
    }
    case 'listar_barbeiros': {
      const bs = bvFiltrarBarbeiros(lista.map((b) => ({ id: b.idProfissional, apelido: String(b.apelido || '').trim(), nome: b.nomeCompleto })), cfg.testeId, cfg.testeLiberado, cfg.humanos);
      const of = bvMontarOferta('barbeiro', bs.map((b) => ({ rotulo: b.apelido, valor: { idProfissional: b.id, apelido: b.apelido } })), cfg);
      const esc = meta.escolhido && of.itens.find((x) => x.valor.idProfissional === meta.escolhido.idProfissional);
      const orientacao = !of.itens.length ? 'nenhum barbeiro disponível para este serviço'
        : esc ? `o cliente já escolheu ${esc.rotulo} nesta conversa: siga com horarios_livres dele, sem perguntar o barbeiro de novo`
          : meta.escolhido ? `${meta.escolhido.apelido}, que o cliente escolheu, não faz este serviço: diga isso e ofereça os barbeiros da lista` : undefined;
      return bvgFim({ ok: true, barbeiros: of.itens.map((x) => ({ id: x.id, nome: x.rotulo })), orientacao },
        { opcoes: of, pedido: { servico: meta.servico, barbeiros: of.itens.map((x) => ({ opcao_id: x.id, ...x.valor })), horario: null } });
    }
    case 'horarios_livres': {
      if (meta.etapa === 'ag_prof') {
        const bs = bvFiltrarBarbeiros(lista.map((b) => ({ idProfissional: b.idProfissional, apelido: String(b.apelido || '').trim(), nome: b.nomeCompleto })), cfg.testeId, cfg.testeLiberado, cfg.humanos)
          .filter((b) => b.idProfissional !== meta.semId).slice(0, 10); // semId: o barbeiro habitual, ja consultado e sem horario
        if (!bs.length) return bvgFim({ ok: true, total: 0, orientacao: meta.sem ? `${meta.sem} não tem horário nesse dia e não há outro barbeiro para este serviço; sugira outro dia` : 'nenhum barbeiro disponível para este serviço' });
        const reqs = bvgReqsLivre(bs.map((b) => ({ idServico: meta.servico.idServico, idProfissional: b.idProfissional, data: meta.data })));
        return { reqs, st: { ...st, meta: { ...meta, etapa: null, barbeiros: bs } } };
      }
      const porHora = new Map();
      const faixa = meta.periodo && BVG_PERIODOS[meta.periodo];
      const noPeriodo = (hh) => !faixa || (hh >= faixa[0] && hh < faixa[1]);
      const porBarbeiro = [];
      meta.barbeiros.forEach((b, k) => {
        const r = resps[k];
        if (!ok200(r) || !r.body || !Array.isArray(r.body.horarios)) return;
        const hs = bvgLivre(r.body, resps[meta.barbeiros.length + k]).inicios;
        hs.forEach((hh) => { if (!porHora.has(hh)) porHora.set(hh, { b, minutos: r.body.minutos }); });
        const hp = hs.filter(noPeriodo);
        porBarbeiro.push({ barbeiro: b.apelido, total: hp.length, primeiro: hp[0] || null });
      });
      const todas = [...porHora.keys()].sort();
      const perto = bvgPertoDaHora(faixa ? todas.filter((hh) => hh >= faixa[0] && hh < faixa[1]) : todas, meta.hora, cfg, (hh) => hh);
      const horas = perto.itens;
      const s = meta.servico;
      const of = bvMontarOferta('horario', horas.map((hh) => {
        const { b, minutos } = porHora.get(hh);
        return { rotulo: meta.qualquer ? `${hh} ${b.apelido}` : hh, valor: { data: meta.data, hora: hh, idProfissional: b.idProfissional, apelido: b.apelido, idServico: s.idServico, servico: s.nome, preco: s.preco, minutos } };
      }), cfg, true); // FR-001: oferta completa; o Compor divide em listas
      const res = { ok: true, data: meta.data, total: horas.length, completa: true, opcoes: of.itens.map((x) => ({ id: x.id, hora: x.valor.hora, barbeiro: x.valor.apelido })) };
      // A lista mostra um barbeiro por horario: sem o resumo, o modelo concluia "fulano nao tem horario" (teste do owner, 2026-10-22)
      if (meta.qualquer) {
        res.por_barbeiro = porBarbeiro;
        // frase pronta (suite R18, 2026-11-16): o modelo tirava o primeiro horario de cada barbeiro da lista geral e errava
        res.quem_tem_horario = porBarbeiro.map((x) => (x.total ? `${x.barbeiro} a partir de ${x.primeiro}${x.total === 1 ? ' (só esse horário)' : ''}` : `${x.barbeiro} sem horário`)).join('; ');
      }
      // "Lotado" olhando um barbeiro so (atendimentos de 2026-11-15): com o barbeiro habitual sem horario, consulta os outros neste
      // passo; com barbeiro escolhido (ou o do agendamento), o texto fala dele, nunca do dia
      const soUm = !meta.qualquer && meta.barbeiros.length === 1 ? meta.barbeiros[0] : null;
      if (!horas.length && soUm && meta.habitual) {
        return { reqs: [{ m: 'GET', path: '/servicos/profissionais', qs: { idServico: s.idServico } }], st: { ...st, meta: { ...meta, etapa: 'ag_prof', qualquer: true, habitual: false, sem: soUm.apelido, semId: soUm.idProfissional } } };
      }
      const quando = todas.length && meta.periodo ? `de ${meta.periodo} nesse dia` : 'nesse dia';
      if (!horas.length && soUm) res.orientacao = `${soUm.apelido} não tem horário ${quando} (não diga que o dia está lotado: você só consultou ele); ofereça outro ${todas.length && meta.periodo ? 'período ou ' : ''}dia com ele ou veja os outros barbeiros (horarios_livres com qualquer=true)`;
      else if (!horas.length) res.orientacao = todas.length ? `sem horário livre de ${meta.periodo} nesse dia; ofereça outro período ou outro dia` : 'dia lotado; sugira outro dia';
      // suite R18 (2026-11-16): o modelo tirava "a partir de que horas" da lista (um barbeiro por horario) e errava o primeiro horario
      else if (meta.qualquer) res.orientacao = 'a lista mostra um barbeiro por horário e não serve para dizer quando cada um começa: para dizer quem tem horário e a partir de que horas, use quem_tem_horario como está, sem trocar as horas; para falar de um barbeiro específico, chame horarios_livres com id_opcao_barbeiro dele';
      // suite R8 (2026-11-16): com a lista de qualquer barbeiro numa remarcacao, o modelo dizia que "a troca mantem o barbeiro"
      if (meta.agQualquer && horas.length) res.orientacao = 'os horários da lista são de qualquer barbeiro, não do barbeiro do agendamento: não diga que a remarcação mantém o barbeiro, não diga com quem é o agendamento atual e não cite barbeiro nenhum pelo nome; diga só que há horários nesse dia e pergunte qual fica melhor; ' + (res.orientacao || '');
      if (meta.sem) res.orientacao = `${meta.sem}, o barbeiro do último atendimento, não tem horário ${meta.periodo ? `de ${meta.periodo} ` : ''}nesse dia: diga isso ao cliente${horas.length ? ' e que os horários da lista são de outros barbeiros' : ''}` + (res.orientacao ? '; ' + res.orientacao : '');
      if (perto.aproximada) res.orientacao = bvgAvisoPerto(meta.hora, cfg) + (res.orientacao ? '; ' + res.orientacao : '');
      // Dia e hora escolhidos (owner, 2026-11-14): o horario pedido livre vai direto ao resumo e a confirmacao, sem lista
      const exato = meta.hora && of.itens.find((x) => x.valor.hora === meta.hora);
      if (exato) { // remarcacao (veio de id_opcao_agendamento) vai a reagendar: agendar criaria um novo e deixaria o antigo
        const ag = i.id_opcao_agendamento;
        res.horario_pedido_livre = exato.id;
        res.orientacao = ag ? `o horário pedido está livre: chame reagendar com id_opcao_agendamento ${ag} e id_opcao_horario ${exato.id} e peça a confirmação, sem mostrar a lista`
          : `o horário pedido está livre: chame agendar com id_opcao_horario ${exato.id} e peça a confirmação, sem mostrar a lista`;
      }
      // o barbeiro so vira escolha da conversa quando o cliente o escolheu (ou e o da remarcacao); o habitual segue sendo sugestao
      const um = soUm && !meta.habitual ? { barbeiro: { idProfissional: soUm.idProfissional, apelido: soUm.apelido }, barbeiro_ag: meta.agId || null } : {};
      return bvgFim(res, { opcoes: of, pedido: { servico: s, ...um, busca: { turno: i.turno_id, n: of.itens.length, livre: exato ? String(exato.id) : null } } });
    }
    case 'funcionamento': {
      const hs = (r0.body && Array.isArray(r0.body.horarios) ? r0.body.horarios : []).filter((h) => h && h.dia)
        .map((h) => ({ dia: String(h.dia), abre: String(h.horaInicio || ''), fecha: String(h.horaFim || '') }));
      return bvgFim({ ok: true, horarios: hs, orientacao: hs.length ? 'dia fora da lista: diga que não tem essa informação e ofereça passar para a equipe' : 'sem horário de funcionamento; ofereça passar para a equipe' });
    }
    case 'meus_agendamentos': {
      if (meta.etapa === 'ident') { // 0 ou varios cadastros: devolve a propria identificacao (pedir nome | escolher_cliente)
        const id = bvgPassoUm({ ...st, meta: { op: 'identificar_cliente', sem_historico: true } }, resps0, cfg);
        const ped = id.final.efeitos.pedido;
        if (!ped.idCliente) return id;
        return { reqs: [{ m: 'GET', path: '/agenda/agendamentos', qs: { idCliente: ped.idCliente, proximos: true } }], st: { ...st, meta: { ...meta, etapa: null, ident: ped } } };
      }
      const ags = bvgAgsVisiveis(lista, cfg);
      const of = bvMontarOferta('agendamento', ags.map((a) => ({
        rotulo: `${bvgDia(String(a.horaInicio))} ${String(a.horaInicio).slice(11, 16)} ${a.descricaoServico || ''}`.trim(),
        valor: { idAgenda: a.idAgenda, horaInicio: a.horaInicio, idServico: a.idServico, servico: a.descricaoServico, idProfissional: a.idProfissional, profissional: String(a.profissional || '').trim(), recorrente: !!a.recorrente },
      })), cfg);
      const ident = meta.ident ? { nome: meta.ident.cliente_nome } : {};
      // barbeiro de teste e barbeiro so da equipe: o nome nao vai ao modelo (item 21; no TESTE a frase com o nome era cortada na saida e a
      // resposta ficava sem dizer qual era o agendamento). so_equipe diz ao modelo o que fazer sem dizer quem e.
      const hum = (v) => !!bvBarbeiroHumano({ idProfissional: v.idProfissional, apelido: v.profissional }, cfg.humanos);
      const lst = of.itens.map((x) => ({ id: x.id, servico: x.valor.servico, ...(x.valor.idProfissional === cfg.testeId || hum(x.valor) ? {} : { barbeiro: x.valor.profissional }), inicio: x.valor.horaInicio, ...(hum(x.valor) ? { so_equipe: true } : {}) }));
      const orient = !of.itens.length ? 'nenhum agendamento futuro' : lst.some((x) => x.so_equipe) ? 'agendamento com so_equipe é com um barbeiro que só a equipe agenda: não diga o nome dele; para remarcar esse, chame transferir_atendimento; cancelar segue o fluxo normal' : undefined;
      return bvgFim({ ok: true, ...ident, agendamentos: lst, orientacao: orient }, { opcoes: of, pedido: { ...(meta.ident || {}), futuros: ags.slice(0, 10).map(bvgFut), agendamentos: of.itens.map((x) => ({ opcao_id: x.id, ...x.valor })), ...(['horario', 'sequencia'].includes((ctx.opcoes || {}).tipo) ? { horarios_oferta: ctx.opcoes } : {}) } });
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
    const sets = meta.servicos.map((_, k) => bvFiltrarBarbeiros((Array.isArray(resps[k].body) ? resps[k].body : []).map((b) => ({ id: b.idProfissional, apelido: String(b.apelido || '').trim(), nome: b.nomeCompleto })), cfg.testeId, cfg.testeLiberado, cfg.humanos));
    const teto = Math.max(1, Math.floor(((cfg.graces || {}).max_consultas_estagio || 20) / (n + 1))); // n grades + 1 ocupacoes por barbeiro
    const comuns = sets[0].filter((b) => sets.every((x) => x.some((y) => y.id === b.id))).slice(0, teto);
    if (!comuns.length) return semUnico();
    // as ocupacoes de um barbeiro nao dependem do servico: uma consulta por barbeiro (com o 1o servico), depois das grades
    const reqs = [...comuns.flatMap((b) => meta.servicos.map((s) => ({ m: 'GET', path: '/agenda/horarios-livres', qs: { idServico: s.idServico, idProfissional: b.id, data: meta.data } }))),
      ...comuns.map((b) => ({ m: 'GET', path: '/agenda/horarios', qs: { idServico: meta.servicos[0].idServico, idProfissional: b.id, data: meta.data } }))];
    return { reqs, st: { ...st, meta: { ...meta, etapa: 'enc_grade', barbeiros: comuns } } };
  }
  if (meta.etapa === 'dif_prof') return bvgDifProf(st, resps, cfg);
  if (meta.etapa === 'dif_grade') return bvgDifGrade(st, resps, cfg);
  const seqs = [];
  const G = meta.barbeiros.length * n; // grades primeiro (barbeiro x servico), depois uma ocupacao por barbeiro
  meta.barbeiros.forEach((b, bi) => {
    const gr = meta.servicos.map((_, k) => bvgLivre(resps[bi * n + k].body || {}, resps[G + bi]));
    gr[0].inicios.forEach((ini) => {
      let t = ini;
      const itens = [];
      for (let k = 0; k < n; k++) {
        const g = gr[k], s = meta.servicos[k];
        if (!(g.minutos > 0) || !g.cabe(t)) break;
        itens.push({ idServico: s.idServico, servico: s.nome, idProfissional: b.id, apelido: b.apelido, hora: t, minutos: g.minutos, valor: s.preco });
        t = bvgSomaMin(t, g.minutos);
      }
      if (itens.length === n) seqs.push({ hora: ini, apelido: b.apelido, valor: { data: meta.data, itens } });
    });
  });
  if (!seqs.length) return semUnico();
  seqs.sort((x, y) => (x.hora < y.hora ? -1 : x.hora > y.hora ? 1 : 0));
  const perto = bvgPertoDaHora(seqs, meta.hora, cfg);
  const of = bvMontarOferta('sequencia', perto.itens.map((q) => ({ rotulo: `${q.hora} ${q.apelido}`, valor: q.valor })), cfg, true);
  return bvgFim({ ok: true, data: meta.data, total: perto.itens.length, completa: true, opcoes: of.itens.map((x) => ({ id: x.id, hora: x.valor.itens[0].hora, barbeiro: x.valor.itens[0].apelido })), orientacao: perto.aproximada ? bvgAvisoPerto(meta.hora, cfg) : undefined },
    { opcoes: of, pedido: { ...pedido, modo_encadeamento: 'mesmo_barbeiro' } });
}

// Barbeiros diferentes por servico (FR-012): primeiro barbeiro, na ordem de listar_barbeiros, que tem o inicio exato (fim do anterior) na grade.
function bvgDifProf(st, resps, cfg) {
  const { meta } = st;
  const n = meta.servicos.length;
  const teto = Math.max(1, Math.floor(((cfg.graces || {}).max_consultas_estagio || 20) / (2 * n)));
  const sets = meta.servicos.map((_, k) => bvFiltrarBarbeiros((Array.isArray(resps[k].body) ? resps[k].body : []).map((b) => ({ id: b.idProfissional, apelido: String(b.apelido || '').trim(), nome: b.nomeCompleto })), cfg.testeId, cfg.testeLiberado, cfg.humanos).slice(0, teto));
  if (sets.some((x) => !x.length)) return bvgFim(bvgRecusa('sem_barbeiro_servico', 'nenhum barbeiro disponível para um dos serviços; ofereça chamar a equipe da loja'));
  const reqs = bvgReqsLivre(sets.flatMap((bs, k) => bs.map((b) => ({ idServico: meta.servicos[k].idServico, idProfissional: b.id, data: meta.data }))));
  return { reqs, st: { ...st, meta: { ...meta, etapa: 'dif_grade', sets } } };
}

function bvgDifGrade(st, resps, cfg) {
  const { meta } = st;
  const pedido = { servicos: meta.servicos.map((s, k) => ({ opcao_id: String(k + 1), idServico: s.idServico, nome: s.nome, preco: s.preco })), modo_encadeamento: 'barbeiros_diferentes' };
  let o = 0;
  const G = meta.sets.reduce((a, bs) => a + bs.length, 0); // grades primeiro, depois as ocupacoes na mesma ordem
  const grades = meta.sets.map((bs) => bs.map((b) => { const liv = bvgLivre(resps[o].body || {}, resps[G + o]); o++; return { b, ...liv }; }));
  const inicios = [...new Set(grades[0].flatMap((g) => g.inicios))].sort();
  const seqs = [];
  inicios.forEach((ini) => {
    let t = ini;
    const itens = [];
    for (let k = 0; k < meta.servicos.length; k++) {
      const g = grades[k].find((x) => x.minutos > 0 && x.cabe(t));
      if (!g) break;
      const s = meta.servicos[k];
      itens.push({ idServico: s.idServico, servico: s.nome, idProfissional: g.b.id, apelido: g.b.apelido, hora: t, minutos: g.minutos, valor: s.preco });
      t = bvgSomaMin(t, g.minutos);
    }
    if (itens.length === meta.servicos.length) seqs.push({ hora: ini, apelidos: [...new Set(itens.map((x) => x.apelido))], valor: { data: meta.data, itens } });
  });
  if (!seqs.length) return bvgFim({ ok: true, data: meta.data, total: 0, completa: true, opcoes: [], orientacao: 'nenhuma sequência cabe nesse dia, nem com barbeiros diferentes; ofereça outro dia ou agendar cada serviço separado' }, { pedido });
  const perto = bvgPertoDaHora(seqs, meta.hora, cfg);
  const of = bvMontarOferta('sequencia', perto.itens.map((q) => ({ rotulo: `${q.hora} ${q.apelidos.join(' e ')}`, valor: q.valor })), cfg, true);
  return bvgFim({ ok: true, data: meta.data, total: perto.itens.length, completa: true, barbeiros_diferentes: true, opcoes: of.itens.map((x) => ({ id: x.id, hora: x.valor.itens[0].hora, barbeiros: x.valor.itens.map((i) => i.apelido) })), orientacao: perto.aproximada ? bvgAvisoPerto(meta.hora, cfg) : undefined }, { opcoes: of, pedido });
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
    : { criar: itens.map((x, j) => (res[j] && res[j].estado === 'criado' ? bvgItemMsg(res[j].idAgenda, x, p.dados.idCliente, bvgProfDe(x, meta), meta.nome) : null)).filter(Boolean), cancelar: [] };
  const ped = (st.ctx && st.ctx.pedido) || {};
  const futuros = itens.reduce((fs, x, j) => (res[j] && res[j].estado === 'criado' ? bvgFuturos({ futuros: fs }, cancela ? 'cancelar' : 'agendar', x, res[j].idAgenda) : fs), Array.isArray(ped.futuros) ? ped.futuros : []);
  const fim = (estado, resultado, extra = {}) => bvgFim({ ...resultado, criados, faltaram }, { ...extra, pedido: { ...(extra.pedido || {}), futuros }, mensagens: msgs, proposta_upd: { id: p.id, estado, resultado: { ok: !!resultado.ok, code: resultado.code, itens: res } } });
  if (ok) return fim('executada', { ok: true, ...bvgFeito(p) }, { opcoes: {}, pedido: { servico: null, barbeiros: null, horario: null, agendamentos: null, horarios_oferta: null, faltantes: null } });
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
  const limpaCom = (novoId) => ({ opcoes: {}, pedido: { servico: null, barbeiros: null, horario: null, agendamentos: null, horarios_oferta: null, futuros: bvgFuturos(st.ctx && st.ctx.pedido, p.acao, d, novoId) } });
  const termina = (estado, resultado, extra = {}) => bvgFim(resultado, { ...extra, proposta_upd: { id: p.id, estado, resultado: { ok: !!resultado.ok, code: resultado.code } } });
  const err = (op, r) => { const e = bvGErro(r, op); return { e, f: e.falha }; };
  const prox = (etapa, reqs, extra = {}) => ({ reqs, st: { ...st, meta: { ...meta, etapa, ...extra } } });
  if (meta.etapa === 'reval_c') {
    const itens = p.dados.itens;
    const ruim = resps.slice(0, itens.length).findIndex((r) => r.status !== 200); // ocupacoes com falha so tiram o encaixe (bvgLivre)
    if (ruim >= 0) { const { e, f } = err('horarios_livres', resps[ruim]); return termina(e.incerto ? 'incerta' : 'falhou', { ok: false, code: e.incerto ? 'incerta' : e.code, orientacao: e.orientacao }, { falha: f }); }
    const livre = itens.every((x, j) => resps[j].body && Array.isArray(resps[j].body.horarios) && bvgLivre(resps[j].body, resps[itens.length + j]).cabe(x.hora));
    if (!livre) return termina('falhou', { ok: false, code: 'horario_indisponivel', orientacao: 'a sequência não está mais livre; consulte horarios_livres de novo e ofereça outras opções' }, { opcoes: {} });
    return prox('escrita_c', [bvgReqItem(p, 0, meta)], { k: 0, res: [] });
  }
  if (meta.etapa === 'escrita_c') return bvgPassoConjunto(st, r0, cfg);
  if (meta.etapa === 'reval') {
    const livre = r0.status === 200 && r0.body && Array.isArray(r0.body.horarios) && bvgLivre(r0.body, resps[meta.idCliente ? 2 : 1]).cabe(d.hora);
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
      const res = { ok: true, [msg.replace(' ', '_')]: true, ...bvgFeito(p) };
      if (meta.verificada) res.verificada = true;
      const novoId = meta.etapa === 'escrita2' ? meta.novoId : (r0.body && r0.body.idAgenda);
      return termina('executada', res, { ...limpaCom(novoId), mensagens: bvgMsgs(p, meta, novoId), ...(repetida ? { falha: { motivo: 'graces|escrita_repetida', operacao: p.acao, code: 'REPETIDA', status: 0, trace: null } } : {}) });
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
      return termina('executada', { ok: true, [msg.replace(' ', '_')]: true, verificada: true, ...bvgFeito(p) }, { ...limpaCom(novo), mensagens: bvgMsgs(p, meta, novo) });
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
    const dados = { servico: it.servico, barbeiro: it.barbeiro, fim: it.fim, ...(it.recorrente ? { recorrente: true } : {}), ...(it.nome ? { nome: it.nome } : {}) };
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
    ...bvgMsgParams(e, msg), e.contato && e.contato.como_conheceu ? String(e.contato.como_conheceu) : null];
}

if (typeof module !== 'undefined') module.exports = { bvGNormalizar, bvGPlano, bvGPasso, bvGErro, bvGParams, BVG_ACOES };
