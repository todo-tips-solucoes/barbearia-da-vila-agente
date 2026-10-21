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
const aberto = { ...cfg, cadastroLiberado: true, terceiroLiberado: true };
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

// funcionamento (suite-validacao R3): so leitura de /agenda/configuracao, sem cliente identificado; dia fora da lista vira contato da loja.
p = g.bvGPlano(entrada({ operacao: 'funcionamento' }), ctxOp({}, {}), cfg);
assert.deepEqual(p.reqs, [{ m: 'GET', path: '/agenda/configuracao' }]);
r = g.bvGPasso(p.st, [ok({ prazoMinimoAntecedencia: 0, horarios: [{ dia: 'Domingo', horaInicio: '08:00', horaFim: '16:00' }, null] })], cfg).final;
assert.deepEqual(r.resultado.horarios, [{ dia: 'Domingo', abre: '08:00', fecha: '16:00' }]);
assert.match(g.bvGPasso(p.st, [ok({})], cfg).final.resultado.orientacao, /contatos da loja/);
assert.equal(g.bvGPasso(p.st, [resp(500, {})], cfg).final.resultado.ok, false);

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
assert.deepEqual(g.bvGParams(base, r.efeitos).slice(9, 14), ['graces|configuracao', 'listar_servicos', 'NAO_AUTENTICADO', 401, '00-zz-01']);
assert.equal(g.bvGParams({ ...base }, {}).length, 17);

// ---- FASE 3: escrita incerta (u9-u12), erros por code (u13) ----
{
  const dA = { idCliente: 'c1', idServico: 's1', servico: 'corte adulto', idProfissional: 'b1', barbeiro: 'R', data: '2026-10-20', hora: '14:00', valor: 85 };
  const novo = { idAgenda: 'n1', idServico: 's1', idProfissional: TESTE, horaInicio: '2026-10-20T14:00:00' };
  const escreve = () => { // reval ok + linha de base vazia -> POST
    const pl = f2({ operacao: 'agendar' }, prop('agendar', dA));
    assert.equal(pl.reqs.length, 2); // horarios + linha de base
    return g.bvGPasso(pl.st, [ok({ horarios: ['14:00'] }), ok([{ idAgenda: 'velho' }])], cfg);
  };
  let w = escreve();
  assert.equal(w.reqs[0].m, 'POST');
  // u9: status 0, item novo na leitura -> executada, verificada, 1 POST
  let v = g.bvGPasso(w.st, [resp(0)], cfg);
  assert.equal(v.reqs[0].path, '/agenda/agendamentos');
  r = g.bvGPasso(v.st, [ok([{ idAgenda: 'velho' }, novo])], cfg).final;
  assert.equal(r.efeitos.proposta_upd.estado, 'executada');
  assert.equal(r.resultado.verificada, true);
  // u10: status 0, item ausente, repeticao 200 -> executada com exatamente 2 POST
  const v2 = g.bvGPasso(w.st, [resp(0)], cfg);
  const rep = g.bvGPasso(v2.st, [ok([{ idAgenda: 'velho' }])], cfg);
  assert.equal(rep.reqs[0].m, 'POST');
  r = g.bvGPasso(rep.st, [ok({ sucesso: true, idAgenda: 'n1' })], cfg).final;
  assert.equal(r.efeitos.proposta_upd.estado, 'executada');
  assert.equal(r.efeitos.falha.motivo, 'graces|escrita_repetida');
  // u11: 503 duas vezes, item ausente nas duas leituras -> incerta, 2 POST, sem terceira escrita
  const v3 = g.bvGPasso(rep.st, [resp(503, { traceId: 'tr-1' })], cfg);
  assert.equal(v3.reqs[0].path, '/agenda/agendamentos');
  r = g.bvGPasso(v3.st, [ok([{ idAgenda: 'velho' }])], cfg).final;
  assert.equal(r.efeitos.proposta_upd.estado, 'incerta');
  assert.equal(r.efeitos.falha.motivo, 'graces|escrita_incerta');
  // u12: status 0 e a leitura falha -> incerta, 1 POST so
  r = g.bvGPasso(v.st, [resp(500, {})], cfg).final;
  assert.equal(r.efeitos.proposta_upd.estado, 'incerta');
  // DELETE incerto: id ausente na releitura = aplicada
  const pc = f2({ operacao: 'cancelar' }, prop('cancelar', dadosCanc));
  const vc = g.bvGPasso(g.bvGPasso(pc.st, [resp(0)], cfg).st, [ok([])], cfg);
  assert.equal(vc.final.efeitos.proposta_upd.estado, 'executada');
  // u13: reacao pelo code; detail (en/pt) nunca na saida
  const casos = [['PARAMETRO_INVALIDO', 'parametro_invalido'], ['CORPO_INVALIDO', 'parametro_invalido'], ['NAO_AUTENTICADO', 'configuracao'], ['LOJA_FORA_ESCOPO', 'configuracao'],
    ['ACESSO_NEGADO', 'configuracao'], ['NAO_ENCONTRADO', 'nao_encontrado'], ['CONFLITO', 'conflito'], ['OUTRO', 'code_desconhecido']];
  for (const [code, tipo] of casos) for (const detail of ['Invalid token secret-xyz', 'Token inválido segredo-xyz']) {
    const e = g.bvGErro({ status: 400, body: { code, detail, traceId: 't-1' } }, 'listar_servicos');
    assert.equal(e.falha.motivo, `graces|${tipo}`, code);
    assert.ok(!JSON.stringify(e).includes('xyz'));
  }
  assert.equal(g.bvGErro({ status: 0 }, 'x').falha.motivo, 'graces|sem_resposta');
  assert.equal(g.bvGErro({ status: 502, body: { detail: 'x' } }, 'x').incerto, true);
  assert.match(g.bvGErro({ status: 409, body: { code: 'CONFLITO' } }, 'agendar').orientacao, /recarregue a grade/);
}

