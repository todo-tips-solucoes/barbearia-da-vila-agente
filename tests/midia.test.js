const assert = require('assert');
const { bvParseUrlMidia, bvHostRecusado, bvValidarMidia } = require('../workflows/shared/midia.js');

const cfg = { hosts_audio: ['object.ce1.eveo.com.br'], hosts_imagem: [], prefixos_audio: [], prefixos_imagem: [],
  mimes_audio: ['audio/ogg'], mimes_imagem: ['image/png', 'image/jpeg'], audio_max_s: 120, audio_max_mb: 10, imagem_max_mb: 10 };
const ok = { tipo: 'audio', midia_url: 'https://object.ce1.eveo.com.br/b/a.mp3', midia_mime: 'audio/ogg; codecs=opus', midia_segundos: 5, midia_bytes: 9694 };
const v = (o, c) => bvValidarMidia({ ...ok, ...o }, { ...cfg, ...c });

assert.deepEqual(v({}), { ok: true });
assert.deepEqual(v({ midia_segundos: 120 }), { ok: true });
for (const url of ['http://object.ce1.eveo.com.br/a', 'https://user@object.ce1.eveo.com.br/a', 'https://object.ce1.eveo.com.br:8443/a',
  'https://object.ce1.eveo.com.br./a', 'https://object.ce1.eveo.com.br%2eevil.com/a', 'https://evil.com/a', 'https://object.ce1.eveo.com.br.evil.com/a',
  'https://object.ce1.eveo.com.br\\@evil.com/a', null, '']) {
  assert.equal(v({ midia_url: url }).motivo, 'host_recusado', String(url));
}
assert.equal(v({ midia_url: 'https://OBJECT.ce1.eveo.com.br/a' }).ok, true); // host case-insensitive
assert.equal(v({ tipo: 'imagem', midia_url: 'https://x.com/a.png', midia_mime: 'image/png' }).motivo, 'host_recusado'); // hosts_imagem vazio
assert.equal(v({ tipo: 'imagem', midia_url: 'https://x.com/a.png', midia_mime: 'image/png' }, { hosts_imagem: ['x.com'] }).ok, true);
assert.equal(v({ midia_segundos: 121 }).motivo, 'longo');
assert.equal(v({ midia_mime: 'audio/mpeg' }).motivo, 'sem_suporte');
assert.equal(v({ midia_mime: null }).motivo, 'sem_suporte');
assert.equal(v({ midia_bytes: 10 * 1024 * 1024 + 1 }).motivo, 'grande');
assert.equal(v({ tipo: 'outro' }).motivo, 'sem_suporte');
assert.equal(v({}, { prefixos_audio: ['/b/'] }).ok, true);
assert.equal(v({}, { prefixos_audio: ['/z/'] }).motivo, 'host_recusado');
assert.equal(v({ midia_url: 'https://object.ce1.eveo.com.br/b/../z/a' }, { prefixos_audio: ['/b/'] }).ok, false);

// registro de falha: so o host, nunca caminho
assert.equal(bvHostRecusado('https://evil.com/segredo/a.png?t=1'), 'evil.com');
assert.equal(bvHostRecusado('http://evil.com/x'), 'evil.com');
assert.equal(bvHostRecusado('lixo'), null);
assert.equal(bvParseUrlMidia('https://a.com/x').caminho, '/x');
console.log('midia.test.js ok');
