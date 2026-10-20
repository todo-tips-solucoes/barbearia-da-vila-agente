const assert = require('assert');
const { bvMProgramar, bvMLista, bvMTexto, bvMResultadoEnvio, bvMReconhecer, bvMReconciliar } = require('../workflows/shared/mensagens.js');

const cfg = { confirmacao_hora: '18:00', lembrete_antes_min: 120, pos_depois_min: 60, retentativas_min: [1, 5, 15], titulo_sim: 'Confirmo', titulo_nao: 'Não vou poder',
  wid: '145', botao: 'Responder', topo: 'Confirmação', reconciliacao_dias: 7 };
const prog = (ini, fim, agora) => bvMProgramar({ inicio: ini, fim }, agora, cfg);
const por = (r) => Object.fromEntries(r.programar.map((x) => [x.tipo, x.previsto_para]));

// SP = UTC-3 (sem horario de verao): 18:00 SP = 21:00Z
let r = prog('2026-10-22T14:00:00', '2026-10-22T14:45:00', '2026-10-20T12:00:00Z');
assert.deepEqual(por(r), { confirmacao: '2026-10-21T21:00:00.000Z', lembrete: '2026-10-22T15:00:00.000Z', pos_atendimento: '2026-10-22T18:45:00.000Z' });
assert.deepEqual(r.ignorar, []);
// virada de mes e de ano: confirmacao 31/12 18:00 para 01/01 de manha
r = prog('2027-01-01T09:00:00', '2027-01-01T09:30:00', '2026-12-20T00:00:00Z');
assert.equal(por(r).confirmacao, '2026-12-31T21:00:00.000Z');
assert.equal(por(r).lembrete, '2027-01-01T10:00:00.000Z');
// termino apos meia-noite local
assert.equal(por(prog('2026-10-22T23:30:00', '2026-10-23T00:15:00', '2026-10-20T00:00:00Z')).pos_atendimento, '2026-10-23T04:15:00.000Z');
// amanha antes das 18h: confirmacao hoje 18:00; amanha depois das 18h: ja passou
assert.equal(por(prog('2026-10-21T10:00:00', '2026-10-21T10:30:00', '2026-10-20T14:00:00Z')).confirmacao, '2026-10-20T21:00:00.000Z');
r = prog('2026-10-21T10:00:00', '2026-10-21T10:30:00', '2026-10-20T22:00:00Z');
assert.deepEqual(r.ignorar, [{ tipo: 'confirmacao', motivo: 'ja_passou', previsto_para: '2026-10-20T21:00:00.000Z' }]);
// mesmo dia, lembrete passou, so o pos
r = prog('2026-10-20T10:00:00', '2026-10-20T10:30:00', '2026-10-20T14:00:00Z'); // 11:00 SP
assert.deepEqual(r.programar.map((x) => x.tipo), ['pos_atendimento']);
assert.deepEqual(r.ignorar.map((x) => x.tipo), ['confirmacao', 'lembrete']);
// fora do horario / sem fim: pos usa o inicio; fim invalido nao quebra
assert.equal(por(prog('2026-10-22T08:00:00', undefined, '2026-10-20T00:00:00Z')).pos_atendimento, '2026-10-22T12:00:00.000Z');
assert.throws(() => prog('lixo', null, new Date()));

// envio
const l = bvMLista({ texto: 'Oi' }, 42, '5511999998888', cfg);
assert.equal(l.body.openTicket, '1');
assert.deepEqual(l.body.body.List.map((x) => x.RowId), ['bvc:42:s', 'bvc:42:n']);
assert.equal(bvMTexto({ texto: 'x' }, '123@lid', cfg).path, '/api/messages/whatsmeow/sendTextPROLid');
assert.equal(bvMTexto({ texto: 'x' }, '+55 (11) 9', cfg).body.number, '55119');
assert.equal(bvMTexto({ texto: 'x' }, '55', cfg).body.openTicket, '0');