// ---- FASE 3: encadeamento (u14-u16) ----
{
  const ofS = { tipo: 'servico', itens: [{ id: '1', rotulo: 'corte', valor: { idServico: 's1', nome: 'corte adulto', preco: 85, minutos: 40 } }, { id: '2', rotulo: 'barba', valor: { idServico: 's2', nome: 'barba', preco: 40, minutos: 30 } }] };
  const profs = (ids) => ok(ids.map((id) => ({ idProfissional: id, apelido: id.toUpperCase() })));
  const plE = g.bvGPlano(entrada({ operacao: 'horarios_livres', id_opcoes_servicos: ['1', '2'], data: '2026-10-20' }), ctxOp(ofS), cfg);
  assert.equal(plE.reqs.length, 2);
  // u14: b1 e b2 fazem os dois; so b1 tem a sequencia (corte 40min -> barba na grade)
  const e1 = g.bvGPasso(plE.st, [profs(['b1', 'b2', TESTE]), profs(['b1', 'b2'])], cfg);
  assert.equal(e1.reqs.length, 4); // 2 barbeiros reais x 2 servicos, sem o de teste
  const e2 = g.bvGPasso(e1.st, [ok({ minutos: 40, horarios: ['10:00', '11:00'] }), ok({ minutos: 30, horarios: ['10:40', '15:00'] }),
    ok({ minutos: 40, horarios: ['10:00'] }), ok({ minutos: 30, horarios: ['12:00'] })], cfg).final;
  assert.deepEqual(e2.resultado.opcoes.map((o) => `${o.hora} ${o.barbeiro}`), ['10:00 B1']);
  const sq = e2.efeitos.opcoes.itens[0].valor;
  assert.deepEqual(sq.itens.map((x) => x.hora), ['10:00', '10:40']);
  // u15: nenhum barbeiro comum -> sem_barbeiro_unico com oferta de modo
  const n1 = g.bvGPasso(plE.st, [profs(['b1']), profs(['b2'])], cfg).final;
  assert.equal(n1.resultado.sem_barbeiro_unico, true);
  assert.equal(n1.efeitos.opcoes.tipo, 'modo_encadeamento');
  assert.ok(!n1.resultado.opcoes.some((o) => o.hora));
  // idem quando ha comuns mas nenhuma sequencia cabe
  const n2 = g.bvGPasso(e1.st, [ok({ minutos: 40, horarios: ['10:00'] }), ok({ minutos: 30, horarios: ['11:00'] }), ok({ minutos: 40, horarios: [] }), ok({ minutos: 30, horarios: [] })], cfg).final;
  assert.equal(n2.resultado.sem_barbeiro_unico, true);
  // u15b (block-002 C): "barbeiros diferentes" -> sequencia com barbeiro por servico, resumo unico; "separados" -> um servico por vez
  const ctxM = ctxOp(n1.efeitos.opcoes, n1.efeitos.pedido);
  const idModo = (v) => n1.efeitos.opcoes.itens.find((x) => x.valor === v).id;
  const sep = g.bvGPlano(entrada({ operacao: 'horarios_livres', id_opcao: idModo('separados'), data: '2026-10-20' }), ctxM, cfg).final;
  assert.equal(sep.resultado.modo, 'separados');
  assert.equal(sep.efeitos.pedido.servico.idServico, 's1');
  assert.equal(g.bvGPlano(entrada({ operacao: 'horarios_livres', id_opcao: '9', data: '2026-10-20' }), ctxM, cfg).final.resultado.code, 'opcao_desconhecida');
  const dp = g.bvGPlano(entrada({ operacao: 'horarios_livres', id_opcao: idModo('barbeiros_diferentes'), data: '2026-10-20' }), ctxM, cfg);
  assert.equal(dp.reqs.length, 2);
  const dg = g.bvGPasso(dp.st, [profs(['b1', TESTE]), profs(['b2'])], cfg);
  assert.equal(dg.reqs.length, 2); // b1 p/ corte, b2 p/ barba (sem o de teste)
  const dr = g.bvGPasso(dg.st, [ok({ minutos: 40, horarios: ['10:00', '11:00'] }), ok({ minutos: 30, horarios: ['10:40'] })], cfg).final;
  assert.deepEqual(dr.resultado.opcoes.map((o) => `${o.hora} ${o.barbeiros.join('+')}`), ['10:00 B1+B2']);
  assert.equal(dr.efeitos.opcoes.itens[0].valor.itens[1].idProfissional, 'b2');
  const dsem = g.bvGPasso(dg.st, [ok({ minutos: 40, horarios: ['10:00'] }), ok({ minutos: 30, horarios: ['12:00'] })], cfg).final;
  assert.equal(dsem.resultado.total, 0);
  const dd = g.bvGPlano(entrada({ operacao: 'agendar', id_opcao_horario: '1' }), ctxOp(dr.efeitos.opcoes, { idCliente: 'c1' }), cfg).final;
  assert.match(dd.resultado.resumo, /corte adulto às 10:00 com B1.*\+ barba às 10:40 com B2/);
  // no TESTE toda escrita do conjunto vai ao barbeiro de teste, mesmo com barbeiros diferentes na proposta
  const pP = g.bvGPlano(entrada({ operacao: 'agendar', proposta_id: PID }), prop('agendar_conjunto', dd.efeitos.proposta_nova.dados), cfg);
  assert.deepEqual(pP.reqs.map((q) => q.qs.idProfissional), [TESTE, TESTE]);
  // u16: conjunto: 1o POST 200, 2o 409 -> parcial, sem 3a chamada
  const ctxC = ctxOp(e2.efeitos.opcoes, { idCliente: 'c1' });
  const fase1 = g.bvGPlano(entrada({ operacao: 'agendar', id_opcao_horario: '1' }), ctxC, cfg).final;
  assert.equal(fase1.efeitos.proposta_nova.acao, 'agendar_conjunto');
  assert.match(fase1.resultado.resumo, /corte adulto às 10:00.*\+ barba às 10:40/);
  const dC = fase1.efeitos.proposta_nova.dados;
  const pl2 = f2({ operacao: 'agendar' }, prop('agendar_conjunto', dC));
  assert.equal(pl2.reqs.length, 2);
  assert.ok(pl2.reqs.every((q) => q.qs.idProfissional === TESTE));
  const w1 = g.bvGPasso(pl2.st, [ok({ horarios: ['10:00'] }), ok({ horarios: ['10:40'] })], cfg);
  assert.equal(w1.reqs[0].body.idServico, 's1');
  const w2 = g.bvGPasso(w1.st, [ok({ sucesso: true, idAgenda: 'a1' })], cfg);
  assert.equal(w2.reqs[0].body.idServico, 's2');
  assert.equal(w2.reqs[0].body.horaInicio, '10:40');
  r = g.bvGPasso(w2.st, [resp(409, { code: 'CONFLITO', traceId: 'tc' })], cfg).final;
  assert.equal(r.efeitos.proposta_upd.estado, 'parcial');
  assert.deepEqual(r.resultado.criados, [{ servico: 'corte adulto', hora: '10:00' }]);
  assert.deepEqual(r.resultado.faltaram, [{ servico: 'barba' }]);
  assert.deepEqual(r.efeitos.pedido.faltantes, [{ idServico: 's2', nome: 'barba', preco: 40 }]);
  assert.match(r.resultado.orientacao, /não recrie/);
  r = g.bvGPasso(w2.st, [ok({ sucesso: true, idAgenda: 'a2' })], cfg).final;
  assert.equal(r.efeitos.proposta_upd.estado, 'executada');
  assert.equal(r.efeitos.proposta_upd.resultado.itens.length, 2);
  // reval: item tomado -> falhou antes de qualquer POST
  assert.equal(g.bvGPasso(pl2.st, [ok({ horarios: ['10:00'] }), ok({ horarios: [] })], cfg).final.resultado.code, 'horario_indisponivel');
  // cancelar conjunto: um DELETE por item, resultado por item
  const ofA = { tipo: 'agendamento', itens: ['1', '2'].map((id) => ({ id, rotulo: 'x', valor: { idAgenda: `a${id}`, horaInicio: `2026-10-20T1${id}:00:00`, idServico: 's1', servico: 'corte', idProfissional: TESTE, profissional: 'ZZ' } })) };
  const c1 = g.bvGPlano(entrada({ operacao: 'cancelar', id_opcoes_agendamentos: ['1', '2'] }), ctxOp(ofA, { idCliente: 'c1' }), cfg).final;
  assert.equal(c1.efeitos.proposta_nova.acao, 'cancelar_conjunto');
  const pc = f2({ operacao: 'cancelar' }, prop('cancelar_conjunto', c1.efeitos.proposta_nova.dados));
  assert.equal(pc.reqs[0].path, '/agenda/a1');
  const pc2 = g.bvGPasso(pc.st, [ok({ sucesso: true })], cfg);
  assert.equal(pc2.reqs[0].path, '/agenda/a2');
  assert.equal(g.bvGPasso(pc2.st, [ok({ sucesso: true })], cfg).final.efeitos.proposta_upd.estado, 'executada');
}

