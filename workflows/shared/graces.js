// Logica pura das ferramentas da Graces (sem rede). contracts/ferramentas-graces.md. Incluida DEPOIS de shared/agente.js
// nos Code nodes de bv-graces ({{BV:INCLUDE:...}}). Protocolo: bvGPlano -> chamadas HTTP -> bvGPasso (em laco, ate graces.max_estagios).
// Regras duras em codigo: FR-007 (duas fases), FR-012 (barbeiro de teste), FR-020 (idCliente so do pedido/telefone),
// TESTE: escrita sempre redirecionada ao barbeiro de teste (research Decision 10). PROD: agenda real com graces.escrita_liberada.
if (typeof module !== 'undefined' && typeof bvFiltrarBarbeiros === 'undefined') Object.assign(globalThis, require('./agente.js'));
if (typeof module !== 'undefined' && typeof bvMProgramar === 'undefined') Object.assign(globalThis, require('./mensagens.js'));

const BVG_CAMPOS = ['operacao', 'contato_id', 'telefone', 'turno_id', 'ambiente', 'texto', 'id_opcao', 'id_opcao_servico',
  'id_opcao_barbeiro', 'qualquer', 'data', 'id_opcao_horario', 'id_opcao_agendamento', 'substitui_id_opcao_agendamento',
  'proposta_id', 'nome', 'id_opcoes_servicos', 'id_opcoes_agendamentos', 'periodo', 'hora', 'a_partir', 'texto_cliente', 'nascimento', 'como_conheceu', 'motivo'];
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
// agendar aceita tambem `reagendar`: o agendar no horario de uma busca de remarcacao grava a proposta de remarcar (bvgFase1) e, no
// sim, o modelo pode repetir a mesma ferramenta; a fase 2 decide tudo pela acao da proposta, que e o resumo que o cliente confirmou.
const BVG_ACOES = { agendar: 'agendar,trocar_servico,agendar_conjunto,reagendar', reagendar: 'reagendar', cancelar: 'cancelar,cancelar_conjunto' };

// Periodo pedido pelo cliente (suite R1: pediu tarde e recebeu o dia inteiro a partir das 08:00): [inicio, fim) em HH:MM.
const BVG_PERIODOS = { manha: ['00:00', '12:00'], tarde: ['12:00', '18:00'], noite: ['18:00', '24:00'] };
// O que o cliente pediu de horario (periodo e hora minima), pelo inicio: a mesma regra na busca de um servico e na sequencia.
const bvgNoPedido = (meta) => { const f = meta.periodo && BVG_PERIODOS[meta.periodo]; return (hh) => (!f || (hh >= f[0] && hh < f[1])) && (!meta.aPartir || hh >= meta.aPartir); };
const bvgQuando = (meta, temNoDia) => (temNoDia && meta.aPartir ? `a partir das ${meta.aPartir} nesse dia` : temNoDia && meta.periodo ? `de ${meta.periodo} nesse dia` : 'nesse dia');
// Hora aproximada dita pelo cliente (owner, 2026-10-28): so inicios ate horarios.margem_min (60) dela; sem nenhum, os 2 mais proximos de cada lado.
const bvgMargemMin = (cfg) => Number((cfg.horarios || {}).margem_min) || 60;
const bvgAvisoPerto = (hora) => `não há horário perto das ${hora}; a lista traz os mais próximos: diga isso com as suas palavras ("às ${hora} não tem"), sem falar em minutos nem em "início"`;
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
// "Depois das 18h" (17/11): o modelo manda hora=18:00, que quer dizer "perto das 18h". Um campo proprio na ferramenta (a_partir) fazia
// a chamada ao modelo travar ou ser recusada pela OpenAI (R18 em 19/11: 4 de 12 conversas, contra 0 de 13 sem o campo). A decisao e
// do codigo: se o texto do cliente no turno diz "depois das", "a partir das" ou "apos as" a mesma hora, ela vira hora minima.
function bvgDepoisDas(texto, hora) {
  const h = Number(String(hora).slice(0, 2));
  return [...String(texto || '').matchAll(/(?:depois|a\s+partir|ap[oó]s)\s+(?:d[aeo]s?\s+|[aà]s?\s+)?(\d{1,2})(?!\d)/gi)].some((m) => Number(m[1]) % 12 === h % 12);
}

// "Obrigado" depois do resumo foi entendido como confirmacao e o agendamento foi criado (17/11). A fase 2 (proposta_id) so segue se a
// fala do cliente no turno tem um sim; e condicao necessaria, nao suficiente: com um sim no texto, quem decide continua sendo o modelo.
// Sim que nao esta na lista custa uma pergunta a mais ("posso confirmar?"); um agendamento sem consentimento custa mais.
const BVG_SIM = /(?:^|[^a-z])(?:s|ss+|si+m+|isso|pode|podemos|confirm[a-z]*|fech[a-z]*|ok+|okay|blz|beleza|claro|certo|certinho|perfeito|otimo|show|top|bora|vamos|vamo|manda|marc[a-z]*|agend[a-z]*|remarc[a-z]*|quero|combinado|uhum|aham|ta|exat[a-z]*|corret[a-z]*|positivo|feito|demorou|yes|aceito|joia|por favor|com certeza|esta bom|tudo bem|tudo certo|de acordo|esse mesmo|essa mesma|isso mesmo|mais um)(?:$|[^a-z])/;
// Negacao ou espera ao lado do sim ("não quero mais", "espera, não marca ainda", "tá caro, deixa") tambem nao confirma (revisao de
// seguranca, 19/11): a barreira nao pode devolver ao modelo, sozinho, justamente a recusa.
const BVG_EMOJI_SIM = /[👍👌✅🤝]/u;
// Cancelamento negado (27/11: revisao independente, com o "dito" como unica chave da proposta da lista). O texto chega sem acento
// ("ñ" e "n") e com a pontuacao. "não" abreviado ("n", "nn", "naum") antes do verbo, ate duas palavras no meio, sem virgula
// ("não vou poder ir, cancela" e "não, cancela" seguem cancelando); a mencao que nao e pedido ("antes de cancelar", "em vez de",
// "remarcar que cancelar", "se cancelar"); e o nao depois do verbo ("cancela n", "cancela ainda não", "cancelar? não", "cancelar, não").
// "desmarque" troca o c por qu: o radical e desmar[cq]. "mantém"/"manter" (o agendamento) e o contrario de cancelar.
const BVG_NAO_CANCELA = new RegExp([
  '(?:^|[^a-z])(?:nao|n|nn|naum|nem|nunca|jamais)\\s+(?:[a-z]+\\s+){0,2}(?:cancel|desmar[cq])',
  '(?:sem|em vez de|inves de|no lugar de|antes de|do que|remarc[a-z]*\\s+que)\\s+(?:cancel|desmar[cq])',
  '(?:^|[^a-z])se\\s+(?:eu\\s+)?(?:cancel(?:ar|o)|desmarc(?:ar|o))',
  '(?:cancel|desmar[cq])[a-z]*(?:\\s+mesmo|\\s+ainda)?\\s+(?:nao|n|nn|naum|nunca|jamais|nada)(?:$|[^a-z])',
  '(?:cancel|desmar[cq])[a-z]*[\\s,.!?]+(?:nao|n|nn|naum|nunca|jamais)\\s*(?:$|[,.!?])',
  'desist|deixa|espera|mante[mr]|mantenh'].join('|'));
// O pedido dito: so as formas de quem manda cancelar (com a letra final repetida, "cancelaaa", e o plural, "cancelem"). "cancelou?",
// "foi cancelado?" e "taxa de cancelamento" falam de cancelamento sem pedir um.
const BVG_CANCELA = /(?:^|[^a-z])(?:cancel(?:a+|a+r+|e+m?|o+)|desmarc(?:a+|a+r+|o+)|desmarque+m?)(?:$|[^a-z])/;
// Pergunta SOBRE cancelar ("como faço pra cancelar?", "até quando posso cancelar?", "posso cancelar depois se precisar?") nao e pedido;
// o pedido em forma de pergunta ("pode cancelar?", "cancela pra mim?") nao tem interrogativo nem "depois" colado no verbo.
const BVG_PERGUNTA_CANCELAR = /(?:(?:^|[^a-z])(?:como|quando|por que|porque|pra que|para que|o que)(?=$|[^a-z])|(?:cancel|desmar[cq])[a-z]*\s+depois).*\?[^a-z0-9]*$/;
// soDito (so no cancelar): o sim generico nao vale, so o cancelamento dito ("cancela", "desmarca", o toque em "Cancelar mesmo"). E o que
// a fase 2 exige da proposta que nasceu com a lista "Remarcar / Cancelar mesmo" (bvgFase2, cliente_nao_disse_cancelar).
function bvgConfirmou(texto, operacao, soDito) {
  const cru = String(texto || '').slice(0, 600).replace(/\[[^\]]*\]/g, ' '); // sem as marcas "[áudio transcrito]"; teto: a regex e quadratica em "[[[["
  const t = bvNormalizarDescricao(cru).toLowerCase();
  const sim = !bvNegou(t) && (BVG_SIM.test(t) || BVG_EMOJI_SIM.test(cru));
  if (operacao !== 'cancelar') return sim;
  // Cancelar: "cancela"/"desmarca" dito vale mesmo ao lado de "não quero remarcar" (a pergunta e "remarcar ou cancelar?", e ha quem
  // digite em vez de tocar); cancelamento negado ou desistencia nao vale.
  if (BVG_NAO_CANCELA.test(t)) return false;
  if (BVG_CANCELA.test(t)) return !BVG_PERGUNTA_CANCELAR.test(t);
  // sim generico (so a pergunta direta o aceita): quem manda marcar, remarcar ou agendar nao esta dizendo sim ao cancelamento
  // ("marca pra segunda então", "agenda outro pra mim" passavam por "marca" e "agenda" estarem na lista do sim, 27/11). So o verbo:
  // "sim, o agendamento de sábado" e "sim, o horário marcado" respondem a pergunta direta.
  return !soDito && sim && !/remarc|(?:^|[^a-z])(?:marc(?:a|ar|o)|marque|agend(?:a|ar|e|o))(?:$|[^a-z])/.test(t);
}

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
  if (v.a_partir !== undefined && !/^([01]\d|2[0-3]):[0-5]\d$/.test(v.a_partir)) return ruim('a_partir');
  // texto_cliente vem do fluxo (as mensagens do cliente no turno), nunca do modelo; so serve para a hora minima
  if (v.operacao === 'horarios_livres' && v.hora !== undefined && v.a_partir === undefined && bvgDepoisDas(v.texto_cliente, v.hora)) { v.a_partir = v.hora; delete v.hora; }
  if (v.proposta_id !== undefined && v.texto_cliente !== undefined && !bvgConfirmou(v.texto_cliente, v.operacao)) {
    return { ok: false, resultado: bvgRecusa('cliente_nao_confirmou', 'a mensagem do cliente não confirma: nada foi feito na agenda. Responda ao que ele disse em uma frase e pergunte de novo se pode confirmar') };
  }
  // so_sim: a fala confirma so por um sim generico, sem dizer cancelar (derivado da fala, como cabelo_barba: nao entra de fora)
  if (v.operacao === 'cancelar' && v.proposta_id !== undefined && v.texto_cliente !== undefined && !bvgConfirmou(v.texto_cliente, 'cancelar', true)) v.so_sim = true;
  if (bvgCabeloEBarba(v.texto_cliente)) v.cabelo_barba = true; // derivado da fala: nao esta em BVG_CAMPOS, nao entra de fora
  delete v.texto_cliente;
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
    reagendar: !(v.proposta_id || v.id_opcao_horario), // sem o agendamento: vale o da recusa de presenca em pauta (bvgFase1)
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
  if (tipo === 'servico') { // de uma lista anterior da conversa (sem o id da opcao dentro do servico)
    const v = (Array.isArray(p.servicos_vistos) ? p.servicos_vistos : []).find((x) => x && String(x.id) === String(id));
    if (!v) return null;
    const { id: _id, ...sv } = v;
    return sv;
  }
  if (tipo === 'barbeiro') return (p.barbeiros || []).find((b) => String(b.opcao_id) === String(id)) || (p.qualquer_opcao && String(p.qualquer_opcao) === String(id) ? { qualquer: true } : null); // o item "Qualquer barbeiro" segue valendo depois que a oferta muda
  if (tipo === 'agendamento') return (String(id) === 'rec' ? bvgRecusado(ctx) : null) || (p.agendamentos || []).find((a) => String(a.opcao_id) === String(id)) || null; // horarios_livres troca a oferta: a escolha do agendamento fica no pedido
  if (p.horarios_oferta && p.horarios_oferta.tipo === tipo) { const r = bvResolverOpcao(id, p.horarios_oferta); if (r.ok) return r.item.valor; } // meus_agendamentos troca a oferta: os horarios mostrados ficam no pedido (C7, 2026-10-25)
  return null;
}

// Ids de servico valem para a conversa inteira (PROD, 23/11: com duas listas de servicos, o "1" da de cortes era tambem o "1" da de
// depilacoes; o agente pediu corte + duas depilacoes pelos ids e a sequencia saiu com tres depilacoes, agendada). O servico ja
// ofertado guarda o id; o novo ganha o seguinte. Fica em pedido.servicos_vistos (zera na sessao nova, com o pedido). O id leva "s"
// na frente ("s1", "s2"): nao e a posicao na lista, e um "2" digitado pelo cliente nunca resolve como servico. Depende de as
// ferramentas de um turno rodarem em serie (medido em 19/11): duas listagens ao mesmo tempo repetiriam ids.
function bvgIdsDeServico(vistos, itens) {
  const lista = (Array.isArray(vistos) ? vistos : []).filter((x) => x && /^s\d+$/.test(String(x.id)) && x.idServico);
  let prox = lista.reduce((m, x) => Math.max(m, Number(String(x.id).slice(1))), 0);
  const novos = itens.map((it) => {
    const k = lista.findIndex((x) => x.idServico === it.valor.idServico);
    const id = k >= 0 ? String(lista[k].id) : `s${++prox}`;
    if (k >= 0) lista[k] = { id, ...it.valor }; else lista.push({ id, ...it.valor }); // preco e duracao do registro acompanham a ultima leitura
    return { ...it, id };
  });
  return { itens: novos, lista };
}

// Busca de servico (atendimentos de 2026-11-15): a Graces filtra por trecho do nome, e "cabelo" so achava os combos com barba
// ("Cabelo adulto + barba"); quem pedia so o corte recebia as opcoes de R$ 150 e ia embora. Cabelo/cortar sem barba busca os
// cortes (so os de cabelo: "Corte de unha" sai); cabelo (ou corte) com barba busca os combos.
const bvgEhCombinado = (nome) => { const n = bvgNomeNorm(nome); return /\bbarbas?\b/.test(n) && /\b(?:cabelos?|cortes?)\b/.test(n); };
const bvgBuscaOsDois = (t) => bvgEhCombinado(bvgNomeNorm(t).replace(/\bcortar\b/g, 'corte')); // a busca junta cabelo (ou cortar) e barba
const bvgSoCabelo = (t) => { const n = bvgNomeNorm(t); return /\b(cabelos?|cortar)\b/.test(n) && !/\bbarbas?\b/.test(n); };
function bvgTermosServico(t) {
  const n = bvgNomeNorm(t);
  if (bvgBuscaOsDois(t)) return ['cabelo'];
  return bvgSoCabelo(t) ? ['corte'] : [t];
}

// Cabelo e barba na mesma visita (owner, 2026-11-24): o atendimento ocupa dois horarios seguidos, e quem marca os dois e o servico
// combinado ("Cabelo adulto + barba", 80 min: a grade da Graces so traz inicio com os 80 min livres; 269 inicios de 4 barbeiros
// conferidos em 24/11, nenhum furado). O modelo mandava a lista geral (18 de 18 conversas no TESTE), e quem tocava em "corte adulto"
// ficava com um horario so. Decide o codigo, pela fala do cliente no turno (texto_cliente): so os dois ligados por "e", "mais",
// "com", "+", "/", "&" ou virgula. Nao sao os dois: "cortar a barba", "corte de barba", "cabelo, sem barba", "hoje e barba" (o
// verbo "e" vira "eh" antes de perder o acento), servico de outra pessoa ("corte do meu filho e barba"), bigode e os avulsos
// ditos pelo nome ("corte adulto e barba express": o cliente escolheu).
const BVG_CAB = '(?:cabelos?|cortes?|cortar|raspar|maquina|degrade)';
const BVG_CABELO_E_BARBA = [
  new RegExp(`\\b${BVG_CAB}\\b[^.!?;]{0,40}?(?:\\b(?:e|mais|com)\\b|[+,/&])\\s*(?:(?:fazer|tambem|a|as|da|minha|uma)\\s+){0,3}barbas?\\b`),
  new RegExp(`\\bbarbas?\\s*(?:\\b(?:e|mais)\\b|[+,/&])\\s*(?:(?:fazer|cortar|tambem|o|a|os|um|uma|meu|no|na)\\s+){0,3}${BVG_CAB}\\b`)];
