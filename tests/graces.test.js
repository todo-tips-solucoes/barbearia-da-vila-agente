const assert = require('node:assert/strict');
const g = require('../workflows/shared/graces.js');
const TESTE = '1cee0bb9-e58b-4428-9e9b-1db184db7943';
const cfg = { ambiente: 'integracao', redirecionar: true, testeId: TESTE, cadastroLiberado: false, lista: { max_itens: 10, max_titulo: 24 } };
const T1 = '11111111-1111-4111-8111-111111111111', T2 = '22222222-2222-4222-8222-222222222222';
const base = { contato_id: '7', telefone: '+5511999998888', turno_id: T2, ambiente: 'integracao' };
const entrada = (o) => { const n = g.bvGNormalizar({ ...base, ...o }, cfg); assert.ok(n.ok, JSON.stringify(n)); return n.in; };
const resp = (status, body) => ({ status, body });
const ok = (arr) => resp(200, arr);

// Normalizar: campo desconhecido, ambiente, formatos.
assert.equal(g.bvGNormalizar({ ...base, operacao: 'meus_agendamentos', idCliente: 'x' }, cfg).resultado.code, 'campo_desconhecido');
assert.equal(g.bvGNormalizar({ ...base, operacao: 'meus_agendamentos', ambiente: 'producao' }, cfg).resultado.code, 'ambiente_incorreto');
assert.equal(g.bvGNormalizar({ ...base, operacao: 'horarios_livres', qualquer: true, data: '2026-13-45' }, cfg).resultado.code, 'entrada_invalida');
assert.equal(g.bvGNormalizar({ ...base, operacao: 'escolher_cliente', id_opcao: "1'; DROP" }, cfg).resultado.code, 'entrada_invalida');
assert.equal(g.bvGNormalizar({ ...base, operacao: 'cancelar' }, cfg).resultado.code, 'faltam_dados');
assert.equal(g.bvGNormalizar({ ...base, operacao: 'meus_agendamentos', texto: '', qualquer: '' }, cfg).ok, true);

// identificar_cliente: 0, 1 e varios; telefone so em digitos; FR-020: idCliente nunca vem do modelo.
let p = g.bvGPlano(entrada({ operacao: 'identificar_cliente' }), null, cfg);
assert.deepEqual(p.reqs[0].qs, { celular: '5511999998888' });
let r = g.bvGPasso(p.st, [ok([])], cfg).final;
assert.equal(r.resultado.encontrado, false);
assert.equal(r.efeitos.pedido.cliente_sem_cadastro, true);
r = g.bvGPasso(p.st, [ok([{ idCliente: 'c1', nomeCliente: 'Ana', sobrenomeCliente: 'Souza' }])], cfg).final;
assert.equal(r.efeitos.pedido.idCliente, 'c1');
assert.ok(!JSON.stringify(r.resultado).includes('c1'));
r = g.bvGPasso(p.st, [ok([{ idCliente: 'c1', nomeCliente: 'Ana' }, { idCliente: 'c2', nomeCliente: 'Ana Maria' }])], cfg).final;
assert.equal(r.efeitos.opcoes.tipo, 'cliente');
assert.ok(!JSON.stringify(r.resultado).includes('c2'));
const ctxOp = (opcoes, pedido = {}, extra = {}) => ({ opcoes, pedido, ...extra });
assert.equal(g.bvGPlano(entrada({ operacao: 'escolher_cliente', id_opcao: '2' }), ctxOp(r.efeitos.opcoes), cfg).final.efeitos.pedido.idCliente, 'c2');
assert.equal(g.bvGPlano(entrada({ operacao: 'escolher_cliente', id_opcao: '9' }), ctxOp(r.efeitos.opcoes), cfg).final.resultado.code, 'opcao_desconhecida');