// resultado do envio
const ag = '2026-10-20T12:00:00Z';
assert.deepEqual(bvMResultadoEnvio(200, 0, cfg, ag), { situacao: 'enviada' });
assert.equal(bvMResultadoEnvio(0, 0, cfg, ag).motivo, 'incerto');
assert.equal(bvMResultadoEnvio(undefined, 2, cfg, ag).motivo, 'incerto');
assert.equal(bvMResultadoEnvio(500, 0, cfg, ag).proxima_tentativa_em, '2026-10-20T12:01:00.000Z');
assert.equal(bvMResultadoEnvio(400, 1, cfg, ag).proxima_tentativa_em, '2026-10-20T12:05:00.000Z');
assert.equal(bvMResultadoEnvio(400, 2, cfg, ag).proxima_tentativa_em, '2026-10-20T12:15:00.000Z');
assert.deepEqual(bvMResultadoEnvio(400, 3, cfg, ag), { situacao: 'falhou', motivo: 'recusada_canal', tentativas: 4 });

// reconhecimento
const dj = (id, extra) => JSON.stringify({ rawData: { event: { Message: { listResponseMessage: { title: 'Confirmo', listType: 1,
  singleSelectReply: { selectedRowID: id }, contextInfo: { stanzaID: 'WID1' }, ...extra } } } } });
const fi = (id) => ({ acao: 'from_internal', fromMe: false, mensagem: { body: 'Confirmo', dataJson: dj(id) } });
assert.deepEqual(bvMReconhecer(fi('bvc:7:s'), cfg), { origem: 'id', mensagem_id: 7, confirmado: true, stanza: 'WID1' });
assert.equal(bvMReconhecer(fi('bvc:7:n'), cfg).confirmado, false);
for (const x of ['bvc:7:x', 'bvc:a:s', 'bv_conf_teste_sim', 'bvc:7:s;DROP', '', null]) assert.equal(bvMReconhecer(fi(x), cfg), null, String(x));
assert.equal(bvMReconhecer({ ...fi('bvc:7:s'), fromMe: true }, cfg), null);
assert.equal(bvMReconhecer({ acao: 'from_internal', mensagem: { dataJson: 'nao json' } }, cfg), null);
// formato real (E2E 2026-10-20): dataJson e um texto JSON que contem outro texto JSON
assert.equal(bvMReconhecer({ acao: 'from_internal', fromMe: false, mensagem: { body: 'Confirmo', dataJson: JSON.stringify(dj('bvc:7:s')) } }, cfg).mensagem_id, 7);
const st = (t) => ({ acao: 'start', fromMe: false, mensagem: [{ type: 'text', text: t }] });
assert.deepEqual(bvMReconhecer(st(' Confirmo '), cfg), { origem: 'titulo', confirmado: true });
assert.equal(bvMReconhecer(st('Não vou poder'), cfg).confirmado, false);
assert.equal(bvMReconhecer(st('Confirmo sim obrigado'), cfg), null);
assert.equal(bvMReconhecer({ ...st('Confirmo'), mensagem: [{ type: 'text', text: 'Confirmo' }, { type: 'text', text: 'x' }] }, cfg), null);
// texto do cliente com cara de id nao vira id
assert.equal(bvMReconhecer(st('bvc:7:s'), cfg), null);

// reconciliacao
const now = '2026-10-20T12:00:00Z';
const it = (id, ini, tel = '988887777') => ({ idAgenda: id, horaInicio: ini, horaFim: ini.replace(/T(\d\d)/, (_, h) => 'T' + String(+h + 1).padStart(2, '0')),
  idStatusAgenda: 2, ddiCelular: '55', celularCliente: `(11) ${tel.slice(0, 5)}-${tel.slice(5)}` });