const BVG_NAO_E_OS_DOIS = /\b(?:sem|nao|nem)\s+(?:(?:a|fazer|quero|precisa|vou)\s+){0,2}barbas?\b|\bbarbas?\s+nao\b(?=\s*(?:[,.!?;]|$))|\bso\s+(?:o\s+)?(?:cabelo|corte)\b(?!\s*(?:de\s+cabelo\s*)?(?:(?:e|mais|com)\b|[+,/&]))|\b(?:filh[oa]s?|sobrinh[oa]s?|net[oa]s?|criancas?|menin[oa]s?|infantil|juvenil|bigode|cavanhaque|express|design|lisa)\b|\b(?:pr[oa]|para|do|da)\s+(?:[oa]\s+)?(?:meu\s+|minha\s+)?(?:pai|irma[os]?|amig[oa]s?)\b/;
const bvgCabeloEBarba = (t) => {
  const n = bvgNomeNorm(String(t || '').slice(0, 600).replace(/(^|\s)(?:é|é)(?=\s|$)/gi, '$1eh'));
  return !BVG_NAO_E_OS_DOIS.test(n) && BVG_CABELO_E_BARBA.some((re) => re.test(n));
};
// Lista de servicos so com os combinados: uma vez (se a oferta atual ja e essa, o cliente viu e quer outra coisa), so quando a busca
// do modelo e de cabelo/barba ou geral ("sobrancelha" segue como pedida) e so para quem nao tem agendamento futuro (com um ja
// marcado, "barba e cabelo" pode ser incluir o que falta: vale o horario colado do servico a mais).
const BVG_BUSCA_DOS_DOIS = new RegExp(`\\b(?:${BVG_CAB}|barbas?)\\b`); // "maquina" tambem: "máquina e barba" virava busca por "maquina" (TESTE, 24/11)
function bvgListarOsDois(i, ctx, t) {
  const of = ctx.opcoes && ctx.opcoes.tipo === 'servico' && Array.isArray(ctx.opcoes.itens) ? ctx.opcoes.itens : [];
  // quem tem pacote (pedido.dois_pacote, da listagem anterior) segue no mesmo caminho quando o modelo lista "cabelo e barba" de novo
  // num turno sem a fala (TESTE, 24/11: depois de "barba design" ele listava outra vez e saiam os combinados)
  return (!!i.cabelo_barba || (!!ctx.pedido.dois_pacote && bvgBuscaOsDois(t))) && !(Array.isArray(ctx.pedido.futuros) && ctx.pedido.futuros.length) && !(of.length && of.every((x) => bvgEhCombinado(x.rotulo)) && ctx.pedido.dois_turno !== i.turno_id) // "uma vez" e por turno: duas buscas no mesmo turno (TESTE, 24/11) nao desfazem a lista
    && (!t || BVG_BUSCA_DOS_DOIS.test(bvgNomeNorm(t)));
}
// Cliente com pacote (24/11: 65 de 288 clientes com agendamento em duas semanas tinham pacote em aberto, todos de servico avulso e
// nenhum do combinado; lista de pacotes conferida pelo owner): cabelo e barba saem pelo servico do pacote e o outro, em sequencia
// (id_opcoes_servicos), que tambem ocupa dois horarios seguidos e abate a sessao. So servicos de adulto: pacote infantil ou
// juvenil no cadastro e do filho. Leitura do pacote com falha = sem pacote (segue pelos combinados).
const bvgTipoDosDois = (nome) => { const n = bvgNomeNorm(nome); return bvgEhCombinado(n) || /\b(?:unhas?|infantil|juvenil|camuflagem)\b/.test(n) ? null : /\bbarbas?\b/.test(n) ? 'barba' : /\b(?:cabelos?|cortes?|maquina)\b/.test(n) ? 'cabelo' : null; };
// `todos` = catalogo ja filtrado e ordenado. Devolve null sem pacote de cabelo ou de barba. fixo[tipo] = o servico do pacote quando
// ha um so desse tipo; escolher = o que o cliente ainda decide: o tipo sem pacote (os avulsos dele) ou com mais de um servico no
// pacote (so os do pacote). A secao e lida por bvgSecoes, o mesmo leitor da proposta (os dois nao podem discordar).
function bvgDoPacote(todos, resp) {
  const dele = todos.filter((s) => bvgTipoDosDois(s.nome) && bvgSecoes(resp, s.idServico, '').length);
  if (!dele.length) return null;
  const tipos = ['cabelo', 'barba'].map((t) => ({ tipo: t, ds: dele.filter((s) => bvgTipoDosDois(s.nome) === t) }));
  const escolher = tipos.map(({ tipo, ds }) => ({ tipo, opcoes: ds.length === 1 ? [] : ds.length ? ds : todos.filter((s) => bvgTipoDosDois(s.nome) === tipo) })).filter((x) => x.opcoes.length);
  return { dele, ids: new Set(dele.map((s) => s.idServico)), fixo: Object.fromEntries(tipos.map(({ tipo, ds }) => [tipo, ds.length === 1 ? ds[0] : null])), escolher };
}
// Busca ou proposta de um servico avulso no turno em que ele pediu os dois: recusa uma vez por turno (pedido.dois_avisado; se o
// modelo insistir e porque o cliente quer mesmo um so, e a marca errada custa uma chamada, nunca um laco). Com agendamento de outro
// servico no dia, e servico a mais e segue.
const BVG_SO_UM = 'o cliente falou em cabelo e barba e este serviço é só um dos dois: nada foi consultado. Os dois juntos ocupam dois horários seguidos: chame listar_servicos com o texto "cabelo e barba" e siga a orientação que ela devolver (serviço combinado, ou os dois avulsos em sequência para quem tem pacote). Se ele quer mesmo só este serviço, chame de novo';
function bvgSoUmDosDois(i, ctx, sv, data) {
  if (!i.cabelo_barba || bvgEhCombinado(sv.nome) || ctx.pedido.dois_avisado === i.turno_id || bvgNoDia(ctx.pedido, data, sv.idServico).length) return null;
  return bvgFim(bvgRecusa('pediu_dois_servicos', BVG_SO_UM), { pedido: { dois_avisado: i.turno_id } });
}

// Servico da chamada: pelo id ofertado; pelo nome (so entre o ofertado, o escolhido e o do ultimo atendimento); ou o ja escolhido.
// Devolve null quando o id ou o nome nao casam com nada (nunca troca de servico em silencio).
function bvgServicoDe(i, ctx, ult) {
  if (i.id_opcao_servico) { const s = bvgResolver(i.id_opcao_servico, 'servico', ctx); if (s) return { ...s, opcao_id: s.opcao_id || i.id_opcao_servico }; }
  const u = ult && ult.servico;
  // titulo de uma palavra ("Pezinho", "Selagem") tem cara de id: se nao resolveu como id, vale como nome; nunca cai no servico ja escolhido
  const dado = i.servico_nome || i.id_opcao_servico;
  if (!dado) return ctx.pedido.servico || u || null;
  const of = ctx.opcoes && ctx.opcoes.tipo === 'servico' && Array.isArray(ctx.opcoes.itens) ? ctx.opcoes.itens.map((x) => ({ ...x.valor, opcao_id: x.id, rotulo: x.rotulo })) : [];
  const n = bvgNomeNorm(dado);
  const todos = [...of, ctx.pedido.servico, u].filter(Boolean);
  // o titulo do item da lista e cortado ("CORTE MAQUINA SIMPLES (1") e e esse texto que volta quando o cliente toca: vale como o
  // nome, mas so sem nome exato e com um unico item da lista com esse titulo (dois nomes com o mesmo comeco: a lista volta)
  const cortados = of.filter((x) => x.rotulo && bvgNomeNorm(x.rotulo) === n);
  const achou = todos.find((x) => bvgNomeNorm(x.nome) === n) || (cortados.length === 1 ? cortados[0] : null);
  if (!achou) return null;
  const { rotulo, ...sv } = achou;
  return sv;
}

// Barbeiro da busca: o da opcao informada ou, sem ela, o que ja vale na conversa (`padrao`). Opcao que nao resolve = null.
const bvgBarbeiroDe = (i, ctx, padrao) => (i.id_opcao_barbeiro ? bvgResolver(i.id_opcao_barbeiro, 'barbeiro', ctx) : padrao) || null;

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
// Cancelar fase 1 sem a lista: quem ja ouviu "remarcar ou cancelar?" (recusou a presenca deste agendamento, ou respondeu a lista sem
// dizer cancelar) recebe so a pergunta do cancelamento. E a unica proposta de cancelar em que um sim generico basta (sim_basta).
const bvgCancDireto = (acao, dados, resumo, pacote) => bvgFim({ ok: true, aguardando_confirmacao: true, resumo, ...(pacote ? { pacote: BVG_ORIENT_PACOTE } : {}), orientacao: 'ele já ouviu a oferta de remarcar: peça só a confirmação do cancelamento, em uma frase; com o sim, chame cancelar só com o proposta_id' },
  { opcoes: {}, proposta_nova: { acao, dados: { ...dados, sim_basta: true }, resumo } });
// pedido.decisao_vista: agendamentos da proposta recusada por cliente_nao_disse_cancelar (id + inicio). Sem ela a fase 1 devolveria a
// lista de decisao outra vez, e um "sim" a lista nunca terminaria.
const bvgDecisaoVista = (ctx, x) => (Array.isArray(ctx.pedido.decisao_vista) ? ctx.pedido.decisao_vista : []).some((m) => bvgMesmaMarca(m, x));
const bvgDia = (d) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;
const bvgDiaSem = (d) => bvDiaSemana(String(d)); // "sexta-feira, 20/11": o resumo leva o dia da semana pronto
// Busca de horarios do turno (pedido.busca). `chave` identifica a busca: a mesma busca repetida (retentativa do agente) roda de novo.
const bvgChaveBusca = (i) => [i.data, i.id_opcao_barbeiro, i.qualquer ? 1 : '', i.id_opcao_servico || i.servico_nome, (i.id_opcoes_servicos || []).join(','), i.id_opcao,
  i.id_opcao_agendamento, i.periodo, i.hora, i.a_partir].map((x) => (x === undefined || x === null ? '' : String(x))).join('|').slice(0, 200);
const bvgBusca = (i, n, extra = {}) => ({ turno: i.turno_id, n, livre: null, hora: false, outros: false, chave: bvgChaveBusca(i), ...extra });
// Agendamentos que o agente enxerga: em PROD o barbeiro de teste so aparece para contato de teste.
const bvgAgsVisiveis = (lista, cfg) => (Array.isArray(lista) ? lista : []).filter((a) => a && a.idAgenda && (cfg.ambiente !== 'producao' || cfg.testeLiberado || (a.idProfissional !== cfg.testeId && !/\bteste\b/i.test(String(a.profissional || '')))));
// Agendamentos futuros do cliente no pedido (revisao de 17/11): o modelo os ve no contexto e a fase 1 avisa de duplicidade.
// Lidos na identificacao e em meus_agendamentos; cada escrita desta conversa os atualiza (bvgFuturos).
// `fim` (HH:MM) e `idProfissional` servem para achar o horario colado (bvgColado); o nome do barbeiro fica de fora: nunca chega ao modelo por aqui.
const bvgFut = (a) => ({ idAgenda: a.idAgenda, idServico: a.idServico, horaInicio: String(a.horaInicio), servico: a.descricaoServico || a.servico || '', ...(a.pacote ? { pacote: true } : {}),
  ...(/T\d{2}:\d{2}/.test(String(a.horaFim || '')) ? { fim: String(a.horaFim).slice(11, 16) } : {}), ...(a.idProfissional ? { idProfissional: a.idProfissional } : {}), ...(a.recorrente ? { recorrente: true } : {}) });
// Agendamento cuja presenca o cliente recusou (PROD, 27/11). A recusa guardava so o id da agenda, que nenhuma ferramenta aceita: para
// remarcar, o modelo tinha de chamar meus_agendamentos e escolher entre os horarios marcados do cliente. Agora pedido.confirmacao_recusada
// leva { idAgenda, inicio, servico, barbeiro, idProfissional, idCliente } (no Registrar do bv-confirmacao, da linha do lembrete) e o
// agendamento sai do que a conversa ja leu da agenda (os listados ou os futuros da identificacao), sem nova consulta: a mesma ocorrencia
// (serie recorrente repete o idAgenda) ou, serie que aparece com outro id no dia (PROD, 17/11), o mesmo inicio. Vale como a opcao `rec`
// (bvgResolver) e como padrao de horarios_livres e reagendar, enquanto a recusa valer (bvMRecusa, a mesma regra da linha do contexto).
// null (as ferramentas mandam listar com meus_agendamentos): recusa vencida ou antiga (sem inicio); lembrete de outro cadastro do mesmo
// telefone; agendamento que a conversa nao leu (o de teste em PROD nao entra nos futuros); barbeiro diferente do do lembrete (achado
// pelo inicio era outro agendamento, ou a equipe trocou o barbeiro: o resumo diria um nome e a escrita iria a outro); outro agendamento
// do cliente no mesmo dia (a recusa do lembrete vale para os dois e nao da para saber de qual ele fala).
function bvgRecusado(ctx) {
  const p = ctx.pedido || {}, r = bvMRecusa(p, ctx.agoraMs, ctx.recusaMin);
  if (!r || !r.idAgenda || !r.inicio || (r.idCliente && String(r.idCliente) !== String(p.idCliente))) return null;
  const ini = (x) => String(x.horaInicio).slice(0, 16);
  const lidos = [...(p.agendamentos || []), ...(p.futuros || [])].filter((a) => a && a.horaInicio);
  const a = bvMOcorrencia(lidos, r.idAgenda, r.inicio) || lidos.find((x) => ini(x) === String(r.inicio).slice(0, 16));
  if (!a || !a.idAgenda || !a.idServico || !a.idProfissional || a.idProfissional !== r.idProfissional) return null;
  const profissional = String(a.profissional || r.barbeiro || '').trim();
  if (!profissional || lidos.some((x) => ini(x) !== ini(a) && ini(x).slice(0, 10) === ini(a).slice(0, 10))) return null;
  return { idAgenda: a.idAgenda, horaInicio: a.horaInicio, idServico: a.idServico, servico: a.servico || 'agendamento', idProfissional: a.idProfissional, profissional, recorrente: !!a.recorrente, ...(a.pacote ? { pacote: true } : {}) };
}
// `x` ({ idAgenda, horaInicio }) e o agendamento da recusa de presenca? Uma definicao so (o ramo curto do cancelar e o fim da recusa
// depois da escrita): o mesmo id e o mesmo inicio, ou o que bvgRecusado achou (a ocorrencia com outro id). Recusa antiga (sem inicio): so o id.
function bvgEhRecusado(ctx, x) {
  const r = (ctx.pedido || {}).confirmacao_recusada;
  if (!r || !x || !x.idAgenda) return false;
  if (!r.inicio) return String(r.idAgenda) === String(x.idAgenda);
  if (String(x.horaInicio).slice(0, 16) !== String(r.inicio).slice(0, 16)) return false;
  return String(r.idAgenda) === String(x.idAgenda) || String((bvgRecusado(ctx) || {}).idAgenda) === String(x.idAgenda);
}
// Escrita feita no agendamento recusado (remarcado, cancelado ou trocado): a recusa sai do pedido (a linha "nao vai poder comparecer"
// seguia no contexto). Recusa antiga (sem inicio) fica como era.
const bvgFechaRecusa = (ctx, alvos) => (((ctx && ctx.pedido) || {}).confirmacao_recusada && ctx.pedido.confirmacao_recusada.inicio && alvos.some((x) => bvgEhRecusado(ctx, x)) ? { confirmacao_recusada: null } : {});
// Marca `rec` do horario ofertado numa busca de remarcacao: o agendamento DA BUSCA, em toda busca de remarcacao (pelo `rec` ou pelo id
// da lista). Com a recusa em pauta, o horario buscado para outro agendamento (outra ocorrencia da serie, um avulso, a recusa anterior)
// nao remarca o recusado (bvgFase1). So no estado da conversa, nunca no que vai ao modelo.
const bvgMarcaRec = (x) => ({ idAgenda: x.idAgenda, inicio: String(x.horaInicio).slice(0, 16) });
const bvgMesmaMarca = (m, x) => !!m && !!x && String(m.idAgenda) === String(x.idAgenda) && String(m.inicio) === String(x.horaInicio).slice(0, 16);
// Sem saber qual agendamento: nada e feito e o modelo lista (com a recusa em pauta que nao resolve, a linha do contexto promete o `rec`).
const bvgSemAgendamento = (fim) => bvgRecusa('agendamento_nao_informado', `não dá para saber de qual agendamento o cliente fala e nada foi feito: chame meus_agendamentos (com mais de um, pergunte qual, mandando a lista) e chame esta ferramenta de novo com o id_opcao_agendamento${fim}`);
// Agendamento feito por pacote: cancelar pela API nao devolve a sessao (medido em 23/11 e conferido pelo owner no sistema: ela fica
// "Agendado" no pacote do cliente e so a equipe a libera). O agente nunca manda o DELETE nesse agendamento: remarcar mantem a sessao
// e segue com ele; quem quer mesmo cancelar, ou trocar o servico, vai para a equipe. A decisao e sempre pela agenda lida NA HORA, na
// fase 2 (a proposta pode ter nascido do lembrete, ou antes desta versao, sem marca nenhuma); a marca que acompanha a opcao e os
// agendamentos da conversa so serve para avisar o modelo na fase 1. Na duvida (leitura falhou, agendamento sumiu, cliente
// desconhecido), nada e apagado.
const bvgEhPacote = (ctx, idAgenda, d) => !!(d && d.pacote) || [...((ctx.pedido || {}).agendamentos || []), ...((ctx.pedido || {}).futuros || [])].some((a) => a && idAgenda && String(a.idAgenda) === String(idAgenda) && a.pacote);
const BVG_TXT_PACOTE = {
  cancelar: 'Como esse horário é do seu pacote, quem cancela é a equipe, para a sessão voltar para o seu pacote. ',
  cancelar_conjunto: 'Tem horário do seu pacote aí, então quem cancela é a equipe, para a sessão voltar para o seu pacote. ',
  trocar_servico: 'Como esse horário é do seu pacote, quem troca o serviço é a equipe, para você não perder a sessão do pacote. ',
};
// Fim da fase 2 que passa a conversa para a equipe em vez de apagar (motivo `pacote`, ou outro quando nao deu para conferir).
function bvgParaEquipe(p, cfg, motivo) {
  const e = bvgEncaminhar(motivo, p.acao === 'trocar_servico' ? 'agendar' : 'cancelar', cfg);
  return bvgFim({ ...e.final.resultado, texto: (motivo === 'pacote' ? BVG_TXT_PACOTE[p.acao] || '' : '') + (e.final.resultado.texto || '') },
    { ...e.final.efeitos, proposta_upd: { id: p.id, estado: 'falhou', resultado: { ok: false, code: motivo === 'pacote' ? 'pacote_equipe' : 'encaminhar_equipe' } } });
}
// Confere na agenda do cliente (lida agora) os agendamentos que a proposta quer apagar. -> { fim } quando nada deve ser apagado.
function bvgConfereApagar(p, alvos, resp, cfg, termina) {
  const lista = resp && resp.status >= 200 && resp.status < 300 && Array.isArray(resp.body) ? resp.body : null;
  if (!lista) return { fim: termina('falhou', { ok: false, code: 'nao_conferido', orientacao: 'não deu para conferir o agendamento na agenda agora e nada foi apagado: peça desculpas em uma frase e ofereça tentar de novo ou passar para a equipe' }, resp ? { falha: bvGErro(resp, 'meus_agendamentos').falha } : {}) };
  const dele = (x) => lista.filter((a) => a && x && x.idAgenda && String(a.idAgenda) === String(x.idAgenda));
  const naoAchou = () => ({ fim: termina('falhou', { ok: false, code: 'agendamento_nao_encontrado', orientacao: 'esse agendamento não está mais na agenda do cliente (pode já ter sido cancelado ou alterado) e nada foi apagado: chame meus_agendamentos e confira com ele; se ele confirmar que o horário existe (pode estar em outro cadastro), chame transferir_atendimento com motivo nao_resolvi' }, { opcoes: {} }) });
  if (alvos.some((x) => !dele(x).length)) return naoAchou();
  // qualquer ocorrencia do alvo com servicoPacote, em qualquer formato, basta (serie recorrente vem expandida em varias linhas)
  if (lista.some((a) => a && (a.pacote || a.servicoPacote) && alvos.some((x) => String(x.idAgenda) === String(a.idAgenda)))) return { fim: bvgParaEquipe(p, cfg, 'pacote') };
  // O cliente confirmou um agendamento num dia e numa hora: a ocorrencia (id + inicio) tem de estar na agenda. So pelo id, a serie
  // recorrente (o mesmo id em todas as ocorrencias) e o agendamento que a equipe mudou de horario passavam (27/11).
  if (alvos.some((x) => !bvMOcorrencia(lista, x.idAgenda, x.horaInicio))) return naoAchou();
  return {};
}
// DELETE de um agendamento ja conferido: um montador so, sempre com ?data= do dia da ocorrencia. Em serie, so a ocorrencia sai; em
// agendamento comum a Graces ignora a data (medido em 27/11 com o barbeiro de teste: 200 e apaga, ate com a data de outro dia), e por
// isso quem garante a ocorrencia exata e a conferencia acima. Sem decidir "e serie?": a serie que a leitura mostra com uma ocorrencia
// so e sem `recorrente` saia sem a data.
const bvgDel = (x) => ({ m: 'DELETE', path: `/agenda/${x.idAgenda}`, qs: { data: String(x.horaInicio).slice(0, 10) } });
const BVG_ORIENT_PACOTE = 'agendamento do pacote do cliente: remarcar mantém a sessão do pacote e você faz normalmente; se ele escolher cancelar mesmo, chame cancelar com o proposta_id como sempre, que a ferramenta passa para a equipe (só ela cancela devolvendo a sessão)';
function bvgFuturos(ped, acao, d, novoId) {
  const fs = Array.isArray(ped && ped.futuros) ? ped.futuros : [];
  const novo = (x, id) => ({ idAgenda: id || null, idServico: x.idServico, horaInicio: `${x.data}T${x.hora}:00`, servico: x.servico,
    ...(Number(x.minutos) > 0 ? { fim: bvgSomaMin(x.hora, x.minutos) } : {}), ...(x.idProfissional ? { idProfissional: x.idProfissional } : {}) });
  // so a ocorrencia (id + inicio) sai: a serie repete o idAgenda e os outros dias dela continuam marcados (27/11)
  const sem = (x) => fs.filter((a) => !bvgMesmaMarca(bvgMarcaRec(x), a));
  if (acao === 'agendar') return [...fs, novo(d, novoId)];
  if (acao === 'trocar_servico') return [...sem(d.antigo || {}), novo(d, novoId)];
  if (acao === 'reagendar') return [...sem(d), { ...novo(d, d.idAgenda), ...(d.pacote || fs.some((a) => a.idAgenda === d.idAgenda && a.pacote) ? { pacote: true } : {}) }];
  if (acao === 'cancelar') return sem(d);
  return fs;
}
// Duplicidade (revisao de 17/11): novo agendamento no mesmo dia ou do mesmo servico de um que o cliente ja tem sai com aviso.
function bvgJaTem(ped, itens) {
  const fs = Array.isArray(ped.futuros) ? ped.futuros : [];
  const a = fs.find((f) => itens.some((x) => String(f.horaInicio).slice(0, 10) === x.data)) || fs.find((f) => f.idServico && itens.some((x) => f.idServico === x.idServico));
  // pergunta de sim ou nao (suite, 18/11): "e mais um ou e para trocar?" deixava o "pode confirmar" do cliente sem resposta possivel
  return a ? { ja_tem: `${a.servico || 'agendamento'} em ${bvgDiaSem(a.horaInicio)} às ${String(a.horaInicio).slice(11, 16)}`, orientacao: 'o cliente já tem esse agendamento: mande o resumo normalmente, avise em uma frase que ele já tem esse horário e pergunte só se pode confirmar mais este (o sim dele confirma; não fale em confirmar os dois: o outro já está marcado); se ele disser que é para trocar aquele, use meus_agendamentos e reagendar' } : {};
}
// Incluir servico (PROD, 23/11: pediu para incluir cabelo e saiu so com barba, com outro barbeiro): agendamentos de OUTRO servico que o
// cliente ja tem no dia da busca. O mesmo servico no dia e remarcacao ou duplicidade (bvgJaTem), nao servico a mais.
const bvgNoDia = (ped, data, idServico) => (Array.isArray(ped.futuros) ? ped.futuros : []).filter((f) => f && f.idServico !== idServico && String(f.horaInicio).slice(0, 10) === data)
  .map((f) => ({ ...f, hora: String(f.horaInicio).slice(11, 16) }));