// ---- FASE 3: terceiros (u17-u24) ----
{
  const lista = [{ idCliente: 'p1', nomeCliente: 'Paulo', sobrenomeCliente: 'Souza', celular: '11999998888', email: 'a@b.c', documento: '123' },
    { idCliente: 'p2', nomeCliente: 'Paula', sobrenomeCliente: 'Lima', celular: '11977776666' }];
  // u17: rotulos so com nome e sobrenome; escolher no mesmo turno recusado
  assert.equal(g.bvGPlano(entrada({ operacao: 'buscar_pessoa', nome: 'Paulo' }), ctxOp({}), cfg).final.resultado.code, 'nome_incompleto');
  const pb = g.bvGPlano(entrada({ operacao: 'buscar_pessoa', nome: 'Paulo Souza' }), ctxOp({}), cfg);
  assert.deepEqual(pb.reqs[0].qs, { busca: 'Paulo Souza' });
  const rb = g.bvGPasso(pb.st, [ok(lista)], cfg).final;
  assert.deepEqual(rb.resultado.pessoas.map((x) => x.nome), ['Paulo Souza', 'Paula Lima']);
  assert.ok(!/999998888|977776666|a@b|123|p1/.test(JSON.stringify(rb.resultado))); // 3.4.5
  assert.ok(!JSON.stringify(rb.efeitos).includes('999998888'));
  assert.equal(rb.efeitos.pedido.busca_pessoa_turno, T2);
  const ctxP = ctxOp(rb.efeitos.opcoes, { idCliente: 'c1', ...rb.efeitos.pedido });
  assert.equal(g.bvGPlano(entrada({ operacao: 'escolher_pessoa', id_opcao: '1' }), ctxP, cfg).final.resultado.code, 'confirmacao_no_mesmo_turno');
  // tetos
  assert.equal(g.bvGPlano(entrada({ operacao: 'buscar_pessoa', nome: 'Paulo Souza' }), ctxOp({}, { buscas_pessoa: 3 }), cfg).final.resultado.code, 'limite_buscas');
  assert.equal(g.bvGPlano(entrada({ operacao: 'buscar_pessoa', nome: 'Paulo Souza' }), ctxOp({}, {}, { dia: { buscas: 5 } }), cfg).final.resultado.code, 'limite_buscas');
  // u22: mesmo celular do remetente (+5511999998888) -> ok, idCliente do terceiro
  const T3 = '44444444-4444-4444-8444-444444444444';
  const posterior = { ...ctxP, pedido: { ...ctxP.pedido, busca_pessoa_turno: T3 } };
  let rp = g.bvGPlano(entrada({ operacao: 'escolher_pessoa', id_opcao: '1' }), posterior, cfg).final;
  assert.equal(rp.resultado.ok, true);
  assert.equal(rp.efeitos.pedido.idCliente, 'p1');
  assert.equal(rp.efeitos.pedido.para_terceiro, true);
  assert.equal(rp.efeitos.pedido.idCliente_remetente, 'c1');
  // u21: celular diferente -> encaminhar_equipe, idCliente intocado, falha sem nome/celular, handoff
  rp = g.bvGPlano(entrada({ operacao: 'escolher_pessoa', id_opcao: '2' }), posterior, cfg).final;
  assert.equal(rp.resultado.code, 'encaminhar_equipe');
  assert.equal(rp.resultado.motivo, 'terceiro_outro_celular');
  assert.equal(rp.efeitos.pedido.idCliente, undefined);
  assert.equal(rp.efeitos.pedido.para_terceiro, undefined);
  assert.equal(rp.efeitos.pedido.handoff, true);
  assert.equal(rp.efeitos.handoff.queueId, 78);
  assert.equal(rp.efeitos.falha.motivo, 'encaminhar_equipe|terceiro_outro_celular');
  assert.ok(!/Paula|Lima|977776666/.test(JSON.stringify(rp.efeitos)));
  // sem celular no cadastro tambem encaminha (fail-closed)
  const sem = g.bvGPasso(pb.st, [ok([{ idCliente: 'p3', nomeCliente: 'Ana', sobrenomeCliente: 'Reis' }])], cfg).final;
  rp = g.bvGPlano(entrada({ operacao: 'escolher_pessoa', id_opcao: '1' }), { opcoes: sem.efeitos.opcoes, pedido: { idCliente: 'c1' } }, cfg).final;
  assert.equal(rp.resultado.motivo, 'terceiro_outro_celular');
  // conversa transferida: nenhuma ferramenta age
  assert.equal(g.bvGPlano(entrada({ operacao: 'meus_agendamentos' }), ctxOp({}, { idCliente: 'c1', handoff: true }), cfg).final.resultado.code, 'handoff_ativo');
  // sem resultado: guarda o nome buscado
  const vz = g.bvGPasso(pb.st, [ok([])], cfg).final;
  assert.equal(vz.efeitos.pedido.terceiro_sem_cadastro, 'Paulo Souza');
  // u18: cadastrar_terceiro com cadastroLiberado falso -> nenhuma chamada
  const ped = { idCliente: 'c1', terceiro_sem_cadastro: 'Paulo Souza' };
  let pt = g.bvGPlano(entrada({ operacao: 'cadastrar_terceiro', nome: 'Paulo Souza' }), ctxOp({}, ped), cfg);
  assert.equal(pt.final.resultado.code, 'cadastro_desabilitado');
  assert.equal(pt.reqs, undefined);
  assert.equal(g.bvGPlano(entrada({ operacao: 'cadastrar_terceiro', proposta_id: PID }), { pedido: ped, proposta: { id: PID, acao: 'cadastrar_terceiro', dados: { nome: 'Paulo Souza', celular: '11999998888' } } }, cfg).final.resultado.code, 'cadastro_desabilitado');
  // u19: liberado (mock), sem celular -> fase 1 so propoe; fase 2 POST com o celular do remetente
  pt = g.bvGPlano(entrada({ operacao: 'cadastrar_terceiro', nome: 'Paulo Souza' }), ctxOp({}, ped), aberto).final;
  assert.match(pt.resultado.resumo, /com o seu celular/);
  assert.equal(pt.efeitos.proposta_nova.dados.celular, '11999998888');
  assert.equal(g.bvGPlano(entrada({ operacao: 'cadastrar_terceiro', nome: 'Outro Nome' }), ctxOp({}, ped), aberto).final.resultado.code, 'busque_primeiro');
  assert.equal(g.bvGPlano(entrada({ operacao: 'cadastrar_terceiro', nome: 'Paulo Souza' }), ctxOp({}, ped, { dia: { cadastros: 1 } }), aberto).final.resultado.code, 'limite_cadastros');
  const f2t = g.bvGPlano(entrada({ operacao: 'cadastrar_terceiro', proposta_id: PID }), { pedido: ped, proposta: { id: PID, acao: 'cadastrar_terceiro', dados: pt.efeitos.proposta_nova.dados } }, aberto);
  assert.deepEqual(f2t.reqs[0].body, { nomeCliente: 'Paulo Souza', ddiCelular: '55', celular: '11999998888' });
  r = g.bvGPasso(f2t.st, [ok({ sucesso: true, idCliente: 'nv' })], aberto).final;
  assert.equal(r.efeitos.pedido.idCliente, 'nv');
  assert.equal(r.efeitos.pedido.cadastro_terceiro_feito, true);
  // u23: primeiro contato, mesmo nome completo com outro celular -> encaminha, sem POST
  const pcad = g.bvGPlano(entrada({ operacao: 'cadastrar_cliente', nome: 'Paulo  SOUZA' }), ctxOp({}, { cliente_sem_cadastro: true }), aberto);
  assert.equal(pcad.reqs[0].m, 'GET');
  rp = g.bvGPasso(pcad.st, [ok([{ idCliente: 'p9', nomeCliente: 'paulo', sobrenomeCliente: 'Souza', celular: '11955554444' }])], aberto).final;
  assert.equal(rp.resultado.motivo, 'nome_outro_celular');
  assert.equal(rp.efeitos.falha.motivo, 'encaminhar_equipe|nome_outro_celular');
  // u24: sem homonimo exato -> POST com o celular do WhatsApp; nome de uma palavra vai direto ao POST
  const po = g.bvGPasso(pcad.st, [ok([{ idCliente: 'p9', nomeCliente: 'Paulo', sobrenomeCliente: 'Souzinha', celular: '11955554444' }])], aberto);
  assert.equal(po.reqs[0].m, 'POST');
  assert.equal(po.reqs[0].body.celular, '11999998888');
  assert.equal(g.bvGPasso(po.st, [ok({ sucesso: true, idCliente: 'n2' })], aberto).final.efeitos.pedido.idCliente, 'n2');
  assert.equal(g.bvGPlano(entrada({ operacao: 'cadastrar_cliente', nome: 'Novo' }), ctxOp({}, { cliente_sem_cadastro: true }), aberto).reqs[0].m, 'POST');
}
console.log('graces.test.js ok');

