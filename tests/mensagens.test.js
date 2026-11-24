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
assert.equal(l.body.openTicket, '0'); // como o texto: com '1' a lista tirava do setor humano um chamado em atendimento (medido no TESTE, 23/11)
assert.deepEqual(l.body.body.List.map((x) => x.RowId), ['bvc:42:s', 'bvc:42:n']);
{ // montador unico de lista (23/11): agente, confirmacao e decisao saem daqui, sempre sem mexer no chamado (openTicket '0', como o texto)
  const { bvMListaDe, bvMListaDecisao } = require('../workflows/shared/mensagens.js');
  const cl = { wid: '159', fila: '107', botao: 'Ver opções', topo: 'Opções' };
  assert.deepEqual(bvMListaDe('Qual horário?', [{ id: 's3', rotulo: '14:00 Kiel', valor: { x: 1 } }, { id: '2', rotulo: '15:00' }], '+55 (11) 99999-8888', cl),
    { path: '/api/messages/whatsmeow/sendListPRO', body: { number: '5511999998888', openTicket: '0', queueId: '107', whatsappId: '159',
      body: { Desc: 'Qual horário?', ButtonText: 'Ver opções', TopText: 'Opções', List: [{ RowId: 's3', title: '14:00 Kiel', desc: '' }, { RowId: '2', title: '15:00', desc: '' }] } } });
  assert.equal(bvMListaDe('x', undefined, '123@lid', cl).body.number, '123@lid'); // LID intacto; sem itens nao quebra
  assert.deepEqual(bvMListaDe('x', undefined, '55', cl).body.body.List, []);
  const dec = bvMListaDecisao({ texto: 'Remarcar ou cancelar?' }, '5511999998888', cl);
  assert.deepEqual([dec.body.openTicket, dec.body.queueId, dec.body.body.List.map((x) => x.title)], ['0', '107', ['Remarcar', 'Cancelar mesmo']]);
  assert.equal(bvMListaDe('x', [], '55', { wid: '145' }).body.queueId, '0'); // sem setor configurado (TESTE)
}
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
// "sim" digitado ao lembrete de 24 h (23/11): so a mensagem inteira; o resto segue para o agente
for (const t of ['Sim', 'sim', 'SIM!', 'Simm', ' sim. ', 'Sim 👍', 'Confirmado', 'Confirmado!', 'confirmo', 'confirmo sim', 'Pode confirmar', 'Tá confirmado']) assert.deepEqual(bvMReconhecer(st(t), cfg), { origem: 'titulo', confirmado: true, digitado: true }, t);
assert.deepEqual(bvMReconhecer(st('Confirmo'), cfg), { origem: 'titulo', confirmado: true }); // o titulo exato continua sendo titulo (a rota trata os dois)
// o "nao" fica com o agente (revisao de 24/11: recusa por engano muda a agenda); so o titulo exato da lista recusa em codigo
for (const t of ['Não', 'nao', 'NÃO.', 'Não posso', 'não vou conseguir ir', 'Nao vou poder ir', 'Não, vou', 'Sum', 'Sim, mas vou atrasar', 'sim?', 'Sim às 15h', 'Sim 😡', 'sim да', 'Amanhã não. Eu agendei para quarta feira 25/11', 'ok',
  'Confirmo sim obrigado', 'não quero remarcar, quero cancelar mesmo', 'si', 'да', '', 'sim '.repeat(12)]) assert.equal(bvMReconhecer(st(t), cfg), null, t);

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
  // rota do "sim" ao lembrete de 24 h: confirmacao aberta, sem proposta pendente e o lembrete como a ultima coisa dita pela barbearia
  const dg = { digitado: true, sim: true };
  assert.equal(R({ ...dg, abertas: '1', propostas: '0', lembrete_ultimo: true, recentes: '0' }), 'consumir');
  assert.equal(R({ ...dg, abertas: 2, propostas: 0, lembrete_ultimo: 'true' }), 'consumir'); // 2 abertas: o bv-confirmacao pede para escolher
  for (const e of [{ abertas: 1, propostas: 0, lembrete_ultimo: false }, { abertas: 1, propostas: 1, lembrete_ultimo: true }, { abertas: 0, propostas: 0, lembrete_ultimo: true },
    { abertas: 1, propostas: 0, lembrete_ultimo: false, ultima_lista: true }, { abertas: 0, propostas: 0, recentes: 3 }, {}]) assert.equal(R({ ...e, ...dg }), 'agente', JSON.stringify(e));
  // o titulo exato: recentes, ou aberta + lista como ultima saida, como antes; "Confirmo" escrito a mao depois do lembrete de 24 h tambem confirma
  assert.equal(R({ sim: true, abertas: 1, propostas: 0, ultima_lista: true, lembrete_ultimo: false }), 'consumir');
  assert.equal(R({ sim: true, abertas: 1, propostas: 0, ultima_lista: false, lembrete_ultimo: true }), 'consumir');
  assert.equal(R({ sim: false, abertas: 1, propostas: 0, ultima_lista: false, lembrete_ultimo: true }), 'agente'); // "Nao vou poder" sem a lista: agente
  assert.equal(R({ sim: false, abertas: 1, propostas: 0, ultima_lista: true }), 'consumir');
  assert.equal(R({ recentes: 1 }), 'consumir');
  assert.equal(R({}), 'agente'); // consulta com erro (linha vazia)
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
  assert.deepEqual(A(400, 0, true), { code: 'retry', espera_s: 1, com_data: true }); // recorrente sem `data` (PROD, 16/11): tenta de novo com a data
  assert.equal(A(400, 1, true).code, 'falhou');
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
  // lembrete de 1 hora que acabou de sair: o "sim" solto responde a ele; com confirmacao aberta vale a confirmacao
  const lh = { servico: 'Corte', inicio: '2026-10-21T19:30:00' };
  assert.match(P({ lembrete_hora: lh }, agora, 120, id, true), /Lembrete enviado pela barbearia há pouco \(dado\): Corte, hoje às 19:30\. O lembrete não pede resposta/);
  assert.match(P({ lembrete_hora: { inicio: lh.inicio } }, agora, 120, id, true), /\(dado\): horário, hoje às 19:30/);
  assert.doesNotMatch(P({ ...ctx, lembrete_hora: lh }, agora, 120, id, true), /Lembrete enviado/);
  assert.equal(P({ lembrete_hora: lh }, agora, 120, id), ''); // conversa em andamento: o "sim" e da ultima pergunta do agente
}
console.log('mensagens.test.js (confirmacao) ok');