// Agendamento de `ancs` em que o inicio `hh` encosta: comeca quando ele termina, ou termina quando ele comeca. So marca horario que a
// grade ja ofereceu, nunca cria um (futuros desatualizados nao geram oferta errada).
const bvgColado = (ancs, hh, minutos) => ancs.find((f) => f.fim === hh || bvgSomaMin(hh, minutos) === f.hora) || null;
// Fila da vez (owner, 2026-11-26): a Graces devolve os barbeiros sempre na mesma ordem e o primeiro levava quase tudo (simulacao com a
// agenda real: 54 de 55 horarios do Kiel; PROD de 25 e 26/11: 83% das ofertas sem barbeiro escolhido). Quando QUEM indica e o sistema,
// vem primeiro quem esta ha mais tempo sem receber um agendamento indicado pelo agente; quem recebe vai para o fim. `rod` =
// ctx.rodizio ({ idProfissional: instante ISO da ultima proposta executada e indicada }, do Contexto); null = desligado (ordem da
// Graces). A lista chega ja filtrada (bvFiltrarBarbeiros): o Jayme e o de teste nao entram aqui. Sem registro vem antes, na ordem
// recebida; empate tambem (ordenacao estavel). Sem estado: duas conversas ao mesmo tempo nao disputam nada.
const bvgId = (b) => String((b && (b.idProfissional || b.id)) || '');
function bvgFila(bs, rod) {
  if (!rod || typeof rod !== 'object') return bs;
  const t = (b) => { const v = Date.parse(rod[bvgId(b)]); return Number.isNaN(v) ? -1 : v; };
  return bs.map((b, k) => [t(b), k, b]).sort((x, y) => x[0] - y[0] || x[1] - y[1]).map((x) => x[2]);
}
// Barbeiros de uma lista, sempre nesta ordem: o filtro (Jayme, teste) ANTES da fila. `chave` ('id' ou 'idProfissional') = a lista e a
// resposta crua de /servicos/profissionais e vira { [chave], apelido, nome }; sem ela, a lista ja vem montada.
const bvgBarbeiros = (lista, cfg, rod, chave) => bvgFila(bvFiltrarBarbeiros(chave ? (Array.isArray(lista) ? lista : []).map((b) => ({ [chave]: b.idProfissional, apelido: String(b.apelido || '').trim(), nome: b.nomeCompleto })) : lista, cfg.testeId, cfg.testeLiberado, cfg.humanos), rod);
// Um barbeiro por horario, em roda: `cand(hh)` = candidatos ({ b, ... }) do horario, `fila` = barbeiros na ordem da fila (null =
// desligado: o primeiro candidato vence, como antes). Cada hora vai ao candidato mais a frente na fila LOCAL, que passa para o fim
// dela. `fixo(hh)` (o barbeiro do agendamento colado) ganha o horario e nao mexe na fila local. Devolve Map hora -> candidato.
function bvgRepartir(horas, cand, fila, fixo = () => null) {
  const q = fila ? fila.map(bvgId) : null, out = new Map();
  horas.forEach((hh) => {
    const cs = cand(hh), f = fixo(hh);
    if (f) return out.set(hh, f);
    if (!cs.length) return null;
    if (!q) return out.set(hh, cs[0]);
    const c = cs.reduce((m, x) => (q.indexOf(bvgId(x.b)) < q.indexOf(bvgId(m.b)) ? x : m));
    q.push(q.splice(q.indexOf(bvgId(c.b)), 1)[0]);
    return out.set(hh, c);
  });
  return out;
}
// Texto final da escrita (revisao de 17/11): o modelo montava a confirmacao de memoria e trocava o dia ou o horario.
function bvgFeito(p) {
  const r = String((p.dados || {}).resumo || '').replace(/^(Trocar serviço: |Remarcar |Cancelar )/, '');
  const v = { agendar: 'Agendado', agendar_conjunto: 'Agendado', trocar_servico: 'Serviço trocado', reagendar: 'Remarcado', cancelar: 'Cancelado', cancelar_conjunto: 'Cancelado' }[p.acao];
  const outro = /^cancelar/.test(p.acao) ? '; depois, numa pergunta só, ofereça marcar outro horário' : '';
  return r && v ? { feito: `${v}: ${r}`, orientacao: `diga ao cliente que está feito, com o seu jeito caloroso de falar e exatamente estes dados (serviço, barbeiro, dia da semana, data e horário); não copie esta linha seca, e não mude nem recalcule nada${outro}` } : {};
}
const bvgReais = (v) => (v == null ? '' : ` (R$ ${Number(v).toFixed(2).replace('.', ',')})`);
// Pacote do cliente (item 12, owner 2026-11-23). GET /agenda/pacotes com idServico devolve as secoes em aberto ja na ordem de
// consumo da Graces: vale a primeira. O id da secao so sai dessa leitura (nunca do modelo nem da proposta guardada): a fase 1 so
// marca `pacote` no item, para o resumo, e a fase 2 rele a secao na hora de gravar.
const BVG_PACOTE_FORA = 'não deu para conferir o pacote do cliente agora e nada foi marcado: peça desculpas em uma frase e chame agendar de novo com a mesma opção de horário para refazer o resumo';
const BVG_SEM_SECAO = 'o pacote do cliente não tem mais sessão livre para esse serviço: avise e pergunte se ele quer marcar pelo valor avulso; se quiser, chame agendar de novo com a mesma opção de horário para mandar o novo resumo; se preferir, ofereça a equipe';
const bvgValor = (x) => (x.pacote ? ' (abatido do seu pacote)' : bvgReais(x.valor));
const bvgServicosDe = (itens) => [...new Set(itens.map((x) => x.idServico))];
const bvgReqPacote = (idCliente, idServico) => ({ m: 'GET', path: '/agenda/pacotes', qs: idServico ? { idCliente, idServico } : { idCliente } }); // sem servico: todos os pacotes do cliente
const bvgPacoteLido = (r) => !!r && r.status === 200 && Array.isArray(r.body);
// Secoes que servem para o servico `sv` no dia `data` (AAAA-MM-DD). Defesa sobre o que a Graces devolve (revisoes de 23/11): so
// secao do proprio servico (o filtro da consulta nao e tomado como garantia: o POST agenda "o servico da secao"), so pacote que
// nao vence antes do dia (o POST recusa e o cliente ficaria preso no mesmo resumo) e sem id repetido.
// `sv` null (so null: undefined continua nao casando com nada, como antes): secoes de qualquer servico (convite de volta).
const bvgSecoes = (r, sv, data) => [...new Set((bvgPacoteLido(r) ? r.body : [])
  .filter((x) => x && Array.isArray(x.secoes) && (x.dataValidade == null || String(x.dataValidade).slice(0, 10) >= String(data)))
  .flatMap((x) => x.secoes.filter((y) => y && (sv === null || String(y.idProdutoServico || '').toLowerCase() === String(sv).toLowerCase())))
  .map((y) => String(y.idClienteItemPacote || '')).filter((y) => BVG_UUID.test(y)))];
// resps alinhado a svs (um GET por servico distinto) -> { idServico: [secoes na ordem de consumo] }
const bvgSecoesPor = (svs, resps, data) => Object.fromEntries(svs.map((sv, j) => [sv, bvgSecoes(resps[j], sv, data)]));
// Convite de volta (owner, 2026-11-27): lembrete a quem esta ha quase um mes sem cortar. Os candidatos saem do nosso banco (o
// bv-mensagens reivindica um por rodada); a verdade vem da Graces so para ele, na hora do envio, em duas etapas.
// 1a etapa, o cadastro pelo celular -> { idCliente } ou { motivo }: sem cadastro, ou com mais de um (nao da para saber quem e), nao recebe.
function bvgConviteCliente(r) {
  if (!r || r.status !== 200 || !Array.isArray(r.body)) return { motivo: 'graces_falhou' };
  const ids = [...new Set(r.body.map((c) => String((c && c.idCliente) || '')).filter((x) => BVG_UUID.test(x)))];
  return ids.length === 1 ? { idCliente: ids[0] } : { motivo: ids.length ? 'varios_cadastros' : 'sem_cadastro' };
}
// 2a etapa, as tres leituras do cliente, nesta ordem: historico, proximos agendamentos e pacotes.
const bvgConviteReqs = (idCliente) => [{ m: 'GET', path: '/agenda/historico', qs: { idCliente, pageSize: 20 } },
  { m: 'GET', path: '/agenda/agendamentos', qs: { idCliente, proximos: true, pageSize: 5 } }, bvgReqPacote(idCliente)];
// rs: as tres respostas, na ordem de bvgConviteReqs; c: { dias_min, dias_max }; hoje: AAAA-MM-DD (Sao Paulo).
// -> { enviar: true, dias, sessoes } ou { enviar: false, motivo }. A ultima visita e a MAIOR dataAbertura do historico (a ordem das
// linhas nunca foi medida). Quem tem horario marcado, voltou depois (visita mais nova que a da nossa base) ou nao vem ha bem mais
// de um mes (o agendamento da base foi falta) nao recebe. Pacote que nao deu para ler: envia sem a frase do pacote (sessoes 0).
function bvgConvite(rs, c, hoje) {
  const [h, f, p] = Array.isArray(rs) ? rs : [];
  if (!bvgPacoteLido(h) || !bvgPacoteLido(f)) return { enviar: false, motivo: 'graces_falhou' };
  if (f.body.some((a) => a && a.idAgenda)) return { enviar: false, motivo: 'tem_horario' };
  const ult = h.body.map((x) => String((x && x.dataAbertura) || '').slice(0, 10)).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort().pop();
  if (!ult) return { enviar: false, motivo: 'sem_visita' };
  const dias = Math.round((Date.parse(`${hoje}T00:00:00Z`) - Date.parse(`${ult}T00:00:00Z`)) / 86400000);
  if (!(dias >= Number(c && c.dias_min))) return { enviar: false, motivo: 'voltou' };
  if (dias > Number(c.dias_max) + 2) return { enviar: false, motivo: 'visita_antiga' };
  return { enviar: true, dias, sessoes: bvgSecoes(p, null, hoje).length };
}
// Corpo do POST /agenda: exatamente um entre idServico (avulso) e idClienteItemPacote (secao do pacote).
const bvgCorpoAgendar = (idCliente, x, prof, idIntegracao, secao) => ({ idCliente, ...(secao ? { idClienteItemPacote: secao } : { idServico: x.idServico }), idProfissional: prof, data: x.data, horaInicio: x.hora, idIntegracao });
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

