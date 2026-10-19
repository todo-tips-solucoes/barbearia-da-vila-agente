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