// Lembretes no Chat Master (owner, 2026-11-15): 24 h e 1 h antes, espelhados no modulo de Agendamentos com o minimo de chamadas
{
  const m = require('../workflows/shared/mensagens.js');
  const LEM = [{ tipo: 'lembrete_dia', antes_min: 1440 }, { tipo: 'lembrete_hora', antes_min: 60 }];
  const agora = '2026-11-20T12:00:00Z'; // 09:00 em SP
  let p = m.bvMProgramar({ inicio: '2026-11-22T14:00:00', fim: '2026-11-22T14:40:00' }, agora, { lembretes: LEM });
  assert.deepEqual(p.programar, [{ tipo: 'lembrete_dia', previsto_para: '2026-11-21T17:00:00.000Z' }, { tipo: 'lembrete_hora', previsto_para: '2026-11-22T16:00:00.000Z' }]);
  p = m.bvMProgramar({ inicio: '2026-11-20T15:00:00' }, agora, { lembretes: LEM }); // corte daqui a 6 h: so o de 1 h antes
  assert.deepEqual([p.programar.map((x) => x.tipo), p.ignorar.map((x) => x.tipo)], [['lembrete_hora'], ['lembrete_dia']]);
  const textos = { lembrete_dia: 'Oi, {nome}! Amanhã às {hora}, {servico} com {barbeiro}.', lembrete_hora: 'Oi, {nome}! Às {hora}.' };
  assert.equal(m.bvMTextoDe({ tipo: 'lembrete_dia', inicio: '2026-11-22T14:00:00', dados: { nome: 'Paulo Sudre', servico: 'corte adulto', barbeiro: 'Pedro' } }, textos), 'Oi, Paulo! Amanhã às 14:00, corte adulto com Pedro.');
  assert.equal(m.bvMTextoDe({ tipo: 'lembrete_hora', inicio: '2026-11-22T14:00:00', dados: {} }, textos), 'Oi! Às 14:00.');
  const cfg = { textos, user_id: '234', wid: '159', retentativas_min: [1, 5, 15] };
  const linha = (o) => ({ id: 1, tipo: 'lembrete_hora', situacao: 'pendente', previsto_para: '2026-11-22T16:00:00.000Z', inicio: '2026-11-22T14:00:00', dados: { nome: 'Paulo', servico: 'corte', barbeiro: 'Pedro' }, canal_id: null, contato_id: 7, telefone: '+5511967296849', contato_canal_id: 236429, ticket_id: 172345, ...o });
  // criar: payload medido na API (fuso de SP, userId do agente, sem abrir ticket)
  let [a] = m.bvMSincPlano([linha()], agora, cfg);
  assert.equal(a.acao, 'criar');
  assert.deepEqual(a.req, { m: 'POST', path: '/api/schedules', body: { body: 'Oi, Paulo! Às 14:00.', sendAt: '2026-11-22T13:00', contactId: '236429', userId: '234', openTicket: '0', queueId: '0', whatsappId: '159', repetir: '0', repetirTodo: '0', quantasVezes: '0' } });
  assert.deepEqual(m.bvMSincResultado(a, 200, { id: 2423 }, 0, cfg, agora), { id: 1, canal_id: '2423', canal_previsto_para: '2026-11-22T16:00:00.000Z', canal_texto: 'Oi, Paulo! Às 14:00.' });
  // ja sincronizado e igual: nenhuma chamada; mudou o horario (remarcou): PUT, nunca apagar e criar
  const sinc = { canal_id: '2423', canal_previsto_para: '2026-11-22T16:00:00.000Z', canal_texto: 'Oi, Paulo! Às 14:00.' };
  assert.equal(m.bvMSincPlano([linha(sinc)], agora, cfg)[0].acao, 'nada');
  [a] = m.bvMSincPlano([linha({ ...sinc, previsto_para: '2026-11-22T17:00:00.000Z', inicio: '2026-11-22T15:00:00' })], agora, cfg);
  assert.deepEqual([a.acao, a.req.m, a.req.path, a.req.body], ['atualizar', 'PUT', '/api/schedules/2423', { body: 'Oi, Paulo! Às 15:00.', sendAt: '2026-11-22 14:00' }]);
  assert.equal(m.bvMSincResultado(a, 404, {}, 0, cfg, agora).limpar_canal, true); // apagado na tela: recria na proxima
  // cancelado: apaga no Chat Master; ja passou: so solta o id; horario chegou: marca enviada sem chamada
  [a] = m.bvMSincPlano([linha({ ...sinc, situacao: 'cancelada' })], agora, cfg);
  assert.deepEqual(a.req, { m: 'POST', path: '/api/schedules/delete', body: { scheduleId: '2423' } });
  assert.equal(m.bvMSincResultado(a, 200, { message: 'Schedule deleted' }, 0, cfg, agora).limpar_canal, true);
  assert.equal(m.bvMSincPlano([linha({ ...sinc, situacao: 'cancelada', previsto_para: '2026-11-20T11:00:00Z' })], agora, cfg)[0].acao, 'liberar');
  assert.equal(m.bvMSincPlano([linha({ ...sinc, previsto_para: '2026-11-20T11:59:00Z' })], agora, cfg)[0].acao, 'enviada');
  assert.equal(m.bvMSincPlano([linha({ previsto_para: '2026-11-20T12:01:00Z' })], agora, cfg)[0].acao, 'ja_passou'); // em cima da hora: nao cria
  // contato: busca pelo numero uma vez por contato na rodada; vazio = nao existe -> cria na proxima
  const semId = [linha({ contato_canal_id: null }), linha({ id: 2, tipo: 'lembrete_dia', previsto_para: '2026-11-21T17:00:00.000Z', contato_canal_id: null })];
  const pl = m.bvMSincPlano(semId, agora, cfg);
  assert.deepEqual(pl.map((x) => x.acao), ['buscar_contato', 'aguardar_contato']);
  assert.deepEqual(pl[0].req, { m: 'GET', path: '/api/contacts/single', body: { number: '5511967296849' } });
  assert.deepEqual(m.bvMSincResultado(pl[0], 200, { 236429: { id: 236429, name: 'P' } }, 0, cfg, agora), { id: 1, contato_id: 7, contato_canal_id: 236429 });
  assert.equal(m.bvMSincResultado(pl[0], 200, {}, 0, cfg, agora).contato_canal_id, 0);
  [a] = m.bvMSincPlano([linha({ contato_canal_id: 0 })], agora, cfg);
  assert.deepEqual(a.req, { m: 'POST', path: '/api/contacts', body: { name: 'Paulo', number: '5511967296849' } });
  assert.equal(m.bvMSincPlano([linha({ contato_canal_id: null, telefone: '123@lid' })], agora, cfg)[0].acao, 'sem_contato');
  // criar contato: id vem em existingContact (ja existia) ou direto; 2xx sem id = falha visivel (nunca repete em silencio)
  assert.equal(m.bvMSincResultado(a, 200, { alreadyExists: true, existingContact: { id: 236429 } }, 0, cfg, agora).contato_canal_id, 236429);
  assert.equal(m.bvMSincResultado(a, 200, { id: 9001 }, 0, cfg, agora).contato_canal_id, 9001);
  const sid = m.bvMSincResultado(a, 200, { message: 'ok' }, 0, cfg, agora);
  assert.deepEqual([sid.falhou, sid.code], [true, 'SEM_ID']);
  // contato sem ticket (cliente do balcao): ticket atrelado antes do lembrete, uma vez por contato
  // ticket: antes de criar, verifica se ja existe um nesta conexao (owner, 2026-11-15)
  const tk = m.bvMSincPlano([linha({ ticket_id: null }), linha({ id: 2, tipo: 'lembrete_dia', previsto_para: '2026-11-21T17:00:00.000Z', ticket_id: null })], agora, cfg);
  assert.deepEqual(tk.map((x) => x.acao), ['buscar_ticket', 'aguardar_contato']);
  assert.deepEqual(tk[0].req, { m: 'GET', path: '/api/contacts/alltickets', body: { number: '5511967296849' } });
  assert.equal(m.bvMSincResultado(tk[0], 200, [{ id: 99, whatsappId: 145 }, { id: 172345, whatsappId: 159, status: 'closed' }], 0, cfg, agora).ticket_id, 172345);
  assert.equal(m.bvMSincResultado(tk[0], 200, [{ id: 99, whatsappId: 145 }], 0, cfg, agora).ticket_id, 0); // so de outra conexao: cria
  assert.equal(m.bvMSincResultado(tk[0], 404, { error: 'ERR_NO_CONTACT_FOUND' }, 0, cfg, agora).falhou, true);
  const ct = m.bvMSincPlano([linha({ ticket_id: 0 })], agora, cfg)[0];
  assert.deepEqual(ct.req, { m: 'POST', path: '/api/tickets/createTicketAPI', body: { contactId: 236429 } });
  assert.deepEqual(m.bvMSincResultado(ct, 200, { id: 172345, status: 'pending' }, 0, cfg, agora), { id: 1, contato_id: 7, ticket_id: 172345, ticket_encerrar: true });
  // ticket criado por nos: encerra antes do lembrete (owner, 2026-11-15); o que ja existia nao e tocado
  const enc = m.bvMSincPlano([linha({ ticket_id: 172345, ticket_encerrar: true })], agora, cfg)[0];
  assert.deepEqual(enc.req, { m: 'POST', path: '/api/tickets/updateAPI', body: { ticketId: '172345', status: 'closed' } });
  assert.deepEqual(m.bvMSincResultado(enc, 200, {}, 0, cfg, agora), { id: 1, contato_id: 7, ticket_encerrar: false });
  assert.equal(m.bvMSincPlano([linha({ ticket_id: 172345, ticket_encerrar: false })], agora, cfg)[0].acao, 'criar');
  assert.equal(m.bvMSincResultado(ct, 200, {}, 0, cfg, agora).code, 'SEM_ID');
  // falha: retentativa e, esgotada, falhou; sem resposta na criacao = incerto (nao recria)
  [a] = m.bvMSincPlano([linha()], agora, cfg);
  let f = m.bvMSincResultado(a, 500, null, 0, cfg, agora);
  assert.deepEqual([f.situacao, f.tentativas, f.proxima], ['pendente', 1, '2026-11-20T12:01:00.000Z']);
  assert.deepEqual([m.bvMSincResultado(a, 500, null, 3, cfg, agora).situacao, m.bvMSincResultado(a, 0, null, 0, cfg, agora).motivo], ['falhou', 'incerto']);
  const ap = m.bvMSincPlano([linha({ ...sinc, situacao: 'cancelada' })], agora, cfg)[0];
  assert.equal(m.bvMSincResultado(ap, 500, null, 0, cfg, agora).situacao, null); // apagar que falha mantem a linha cancelada
}
console.log('mensagens.test.js lembretes chatmaster ok');