// ctx.rodizio: o do Contexto quando a chave esta ligada (valor que nao e objeto vale vazio: todos sem registro); null = desligado.
const bvgRodizio = (ctx0, cfg) => (cfg.rodizio && cfg.rodizio.ligado ? (ctx0 && ctx0.rodizio && typeof ctx0.rodizio === 'object' && !Array.isArray(ctx0.rodizio) ? ctx0.rodizio : {}) : null);
// Turno de retorno do atendimento humano (owner, 2026-11-25): o vigia marca o turno em pedido.retorno. A conversa acabou de voltar
// da equipe, entao nada a devolve neste turno (senao: transfere -> 30 min parada -> retorno -> transfere, com aviso a equipe a cada
// volta). Um ponto so, na saida do plano e do passo: sai o efeito da transferencia, ficam os demais (proposta_upd).
const BVG_SEM_EQUIPE = 'neste turno não dá para passar a conversa para a equipe: diga em uma frase que por aqui você não consegue resolver isso, sem dizer nome de barbeiro e sem prometer retorno da equipe, e ofereça o que você faz (ver, marcar, remarcar ou cancelar horário)';
function bvgSemRetransferir(r, pedido, turnoId) {
  const e = r && r.final && r.final.efeitos;
  if (!e || !e.handoff || !turnoId || !pedido || pedido.retorno !== turnoId) return r;
  const { handoff, falha, pedido: ped, ...resto } = e;
  const { handoff: marca, ...pedSem } = ped || {};
  return bvgFim(bvgRecusa('equipe_neste_turno', BVG_SEM_EQUIPE), { ...resto, pedido: pedSem,
    falha: { motivo: `retorno_sem_transferir|${r.final.resultado.motivo || ''}`, operacao: falha && falha.operacao, code: 'equipe_neste_turno', status: 0, trace: null } });
}
function bvGPlano(i, ctx0, cfg) { return bvgSemRetransferir(bvgPlanoUm(i, ctx0, cfg), ctx0 && ctx0.pedido, i && i.turno_id); }
function bvgPlanoUm(i, ctx0, cfg) {
  const ctx = { pedido: (ctx0 && ctx0.pedido) || {}, opcoes: (ctx0 && ctx0.opcoes) || {}, proposta: ctx0 && ctx0.proposta, info: ctx0 && ctx0.info, dia: (ctx0 && ctx0.dia) || {}, rodizio: bvgRodizio(ctx0, cfg),
    agoraMs: Number(ctx0 && ctx0.agora_ms), recusaMin: cfg.recusaJanelaMin }; // relogio e janela so para a validade da recusa de presenca (bvgRecusado)
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
      const dois = bvgListarOsDois(i, ctx, t);
      const busca = bvgTermosServico(t); // a busca do modelo segue junto (loja sem combinado: vale a lista dela); termo curto ja traz o catalogo todo
      // Com cadastro, le tambem os pacotes do cliente (uma chamada, em paralelo) e o catalogo todo: quem tem pacote de corte ou de
      // barba nao vai para o combinado, que e outro servico e nao abate a sessao (bvgDoPacote).
      const pac = dois && !!idCliente;
      const termos = pac ? [''] : dois && busca.every((x) => x.length >= 3) ? [...new Set(['cabelo', ...busca])] : busca;
      const reqs = termos.map((x) => ({ m: 'GET', path: '/agenda/servicos', qs: x.length >= 3 ? { texto: x } : {} }));
      return chamar(pac ? [...reqs, bvgReqPacote(idCliente)] : reqs, { limpou2v: !!i.texto && t !== i.texto, soCabelo: !dois && bvgSoCabelo(t), dois, pac, vistos: ctx.pedido.servicos_vistos || [] });
    }
    case 'listar_barbeiros': {
      const s = bvgServicoDe(i, ctx, ctx.pedido.ultimo);
      if (!s) return bvgFim(i.id_opcao_servico || i.servico_nome ? bvgOpcaoInvalida() : bvgRecusa('servico_nao_escolhido', 'escolha o serviço antes (listar_servicos)'));
      return chamar([{ m: 'GET', path: '/servicos/profissionais', qs: { idServico: s.idServico } }], { servico: s, escolhido: ctx.pedido.barbeiro || null });
    }
    case 'horarios_livres': {
      // o item "Qualquer barbeiro" da lista de barbeiros vale como qualquer=true (antes da chave da busca: a retentativa tem de bater)
      if (i.id_opcao_barbeiro && (bvgResolver(i.id_opcao_barbeiro, 'barbeiro', ctx) || {}).qualquer) { i.qualquer = true; delete i.id_opcao_barbeiro; }
      // Uma lista de horarios por turno (R37, 19/11: seis buscas num passo, uma por dia; ficava guardada a lista da ultima e o texto
      // falava de todos os dias). Vale a primeira busca do turno que achou horario; outra busca nao roda, e o modelo so tem uma lista
      // para descrever: a que o cliente recebe. As chamadas de um passo rodam em serie (medido), entao o contexto ja traz a anterior.
      // Servico informado diferente do do agendamento (PROD, 23/11): o servico era ignorado em silencio e a busca saia do servico antigo.
      // E busca do servico novo (incluir ou trocar), nao remarcacao; sem barbeiro escolhido vale o do agendamento. Antes da chave da busca.
      // Cabelo e barba de quem tem pacote: a busca de UM servico, na resposta a lista do que faltava escolher, vira a sequencia do
      // servico do pacote com o escolhido (revisao de 24/11: no turno da escolha a fala e so "barba design" e nada segurava a busca
      // so da barba). So enquanto a oferta e a lista de servicos ou de barbeiros: depois dela, quem pede um so e atendido. A de
      // barbeiros entra porque quem pede um barbeiro passa por listar_barbeiros, que troca a oferta e guarda um servico so no pedido
      // (revisao de 24/11: "com o Pedro" saia a busca so da barba); por isso o servico vale pelo id, pelo nome ou o ja escolhido.
      const dpc = ctx.pedido.dois_pacote;
      if (dpc && ['servico', 'barbeiro'].includes(ctx.opcoes.tipo) && !i.id_opcoes_servicos && !i.id_opcao && !i.id_opcao_agendamento) {
        const sv = bvgServicoDe(i, ctx, null), t = sv && sv.opcao_id && bvgTipoDosDois(sv.nome), par = t && dpc[t === 'cabelo' ? 'barba' : 'cabelo'];
        if (par && String(par) !== String(sv.opcao_id)) {
          i.id_opcoes_servicos = t === 'cabelo' ? [String(sv.opcao_id), String(par)] : [String(par), String(sv.opcao_id)];
          delete i.id_opcao_servico; delete i.servico_nome; // barbeiro, qualquer e periodo que o modelo mandou seguem valendo na sequencia
        }
      }
      // Recusa de presenca em pauta (PROD, 27/11): a busca sem servico e sem agendamento informados e a remarcacao do agendamento
      // recusado (servico e barbeiro dele; as barreiras abaixo valem como para o id informado). So quando a conversa nao escolheu outro
      // servico: quem recusou o corte e esta marcando barba continua na busca da barba. Recusa em pauta que nao resolve (bvgRecusado
      // null) e nenhum servico escolhido: recusa e manda listar, em vez de buscar calado o servico de costume. Antes da chave da busca.
      const pedida = i.id_opcao_agendamento === 'rec'; // `rec` informado que nao resolve recusa sempre, com ou sem servico informado
      if (pedida || (!i.id_opcao_agendamento && !i.id_opcoes_servicos && !i.id_opcao && !i.id_opcao_servico && !i.servico_nome)) {
        const rc = bvgRecusado(ctx), sv = ctx.pedido.servico;
        if (rc && (pedida || !sv || sv.idServico === rc.idServico)) i.id_opcao_agendamento = 'rec';
        else if (!rc && (pedida || (!sv && (bvMRecusa(ctx.pedido, ctx.agoraMs, ctx.recusaMin) || {}).inicio))) return bvgFim(bvgSemAgendamento('; se ele quer um agendamento novo, e não remarcar, chame de novo com o id_opcao_servico e sem id_opcao_agendamento'));
      }
      let bAg = null;
      if (i.id_opcao_agendamento && !i.id_opcoes_servicos && !i.id_opcao && (i.id_opcao_servico || i.servico_nome)) {
        const a = bvgResolver(i.id_opcao_agendamento, 'agendamento', ctx), sv = bvgServicoDe(i, ctx, ctx.pedido.ultimo);
        if (a && sv && sv.idServico !== a.idServico) {
          // clausula petrea: o agendamento e com barbeiro so da equipe (vale sem os futuros e em qualquer dia; na remarcacao ja encaminhava)
          if (bvBarbeiroHumano({ idProfissional: a.idProfissional, apelido: a.profissional }, cfg.humanos)) return bvgEncaminhar('barbeiro_humano', 'horarios_livres', cfg);
          // outro dia nao e servico a mais: remarcacao com um id de servico velho virava busca do outro servico e um agendamento novo
          if (String(a.horaInicio).slice(0, 10) !== i.data) return bvgFim(bvgRecusa('servico_diferente', 'o serviço informado não é o do agendamento e o dia é outro: para remarcar o agendamento, chame de novo só com id_opcao_agendamento (sem id_opcao_servico); para um agendamento novo desse serviço, chame sem id_opcao_agendamento'));
          bAg = bvFiltrarBarbeiros([{ idProfissional: a.idProfissional, apelido: String(a.profissional || '').trim() }], cfg.testeId, cfg.testeLiberado, cfg.humanos)[0] || null;
          delete i.id_opcao_agendamento;
        }
      }
      const bu0 = ctx.pedido.busca;
      // so enquanto a oferta guardada ainda e a lista de horarios (meus_agendamentos ou listar_barbeiros no meio trocam a oferta)
      // Sequencia que nao atendeu o pedido (bvgSeqsDoPedido: outros) nao trava a busca seguinte: "de manha, qualquer dia" e buscado dia
      // a dia no mesmo turno, e o dia sem nada de manha (que antes dava total 0) barrava o dia seguinte.
      if (bu0 && bu0.turno === i.turno_id && bu0.n > 0 && ['horario', 'sequencia'].includes(ctx.opcoes.tipo) && bu0.chave !== bvgChaveBusca(i) && !(bu0.fora && ctx.opcoes.tipo === 'sequencia')) {
        const v0 = ((ctx.opcoes.itens || [])[0] || {}).valor || {};
        const dia0 = v0.data || ((v0.itens || [])[0] || {}).data;
        return bvgFim(bvgRecusa('lista_ja_definida', `a lista de horários deste turno já está montada${dia0 ? ` (${bvgDiaSem(dia0)})` : ''} e é a que o cliente vai receber: fale só dela e pergunte qual horário ele prefere. Não cite horário de outro dia, período ou barbeiro; se ele quiser outro, diga que pode ver e busque na próxima mensagem dele`),
          { falha: { motivo: 'graces|busca_repetida', operacao: 'horarios_livres', code: 'lista_ja_definida', status: 0, trace: null } });
      }
      // Sequencia (owner, 24/11: "cabelo e barba de manha com o Pedro" trazia o dia inteiro de todos os barbeiros): periodo e barbeiro
      // escolhido valem como na busca de um servico. esc = o barbeiro que o cliente escolheu (opcao informada ou o da conversa; nunca
      // o habitual); qualquer=true busca todos. Barbeiro so da equipe: encaminha (clausula petrea). Nao vale para barbeiros diferentes.
      const encPlano = (etapa, ss, esc = null) => chamar(ss.map((x) => ({ m: 'GET', path: '/servicos/profissionais', qs: { idServico: x.idServico } })), { enc: true, etapa, servicos: ss, data: i.data, periodo: i.periodo, hora: i.hora, aPartir: i.a_partir, esc });
      const encMesmo = (ss) => {
        const b = i.qualquer ? null : bvgBarbeiroDe(i, ctx, ctx.pedido.barbeiro);
        if (bvBarbeiroHumano(b, cfg.humanos)) return bvgEncaminhar('barbeiro_humano', 'horarios_livres', cfg);
        // a oferta guardada aqui e a de servicos: "mande a lista de novo" (opcao_desconhecida) nao diz qual lista
        if (!i.qualquer && (i.id_opcao_barbeiro || b) && !bvFiltrarBarbeiros([b], cfg.testeId, cfg.testeLiberado, cfg.humanos).length) return bvgFim(bvgRecusa('barbeiro_nao_listado', 'o barbeiro informado não veio da lista de barbeiros e nada foi consultado: chame listar_barbeiros com id_opcao_servico de um dos serviços e repita esta busca com o id_opcao_barbeiro da lista; se o cliente não pediu barbeiro, busque sem barbeiro'));
        return encPlano('enc_prof', ss, b && { idProfissional: b.idProfissional, apelido: b.apelido });
      };
      if (i.id_opcao) { // FR-012: resposta do cliente a modo_encadeamento (barbeiros diferentes | separados); nunca escolhida pelo modelo
        const modo = bvgResolver(i.id_opcao, 'modo_encadeamento', ctx);
        const ss = ctx.pedido.servicos;
        if (!modo || !Array.isArray(ss) || !ss.length) return bvgFim(bvgOpcaoInvalida());
        // "Outro dia": sem data nova, pergunta o dia; com a data, busca a mesma sequencia nesse dia (os servicos estao no pedido: a oferta
        // guardada ja nao e a de servicos, e id_opcoes_servicos nao resolveria)
        if (modo === 'outro_dia') {
          if (!i.data || i.data === ctx.pedido.seq_dia) return bvgFim({ ok: true, orientacao: 'pergunte qual outro dia ele prefere; com a resposta, chame horarios_livres com este mesmo id_opcao e a data nova' });
          return encMesmo(ss);
        }
        if (modo === 'separados') {
          return bvgFim({ ok: true, modo: 'separados', servicos: ss.map((x) => ({ id: x.opcao_id, nome: x.nome })), orientacao: `agende um serviço por vez: comece por ${ss[0].nome} (listar_barbeiros com id_opcao_servico ${ss[0].opcao_id}) e, depois de confirmado, siga para o próximo` }, { opcoes: {}, pedido: { modo_encadeamento: 'separados', servico: ss[0] } });
        }
        return encPlano('dif_prof', ss);
      }
      if (i.id_opcoes_servicos) {
        // cada servico da sequencia guarda o id pelo qual foi pedido: "agendar separado" devolve esses ids ao modelo (pela posicao, 1..n,
        // eles nao resolviam e o fluxo nunca passava do primeiro servico)
        let ss = i.id_opcoes_servicos.map((x) => { const r = bvgResolver(x, 'servico', ctx); return r && { ...r, opcao_id: r.opcao_id || String(x) }; });
        // depois de "nenhuma sequência cabe" a oferta guardada e a decisao (Outro dia / Agendar separado) e os ids de servico nao resolvem
        // mais: a mesma quantidade de servicos, pedida de novo, e a sequencia que esta no pedido
        if (ss.some((x) => !x) && ctx.opcoes.tipo === 'modo_encadeamento' && Array.isArray(ctx.pedido.servicos) && ctx.pedido.servicos.length === i.id_opcoes_servicos.length) ss = ctx.pedido.servicos;
        if (ss.some((x) => !x)) return bvgFim(bvgOpcaoInvalida());
        if (ss.some((x) => bvSegundaVez(x.nome))) return bvgFim(bvgNaoOferecido());
        return encMesmo(ss);
      }
      const ag = i.id_opcao_agendamento ? bvgResolver(i.id_opcao_agendamento, 'agendamento', ctx) : null;
      if (ag) i.rec = bvgMarcaRec(ag); // derivado aqui, nao entra de fora (BVG_CAMPOS): toda busca de remarcacao marca a oferta com o agendamento dela
      // Clausula petrea: remarcar agendamento que e com barbeiro so da equipe encaminha, tambem com qualquer=true ou outro barbeiro
      // informado (27/11: com o agendamento recusado sendo dele, essas buscas ofertavam horarios de outros barbeiros como remarcacao)
      if (ag && bvBarbeiroHumano({ idProfissional: ag.idProfissional, apelido: ag.profissional }, cfg.humanos)) return bvgEncaminhar('barbeiro_humano', 'horarios_livres', cfg);
      const ult = ctx.pedido.ultimo || {};
      const s = ag ? { idServico: ag.idServico, nome: ag.servico, opcao_id: 'ag' } : bvgServicoDe(i, ctx, ult);
      if (!s) return bvgFim(i.id_opcao_servico || i.servico_nome ? bvgOpcaoInvalida() : bvgRecusa('servico_nao_escolhido', 'escolha o serviço antes (listar_servicos)'));
      const soUm = ag ? null : bvgSoUmDosDois(i, ctx, s, i.data);
      if (soUm) return soUm;
      // Clausula petrea: servico a mais no dia de um agendamento com barbeiro so da equipe e cliente dele; quem atende e a equipe.
      if (!ag && bvgNoDia(ctx.pedido, i.data, s.idServico).some((f) => bvBarbeiroHumano({ idProfissional: f.idProfissional }, cfg.humanos))) return bvgEncaminhar('barbeiro_humano', 'horarios_livres', cfg);
      // Remarcar mantem o barbeiro (atendimentos de 2026-11-15): a busca ia a todos os barbeiros e a proposta trocava o barbeiro em
      // silencio (quase sempre para o primeiro da lista). Vale o barbeiro do agendamento, ou o que o cliente escolheu para esta
      // remarcacao; outros barbeiros so com qualquer=true. Barbeiro so da equipe: encaminha. O de teste (TESTE) segue para a uniao.
      if (ag && !i.id_opcao_barbeiro && !i.qualquer) {
        const esc = ctx.pedido.barbeiro && ctx.pedido.barbeiro_ag === ag.idAgenda ? ctx.pedido.barbeiro : null;
        const b = esc || { idProfissional: ag.idProfissional, apelido: String(ag.profissional || '').trim() };
        if (bvBarbeiroHumano(b, cfg.humanos)) return bvgEncaminhar('barbeiro_humano', 'horarios_livres', cfg);
        if (bvFiltrarBarbeiros([b], cfg.testeId, cfg.testeLiberado, cfg.humanos).length) {
          return chamar(bvgReqsLivre([{ idServico: s.idServico, idProfissional: b.idProfissional, data: i.data }]), { servico: s, barbeiros: [b], qualquer: false, data: i.data, periodo: i.periodo, hora: i.hora, aPartir: i.a_partir, agId: ag.idAgenda });
        }
      }
      // Reagendar com qualquer barbeiro: barbeiros do servico do agendamento neste passo (poupa duas rodadas do modelo, R8).
      // agQualquer: a lista NAO e do barbeiro do agendamento (cliente aceitou outro, ou o do agendamento nao pode ser ofertado)
      if (ag && !i.id_opcao_barbeiro) return chamar([{ m: 'GET', path: '/servicos/profissionais', qs: { idServico: s.idServico } }], { etapa: 'ag_prof', servico: s, qualquer: true, data: i.data, periodo: i.periodo, hora: i.hora, aPartir: i.a_partir, agQualquer: true });
      // FR-002/FR-012: defesa extra, o barbeiro de teste nunca entra na uniao nem se vier no pedido.
      // Memoria (teste do owner, 2026-10-22): sem id_opcao_barbeiro, vale o barbeiro que o cliente ja escolheu na sessao
      // "Qualquer barbeiro" sem a lista de barbeiros deste servico (ex.: servico do ultimo atendimento): busca os barbeiros neste passo
      const listados = (ctx.pedido.barbeiros || []).length && ctx.pedido.servico && ctx.pedido.servico.idServico === s.idServico;
      if (i.qualquer && !i.id_opcao_barbeiro && !listados) return chamar([{ m: 'GET', path: '/servicos/profissionais', qs: { idServico: s.idServico } }], { etapa: 'ag_prof', servico: s, qualquer: true, data: i.data, periodo: i.periodo, hora: i.hora, aPartir: i.a_partir });
      // O barbeiro habitual (de costume) so vale para o servico do ultimo atendimento
      const padrao = ctx.pedido.barbeiro || bAg || (ult.barbeiro && ult.servico && ult.servico.idServico === s.idServico ? ult.barbeiro : null);
      if (!i.qualquer && !i.id_opcao_barbeiro && !padrao) return bvgFim(bvgRecusa('barbeiro_nao_escolhido', 'pergunte com qual barbeiro (listar_barbeiros) ou use qualquer'));
      const bs = bvgBarbeiros(i.qualquer ? (ctx.pedido.barbeiros || []) : [bvgBarbeiroDe(i, ctx, padrao)].filter(Boolean), cfg, ctx.rodizio); // a fila vale antes do corte de 10
      if (!bs.length) return bvgFim(i.qualquer ? bvgRecusa('barbeiros_nao_listados', 'chame listar_barbeiros antes') : bvgOpcaoInvalida());
      const reqs = bvgReqsLivre(bs.slice(0, 10).map((b) => ({ idServico: s.idServico, idProfissional: b.idProfissional, data: i.data })));
      // habitual: o barbeiro veio do historico (os mais frequentes), nao de uma escolha nesta conversa (sem horario com ele, o passo mostra os outros)
      const habitual = !i.qualquer && !i.id_opcao_barbeiro && !ctx.pedido.barbeiro && !!padrao;
      return chamar(reqs, { servico: s, barbeiros: bs.slice(0, 10), qualquer: !!i.qualquer, data: i.data, periodo: i.periodo, hora: i.hora, aPartir: i.a_partir, habitual, agId: ag ? ag.idAgenda : null, doAg: !!bAg && padrao === bAg });
    }
    case 'transferir_atendimento': // barbeiro so da equipe (clausula petrea, owner 2026-11-14): a equipe continua o agendamento
      // cliente novo e cadastrado antes, para a equipe ja recebe-lo pronto (o modelo as vezes pulava: suite R21, 2026-11-16)
      // (so para o barbeiro da equipe: quem ja e cliente, pediu uma pessoa ou avisou atraso vai direto)
      const mot = i.motivo || 'barbeiro_equipe';
      // O cadastro so segura a transferencia no turno em que o cliente foi visto sem cadastro (PROD, 23/11: cliente antigo do barbeiro,
      // escrevendo de um numero sem cadastro, recebeu o pedido de cadastro duas vezes e ficou sem atendimento). O agente pede os dados
      // nesse turno, pela ferramenta ou por conta propria; se num turno seguinte ele ainda nao esta cadastrado, a transferencia sai.
      const desde = ctx.pedido.sem_cadastro_desde;
      if (mot === 'barbeiro_equipe' && ctx.pedido.cliente_sem_cadastro && cfg.cadastroLiberado && (!desde || desde === i.turno_id)) {
        return bvgFim(bvgRecusa('cadastre_primeiro', 'cliente novo: faça antes o cadastro rápido (nome completo, data de nascimento e como conheceu) com cadastrar_cliente e só então transfira; se ele responder sem os dados, chame esta ferramenta de novo na próxima mensagem, que então ela transfere'),
          { pedido: { sem_cadastro_desde: desde || i.turno_id } }); // conversa sem a marca (anterior a esta versao): passa a contar daqui
      }
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
      return i.proposta_id ? bvgFase2(i, ctx, cfg, chamar) : bvgFase1(i, ctx, cfg, chamar);
  }
}