const cts = [{ id: 1, telefone: '5511988887777' }];
// faltantes: agendamento sem linhas
let rc = bvMReconciliar([it('A', '2026-10-22T14:00:00')], [], cts, now, cfg);
assert.deepEqual(rc.criar.map((x) => x.tipo).sort(), ['confirmacao', 'lembrete', 'pos_atendimento']);
assert.equal(rc.criar[0].contato_id, 1);
// orfa: pendente cujo idAgenda nao existe mais
rc = bvMReconciliar([], [{ id: 9, graces_agendamento_id: 'Z', tipo: 'lembrete', situacao: 'pendente', previsto_para: '2026-10-22T15:00:00Z', inicio: '2026-10-22T14:00:00' }], cts, now, cfg);
assert.deepEqual(rc.cancelar, [{ id: 9, motivo: 'orfa' }]);
// pendente alem da janela de 7 dias nao e orfa (nao veio na consulta)
rc = bvMReconciliar([], [{ id: 9, graces_agendamento_id: 'Z', tipo: 'lembrete', situacao: 'pendente', previsto_para: '2026-11-22T15:00:00Z', inicio: '2026-11-22T14:00:00' }], cts, now, cfg);
assert.deepEqual(rc.cancelar, []);
// ja enviada do mesmo horario nao recria; as demais faltam
const prev = bvMProgramar({ inicio: '2026-10-22T14:00:00', fim: '2026-10-22T15:00:00' }, now, cfg);
const lemb = prev.programar.find((x) => x.tipo === 'lembrete').previsto_para;
rc = bvMReconciliar([it('A', '2026-10-22T14:00:00')], [{ id: 5, graces_agendamento_id: 'A', tipo: 'lembrete', situacao: 'enviada', previsto_para: lemb }], cts, now, cfg);
assert.deepEqual(rc.criar.map((x) => x.tipo).sort(), ['confirmacao', 'pos_atendimento']);
// horario mudou: pendente antiga cancelada e nova criada
rc = bvMReconciliar([it('A', '2026-10-22T16:00:00')], [{ id: 6, graces_agendamento_id: 'A', tipo: 'lembrete', situacao: 'pendente', previsto_para: lemb, inicio: '2026-10-22T14:00:00' }], cts, now, cfg);
assert.deepEqual(rc.cancelar, [{ id: 6, motivo: 'reagendada' }]);
assert.ok(rc.criar.some((x) => x.tipo === 'lembrete'));
// pendente no horario certo: idempotente
rc = bvMReconciliar([it('A', '2026-10-22T14:00:00')], prev.programar.map((p, i) => ({ id: 20 + i, graces_agendamento_id: 'A', tipo: p.tipo, situacao: 'pendente', previsto_para: p.previsto_para, inicio: '2026-10-22T14:00:00' })), cts, now, cfg);
assert.deepEqual([rc.criar, rc.cancelar], [[], []]);
// sem contato / telefone de outro
rc = bvMReconciliar([it('B', '2026-10-22T14:00:00', '977776666')], [], cts, now, cfg);
assert.deepEqual([rc.sem_contato, rc.criar], [['B'], []]);
// item 7: recorrente (mesmo idAgenda 2x na janela): pulado e registrado, nunca 2 `criar` com a mesma chave; pendente dele nao vira orfa
rc = bvMReconciliar([it('R', '2026-10-21T14:00:00'), it('R', '2026-10-24T14:00:00')], [{ id: 31, graces_agendamento_id: 'R', tipo: 'lembrete', situacao: 'pendente', previsto_para: '2026-10-21T15:00:00Z', inicio: '2026-10-21T14:00:00' }], cts, now, cfg);
assert.deepEqual([rc.criar, rc.cancelar, rc.recorrente], [[], [], ['R']]);
console.log('mensagens.test.js ok');