// Nome em maiusculas na Graces (owner, 2026-11-15): o agente escreve normal
{
  const m = require('../workflows/shared/mensagens.js');
  assert.equal(m.bvMNomeProprio('GABRIEL'), 'Gabriel');
  assert.equal(m.bvMNomeProprio('joão'), 'João');
  assert.equal(m.bvMNomeProprio('ÉRICO SILVA'), 'Érico Silva');
  assert.equal(m.bvMNomeProprio('McDonald'), 'McDonald');
  assert.equal(m.bvMTextoDe({ tipo: 'lembrete_hora', inicio: '2026-11-22T12:00:00', dados: { nome: 'GABRIEL SANTOS', servico: 'corte', barbeiro: 'Black' } }, { lembrete_hora: 'Oi, {nome}! Às {hora}.' }), 'Oi, Gabriel! Às 12:00.');
}
console.log('mensagens.test.js nome normal ok');

// Postgres -> n8n: bigint chega como texto. '0' tem de valer como 0 (contato/ticket verificado e inexistente), senao a fila trava
{
  const m = require('../workflows/shared/mensagens.js');
  const cfg = { textos: { lembrete_hora: 'Oi, {nome}!' }, user_id: '234', wid: '159', retentativas_min: [1, 5, 15] };
  const l = (o) => ({ id: '1', tipo: 'lembrete_hora', situacao: 'pendente', previsto_para: '2026-11-22T16:00:00.000Z', inicio: '2026-11-22T14:00:00', dados: {}, canal_id: null, contato_id: '7', telefone: '5511967296849', ...o });
  const ag = '2026-11-20T12:00:00Z';
  assert.equal(m.bvMSincPlano([l({ contato_canal_id: '0', ticket_id: null })], ag, cfg)[0].acao, 'criar_contato');
  assert.equal(m.bvMSincPlano([l({ contato_canal_id: '138449', ticket_id: '0' })], ag, cfg)[0].acao, 'criar_ticket');
  assert.equal(m.bvMSincPlano([l({ contato_canal_id: '138449', ticket_id: null })], ag, cfg)[0].acao, 'buscar_ticket');
  assert.equal(m.bvMSincPlano([l({ contato_canal_id: '138449', ticket_id: '125529', ticket_encerrar: true })], ag, cfg)[0].acao, 'encerrar_ticket');
  assert.equal(m.bvMSincPlano([l({ contato_canal_id: '138449', ticket_id: '125529', ticket_encerrar: false })], ag, cfg)[0].acao, 'criar');
  assert.equal(m.bvMSincPlano([l({ contato_canal_id: null, ticket_id: null })], ag, cfg)[0].acao, 'buscar_contato');
}
console.log('mensagens.test.js bigint como texto ok');

