const assert = require('node:assert/strict');
const { bvAlertaConexao, bvAlertaDecidir, bvAlertaFiltrar } = require('../workflows/shared/alerta.js');

const cfg = { rotulo: 'PROD', limiar: 3, janela_min: 10, repetir_min: 60 };
assert.equal(bvAlertaDecidir(null, cfg)[0].tipo, 'postgres');
assert.match(bvAlertaDecidir(null, cfg)[0].texto, /PROD.*Postgres/);
assert.deepEqual(bvAlertaDecidir(2, cfg), []);
assert.equal(bvAlertaDecidir('3', cfg)[0].tipo, 'agente');
assert.match(bvAlertaDecidir(5, cfg)[0].texto, /5 falhas .*10 min.*OpenAI/);

// mesmo tipo so de hora em hora; tipos diferentes nao se bloqueiam
const est = {};
const t0 = 1_000_000_000_000;
assert.equal(bvAlertaFiltrar(bvAlertaDecidir(null, cfg), est, t0, cfg).length, 1);
assert.equal(bvAlertaFiltrar(bvAlertaDecidir(null, cfg), est, t0 + 59 * 60000, cfg).length, 0);
assert.equal(bvAlertaFiltrar(bvAlertaDecidir(4, cfg), est, t0 + 60000, cfg).length, 1);
assert.equal(bvAlertaFiltrar(bvAlertaDecidir(null, cfg), est, t0 + 60 * 60000, cfg).length, 1);

// WhatsApp da loja fora do ar: estado lido da lista de conexoes; sem resposta util nao alerta; com a conexao fora tudo sai pela reserva
const st = (s) => ({ whatsapps: [{ id: 145, status: 'CONNECTED', hubtoken: 'segredo' }, { id: 159, status: s }] });
assert.equal(bvAlertaConexao(st('CONNECTED'), '159'), 'CONNECTED');
assert.equal(bvAlertaConexao(st('DISCONNECTED'), 159), 'DISCONNECTED');
assert.equal(bvAlertaConexao(st('qr<code>\n'), '159'), 'qrcode'); // o estado vai ao texto do alerta: so letras
assert.equal(bvAlertaConexao(st(null), '159'), 'SEM_STATUS');
assert.equal(bvAlertaConexao({ whatsapps: [{ id: 145, status: 'CONNECTED' }] }, '159'), 'AUSENTE');
for (const r of [null, undefined, {}, { error: 'timeout' }, { whatsapps: 'x' }, 'texto']) assert.equal(bvAlertaConexao(r, '159'), null);
assert.deepEqual(bvAlertaDecidir(0, cfg, 'CONNECTED'), []);
assert.deepEqual(bvAlertaDecidir(0, cfg, null), []);
const fora = bvAlertaDecidir(0, cfg, 'DISCONNECTED');
assert.deepEqual(fora.map((a) => [a.tipo, a.reserva]), [['whatsapp', true]]);
assert.match(fora[0].texto, /PROD.*WhatsApp da loja está fora do ar.*estado: DISCONNECTED/);
assert.doesNotMatch(JSON.stringify(fora), /segredo/);
assert.deepEqual(bvAlertaDecidir(null, cfg, 'AUSENTE').map((a) => [a.tipo, a.reserva]), [['whatsapp', true], ['postgres', true]]);
assert.deepEqual(bvAlertaDecidir(5, cfg, 'CONNECTED').map((a) => [a.tipo, a.reserva]), [['agente', false]]);
assert.equal(bvAlertaFiltrar(fora, est, t0, cfg).length, 1);
assert.equal(bvAlertaFiltrar(bvAlertaDecidir(0, cfg, 'DISCONNECTED'), est, t0 + 10 * 60000, cfg).length, 0); // uma vez por hora
console.log('alerta.test.js ok');