// cadastrar_cliente: desligado por padrao; so mock com a trava aberta (4.2.6).
assert.equal(g.bvGPlano(entrada({ operacao: 'cadastrar_cliente', nome: 'Novo' }), ctxOp({}, { cliente_sem_cadastro: true }), cfg).final.resultado.code, 'cadastro_desabilitado');
const aberto = { ...cfg, cadastroLiberado: true };
assert.equal(g.bvGPlano(entrada({ operacao: 'cadastrar_cliente', nome: 'Novo' }), ctxOp({}, {}), aberto).final.resultado.code, 'identifique_primeiro');
p = g.bvGPlano(entrada({ operacao: 'cadastrar_cliente', nome: 'Novo' }), ctxOp({}, { cliente_sem_cadastro: true }), aberto);
assert.deepEqual(p.reqs[0].body, { nomeCliente: 'Novo', ddiCelular: '55', celular: '11999998888' });
assert.equal(g.bvGPasso(p.st, [ok({ sucesso: true, idCliente: 'n1' })].map((x) => x), aberto).final.efeitos.pedido.idCliente, 'n1');

// listar_servicos: sem "2a vez" nem inativos; listar_barbeiros: trim e sem o de teste.
p = g.bvGPlano(entrada({ operacao: 'listar_servicos' }), null, cfg);
r = g.bvGPasso(p.st, [ok([{ idServico: 's1', descricaoAgenda: 'corte adulto', tempoPadrao: 40, valorPadrao: 85, ativo: true }, { idServico: 's2', descricaoAgenda: 'corte 2ª vez', valorPadrao: 50 }, { idServico: 's3', descricaoAgenda: 'barba', ativo: false }])], cfg).final;
assert.deepEqual(r.resultado.servicos.map((s) => s.nome), ['corte adulto']);
const opcoesServ = r.efeitos.opcoes;
p = g.bvGPlano(entrada({ operacao: 'listar_barbeiros', id_opcao_servico: '1' }), ctxOp(opcoesServ), cfg);
assert.deepEqual(p.reqs[0].qs, { idServico: 's1' });
r = g.bvGPasso(p.st, [ok([{ idProfissional: 'b1', apelido: 'Rodrigo ' }, { idProfissional: TESTE, apelido: 'Zé' }, { idProfissional: 'b3', apelido: 'X', nomeCompleto: 'ZZ TESTE INTEGRACAO - NAO AGENDAR' }, { idProfissional: 'b2', apelido: 'Kiel' }])], cfg).final;
assert.deepEqual(r.resultado.barbeiros.map((b) => b.nome), ['Rodrigo', 'Kiel']);
let pedido = r.efeitos.pedido, opcoesBarb = r.efeitos.opcoes;
assert.ok(!JSON.stringify(r).includes(TESTE));

// horarios_livres: um pedido por barbeiro real no "qualquer"; dia fechado e lotado.
const ctxH = ctxOp(opcoesBarb, pedido);
p = g.bvGPlano(entrada({ operacao: 'horarios_livres', qualquer: true, data: '2026-10-20' }), ctxH, cfg);
assert.equal(p.reqs.length, 2);
assert.ok(p.reqs.every((q) => q.path === '/agenda/horarios-livres' && q.qs.idServico === 's1' && q.qs.idProfissional !== TESTE));
r = g.bvGPasso(p.st, [ok({ minutos: 40, horarios: ['14:00', '14:40'] }), ok({ minutos: 40, horarios: ['14:00', '15:20'] })], cfg).final;
assert.deepEqual(r.resultado.opcoes.map((o) => o.hora), ['14:00', '14:40', '15:20']);
assert.equal(r.resultado.total, 3);
assert.equal(g.bvGPasso(p.st, [resp(400, { code: 'PARAMETRO_INVALIDO' }), resp(400, {})], cfg).final.resultado.orientacao, 'dia fechado ou fora do prazo; sugira outro dia');
assert.match(g.bvGPasso(p.st, [ok({ horarios: [] }), ok({ horarios: [] })], cfg).final.resultado.orientacao, /lotado/);
const opcoesHora = r.efeitos.opcoes;
const comBarbeiro = entrada({ operacao: 'horarios_livres', id_opcao_barbeiro: '2', data: '2026-10-20' });
assert.equal(g.bvGPlano(comBarbeiro, ctxH, cfg).reqs.length, 1);
assert.equal(g.bvGPlano(entrada({ operacao: 'horarios_livres', id_opcao_barbeiro: '99', data: '2026-10-20' }), ctxH, cfg).final.resultado.code, 'opcao_desconhecida');