// Confirmacao com etiquetas no ticket (owner, 2026-11-15): Confirmado 534 / Cancelado 535; sai no horario marcado
{
  const m = require('../workflows/shared/mensagens.js');
  const cfg = { textos: { lembrete_dia: 'x' }, user_id: '234', wid: '159', retentativas_min: [1, 5, 15], etiquetas: { confirmado: 534, cancelado: 535 } };
  const agora = '2026-11-21T12:00:00Z'; // 09:00 em SP
  const l = (o) => ({ id: '5', tipo: 'lembrete_dia', situacao: 'enviada', previsto_para: '2026-11-21T11:00:00Z', inicio: '2026-11-22T14:00:00', dados: {}, canal_id: '2424', contato_id: '7', telefone: '5511967296849', contato_canal_id: '236429', ticket_id: '172345', resposta: 'confirmada', etiqueta_id: null, ...o });
  let [a] = m.bvMSincPlano([l()], agora, cfg);
  assert.deepEqual([a.acao, a.req], ['etiquetar', { m: 'POST', path: '/api/tickets/172345/tags', body: { tags: [534] } }]);
  assert.deepEqual(m.bvMSincResultado(a, 200, {}, 0, cfg, agora), { id: '5', etiqueta_id: 534, etiqueta_ticket_id: 172345 });
  assert.equal(m.bvMSincPlano([l({ resposta: 'recusada' })], agora, cfg)[0].req.body.tags[0], 535);
  // falha ao etiquetar: retenta sem mexer na situacao do lembrete
  const f = m.bvMSincResultado(a, 500, null, 0, cfg, agora);
  assert.deepEqual([f.falhou, f.situacao, f.tentativas], [true, null, 1]);
  // sem ticket, sem etiqueta configurada (TESTE) ou horario ja passou: marca nao aplicavel, sem chamada
  for (const o of [{ ticket_id: null }, { inicio: '2026-11-21T08:00:00' }]) assert.equal(m.bvMSincPlano([l(o)], agora, cfg)[0].acao, 'sem_etiqueta');
  assert.equal(m.bvMSincPlano([l()], agora, { ...cfg, etiquetas: { confirmado: 0, cancelado: 0 } })[0].acao, 'sem_etiqueta');
  assert.deepEqual(m.bvMSincResultado({ id: '5', acao: 'sem_etiqueta' }, 200, null, 0, cfg, agora), { id: '5', etiqueta_id: 0 });
  // no horario marcado: tira a etiqueta do ticket em que foi posta (404 = ja nao existe: da por tirada)
  [a] = m.bvMSincPlano([l({ inicio: '2026-11-21T09:00:00', etiqueta_id: '534', etiqueta_ticket_id: '172345' })], agora, cfg);
  assert.deepEqual([a.acao, a.req], ['desetiquetar', { m: 'DELETE', path: '/api/tickets/172345/tags', body: { tags: [534] } }]);
  assert.deepEqual(m.bvMSincResultado(a, 200, {}, 0, cfg, agora), { id: '5', etiqueta_removida: true });
  assert.equal(m.bvMSincResultado(a, 404, {}, 0, cfg, agora).etiqueta_removida, true);
  // antes do horario, com etiqueta posta: nada a fazer (nem e selecionada), e ja tirada nao volta
  assert.notEqual(m.bvMSincPlano([l({ etiqueta_id: '534', etiqueta_ticket_id: '172345', etiqueta_removida_em: '2026-11-22T17:00:00Z', inicio: '2026-11-21T09:00:00' })], agora, cfg)[0].acao, 'desetiquetar');
}
console.log('mensagens.test.js etiquetas da confirmacao ok');

