const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { bvNormalizar, deveEntregar, consolidar } = require('../workflows/shared/rajada.js');
const fx = (n) => JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/chatmaster', `evento-${n}.json`), 'utf8'));

let r = bvNormalizar(fx('02'));
assert.equal(r.status, 'aceita'); assert.equal(r.msg.tipo, 'texto'); assert.equal(r.msg.midiaUrl, null);
assert.equal(r.msg.ticketId, 125529); // chamadoId do webhook alimenta o handoff (updateAPI)
r = bvNormalizar(fx('13'));
assert.equal(r.status, 'aceita'); assert.equal(r.msg.tipo, 'imagem'); assert.ok(r.msg.midiaUrl && r.msg.idCanal);
r = bvNormalizar(fx('17'));
assert.equal(r.status, 'aceita'); assert.equal(r.msg.tipo, 'audio');
for (const n of ['01', '04', '05']) assert.equal(bvNormalizar(fx(n)).status, 'descartada', n);
const g = fx('02'); g.body.isGroup = true;
assert.equal(bvNormalizar(g).motivo, 'grupo');
const l = fx('02'); l.body.fromMe = true;
assert.equal(bvNormalizar(l).motivo, 'enviada_pela_loja');
const t = fx('02'); t.body.mensagem = [{ type: 'sticker' }];
assert.equal(bvNormalizar(t).motivo, 'tipo_nao_suportado');
for (const ruim of [null, {}, { body: [] }, { body: { acao: 'start', mensagem: [{}] } }]) {
  assert.ok(['invalida', 'descartada'].includes(bvNormalizar(ruim).status));
}
assert.equal(bvNormalizar({ body: { acao: 'start', mensagem: [{}] } }).status, 'invalida');
assert.equal(bvNormalizar(fx('02'), { maxKb: 1 }).motivo, 'acima_do_limite');

// FR-002/FR-003: audio real (evento-20), imagem (13/15) e mutados
r = bvNormalizar(fx('20')).msg;
assert.equal(r.tipo, 'audio'); assert.equal(r.midiaMime, 'audio/ogg; codecs=opus'); assert.equal(r.midiaSegundos, 5); assert.equal(r.midiaBytes, 9694);
assert.equal(r.idCanal, r.midiaUrl); // dedupe por fileUrl
r = bvNormalizar(fx('13')).msg;
assert.equal(r.tipo, 'imagem'); assert.equal(r.midiaBytes, 202663); assert.equal(r.midiaSegundos, null);
assert.equal(bvNormalizar(fx('15')).msg.tipo, 'imagem');
assert.equal(bvNormalizar(fx('17')).msg.midiaSegundos, 2);
const vid = fx('20'); vid.body.mensagem = [{ type: 'video', fileUrl: 'https://h/x.mp4', fileMimeType: 'video/mp4' }];
assert.equal(bvNormalizar(vid).msg.tipo, 'outro'); assert.equal(bvNormalizar(vid).msg.midiaBytes, null);
const ext = fx('20'); ext.body.mensagem[0].fileUrl = 'https://object.ce1.eveo.com.br/x/y.mp3'; ext.body.mensagem[0].fileMimeType = 'audio/ogg';
assert.equal(bvNormalizar(ext).msg.midiaMime, 'audio/ogg'); // formato pelo MIME, nunca pela extensao .mp3
for (const k of ['fromMe', 'isGroup']) { const e = fx('20'); e.body[k] = true; assert.equal(bvNormalizar(e).status, 'descartada', k); }

// deveEntregar: ultima vence; teto forca a entrega.
assert.equal(deveEntregar({ ultimaId: 5, minhaId: '5', maisAntigaMs: 0, agoraMs: 8000, tetoS: 60 }), true);
assert.equal(deveEntregar({ ultimaId: 6, minhaId: 5, maisAntigaMs: 0, agoraMs: 8000, tetoS: 60 }), false);
assert.equal(deveEntregar({ ultimaId: 6, minhaId: 5, maisAntigaMs: 0, agoraMs: 60000, tetoS: 60 }), true);