// u20: laco de estagios com teto (FR-015).
{
  const p20 = g.bvGPlano(entrada({ operacao: 'identificar_cliente' }), null, cfg);
  assert.equal(p20.st.estagio, undefined);
  const esg = g.bvGPasso({ ...p20.st, estagio: 16 }, [ok([])], { ...cfg, graces: { max_estagios: 16 } }).final;
  assert.equal(esg.resultado.code, 'estagios_esgotados');
  assert.equal(esg.efeitos.falha.motivo, 'graces|estagios_esgotados');
  assert.equal(g.bvGPasso({ ...p20.st, estagio: 15 }, [ok([])], { ...cfg, graces: { max_estagios: 16 } }).final.resultado.encontrado, false);
}

// Normalizar tolera lista do modelo como texto ("1,2" ou JSON) e lista vazia (campo ausente).
assert.deepEqual(g.bvGNormalizar({ ...base, operacao: 'horarios_livres', data: '2026-10-20', id_opcoes_servicos: '1, 2' }, cfg).in.id_opcoes_servicos, ['1', '2']);
assert.deepEqual(g.bvGNormalizar({ ...base, operacao: 'horarios_livres', data: '2026-10-20', id_opcoes_servicos: '["1","2"]' }, cfg).in.id_opcoes_servicos, ['1', '2']);
assert.equal(g.bvGNormalizar({ ...base, operacao: 'horarios_livres', data: '2026-10-20', qualquer: true, id_opcoes_servicos: [] }, cfg).in.id_opcoes_servicos, undefined);
assert.equal(g.bvGNormalizar({ ...base, operacao: 'horarios_livres', data: '2026-10-20', id_opcoes_servicos: '1' }, cfg).resultado.code, 'entrada_invalida');