// meus_agendamentos: usa so pedido.idCliente (FR-020); nunca /agenda/completa.
assert.equal(g.bvGPlano(entrada({ operacao: 'meus_agendamentos' }), ctxOp({}, {}), cfg).final.resultado.code, 'cliente_nao_identificado');
p = g.bvGPlano(entrada({ operacao: 'meus_agendamentos' }), ctxOp({}, { idCliente: 'c1' }), cfg);
assert.deepEqual(p.reqs[0], { m: 'GET', path: '/agenda/agendamentos', qs: { idCliente: 'c1', proximos: true } });
const agBruto = [{ idAgenda: 'a1', horaInicio: '2026-10-20T14:00:00', idServico: 's1', descricaoServico: 'corte adulto', idProfissional: TESTE, profissional: 'ZZ TESTE ', recorrente: false }];
const ctxCli = { pedido: { idCliente: 'c1' } };
r = g.bvGPasso(p.st, [ok(agBruto)], cfg).final;
const opcoesAg = r.efeitos.opcoes;
assert.equal(opcoesAg.itens.length, 1);
assert.equal(g.bvGPasso(p.st, [ok(agBruto)], { ...cfg, ambiente: 'producao' }).final.efeitos.opcoes.itens.length, 0); // FR-012 em producao

// Escrita fase 1: so cria proposta (nenhuma chamada HTTP), cancelar sugere remarcar.
const horaItem = opcoesHora.itens[0];
const ctxE = (opcoes, extra = {}) => ({ opcoes, pedido: { idCliente: 'c1', ...extra } });
p = g.bvGPlano(entrada({ operacao: 'agendar', id_opcao_horario: '1' }), ctxE(opcoesHora), cfg);
assert.ok(!p.reqs && p.final.efeitos.proposta_nova.acao === 'agendar' && p.final.resultado.aguardando_confirmacao);
const dadosAg = p.final.efeitos.proposta_nova.dados;
assert.equal(dadosAg.hora, '14:00');
p = g.bvGPlano(entrada({ operacao: 'cancelar', id_opcao_agendamento: '1' }), ctxE(opcoesAg), cfg);
assert.equal(p.final.resultado.sugerir_remarcar, true);
const dadosCanc = p.final.efeitos.proposta_nova.dados;
// recusas: producao, sem redirecionamento, barbeiro de teste vindo do modelo, agenda de barbeiro real, sem cliente
assert.equal(g.bvGPlano(entrada({ operacao: 'agendar', id_opcao_horario: '1' }), ctxE(opcoesHora), { ...cfg, ambiente: 'producao' }).final.resultado.code, 'escrita_desabilitada');
assert.equal(g.bvGPlano(entrada({ operacao: 'agendar', id_opcao_horario: '1' }), ctxE(opcoesHora), { ...cfg, redirecionar: false }).final.resultado.code, 'escrita_desabilitada');
const oHoraTeste = { tipo: 'horario', itens: [{ id: '1', rotulo: '14:00', valor: { ...horaItem.valor, idProfissional: TESTE } }] };
assert.equal(g.bvGPlano(entrada({ operacao: 'agendar', id_opcao_horario: '1' }), ctxE(oHoraTeste), cfg).final.resultado.code, 'opcao_desconhecida');
const oAgReal = { tipo: 'agendamento', itens: [{ id: '1', rotulo: 'x', valor: { ...opcoesAg.itens[0].valor, idProfissional: 'real' } }] };
assert.equal(g.bvGPlano(entrada({ operacao: 'cancelar', id_opcao_agendamento: '1' }), ctxE(oAgReal), cfg).final.resultado.code, 'escrita_fora_do_teste');
assert.equal(g.bvGPlano(entrada({ operacao: 'agendar', id_opcao_horario: '1' }), { opcoes: opcoesHora, pedido: {} }, cfg).final.resultado.code, 'cliente_nao_identificado');
assert.equal(g.bvGPlano(entrada({ operacao: 'agendar', id_opcao_horario: '7' }), ctxE(opcoesHora), cfg).final.resultado.code, 'opcao_desconhecida');

