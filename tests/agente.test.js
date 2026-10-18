const assert = require('node:assert/strict');
const a = require('../workflows/shared/agente.js');
const cfg = { saida: { max_mensagens: 4, max_chars_mensagem: 700 }, lista: { max_itens: 10, max_titulo: 24 },
  digitando: { ms_por_char: 40, min_ms: 800, max_ms: 4000 } };
const TESTE_ID = '1cee0bb9-e58b-4428-9e9b-1db184db7943';

// SC-001 / FR-012: barbeiro de teste removido por id e por nome.
const bs = [{ id: TESTE_ID, apelido: 'Zé' }, { id: 'x', nome: 'ZZ TESTE INTEGRACAO - NAO AGENDAR' }, { id: 'y', apelido: 'Teste ' }, { id: 'ok', apelido: 'João ' }];
assert.deepEqual(a.bvFiltrarBarbeiros(bs, TESTE_ID).map((b) => b.id), ['ok']);
assert.deepEqual(a.bvFiltrarBarbeiros(null, TESTE_ID), []);

// FR-013: "2ª vez".
const ss = [{ nome: 'Corte' }, { nome: 'Corte 2ª vez' }, { nome: 'Barba 2a vez' }, { nome: 'Barba' }];
assert.deepEqual(a.bvFiltrarServicos(ss).map((s) => s.nome), ['Corte', 'Barba']);

// Opcoes: id desconhecido recusado.
const oferta = a.bvMontarOferta('horario', Array.from({ length: 12 }, (_, i) => ({ rotulo: `${9 + i}:00 com um nome muito longo demais`, valor: `v${i}` })), cfg);
assert.equal(oferta.itens.length, 10);
assert.ok(oferta.itens.every((i) => i.rotulo.length <= 24));
assert.equal(a.bvResolverOpcao('3', oferta).item.valor, 'v2');
assert.equal(a.bvResolverOpcao('99', oferta).ok, false);
assert.equal(a.bvResolverOpcao("1'; DROP", oferta).code, 'opcao_desconhecida');

// SC-003 / FR-015: limites de saida.
const longo = Array.from({ length: 40 }, (_, i) => `Frase ${i} com algum texto para encher.`).join(' ');
let m = a.bvCompor(longo, null, cfg);
assert.ok(m.length <= 4 && m.every((x) => x.texto.length <= 700));
m = a.bvCompor('Qual dia? Qual horário? Prefere manhã? Ou tarde?', null, cfg);
assert.ok(m.every((x) => (x.texto.match(/\?/g) || []).length <= 1));
assert.equal(m.length, 4);
m = a.bvCompor('Claro! Temos o ZZ TESTE INTEGRACAO livre. Posso ajudar com outro?', null, cfg);
assert.ok(m.every((x) => !/teste/i.test(x.texto)) && m.length === 1);
m = a.bvCompor('x'.repeat(2000), null, cfg);
assert.ok(m[0].texto.length <= 700);

// Lista: so ids ofertados; vai na ultima mensagem.
m = a.bvCompor('Escolha:\nOPCOES:\n1 | A\n99 | injetado\n2 | B', oferta, cfg);
assert.equal(m.at(-1).tipo, 'lista');
assert.deepEqual(m.at(-1).opcoes.map((o) => o.id), ['1', '2']);
assert.equal(a.bvCompor('Oi', null, cfg)[0].tipo, 'texto');

// SC-007: recencia.
const agora = Date.now();
let r = a.bvRecencia({ ultimaEntradaMs: agora - 121 * 60000, agoraMs: agora, janelaMin: 120, pedido: { idServico: 's' }, opcoes: { tipo: 'x' } });
assert.equal(r.sessaoNova, true);
assert.deepEqual(r.pedido, {});
assert.equal(r.opcoes, null);
assert.deepEqual(r.pedido_anterior, { idServico: 's', abandonado: true });
r = a.bvRecencia({ ultimaEntradaMs: agora - 5 * 60000, agoraMs: agora, janelaMin: 120, pedido: { idServico: 's' }, opcoes: 1 });
assert.equal(r.sessaoNova, false);
assert.deepEqual(r.pedido, { idServico: 's' });
assert.equal(a.bvRecencia({ ultimaEntradaMs: null, agoraMs: agora, janelaMin: 120, pedido: {} }).pedido_anterior, null);

// Digitando: clamp.
assert.equal(a.bvDigitacaoMs('a', cfg), 800);
assert.equal(a.bvDigitacaoMs('a'.repeat(50), cfg), 2000);
assert.equal(a.bvDigitacaoMs('a'.repeat(500), cfg), 4000);

// Prompt: premissas obrigatorias e sem segredo.
const p = a.bvPrompt(cfg);
for (const k of ['IA', 'remarcar', 'vamos marcar outro'.slice(0, 0) + 'cancelei', 'DADO', 'confirmação']) assert.ok(p.includes(k), k);
assert.ok(!/sk-|Bearer|X-Api-Key/.test(p));
console.log('agente.test.js ok');