// Retomada de agendamento abandonado (owner, 2026-11-16)
{
  const m = require('../workflows/shared/mensagens.js');
  const cfg = { wid: '159', fila: '107', textos: { retomada_confirmar: 'Oi, {nome}! Ficou faltando só confirmar {resumo}. Ainda quer esse horário?', retomada_continuar: 'Oi, {nome}! A gente não terminou de marcar {servico}. Quer continuar de onde paramos?' } };
  const l = (o) => ({ contato_id: 1, telefone: '5511999998888', nome: 'Daniel', servico: 'corte adulto', proposta: null, ...o });
  assert.equal(m.bvMRetomada(l(), cfg).texto, 'Oi, Daniel! A gente não terminou de marcar o seu corte adulto. Quer continuar de onde paramos?');
  assert.equal(m.bvMRetomada(l({ nome: null, servico: null }), cfg).texto, 'Oi! A gente não terminou de marcar o seu horário. Quer continuar de onde paramos?');
  const conj = { acao: 'agendar_conjunto', dados: { itens: [{ servico: 'corte adulto', barbeiro: 'Kiel', data: '2026-11-20', hora: '10:00' }, { servico: 'barba design', barbeiro: 'Kiel', data: '2026-11-20', hora: '10:40' }] } };
  assert.equal(m.bvMRetomada(l({ proposta: conj }), cfg).texto, 'Oi, Daniel! Ficou faltando só confirmar corte adulto com Kiel em 20/11 às 10:00 + barba design com Kiel em 20/11 às 10:40. Ainda quer esse horário?');
  const r = m.bvMRetomada(l({ telefone: '123@lid', proposta: { acao: 'reagendar', dados: { servico: 'corte adulto', barbeiro: 'Kiel', data: '2026-11-17', hora: '12:00' } } }), cfg);
  assert.match(r.texto, /confirmar a remarcação do seu corte adulto com Kiel em 17\/11 às 12:00/);
  assert.deepEqual([r.req.path, r.req.body.number, r.req.body.queueId, r.req.body.openTicket], ['/api/messages/whatsmeow/sendTextPROLid', '123@lid', '107', '0']);
}
console.log('mensagens.test.js retomada ok');