// decisao do envio
{
  const { bvMDecidir, bvMDia, bvMTemplate } = require('../workflows/shared/mensagens.js');
  assert.equal(bvMDia('2026-10-22T14:00:00'), 'quinta-feira (22/10)');
  assert.equal(bvMTemplate('Oi {x} {y}!', { x: 'a' }), 'Oi a !');
  const T = '1cee';
  const c2 = { ...cfg, textos: { confirmacao: 'Confirma {servico} com {barbeiro}, {dia} às {hora}?', lembrete: 'L {hora}', pos: 'P {servico}' },
    teste: { testeId: T, escrita: ['+55 11 99999-8888'] } };
  const lin = { id: 7, tipo: 'confirmacao', graces_agendamento_id: 'A', id_profissional: T, inicio: '2026-10-22T14:00:00', telefone: '5511999998888',
    dados: { servico: 'Corte', barbeiro: 'Zé' }, handoff_aberto: false };
  const ag = (o) => ({ status: 200, body: [{ idAgenda: 'A', horaInicio: '2026-10-22T14:00:00', idStatusAgenda: 2, ...o }] });
  let d = bvMDecidir(lin, ag(), c2);
  assert.equal(d.acao, 'enviar');
  assert.equal(d.tipo_msg, 'lista');
  assert.equal(d.texto, 'Confirma Corte com Zé, quinta-feira (22/10) às 14:00?');
  assert.deepEqual(d.req.body.body.List.map((x) => x.RowId), ['bvc:7:s', 'bvc:7:n']);
  assert.equal(bvMDecidir({ ...lin, tipo: 'lembrete' }, ag({ idStatusAgenda: 3 }), c2).req.path, '/api/messages/send');
  assert.equal(bvMDecidir(lin, null, c2).acao, 'enviar'); // sem cliente: nao revalida
  // revalidacao
  assert.deepEqual(bvMDecidir(lin, { status: 200, body: [] }, c2), { acao: 'cancelar', motivo: 'orfa' });
  assert.equal(bvMDecidir(lin, ag({ horaInicio: '2026-10-22T15:00:00' }), c2).motivo, 'orfa');
  assert.equal(bvMDecidir(lin, ag({ idStatusAgenda: 3 }), c2).motivo, 'status_3');
  assert.equal(bvMDecidir({ ...lin, tipo: 'lembrete' }, ag({ idStatusAgenda: 3 }), c2).acao, 'enviar'); // lembrete nao exige status 2
  // item 11 (owner, 2026-10-20: "Cancelar os dois"): apos "Nao vou poder" (status 10) lembrete e pos nao saem
  assert.deepEqual(bvMDecidir({ ...lin, tipo: 'lembrete' }, ag({ idStatusAgenda: 10 }), c2), { acao: 'cancelar', motivo: 'recusada' });
  assert.deepEqual(bvMDecidir({ ...lin, tipo: 'pos_atendimento' }, ag({ idStatusAgenda: 10 }), c2), { acao: 'cancelar', motivo: 'recusada' });
  // item 7: recorrente (mesmo idAgenda em varias ocorrencias): vale a ocorrencia do inicio, nao a primeira
  const rec = { status: 200, body: [{ idAgenda: 'A', horaInicio: '2026-10-15T14:00:00', idStatusAgenda: 3 }, { idAgenda: 'A', horaInicio: '2026-10-22T14:00:00', idStatusAgenda: 2 }] };
  assert.equal(bvMDecidir(lin, rec, c2).acao, 'enviar');
  // item 6: linha sem graces_cliente_id revalidada pela /agenda/completa do dia (por profissional)
  const comp = (o) => ({ status: 200, body: [{ idProfissional: T, apelido: 'Zé ', agendamentos: [{ idAgenda: 'A', horaInicio: '2026-10-22T14:00:00', idStatusAgenda: 2, ...o }] }] });
  assert.equal(bvMDecidir(lin, comp(), c2).acao, 'enviar');
  assert.equal(bvMDecidir(lin, comp({ idAgenda: 'B' }), c2).motivo, 'orfa');
  assert.equal(bvMDecidir(lin, comp({ idStatusAgenda: 3 }), c2).motivo, 'status_3');
  assert.equal(bvMDecidir({ ...lin, tipo: 'pos_atendimento' }, ag({ idStatusAgenda: 9 }), c2).motivo, 'status_9');
  for (const r of [{ status: 0 }, { status: 500, body: {} }, { status: 200, body: {} }]) assert.equal(bvMDecidir(lin, r, c2).acao, 'adiar');
  // trava de TESTE e handoff
  assert.equal(bvMDecidir({ ...lin, id_profissional: 'real' }, ag(), c2).motivo, 'fora_do_teste');
  assert.equal(bvMDecidir({ ...lin, telefone: '5511000000000' }, ag(), c2).motivo, 'fora_da_lista');
  assert.equal(bvMDecidir({ ...lin, handoff_aberto: true }, ag(), c2).acao, 'adiar');
}
console.log('mensagens.test.js (decisao) ok');