// Clausula petrea: horario, sequencia ou agendamento existente com barbeiro so da equipe (defesa: ele nunca e ofertado).
function bvgTocaHumano(i, ctx, cfg) {
  const h = (x) => !!bvBarbeiroHumano(x && { idProfissional: x.idProfissional, apelido: x.apelido || x.profissional || x.barbeiro }, cfg.humanos);
  const sq = i.id_opcao_horario ? bvgResolver(i.id_opcao_horario, 'sequencia', ctx) : null;
  return [i.id_opcao_horario && bvgResolver(i.id_opcao_horario, 'horario', ctx), i.id_opcao_agendamento && bvgResolver(i.id_opcao_agendamento, 'agendamento', ctx),
    i.substitui_id_opcao_agendamento && bvgResolver(i.substitui_id_opcao_agendamento, 'agendamento', ctx), ...((sq && sq.itens) || [])].some(h);
}

// Proposta de agendar: antes do resumo, um estagio so de leitura dos pacotes do cliente (um GET por servico distinto).
const bvgProporPacote = (chamar, acao, dados, jaTem) => {
  const svs = bvgServicosDe(dados.itens || [dados]);
  return chamar(svs.map((sv) => bvgReqPacote(dados.idCliente, sv)), { etapa: 'pacote', prop: { acao, dados, jaTem, svs } });
};
// Resumo e proposta com o que a Graces respondeu. Leitura de pacote com falha = sem pacote: o resumo sai pelo valor avulso, como
// era antes do item 12, e a falha fica registrada.
function bvgPropor(prop, resps) {
  const { acao, dados, jaTem, svs } = prop;
  const livres = bvgSecoesPor(svs, resps, (dados.itens || [dados])[0].data);
  const marca = (x) => ((livres[x.idServico] || []).shift() ? { ...x, pacote: true } : x);
  const ruim = svs.map((_, j) => resps[j] || { status: 0 }).find((r) => !bvgPacoteLido(r));
  let d;
  if (acao === 'agendar_conjunto') { // FR-008: um POST por servico, em sequencia, confirmados num unico resumo
    const itens = dados.itens.map(marca);
    const mesmo = itens.every((x) => x.idProfissional === itens[0].idProfissional);
    const resumo = mesmo ? `${itens.map((x) => `${x.servico} às ${x.hora}${bvgValor(x)}`).join(' + ')} com ${itens[0].barbeiro} em ${bvgDiaSem(itens[0].data)}`
      : `${itens.map((x) => `${x.servico} às ${x.hora} com ${x.barbeiro}${bvgValor(x)}`).join(' + ')} em ${bvgDiaSem(itens[0].data)}`;
    d = { ...dados, itens, resumo };
  } else {
    const x = marca(dados);
    // A troca apaga o antigo: o resumo diz o que sai (a orientacao de "servico a mais" so existe no turno da busca; no toque o
    // modelo pode mandar a substituicao, e o cliente que queria incluir so ve a perda aqui)
    const a = acao === 'trocar_servico' && x.antigo && x.antigo.servico ? x.antigo : null;
    const ini = a ? String(a.horaInicio || '') : '';
    const sai = a ? `, no lugar de ${a.servico} ${ini.slice(0, 10) === x.data ? 'das' : `de ${bvgDia(ini)} às`} ${ini.slice(11, 16)}` : '';
    d = { ...x, resumo: `${acao === 'trocar_servico' ? 'Trocar serviço: ' : ''}${x.servico} com ${x.barbeiro} em ${bvgDiaSem(x.data)} às ${x.hora}${bvgValor(x)}${sai}` };
  }
  const pacote = (d.itens || [d]).some((x) => x.pacote) ? { pacote: 'sai do pacote do cliente: mande o resumo como veio, sem acrescentar valor ao que sai do pacote, e não transfira para a equipe por causa do pacote' } : {};
  return bvgFim({ ok: true, aguardando_confirmacao: true, resumo: d.resumo, ...pacote, ...jaTem },
    { ...(ruim ? { falha: bvGErro(ruim, 'pacotes').falha } : {}), proposta_nova: { acao, dados: d, resumo: d.resumo } });
}

// Fase 1: so cria a proposta pendente com o resumo; nada e escrito na Graces (FR-006).
function bvgFase1(i, ctx, cfg, chamar) {
  // TESTE, 27/11 (1 de 7 rodadas): depois da busca de remarcacao do agendamento recusado, o modelo chamou `agendar` no horario escolhido
  // e saiu a proposta de um agendamento NOVO, com o recusado de pe. Horario de uma busca dessas (marca `rec` no horario) com `agendar`
  // sem substituicao e a remarcacao: a chamada segue como `reagendar` (as mesmas barreiras, a mesma proposta; o teto de agendamentos do
  // dia nao conta). Busca de outro servico nao leva a marca; recusa que venceu, segue agendar. A marca tem de ser do agendamento que a
  // recusa em pauta resolve AGORA: horario buscado para outro agendamento nao remarca este, nem pelo `agendar` nem pelo `reagendar`
  // so com o horario (27/11: a busca pelo id da lista saia sem marca e a proposta ia para o recusado, nao para o escolhido).
  const rc = (i.operacao === 'agendar' || i.operacao === 'reagendar') && i.id_opcao_horario ? bvgRecusado(ctx) : null;
  const marca = rc ? (bvgResolver(i.id_opcao_horario, 'horario', ctx) || {}).rec : null;
  const convertido = i.operacao === 'agendar' && !i.substitui_id_opcao_agendamento && bvgMesmaMarca(marca, rc);
  if (convertido) i.operacao = 'reagendar';
  // Remarcar sem dizer qual agendamento (ou pelo `rec`): o da recusa de presenca em pauta. Na primeira linha, antes de toda barreira
  // (bvgTocaHumano le i.id_opcao_agendamento: aplicado depois, o agendamento com barbeiro so da equipe seria remarcado para outro barbeiro).
  if (i.operacao === 'reagendar' && (!i.id_opcao_agendamento || i.id_opcao_agendamento === 'rec')) {
    if (rc && (!marca || bvgMesmaMarca(marca, rc))) i.id_opcao_agendamento = 'rec';
    else delete i.id_opcao_agendamento;
  }
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
  const bu = ctx.pedido.busca;
  const naoEscolheu = () => bvgFim(bvgRecusa('cliente_nao_escolheu', 'o cliente ainda não escolheu esse horário: diga o que não há (se for o caso), mostre as opções e pergunte qual ele prefere; só chame esta ferramenta com a escolha dele'));
  if (sq) {
    // sequencia de outro barbeiro ou de outro horario que o pedido (bvgSeqsDoPedido): no turno da busca, espera a resposta do cliente
    if (bu && bu.turno === i.turno_id && bu.outros) return naoEscolheu();
    if (i.substitui_id_opcao_agendamento || sq.itens.some((x) => x.idProfissional === cfg.testeId) !== soTeste) return bvgFim(bvgOpcaoInvalida());
    if (soTeste && sq.itens.some((x) => x.idProfissional !== cfg.testeId)) return bvgFim(fora);
    if (sq.itens.some((x) => bvSegundaVez(x.servico))) return bvgFim(bvgNaoOferecido());
    const itens = sq.itens.map((x, k) => ({ ordem: k + 1, idServico: x.idServico, servico: x.servico, idProfissional: x.idProfissional, barbeiro: x.apelido, data: sq.data, hora: x.hora, minutos: x.minutos, valor: x.valor, ...(x.indicado ? { indicado: true } : {}) }));
    return bvgProporPacote(chamar, 'agendar_conjunto', { idCliente: ctx.pedido.idCliente, itens }, bvgJaTem(ctx.pedido, itens));
  }
  if (i.operacao === 'cancelar' && i.id_opcoes_agendamentos) {
    const ags = i.id_opcoes_agendamentos.map((x) => bvgResolver(x, 'agendamento', ctx));
    if (ags.some((a) => !a)) return bvgFim(bvgOpcaoInvalida());
    if (!real && ags.some((a) => a.idProfissional !== cfg.testeId)) return bvgFim(fora);
    const itens = ags.map((a, k) => ({ ordem: k + 1, idAgenda: a.idAgenda, horaInicio: a.horaInicio, servico: a.servico, ...(bvgEhPacote(ctx, a.idAgenda, a) ? { pacote: true } : {}) }));
    const resumo = `Cancelar ${itens.map((x) => `${x.servico} em ${bvgDiaSem(x.horaInicio)} às ${x.horaInicio.slice(11, 16)}`).join(' e ')}`;
    if (itens.every((x) => bvgDecisaoVista(ctx, x))) return bvgCancDireto('cancelar_conjunto', { itens, resumo }, resumo, itens.some((x) => x.pacote));
    return bvgDecisaoCanc({ ok: true, aguardando_confirmacao: true, sugerir_remarcar: true, resumo, ...(itens.some((x) => x.pacote) ? { pacote: BVG_ORIENT_PACOTE } : {}) }, { proposta_nova: { acao: 'cancelar_conjunto', dados: { itens, resumo }, resumo } }, cfg);
  }
  const ag = i.id_opcao_agendamento ? bvgResolver(i.id_opcao_agendamento, 'agendamento', ctx) : null;
  const h = i.id_opcao_horario ? bvgResolver(i.id_opcao_horario, 'horario', ctx) : null;
  const antigo = i.substitui_id_opcao_agendamento ? bvgResolver(i.substitui_id_opcao_agendamento, 'agendamento', ctx) : null;
  const ag0 = (antigo || ag);
  if (!real && ag0 && ag0.idProfissional !== cfg.testeId) return bvgFim(fora); // TESTE e PROD fechada: nunca altera agenda de barbeiro real
  if (h && soTeste && h.idProfissional !== cfg.testeId) return bvgFim(fora); // PROD fechada: nunca escreve na agenda de barbeiro real
  if (h && !soTeste && h.idProfissional === cfg.testeId) return bvgFim(bvgOpcaoInvalida()); // FR-012: o modelo nao escolhe o de teste
  // Quem escolhe e o cliente (16/11: o agente pedia confirmacao de um horario que o cliente nao disse): no turno da busca, so vai ao
  // resumo o horario pedido que esta livre, ou o unico da lista quando ele e exatamente o que foi pedido. Unico horario que e de
  // outro barbeiro, ou que nao e a hora dita pelo cliente, espera a resposta dele (17/11: pediu um barbeiro as 9h e recebeu
  // "corte com outro barbeiro as 8h, posso confirmar?").
  const unicoPedido = bu && bu.n === 1 && !bu.hora && !bu.outros;
  if (h && i.operacao !== 'cancelar' && bu && bu.turno === i.turno_id && !unicoPedido && bu.livre !== String(i.id_opcao_horario)) return naoEscolheu();
  const alvo = i.operacao === 'reagendar' ? ag : h; // serviço que seria escrito; cancelar segue permitido
  if (i.operacao !== 'cancelar' && alvo && bvSegundaVez(alvo.servico)) return bvgFim(bvgNaoOferecido()); // FR-005
  const agAnt = { idAgenda: ag0 && ag0.idAgenda, horaInicio: ag0 && ag0.horaInicio, recorrente: !!(ag0 && ag0.recorrente), ...(ag0 && bvgEhPacote(ctx, ag0.idAgenda, ag0) ? { pacote: true } : {}) };
  // trocar o servico de um agendamento do pacote cancelaria o antigo (a sessao nao volta): fica com a equipe
  if (i.operacao === 'agendar' && antigo && agAnt.pacote) return bvgFim(bvgRecusa('pacote_equipe', 'esse agendamento é do pacote do cliente e trocar o serviço por aqui faria ele perder a sessão: ofereça passar para a equipe e, se ele aceitar, chame transferir_atendimento com motivo pacote'));
  if (i.operacao === 'agendar') {
    if (!h || (i.substitui_id_opcao_agendamento && !antigo)) return bvgFim(bvgOpcaoInvalida());
    const soUm = antigo ? null : bvgSoUmDosDois(i, ctx, { nome: h.servico, idServico: h.idServico }, h.data);
    if (soUm) return soUm;
    // indicado: o barbeiro foi posto pelo sistema (fila da vez); vai a propostas.dados e dali ao Contexto (rodizio), nunca ao cliente nem ao modelo
    const dados = { idCliente: ctx.pedido.idCliente, idServico: h.idServico, servico: h.servico, idProfissional: h.idProfissional, barbeiro: h.apelido, data: h.data, hora: h.hora, valor: h.preco, minutos: h.minutos, ...(h.indicado ? { indicado: true } : {}) };
    // Substituir pelo MESMO servico nao troca servico (PROD, 23/11: "incluir cabelo" virou "Trocar servico: BARBA EXPRESS" com outro barbeiro)
    if (antigo && h.idServico === antigo.idServico) {
      return bvgFim(bvgRecusa('mesmo_servico', 'o horário escolhido é do mesmo serviço do agendamento: isso não troca serviço e nada foi proposto. Se o cliente quer outro serviço (a mais ou no lugar), a busca foi do serviço errado: chame horarios_livres com o id_opcao_servico do serviço novo; se ele só quer mudar o horário, chame reagendar com id_opcao_agendamento e este id_opcao_horario'),
        { falha: { motivo: 'graces|troca_mesmo_servico', operacao: 'agendar', code: 'mesmo_servico', status: 0, trace: null } });
    }
    if (antigo) dados.antigo = { ...agAnt, servico: antigo.servico }; // o servico que sai vai ao resumo (bvgPropor)
    return bvgProporPacote(chamar, antigo ? 'trocar_servico' : 'agendar', dados, antigo ? {} : bvgJaTem(ctx.pedido, [h]));
  }
  if (!ag) return bvgFim(!i.id_opcao_agendamento || i.id_opcao_agendamento === 'rec' ? bvgSemAgendamento(i.operacao === 'reagendar' ? ' e este id_opcao_horario' : '') : bvgOpcaoInvalida());
  if (i.operacao === 'reagendar') {
    if (!h) return bvgFim(bvgOpcaoInvalida());
    if (h.idServico !== ag.idServico) return bvgFim(bvgRecusa('servico_diferente', 'os horários da lista são de outro serviço, não do agendamento: para remarcar, chame horarios_livres só com id_opcao_agendamento (sem id_opcao_servico); se é um serviço a mais, chame agendar com o horário, sem substitui_id_opcao_agendamento'));
    const dados = { ...agAnt, idServico: ag.idServico, servico: ag.servico, idProfissional: h.idProfissional, barbeiro: h.apelido, data: h.data, hora: h.hora, minutos: h.minutos, ...(h.indicado ? { indicado: true } : {}) };
    const resumo = `Remarcar ${ag.servico} de ${bvgDia(ag.horaInicio)} ${ag.horaInicio.slice(11, 16)} para ${bvgDiaSem(h.data)} às ${h.hora} com ${h.apelido}`;
    // convertido: o modelo chamou agendar; sem esta linha ele nao sabe que saiu remarcacao nem como pedir um agendamento a mais
    const orientacao = convertido ? { orientacao: 'saiu como remarcação do agendamento cuja presença o cliente recusou, não como agendamento novo: mande o resumo e peça a confirmação; com o sim, chame reagendar (ou agendar) só com o proposta_id. Se ele quer um agendamento a mais, e não remarcar, busque de novo com horarios_livres informando o id_opcao_servico' } : {};
    return bvgFim({ ok: true, aguardando_confirmacao: true, resumo, ...orientacao }, { proposta_nova: { acao: 'reagendar', dados: { ...dados, resumo }, resumo } });
  }
  // barbeiro de teste e barbeiro so da equipe nunca aparecem ao cliente: com o nome no resumo, a frase inteira da confirmacao era
  // cortada na saida e sobrava so "Prontinho!" (suite R34/R35, 18/11)
  const oculto = ag.idProfissional === cfg.testeId || !!bvBarbeiroHumano({ idProfissional: ag.idProfissional, apelido: ag.profissional }, cfg.humanos);
  const resumo = `Cancelar ${ag.servico} em ${bvgDiaSem(ag.horaInicio)} às ${ag.horaInicio.slice(11, 16)}${oculto ? '' : ` com ${ag.profissional}`}`;
  // Recusou a presenca deste agendamento (item 19): a pergunta "remarcar ou cancelar?" ja foi feita no texto da recusa; a lista
  // de decisao voltava a mesma pergunta. So a confirmacao do cancelamento.
  if (bvgEhRecusado(ctx, ag) || bvgDecisaoVista(ctx, ag)) return bvgCancDireto('cancelar', { ...agAnt, servico: ag.servico, barbeiro: ag.profissional, resumo }, resumo, agAnt.pacote);
  return bvgDecisaoCanc({ ok: true, aguardando_confirmacao: true, sugerir_remarcar: true, resumo, ...(agAnt.pacote ? { pacote: BVG_ORIENT_PACOTE } : {}) }, { proposta_nova: { acao: 'cancelar', dados: { ...agAnt, servico: ag.servico, barbeiro: ag.profissional, resumo }, resumo } }, cfg);
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
  // Proposta de cancelar que nasceu com a lista "Remarcar / Cancelar mesmo" (cancelar comum, varios de uma vez, recusa do lembrete, e
  // toda proposta anterior a esta versao: so a da pergunta direta leva sim_basta): ela fica pendente enquanto o cliente remarca, e
  // "ok, segunda então" ou "pode ser às 20" passavam na barreira do sim; se o modelo chamasse cancelar, o horario era apagado no meio
  // da remarcacao (27/11). So o cancelamento dito a executa. A recusa encerra a proposta e marca os agendamentos (decisao_vista): a
  // fase 1 seguinte deles sai pela pergunta direta, em que o sim basta, e a lista de decisao nao volta.
  if (/^cancelar/.test(p.acao) && !d.sim_basta && i.so_sim) {
    return bvgFim(bvgRecusa('cliente_nao_disse_cancelar', 'o cliente não disse que quer cancelar (um sim, um dia ou um horário não respondem a "remarcar ou cancelar?"): nada foi apagado e esta confirmação deixou de valer. Se ele falou de dia ou horário, ou quer remarcar, siga a remarcação. Se ele quer cancelar, ou não dá para saber, chame cancelar de novo com o agendamento (id_opcao_agendamento, ou id_opcoes_agendamentos se eram vários), sem proposta_id, e peça só a confirmação do cancelamento, sem mandar a lista de novo: o sim a essa pergunta cancela'),
      { ...((ctx.opcoes || {}).tipo === 'decisao_cancelamento' ? { opcoes: {} } : {}), pedido: { decisao_vista: (Array.isArray(d.itens) ? d.itens : [d]).filter((x) => x && x.idAgenda && x.horaInicio).map(bvgMarcaRec) },
        proposta_upd: { id: p.id, estado: 'falhou', resultado: { ok: false, code: 'cliente_nao_disse_cancelar' } }, falha: { motivo: 'graces|cancelar_sem_dizer', operacao: 'cancelar', code: 'cliente_nao_disse_cancelar', status: 0, trace: null } });
  }
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
    const svs = bvgServicosDe(d.itens.filter((x) => x.pacote));
    return chamar([...bvgReqsLivre(d.itens.map((x) => ({ idServico: x.idServico, idProfissional: bvgProfDe(x, meta), data: x.data }))), ...svs.map((sv) => bvgReqPacote(d.idCliente, sv))], { ...meta, etapa: 'reval_c', res: [], svs });
  }
  // cancelar (um ou varios): antes de qualquer DELETE, a agenda do cliente e lida agora e conferida no passo (etapa confere_canc)
  if (p.acao === 'cancelar' || p.acao === 'cancelar_conjunto') {
    const icc = d.idCliente || ctx.pedido.idCliente;
    if (!icc) return bvgParaEquipe(p, cfg, 'nao_resolvi'); // sem o cliente nao ha como conferir: nao apaga
    return chamar([{ m: 'GET', path: '/agenda/agendamentos', qs: { idCliente: icc, proximos: true, pageSize: 200 } }], { ...meta, etapa: 'confere_canc', idCliente: icc });
  }
  // reval + linha de base de agendamentos (Decision 8); idCliente so do pedido/proposta (FR-020)
  const ic = d.idCliente || ctx.pedido.idCliente;
  const qs = { idServico: d.idServico, idProfissional: prof, data: d.data };
  const reqs = [{ m: 'GET', path: '/agenda/horarios-livres', qs }];
  if (ic) reqs.push({ m: 'GET', path: '/agenda/agendamentos', qs: { idCliente: ic, proximos: true, pageSize: 200 } });
  reqs.push({ m: 'GET', path: '/agenda/horarios', qs }); // ocupacoes depois da linha de base, que continua em resps[1]
  if (d.pacote && ic && p.acao !== 'reagendar') reqs.push(bvgReqPacote(ic, d.idServico)); // por ultimo: os indices acima nao mudam. No reagendar, `pacote` so diz que o agendamento ja e de pacote: o PUT mantem a secao reservada e nao exige secao em aberto
  return chamar(reqs, { ...meta, etapa: 'reval', idCliente: ic });
}

