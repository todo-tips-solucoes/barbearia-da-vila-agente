const assert = require('node:assert/strict');
const { bvAlertaConexao, bvAlertaDecidir, bvAlertaFiltrar } = require('../workflows/shared/alerta.js');

const cfg = { rotulo: 'PROD', limiar: 3, janela_min: 10, repetir_min: 60 };
assert.equal(bvAlertaDecidir(null, cfg)[0].tipo, 'postgres');
assert.match(bvAlertaDecidir(null, cfg)[0].texto, /PROD.*Postgres/);
assert.deepEqual(bvAlertaDecidir(2, cfg), []);
assert.equal(bvAlertaDecidir('3', cfg)[0].tipo, 'agente');
assert.match(bvAlertaDecidir(5, cfg)[0].texto, /5 falhas .*10 min.*OpenAI/);

// listas do lembrete de 24 h que nao sairam (27/11): uma ja avisa; contagem ausente (consulta falhou) ou zero nao avisa
assert.deepEqual(bvAlertaDecidir(0, cfg, 'CONNECTED', 0), []);
assert.deepEqual(bvAlertaDecidir(null, cfg, 'CONNECTED', undefined).map((a) => a.tipo), ['postgres']);
assert.deepEqual(bvAlertaDecidir(0, cfg, 'CONNECTED', '2').map((a) => [a.tipo, a.reserva]), [['lembrete', false]]);
assert.match(bvAlertaDecidir(0, cfg, null, 1)[0].texto, /PROD.*1 lembrete\(s\) de 24 h não saíram nos últimos 60 min/);
// conexao da loja fora: as listas falham por causa dela e o alerta e um por queda (owner, 22/11); o tipo lembrete nao sai junto
assert.deepEqual(bvAlertaDecidir(5, cfg, 'DISCONNECTED', 3).map((a) => [a.tipo, a.reserva]), [['whatsapp', true], ['agente', true]]);
assert.deepEqual(bvAlertaDecidir(0, cfg, 'AUSENTE', 3).map((a) => a.tipo), ['whatsapp']);
// mesmo tipo so de hora em hora; tipos diferentes nao se bloqueiam
const est = {};
const t0 = 1_000_000_000_000;
assert.equal(bvAlertaFiltrar(bvAlertaDecidir(null, cfg), est, t0, cfg).length, 1);
assert.equal(bvAlertaFiltrar(bvAlertaDecidir(null, cfg), est, t0 + 59 * 60000, cfg).length, 0);
assert.equal(bvAlertaFiltrar(bvAlertaDecidir(4, cfg), est, t0 + 60000, cfg).length, 1);
assert.equal(bvAlertaFiltrar(bvAlertaDecidir(null, cfg), est, t0 + 60 * 60000, cfg).length, 1);
assert.equal(bvAlertaFiltrar(bvAlertaDecidir(0, cfg, null, 1), est, t0, cfg).length, 1);
assert.equal(bvAlertaFiltrar(bvAlertaDecidir(0, cfg, null, 4), est, t0 + 50 * 60000, cfg).length, 0); // a mesma lista perdida fica 55 min na contagem: um aviso so

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
// um alerta por queda: nao repete nem depois de uma hora, nem se a consulta do estado falhar no meio; volta a valer quando a conexao e vista no ar
const rodada = (c, ms) => bvAlertaFiltrar(bvAlertaDecidir(0, cfg, c), est, ms, cfg, c).length;
assert.equal(rodada('DISCONNECTED', t0 + 10 * 60000), 0);
assert.equal(rodada('DISCONNECTED', t0 + 5 * 3600000), 0);
assert.equal(rodada(null, t0 + 6 * 3600000), 0);
assert.equal(rodada('DISCONNECTED', t0 + 7 * 3600000), 0);
assert.equal(rodada('CONNECTED', t0 + 8 * 3600000), 0);
assert.equal(rodada('DISCONNECTED', t0 + 8 * 3600000 + 600000), 1);
// conexao que cai e volta em seguida: dentro da hora nao repete
assert.equal(rodada('CONNECTED', t0 + 8 * 3600000 + 1200000), 0);
assert.equal(rodada('DISCONNECTED', t0 + 8 * 3600000 + 1800000), 0);
// estado guardado pela versao anterior (so o horario do ultimo alerta, queda em curso): nao alerta de novo depois do deploy
assert.equal(bvAlertaFiltrar(fora, { ultimo: { whatsapp: t0 } }, t0 + 2 * 3600000, cfg, 'DISCONNECTED').length, 0);
// 12 horas com a conexao fora e listas vencendo a cada rodada: nenhum alerta de lembrete; a conexao volta e a lista perdida ainda avisa
{
  const e2 = {}, r2 = (c, ms, n) => bvAlertaFiltrar(bvAlertaDecidir(0, cfg, c, n), e2, ms, cfg, c).map((a) => a.tipo);
  let saidas = [];
  for (let k = 0; k < 72; k++) saidas = saidas.concat(r2('DISCONNECTED', t0 + k * 600000, 2));
  assert.deepEqual(saidas, ['whatsapp']);
  assert.deepEqual(r2('CONNECTED', t0 + 72 * 600000, 1), ['lembrete']);
}
// os outros tipos seguem de hora em hora
assert.equal(bvAlertaFiltrar(bvAlertaDecidir(null, cfg), est, t0 + 20 * 3600000, cfg, null).length, 1);
console.log('alerta.test.js ok');