// Fase 2 (FR-007): sem proposta reivindicada -> recusa pelo motivo; nada vai a Graces.
const PID = '33333333-3333-4333-8333-333333333333';
const f2 = (o, ctx, c = cfg) => g.bvGPlano(entrada({ proposta_id: PID, ...o }), ctx, c);
assert.equal(f2({ operacao: 'agendar' }, { pedido: {}, info: { estado: 'pendente', mesmo_turno: true } }).final.resultado.code, 'confirmacao_no_mesmo_turno');
assert.equal(f2({ operacao: 'agendar' }, { pedido: {}, info: { estado: 'executada', mesmo_turno: false } }).final.resultado.code, 'proposta_nao_pendente');
assert.equal(f2({ operacao: 'agendar' }, { pedido: {}, info: { estado: 'pendente', mesmo_turno: false } }).final.resultado.code, 'proposta_expirada');
assert.equal(f2({ operacao: 'agendar' }, { pedido: {} }).final.resultado.code, 'proposta_invalida');
const prop = (acao, dados) => ({ pedido: { idCliente: 'c1' }, proposta: { id: PID, acao, dados } });
assert.equal(f2({ operacao: 'agendar' }, prop('agendar', dadosAg), { ...cfg, ambiente: 'producao' }).final.efeitos.proposta_upd.estado, 'falhou');

// agendar fase 2: revalida (barbeiro de teste), horario tomado -> falhou + novas opcoes; ok -> POST so no barbeiro de teste.
p = f2({ operacao: 'agendar' }, prop('agendar', dadosAg));
assert.equal(p.reqs[0].path, '/agenda/horarios-livres');
assert.equal(p.reqs[0].qs.idProfissional, TESTE);
r = g.bvGPasso(p.st, [ok({ horarios: ['15:20', '16:00'] })], cfg).final;
assert.equal(r.resultado.code, 'horario_indisponivel');
assert.deepEqual(r.resultado.opcoes.map((o) => o.hora), ['15:20', '16:00']);
assert.equal(r.efeitos.proposta_upd.estado, 'falhou');
let s2 = g.bvGPasso(p.st, [ok({ horarios: ['14:00', '15:20'] })], cfg);
assert.equal(s2.reqs[0].m, 'POST');
assert.equal(s2.reqs[0].body.idProfissional, TESTE);
assert.equal(s2.reqs[0].body.horaInicio, '14:00');
assert.equal(s2.reqs[0].body.idCliente, 'c1');
r = g.bvGPasso(s2.st, [ok({ sucesso: true, idAgenda: 'n1' })], cfg).final;
assert.equal(r.resultado.ok, true);
assert.equal(r.efeitos.proposta_upd.estado, 'executada');
// erro de escrita nao repete: 409 -> falhou; timeout/5xx -> incerta, com orientacao de conferir antes
r = g.bvGPasso(s2.st, [resp(409, { code: 'CONFLITO', traceId: '00-abc-01' })], cfg).final;
assert.equal(r.efeitos.proposta_upd.estado, 'falhou');
assert.equal(r.efeitos.falha.trace, '00-abc-01');
assert.ok(!JSON.stringify(r.efeitos).includes('c1'));
r = g.bvGPasso(s2.st, [{ status: undefined }], cfg).final;
assert.equal(r.efeitos.proposta_upd.estado, 'incerta');
assert.match(r.resultado.orientacao, /meus_agendamentos/);
assert.equal(g.bvGPasso(s2.st, [resp(503, {})], cfg).final.efeitos.proposta_upd.estado, 'incerta');