// Requisicao do item k de um conjunto (POST por servico ou DELETE por agendamento).
// Barbeiro do item: redirecionado (TESTE) vai ao de teste; senao o do proprio item (barbeiros diferentes por servico, FR-012).
const bvgProfDe = (x, meta) => (meta.redir ? meta.prof : (x.idProfissional || meta.prof));
function bvgReqItem(p, k, meta) {
  const x = p.dados.itens[k];
  if (p.acao === 'cancelar_conjunto') return bvgDel(x);
  return { m: 'POST', path: '/agenda', body: bvgCorpoAgendar(p.dados.idCliente, x, bvgProfDe(x, meta), `bv-${String(p.id).slice(0, 8)}-${x.ordem}`, (meta.secoes || [])[k]) };
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

// lista de agendamentos: o feito por pacote ganha os campos de servico do avulso (bvMComServico, shared/mensagens.js)
const bvgResp = (r) => ({ status: Number((r && r.status) || 0), body: r && Array.isArray(r.body) ? r.body.map(bvMComServico) : r && r.body });

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
  return r.reqs ? { ...r, st: { ...r.st, estagio: n } } : bvgSemRetransferir(r, st.ctx && st.ctx.pedido, st.in && st.in.turno_id);
}

const BVG_ORIENT_CADASTRO = 'cliente sem cadastro neste número: responda dúvidas e siga o agendamento (serviço, barbeiro, horários) sem cadastro; só quando ele escolher o horário peça, numa mensagem só, o nome completo, a data de nascimento e como conheceu a barbearia, chame cadastrar_cliente e então agendar com o horário escolhido';
// Cadastro feito (POST ou, no TESTE, o cliente de teste): o pedido passa a ter o cliente; como_conheceu vai para contatos.
const bvgCadastrado = (cad, idCliente) => bvgFim(
  { ok: true, cadastrado: true, nome: cad.ns.nome, orientacao: 'cadastro feito: agradeça em poucas palavras e, nesta mesma resposta, chame agendar com o horário que ele já tinha escolhido e mande o resumo (se o cadastro foi para transferir, chame transferir_atendimento; sem horário escolhido, continue de onde o agendamento parou); não pergunte como pode ajudar' },
  { pedido: { idCliente, cliente_sem_cadastro: false, cliente_nome: cad.ns.nome, identificado: true }, ...(cad.como ? { contato: { como_conheceu: cad.como } } : {}) });

// Barbeiro habitual (owner, 2026-11-26): vale quem mais atendeu nas ultimas `n` visitas (graces.habitual.visitas), nao so o da ultima.
// Visita = mesma comanda ou mesmo dia (PROD 23/11: uma linha do historico por servico). `itens` vem da mais recente para a mais antiga.
const bvgDaVisita = (itens, h) => {
  const dia = (x) => String(x.dataAbertura || '').slice(0, 10);
  return itens.filter((x) => x === h || (h.idComanda && x.idComanda === h.idComanda) || (dia(h) && dia(x) === dia(h)));
};
function bvgVisitas(itens) {
  const v = [];
  for (let r = itens; r.length;) { const vis = new Set(bvgDaVisita(r, r[0])); v.push([...vis]); r = r.filter((x) => !vis.has(x)); }
  return v;
}
// Criterio unico do que conta como atendimento do barbeiro (hoje qualquer servico; dono ainda confirma: so cortes = trocar aqui).
// Devolve a chave do barbeiro: o da equipe humana e visto tambem pelo nome (linha sem id), numa chave so; os demais, so pelo id.
const bvgConta = (x, humDe) => { const h = humDe(x); return h ? `h:${h.nome}` : x.idProfissional || null; };
const bvgVisitasN = (cfg) => { const v = parseInt(cfg && cfg.habitual && cfg.habitual.visitas, 10); return v >= 1 && v <= 20 ? v : 5; };
// Ranking: mais visitas primeiro (cada visita conta uma vez por barbeiro, mesmo com dois servicos dele); empate, o que atendeu mais
// recentemente. Considera as `n` visitas mais recentes com barbeiro conhecido; a ordem de chegada das linhas decide o resto.
// `humano` = o da equipe humana empatado no topo (o desempate pelo recente nao o esconde: na duvida, transfere).
function bvgHabituais(visitas, n, humDe) {
  const m = new Map();
  visitas.filter((v) => v.some((x) => bvgConta(x, humDe))).slice(0, n).forEach((v, k) => v.forEach((x) => {
    const c = bvgConta(x, humDe);
    if (!c) return;
    const e = m.get(c) || { idProfissional: x.idProfissional, apelido: String(x.profissional || '').trim(), humano: humDe(x), n: 0, k, v: -1 };
    if (e.v !== k) e.n++;
    e.v = k;
    m.set(c, e);
  }));
  const rank = [...m.values()].sort((a, b) => b.n - a.n || a.k - b.k);
  return { rank, humano: (rank.filter((e) => e.n === (rank[0] || {}).n).find((e) => e.humano) || {}).humano || null };
}