// Um lembrete so para quem tem mais de um servico no mesmo dia (item 11, owner 2026-11-16)
{
  const m = require('../workflows/shared/mensagens.js');
  const textos = { lembrete_dia: 'Oi, {nome}! Seu {servico} com {barbeiro} amanhã, às {hora}.', lembrete_hora: 'x' };
  const cfg = { textos, user_id: '234', wid: '159', retentativas_min: [1, 5, 15] };
  const agora = '2026-11-20T12:00:00Z';
  const G = [{ id: 1, servico: 'corte adulto', barbeiro: 'Kiel' }, { id: 2, servico: 'barba design', barbeiro: 'Kiel ' }];
  const linha = (o) => ({ id: '1', tipo: 'lembrete_dia', situacao: 'pendente', previsto_para: '2026-11-21T17:00:00.000Z', inicio: '2026-11-22T14:00:00', dados: { nome: 'PAULO', servico: 'corte adulto', barbeiro: 'Kiel' },
    canal_id: null, contato_id: 7, telefone: '+5511967296849', contato_canal_id: 236429, ticket_id: 172345, grupo: G, ...o });
  // lider: um agendamento no Chat Master citando os dois servicos
  let [a, b] = m.bvMSincPlano([linha(), linha({ id: '2', previsto_para: '2026-11-21T17:40:00.000Z', inicio: '2026-11-22T14:40:00', dados: { nome: 'PAULO', servico: 'barba design', barbeiro: 'Kiel' } })], agora, cfg);
  assert.equal(a.acao, 'criar');
  assert.equal(a.req.body.body, 'Oi, Paulo! Seu corte adulto e barba design com Kiel amanhã, às 14:00.');
  // seguidora: nenhuma chamada; reavaliada em ate 30 min e encerrada como `junto` no horario dela
  assert.deepEqual([b.acao, b.fim, b.req], ['junto', false, undefined]);
  assert.deepEqual(m.bvMSincResultado(b, 200, null, 0, cfg, agora), { id: '2', proxima: '2026-11-20T12:30:00.000Z' });
  assert.deepEqual(m.bvMSincResultado({ ...b, previsto_para: '2026-11-20T12:10:00.000Z' }, 200, null, 0, cfg, agora), { id: '2', proxima: '2026-11-20T12:10:00.000Z' });
  [b] = m.bvMSincPlano([linha({ id: '2' })], '2026-11-21T17:01:00Z', cfg);
  assert.deepEqual(m.bvMSincResultado(b, 200, null, 0, cfg, agora), { id: '2', situacao: 'cancelada', motivo: 'junto' });
  // seguidora que ja tinha agendamento no Chat Master (lembretes criados antes desta regra): apaga
  [b] = m.bvMSincPlano([linha({ id: '2', canal_id: '900' })], agora, cfg);
  assert.deepEqual([b.acao, b.req], ['apagar', { m: 'POST', path: '/api/schedules/delete', body: { scheduleId: '900' } }]);
  // lider ja agendada com o texto de um servico so: atualiza o texto (PUT), sem recriar
  [a] = m.bvMSincPlano([linha({ canal_id: '899', canal_previsto_para: '2026-11-21T17:00:00.000Z', canal_texto: 'Oi, Paulo! Seu corte adulto com Kiel amanhã, às 14:00.' })], agora, cfg);
  assert.deepEqual([a.acao, a.req.body.body], ['atualizar', 'Oi, Paulo! Seu corte adulto e barba design com Kiel amanhã, às 14:00.']);
  // barbeiros diferentes (pai e filho): cada servico com o seu barbeiro; tres servicos: virgula e "e"
  assert.deepEqual(m.bvMServicos(linha({ grupo: [G[0], { id: 2, servico: 'Corte Infantil', barbeiro: 'Rodrigo' }] })), { servico: 'corte adulto com Kiel e Corte Infantil', barbeiro: 'Rodrigo' });
  assert.deepEqual(m.bvMServicos(linha({ grupo: [...G, { id: 3, servico: 'Pezinho', barbeiro: 'Kiel' }] })), { servico: 'corte adulto, barba design e Pezinho', barbeiro: 'Kiel' });
  // sem grupo, grupo de um so ou linha fora do grupo (servico bem mais tarde): lembrete proprio, como antes
  for (const g of [undefined, null, [G[0]], [{ id: 8 }, { id: 9 }]]) {
    assert.equal(m.bvMSeguidora(linha({ id: '2', grupo: g })), false);
    assert.deepEqual(m.bvMServicos(linha({ grupo: g })), { servico: 'corte adulto', barbeiro: 'Kiel' });
  }
  // lider cancelada sai do grupo na consulta: a seguidora vira lider e manda o proprio lembrete
  [b] = m.bvMSincPlano([linha({ id: '2', grupo: [G[1]], dados: { nome: 'Paulo', servico: 'barba design', barbeiro: 'Kiel' } })], agora, cfg);
  assert.deepEqual([b.acao, b.req.body.body], ['criar', 'Oi, Paulo! Seu barba design com Kiel amanhã, às 14:00.']);
}
console.log('mensagens.test.js lembrete unico por grupo ok');