// reagendar fase 2: PUT com horaInicioOriginal e data/hora novas.
const dadosRe = { ...dadosCanc, idServico: 's1', servico: 'corte adulto', idProfissional: 'b1', data: '2026-10-21', hora: '10:00' };
p = f2({ operacao: 'reagendar' }, prop('reagendar', dadosRe));
s2 = g.bvGPasso(p.st, [ok({ horarios: ['10:00'] })], cfg);
assert.deepEqual(s2.reqs[0], { m: 'PUT', path: '/agenda/a1', body: { horaInicioOriginal: '2026-10-20T14:00:00', horaInicioNovo: '2026-10-21T10:00:00', idProfissional: TESTE } });

// cancelar fase 2: DELETE direto (recorrente leva ?data=); trocar_servico: POST e so depois DELETE do antigo.
p = f2({ operacao: 'cancelar' }, prop('cancelar', { ...dadosCanc, recorrente: true }));
assert.deepEqual(p.reqs[0], { m: 'DELETE', path: '/agenda/a1', qs: { data: '2026-10-20' } });
r = g.bvGPasso(p.st, [ok({ sucesso: true })], cfg).final;
assert.equal(r.efeitos.proposta_upd.estado, 'executada');
const dadosTroca = { ...dadosAg, antigo: { idAgenda: 'a1', horaInicio: '2026-10-20T14:00:00', recorrente: false } };
p = f2({ operacao: 'agendar' }, prop('trocar_servico', dadosTroca));
s2 = g.bvGPasso(p.st, [ok({ horarios: ['14:00'] })], cfg);
const s3 = g.bvGPasso(s2.st, [ok({ sucesso: true, idAgenda: 'n2' })], cfg);
assert.deepEqual(s3.reqs[0], { m: 'DELETE', path: '/agenda/a1', qs: {} });
assert.equal(g.bvGPasso(s3.st, [ok({ sucesso: true })], cfg).final.efeitos.proposta_upd.estado, 'executada');
assert.equal(g.bvGPasso(s2.st, [resp(409, { code: 'CONFLITO' })], cfg).final.efeitos.proposta_upd.estado, 'falhou'); // POST falhou: nao apaga o antigo
assert.equal(g.bvGPasso(s3.st, [resp(500, {})], cfg).final.resultado.code, 'novo_criado_antigo_nao_cancelado');

// u1/u3: oferta completa (14 inicios, sem corte), uniao "qualquer barbeiro" sem o barbeiro de teste, ordem cronologica.
{
  const h14 = Array.from({ length: 14 }, (_, k) => `${String(9 + Math.floor(k * 40 / 60)).padStart(2, '0')}:${String(k * 40 % 60).padStart(2, '0')}`);
  const pedidoU = { servico: { idServico: 's1', nome: 'corte adulto', preco: 85 }, barbeiros: [{ opcao_id: '1', idProfissional: 'b1', apelido: 'Rodrigo' }, { opcao_id: '9', idProfissional: TESTE, apelido: 'Zé' }, { opcao_id: '2', idProfissional: 'b2', apelido: 'Kiel' }] };
  const pu = g.bvGPlano(entrada({ operacao: 'horarios_livres', qualquer: true, data: '2026-10-20' }), ctxOp({}, pedidoU), cfg);
  assert.equal(pu.reqs.length, 2); // o de teste fora
  const ru = g.bvGPasso(pu.st, [ok({ minutos: 40, horarios: h14.slice(0, 8) }), ok({ minutos: 40, horarios: h14.slice(4) })], cfg).final;
  assert.deepEqual(ru.efeitos.opcoes.itens.map((x) => x.valor.hora), h14);
  assert.equal(ru.efeitos.opcoes.completa, true);
  assert.equal(ru.resultado.orientacao, undefined);
  assert.equal(ru.efeitos.opcoes.itens[5].valor.apelido, 'Rodrigo'); // inicio livre nos dois: o primeiro da ordem de listar_barbeiros
  assert.ok(ru.efeitos.opcoes.itens.every((x) => x.valor.idProfissional !== TESTE));
}

