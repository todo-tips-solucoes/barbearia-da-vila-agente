const assert = require('node:assert/strict');
const { bvAlertaDecidir, bvAlertaFiltrar } = require('../workflows/shared/alerta.js');

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
console.log('alerta.test.js ok');