// consolidar: ordem de chegada, desempate por id.
const o = consolidar([
  { id: 3, criado_em: '2026-01-01T00:00:02Z' }, { id: 2, criado_em: '2026-01-01T00:00:01Z' }, { id: 1, criado_em: '2026-01-01T00:00:01Z' },
]);
assert.deepEqual(o.map((x) => x.id), [1, 2, 3]);
console.log('rajada.test.js ok');

// liberacao gradual (producao): lista vazia atende todos; com numeros, so eles (digitos comparados)
{
  const ev = fx('02');
  ev.body.sender = '5511967296849';
  assert.equal(bvNormalizar(ev, { liberados: [] }).status, 'aceita');
  assert.equal(bvNormalizar(ev, { liberados: ['+55 11 96729-6849'] }).status, 'aceita');
  const outro = bvNormalizar({ body: { ...ev.body, sender: '5511900000000' } }, { liberados: ['5511967296849'] });
  assert.deepEqual(outro, { status: 'descartada', motivo: 'nao_liberado' });
}

// Fila humana (owner, 2026-11-16): fila do evento e mensagem da equipe
{
  const r = require('../workflows/shared/rajada.js');
  const assert = require('assert');
  assert.deepEqual([r.bvFila({ queueId: 78 }), r.bvFila({ queueId: '106' }), r.bvFila({ queueId: 'null' }), r.bvFila({ queueId: null }), r.bvFila({})], [78, 106, null, null, null]);
  const ev = (o) => ({ acao: 'from_internal', fromMe: true, queueId: 106, sender: '5511999990000', mensagem: { id: 77, body: 'Oi, aqui é da equipe' }, ...o });
  assert.deepEqual(r.bvEquipe(ev(), 106, 'Vou passar você para a equipe'), { telefone: '5511999990000', fila: 106, id: '77', texto: 'Oi, aqui é da equipe', ticket: null });
  assert.equal(r.bvEquipe(ev({ chamadoId: 4321 }), 106, 'x').ticket, 4321); // o vigia encerra o ticket do evento da equipe
  // midia da equipe: o nome do arquivo nao entra no historico como fala (17/11); legenda de verdade fica
  const midia = (mediaType, body) => r.bvEquipe(ev({ mensagem: { id: 9, body, mediaType, mediaUrl: 'https://x/arquivo' } }), 106, 'x').texto;
  assert.equal(midia('audio', '0f3a9c2d-9981-4b11-89da-1a2b3c4d5e6f_1763391497.mp3'), '[áudio]');
  assert.equal(midia('image', 'foto_123.jpeg'), '[imagem]');
  assert.equal(midia('image', 'Olha o modelo que ele pediu'), '[imagem] Olha o modelo que ele pediu');
  assert.equal(midia('video', undefined), '[vídeo]');
  assert.equal(midia('application/pdf', 'tabela.pdf'), '[arquivo]');
  assert.equal(midia('image', 'WhatsApp Image 2026-11-17 at 10.30.12.jpeg'), '[imagem]'); // nome de arquivo com espaco
  assert.equal(midia('application/pdf', 'Tabela de preços 2026.pdf'), '[arquivo]');
  assert.equal(midia('image', 'www.barbearia.com.br'), '[imagem] www.barbearia.com.br'); // legenda com ponto nao e nome de arquivo
  assert.equal(r.bvEquipe(ev({ mensagem: { id: 9, body: 'Pode vir às 15h.', mediaType: 'conversation' } }), 106, 'x').texto, 'Pode vir às 15h.'); // texto: como antes
  assert.equal(r.bvEquipe(ev({ queueId: 107 }), 106, 'x'), null); // fila do agente: eco das mensagens dele
  assert.equal(r.bvEquipe(ev({ fromMe: false }), 106, 'x'), null); // mensagem do cliente
  assert.equal(r.bvEquipe(ev({ acao: 'start' }), 106, 'x'), null);
  assert.equal(r.bvEquipe(ev({ isGroup: true }), 106, 'x'), null);
  // o texto de encaminhamento do proprio agente chega como eco ja na fila humana: nao e resposta da equipe
  assert.equal(r.bvEquipe(ev({ mensagem: { id: 1, body: 'Entendi! Vou passar você para a equipe, tá?' } }), 106, 'Vou passar você para a equipe'), null);
  // mensagem digitada no aparelho da conexao (captura real na 145, 2026-11-23): o aviso `start` com fromMe e descartado e o
  // eco from_internal, com o chamado na fila humana, entra como mensagem da equipe
  const cel = fx('26'), aviso = fx('27');
  assert.deepEqual(bvNormalizar(aviso, {}), { status: 'descartada', motivo: 'enviada_pela_loja' });
  const eq = r.bvEquipe(cel.body, 78, 'texto do agente'); // o texto anonimizado da fixture e so 'x'
  assert.deepEqual([eq.fila, eq.id, eq.ticket, eq.telefone === cel.body.sender, !!eq.texto, cel.body.mensagem.fromApp, aviso.body.fromApp],
    [78, String(cel.body.mensagem.id), cel.body.chamadoId, true, true, true, true]);
  assert.equal(r.bvEquipe(cel.body, 106, 'texto do agente', cel.body.ticketData.userId), null); // fora da fila humana, com o chamado no usuario do agente: nao grava

  // Chamado assumido por um atendente (owner, 2026-11-25; medido em PROD: fila 107 do agente, `open`, usuario 233; agente 234)
  const td = (o) => ({ ticketData: { status: 'open', userId: 233, queueId: 107, ...o } });
  assert.deepEqual([r.bvAssumido(td(), 234), r.bvAssumido(td({ userId: 234 }), 234), r.bvAssumido(td({ userId: '234' }), 234), r.bvAssumido(td({ status: 'pending', userId: null }), 234),
    r.bvAssumido(td({ status: 'pending' }), 234), r.bvAssumido(td({ userId: null }), 234), r.bvAssumido({}, 234), r.bvAssumido(null, 234)], [true, false, false, false, false, false, false, false]);
  assert.deepEqual([r.bvFilaDe({ queueId: 107, ...td() }, 106, 234), r.bvFilaDe({ queueId: 107, ...td({ status: 'pending', userId: null }) }, 106, 234), r.bvFilaDe({ queueId: 106, ...td({ userId: 234 }) }, 106, 234),
    r.bvFilaDe({ queueId: 107, ...td() }, undefined, 234)], [106, 107, 106, 107]);
  // mensagem do cliente com o chamado assumido: a fila gravada e a humana (o agente cala e o vigia conta o prazo)
  const cli = (o) => { const e = fx('07'); Object.assign(e.body, { queueId: 107 }, o); return bvNormalizar(e, { filaHumana: 106, usuarioAgente: 234 }); };
  assert.deepEqual([cli(td()).msg.filaId, cli(td({ status: 'pending', userId: null })).msg.filaId, cli(td({ userId: 234 })).msg.filaId], [106, 107, 107]);
  // mensagem da equipe com o chamado assumido na fila do agente: entra como fala da equipe se foi gente que escreveu
  const as = (m, o) => r.bvEquipe(ev({ queueId: 107, ...td(o), mensagem: { id: 5, body: 'Qual valor?', ...m } }), 106, 'x', 234);
  assert.deepEqual(as({ userId: 233 }), { telefone: '5511999990000', fila: 106, id: '5', texto: 'Qual valor?', ticket: null }); // painel
  assert.equal(as({ fromApp: true }).fila, 106); // aparelho
  assert.equal(as({}), null); // eco de mensagem do agente (API: sem userId nem fromApp)
  assert.equal(as({ userId: 234 }), null); // mensagem agendada pelo usuario do agente
  assert.equal(as({ userId: 233 }, { status: 'pending', userId: null }), null); // chamado nao assumido: como antes
}
console.log('rajada.test.js fila humana ok');

// Aviso de chamado encerrado sem token (fixture 24): 200 sem processar, em vez de 401. So ele: o resto segue exigindo token
{
  const { bvEncerradoSemToken } = require('../workflows/shared/rajada.js');
  assert.equal(bvEncerradoSemToken(fx('24').body), true);
  assert.equal(bvNormalizar(fx('24')).motivo, 'nao_mensagem');
  assert.equal(bvEncerradoSemToken({ ...fx('24').body, token_origin: 'errado' }), false); // token presente e errado: 401
  const semToken = fx('02').body; delete semToken.token_origin;
  for (const b of [semToken, fx('02').body, { acao: 'start' }, {}, null, 'closed']) assert.equal(bvEncerradoSemToken(b), false);
}
console.log('rajada.test.js encerrado sem token ok');