// Ultimo atendimento (owner, 2026-11-14): agendar "pelo ultimo corte dele". Estagio hist: GET /agenda/historico (mais recente
// primeiro); estagio ult: o servico tem de seguir no catalogo (ativo, sem "2a vez") e o barbeiro, fazer o servico e nao ser o de
// teste. Qualquer falha ou ausencia so tira a sugestao: o cliente continua identificado.
function bvgPassoUltimo(st, resps, cfg) {
  const { meta } = st;
  const ped = meta.ped;
  const ok = (r) => r && r.status >= 200 && r.status < 300 && Array.isArray(r.body);
  // futuros: 2a resposta do estagio hist (falha na leitura = lista vazia, como o historico); o estagio ult a recebe pelo meta
  const fut = meta.etapa === 'hist' ? (ok(resps[1]) ? bvgAgsVisiveis(resps[1].body, cfg).slice(0, 10).map(bvgFut) : []) : (meta.fut || []);
  const aoModelo = fut.map(({ servico, horaInicio }) => ({ servico, horaInicio })); // ids, fim e barbeiro ficam so no pedido
  const so = (ult) => bvgFim({ ok: true, encontrado: true, nome: ped.cliente_nome, futuros: aoModelo, ...(ult ? { ultimo: { servico: ult.servico.nome, barbeiro: ult.barbeiro ? ult.barbeiro.apelido : null } } : {}) },
    { pedido: { ...ped, ultimo: ult || null, futuros: fut } });
  if (meta.etapa === 'hist') {
    const itens = ok(resps[0]) ? resps[0].body.filter((x) => x && BVG_UUID.test(String(x.idServico || ''))) : [];
    const h = itens[0];
    if (!h) return so(null);
    // A ultima visita pode ter varios servicos (uma linha do historico por servico). PROD 23/11: cliente que fez corte + duas
    // depilacoes perguntou so por um horario e recebeu a proposta de DEPILACAO DE ORELHA, a primeira linha.
    const humDe = (x) => bvBarbeiroHumano({ idProfissional: x.idProfissional, apelido: String(x.profissional || '') }, cfg.humanos);
    const visitas = bvgVisitas(itens), visita = visitas[0], { rank, humano } = bvgHabituais(visitas, bvgVisitasN(cfg), humDe);
    // equipe humana: a ultima visita (como sempre) ou o mais frequente das ultimas (empate no topo inclui); a regra nova so aumenta as transferencias
    const hum = visita.map(humDe).find(Boolean) || humano;
    if (hum) return bvgFim({ ok: true, encontrado: true, nome: ped.cliente_nome, futuros: aoModelo, ultimo: { humano: hum.nome } }, { pedido: { ...ped, ultimo: { humano: hum.nome }, futuros: fut } });
    // mais de um servico na ultima visita: nao ha "o servico de sempre" para repetir sozinho; o agente pergunta (so os nomes vao adiante)
    const distintos = visita.filter((x, k, a) => a.findIndex((y) => y.idServico === x.idServico) === k);
    if (distintos.length > 1) {
      const nomes = distintos.map((x) => String(x.descricaoServico || '').trim().slice(0, 60)).filter(Boolean).slice(0, 5);
      // sem nome para citar, ou com servico "2a vez" (FR-013: o agente nao fala em segunda vez), nao ha sugestao: o agente pergunta o servico
      const u = nomes.length > 1 && !nomes.some(bvSegundaVez) ? { servicos: nomes } : null;
      return bvgFim({ ok: true, encontrado: true, nome: ped.cliente_nome, futuros: aoModelo, ...(u ? { ultimo: u } : {}) }, { pedido: { ...ped, ultimo: u, futuros: fut } });
    }
    return { reqs: [{ m: 'GET', path: '/agenda/servicos', qs: {} }, { m: 'GET', path: '/servicos/profissionais', qs: { idServico: h.idServico } }], st: { ...st, meta: { ...meta, etapa: 'ult', h, rank: rank.filter((e) => !e.humano).map((e) => e.idProfissional), fut } } };
  }
  const s = ok(resps[0]) ? bvFiltrarServicos(resps[0].body.filter((x) => x && x.ativo !== false).map((x) => ({ ...x, nome: String(x.descricaoAgenda || '') })))
    .find((x) => x.idServico === meta.h.idServico) : null;
  if (!s) return so(null);
  // o primeiro do ranking que faz o servico e passa no filtro (Jayme e teste saem); ninguem serve = sem habitual
  const bs = ok(resps[1]) ? bvgBarbeiros(resps[1].body, cfg, null, 'idProfissional') : [];
  const b = meta.rank.map((id) => bs.find((x) => x.idProfissional === id)).find(Boolean);
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
    // a consulta dos outros barbeiros falhou: as sequencias do barbeiro escolhido, ja calculadas, seguem valendo (a falha fica registrada)
    if (ruim && (meta.seqs0 || []).length) { const r = bvgPassoEnc({ ...st, meta: { ...meta, barbeiros: [] } }, [], cfg); r.final.efeitos.falha = bvGErro(ruim, op).falha; return r; }
    return ruim ? falha(op, ruim) : bvgPassoEnc(st, resps, cfg);
  }
  if (op === 'identificar_cliente' && meta.etapa) return bvgPassoUltimo(st, resps, cfg); // historico e catalogo: falha nao desfaz a identificacao
  if (meta.etapa === 'pacote') return bvgPropor(meta.prop, resps); // falha na leitura do pacote nao impede a proposta
  if (!resps.some(ok200)) return falha(op, r0);
  const lista = Array.isArray(r0.body) ? r0.body : [];
  switch (op) {
    case 'identificar_cliente': {
      const cs = lista.filter((c) => c && c.idCliente).map((c) => ({ idCliente: c.idCliente, nome: bvMNomeProprio(`${c.nomeCliente || ''} ${c.sobrenomeCliente || ''}`), primeiroNome: bvMNomeProprio(String(c.nomeCliente || '').trim().split(/\s+/)[0]) }));
      if (cs.length === 0) return bvgFim({ ok: true, encontrado: false, cadastro_necessario: true, orientacao: BVG_ORIENT_CADASTRO }, { pedido: { idCliente: null, cliente_sem_cadastro: true, identificado: true,
        // o turno em que o cadastro pode ser pedido; identificar de novo na mesma sessao nao recomeca a contagem
        sem_cadastro_desde: (ctx.pedido.cliente_sem_cadastro && ctx.pedido.sem_cadastro_desde) || i.turno_id } });
      if (cs.length === 1) {
        const ped = { idCliente: cs[0].idCliente, cliente_sem_cadastro: false, cliente_nome: cs[0].primeiroNome, identificado: true };
        if (meta.sem_historico) return bvgFim({ ok: true, encontrado: true, nome: ped.cliente_nome }, { pedido: ped });
        return { reqs: [{ m: 'GET', path: '/agenda/historico', qs: { idCliente: ped.idCliente, pageSize: Math.min(200, bvgVisitasN(cfg) * 10) } }, { m: 'GET', path: '/agenda/agendamentos', qs: { idCliente: ped.idCliente, proximos: true } }], st: { ...st, meta: { ...meta, etapa: 'hist', ped } } };
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
      if (meta.pac && !ok200(r0)) return falha(op, r0); // o 200 dos pacotes nao esconde a falha do catalogo
      const vistos = new Set(); // uma busca por termo: junta sem repetir
      const juntas = (meta.pac ? resps.slice(0, -1) : resps).filter(ok200).flatMap((r) => (Array.isArray(r.body) ? r.body : [])).filter((s) => s && !vistos.has(s.idServico) && vistos.add(s.idServico));
      // Mais pedidos primeiro (owner, 2026-11-16): a API devolve em ordem alfabetica e a lista do WhatsApp so cabe 10; o corte adulto,
      // 55% da agenda, era o 13o. cfg.destaque = nomes na ordem medida; quem nao esta nela segue depois, na ordem da API.
      const dest = (cfg.destaque || []).map((x) => String(x).trim().toLowerCase());
      const peso = (s) => { const k = dest.indexOf(s.nome.trim().toLowerCase()); return k < 0 ? dest.length : k; };
      const todos = bvFiltrarServicos(juntas.filter((s) => s.ativo !== false).map((s) => ({ ...s, nome: String(s.descricaoAgenda || '') })))
        .filter((s) => !meta.soCabelo || !/\bunhas?\b/i.test(s.nome))
        .map((s, k) => [peso(s), k, s]).sort((a, b) => a[0] - b[0] || a[1] - b[1]).map((x) => x[2]);
      const dp = meta.pac ? bvgDoPacote(todos, resps[resps.length - 1]) : null;
      const comb = meta.dois && !dp ? todos.filter((s) => bvgEhCombinado(s.nome)) : [];
      const ss = dp ? [...dp.dele, ...dp.escolher.flatMap((x) => x.opcoes).filter((x) => !dp.ids.has(x.idServico))] : comb.length ? comb : todos;
      const of0 = bvMontarOferta('servico', ss.map((s) => ({ rotulo: s.nome, valor: { idServico: s.idServico, nome: s.nome, preco: s.valorPadrao, minutos: s.tempoPadrao } })), cfg);
      const ids = bvgIdsDeServico(meta.vistos, of0.itens);
      const of = { ...of0, itens: ids.itens };
      if (dp) {
        // A lista do WhatsApp leva so o que falta escolher (o primeiro tipo em aberto); o servico do pacote vai ao modelo com o id
        // (os ids valem para a conversa: servicos_vistos). Nada a escolher: a oferta fica como estava (uma lista de avulsos pendurada
        // deixaria o cliente tocar em um so). pedido.dois_pacote guarda o id do servico fixo de cada tipo: horarios_livres monta o par.
        const idDe = (sv) => (sv ? (ids.itens.find((x) => x.valor.idServico === sv.idServico) || {}).id || null : null);
        const e0 = dp.escolher[0], doTipo = e0 ? new Set(e0.opcoes.map((x) => x.idServico)) : null;
        const pede = !e0 ? 'Sem perguntar o serviço, chame' : `Diga que o pacote dele entra e pergunte qual serviço de ${e0.tipo} ele quer (as opções vão em lista junto)${dp.escolher[1] ? `; depois pergunte qual de ${dp.escolher[1].tipo}` : ''}; com a resposta, chame`;
        return bvgFim({ ok: true, total: ss.length, servicos: ids.itens.map((x) => ({ id: x.id, nome: x.valor.nome, preco: x.valor.preco, ...(dp.ids.has(x.valor.idServico) ? { pacote: true } : {}) })),
          orientacao: `o cliente pediu cabelo e barba e tem pacote de ${dp.dele.map((x) => x.nome).join(' e ')} (dado; marcado com pacote). Não ofereça o serviço combinado de cabelo e barba: é outro serviço e não abate do pacote. ${pede} horarios_livres com id_opcoes_servicos com exatamente dois ids, um de cabelo e um de barba: os dois saem em horários seguidos com o mesmo barbeiro` },
        { ...(e0 ? { opcoes: { ...of, itens: ids.itens.filter((x) => doTipo.has(x.valor.idServico)) } } : {}), pedido: { servicos_vistos: ids.lista, dois_pacote: { cabelo: idDe(dp.fixo.cabelo), barba: idDe(dp.fixo.barba) } } });
      }
      const orientacao = comb.length ? 'o cliente pediu cabelo e barba: estes são os serviços que fazem os dois no mesmo atendimento, em dois horários seguidos com o mesmo barbeiro. Pergunte qual deles ele quer (a lista vai junto); não ofereça corte ou barba avulsos para este pedido, a não ser que ele peça ou diga que tem pacote de um dos dois (aí liste de novo e use id_opcoes_servicos com os dois)'
        // Busca sem resultado (PROD, 23/11: o cliente pediu dois servicos, um nao existia e o agente seguiu so com o outro, calado)
        : !ss.length ? 'nenhum serviço da loja com esse termo: diga ao cliente qual serviço você não achou, sem trocar por outro nem seguir só com o que achou, e pergunte se ele quer ver a lista de serviços ou falar com a equipe'
        : meta.limpou2v ? 'ofereça o serviço regular, sem falar em desconto' : ss.length > of.itens.length ? 'a lista traz os serviços mais pedidos e há outros: se o cliente não achar o que quer, peça um termo para filtrar' : undefined;
      // listagem dos dois sem pacote (ou com a leitura falha): a marca do pacote de uma listagem anterior nao vale mais
      // sem resultado a oferta fica como estava: a lista do outro servico que ele pediu nao pode sumir
      return bvgFim({ ok: true, total: ss.length, servicos: of.itens.map((x) => ({ id: x.id, nome: x.valor.nome, preco: x.valor.preco })), orientacao }, { ...(ss.length ? { opcoes: of } : {}), pedido: { servicos_vistos: ids.lista, ...(meta.dois ? { dois_pacote: null } : {}), ...(comb.length ? { dois_turno: st.in.turno_id } : {}) } });
    }
    case 'listar_barbeiros': {
      const bs = bvgBarbeiros(lista, cfg, ctx.rodizio, 'id');
      // "Qualquer barbeiro" e uma opcao da lista (17/11: quem nao conhecia nenhum barbeiro recebia a lista de novo). So com 2 ou mais.
      const brutos = bs.map((b) => ({ rotulo: b.apelido, valor: { idProfissional: b.id, apelido: b.apelido } }));
      const of = bvMontarOferta('barbeiro', bs.length > 1 ? [...brutos.slice(0, cfg.lista.max_itens - 1), { rotulo: 'Qualquer barbeiro', valor: { qualquer: true } }] : brutos, cfg);
      const esc = meta.escolhido && of.itens.find((x) => x.valor.idProfissional === meta.escolhido.idProfissional);
      const orientacao = !of.itens.length ? 'nenhum barbeiro disponível para este serviço'
        : esc ? `o cliente já escolheu ${esc.rotulo} nesta conversa: siga com horarios_livres dele, sem perguntar o barbeiro de novo`
          : meta.escolhido ? `${meta.escolhido.apelido}, que o cliente escolheu, não faz este serviço: diga isso e ofereça os barbeiros da lista` : undefined;
      return bvgFim({ ok: true, barbeiros: of.itens.map((x) => ({ id: x.id, nome: x.rotulo })), orientacao },
        { opcoes: of, pedido: { servico: meta.servico, barbeiros: of.itens.filter((x) => x.valor.idProfissional).map((x) => ({ opcao_id: x.id, ...x.valor })), qualquer_opcao: (of.itens.find((x) => x.valor.qualquer) || {}).id || null, horario: null } });
    }
    case 'horarios_livres': {
      if (meta.etapa === 'ag_prof') {
        const bs = bvgBarbeiros(lista, cfg, ctx.rodizio, 'idProfissional')
          .filter((b) => b.idProfissional !== meta.semId).slice(0, 10); // semId: o barbeiro habitual, ja consultado e sem horario
        if (!bs.length) return bvgFim({ ok: true, total: 0, orientacao: meta.sem ? `${meta.sem} não tem horário nesse dia e não há outro barbeiro para este serviço; sugira outro dia` : 'nenhum barbeiro disponível para este serviço' });
        const reqs = bvgReqsLivre(bs.map((b) => ({ idServico: meta.servico.idServico, idProfissional: b.idProfissional, data: meta.data })));
        return { reqs, st: { ...st, meta: { ...meta, etapa: null, barbeiros: bs } } };
      }
      const noPeriodo = bvgNoPedido({ periodo: meta.periodo }); // por_barbeiro conta o periodo, sem a hora minima
      const porBarbeiro = [];
      const livres = []; // um por barbeiro com resposta, na ordem de meta.barbeiros (a da fila quando o sistema indica)
      // servico a mais: o que o cliente ja tem de outro servico nesse dia (remarcacao fica de fora: o horario e do proprio agendamento)
      const ancs = i.id_opcao_agendamento ? [] : bvgNoDia(ctx.pedido, meta.data, meta.servico.idServico);
      meta.barbeiros.forEach((b, k) => {
        const r = resps[k];
        if (!ok200(r) || !r.body || !Array.isArray(r.body.horarios)) return;
        const hs = bvgLivre(r.body, resps[meta.barbeiros.length + k]).inicios;
        livres.push({ b, minutos: r.body.minutos, hs: new Set(hs) });
        const hp = hs.filter(noPeriodo);
        porBarbeiro.push({ barbeiro: b.apelido, total: hp.length, primeiro: hp[0] || null });
      });
      const todas = [...new Set(livres.flatMap((x) => [...x.hs]))].sort();
      // a lista mostra um barbeiro por horario: no horario colado vale o barbeiro do agendamento que o cliente ja tem, se ele tiver;
      // nos demais, o mais a frente na fila (bvgRepartir; sem a chave ligada, o primeiro de meta.barbeiros)
      const dono = (x, hh) => !!ancs.length && (bvgColado(ancs, hh, x.minutos) || {}).idProfissional === x.b.idProfissional;
      const porHora = bvgRepartir(todas, (hh) => livres.filter((x) => x.hs.has(hh)), ctx.rodizio ? meta.barbeiros : null, (hh) => livres.find((x) => x.hs.has(hh) && dono(x, hh)) || null);
      const naFaixa = todas.filter(bvgNoPedido(meta));
      const perto = bvgPertoDaHora(naFaixa, meta.hora, cfg, (hh) => hh);
      // o horario colado entra mesmo fora do periodo ou da hora pedidos (barba 11:20-12:00: o "logo depois" e 12:00, que "manha" cortava)
      const junto = (hh) => !!bvgColado(ancs, hh, porHora.get(hh).minutos);
      const horas = ancs.length ? [...new Set([...perto.itens, ...todas.filter(junto)])].sort() : perto.itens;
      const s = meta.servico;
      const of = bvMontarOferta('horario', horas.map((hh) => {
        const { b, minutos } = porHora.get(hh);
        // indicado: quem pos o barbeiro foi o sistema (qualquer barbeiro), nao o cliente nem o agendamento colado
        // rec: horario de uma busca de remarcacao (o agendamento dela); com o do recusado, `agendar` e a remarcacao (bvgFase1). Nunca vai ao modelo.
        return { rotulo: meta.qualquer ? `${hh} ${b.apelido}` : hh, valor: { data: meta.data, hora: hh, idProfissional: b.idProfissional, apelido: b.apelido, idServico: s.idServico, servico: s.nome, preco: s.preco, minutos, ...(meta.qualquer && !dono(porHora.get(hh), hh) ? { indicado: true } : {}), ...(i.rec ? { rec: i.rec } : {}) } };
      }), cfg, true); // FR-001: oferta completa; o Compor divide em listas
      const res = { ok: true, data: meta.data, total: horas.length, completa: true, opcoes: of.itens.map((x) => ({ id: x.id, hora: x.valor.hora, barbeiro: x.valor.apelido, ...(junto(x.valor.hora) ? { junto: true } : {}) })) };
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
      const quando = bvgQuando(meta, todas.length);
      // Busca sem horario: as alternativas vao em lista (principio X; antes o agente perguntava em texto "outro dia com ele ou os
      // outros barbeiros?"). "dia lotado" (todos consultados, nada no dia) segue sem lista: a pergunta e aberta, qual outro dia.
      let decisao = null;
      const outroHorario = todas.length ? [{ rotulo: 'Outro horário no dia', valor: { acao: 'outro_horario' } }] : [];
      if (!horas.length && soUm) {
        // "Ver outros barbeiros" so quando o servico tem mais de um (ha servico que so um barbeiro faz: o toque levava a "dia lotado")
        const unico = (ctx.pedido.barbeiros || []).length === 1 && ctx.pedido.servico && ctx.pedido.servico.idServico === s.idServico;
        const alt = [...outroHorario, { rotulo: 'Outro dia com ele', valor: { acao: 'outro_dia' } },
          ...(unico ? [] : [{ rotulo: 'Ver outros barbeiros', valor: { acao: 'outros_barbeiros', data: meta.data, ag: i.id_opcao_agendamento || null } }])];
        if (alt.length > 1) decisao = bvMontarOferta('decisao_sem_horario', alt, cfg);
        res.orientacao = `${soUm.apelido} não tem horário ${quando} (você só consultou ele: não diga que o dia está lotado). Diga isso e ${decisao ? 'pergunte o que ele prefere; as opções vão em lista junto' : 'pergunte qual outro dia ele prefere'}`;
      } else if (!horas.length && todas.length) {
        decisao = bvMontarOferta('decisao_sem_horario', [...outroHorario, { rotulo: 'Outro dia', valor: { acao: 'outro_dia' } }], cfg);
        res.orientacao = `sem horário livre ${meta.aPartir ? `a partir das ${meta.aPartir}` : `de ${meta.periodo}`} nesse dia. Diga isso e pergunte o que ele prefere; as opções vão em lista junto`;
      } else if (!horas.length) res.orientacao = 'dia lotado; sugira outro dia';
      // suite R18 (2026-11-16): o modelo tirava "a partir de que horas" da lista (um barbeiro por horario) e errava o primeiro horario
      else if (meta.qualquer) res.orientacao = 'a lista mostra um barbeiro por horário e não serve para dizer quando cada um começa: para dizer quem tem horário e a partir de que horas, use quem_tem_horario como está, sem trocar as horas; se o cliente pedir um barbeiro específico na próxima mensagem, chame horarios_livres com id_opcao_barbeiro dele (neste turno a lista já é esta)';
      // suite R8 (2026-11-16): com a lista de qualquer barbeiro numa remarcacao, o modelo dizia que "a troca mantem o barbeiro"
      if (meta.agQualquer && horas.length) res.orientacao = 'os horários da lista são de qualquer barbeiro, não do barbeiro do agendamento: não diga que a remarcação mantém o barbeiro, não diga com quem é o agendamento atual e não cite barbeiro nenhum pelo nome; diga só que há horários nesse dia e pergunte qual fica melhor; ' + (res.orientacao || '');
      if (meta.sem) res.orientacao = `${meta.sem}, ${meta.doAg ? 'o barbeiro do agendamento' : 'o barbeiro de costume do cliente'}, não tem horário ${meta.periodo ? `de ${meta.periodo} ` : ''}nesse dia: diga isso ao cliente${horas.length ? ' e que os horários da lista são de outros barbeiros' : ''}` + (res.orientacao ? '; ' + res.orientacao : '');
      if (perto.aproximada) res.orientacao = bvgAvisoPerto(meta.hora) + (res.orientacao ? '; ' + res.orientacao : '');
      // Servico a mais: o horario colado sai pronto daqui (o modelo erra conta de hora); ja_tem_no_dia e campo proprio porque a
      // orientacao e sobrescrita quando o horario pedido esta livre
      if (ancs.length) {
        const tem = ancs.map((f) => `${f.servico || 'agendamento'} às ${f.hora}`).join(' e ');
        const js = horas.filter(junto).map((hh) => {
          const f = bvgColado(ancs, hh, porHora.get(hh).minutos);
          const b = porHora.get(hh).b; // o barbeiro so e citado quando nao e o do agendamento (ou na lista de qualquer barbeiro)
          return `${hh}${meta.qualquer || b.idProfissional !== f.idProfissional ? ` com ${b.apelido}` : ''} (logo ${f.fim === hh ? 'depois' : 'antes'} de ${f.servico || 'o que ele já tem'})`;
        });
        res.ja_tem_no_dia = `${tem}. Estes horários são de ${s.nome}, um serviço a mais: o que já está marcado não muda; escolhido o horário, chame agendar só com id_opcao_horario, sem substitui_id_opcao_agendamento (esse campo é só para pôr este serviço no lugar do outro)`;
        // semPedido: nada no periodo ou na hora pedidos, a lista so tem o colado que entrou de fora
        const semPedido = horas.length > perto.itens.length && !perto.itens.length;
        const o = js.length ? `para ficar junto do que ele já tem, sem intervalo: ${js.join(' ou ')}. ${semPedido ? 'No período ou na hora que ele pediu não há horário: diga isso, ofereça o horário junto' : 'Diga isso em uma frase'} e pergunte ${horas.length > 1 ? 'qual horário ele prefere' : 'se esse horário serve'}${horas.length > js.length ? '; os outros horários do dia seguem na lista' : ''}`
          : horas.length ? 'nenhum horário da lista fica junto do que ele já tem: diga isso em uma frase e pergunte qual horário da lista ele prefere; só se ele fizer questão de junto, ofereça ver outro barbeiro ou passar para a equipe' : '';
        if (o) res.orientacao = o + (res.orientacao ? '; ' + res.orientacao : '');
      }
      // Dia e hora escolhidos (owner, 2026-11-14): o horario pedido livre vai direto ao resumo e a confirmacao, sem lista
      const exato = !meta.sem && meta.hora && of.itens.find((x) => x.valor.hora === meta.hora);
      if (exato) { // remarcacao (veio de id_opcao_agendamento) vai a reagendar: agendar criaria um novo e deixaria o antigo
        const ag = i.id_opcao_agendamento;
        res.horario_pedido_livre = exato.id;
        res.orientacao = ag ? `o horário pedido está livre: chame reagendar com id_opcao_agendamento ${ag} e id_opcao_horario ${exato.id} e peça a confirmação, sem mostrar a lista`
          : `o horário pedido está livre: chame agendar com id_opcao_horario ${exato.id} e peça a confirmação, sem mostrar a lista`;
      }
      // o barbeiro so vira escolha da conversa quando o cliente o escolheu (ou e o da remarcacao); o habitual segue sendo sugestao
      const um = soUm && !meta.habitual ? { barbeiro: { idProfissional: soUm.idProfissional, apelido: soUm.apelido }, barbeiro_ag: meta.agId || null } : {};
      if (decisao) res.opcoes = decisao.itens.map((x) => ({ id: x.id, rotulo: x.rotulo }));
      return bvgFim(res, { opcoes: decisao || of, pedido: { servico: s, ...um, busca: bvgBusca(i, of.itens.length, { livre: exato ? String(exato.id) : null, hora: !!(meta.hora || meta.aPartir), outros: !!meta.sem || horas.length > perto.itens.length }) } }); // colado de fora do pedido: o cliente escolhe (nao vai ao resumo no turno)
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
        valor: { idAgenda: a.idAgenda, horaInicio: a.horaInicio, idServico: a.idServico, servico: a.descricaoServico || 'agendamento' /* nunca "undefined" no resumo */, ...(a.pacote ? { pacote: true } : {}), idProfissional: a.idProfissional, profissional: String(a.profissional || '').trim(), recorrente: !!a.recorrente },
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

// Sequencias que vao a lista (`seqs` em ordem de hora). So as que atendem o pedido: barbeiro escolhido (`esc`) e periodo/hora minima,
// pelo inicio. Sem nenhuma, as que atendem um dos dois (as dele em outro horario, as de outros barbeiros no horario pedido) e, sem
// essas, as do dia: o cliente escolhe, e a orientacao diz o que nao ha. `outros` vai a busca: opcao fora do pedido espera a escolha dele.
function bvgSeqsDoPedido(seqs, meta, cfg, esc) {
  const noP = bvgNoPedido(meta), dele = (q) => !esc || q.id === esc.idProfissional, pedida = (q) => dele(q) && noP(q.hora);
  const base = [seqs.filter(pedida), seqs.filter((q) => dele(q) || noP(q.hora)), seqs].find((x) => x.length) || [];
  const perto = bvgPertoDaHora(base, meta.hora, cfg);
  const its = perto.itens, quando = bvgQuando(meta, true);
  const outros = base.length > 0 && !pedida(base[0]); // os niveis nao se misturam: ou todas sao do pedido, ou nenhuma
  // o que falta vem do dia (seqs); o que a lista traz, dos itens entregues (com hora pedida, `its` e so um trecho da base)
  let o = '';
  if (outros && !esc) o = `sem horário para os serviços em sequência ${quando}: diga isso ao cliente; a lista traz ${its.length < base.length ? 'outros' : 'os'} horários do dia`;
  else if (outros) {
    const falta = meta.naoFaz ? 'não faz todos os serviços pedidos' : `não tem horário para os serviços em sequência ${bvgQuando(meta, seqs.some(dele))}`;
    const lista = its.some(dele) ? `a lista traz os horários dele em outro horário do dia${its.some((q) => !dele(q)) ? ` e os de outros barbeiros ${quando}` : ''}`
      : `os horários da lista são de outros barbeiros${its.some((q) => !noP(q.hora)) ? `, em outro horário do dia (${quando} não há com ninguém)` : ''}`;
    o = `${esc.apelido} ${falta}: diga isso ao cliente; ${lista}`;
  }
  if (o) o += '. Pergunte qual horário ele prefere, sem escolher por ele';
  if (perto.aproximada) o = bvgAvisoPerto(meta.hora) + (o ? '; ' + o : '');
  // outros: a proposta espera a escolha do cliente (tambem sem horario perto da hora pedida). fora: a lista saiu da cascata, fora do
  // pedido, e por isso nao trava a busca seguinte do turno; a lista de "mais proximos" continua travando, como antes.
  return { itens: its, orientacao: o || undefined, outros: outros || perto.aproximada, fora: outros };
}

// Busca de sequencia. A mesma busca repetida com a lista ainda guardada (o cliente tocou num item e o modelo buscou de novo antes de
// agendar) guarda o turno da primeira: a escolha dele passa, e a barreira (cliente_nao_escolheu) segue valendo no turno da primeira.
function bvgBuscaSeq(st, n, sel) {
  const b0 = st.ctx.pedido.busca, mesma = b0 && b0.chave === bvgChaveBusca(st.in) && st.ctx.opcoes.tipo === 'sequencia';
  return bvgBusca(st.in, n, { hora: !!(st.meta.hora || st.meta.aPartir), outros: sel.outros, fora: !!sel.fora, ...(mesma ? { turno: b0.turno } : {}) });
}

// Encadeamento (FR-008/FR-012, Decision 7): so inicios presentes nas grades de cada servico, em sequencia, com o mesmo barbeiro.
function bvgPassoEnc(st, resps, cfg) {
  const { meta } = st;
  const n = meta.servicos.length;
  const pedido = { servicos: meta.servicos.map((s, k) => ({ opcao_id: s.opcao_id || String(k + 1), idServico: s.idServico, nome: s.nome, preco: s.preco })) };
  const semUnico = () => {
    const of = bvMontarOferta('modo_encadeamento', [{ rotulo: 'Barbeiros diferentes', valor: 'barbeiros_diferentes' }, { rotulo: 'Agendar separado', valor: 'separados' }], cfg);
    return bvgFim({ ok: true, sem_barbeiro_unico: true, opcoes: of.itens.map((x) => ({ id: x.id, rotulo: x.rotulo })), orientacao: 'nenhum barbeiro faz todos os serviços em sequência; pergunte por opção se prefere barbeiros diferentes ou agendar separado' }, { opcoes: of, pedido });
  };
  // as ocupacoes de um barbeiro nao dependem do servico: uma consulta por barbeiro (com o 1o servico), depois das grades
  const reqsDe = (bs) => [...bs.flatMap((b) => meta.servicos.map((s) => ({ m: 'GET', path: '/agenda/horarios-livres', qs: { idServico: s.idServico, idProfissional: b.id, data: meta.data } }))),
    ...bs.map((b) => ({ m: 'GET', path: '/agenda/horarios', qs: { idServico: meta.servicos[0].idServico, idProfissional: b.id, data: meta.data } }))];
  if (meta.etapa === 'enc_prof') {
    const sets = meta.servicos.map((_, k) => bvgBarbeiros(resps[k].body, cfg, st.ctx.rodizio, 'id')); // ja na ordem da fila: `fazem` herda
    const teto = Math.max(1, Math.floor(((cfg.graces || {}).max_consultas_estagio || 20) / (n + 1))); // n grades + 1 ocupacoes por barbeiro
    const fazem = sets[0].filter((b) => sets.every((x) => x.some((y) => y.id === b.id))); // a fila vale antes do teto
    // Barbeiro escolhido: so ele e consultado neste estagio (n + 1 chamadas em vez de (n + 1) por barbeiro); os outros (`resto`) so
    // sao consultados se ele nao tiver o pedido, num estagio a mais, e o total de chamadas fica igual ao de antes, nunca maior.
    const dele = meta.esc ? fazem.filter((b) => b.id === meta.esc.idProfissional) : []; // o escolhido segue primeiro, fora da fila
    const comuns = [...dele, ...fazem.filter((b) => !dele.includes(b))].slice(0, teto);
    if (!comuns.length) return semUnico();
    const agora = dele.length ? dele : comuns;
    return { reqs: reqsDe(agora), st: { ...st, meta: { ...meta, etapa: 'enc_grade', barbeiros: agora, resto: dele.length ? comuns.slice(1) : [], naoFaz: !!meta.esc && !dele.length } } };
  }
  if (meta.etapa === 'dif_prof') return bvgDifProf(st, resps, cfg);
  if (meta.etapa === 'dif_grade') return bvgDifGrade(st, resps, cfg);
  const seqs = [...(meta.seqs0 || [])]; // as do barbeiro escolhido, ja calculadas no estagio anterior
  const G = meta.barbeiros.length * n; // grades primeiro (barbeiro x servico), depois uma ocupacao por barbeiro
  meta.barbeiros.forEach((b, bi) => {
    const gr = meta.servicos.map((_, k) => bvgLivre(resps[bi * n + k].body || {}, resps[G + bi]));
    gr[0].inicios.forEach((ini) => {
      let t = ini;
      const itens = [];
      for (let k = 0; k < n; k++) {
        const g = gr[k], s = meta.servicos[k];
        if (!(g.minutos > 0) || !g.cabe(t)) break;
        // indicado: barbeiro posto pelo sistema (fila da vez), nao o que o cliente escolheu
        itens.push({ idServico: s.idServico, servico: s.nome, idProfissional: b.id, apelido: b.apelido, hora: t, minutos: g.minutos, valor: s.preco, ...(!meta.esc || b.id !== meta.esc.idProfissional ? { indicado: true } : {}) });
        t = bvgSomaMin(t, g.minutos);
      }
      if (itens.length === n) seqs.push({ hora: ini, id: b.id, apelido: b.apelido, valor: { data: meta.data, itens } });
    });
  });
  const noP = bvgNoPedido(meta);
  if ((meta.resto || []).length && !seqs.some((q) => noP(q.hora))) return { reqs: reqsDe(meta.resto), st: { ...st, meta: { ...meta, barbeiros: meta.resto, resto: [], seqs0: seqs } } };
  if (!seqs.length) return semUnico();
  seqs.sort((x, y) => (x.hora < y.hora ? -1 : x.hora > y.hora ? 1 : 0));
  const sel = bvgSeqsDoPedido(seqs, meta, cfg, meta.esc);
  const of = bvMontarOferta('sequencia', sel.itens.map((q) => ({ rotulo: `${q.hora} ${q.apelido}`, valor: q.valor })), cfg, true);
  // o barbeiro escolhido segue valendo na conversa (como na busca de um servico): a proxima busca sem barbeiro e com ele
  const um = meta.esc ? { barbeiro: meta.esc, barbeiro_ag: null } : {};
  return bvgFim({ ok: true, data: meta.data, total: sel.itens.length, completa: true, opcoes: of.itens.map((x) => ({ id: x.id, hora: x.valor.itens[0].hora, barbeiro: x.valor.itens[0].apelido })), orientacao: sel.orientacao },
    { opcoes: of, pedido: { ...pedido, ...um, modo_encadeamento: 'mesmo_barbeiro', busca: bvgBuscaSeq(st, of.itens.length, sel) } });
}

// Barbeiros diferentes por servico (FR-012): primeiro barbeiro da fila (a ordem de listar_barbeiros) que tem o inicio exato (fim do anterior) na grade.
function bvgDifProf(st, resps, cfg) {
  const { meta } = st;
  const n = meta.servicos.length;
  const teto = Math.max(1, Math.floor(((cfg.graces || {}).max_consultas_estagio || 20) / (2 * n)));
  const sets = meta.servicos.map((_, k) => bvgBarbeiros(resps[k].body, cfg, st.ctx.rodizio, 'id').slice(0, teto));
  if (sets.some((x) => !x.length)) return bvgFim(bvgRecusa('sem_barbeiro_servico', 'nenhum barbeiro disponível para um dos serviços; ofereça chamar a equipe da loja'));
  const reqs = bvgReqsLivre(sets.flatMap((bs, k) => bs.map((b) => ({ idServico: meta.servicos[k].idServico, idProfissional: b.id, data: meta.data }))));
  return { reqs, st: { ...st, meta: { ...meta, etapa: 'dif_grade', sets } } };
}

function bvgDifGrade(st, resps, cfg) {
  const { meta } = st;
  const pedido = { servicos: meta.servicos.map((s, k) => ({ opcao_id: s.opcao_id || String(k + 1), idServico: s.idServico, nome: s.nome, preco: s.preco })), modo_encadeamento: 'barbeiros_diferentes' };
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
      itens.push({ idServico: s.idServico, servico: s.nome, idProfissional: g.b.id, apelido: g.b.apelido, hora: t, minutos: g.minutos, valor: s.preco, indicado: true });
      t = bvgSomaMin(t, g.minutos);
    }
    if (itens.length === meta.servicos.length) seqs.push({ hora: ini, apelidos: [...new Set(itens.map((x) => x.apelido))], valor: { data: meta.data, itens } });
  });
  if (!seqs.length) { // as alternativas vao em lista (principio X), como as do barbeiro sem horario; a resposta volta por id_opcao
    const alt = bvMontarOferta('modo_encadeamento', [{ rotulo: 'Outro dia', valor: 'outro_dia' }, { rotulo: 'Agendar separado', valor: 'separados' }], cfg);
    return bvgFim({ ok: true, data: meta.data, total: 0, completa: true, opcoes: alt.itens.map((x) => ({ id: x.id, rotulo: x.rotulo })), orientacao: 'nenhuma sequência cabe nesse dia, nem com barbeiros diferentes. Diga isso e pergunte o que ele prefere; as opções vão em lista junto' }, { opcoes: alt, pedido: { ...pedido, seq_dia: meta.data } });
  }
  const sel = bvgSeqsDoPedido(seqs, meta, cfg, null); // o barbeiro escolhido nao vale aqui: cada servico pode ser com um
  const of = bvMontarOferta('sequencia', sel.itens.map((q) => ({ rotulo: `${q.hora} ${q.apelidos.join(' e ')}`, valor: q.valor })), cfg, true);
  return bvgFim({ ok: true, data: meta.data, total: sel.itens.length, completa: true, barbeiros_diferentes: true, opcoes: of.itens.map((x) => ({ id: x.id, hora: x.valor.itens[0].hora, barbeiros: x.valor.itens.map((i) => i.apelido) })), orientacao: sel.orientacao },
    { opcoes: of, pedido: { ...pedido, busca: bvgBuscaSeq(st, of.itens.length, sel) } });
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
  if (ok) return fim('executada', { ok: true, ...bvgFeito(p) }, { opcoes: {}, pedido: { servico: null, barbeiros: null, qualquer_opcao: null, horario: null, agendamentos: null, horarios_oferta: null, faltantes: null, ...(cancela ? bvgFechaRecusa(st.ctx, itens) : {}) } });
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
// Agendamento novo desta escrita na lista relida: fora da linha de base, com o mesmo barbeiro e inicio. Pelo pacote o servico nao
// entra na comparacao: nao esta medido se a Graces devolve o mesmo idServico num agendamento feito por secao, e nao reconhece-lo
// repetia o POST e dizia ao cliente que falhou com o horario ja marcado (revisoes de 23/11).
const bvgNova = (d, meta, lista) => bvgNumAgenda(lista).find((a) => !(meta.base || []).includes(a.idAgenda) && (d.pacote || a.idServico === d.idServico)
  && a.idProfissional === meta.prof && String(a.horaInicio).startsWith(`${d.data}T${d.hora}`));
function bvgAplicada(p, d, meta, lista) {
  const ags = bvgNumAgenda(lista);
  // cancelado e a ocorrencia ter sumido (o DELETE e sempre dela): as outras ocorrencias da serie seguem na agenda com o mesmo id
  if (p.acao === 'cancelar') return !bvMOcorrencia(ags, d.idAgenda, d.horaInicio);
  if (p.acao === 'reagendar') return ags.some((a) => a.idAgenda === d.idAgenda && String(a.horaInicio).startsWith(`${d.data}T${d.hora}`));
  return !!bvgNova(d, meta, lista);
}

function bvgPassoEscrita(st, resps, cfg) {
  const { meta } = st;
  const p = meta.proposta, d = p.dados || {};
  const r0 = resps[0] || { status: 0 };
  const sucesso2xx = (r) => r.status >= 200 && r.status < 300 && !(r.body && r.body.sucesso === false);
  const ok = sucesso2xx(r0);
  const limpaCom = (novoId) => ({ opcoes: {}, pedido: { servico: null, barbeiros: null, qualquer_opcao: null, horario: null, agendamentos: null, horarios_oferta: null, ...(/^(reagendar|cancelar|trocar_servico)$/.test(p.acao) ? bvgFechaRecusa(st.ctx, [p.acao === 'trocar_servico' ? d.antigo : d]) : {}), futuros: bvgFuturos(st.ctx && st.ctx.pedido, p.acao, d, novoId) } });
  const termina = (estado, resultado, extra = {}) => bvgFim(resultado, { ...extra, proposta_upd: { id: p.id, estado, resultado: { ok: !!resultado.ok, code: resultado.code } } });
  const err = (op, r) => { const e = bvGErro(r, op); return { e, f: e.falha }; };
  const prox = (etapa, reqs, extra = {}) => ({ reqs, st: { ...st, meta: { ...meta, etapa, ...extra } } });
  // Secoes do pacote relidas agora (rs alinhado a svs). -> { secoes: { idServico: [...] } } ou { fim } quando a leitura falhou:
  // nada foi gravado, entao a proposta falha (nao fica "incerta") e a oferta de horario continua valendo para o novo resumo.
  const lerSecoes = (svs, rs, data) => {
    const j = rs.findIndex((r) => !bvgPacoteLido(r));
    return j < 0 ? { secoes: bvgSecoesPor(svs, rs, data) }
      : { fim: termina('falhou', { ok: false, code: 'pacote_nao_conferido', orientacao: BVG_PACOTE_FORA }, { falha: err('pacotes', rs[j] || { status: 0 }).f }) };
  };
  const semSecao = () => termina('falhou', { ok: false, code: 'pacote_indisponivel', orientacao: BVG_SEM_SECAO });
  if (meta.etapa === 'reval_c') {
    const itens = p.dados.itens;
    const ruim = resps.slice(0, itens.length).findIndex((r) => r.status !== 200); // ocupacoes com falha so tiram o encaixe (bvgLivre)
    if (ruim >= 0) { const { e, f } = err('horarios_livres', resps[ruim]); return termina(e.incerto ? 'incerta' : 'falhou', { ok: false, code: e.incerto ? 'incerta' : e.code, orientacao: e.orientacao }, { falha: f }); }
    const livre = itens.every((x, j) => resps[j].body && Array.isArray(resps[j].body.horarios) && bvgLivre(resps[j].body, resps[itens.length + j]).cabe(x.hora));
    if (!livre) return termina('falhou', { ok: false, code: 'horario_indisponivel', orientacao: 'a sequência não está mais livre; consulte horarios_livres de novo e ofereça outras opções' }, { opcoes: {} });
    const svs = meta.svs || [];
    const lidas = lerSecoes(svs, svs.map((_, j) => resps[2 * itens.length + j]), itens[0].data);
    if (lidas.fim) return lidas.fim;
    const secoes = itens.map((x) => (x.pacote ? (lidas.secoes[x.idServico] || []).shift() || '' : null)); // '' = item do pacote sem secao
    if (secoes.includes('')) return semSecao();
    return prox('escrita_c', [bvgReqItem(p, 0, { ...meta, secoes })], { k: 0, res: [], secoes });
  }
  if (meta.etapa === 'confere_canc') {
    const c = bvgConfereApagar(p, p.acao === 'cancelar' ? [d] : (d.itens || []), r0, cfg, termina);
    if (c.fim) return c.fim;
    if (p.acao === 'cancelar_conjunto') return prox('escrita_c', [bvgReqItem(p, 0, meta)], { k: 0, res: [] });
    const del = bvgDel(d);
    return prox('escrita', [del], { w: del }); // w: a verificacao so repete este mesmo DELETE, ja conferido
  }
  if (meta.etapa === 'escrita_c') return bvgPassoConjunto(st, r0, cfg);
  if (meta.etapa === 'reval') {
    const livre = r0.status === 200 && r0.body && Array.isArray(r0.body.horarios) && bvgLivre(r0.body, resps[meta.idCliente ? 2 : 1]).cabe(d.hora);
    if (!livre) { // US1-4: horario tomado -> falhou + novas opcoes do mesmo dia
      const hs = r0.status === 200 && Array.isArray(r0.body && r0.body.horarios) ? r0.body.horarios.filter((x) => /^\d{2}:\d{2}$/.test(x)) : [];
      const of = bvMontarOferta('horario', hs.map((hh) => ({ rotulo: hh, valor: { data: d.data, hora: hh, idProfissional: d.idProfissional, apelido: d.barbeiro, idServico: d.idServico, servico: d.servico, preco: d.valor, ...(d.indicado ? { indicado: true } : {}), ...(p.acao === 'reagendar' ? { rec: bvgMarcaRec(d) } : {}) } })), cfg); // a reoferta do mesmo barbeiro guarda as marcas da proposta
      const { e, f } = r0.status === 200 ? { e: null, f: null } : err('horarios_livres', r0);
      return termina('falhou', { ok: false, code: 'horario_indisponivel', orientacao: 'esse horário não está mais livre; ofereça as novas opções', opcoes: of.itens.map((x) => ({ id: x.id, hora: x.valor.hora })) }, { opcoes: of, falha: f });
    }
    if (p.acao === 'trocar_servico') { // o antigo sera apagado depois do novo: confere agora, na linha de base lida neste estagio
      const c = bvgConfereApagar(p, [d.antigo || {}], meta.idCliente ? resps[1] || { status: 0 } : null, cfg, termina);
      if (c.fim) return c.fim;
    }
    const base = resps[1] && sucesso2xx(resps[1]) && Array.isArray(resps[1].body) ? bvgNumAgenda(resps[1].body).map((a) => a.idAgenda) : null; // linha de base so de ids
    let secao = null;
    if (d.pacote && p.acao !== 'reagendar') { // a resposta do pacote vem depois das ocupacoes (bvgFase2)
      const lidas = lerSecoes([d.idServico], [resps[meta.idCliente ? 3 : 2]], d.data);
      if (lidas.fim) return lidas.fim;
      secao = lidas.secoes[d.idServico][0];
      if (!secao) return semSecao();
    }
    const w = p.acao === 'reagendar'
      ? { m: 'PUT', path: `/agenda/${d.idAgenda}`, body: { horaInicioOriginal: d.horaInicio, horaInicioNovo: `${d.data}T${d.hora}:00`, idProfissional: meta.prof } }
      : { m: 'POST', path: '/agenda', body: bvgCorpoAgendar(d.idCliente, d, meta.prof, `bv-${String(p.id).slice(0, 8)}`, secao) };
    return prox('escrita', [w], { base, w, tent: 0 });
  }
  if (meta.etapa === 'escrita' || meta.etapa === 'escrita2') {
    const op = meta.etapa === 'escrita2' ? 'cancelar_antigo' : p.acao;
    const repetida = (meta.tent || 0) > 0;
    const sucessoFim = () => {
      if (p.acao === 'trocar_servico' && meta.etapa === 'escrita') {
        return prox('escrita2', [bvgDel(d.antigo)], { novoId: (r0.body && r0.body.idAgenda) || null });
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
      const novo = p.acao === 'agendar' || p.acao === 'trocar_servico' ? (bvgNova(d, meta, r0.body) || {}).idAgenda : null;
      if (p.acao === 'trocar_servico') return prox('escrita2', [bvgDel(d.antigo)], { novoId: novo || null });
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

if (typeof module !== 'undefined') module.exports = { bvGNormalizar, bvGPlano, bvGPasso, bvGErro, bvGParams, bvgConfirmou, bvgCabeloEBarba, bvgSemRetransferir, bvgFila, bvgRepartir, bvgConviteCliente, bvgConviteReqs, bvgConvite, bvgSecoes, BVG_ACOES };