// SC-011: cadastrar_terceiro usa a trava propria (terceiroLiberado), independente de cadastroLiberado; limites diarios vem de ctx.dia.
{
  const ped = { idCliente: 'c1', terceiro_sem_cadastro: 'Paulo Souza' };
  const e = { operacao: 'cadastrar_terceiro', nome: 'Paulo Souza' };
  const so = { ...cfg, cadastroLiberado: true };
  assert.equal(g.bvGPlano(entrada(e), { opcoes: {}, pedido: ped }, so).final.resultado.code, 'cadastro_desabilitado');
  const so2 = { ...cfg, terceiroLiberado: true };
  assert.ok(g.bvGPlano(entrada(e), { opcoes: {}, pedido: ped }, so2).final.efeitos.proposta_nova);
  assert.equal(g.bvGPlano(entrada(e), { opcoes: {}, pedido: ped, dia: { cadastros: 1 } }, so2).final.resultado.code, 'limite_cadastros');
}

// ---- mensagens-agendadas: efeito `mensagens` e parametros $15..$17 ----
{
  const msgCfg = { confirmacao_hora: '18:00', lembrete_antes_min: 120, pos_depois_min: 60 };
  const agora = '2026-10-20T12:00:00Z';
  const dA = { idCliente: 'c1', idServico: 's1', servico: 'corte adulto', idProfissional: 'b1', barbeiro: 'R', data: '2026-10-22', hora: '14:00', valor: 85, minutos: 45 };
  const wr = () => { const pl = f2({ operacao: 'agendar' }, prop('agendar', dA)); return g.bvGPasso(pl.st, [ok({ horarios: ['14:00'] }), ok([])], cfg); };
  // agendar: efeito com idAgenda do POST, fim = inicio + minutos, profissional realmente reservado (o de teste, redirecionado)
  let r = g.bvGPasso(wr().st, [ok({ sucesso: true, idAgenda: 'n1' })], cfg).final;
  assert.deepEqual(r.efeitos.mensagens, { criar: [{ idAgenda: 'n1', idCliente: 'c1', idProfissional: TESTE, inicio: '2026-10-22T14:00:00', fim: '2026-10-22T14:45:00', servico: 'corte adulto', barbeiro: 'R', recorrente: false }], cancelar: [] });
  let pr = g.bvGParams({ contato_id: 1, turno_id: 't' }, r.efeitos, { ativo: true, agora, cfg: msgCfg, escrita: ['5511999998888'] });
  assert.equal(pr.length, 17);
  assert.deepEqual(JSON.parse(pr[14]).map((x) => x.tipo), ['confirmacao', 'lembrete', 'pos_atendimento']);
  assert.deepEqual(JSON.parse(pr[14])[1].dados, { servico: 'corte adulto', barbeiro: 'R', fim: '2026-10-22T14:45:00' });
  assert.equal(pr[16], '["5511999998888"]');
  // item 8: fora do TESTE (escrita null) nao ha trava fora_da_lista ($17 null); item 7: recorrente vai para dados (POST confirmacao com data)
  assert.equal(g.bvGParams({ contato_id: 1, turno_id: 't' }, r.efeitos, { ativo: true, agora, cfg: msgCfg, escrita: null })[16], null);
  const rr = { mensagens: { criar: [{ ...r.efeitos.mensagens.criar[0], recorrente: true }], cancelar: [] } };
  assert.equal(JSON.parse(g.bvGParams({ contato_id: 1, turno_id: 't' }, rr, { ativo: true, agora, cfg: msgCfg, escrita: [] })[14])[0].dados.recorrente, true);
  // inativo (PROD): nada programado
  pr = g.bvGParams({ contato_id: 1, turno_id: 't' }, r.efeitos, { ativo: false, agora, cfg: msgCfg });
  assert.deepEqual(pr.slice(14), [null, null, null]);
  // horario que ja passou vira linha com motivo, nunca pendente
  const hoje = { ...dA, data: '2026-10-20', hora: '09:00' };
  const m0 = g.bvGParams({ contato_id: 1, turno_id: 't' }, { mensagens: { criar: [{ idAgenda: 'n', idCliente: 'c', idProfissional: 'p', inicio: '2026-10-20T09:00:00', fim: '2026-10-20T09:45:00', servico: 's', barbeiro: 'b' }], cancelar: [] } }, { ativo: true, agora, cfg: msgCfg });
  assert.deepEqual(JSON.parse(m0[14]).map((x) => [x.tipo, x.motivo]), [['pos_atendimento', null], ['confirmacao', 'ja_passou'], ['lembrete', 'ja_passou']]);
  // 5xx incerto verificado: idAgenda vem da releitura
  const v = g.bvGPasso(wr().st, [resp(0)], cfg);
  r = g.bvGPasso(v.st, [ok([{ idAgenda: 'n9', idServico: 's1', idProfissional: TESTE, horaInicio: '2026-10-22T14:00:00' }])], cfg).final;
  assert.equal(r.efeitos.mensagens.criar[0].idAgenda, 'n9');
  // cancelar: so cancela as pendentes
  const pc = f2({ operacao: 'cancelar' }, prop('cancelar', dadosCanc));
  r = g.bvGPasso(pc.st, [ok({ sucesso: true })], cfg).final;
  assert.deepEqual(r.efeitos.mensagens, { criar: [], cancelar: [{ idAgenda: dadosCanc.idAgenda, motivo: 'cancelada_agente' }] });
  // falha na Graces: nenhum efeito em mensagens
  r = g.bvGPasso(wr().st, [resp(409, { code: 'CONFLITO' })], cfg).final;
  assert.equal(r.efeitos.mensagens, undefined);
}