{ // Etapa 5 (atendimentos de 17/11 e decisao do owner de 18/11)
  const m = require('../workflows/shared/mensagens.js');
  // recusa de presenca: a decisao vai em lista e deixa a proposta de cancelar e a oferta prontas
  const row = { id: 9, inicio: '2026-11-19T15:00:00', dados: { servico: 'corte adulto', barbeiro: 'Pedro', recorrente: true }, telefone: '+5511999998888' };
  const d = m.bvMDecisaoCancelar(row, 'ag-1');
  assert.deepEqual(d.dados, { idAgenda: 'ag-1', horaInicio: '2026-11-19T15:00:00', recorrente: true, servico: 'corte adulto', resumo: 'Cancelar corte adulto em quinta-feira (19/11) às 15:00' });
  assert.deepEqual(d.opcoes, { tipo: 'decisao_cancelamento', itens: [{ id: '1', rotulo: 'Remarcar', valor: 'remarcar' }, { id: '2', rotulo: 'Cancelar mesmo', valor: 'cancelar' }] });
  assert.ok(!JSON.stringify(d).includes('Pedro')); // o resumo nao leva o barbeiro (pode ser um que o agente nunca mostra)
  assert.equal(m.bvMDecisaoCancelar({ ...row, graces_cliente_id: 'c9' }, 'ag-1').dados.idCliente, 'c9'); // 24/11: a fase 2 do cancelar le a agenda desse cliente antes de apagar
  assert.equal(m.bvMDecisaoCancelar(row, null), null);
  assert.equal(m.bvMDecisaoCancelar({ dados: {} }, 'ag-1'), null);
  const l = m.bvMListaDecisao({ texto: 'Você prefere remarcar ou cancelar mesmo?' }, '+55 11 99999-8888', { wid: '145', fila: '7', botao: 'Responder', topo: 'Opções' });
  assert.equal(l.path, '/api/messages/whatsmeow/sendListPRO');
  assert.deepEqual(l.body.body.List, [{ RowId: '1', title: 'Remarcar', desc: '' }, { RowId: '2', title: 'Cancelar mesmo', desc: '' }]);
  assert.deepEqual([l.body.number, l.body.whatsappId, l.body.queueId], ['5511999998888', '145', '7']);
  // lembrete desatualizado: com a leitura do cliente, diz o que esta marcado agora
  const textos = { confirmacao_desatualizada: 'Esse horário não está mais valendo.', confirmacao_desatualizada_atual: 'Desatualizado. Agora: {lista}.', confirmacao_desatualizada_sem: 'Desatualizado e sem horário marcado.' };
  const corpo = [{ idAgenda: 'x', horaInicio: '2026-11-17T20:40:00', descricaoServico: 'corte com maquina', idStatusAgenda: 1 }];
  const c1 = m.bvMConfConferir({ status: 200, body: corpo }, { graces_agendamento_id: 'velho', inicio: '2026-11-17T13:20:00', graces_cliente_id: 'c1' }, true);
  assert.deepEqual(c1, { code: 'desatualizada', status: 200, atual: [{ servico: 'corte com maquina', inicio: '2026-11-17T20:40:00' }] });
  assert.equal(m.bvMConfTexto('desatualizada', {}, 'id', textos, 2, c1.atual), 'Desatualizado. Agora: corte com maquina, terça-feira (17/11) às 20:40.');
  assert.equal(m.bvMConfTexto('desatualizada', {}, 'id', textos, 2, []), 'Desatualizado e sem horário marcado.');
  assert.equal(m.bvMConfTexto('desatualizada', {}, 'id', textos, 2, null), 'Esse horário não está mais valendo.'); // sem leitura do cliente: texto antigo
  assert.equal(m.bvMConfTexto('desatualizada', {}, 'id', textos, 2), 'Esse horário não está mais valendo.');
  // PROD 17/11: a ocorrencia da serie mudou de idAgenda; o agendamento do proprio cliente no mesmo inicio, ja confirmado, vale
  const outroId = [{ idAgenda: 'novo', horaInicio: '2026-11-17T13:20:00', descricaoServico: 'corte com maquina', idStatusAgenda: 3 }];
  const linha = { graces_agendamento_id: 'velho', inicio: '2026-11-17T13:20:00', graces_cliente_id: 'c1' };
  assert.equal(m.bvMConfConferir({ status: 200, body: outroId }, linha, true).code, 'confirmada');
  assert.equal(m.bvMConfConferir({ status: 200, body: outroId }, linha, false).code, 'desatualizada'); // recusa: so com o id do lembrete
  assert.equal(m.bvMConfConferir({ status: 200, body: outroId }, { ...linha, graces_cliente_id: null }, true).code, 'desatualizada'); // leitura do dia: pode ser de outro cliente
  assert.equal(m.bvMConfConferir({ status: 200, body: [{ ...outroId[0], idStatusAgenda: 2 }] }, linha, true).code, 'desatualizada'); // ainda nao confirmado na agenda
  // leitura do dia inteiro (sem idCliente): nao lista os horarios de outros clientes
  assert.equal(m.bvMConfConferir({ status: 200, body: corpo }, { graces_agendamento_id: 'velho', inicio: '2026-11-17T13:20:00' }, true).atual, null);
  // contexto do agente depois da recusa: a decisao ja foi em lista
  const ctx = m.bvMPromptConfirmacoes({ confirmacoes: [], pedido: { confirmacao_recusada: { idAgenda: 'ag-1', em: new Date().toISOString() } } }, Date.now(), 120, String);
  assert.match(ctx, /a decisão "remarcar ou cancelar\?" já foi enviada a ele em lista: não a repita/);
  console.log('mensagens.test.js recusa em lista e lembrete desatualizado ok');
}

{ // Vigia da fila humana (23/11): o aviso de "sem resposta" nao sai quando a equipe respondeu e o cliente so agradeceu depois
  const { bvMSoAgradeceu: G, bvMAvisaFila: A } = require('../workflows/shared/mensagens.js');
  for (const t of ['Obrigado!', 'Ok obrigado', 'valeuu 🙏🏻', 'Beleza', 'ok', 'Okk', 'Muito obrigada, até amanhã', 'Show, valeu', '👍', 'Tá bom, obrigado', 'Eu que agradeço', 'kkkk valeu', 'Combinado', 'Perfeito. Obrigado pela atenção']) assert.equal(G([t]), true, t);
  // pergunta, pedido, cumprimento, "sim" sozinho, pontuacao e texto longo nao sao agradecimento: o cliente ficou esperando
  for (const t of ['Obrigado, mas e amanhã?', 'Ótimo! Pode ser 17:20', 'Boa tarde', 'Sim', 'Isso mesmo', 'E antes das 9h?', '...', '', 'Conseguem agendar por favor', 'ok ' + 'obrigado '.repeat(12), 'Pode ser esse horário das 14h', 'Não', '?']) assert.equal(G([t]), false, t);
  // revisoes de 23/11: numero ou horario e escolha; pergunta sem "?"; emoji que nao e de fecho; outro alfabeto; "entendi nada"
  for (const t of ['Beleza, 15:30', 'ok 2', 'Obrigado 17:20', 'Ok, e amanhã', 'Legal, e o de amanhã', 'Ok, por que', 'certo e a de amanha', '😡', '!!! 👎', 'ok 🤔', 'ok спасибо', 'Entendi nada', 'Não entendi', 'Tá bom']) assert.equal(G([t]), false, t);
  for (const t of ['Obrigado, boa tarde', 'Valeu, irmão', 'Obrigado pessoal', 'Brigadão', 'Fechou', 'Então tá, obrigado', 'Muito obrigado pelo atendimento', '❤️', '🙏🏻', 'Tranquilo', 'flw']) assert.equal(G([t]), true, t);
  assert.equal(G(['Ok', 'Obrigado!']), true);
  assert.equal(G(['Obrigado', 'Tem horário amanhã']), false); // uma mensagem que pede resposta basta
  assert.equal(G([]), false);
  assert.equal(G(null), false);
  assert.equal(G(Array(7).fill('ok')), false); // a consulta manda no maximo 7: acima de 6 pode haver mensagem anterior nao lida
  // linha do encerramento: so cala com a equipe tendo respondido E o cliente so agradecendo; o resto avisa como antes
  assert.equal(A({ equipe_respondeu: true, depois: '["Obrigado!"]' }), false);
  assert.equal(A({ equipe_respondeu: true, depois: ['Ok obrigado'] }), false);
  assert.equal(A({ equipe_respondeu: false, depois: '["Obrigado!"]' }), true); // a equipe nunca respondeu
  assert.equal(A({ equipe_respondeu: true, depois: '["Beleza","?"]' }), true); // midia, pergunta ou texto longo chegam como "?"
  assert.equal(A({ equipe_respondeu: true, depois: '[]' }), true);
  assert.equal(A({ equipe_respondeu: true, depois: 'x' }), true); // JSON invalido: avisa
  assert.equal(A({ equipe_respondeu: 'true', depois: '["ok"]' }), true); // so o booleano do banco vale
  assert.equal(A({ contato_id: 1, telefone: '+55' }), true); // turno que estourou o tempo (sem os campos): sempre avisa
  console.log('mensagens.test.js aviso do vigia ok');
}

