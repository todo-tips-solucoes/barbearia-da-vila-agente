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