// u8: "2a vez" (5 variantes) recusado nas fases 1 e 2 e removido da busca por nome; cancelar segue permitido.
for (const nome of ['corte adulto 2º vez', 'BARBA 2a VEZ', 'corte 2ª vez', 'Corte 2 Vez', 'corte 2o vez']) {
  const o = { tipo: 'horario', itens: [{ id: '1', rotulo: '10:00', valor: { data: '2026-10-20', hora: '10:00', idProfissional: 'b1', apelido: 'R', idServico: 's9', servico: nome } }] };
  assert.equal(g.bvGPlano(entrada({ operacao: 'agendar', id_opcao_horario: '1' }), ctxOp(o, { idCliente: 'c1' }), cfg).final.resultado.code, 'servico_nao_oferecido', nome);
  const oa = { tipo: 'agendamento', itens: [{ id: '1', rotulo: 'x', valor: { idAgenda: 'a1', horaInicio: '2026-10-20T14:00:00', idServico: 's9', servico: nome, idProfissional: TESTE, profissional: 'ZZ TESTE' } }] };
  assert.equal(g.bvGPlano(entrada({ operacao: 'reagendar', id_opcao_agendamento: '1', id_opcao_horario: '1' }), ctxOp(oa, { idCliente: 'c1' }), cfg).final.resultado.code, 'servico_nao_oferecido', nome);
  const pr = { id: 'p1', acao: 'agendar', dados: { idCliente: 'c1', idServico: 's9', servico: nome, idProfissional: 'b1', data: '2026-10-20', hora: '10:00' } };
  const f2u = g.bvGPlano(entrada({ operacao: 'agendar', proposta_id: T1 }), { pedido: {}, opcoes: {}, proposta: pr }, cfg).final;
  assert.equal(f2u.resultado.code, 'servico_nao_oferecido', nome);
  assert.equal(f2u.efeitos.proposta_upd.estado, 'falhou');
  assert.equal(g.bvGPlano(entrada({ operacao: 'cancelar', proposta_id: T1 }), { pedido: {}, opcoes: {}, proposta: { id: 'p1', acao: 'cancelar', dados: { idAgenda: 'a1', servico: nome } } }, cfg).reqs[0].m, 'DELETE');
}
{
  const pb = g.bvGPlano(entrada({ operacao: 'listar_servicos', texto: 'corte adulto 2ª vez' }), null, cfg);
  assert.deepEqual(pb.reqs[0].qs, { texto: 'corte adulto' });
  assert.match(g.bvGPasso(pb.st, [ok([{ idServico: 's1', descricaoAgenda: 'corte adulto', valorPadrao: 85 }])], cfg).final.resultado.orientacao, /regular/);
}

// Falha de leitura: registra code/traceId sem PII e orienta.
p = g.bvGPlano(entrada({ operacao: 'listar_servicos' }), null, cfg);
r = g.bvGPasso(p.st, [resp(401, { code: 'NAO_AUTENTICADO', traceId: '00-zz-01', detail: 'segredo' })], cfg).final;
assert.equal(r.resultado.ok, false);
assert.ok(!JSON.stringify(r).includes('segredo'));
assert.deepEqual(g.bvGParams(base, r.efeitos).slice(9), ['listar_servicos_erro', 'listar_servicos', 'NAO_AUTENTICADO', 401, '00-zz-01']);
assert.equal(g.bvGParams({ ...base }, {}).length, 14);
console.log('graces.test.js ok');