{ // Agendamento por pacote: o servico vem em servicoPacote; sobe para o formato do avulso num lugar so (agente e lembretes)
  const { bvMComServico, bvMAgendaDe } = require('../workflows/shared/mensagens.js');
  const p = { idAgenda: 'a7', horaInicio: '2026-12-01T10:00:00', servicoPacote: { idServico: 'sp', descricaoServico: 'corte adulto' } };
  assert.deepEqual(bvMComServico(p), { ...p, idServico: 'sp', descricaoServico: 'corte adulto', pacote: true });
  const av = { idAgenda: 'a8', idServico: 's2', descricaoServico: 'barba', servicoPacote: null };
  assert.equal(bvMComServico(av), av); // avulso (servicoPacote nulo ou ausente) fica como veio
  const jaTem = { idAgenda: 'a9', idServico: 's3', servicoPacote: { idServico: 'outro', descricaoServico: 'x' } };
  assert.deepEqual(bvMComServico(jaTem), { ...jaTem, descricaoServico: 'x', pacote: true }); // quem ja traz idServico fica com o dele, mas e marcado como pacote (24/11: a marca decide quem cancela)
  for (const x of [null, undefined, 'x', 7, { servicoPacote: 'texto' }, { idAgenda: 'a', servicoPacote: {} }, { idAgenda: 'a', servicoPacote: [] }]) assert.equal(bvMComServico(x), x); // sem idServico dentro, nao ha o que subir
  assert.deepEqual(bvMAgendaDe([p, av]).map((a) => [a.idServico, a.descricaoServico, !!a.pacote]), [['sp', 'corte adulto', true], ['s2', 'barba', false]]);
  // /agenda/completa: o item por pacote ja vem com nomeServico e sem servicoPacote; segue igual, com o barbeiro do grupo
  assert.deepEqual(bvMAgendaDe([{ idProfissional: 'b1', apelido: 'Kiel ', agendamentos: [{ idAgenda: 'a1', nomeServico: 'corte adulto' }] }]), [{ idAgenda: 'a1', nomeServico: 'corte adulto', idProfissional: 'b1', profissional: 'Kiel' }]);
  console.log('mensagens.test.js agendamento por pacote ok');
}

// Aviso a equipe na transferencia (owner, 2026-11-24): um texto por numero da equipe, com o nome e o telefone do cliente
{
  const m = require('../workflows/shared/mensagens.js');
  const cfgA = { wid: '159', fila: '5' }, T = 'Atendimento passado para a equipe pelo agente. Cliente: {nome}. WhatsApp: {telefone}';
  const av = m.bvMAvisoEquipe({ nome: 'JOAO', telefone: '+55 11 98888-7777' }, ['5511971634416', '55 (11) 99516-4884', '5511971634416', '123', '5511988887777', null], T, cfgA);
  assert.deepEqual(av.map((a) => a.destino), ['5511971634416', '5511995164884']); // sem repetido, sem invalido e sem o proprio cliente
  assert.deepEqual(av[0].req, { path: '/api/messages/send', body: { number: '5511971634416', openTicket: '0', queueId: '5', whatsappId: '159', body: 'Atendimento passado para a equipe pelo agente. Cliente: Joao. WhatsApp: +5511988887777' } });
  assert.match(m.bvMAvisoEquipe({ telefone: '+5511988887777' }, ['5511971634416'], T, cfgA)[0].req.body.body, /Cliente: sem nome no cadastro\. WhatsApp: \+5511988887777/);
  // o nome nao carrega formatacao do WhatsApp nem quebra de linha, e tem teto
  const feio = m.bvMAvisoEquipe({ nome: '*Ana*\n_Maria_ ' + 'x'.repeat(200), telefone: '+5511988887777' }, ['5511971634416'], '{nome}', cfgA)[0].req.body.body;
  assert.ok(!/[*_\n]/.test(feio) && feio.length <= 60, feio);
  for (const [d, nums, t] of [[{ nome: 'x', telefone: '' }, ['5511971634416'], T], [{ nome: 'x', telefone: '+5511988887777' }, [], T], [{ nome: 'x', telefone: '+5511988887777' }, null, T], [{ nome: 'x', telefone: '+5511988887777' }, ['5511971634416'], ''], [null, ['5511971634416'], T]]) {
    assert.deepEqual(m.bvMAvisoEquipe(d, nums, t, cfgA), []);
  }
  console.log('mensagens.test.js aviso a equipe ok');
}