// bv-confirmacao
{
  const { bvMConfNormalizar: N, bvMConfEscolher: E, bvMConfAvaliar: A, bvMConfTexto: X } = require('../workflows/shared/mensagens.js');
  assert.deepEqual(N({ contato_id: 5, origem: 'id', confirmado: 'true', mensagem_id: '9' }), { ok: true, contato_id: '5', origem: 'id', confirmado: true, mensagem_id: '9' });
  assert.equal(N({ contato_id: 5, origem: 'titulo', confirmado: false }).mensagem_id, null);
  for (const r of [{}, { contato_id: 'x', origem: 'id', confirmado: true, mensagem_id: 1 }, { contato_id: 1, origem: 'x', confirmado: true },
    { contato_id: 1, origem: 'id', confirmado: true }, { contato_id: 1, origem: 'agente', confirmado: 'sim', mensagem_id: 1 },
    { contato_id: 1, origem: 'id', confirmado: true, mensagem_id: '1; DROP' }]) assert.equal(N(r).ok, false, JSON.stringify(r));
  const T = '1cee', cfg2 = { testeId: T };
  const row = (o) => ({ id: 3, situacao: 'enviada', resposta: null, id_profissional: T, futuro: true, repetidas: 0, inicio: '2026-10-22T14:00:00', ...o });
  assert.equal(E([row()], { mensagem_id: null }, cfg2).acao, 'claim');
  assert.equal(E([row(), row({ id: 4 })], { mensagem_id: null }, cfg2).code, 'ambigua'); // 2 abertas sem id: pede para escolher
  // item 1: o from_internal (id) do mesmo toque ja respondeu B; o titulo nao pode confirmar A (a unica aberta que sobrou)
  assert.deepEqual(E([row(), row({ id: 4, resposta: 'confirmada', recente: true })], { mensagem_id: null }, cfg2).code, 'repetida');
  assert.equal(E([row(), row({ id: 4, resposta: 'confirmada', recente: false })], { mensagem_id: null }, cfg2).row.id, 3);
  // item 3: enviada encerrada por cancelar/remarcar (motivo preenchido): lista antiga = desatualizada, sem claim
  assert.equal(E([row({ motivo: 'cancelada_agente' })], { mensagem_id: '3' }, cfg2).code, 'desatualizada');
  assert.equal(E([row({ motivo: 'reagendada' })], { mensagem_id: null }, cfg2).code, 'desatualizada');
  assert.equal(E([row(), row({ id: 4 })], { mensagem_id: '4' }, cfg2).row.id, 4);
  assert.equal(E([], { mensagem_id: null }, cfg2).code, 'desatualizada');
  assert.equal(E([row()], { mensagem_id: '99' }, cfg2).code, 'desatualizada'); // id de outro contato nao esta em rows
  assert.equal(E([row({ situacao: 'cancelada' })], { mensagem_id: '3' }, cfg2).code, 'desatualizada');
  assert.equal(E([row({ futuro: false })], { mensagem_id: '3' }, cfg2).code, 'desatualizada');
  assert.equal(E([row({ resposta: 'confirmada' })], { mensagem_id: '3' }, cfg2).code, 'repetida');
  assert.equal(E([row({ id_profissional: 'real' })], { mensagem_id: '3' }, cfg2).code, 'fora_do_teste');
  // Graces
  assert.deepEqual(A(200, 0, true), { code: 'confirmada' });
  // item 4: 409 nao e sucesso as cegas: conferir o status por GET
  assert.deepEqual(A(409, 0, true), { code: 'conferir' });
  assert.deepEqual(A(409, 0, false), { code: 'conferir' });
  const { bvMConfConferir: C, bvMConfReq: Q, bvMTituloRota: R } = require('../workflows/shared/mensagens.js');
  const lr = { graces_agendamento_id: 'A', inicio: '2026-10-22T14:00:00' };
  const g = (st, o) => ({ status: 200, body: [{ idAgenda: 'A', horaInicio: '2026-10-22T14:00:00', idStatusAgenda: st, ...o }] });
  assert.equal(C(g(3), lr, true).code, 'confirmada');
  assert.equal(C(g(10), lr, false).code, 'recusada');
  assert.equal(C(g(10), lr, true).code, 'desatualizada'); // divergente
  assert.equal(C(g(3), lr, false).code, 'desatualizada');
  assert.equal(C(g(3, { horaInicio: '2026-10-22T15:00:00' }), lr, true).code, 'desatualizada');
  assert.equal(C({ status: 200, body: [{ idProfissional: 'p', agendamentos: [{ idAgenda: 'A', horaInicio: '2026-10-22T14:00:00', idStatusAgenda: 3 }] }] }, lr, true).code, 'confirmada'); // /completa
  assert.equal(C({ status: 0 }, lr, true).code, 'falhou');
  assert.equal(C({ status: 500, body: {} }, lr, true).code, 'falhou');
  // item 7: `data` so em recorrente
  assert.deepEqual(Q('A', { inicio: '2026-10-22T14:00:00', dados: {} }, true), { idAgenda: 'A', confirmado: true });
  assert.deepEqual(Q('A', { inicio: '2026-10-22T14:00:00', dados: { recorrente: true } }, false), { idAgenda: 'A', confirmado: false, data: '2026-10-22' });
  // itens 1 e 5: rota do titulo na recepcao
  assert.equal(R({ abertas: 0, recentes: 1, propostas: 1, ultima_lista: false }), 'consumir'); // gemeo do toque ja respondido: nunca vai ao agente
  assert.equal(R({ abertas: 2, recentes: 0, propostas: 0, ultima_lista: true }), 'consumir'); // 2 abertas: espera o id
  assert.equal(R({ abertas: 1, recentes: 0, propostas: 1, ultima_lista: true }), 'agente'); // proposta pendente: "Confirmo" e do agente
  assert.equal(R({ abertas: 1, recentes: 0, propostas: 0, ultima_lista: false }), 'agente'); // ultima saida nao foi a lista
  assert.equal(R({ abertas: '0', recentes: '0', propostas: '0', ultima_lista: 'true' }), 'agente');
  assert.deepEqual(A(0, 0, true), { code: 'retry', espera_s: 1 });
  assert.deepEqual(A(503, 1, true), { code: 'retry', espera_s: 5 });
  assert.equal(A(503, 2, true).code, 'falhou');
  assert.equal(A(400, 0, true).code, 'falhou');
  // textos
  const tx = { confirmacao_ok: 'ok {dia} {hora}', confirmacao_recusada: 'r', confirmacao_repetida: 'rep', confirmacao_desatualizada: 'd', confirmacao_falhou: 'f' };
  assert.equal(X('confirmada', row(), 'id', tx, 2), 'ok quinta-feira (22/10) 14:00');
  assert.equal(X('repetida', row({ repetidas: 1 }), 'id', tx, 2), 'rep');
  assert.equal(X('repetida', row({ repetidas: 2 }), 'id', tx, 2), ''); // teto
  assert.equal(X('repetida', row(), 'titulo', tx, 2), ''); // dedupe do mesmo toque
  assert.equal(X('ambigua', row(), 'id', tx, 2), '');
  assert.equal(X('ambigua', row(), 'titulo', { ...tx, confirmacao_escolher: 'esc' }, 2), 'esc'); // titulo com 2+ abertas e sem id
  // item 2: prompt das confirmacoes independe de sessao nova; recusa vale pela recencia do proprio `em`
  const { bvMPromptConfirmacoes: P } = require('../workflows/shared/mensagens.js');
  const agora = Date.parse('2026-10-21T21:30:00Z'), id = (x) => x;
  const ctx = { confirmacoes: [{ id: 9, servico: 'Corte', barbeiro: 'Zé', inicio: '2026-10-22T14:00:00' }], pedido: { confirmacao_recusada: { idAgenda: 'A', em: '2026-10-21T21:00:00Z' } } };
  assert.match(P(ctx, agora, 120, id), /id=9 \(Corte com Zé, quinta-feira \(22\/10\) às 14:00\)/);
  assert.match(P(ctx, agora, 120, id), /não vai poder comparecer ao agendamento A/);
  assert.doesNotMatch(P(ctx, agora + 3 * 3600000, 120, id), /não vai poder/); // recusa antiga some
  assert.equal(P({}, agora, 120, id), '');
}
console.log('mensagens.test.js (confirmacao) ok');
