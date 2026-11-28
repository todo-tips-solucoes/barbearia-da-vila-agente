const assert = require('node:assert/strict');
const g = require('../workflows/shared/graces.js');
const TESTE = '1cee0bb9-e58b-4428-9e9b-1db184db7943';
const cfg = { ambiente: 'integracao', redirecionar: true, testeId: TESTE, cadastroLiberado: false, lista: { max_itens: 10, max_titulo: 24 } };
const T1 = '11111111-1111-4111-8111-111111111111', T2 = '22222222-2222-4222-8222-222222222222';
const base = { contato_id: '7', telefone: '+5511999998888', turno_id: T2, ambiente: 'integracao' };
const entrada = (o) => { const n = g.bvGNormalizar({ ...base, ...o }, cfg); assert.ok(n.ok, JSON.stringify(n)); return n.in; };
const resp = (status, body) => ({ status, body });
const ok = (arr) => resp(200, arr);
// Proposta de agendar (item 12): antes do resumo ha um estagio de leitura do pacote; aqui a agenda responde "nenhum pacote".
const semPacote = (p) => (p.reqs && p.reqs.every((q) => q.path === '/agenda/pacotes') ? g.bvGPasso(p.st, p.reqs.map(() => ok([])), cfg) : p);

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
// 1 cliente: identificado ja no 1o estagio do pedido; o nome do cliente e so a 1a palavra do nomeCliente
let st1 = g.bvGPasso(p.st, [ok([{ idCliente: 'c1', nomeCliente: 'Ana Paula', sobrenomeCliente: 'Souza' }])], cfg);
// 26/11/2026: o historico cobre as 5 visitas do habitual (10 linhas por visita; antes 10 no total, so a ultima visita)
assert.deepEqual(st1.reqs, [{ m: 'GET', path: '/agenda/historico', qs: { idCliente: 'c1', pageSize: 50 } }, { m: 'GET', path: '/agenda/agendamentos', qs: { idCliente: 'c1', proximos: true } }]);
// historico com falha ou vazio: segue identificado, sem sugestao
r = g.bvGPasso(st1.st, [resp(500, { code: 'ERRO_INTERNO' })], cfg).final;
assert.equal(r.efeitos.pedido.idCliente, 'c1');
assert.equal(r.efeitos.pedido.cliente_nome, 'Ana');
assert.equal(r.efeitos.pedido.identificado, true);
assert.equal(r.efeitos.pedido.ultimo, null);
assert.ok(!JSON.stringify(r.resultado).includes('c1'));
assert.equal(g.bvGPasso(st1.st, [ok([])], cfg).final.resultado.nome, 'Ana');
// agendamentos futuros (revisao de 17/11): lidos junto do historico, vao ao pedido e ao resultado; falha na leitura = lista vazia
assert.deepEqual(r.efeitos.pedido.futuros, []);
const FUT = [{ idAgenda: 'ag1', idServico: 's1', horaInicio: '2026-11-20T15:00:00', descricaoServico: 'corte adulto', idProfissional: 'b1', profissional: 'Pedro' }];
r = g.bvGPasso(st1.st, [ok([]), ok(FUT)], cfg).final;
// o barbeiro vai so pelo id (o nome nunca entra nos futuros); sem horaFim na resposta, sem a chave `fim`
assert.deepEqual(r.efeitos.pedido.futuros, [{ idAgenda: 'ag1', idServico: 's1', horaInicio: '2026-11-20T15:00:00', servico: 'corte adulto', idProfissional: 'b1' }]);
assert.deepEqual(g.bvGPasso(st1.st, [ok([]), ok([{ ...FUT[0], horaFim: '2026-11-20T15:40:00' }])], cfg).final.efeitos.pedido.futuros[0].fim, '15:40');
assert.ok(!JSON.stringify(r.efeitos.pedido.futuros).includes('Pedro'));
assert.deepEqual(r.resultado.futuros, [{ servico: 'corte adulto', horaInicio: '2026-11-20T15:00:00' }]); // ao modelo so o servico e o inicio; ids e barbeiro ficam no pedido
// em PROD o agendamento com o barbeiro de teste nao aparece para cliente comum
assert.deepEqual(g.bvGPasso(st1.st, [ok([]), ok([{ ...FUT[0], idProfissional: TESTE }])], { ...cfg, ambiente: 'producao' }).final.efeitos.pedido.futuros, []);
// historico: mais recente primeiro; confere servico no catalogo e barbeiro do servico
const H = [{ idServico: '046519b1-e111-44b4-8779-3e64366f9d8f', descricaoServico: 'corte adulto', idProfissional: 'b1', profissional: 'Pedro Henrique ' }, { idServico: '23f2faf7-e848-45e3-b822-ef16af69a2df', idProfissional: 'b2' }];
const st2 = g.bvGPasso(st1.st, [ok(H)], cfg);
assert.deepEqual(st2.reqs.map((q) => [q.path, q.qs]), [['/agenda/servicos', {}], ['/servicos/profissionais', { idServico: H[0].idServico }]]);
const CAT = ok([{ idServico: H[0].idServico, descricaoAgenda: 'corte adulto', valorPadrao: 85, tempoPadrao: 40, ativo: true }]);
r = g.bvGPasso(st2.st, [CAT, ok([{ idProfissional: 'b1', apelido: 'Pedro Henrique ' }, { idProfissional: TESTE, apelido: 'ZZ' }])], cfg).final;
assert.deepEqual(r.efeitos.pedido.ultimo, { servico: { idServico: H[0].idServico, nome: 'corte adulto', preco: 85, minutos: 40, opcao_id: 'ult' }, barbeiro: { idProfissional: 'b1', apelido: 'Pedro Henrique' } });
assert.deepEqual(r.resultado.ultimo, { servico: 'corte adulto', barbeiro: 'Pedro Henrique' });
const pedUlt = r.efeitos.pedido;
assert.deepEqual(g.bvGPasso(g.bvGPasso(st1.st, [ok(H), ok(FUT)], cfg).st, [CAT, ok([])], cfg).final.efeitos.pedido.futuros.map((a) => a.idAgenda), ['ag1']); // os futuros atravessam o estagio do catalogo
// barbeiro que nao faz mais o servico: so o servico; servico fora do catalogo (ou "2a vez"): sem sugestao
assert.equal(g.bvGPasso(st2.st, [CAT, ok([{ idProfissional: 'b9', apelido: 'Kiel' }])], cfg).final.efeitos.pedido.ultimo.barbeiro, null);
assert.equal(g.bvGPasso(st2.st, [ok([{ idServico: H[0].idServico, descricaoAgenda: 'corte 2ª vez', ativo: true }]), ok([])], cfg).final.efeitos.pedido.ultimo, null);
assert.equal(g.bvGPasso(st2.st, [resp(500, {}), resp(500, {})], cfg).final.efeitos.pedido.ultimo, null);
// historico com o barbeiro de teste: nunca sugerido a cliente comum
assert.equal(g.bvGPasso(st2.st, [CAT, ok([{ idProfissional: 'b1', apelido: 'ZZ TESTE INTEGRACAO' }])], cfg).final.efeitos.pedido.ultimo.barbeiro, null);
r = g.bvGPasso(p.st, [ok([{ idCliente: 'c1', nomeCliente: 'Ana' }, { idCliente: 'c2', nomeCliente: 'Ana Maria' }])], cfg).final;
assert.equal(r.efeitos.opcoes.tipo, 'cliente');
assert.equal(r.efeitos.pedido.identificado, true);
assert.ok(!JSON.stringify(r.resultado).includes('c2'));
const ctxOp = (opcoes, pedido = {}, extra = {}) => ({ opcoes, pedido, ...extra });
assert.equal(g.bvGPlano(entrada({ operacao: 'escolher_cliente', id_opcao: '2' }), ctxOp(r.efeitos.opcoes), cfg).final.efeitos.pedido.idCliente, 'c2');
assert.equal(g.bvGPlano(entrada({ operacao: 'escolher_cliente', id_opcao: '9' }), ctxOp(r.efeitos.opcoes), cfg).final.resultado.code, 'opcao_desconhecida');

// cadastrar_cliente (owner, 2026-11-14): nome e sobrenome separados, celular do contato, genero M, nascimento opcional.
assert.equal(g.bvGPlano(entrada({ operacao: 'cadastrar_cliente', nome: 'Novo Cliente' }), ctxOp({}, { cliente_sem_cadastro: true }), cfg).final.resultado.code, 'cadastro_desabilitado');
const aberto = { ...cfg, cadastroLiberado: true };
const prodCad = { ...aberto, redirecionar: false };
assert.equal(g.bvGPlano(entrada({ operacao: 'cadastrar_cliente', nome: 'Novo Cliente' }), ctxOp({}, {}), prodCad).final.resultado.code, 'identifique_primeiro');
for (const nome of ['Novo', 'joão da', '  Ana  ']) assert.equal(g.bvGPlano(entrada({ operacao: 'cadastrar_cliente', nome }), ctxOp({}, { cliente_sem_cadastro: true }), prodCad).final.resultado.code, 'nome_incompleto', nome);
assert.equal(entrada({ operacao: 'cadastrar_cliente', nome: 'A B', nascimento: '3/5/1990' }).nascimento, '1990-05-03');
assert.equal(entrada({ operacao: 'cadastrar_cliente', nome: 'A B', nascimento: 'não informado' }).nascimento, undefined);
for (const nascimento of ['31/02/1990', '1990-02-30', '1899-12-31', '2999-01-01', '1990']) assert.equal(g.bvGNormalizar({ ...base, operacao: 'cadastrar_cliente', nome: 'A B', nascimento }, cfg).resultado.code, 'entrada_invalida', nascimento);
assert.equal(g.bvGNormalizar({ ...base, operacao: 'cadastrar_cliente', nome: 'A B', como_conheceu: 'x'.repeat(81) }, cfg).resultado.code, 'entrada_invalida');
p = g.bvGPlano(entrada({ operacao: 'cadastrar_cliente', nome: 'joão PEDRO DA silva', nascimento: '1990-05-13', como_conheceu: 'Instagram' }), ctxOp({}, { cliente_sem_cadastro: true }), prodCad);
assert.deepEqual(p.reqs[0].qs, { busca: 'João Pedro da Silva' }); // homonimo com outro celular antes do POST
let stc = g.bvGPasso(p.st, [ok([])], prodCad);
assert.deepEqual(stc.reqs[0].body, { nomeCliente: 'João', sobrenomeCliente: 'Pedro da Silva', ddiCelular: '55', celular: '11999998888', genero: 'M', dataNascimento: '1990-05-13' });
r = g.bvGPasso(stc.st, [ok({ sucesso: true, idCliente: 'n1' })], prodCad).final;
assert.deepEqual(r.efeitos.pedido, { idCliente: 'n1', cliente_sem_cadastro: false, cliente_nome: 'João', identificado: true });
assert.equal(g.bvGParams(base, r.efeitos)[17], 'Instagram'); // como_conheceu -> contatos ($18)
assert.equal(g.bvGParams(base, r.efeitos).length, 18);
assert.equal(g.bvGPasso(stc.st, [ok({ sucesso: false, mensagem: 'x' })], prodCad).final.resultado.ok, false);
// sem nascimento: nao manda o campo; nome com grafia propria fica como escrito
p = g.bvGPlano(entrada({ operacao: 'cadastrar_cliente', nome: 'Ana McDonald' }), ctxOp({}, { cliente_sem_cadastro: true }), prodCad);
stc = g.bvGPasso(p.st, [ok([])], prodCad);
assert.deepEqual(stc.reqs[0].body, { nomeCliente: 'Ana', sobrenomeCliente: 'McDonald', ddiCelular: '55', celular: '11999998888', genero: 'M' });
// mesmo nome completo com outro celular: nao cadastra, encaminha
assert.equal(g.bvGPasso(p.st, [ok([{ idCliente: 'x', nomeCliente: 'Ana', sobrenomeCliente: 'McDonald', celular: '11911112222' }])], prodCad).final.resultado.code, 'encaminhar_equipe');
// TESTE (redirecionar): nada vai a Graces, a conversa vira o cliente de teste
const testeCad = { ...cfg, cadastroLiberado: true, clienteTesteId: 'ct-1' };
r = g.bvGPlano(entrada({ operacao: 'cadastrar_cliente', nome: 'Novo Cliente', como_conheceu: 'indicação' }), ctxOp({}, { cliente_sem_cadastro: true }), testeCad).final;
assert.equal(r.efeitos.pedido.idCliente, 'ct-1');
assert.equal(r.efeitos.contato.como_conheceu, 'indicação');
assert.equal(g.bvGPlano(entrada({ operacao: 'cadastrar_cliente', nome: 'Novo Cliente' }), ctxOp({}, { cliente_sem_cadastro: true }), { ...testeCad, clienteTesteId: '' }).final.resultado.code, 'cadastro_desabilitado');

// horarios_livres pelo ultimo atendimento: sem servico nem barbeiro escolhidos, usa os do historico
p = g.bvGPlano(entrada({ operacao: 'horarios_livres', data: '2026-10-20', hora: '15:00' }), ctxOp({}, pedUlt), cfg);
assert.deepEqual(p.reqs.map((q) => [q.path, q.qs.idServico, q.qs.idProfissional]), [['/agenda/horarios-livres', H[0].idServico, 'b1'], ['/agenda/horarios', H[0].idServico, 'b1']]);
r = g.bvGPasso(p.st, [ok({ minutos: 40, horarios: ['14:20', '15:00', '15:40'] }), resp(500, {})], cfg).final;
assert.equal(r.resultado.horario_pedido_livre, '2'); // hora exata livre: direto ao resumo
assert.match(r.resultado.orientacao, /chame agendar com id_opcao_horario 2/);
assert.equal(r.efeitos.pedido.servico.nome, 'corte adulto');
assert.equal(g.bvGPasso(p.st, [ok({ minutos: 40, horarios: ['14:20', '15:40'] }), resp(500, {})], cfg).final.resultado.horario_pedido_livre, undefined);
// outro servico escolhido: o barbeiro do ultimo atendimento nao vale para ele
assert.equal(g.bvGPlano(entrada({ operacao: 'horarios_livres', data: '2026-10-20' }), ctxOp({}, { ...pedUlt, servico: { idServico: 's9', nome: 'barba' } }), cfg).final.resultado.code, 'barbeiro_nao_escolhido');
// ultimo atendimento sem barbeiro: pede o barbeiro
assert.equal(g.bvGPlano(entrada({ operacao: 'horarios_livres', data: '2026-10-20' }), ctxOp({}, { ...pedUlt, ultimo: { ...pedUlt.ultimo, barbeiro: null } }), cfg).final.resultado.code, 'barbeiro_nao_escolhido');

// listar_servicos: sem "2a vez" nem inativos; listar_barbeiros: trim e sem o de teste.
p = g.bvGPlano(entrada({ operacao: 'listar_servicos' }), null, cfg);
r = g.bvGPasso(p.st, [ok([{ idServico: 's1', descricaoAgenda: 'corte adulto', tempoPadrao: 40, valorPadrao: 85, ativo: true }, { idServico: 's2', descricaoAgenda: 'corte 2ª vez', valorPadrao: 50 }, { idServico: 's3', descricaoAgenda: 'barba', ativo: false }])], cfg).final;
assert.deepEqual(r.resultado.servicos.map((s) => s.nome), ['corte adulto']);
const opcoesServ = r.efeitos.opcoes;
p = g.bvGPlano(entrada({ operacao: 'listar_barbeiros', id_opcao_servico: 's1' }), ctxOp(opcoesServ), cfg);
assert.deepEqual(p.reqs[0].qs, { idServico: 's1' });
r = g.bvGPasso(p.st, [ok([{ idProfissional: 'b1', apelido: 'Rodrigo ' }, { idProfissional: TESTE, apelido: 'Zé' }, { idProfissional: 'b3', apelido: 'X', nomeCompleto: 'ZZ TESTE INTEGRACAO - NAO AGENDAR' }, { idProfissional: 'b2', apelido: 'Kiel' }])], cfg).final;
assert.deepEqual(r.resultado.barbeiros.map((b) => b.nome), ['Rodrigo', 'Kiel', 'Qualquer barbeiro']); // com 2 ou mais, a lista traz a opcao de qualquer um
assert.deepEqual(r.efeitos.opcoes.itens[2].valor, { qualquer: true });
assert.deepEqual(r.efeitos.pedido.barbeiros.map((b) => b.apelido), ['Rodrigo', 'Kiel']); // so barbeiro de verdade entra no pedido
let pedido = r.efeitos.pedido, opcoesBarb = r.efeitos.opcoes;
assert.ok(!JSON.stringify(r).includes(TESTE));

// horarios_livres: um pedido por barbeiro real no "qualquer"; dia fechado e lotado.
const ctxH = ctxOp(opcoesBarb, pedido);
p = g.bvGPlano(entrada({ operacao: 'horarios_livres', qualquer: true, data: '2026-10-20' }), ctxH, cfg);
assert.deepEqual(p.reqs.map((q) => q.path), ['/agenda/horarios-livres', '/agenda/horarios-livres', '/agenda/horarios', '/agenda/horarios']); // grades, depois ocupacoes
assert.ok(p.reqs.every((q) => q.qs.idServico === 's1' && q.qs.idProfissional !== TESTE));
r = g.bvGPasso(p.st, [ok({ minutos: 40, horarios: ['14:00', '14:40'] }), ok({ minutos: 40, horarios: ['14:00', '15:20'] })], cfg).final;
assert.deepEqual(r.resultado.opcoes.map((o) => o.hora), ['14:00', '14:40', '15:20']);
assert.equal(r.resultado.total, 3);
assert.equal(g.bvGPasso(p.st, [resp(400, { code: 'PARAMETRO_INVALIDO' }), resp(400, {})], cfg).final.resultado.orientacao, 'dia fechado ou fora do prazo; sugira outro dia');
assert.match(g.bvGPasso(p.st, [ok({ horarios: [] }), ok({ horarios: [] })], cfg).final.resultado.orientacao, /lotado/);
const opcoesHora = r.efeitos.opcoes;
// periodo (suite R1): pediu tarde, so horarios de 12:00 a 17:59; nada no periodo vira orientacao, nao "dia lotado"
p = g.bvGPlano(entrada({ operacao: 'horarios_livres', qualquer: true, data: '2026-10-20', periodo: 'tarde' }), ctxH, cfg);
r = g.bvGPasso(p.st, [ok({ minutos: 40, horarios: ['08:00', '11:40', '12:00', '17:20', '18:00'] }), ok({ minutos: 40, horarios: [] })], cfg).final;
assert.deepEqual(r.resultado.opcoes.map((o) => o.hora), ['12:00', '17:20']);
r = g.bvGPasso(p.st, [ok({ minutos: 40, horarios: ['08:00'] }), ok({ minutos: 40, horarios: [] })], cfg).final;
assert.match(r.resultado.orientacao, /^sem horário livre de tarde nesse dia\. Diga isso e pergunte o que ele prefere; as opções vão em lista junto$/);
assert.deepEqual([r.efeitos.opcoes.tipo, r.resultado.opcoes.map((o) => o.rotulo)], ['decisao_sem_horario', ['Outro horário no dia', 'Outro dia']]); // todos consultados: sem "outros barbeiros"
{ // dia lotado (ninguem tem horario): pergunta aberta, sem lista de decisao
  const lot = g.bvGPasso(p.st, [ok({ horarios: [] }), ok({ horarios: [] })], cfg).final;
  assert.deepEqual([lot.resultado.orientacao, lot.efeitos.opcoes.tipo, lot.efeitos.opcoes.itens.length], ['dia lotado; sugira outro dia', 'horario', 0]);
}
{ // "Qualquer barbeiro" escolhido na lista de barbeiros vale como qualquer=true
  const pq = g.bvGPlano(entrada({ operacao: 'horarios_livres', id_opcao_barbeiro: '3', data: '2026-10-20' }), ctxH, cfg);
  const pt = g.bvGPlano(entrada({ operacao: 'horarios_livres', qualquer: true, data: '2026-10-20' }), ctxH, cfg);
  assert.deepEqual(pq.reqs, pt.reqs);
  assert.deepEqual([pq.st.in.qualquer, pq.st.in.id_opcao_barbeiro], [true, undefined]);
  // a mesma busca pelo item "Qualquer barbeiro", repetida no turno (retentativa do agente), roda de novo
  const fq = g.bvGPasso(pq.st, [ok({ minutos: 40, horarios: ['10:00'] }), ok({ minutos: 40, horarios: ['11:00'] }), resp(500, {}), resp(500, {})], cfg).final;
  const ctxQ = { opcoes: fq.efeitos.opcoes, pedido: { ...pedido, ...fq.efeitos.pedido } };
  assert.ok(Array.isArray(g.bvGPlano(entrada({ operacao: 'horarios_livres', id_opcao_barbeiro: '3', data: '2026-10-20' }), ctxQ, cfg).reqs)); // a oferta ja e a de horarios: o item vale pelo pedido
}
assert.equal(g.bvGNormalizar({ ...base, operacao: 'horarios_livres', qualquer: true, data: '2026-10-20', periodo: 'madrugada' }, cfg).resultado.code, 'entrada_invalida');
assert.equal(g.bvGNormalizar({ ...base, operacao: 'horarios_livres', qualquer: true, data: '2026-10-20', periodo: '' }, cfg).ok, true);
// hora aproximada (owner, 2026-10-28): so inicios ate 60 min da hora dita; sem nenhum, os 2 mais proximos de cada lado, com aviso
p = g.bvGPlano(entrada({ operacao: 'horarios_livres', qualquer: true, data: '2026-10-20', hora: '14:00' }), ctxH, cfg);
r = g.bvGPasso(p.st, [ok({ minutos: 40, horarios: ['08:00', '12:40', '13:20', '14:00', '15:20', '18:00'] }), ok({ minutos: 40, horarios: ['14:40'] })], cfg).final;
assert.deepEqual(r.resultado.opcoes.map((o) => o.hora), ['13:20', '14:00', '14:40']);
assert.equal(r.resultado.total, 3);
assert.ok(!/mais próximos/.test(r.resultado.orientacao || ''));
r = g.bvGPasso(p.st, [ok({ minutos: 40, horarios: ['08:00', '08:40', '09:20', '17:20', '18:00', '18:40'] }), ok({ minutos: 40, horarios: [] })], cfg).final;
assert.deepEqual(r.resultado.opcoes.map((o) => o.hora), ['08:40', '09:20', '17:20', '18:00']);
assert.match(r.resultado.orientacao, /não há horário perto das 14:00.*mais próximos.*quem_tem_horario/);
assert.match(g.bvGPasso(p.st, [ok({ horarios: [] }), ok({ horarios: [] })], cfg).final.resultado.orientacao, /lotado/);
p = g.bvGPlano(entrada({ operacao: 'horarios_livres', qualquer: true, data: '2026-10-20', periodo: 'tarde', hora: '12:30' }), ctxH, cfg);
r = g.bvGPasso(p.st, [ok({ minutos: 40, horarios: ['11:20', '12:00', '13:20', '14:00'] }), ok({ horarios: [] })], cfg).final;
assert.deepEqual(r.resultado.opcoes.map((o) => o.hora), ['12:00', '13:20']);
assert.equal(g.bvGNormalizar({ ...base, operacao: 'horarios_livres', qualquer: true, data: '2026-10-20', hora: '25:00' }, cfg).resultado.code, 'entrada_invalida');
assert.equal(g.bvGNormalizar({ ...base, operacao: 'horarios_livres', qualquer: true, data: '2026-10-20', hora: '9:00' }, cfg).resultado.code, 'entrada_invalida');
// Encaixe (owner, 2026-10-28, ajuste 2): a loja lancou 09:30-10:50 fora da grade de 40; 10:50 cabe ate 11:30 e entra;
// 14:00 (fim do bloqueio) nao cabe (outro bloqueio em 14:00); 19:00 nao cabe (fecha 19:30); 07:50 fica antes do 1o inicio da grade.
p = g.bvGPlano(entrada({ operacao: 'horarios_livres', id_opcao_barbeiro: '2', data: '2026-10-20' }), ctxH, cfg);
const grade = ok({ minutos: 40, funcionamento: { horaInicio: '08:00', horaFim: '19:30' }, horarios: ['08:00', '08:40', '11:20', '12:00'] });
const ocup = ok({ minutos: 40, horarios: [{ horaInicio: '07:00', horaFim: '07:50', tipo: 2 }, { horaInicio: '09:30', horaFim: '10:50', tipo: 1 }, { horaInicio: '12:40', horaFim: '14:00', tipo: 2 }, { horaInicio: '14:00', horaFim: '18:20', tipo: 2 }, { horaInicio: '18:20', horaFim: '19:00', tipo: 1 }] });
r = g.bvGPasso(p.st, [grade, ocup], cfg).final;
assert.deepEqual(r.resultado.opcoes.map((o) => o.hora), ['08:00', '08:40', '10:50', '11:20', '12:00']);
assert.equal(r.efeitos.opcoes.itens.find((x) => x.valor.hora === '10:50').valor.minutos, 40);
// ocupacoes sem 200, grade sem funcionamento ou grade vazia: fica so a grade (nunca supoe livre)
assert.deepEqual(g.bvGPasso(p.st, [grade, resp(500, {})], cfg).final.resultado.opcoes.map((o) => o.hora), ['08:00', '08:40', '11:20', '12:00']);
assert.deepEqual(g.bvGPasso(p.st, [ok({ minutos: 40, horarios: ['08:00'] }), ocup], cfg).final.resultado.opcoes.map((o) => o.hora), ['08:00']);
assert.match(g.bvGPasso(p.st, [ok({ minutos: 40, funcionamento: { horaFim: '19:30' }, horarios: [] }), ocup], cfg).final.resultado.orientacao, /lotado/);
// periodo e hora valem tambem para o encaixe
p = g.bvGPlano(entrada({ operacao: 'horarios_livres', id_opcao_barbeiro: '2', data: '2026-10-20', hora: '11:00' }), ctxH, cfg);
assert.deepEqual(g.bvGPasso(p.st, [grade, ocup], cfg).final.resultado.opcoes.map((o) => o.hora), ['10:50', '11:20', '12:00']);
const comBarbeiro = entrada({ operacao: 'horarios_livres', id_opcao_barbeiro: '2', data: '2026-10-20' });
assert.equal(g.bvGPlano(comBarbeiro, ctxH, cfg).reqs.length, 2);
assert.equal(g.bvGPlano(entrada({ operacao: 'horarios_livres', id_opcao_barbeiro: '99', data: '2026-10-20' }), ctxH, cfg).final.resultado.code, 'opcao_desconhecida');

// Memoria do barbeiro (teste do owner, 2026-10-22): escolheu o Kiel, trocou o servico e nao precisa escolher de novo.
{
  const pl = g.bvGPlano(comBarbeiro, ctxH, cfg);
  const rb = g.bvGPasso(pl.st, [ok({ minutos: 40, horarios: ['10:00'] })], cfg).final;
  assert.deepEqual(rb.efeitos.pedido.barbeiro, { idProfissional: 'b2', apelido: 'Kiel' });
  assert.equal(rb.resultado.por_barbeiro, undefined);
  const ped = { ...pedido, ...rb.efeitos.pedido, servico: { idServico: 's9', nome: 'barba', opcao_id: '3' } }; // conversas.pedido || efeitos
  const sem = g.bvGPlano(entrada({ operacao: 'horarios_livres', data: '2026-10-21', turno_id: '33333333-3333-4333-8333-333333333333' }), ctxOp({}, ped), cfg); // turno seguinte: no mesmo turno vale a primeira busca
  assert.deepEqual(sem.reqs.map((q) => [q.qs.idProfissional, q.qs.idServico]), [['b2', 's9'], ['b2', 's9']]); // grade + ocupacoes
  assert.equal(g.bvGPlano(entrada({ operacao: 'horarios_livres', data: '2026-10-21' }), ctxOp({}, pedido), cfg).final.resultado.code, 'barbeiro_nao_escolhido');
  const lb = g.bvGPlano(entrada({ operacao: 'listar_barbeiros', id_opcao_servico: '3' }), ctxOp({}, ped), cfg);
  const fala = (lista) => g.bvGPasso(lb.st, [ok(lista)], cfg).final.resultado.orientacao;
  assert.match(fala([{ idProfissional: 'b1', apelido: 'Rodrigo' }, { idProfissional: 'b2', apelido: 'Kiel' }]), /já escolheu Kiel/);
  assert.match(fala([{ idProfissional: 'b1', apelido: 'Rodrigo' }]), /Kiel, que o cliente escolheu, não faz/);
}

// funcionamento (suite-validacao R3): so leitura de /agenda/configuracao, sem cliente identificado; dia fora da lista vira contato da loja.
p = g.bvGPlano(entrada({ operacao: 'funcionamento' }), ctxOp({}, {}), cfg);
assert.deepEqual(p.reqs, [{ m: 'GET', path: '/agenda/configuracao' }]);
r = g.bvGPasso(p.st, [ok({ prazoMinimoAntecedencia: 0, horarios: [{ dia: 'Domingo', horaInicio: '08:00', horaFim: '16:00' }, null] })], cfg).final;
assert.deepEqual(r.resultado.horarios, [{ dia: 'Domingo', abre: '08:00', fecha: '16:00' }]);
assert.match(g.bvGPasso(p.st, [ok({})], cfg).final.resultado.orientacao, /ofereça passar para a equipe/);
assert.equal(g.bvGPasso(p.st, [resp(500, {})], cfg).final.resultado.ok, false);

// meus_agendamentos: usa so pedido.idCliente (FR-020); nunca /agenda/completa.
assert.equal(g.bvGPlano(entrada({ operacao: 'meus_agendamentos' }), ctxOp({}, { cliente_sem_cadastro: true }), cfg).final.resultado.code, 'cliente_nao_identificado');
// sem cliente na sessao: identifica e lista no mesmo passo (R8); 0 cadastros devolve a identificacao
p = g.bvGPlano(entrada({ operacao: 'meus_agendamentos' }), ctxOp({}, {}), cfg);
assert.deepEqual(p.reqs[0].qs, { celular: '5511999998888' });
assert.equal(g.bvGPasso(p.st, [ok([])], cfg).final.resultado.encontrado, false);
let pi = g.bvGPasso(p.st, [ok([{ idCliente: 'c9', nomeCliente: 'Ana' }])], cfg);
assert.deepEqual(pi.reqs[0], { m: 'GET', path: '/agenda/agendamentos', qs: { idCliente: 'c9', proximos: true } });
r = g.bvGPasso(pi.st, [ok([])], cfg).final;
assert.equal(r.efeitos.pedido.idCliente, 'c9');
assert.equal(r.resultado.nome, 'Ana');
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
p = semPacote(g.bvGPlano(entrada({ operacao: 'agendar', id_opcao_horario: '1' }), ctxE(opcoesHora), cfg));
assert.ok(!p.reqs && p.final.efeitos.proposta_nova.acao === 'agendar' && p.final.resultado.aguardando_confirmacao);
const dadosAg = p.final.efeitos.proposta_nova.dados;
assert.equal(dadosAg.hora, '14:00');
p = g.bvGPlano(entrada({ operacao: 'cancelar', id_opcao_agendamento: '1' }), ctxE(opcoesAg), cfg);
assert.equal(p.final.resultado.sugerir_remarcar, true);
assert.deepEqual(p.final.efeitos.opcoes.itens.map((x) => x.valor), ['remarcar', 'cancelar']); // R7: decisao por lista
const dadosCanc = p.final.efeitos.proposta_nova.dados;
// horarios_livres com o agendamento e sem barbeiro: barbeiros do servico no mesmo passo, sem o de teste (R8)
p = g.bvGPlano(entrada({ operacao: 'horarios_livres', id_opcao_agendamento: '1', data: '2026-10-26' }), ctxE(opcoesAg), cfg);
assert.deepEqual(p.reqs, [{ m: 'GET', path: '/servicos/profissionais', qs: { idServico: 's1' } }]);
pi = g.bvGPasso(p.st, [ok([{ idProfissional: TESTE, apelido: 'Zé' }, { idProfissional: 'b2', apelido: 'Kiel ' }])], cfg);
assert.deepEqual(pi.reqs, [{ m: 'GET', path: '/agenda/horarios-livres', qs: { idServico: 's1', idProfissional: 'b2', data: '2026-10-26' } }, { m: 'GET', path: '/agenda/horarios', qs: { idServico: 's1', idProfissional: 'b2', data: '2026-10-26' } }]);
r = g.bvGPasso(pi.st, [ok({ minutos: 40, horarios: ['10:00'] })], cfg).final;
assert.deepEqual(r.resultado.opcoes, [{ id: '1', hora: '10:00', barbeiro: 'Kiel' }]);
assert.equal(r.efeitos.opcoes.itens[0].valor.idServico, 's1');
// C7 (2026-10-25): o modelo chama meus_agendamentos de novo antes de reagendar; a oferta troca, mas o horario mostrado continua valendo
const oHoraRe = r.efeitos.opcoes;
const pm = g.bvGPasso(g.bvGPlano(entrada({ operacao: 'meus_agendamentos' }), { opcoes: oHoraRe, pedido: { idCliente: 'c1' } }, cfg).st, [ok(agBruto)], cfg).final.efeitos;
assert.deepEqual(pm.pedido.horarios_oferta, oHoraRe);
const reag = (pedido) => g.bvGPlano(entrada({ operacao: 'reagendar', id_opcao_agendamento: '1', id_opcao_horario: '1' }), ctxE(pm.opcoes, pedido), cfg).final;
assert.equal(reag(pm.pedido).efeitos.proposta_nova.dados.hora, '10:00');
assert.equal(reag({ agendamentos: pm.pedido.agendamentos }).resultado.code, 'opcao_desconhecida'); // sem a oferta guardada: o defeito
assert.equal(g.bvGPasso(g.bvGPlano(entrada({ operacao: 'meus_agendamentos' }), ctxOp({}, { idCliente: 'c1' }), cfg).st, [ok(agBruto)], cfg).final.efeitos.pedido.horarios_oferta, undefined);
assert.equal(g.bvGPasso(p.st, [ok([{ idProfissional: TESTE, apelido: 'Zé' }])], cfg).final.resultado.total, 0);
// recusas: producao, sem redirecionamento, barbeiro de teste vindo do modelo, agenda de barbeiro real, sem cliente
assert.equal(semPacote(g.bvGPlano(entrada({ operacao: 'agendar', id_opcao_horario: '1' }), ctxE(opcoesHora), { ...cfg, ambiente: 'producao' })).final.resultado.code, 'escrita_desabilitada');
assert.equal(semPacote(g.bvGPlano(entrada({ operacao: 'agendar', id_opcao_horario: '1' }), ctxE(opcoesHora), { ...cfg, redirecionar: false })).final.resultado.code, 'escrita_desabilitada');
const oHoraTeste = { tipo: 'horario', itens: [{ id: '1', rotulo: '14:00', valor: { ...horaItem.valor, idProfissional: TESTE } }] };
assert.equal(semPacote(g.bvGPlano(entrada({ operacao: 'agendar', id_opcao_horario: '1' }), ctxE(oHoraTeste), cfg)).final.resultado.code, 'opcao_desconhecida');
const oAgReal = { tipo: 'agendamento', itens: [{ id: '1', rotulo: 'x', valor: { ...opcoesAg.itens[0].valor, idProfissional: 'real' } }] };
assert.equal(g.bvGPlano(entrada({ operacao: 'cancelar', id_opcao_agendamento: '1' }), ctxE(oAgReal), cfg).final.resultado.code, 'escrita_fora_do_teste');
assert.equal(semPacote(g.bvGPlano(entrada({ operacao: 'agendar', id_opcao_horario: '1' }), { opcoes: opcoesHora, pedido: {} }, cfg)).final.resultado.code, 'cliente_nao_identificado');
assert.equal(semPacote(g.bvGPlano(entrada({ operacao: 'agendar', id_opcao_horario: '7' }), ctxE(opcoesHora), cfg)).final.resultado.code, 'opcao_desconhecida');

// Fase 2 (FR-007): sem proposta reivindicada -> recusa pelo motivo; nada vai a Graces.
const PID = '33333333-3333-4333-8333-333333333333';
const f2 = (o, ctx, c = cfg) => g.bvGPlano(entrada({ proposta_id: PID, ...o }), ctx, c);
assert.equal(f2({ operacao: 'agendar' }, { pedido: {}, info: { estado: 'pendente', mesmo_turno: true } }).final.resultado.code, 'confirmacao_no_mesmo_turno');
assert.equal(f2({ operacao: 'agendar' }, { pedido: {}, info: { estado: 'executada', mesmo_turno: false } }).final.resultado.code, 'proposta_nao_pendente');
assert.equal(f2({ operacao: 'agendar' }, { pedido: {}, info: { estado: 'pendente', mesmo_turno: false } }).final.resultado.code, 'proposta_expirada');
assert.equal(f2({ operacao: 'agendar' }, { pedido: {} }).final.resultado.code, 'proposta_invalida');
const prop = (acao, dados) => ({ pedido: { idCliente: 'c1' }, proposta: { id: PID, acao, dados } });
// Fase 2 de cancelar (24/11): antes do DELETE a agenda do cliente e lida e conferida. `conferido` devolve o passo seguinte (o DELETE)
// de um plano de cancelamento cujos alvos estao na agenda e nao sao de pacote.
const conferido = (pl, c = cfg) => {
  assert.deepEqual(pl.reqs.map((q) => [q.m, q.path, q.qs.pageSize]), [['GET', '/agenda/agendamentos', 200]]);
  const dd = pl.st.meta.proposta.dados;
  return g.bvGPasso(pl.st, [ok((dd.itens || [dd]).map((x) => ({ idAgenda: x.idAgenda, horaInicio: x.horaInicio, idServico: 's1', descricaoServico: 'corte adulto' })))], c);
};
{ // Encaixe na fase 2 (ajuste 2): 10:50 (fim de ocupacao) revalida pelas ocupacoes; sem elas, vale so a grade
  const pe = f2({ operacao: 'agendar' }, prop('agendar', { ...dadosAg, hora: '10:50' }));
  assert.deepEqual(pe.reqs.map((q) => q.path), ['/agenda/horarios-livres', '/agenda/agendamentos', '/agenda/horarios']);
  const ge = ok({ minutos: 40, funcionamento: { horaFim: '19:30' }, horarios: ['08:00', '11:20'] });
  const oe = ok({ horarios: [{ horaInicio: '09:30', horaFim: '10:50', tipo: 1 }] });
  assert.equal(g.bvGPasso(pe.st, [ge, ok([]), oe], cfg).reqs[0].body.horaInicio, '10:50');
  assert.equal(g.bvGPasso(pe.st, [ge, ok([]), resp(500, {})], cfg).final.resultado.code, 'horario_indisponivel');
}
assert.equal(f2({ operacao: 'agendar' }, prop('agendar', dadosAg), { ...cfg, ambiente: 'producao' }).final.efeitos.proposta_upd.estado, 'falhou');
// PROD com o de teste liberado: so escreve no de teste; barbeiro real recusa; a fase 2 vai sempre ao de teste
const cfgP = { ...cfg, ambiente: 'producao', redirecionar: false, testeLiberado: true };
assert.equal(semPacote(g.bvGPlano(entrada({ operacao: 'agendar', id_opcao_horario: '1' }), ctxE(opcoesHora), cfgP)).final.resultado.code, 'escrita_fora_do_teste');
assert.ok(semPacote(g.bvGPlano(entrada({ operacao: 'agendar', id_opcao_horario: '1' }), ctxE(oHoraTeste), cfgP)).final.efeitos.proposta_nova);
assert.equal(g.bvGPlano(entrada({ operacao: 'cancelar', id_opcao_agendamento: '1' }), ctxE(oAgReal), cfgP).final.resultado.code, 'escrita_fora_do_teste');
assert.equal(f2({ operacao: 'agendar' }, prop('agendar', { ...dadosAg, idProfissional: 'real' }), cfgP).reqs[0].qs.idProfissional, TESTE);
assert.equal(g.bvGPasso(g.bvGPlano(entrada({ operacao: 'meus_agendamentos' }), ctxOp({}, { idCliente: 'c1' }), cfgP).st, [ok(agBruto)], cfgP).final.efeitos.opcoes.itens.length, 1);

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
{ // Revisao de 17/11: resumo com dia da semana, texto final e agendamentos futuros saem do codigo, nao da memoria do modelo
  assert.match(dadosAg.resumo, /em (domingo|sábado|(segunda|terça|quarta|quinta|sexta)-feira), \d{2}\/\d{2} às 14:00/);
  assert.equal(r.resultado.feito, `Agendado: ${dadosAg.resumo}`);
  assert.deepEqual(r.efeitos.pedido.futuros, [{ idAgenda: 'n1', idServico: dadosAg.idServico, horaInicio: `${dadosAg.data}T14:00:00`, servico: dadosAg.servico, fim: '14:40', idProfissional: dadosAg.idProfissional }]); // fim = inicio + minutos da proposta
  assert.equal(r.efeitos.pedido.agendamentos, null); // a lista com ids segue apagada: reagendar pede meus_agendamentos de novo
  // proposta antiga, sem resumo nos dados: escreve igual, so nao devolve o texto
  const semResumo = { ...dadosAg }; delete semResumo.resumo;
  const pv = f2({ operacao: 'agendar' }, prop('agendar', semResumo));
  assert.equal(g.bvGPasso(g.bvGPasso(pv.st, [ok({ horarios: ['14:00'] })], cfg).st, [ok({ sucesso: true, idAgenda: 'n2' })], cfg).final.resultado.feito, undefined);
  // duplicidade: mesmo dia ou mesmo servico de um agendamento futuro sai com aviso; desde 28/11 (owner), outro dia e outro servico tambem
  const comFut = (fut) => semPacote(g.bvGPlano(entrada({ operacao: 'agendar', id_opcao_horario: '1' }), ctxE(opcoesHora, { futuros: [fut] }), cfg)).final.resultado;
  assert.match(comFut({ idAgenda: 'x', idServico: 'outro', horaInicio: `${dadosAg.data}T09:00:00`, servico: 'barba' }).ja_tem, /^barba em .* às 09:00$/);
  assert.match(comFut({ idAgenda: 'x', idServico: dadosAg.idServico, horaInicio: '2027-01-04T09:00:00', servico: 'corte adulto' }).ja_tem, /^corte adulto em segunda-feira, 04\/01 às 09:00$/);
  // mesmo dia vem antes de mesmo servico
  assert.match(semPacote(g.bvGPlano(entrada({ operacao: 'agendar', id_opcao_horario: '1' }), ctxE(opcoesHora, { futuros: [{ idAgenda: 'x', idServico: dadosAg.idServico, horaInicio: '2027-01-04T09:00:00', servico: 'corte adulto' }, { idAgenda: 'y', idServico: 'outro', horaInicio: `${dadosAg.data}T09:00:00`, servico: 'barba' }] }), cfg)).final.resultado.ja_tem, /^barba /);
  assert.match(comFut({ idAgenda: 'x', idServico: 'outro', horaInicio: `${dadosAg.data}T09:00:00`, servico: 'barba' }).orientacao, /pergunte só se pode confirmar mais este/);
  // PROD, 25/11: corte infantil no sabado com o corte adulto da sexta de pe saiu sem aviso. Qualquer agendamento futuro avisa, e a
  // orientacao diz o caminho da troca que o codigo sabe: outro servico = agendar com substituicao; mesmo servico = reagendar
  const outroDia = comFut({ idAgenda: 'x', idServico: 'outro', horaInicio: '2027-01-04T09:00:00', servico: 'barba' });
  assert.deepEqual([outroDia.ja_tem, outroDia.aguardando_confirmacao], ['barba em segunda-feira, 04/01 às 09:00', true]);
  assert.match(outroDia.orientacao, /pergunte só se pode confirmar mais este \(o sim dele confirma.*para trocar aquele, ou para cancelar aquele, não chame cancelar: chame agendar com este id_opcao_horario e substitui_id_opcao_agendamento com o id dele \(o id vem de meus_agendamentos\)$/);
  assert.match(comFut({ idAgenda: 'x', idServico: dadosAg.idServico, horaInicio: '2027-01-04T09:00:00', servico: 'corte adulto' }).orientacao, /não chame cancelar: chame reagendar com o id_opcao_agendamento dele e este id_opcao_horario \(o id vem de meus_agendamentos\)$/);
  // sem nenhum no mesmo dia nem do mesmo servico vale o mais proximo do dia pedido (antes ou depois); mesmo servico segue vindo antes
  const varios = (futuros) => semPacote(g.bvGPlano(entrada({ operacao: 'agendar', id_opcao_horario: '1' }), ctxE(opcoesHora, { futuros }), cfg)).final.resultado.ja_tem;
  const noDia = (n, extra = {}) => { const d = new Date(`${dadosAg.data}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return { idAgenda: `f${n}`, idServico: 'outro', horaInicio: `${d.toISOString().slice(0, 10)}T09:00:00`, servico: `barba${n}`, ...extra }; };
  assert.match(varios([noDia(30), noDia(-2), noDia(5)]), /^barba-2 /);
  assert.match(varios([noDia(30), noDia(3), noDia(-5)]), /^barba3 /);
  assert.match(varios([noDia(1), noDia(40, { idServico: dadosAg.idServico })]), /^barba40 /);
  assert.equal(varios([{ idAgenda: 'sem-inicio', idServico: 'outro', servico: 'barba' }]), undefined); // futuro sem inicio nao gera aviso
  // em cada degrau vale o mais proximo do dia pedido: serie semanal do mesmo servico cita a ocorrencia vizinha, nao a primeira da lista
  const serie = [-20, -13, -6, 1].map((n) => noDia(n, { idAgenda: 'serie', idServico: dadosAg.idServico, recorrente: true }));
  assert.match(varios(serie), /^barba1 /);
  assert.match(varios([...serie].reverse()), /^barba1 /);
  assert.match(varios([noDia(0, { horaInicio: `${dadosAg.data}T18:00:00`, servico: 'tarde' }), noDia(1, { idServico: dadosAg.idServico })]), /^tarde /); // mesmo dia segue antes de mesmo servico
  assert.match(varios([noDia(3, { servico: 'depois' }), noDia(-3, { servico: 'antes' })]), /^depois /); // empate: a ordem recebida
  // sequencia (varios servicos): o aviso sai e a orientacao e a de antes (reagendar e troca sao de um horario so)
  const ofSeqJ = { tipo: 'sequencia', itens: [{ id: '1', rotulo: '14:00 Pedro', valor: { data: dadosAg.data, itens: [{ idServico: 'sA', servico: 'corte', idProfissional: 'b1', apelido: 'Pedro', hora: '14:00', minutos: 40, valor: 80 }, { idServico: 'sB', servico: 'barba', idProfissional: 'b1', apelido: 'Pedro', hora: '14:40', minutos: 20, valor: 50 }] } }] };
  const seqJ = semPacote(g.bvGPlano(entrada({ operacao: 'agendar', id_opcao_horario: '1' }), ctxE(ofSeqJ, { futuros: [noDia(9)] }), cfg)).final;
  assert.deepEqual([seqJ.efeitos.proposta_nova.acao, seqJ.resultado.ja_tem.slice(0, 7)], ['agendar_conjunto', 'barba9 ']);
  assert.match(seqJ.resultado.orientacao, /para trocar aquele, ou para cancelar aquele, use meus_agendamentos e reagendar$/);
  assert.equal(varios([]), undefined);
  // cancelar: sai da lista de futuros e devolve o texto final
  const pc = conferido(f2({ operacao: 'cancelar' }, { pedido: { idCliente: 'c1', futuros: [{ idAgenda: dadosCanc.idAgenda, horaInicio: dadosCanc.horaInicio, servico: 'corte adulto' }, { idAgenda: 'fica', horaInicio: '2027-01-04T09:00:00', servico: 'barba' }] }, proposta: { id: PID, acao: 'cancelar', dados: dadosCanc } }));
  const rc = g.bvGPasso(pc.st, [ok({ sucesso: true })], cfg).final;
  assert.match(rc.resultado.feito, /^Cancelado: corte adulto em terça-feira, 20\/10 às 14:00$/); // o barbeiro de teste nao entra no resumo
  assert.deepEqual(rc.efeitos.pedido.futuros.map((x) => x.idAgenda), ['fica']);
  // meus_agendamentos atualiza os futuros
  assert.deepEqual(g.bvGPasso(g.bvGPlano(entrada({ operacao: 'meus_agendamentos' }), ctxOp({}, { idCliente: 'c1' }), cfg).st, [ok(agBruto)], cfg).final.efeitos.pedido.futuros, [{ idAgenda: 'a1', idServico: 's1', horaInicio: '2026-10-20T14:00:00', servico: 'corte adulto', idProfissional: TESTE }]);
}
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

// cancelar fase 2: DELETE direto, sempre com ?data= do dia da ocorrencia; trocar_servico: POST e so depois DELETE do antigo.
p = conferido(f2({ operacao: 'cancelar' }, prop('cancelar', dadosCanc)));
assert.deepEqual(p.reqs[0], { m: 'DELETE', path: '/agenda/a1', qs: { data: '2026-10-20' } });
r = g.bvGPasso(p.st, [ok({ sucesso: true })], cfg).final;
assert.equal(r.efeitos.proposta_upd.estado, 'executada');
const dadosTroca = { ...dadosAg, antigo: { idAgenda: 'a1', horaInicio: '2026-10-20T14:00:00', recorrente: false } };
p = f2({ operacao: 'agendar' }, prop('trocar_servico', dadosTroca));
// 24/11: o antigo so e apagado se estiver na agenda lida neste estagio e nao for de pacote; sem a leitura, nada e escrito
assert.equal(g.bvGPasso(p.st, [ok({ horarios: ['14:00'] })], cfg).final.resultado.code, 'nao_conferido');
assert.equal(g.bvGPasso(p.st, [ok({ horarios: ['14:00'] }), ok([]), ok({ horarios: [] })], cfg).final.resultado.code, 'agendamento_nao_encontrado');
s2 = g.bvGPasso(p.st, [ok({ horarios: ['14:00'] }), ok([{ idAgenda: 'a1', horaInicio: '2026-10-20T14:00:00', idServico: 's9', descricaoServico: 'barba' }]), ok({ horarios: [] })], cfg);
const s3 = g.bvGPasso(s2.st, [ok({ sucesso: true, idAgenda: 'n2' })], cfg);
assert.deepEqual(s3.reqs[0], { m: 'DELETE', path: '/agenda/a1', qs: { data: '2026-10-20' } });
assert.equal(g.bvGPasso(s3.st, [ok({ sucesso: true })], cfg).final.efeitos.proposta_upd.estado, 'executada');
assert.equal(g.bvGPasso(s2.st, [resp(409, { code: 'CONFLITO' })], cfg).final.efeitos.proposta_upd.estado, 'falhou'); // POST falhou: nao apaga o antigo
assert.equal(g.bvGPasso(s3.st, [resp(500, {})], cfg).final.resultado.code, 'novo_criado_antigo_nao_cancelado');

// u1/u3: oferta completa (14 inicios, sem corte), uniao "qualquer barbeiro" sem o barbeiro de teste, ordem cronologica.
{
  const h14 = Array.from({ length: 14 }, (_, k) => `${String(9 + Math.floor(k * 40 / 60)).padStart(2, '0')}:${String(k * 40 % 60).padStart(2, '0')}`);
  const pedidoU = { servico: { idServico: 's1', nome: 'corte adulto', preco: 85 }, barbeiros: [{ opcao_id: '1', idProfissional: 'b1', apelido: 'Rodrigo' }, { opcao_id: '9', idProfissional: TESTE, apelido: 'Zé' }, { opcao_id: '2', idProfissional: 'b2', apelido: 'Kiel' }] };
  const pu = g.bvGPlano(entrada({ operacao: 'horarios_livres', qualquer: true, data: '2026-10-20' }), ctxOp({}, pedidoU), cfg);
  assert.equal(pu.reqs.length, 4); // o de teste fora
  const ru = g.bvGPasso(pu.st, [ok({ minutos: 40, horarios: h14.slice(0, 8) }), ok({ minutos: 40, horarios: h14.slice(4) })], cfg).final;
  assert.deepEqual(ru.efeitos.opcoes.itens.map((x) => x.valor.hora), h14);
  assert.equal(ru.efeitos.opcoes.completa, true);
  assert.match(ru.resultado.orientacao, /quem_tem_horario/);
  // a lista esconde o Kiel em 09:00-11:40 (o Rodrigo vem antes): o resumo diz quantos inicios cada um tem
  assert.deepEqual(ru.resultado.por_barbeiro, [{ barbeiro: 'Rodrigo', total: 8, primeiro: '09:00' }, { barbeiro: 'Kiel', total: 10, primeiro: '11:40' }]);
  assert.equal(ru.efeitos.pedido.barbeiro, undefined); // "qualquer" nao vira escolha do cliente
  assert.equal(ru.efeitos.opcoes.itens[5].valor.apelido, 'Rodrigo'); // inicio livre nos dois: o primeiro da ordem de listar_barbeiros
  assert.ok(ru.efeitos.opcoes.itens.every((x) => x.valor.idProfissional !== TESTE));
}

// u8: "2a vez" (5 variantes) recusado nas fases 1 e 2 e removido da busca por nome; cancelar segue permitido.
for (const nome of ['corte adulto 2º vez', 'BARBA 2a VEZ', 'corte 2ª vez', 'Corte 2 Vez', 'corte 2o vez']) {
  const o = { tipo: 'horario', itens: [{ id: '1', rotulo: '10:00', valor: { data: '2026-10-20', hora: '10:00', idProfissional: 'b1', apelido: 'R', idServico: 's9', servico: nome } }] };
  assert.equal(semPacote(g.bvGPlano(entrada({ operacao: 'agendar', id_opcao_horario: '1' }), ctxOp(o, { idCliente: 'c1' }), cfg)).final.resultado.code, 'servico_nao_oferecido', nome);
  const oa = { tipo: 'agendamento', itens: [{ id: '1', rotulo: 'x', valor: { idAgenda: 'a1', horaInicio: '2026-10-20T14:00:00', idServico: 's9', servico: nome, idProfissional: TESTE, profissional: 'ZZ TESTE' } }] };
  assert.equal(g.bvGPlano(entrada({ operacao: 'reagendar', id_opcao_agendamento: '1', id_opcao_horario: '1' }), ctxOp(oa, { idCliente: 'c1' }), cfg).final.resultado.code, 'servico_nao_oferecido', nome);
  const pr = { id: 'p1', acao: 'agendar', dados: { idCliente: 'c1', idServico: 's9', servico: nome, idProfissional: 'b1', data: '2026-10-20', hora: '10:00' } };
  const f2u = g.bvGPlano(entrada({ operacao: 'agendar', proposta_id: T1 }), { pedido: {}, opcoes: {}, proposta: pr }, cfg).final;
  assert.equal(f2u.resultado.code, 'servico_nao_oferecido', nome);
  assert.equal(f2u.efeitos.proposta_upd.estado, 'falhou');
  // cancelar a variante continua permitido: segue para a conferencia da agenda (24/11) e, dela, para o DELETE
  assert.equal(conferido(g.bvGPlano(entrada({ operacao: 'cancelar', proposta_id: T1 }), { pedido: { idCliente: 'c1' }, opcoes: {}, proposta: { id: 'p1', acao: 'cancelar', dados: { idAgenda: 'a1', servico: nome } } }, cfg)).reqs[0].m, 'DELETE');
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
assert.equal(g.bvGParams({ ...base }, {}).length, 18);

// ---- FASE 3: escrita incerta (u9-u12), erros por code (u13) ----
{
  const dA = { idCliente: 'c1', idServico: 's1', servico: 'corte adulto', idProfissional: 'b1', barbeiro: 'R', data: '2026-10-20', hora: '14:00', valor: 85 };
  const novo = { idAgenda: 'n1', idServico: 's1', idProfissional: TESTE, horaInicio: '2026-10-20T14:00:00' };
  const escreve = () => { // reval ok + linha de base vazia -> POST
    const pl = f2({ operacao: 'agendar' }, prop('agendar', dA));
    assert.equal(pl.reqs.length, 3); // horarios + linha de base + ocupacoes
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
  const pc = conferido(f2({ operacao: 'cancelar' }, prop('cancelar', dadosCanc)));
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
  assert.equal(e1.reqs.length, 6); // 2 barbeiros reais x 2 servicos (grades) + 1 ocupacao por barbeiro, sem o de teste
  assert.deepEqual(e1.reqs.slice(4).map((q) => [q.path, q.qs.idProfissional, q.qs.idServico]), [['/agenda/horarios', 'b1', 's1'], ['/agenda/horarios', 'b2', 's1']]);
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
  assert.equal(dg.reqs.length, 4); // b1 p/ corte, b2 p/ barba (sem o de teste), grade + ocupacoes
  const dr = g.bvGPasso(dg.st, [ok({ minutos: 40, horarios: ['10:00', '11:00'] }), ok({ minutos: 30, horarios: ['10:40'] })], cfg).final;
  assert.deepEqual(dr.resultado.opcoes.map((o) => `${o.hora} ${o.barbeiros.join('+')}`), ['10:00 B1+B2']);
  { // etapa 7: nenhuma sequencia cabe nem com barbeiros diferentes => as alternativas vao em lista (principio X), e a resposta volta por id_opcao
    const semSeq = g.bvGPasso(dg.st, [ok({ minutos: 40, horarios: ['10:00'] }), ok({ minutos: 30, horarios: ['15:00'] })], cfg).final;
    assert.deepEqual([semSeq.resultado.total, semSeq.resultado.opcoes], [0, [{ id: '1', rotulo: 'Outro dia' }, { id: '2', rotulo: 'Agendar separado' }]]);
    assert.match(semSeq.resultado.orientacao, /^nenhuma sequência cabe nesse dia, nem com barbeiros diferentes\. Diga isso e pergunte o que ele prefere; as opções vão em lista junto$/);
    assert.equal(semSeq.efeitos.opcoes.tipo, 'modo_encadeamento');
    const ctxA = ctxOp(semSeq.efeitos.opcoes, { ...n1.efeitos.pedido, ...semSeq.efeitos.pedido });
    assert.equal(semSeq.efeitos.pedido.seq_dia, '2026-10-20');
    const od = g.bvGPlano(entrada({ operacao: 'horarios_livres', id_opcao: '1', data: '2026-10-20' }), ctxA, cfg).final; // o toque, ainda sem o dia novo
    assert.match(od.resultado.orientacao, /^pergunte qual outro dia ele prefere; com a resposta, chame horarios_livres com este mesmo id_opcao e a data nova$/);
    assert.equal(od.efeitos.opcoes, undefined);
    const od2 = g.bvGPlano(entrada({ operacao: 'horarios_livres', id_opcao: '1', data: '2026-10-21' }), ctxA, cfg); // com o dia novo: busca a mesma sequencia
    assert.deepEqual(od2.reqs.map((q) => [q.path, q.qs.idServico]), [['/servicos/profissionais', 's1'], ['/servicos/profissionais', 's2']]);
    assert.deepEqual([od2.st.meta.etapa, od2.st.meta.data, od2.st.meta.servicos.length], ['enc_prof', '2026-10-21', 2]);
    // o modelo tambem pode pedir os mesmos servicos de novo: vale a sequencia do pedido; com outra quantidade, a opcao nao existe
    const od3 = g.bvGPlano(entrada({ operacao: 'horarios_livres', id_opcoes_servicos: ['1', '2'], data: '2026-10-21' }), ctxA, cfg);
    assert.deepEqual(od3.reqs.map((q) => q.qs.idServico), ['s1', 's2']);
    assert.equal(g.bvGPlano(entrada({ operacao: 'horarios_livres', id_opcoes_servicos: ['1', '2', '3'], data: '2026-10-21' }), ctxA, cfg).final.resultado.code, 'opcao_desconhecida');
    assert.equal(g.bvGPlano(entrada({ operacao: 'horarios_livres', id_opcao: '2', data: '2026-10-20' }), ctxA, cfg).final.resultado.modo, 'separados');
  }
  // hora aproximada tambem filtra as sequencias (mesmo barbeiro e barbeiros diferentes)
  const plH = g.bvGPlano(entrada({ operacao: 'horarios_livres', id_opcoes_servicos: ['1', '2'], data: '2026-10-20', hora: '10:30' }), ctxOp(ofS), cfg);
  const eH = g.bvGPasso(plH.st, [profs(['b1']), profs(['b1'])], cfg);
  const grades = [ok({ minutos: 40, horarios: ['08:00', '10:00', '11:00', '16:00'] }), ok({ minutos: 30, horarios: ['08:40', '10:40', '11:40', '16:40'] })];
  assert.deepEqual(g.bvGPasso(eH.st, grades, cfg).final.resultado.opcoes.map((o) => o.hora), ['10:00', '11:00']);
  const plL = g.bvGPlano(entrada({ operacao: 'horarios_livres', id_opcoes_servicos: ['1', '2'], data: '2026-10-20', hora: '13:00' }), ctxOp(ofS), cfg);
  const rL = g.bvGPasso(g.bvGPasso(plL.st, [profs(['b1']), profs(['b1'])], cfg).st, grades, cfg).final;
  assert.deepEqual(rL.resultado.opcoes.map((o) => o.hora), ['10:00', '11:00', '16:00']);
  assert.match(rL.resultado.orientacao, /mais próximos/);
  const dpH = g.bvGPlano(entrada({ operacao: 'horarios_livres', id_opcao: idModo('barbeiros_diferentes'), data: '2026-10-20', hora: '16:00' }), ctxM, cfg);
  const dgH = g.bvGPasso(dpH.st, [profs(['b1']), profs(['b2'])], cfg);
  assert.deepEqual(g.bvGPasso(dgH.st, grades, cfg).final.resultado.opcoes.map((o) => o.hora), ['16:00']);
  // encaixe na sequencia (ajuste 2): corte as 09:30 (fim de ocupacao) e barba as 10:10, fora da grade da barba, cabem no livre
  const eE = g.bvGPasso(plE.st, [profs(['b1']), profs(['b1'])], cfg);
  const fx = (min, hs) => ok({ minutos: min, funcionamento: { horaFim: '19:30' }, horarios: hs });
  const oE = ok({ horarios: [{ horaInicio: '08:40', horaFim: '09:30', tipo: 1 }, { horaInicio: '11:20', horaFim: '19:30', tipo: 2 }] });
  const rE = g.bvGPasso(eE.st, [fx(40, ['08:00', '10:00']), fx(30, ['08:00', '12:00']), oE], cfg).final;
  assert.deepEqual(rE.resultado.opcoes.map((o) => o.hora), ['09:30', '10:00']);
  assert.deepEqual(rE.efeitos.opcoes.itens[0].valor.itens.map((x) => x.hora), ['09:30', '10:10']);
  // barbeiros diferentes: o 2o servico tambem pode cair fora da grade
  const dE = g.bvGPasso(dp.st, [profs(['b1']), profs(['b2'])], cfg);
  const rD = g.bvGPasso(dE.st, [fx(40, ['08:00', '10:00']), fx(30, ['08:00', '12:00']), oE, oE], cfg).final;
  assert.deepEqual(rD.resultado.opcoes.map((o) => o.hora), ['09:30', '10:00']);
  assert.equal(dr.efeitos.opcoes.itens[0].valor.itens[1].idProfissional, 'b2');
  const dsem = g.bvGPasso(dg.st, [ok({ minutos: 40, horarios: ['10:00'] }), ok({ minutos: 30, horarios: ['12:00'] })], cfg).final;
  assert.equal(dsem.resultado.total, 0);
  const dd = semPacote(g.bvGPlano(entrada({ operacao: 'agendar', id_opcao_horario: '1' }), ctxOp(dr.efeitos.opcoes, { idCliente: 'c1' }), cfg)).final;
  assert.match(dd.resultado.resumo, /corte adulto às 10:00 com B1.*\+ barba às 10:40 com B2/);
  // no TESTE toda escrita do conjunto vai ao barbeiro de teste, mesmo com barbeiros diferentes na proposta
  const pP = g.bvGPlano(entrada({ operacao: 'agendar', proposta_id: PID }), prop('agendar_conjunto', dd.efeitos.proposta_nova.dados), cfg);
  assert.deepEqual(pP.reqs.map((q) => q.qs.idProfissional), [TESTE, TESTE, TESTE, TESTE]); // grades + ocupacoes
  // u16: conjunto: 1o POST 200, 2o 409 -> parcial, sem 3a chamada
  const ctxC = ctxOp(e2.efeitos.opcoes, { idCliente: 'c1' });
  const fase1 = semPacote(g.bvGPlano(entrada({ operacao: 'agendar', id_opcao_horario: '1' }), ctxC, cfg)).final;
  assert.equal(fase1.efeitos.proposta_nova.acao, 'agendar_conjunto');
  assert.match(fase1.resultado.resumo, /corte adulto às 10:00.*\+ barba às 10:40/);
  const dC = fase1.efeitos.proposta_nova.dados;
  const pl2 = f2({ operacao: 'agendar' }, prop('agendar_conjunto', dC));
  assert.equal(pl2.reqs.length, 4);
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
  { // Item 12: conjunto com um servico no pacote e o outro avulso
    const SA = 'bbbbbbbb-1111-4111-8111-111111111111';
    const comP = (ids, sv = 's1') => ok([{ secoes: ids.map((id) => ({ idClienteItemPacote: id, idProdutoServico: sv })) }]);
    const pc = g.bvGPlano(entrada({ operacao: 'agendar', id_opcao_horario: '1' }), ctxC, cfg);
    assert.deepEqual(pc.reqs.map((q) => [q.m, q.path, q.qs.idCliente, q.qs.idServico]), [['GET', '/agenda/pacotes', 'c1', 's1'], ['GET', '/agenda/pacotes', 'c1', 's2']]);
    const fc = g.bvGPasso(pc.st, [comP([SA]), ok([])], cfg).final;
    assert.match(fc.resultado.resumo, /corte adulto às 10:00 \(abatido do seu pacote\) \+ barba às 10:40 \(R\$ 40,00\)/);
    const dcp = fc.efeitos.proposta_nova.dados;
    assert.deepEqual(dcp.itens.map((x) => !!x.pacote), [true, false]);
    assert.equal(g.bvGPasso(pc.st, [ok([]), ok([])], cfg).final.resultado.resumo, fase1.resultado.resumo); // sem pacote: o resumo de sempre
    const pg = f2({ operacao: 'agendar' }, prop('agendar_conjunto', dcp));
    assert.deepEqual(pg.reqs.slice(4).map((q) => [q.path, q.qs.idServico]), [['/agenda/pacotes', 's1']]); // so o servico marcado
    assert.ok(pg.reqs.every((q) => q.m === 'GET' && !q.body));
    const gr = [ok({ horarios: ['10:00'] }), ok({ horarios: ['10:40'] }), ok({ horarios: [] }), ok({ horarios: [] })];
    const g1 = g.bvGPasso(pg.st, [...gr, comP([SA])], cfg);
    assert.ok(g1.reqs[0].body.idClienteItemPacote === SA && !('idServico' in g1.reqs[0].body));
    const g2 = g.bvGPasso(g1.st, [ok({ sucesso: true, idAgenda: 'a1' })], cfg);
    assert.ok(g2.reqs[0].body.idServico === 's2' && !('idClienteItemPacote' in g2.reqs[0].body));
    assert.equal(g.bvGPasso(g2.st, [ok({ sucesso: true, idAgenda: 'a2' })], cfg).final.efeitos.proposta_upd.estado, 'executada');
    const semS = g.bvGPasso(pg.st, [...gr, ok([])], cfg).final; // pacote sem secao na hora de gravar: nenhum POST
    assert.ok(semS.resultado.code === 'pacote_indisponivel' && semS.efeitos.proposta_upd.estado === 'falhou');
    const naoLeu = g.bvGPasso(pg.st, [...gr, resp(500, {})], cfg).final; // leitura do pacote falhou: nenhum POST e nada "incerto"
    assert.deepEqual([naoLeu.resultado.code, naoLeu.efeitos.proposta_upd.estado, naoLeu.efeitos.falha.operacao], ['pacote_nao_conferido', 'falhou', 'pacotes']);
    // o mesmo servico duas vezes com uma secao so: o primeiro item sai do pacote e o segundo pelo valor (estagio da fase 1 direto)
    const it = (ordem, hora) => ({ ordem, idServico: 's1', servico: 'corte adulto', idProfissional: 'b1', barbeiro: 'B1', data: dcp.itens[0].data, hora, minutos: 40, valor: 85 });
    const st2 = { in: pc.st.in, ctx: pc.st.ctx, meta: { op: 'agendar', etapa: 'pacote', prop: { acao: 'agendar_conjunto', dados: { idCliente: 'c1', itens: [it(1, '10:00'), it(2, '10:40')] }, jaTem: {}, svs: ['s1'] } } };
    const dois = g.bvGPasso(JSON.parse(JSON.stringify(st2)), [comP([SA])], cfg).final;
    assert.match(dois.resultado.resumo, /10:00 \(abatido do seu pacote\) \+ corte adulto às 10:40 \(R\$ 85,00\) com B1/);
    assert.match(dois.resultado.pacote, /sem acrescentar valor ao que sai do pacote/); // o item avulso mantem o valor
    // na hora de gravar, dois itens marcados e uma secao so: nenhum POST
    const marcados = { ...dois.efeitos.proposta_nova.dados, itens: dois.efeitos.proposta_nova.dados.itens.map((x) => ({ ...x, pacote: true })) };
    const pm = f2({ operacao: 'agendar' }, prop('agendar_conjunto', marcados));
    assert.equal(pm.reqs.filter((q) => q.path === '/agenda/pacotes').length, 1); // um GET por servico distinto
    assert.equal(g.bvGPasso(pm.st, [ok({ horarios: ['10:00'] }), ok({ horarios: ['10:40'] }), ok({ horarios: [] }), ok({ horarios: [] }), comP([SA])], cfg).final.resultado.code, 'pacote_indisponivel');
    // com duas secoes, cada item leva a sua, e o estado sobrevive a ida e volta por JSON entre os estagios (como no n8n)
    const SB = 'bbbbbbbb-2222-4222-8222-222222222222';
    const m1 = g.bvGPasso(pm.st, [ok({ horarios: ['10:00'] }), ok({ horarios: ['10:40'] }), ok({ horarios: [] }), ok({ horarios: [] }), comP([SA, SA, SB])], cfg); // id repetido conta uma vez
    assert.equal(m1.reqs[0].body.idClienteItemPacote, SA);
    assert.equal(g.bvGPasso(JSON.parse(JSON.stringify(m1.st)), [ok({ sucesso: true, idAgenda: 'a1' })], cfg).reqs[0].body.idClienteItemPacote, SB);
  }
  // cancelar conjunto: um DELETE por item, resultado por item
  const ofA = { tipo: 'agendamento', itens: ['1', '2'].map((id) => ({ id, rotulo: 'x', valor: { idAgenda: `a${id}`, horaInicio: `2026-10-20T1${id}:00:00`, idServico: 's1', servico: 'corte', idProfissional: TESTE, profissional: 'ZZ' } })) };
  const c1 = g.bvGPlano(entrada({ operacao: 'cancelar', id_opcoes_agendamentos: ['1', '2'] }), ctxOp(ofA, { idCliente: 'c1' }), cfg).final;
  assert.equal(c1.efeitos.proposta_nova.acao, 'cancelar_conjunto');
  const pc = conferido(f2({ operacao: 'cancelar' }, prop('cancelar_conjunto', c1.efeitos.proposta_nova.dados)));
  assert.equal(pc.reqs[0].path, '/agenda/a1');
  const pc2 = g.bvGPasso(pc.st, [ok({ sucesso: true })], cfg);
  assert.equal(pc2.reqs[0].path, '/agenda/a2');
  assert.equal(g.bvGPasso(pc2.st, [ok({ sucesso: true })], cfg).final.efeitos.proposta_upd.estado, 'executada');
}

// Cadastro do cliente: homonimo com outro celular (as ferramentas de outra pessoa sairam na revisao de 17/11).
{
  let rp;
  // u23: primeiro contato, mesmo nome completo com outro celular -> encaminha, sem POST
  const pcad = g.bvGPlano(entrada({ operacao: 'cadastrar_cliente', nome: 'Paulo  SOUZA' }), ctxOp({}, { cliente_sem_cadastro: true }), prodCad);
  assert.equal(pcad.reqs[0].m, 'GET');
  rp = g.bvGPasso(pcad.st, [ok([{ idCliente: 'p9', nomeCliente: 'paulo', sobrenomeCliente: 'Souza', celular: '11955554444' }])], prodCad).final;
  assert.equal(rp.resultado.motivo, 'nome_outro_celular');
  assert.equal(rp.efeitos.falha.motivo, 'encaminhar_equipe|nome_outro_celular');
  // u24: sem homonimo exato -> POST com o celular do WhatsApp; nome de uma palavra e recusado (sobrenome obrigatorio)
  const po = g.bvGPasso(pcad.st, [ok([{ idCliente: 'p9', nomeCliente: 'Paulo', sobrenomeCliente: 'Souzinha', celular: '11955554444' }])], prodCad);
  assert.equal(po.reqs[0].m, 'POST');
  assert.equal(po.reqs[0].body.celular, '11999998888');
  assert.equal(g.bvGPasso(po.st, [ok({ sucesso: true, idCliente: 'n2' })], prodCad).final.efeitos.pedido.idCliente, 'n2');
  assert.equal(g.bvGPlano(entrada({ operacao: 'cadastrar_cliente', nome: 'Novo' }), ctxOp({}, { cliente_sem_cadastro: true }), prodCad).final.resultado.code, 'nome_incompleto');
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
  assert.equal(pr.length, 18);
  assert.deepEqual(JSON.parse(pr[14]).map((x) => x.tipo), ['confirmacao', 'lembrete', 'pos_atendimento']);
  assert.deepEqual(JSON.parse(pr[14])[1].dados, { servico: 'corte adulto', barbeiro: 'R', fim: '2026-10-22T14:45:00' });
  assert.equal(pr[16], '["5511999998888"]');
  // item 8: fora do TESTE (escrita null) nao ha trava fora_da_lista ($17 null); item 7: recorrente vai para dados (POST confirmacao com data)
  assert.equal(g.bvGParams({ contato_id: 1, turno_id: 't' }, r.efeitos, { ativo: true, agora, cfg: msgCfg, escrita: null })[16], null);
  const rr = { mensagens: { criar: [{ ...r.efeitos.mensagens.criar[0], recorrente: true }], cancelar: [] } };
  assert.equal(JSON.parse(g.bvGParams({ contato_id: 1, turno_id: 't' }, rr, { ativo: true, agora, cfg: msgCfg, escrita: [] })[14])[0].dados.recorrente, true);
  // inativo (PROD): nada programado
  pr = g.bvGParams({ contato_id: 1, turno_id: 't' }, r.efeitos, { ativo: false, agora, cfg: msgCfg });
  assert.deepEqual(pr.slice(14, 17), [null, null, null]);
  // horario que ja passou vira linha com motivo, nunca pendente
  const hoje = { ...dA, data: '2026-10-20', hora: '09:00' };
  const m0 = g.bvGParams({ contato_id: 1, turno_id: 't' }, { mensagens: { criar: [{ idAgenda: 'n', idCliente: 'c', idProfissional: 'p', inicio: '2026-10-20T09:00:00', fim: '2026-10-20T09:45:00', servico: 's', barbeiro: 'b' }], cancelar: [] } }, { ativo: true, agora, cfg: msgCfg });
  assert.deepEqual(JSON.parse(m0[14]).map((x) => [x.tipo, x.motivo]), [['pos_atendimento', null], ['confirmacao', 'ja_passou'], ['lembrete', 'ja_passou']]);
  // 5xx incerto verificado: idAgenda vem da releitura
  const v = g.bvGPasso(wr().st, [resp(0)], cfg);
  r = g.bvGPasso(v.st, [ok([{ idAgenda: 'n9', idServico: 's1', idProfissional: TESTE, horaInicio: '2026-10-22T14:00:00' }])], cfg).final;
  assert.equal(r.efeitos.mensagens.criar[0].idAgenda, 'n9');
  // cancelar: so cancela as pendentes
  const pc = conferido(f2({ operacao: 'cancelar' }, prop('cancelar', dadosCanc)));
  r = g.bvGPasso(pc.st, [ok({ sucesso: true })], cfg).final;
  assert.deepEqual(r.efeitos.mensagens, { criar: [], cancelar: [{ idAgenda: dadosCanc.idAgenda, motivo: 'cancelada_agente' }] });
  // falha na Graces: nenhum efeito em mensagens
  r = g.bvGPasso(wr().st, [resp(409, { code: 'CONFLITO' })], cfg).final;
  assert.equal(r.efeitos.mensagens, undefined);
}

// Ultimo atendimento (owner, 2026-11-14): "qualquer barbeiro" e "outro barbeiro" com o servico do historico
{
  const S = '046519b1-e111-44b4-8779-3e64366f9d8f';
  const pedU = { identificado: true, idCliente: 'c1', ultimo: { servico: { idServico: S, nome: 'corte adulto', preco: 85, minutos: 40, opcao_id: 'ult' }, barbeiro: { idProfissional: 'b1', apelido: 'Pedro' } } };
  let pq = g.bvGPlano(entrada({ operacao: 'horarios_livres', qualquer: true, data: '2026-10-20', hora: '14:00' }), { opcoes: {}, pedido: pedU }, cfg);
  assert.deepEqual(pq.reqs, [{ m: 'GET', path: '/servicos/profissionais', qs: { idServico: S } }]);
  pq = g.bvGPasso(pq.st, [ok([{ idProfissional: 'b1', apelido: 'Pedro' }, { idProfissional: 'b2', apelido: 'Kiel' }, { idProfissional: TESTE, apelido: 'ZZ' }])], cfg);
  assert.deepEqual(pq.reqs.map((q) => q.qs.idProfissional), ['b1', 'b2', 'b1', 'b2']);
  // com a lista de barbeiros deste servico ja no pedido, nao busca de novo
  const comLista = { ...pedU, servico: pedU.ultimo.servico, barbeiros: [{ opcao_id: '1', idProfissional: 'b1', apelido: 'Pedro' }] };
  assert.equal(g.bvGPlano(entrada({ operacao: 'horarios_livres', qualquer: true, data: '2026-10-20' }), { opcoes: {}, pedido: comLista }, cfg).reqs[0].path, '/agenda/horarios-livres');
  // outro barbeiro: listar_barbeiros aceita o id 'ult'
  assert.deepEqual(g.bvGPlano(entrada({ operacao: 'listar_barbeiros', id_opcao_servico: 'ult' }), { opcoes: {}, pedido: pedU }, cfg).reqs[0].qs, { idServico: S });
  // remarcacao com a hora pedida livre: orienta reagendar, nunca agendar
  const agd = { opcao_id: '1', idAgenda: 'a1', horaInicio: '2026-10-23T10:00:00', idServico: S, servico: 'corte adulto', idProfissional: 'b1', profissional: 'Pedro' };
  let pr = g.bvGPlano(entrada({ operacao: 'horarios_livres', id_opcao_agendamento: '1', data: '2026-10-26', hora: '15:00' }), { opcoes: {}, pedido: { ...pedU, agendamentos: [agd] } }, cfg);
  assert.deepEqual(pr.reqs.map((q) => [q.path, q.qs.idProfissional]), [['/agenda/horarios-livres', 'b1'], ['/agenda/horarios', 'b1']]); // direto no barbeiro do agendamento
  const rr = g.bvGPasso(pr.st, [ok({ minutos: 40, horarios: ['15:00'] }), resp(500, {})], cfg).final.resultado;
  assert.match(rr.orientacao, /chame reagendar com id_opcao_agendamento 1 e id_opcao_horario 1/);
}
console.log('graces.test.js ultimo atendimento ok');

// Clausula petrea (owner, 2026-11-14): o Jayme nunca e listado nem agendado pelo agente; quem quer o Jayme vai para a equipe.
{
  const JAY = 'b623cd84-6068-4a57-9ce6-2f7d9a37a11e', S = '046519b1-e111-44b4-8779-3e64366f9d8f';
  const cj = { ...cfg, humanos: [{ id: JAY, nome: 'Jayme' }] };
  const lib = { ...cj, testeLiberado: true }; // nem contato de teste ve o Jayme
  const barbs = [{ idProfissional: 'b1', apelido: 'Pedro' }, { idProfissional: JAY, apelido: 'jayme' }, { idProfissional: 'bx', apelido: 'X', nomeCompleto: 'jayme do espirito santo' }];
  let pj = g.bvGPlano(entrada({ operacao: 'listar_barbeiros', id_opcao_servico: '1' }), { opcoes: { tipo: 'servico', itens: [{ id: '1', rotulo: 'corte', valor: { idServico: S, nome: 'corte adulto' } }] }, pedido: {} }, lib);
  let rj = g.bvGPasso(pj.st, [ok(barbs)], lib).final;
  assert.deepEqual(rj.resultado.barbeiros.map((b) => b.nome), ['Pedro']);
  // qualquer barbeiro: busca os barbeiros e nunca consulta a agenda do Jayme
  const pedU = { identificado: true, idCliente: 'c1', ultimo: { servico: { idServico: S, nome: 'corte adulto', opcao_id: 'ult' }, barbeiro: null } };
  pj = g.bvGPlano(entrada({ operacao: 'horarios_livres', qualquer: true, data: '2026-10-20' }), { opcoes: {}, pedido: pedU }, cj);
  pj = g.bvGPasso(pj.st, [ok(barbs)], cj);
  assert.ok(pj.reqs.every((q) => q.qs.idProfissional !== JAY && q.qs.idProfissional !== 'bx'));
  // cliente do Jayme: sem sugestao de servico, o contexto manda transferir
  const ped = { idCliente: 'c1', cliente_sem_cadastro: false, cliente_nome: 'Ana', identificado: true };
  rj = g.bvGPasso({ in: entrada({ operacao: 'identificar_cliente' }), ctx: { pedido: {}, opcoes: {} }, meta: { op: 'identificar_cliente', etapa: 'hist', ped } }, [ok([{ idServico: S, idProfissional: JAY, profissional: 'jayme ' }])], cj).final;
  assert.deepEqual(rj.efeitos.pedido.ultimo, { humano: 'Jayme' });
  assert.deepEqual(rj.resultado.ultimo, { humano: 'Jayme' });
  { // 23/11 (ponto 14): ultima visita com varios servicos -> nao ha "o de sempre" para repetir sozinho; so os nomes vao adiante
    const S2 = '22222222-2222-4222-8222-222222222222', S3 = '33333333-3333-4333-8333-333333333333';
    const hist = (linhas) => g.bvGPasso({ in: entrada({ operacao: 'identificar_cliente' }), ctx: { pedido: {}, opcoes: {} }, meta: { op: 'identificar_cliente', etapa: 'hist', ped } }, [ok(linhas), ok([])], cfg);
    const l = (idServico, descricaoServico, extra) => ({ idServico, descricaoServico, idProfissional: 'b1', profissional: 'Pedro ', idComanda: 'k1', dataAbertura: '2026-11-10T14:00:00', ...extra });
    const v = hist([l(S3, 'DEPILAÇÃO DE ORELHA '), l(S2, 'DEPILAÇÃO DE NARIZ'), l(S, 'corte adulto'), l(S, 'corte adulto', { idComanda: 'k0', dataAbertura: '2026-10-01T10:00:00' })]).final;
    assert.deepEqual(v.efeitos.pedido.ultimo, { servicos: ['DEPILAÇÃO DE ORELHA', 'DEPILAÇÃO DE NARIZ', 'corte adulto'] });
    assert.deepEqual(v.resultado.ultimo, { servicos: ['DEPILAÇÃO DE ORELHA', 'DEPILAÇÃO DE NARIZ', 'corte adulto'] });
    // comandas diferentes no mesmo dia tambem sao a mesma visita; o mesmo servico duas vezes conta uma
    assert.deepEqual(hist([l(S3, 'orelha', { idComanda: 'ka' }), l(S, 'corte adulto', { idComanda: 'kb' })]).final.resultado.ultimo, { servicos: ['orelha', 'corte adulto'] });
    assert.ok(hist([l(S, 'corte adulto'), l(S, 'corte adulto')]).reqs); // um servico so: segue para o estagio ult, como sempre
    assert.ok(hist([l(S, 'corte adulto'), l(S3, 'orelha', { idComanda: 'k0', dataAbertura: '2026-10-01T10:00:00' })]).reqs); // o outro servico e de visita anterior
    assert.ok(hist([{ idServico: S, idProfissional: 'b1', profissional: 'Pedro' }, { idServico: S3, idProfissional: 'b1', profissional: 'Pedro' }]).reqs); // sem comanda nem data: so a primeira linha conta
    // barbeiro que so a equipe agenda em QUALQUER linha da ultima visita -> equipe (clausula petrea)
    assert.deepEqual(g.bvGPasso({ in: entrada({ operacao: 'identificar_cliente' }), ctx: { pedido: {}, opcoes: {} }, meta: { op: 'identificar_cliente', etapa: 'hist', ped } }, [ok([l(S3, 'orelha'), l(S, 'corte adulto', { idProfissional: JAY, profissional: 'jayme ' })])], cj).final.resultado.ultimo, { humano: 'Jayme' });
    // o atalho do servico unico nao e usado com a forma nova: horarios_livres sem servico pede o servico
    assert.equal(g.bvGPlano(entrada({ operacao: 'horarios_livres', data: '2026-12-01' }), { opcoes: {}, pedido: { idCliente: 'c1', identificado: true, ultimo: { servicos: ['a', 'b'] } } }, cfg).final.resultado.code, 'servico_nao_escolhido');
    // revisao de 24/11: servico "2a vez" na visita, ou servico sem nome, nao vira sugestao nenhuma (nem a do servico unico): o agente pergunta
    const v2 = hist([l(S, 'CORTE ADULTO 2ª VEZ'), l(S3, 'barba')]).final;
    assert.deepEqual([v2.resultado.ultimo, v2.efeitos.pedido.ultimo], [undefined, null]);
    const v3 = hist([l(S3, ''), l(S, 'corte adulto')]).final;
    assert.deepEqual([v3.resultado.ultimo, v3.efeitos.pedido.ultimo], [undefined, null]);
    assert.equal(hist([l(S3, 'x'.repeat(90)), l(S, 'corte adulto')]).final.resultado.ultimo.servicos[0].length, 60);
  }
  // fase 1: horario, sequencia ou remarcacao com o Jayme -> encaminha; cancelar o agendamento dele segue
  const hJ = { tipo: 'horario', itens: [{ id: '1', rotulo: '10:00', valor: { data: '2026-10-20', hora: '10:00', idProfissional: JAY, apelido: 'jayme', idServico: S, servico: 'corte adulto' } }] };
  assert.equal(semPacote(g.bvGPlano(entrada({ operacao: 'agendar', id_opcao_horario: '1' }), { opcoes: hJ, pedido: { idCliente: 'c1' } }, cj)).final.resultado.code, 'encaminhar_equipe');
  const sqJ = { tipo: 'sequencia', itens: [{ id: '1', rotulo: 's', valor: { data: '2026-10-20', itens: [{ idProfissional: 'b1', apelido: 'Pedro', hora: '10:00' }, { idProfissional: JAY, apelido: 'jayme', hora: '10:40' }] } }] };
  assert.equal(semPacote(g.bvGPlano(entrada({ operacao: 'agendar', id_opcao_horario: '1' }), { opcoes: sqJ, pedido: { idCliente: 'c1' } }, cj)).final.resultado.code, 'encaminhar_equipe');
  const agJ = { opcao_id: '1', idAgenda: 'a1', horaInicio: '2026-10-23T10:00:00', idServico: S, servico: 'corte adulto', idProfissional: JAY, profissional: 'jayme ' };
  assert.equal(g.bvGPlano(entrada({ operacao: 'reagendar', id_opcao_agendamento: '1', id_opcao_horario: '1' }), { opcoes: { tipo: 'horario', itens: [] }, pedido: { idCliente: 'c1', agendamentos: [agJ] } }, cj).final.resultado.code, 'encaminhar_equipe');
  assert.notEqual(g.bvGPlano(entrada({ operacao: 'cancelar', id_opcao_agendamento: '1' }), { opcoes: {}, pedido: { idCliente: 'c1', agendamentos: [agJ] } }, cj).final.resultado.code, 'encaminhar_equipe');
  // fase 2: proposta com o Jayme falha antes de qualquer chamada
  const PJ = '33333333-3333-4333-8333-333333333333';
  rj = g.bvGPlano(entrada({ operacao: 'agendar', proposta_id: PJ }), { pedido: { idCliente: 'c1' }, proposta: { id: PJ, acao: 'agendar', dados: { idCliente: 'c1', idServico: S, idProfissional: JAY, barbeiro: 'jayme', data: '2026-10-20', hora: '10:00', servico: 'corte adulto' } } }, cj).final;
  assert.equal(rj.resultado.code, 'barbeiro_humano');
  assert.equal(rj.efeitos.proposta_upd.estado, 'falhou');
  // transferir_atendimento: handoff para a equipe
  rj = g.bvGPlano(entrada({ operacao: 'transferir_atendimento' }), { pedido: { idCliente: 'c1' } }, cj).final;
  assert.equal(rj.resultado.code, 'encaminhar_equipe');
  assert.equal(rj.efeitos.pedido.handoff, true);
  assert.equal(rj.efeitos.falha.motivo, 'encaminhar_equipe|barbeiro_humano');
}
console.log('graces.test.js jayme ok');

// Agenda real em PROD (owner, 2026-11-15): todos os barbeiros, nunca o de teste nem os so da equipe; TESTE segue redirecionado.
{
  const S = '046519b1-e111-44b4-8779-3e64366f9d8f', JAY = 'b623cd84-6068-4a57-9ce6-2f7d9a37a11e';
  const prodReal = { ...cfg, ambiente: 'producao', redirecionar: false, escritaLiberada: true, testeLiberado: false, humanos: [{ id: JAY, nome: 'Jayme' }] };
  const ent = (o) => { const n = g.bvGNormalizar({ ...base, ambiente: 'producao', ...o }, prodReal); assert.ok(n.ok, JSON.stringify(n)); return n.in; };
  const of = (id, apelido) => ({ tipo: 'horario', itens: [{ id: '1', rotulo: '10:00', valor: { data: '2026-10-20', hora: '10:00', idProfissional: id, apelido, idServico: S, servico: 'corte adulto', preco: 90, minutos: 40 } }] });
  // qualquer contato agenda com barbeiro real; a proposta guarda o barbeiro real
  let r = semPacote(g.bvGPlano(ent({ operacao: 'agendar', id_opcao_horario: '1' }), { opcoes: of('b1', 'Pedro'), pedido: { idCliente: 'c1' } }, prodReal)).final;
  assert.equal(r.resultado.aguardando_confirmacao, true);
  assert.equal(r.efeitos.proposta_nova.dados.idProfissional, 'b1');
  // barbeiro de teste nunca, Jayme vai para a equipe
  assert.equal(semPacote(g.bvGPlano(ent({ operacao: 'agendar', id_opcao_horario: '1' }), { opcoes: of(TESTE, 'ZZ'), pedido: { idCliente: 'c1' } }, prodReal)).final.resultado.code, 'opcao_desconhecida');
  assert.equal(semPacote(g.bvGPlano(ent({ operacao: 'agendar', id_opcao_horario: '1' }), { opcoes: of(JAY, 'jayme'), pedido: { idCliente: 'c1' } }, prodReal)).final.resultado.code, 'encaminhar_equipe');
  // fase 2: grava no barbeiro da proposta (nao redireciona); proposta com o de teste falha
  const PR = '44444444-4444-4444-8444-444444444444';
  const dados = { idCliente: 'c1', idServico: S, servico: 'corte adulto', idProfissional: 'b1', barbeiro: 'Pedro', data: '2026-10-20', hora: '10:00', minutos: 40 };
  let p2 = g.bvGPlano(ent({ operacao: 'agendar', proposta_id: PR }), { pedido: { idCliente: 'c1' }, proposta: { id: PR, acao: 'agendar', dados } }, prodReal);
  assert.ok(p2.reqs.every((q) => !q.qs || !q.qs.idProfissional || q.qs.idProfissional === 'b1'));
  assert.equal(p2.st.meta.redir, false);
  r = g.bvGPlano(ent({ operacao: 'agendar', proposta_id: PR }), { pedido: { idCliente: 'c1' }, proposta: { id: PR, acao: 'agendar', dados: { ...dados, idProfissional: TESTE } } }, prodReal).final;
  assert.equal(r.resultado.code, 'barbeiro_de_teste');
  // remarcar e cancelar agendamento real passam a valer
  const ag = { opcao_id: '1', idAgenda: 'a1', horaInicio: '2026-10-23T10:00:00', idServico: S, servico: 'corte adulto', idProfissional: 'b1', profissional: 'Pedro' };
  assert.equal(g.bvGPlano(ent({ operacao: 'cancelar', id_opcao_agendamento: '1' }), { opcoes: {}, pedido: { idCliente: 'c1', agendamentos: [ag] } }, prodReal).final.resultado.aguardando_confirmacao, true);
  // chave desligada: volta o teste fechado (sem contato de teste, nada grava)
  assert.equal(semPacote(g.bvGPlano(ent({ operacao: 'agendar', id_opcao_horario: '1' }), { opcoes: of('b1', 'Pedro'), pedido: { idCliente: 'c1' } }, { ...prodReal, escritaLiberada: false })).final.resultado.code, 'escrita_desabilitada');
  // TESTE segue redirecionado ao barbeiro de teste
  p2 = g.bvGPlano(entrada({ operacao: 'agendar', proposta_id: PR }), { pedido: { idCliente: 'c1' }, proposta: { id: PR, acao: 'agendar', dados } }, { ...cfg, escritaLiberada: false });
  assert.equal(p2.st.meta.prof, TESTE);
}
console.log('graces.test.js agenda real ok');

// Lembretes do agente no Chat Master (owner, 2026-11-15): ao agendar, programa 24 h e 1 h antes, com o nome do cliente
{
  const S = '046519b1-e111-44b4-8779-3e64366f9d8f', PR = '55555555-5555-4555-8555-555555555555';
  const p = { id: PR, acao: 'agendar', dados: { idCliente: 'c1', idServico: S, servico: 'corte adulto', idProfissional: 'b1', barbeiro: 'Pedro', data: '2030-01-10', hora: '14:00', minutos: 40 } };
  const msgs = { criar: [{ idAgenda: 'ag1', idCliente: 'c1', idProfissional: 'b1', inicio: '2030-01-10T14:00:00', fim: '2030-01-10T14:40:00', servico: 'corte adulto', barbeiro: 'Pedro', recorrente: false, nome: 'Paulo' }], cancelar: [] };
  const msgCfg = { lembretes: [{ tipo: 'lembrete_dia', antes_min: 1440 }, { tipo: 'lembrete_hora', antes_min: 60 }], confirmacao_hora: '18:00', lembrete_antes_min: 120, pos_depois_min: 60 };
  const pr = g.bvGParams({ contato_id: 1, turno_id: 't' }, { mensagens: msgs }, { ativo: true, agora: '2030-01-01T12:00:00Z', cfg: msgCfg, escrita: null });
  const linhas = JSON.parse(pr[14]);
  assert.deepEqual(linhas.map((l) => [l.tipo, l.previsto_para, l.dados.nome]), [['lembrete_dia', '2030-01-09T17:00:00.000Z', 'Paulo'], ['lembrete_hora', '2030-01-10T16:00:00.000Z', 'Paulo']]);
  assert.ok(p); // a proposta acima e o formato que a fase 2 transforma em mensagens (bvgMsgs)
}
console.log('graces.test.js lembretes do agente ok');

// Cliente cadastrado em maiusculas (owner, 2026-11-15): cumprimenta como "Gabriel"
{
  const pi = g.bvGPlano(entrada({ operacao: 'identificar_cliente' }), null, cfg);
  const st = g.bvGPasso(pi.st, [ok([{ idCliente: 'c9', nomeCliente: 'GABRIEL', sobrenomeCliente: 'SANTOS' }])], cfg);
  assert.equal(st.st.meta.ped.cliente_nome, 'Gabriel');
  const vs = g.bvGPasso(pi.st, [ok([{ idCliente: 'a', nomeCliente: 'ANA' }, { idCliente: 'b', nomeCliente: 'ana maria' }])], cfg).final;
  assert.deepEqual(vs.resultado.opcoes.map((o) => o.nome), ['Ana', 'Ana Maria']);
}
console.log('graces.test.js nome normal ok');

// Melhorias dos atendimentos de 2026-11-15 (owner, 2026-11-16): busca de servico, barbeiro da remarcacao e "lotado" de um barbeiro so
{
  const S = '046519b1-e111-44b4-8779-3e64366f9d8f';
  // 1. "cabelo" e "cortar" buscam cortes e combos; com barba, os combos; outros termos seguem iguais
  const termos = (texto) => g.bvGPlano(entrada({ operacao: 'listar_servicos', texto }), null, cfg).reqs.map((q) => q.qs.texto);
  assert.deepEqual(termos('cabelo'), ['corte']);
  assert.deepEqual(termos('cortar o cabelo'), ['corte']);
  assert.deepEqual(termos('cabelo e barba'), ['cabelo']);
  assert.deepEqual(termos('corte e barba'), ['cabelo']);
  assert.deepEqual(termos('corte'), ['corte']);
  assert.deepEqual(termos('barba'), ['barba']);
  const ps = g.bvGPlano(entrada({ operacao: 'listar_servicos', texto: 'cabelo' }), null, cfg);
  const rs = g.bvGPasso(ps.st, [ok([{ idServico: 'c1', descricaoAgenda: 'corte adulto', valorPadrao: 90 }, { idServico: 'c2', descricaoAgenda: 'corte adulto 2º vez' }, { idServico: 'u1', descricaoAgenda: 'Corte de unha' }, { idServico: 'c1', descricaoAgenda: 'corte adulto' }])], cfg).final;
  assert.deepEqual(rs.resultado.servicos.map((x) => x.nome), ['corte adulto']); // so cortes de cabelo, sem repetir, sem "2a vez" e sem unha
  const pc = g.bvGPlano(entrada({ operacao: 'listar_servicos', texto: 'corte' }), null, cfg); // quem pede "corte" ve tudo o que tem corte no nome
  assert.deepEqual(g.bvGPasso(pc.st, [ok([{ idServico: 'c1', descricaoAgenda: 'corte adulto' }, { idServico: 'u1', descricaoAgenda: 'Corte de unha' }])], cfg).final.resultado.servicos.map((x) => x.nome), ['corte adulto', 'Corte de unha']);
  // servico vindo da oferta guarda o id da opcao: a consulta seguinte com o mesmo id resolve (suite R18)
  const ofS = { tipo: 'servico', itens: [{ id: '1', rotulo: 'Corte Infantil', valor: { idServico: S, nome: 'Corte Infantil ate 11 anos', preco: 70, minutos: 40 } }] };
  let pq = g.bvGPlano(entrada({ operacao: 'horarios_livres', id_opcao_servico: '1', qualquer: true, data: '2026-10-27' }), { opcoes: ofS, pedido: {} }, cfg);
  pq = g.bvGPasso(pq.st, [ok([{ idProfissional: 'b1', apelido: 'Pedro' }])], cfg);
  const fq = g.bvGPasso(pq.st, [ok({ minutos: 40, horarios: ['10:00'] }), resp(500, {})], cfg).final;
  assert.equal(fq.efeitos.pedido.servico.opcao_id, '1');
  const depois = g.bvGPlano(entrada({ operacao: 'listar_barbeiros', id_opcao_servico: '1' }), { opcoes: fq.efeitos.opcoes, pedido: fq.efeitos.pedido }, cfg);
  assert.deepEqual(depois.reqs[0].qs, { idServico: S });

  // 2. remarcar mantem o barbeiro do agendamento; sem horario, fala dele e nao troca sozinho
  const agd = { opcao_id: '1', idAgenda: 'a1', horaInicio: '2026-10-23T10:00:00', idServico: S, servico: 'corte adulto', idProfissional: 'b1', profissional: 'Rodrigo ' };
  const ctxR = (extra = {}) => ({ opcoes: {}, pedido: { idCliente: 'c1', agendamentos: [agd], ...extra } });
  let p = g.bvGPlano(entrada({ operacao: 'horarios_livres', id_opcao_agendamento: '1', data: '2026-10-27', periodo: 'tarde' }), ctxR(), cfg);
  assert.ok(p.reqs.every((q) => q.qs.idProfissional === 'b1'));
  let r = g.bvGPasso(p.st, [ok({ minutos: 40, horarios: ['14:00', '15:20'] }), resp(500, {})], cfg).final;
  assert.deepEqual(r.resultado.opcoes.map((o) => [o.hora, o.barbeiro]), [['14:00', 'Rodrigo'], ['15:20', 'Rodrigo']]);
  assert.deepEqual(r.efeitos.pedido.barbeiro, { idProfissional: 'b1', apelido: 'Rodrigo' });
  assert.equal(r.efeitos.pedido.barbeiro_ag, 'a1');
  r = g.bvGPasso(p.st, [ok({ minutos: 40, horarios: [] }), resp(500, {})], cfg).final; // sem horario: nao consulta os outros sozinho
  assert.match(r.resultado.orientacao, /^Rodrigo não tem horário nesse dia \(você só consultou ele: não diga que o dia está lotado\)\. Diga isso e pergunte o que ele prefere; as opções vão em lista junto$/);
  // as alternativas vao em lista (principio X), e a de outros barbeiros leva o dia e o agendamento da remarcacao
  assert.deepEqual(r.resultado.opcoes, [{ id: '1', rotulo: 'Outro dia com ele' }, { id: '2', rotulo: 'Ver outros barbeiros' }]);
  assert.equal(r.efeitos.opcoes.tipo, 'decisao_sem_horario');
  assert.deepEqual(r.efeitos.opcoes.itens[1].valor, { acao: 'outros_barbeiros', data: '2026-10-27', ag: '1' });
  assert.equal(r.efeitos.pedido.busca.n, 0); // busca sem horario nao trava a proxima do turno
  { // servico que so um barbeiro faz: sem "Ver outros barbeiros"; sobrando uma alternativa so, a pergunta e aberta, sem lista
    const um = { ...p.st, ctx: { ...p.st.ctx, pedido: { ...p.st.ctx.pedido, servico: { idServico: S }, barbeiros: [{ opcao_id: '1', idProfissional: 'b1', apelido: 'Rodrigo' }] } } };
    const ru = g.bvGPasso(um, [ok({ minutos: 40, horarios: [] }), resp(500, {})], cfg).final;
    assert.deepEqual([ru.resultado.opcoes.length, ru.efeitos.opcoes.tipo], [0, 'horario']);
    assert.match(ru.resultado.orientacao, /Diga isso e pergunte qual outro dia ele prefere$/);
    const ru2 = g.bvGPasso(um, [ok({ minutos: 40, horarios: ['09:00'] }), resp(500, {})], cfg).final;
    assert.deepEqual(ru2.resultado.opcoes.map((o) => o.rotulo), ['Outro horário no dia', 'Outro dia com ele']);
  }
  r = g.bvGPasso(p.st, [ok({ minutos: 40, horarios: ['09:00'] }), resp(500, {})], cfg).final; // tem horario no dia, nao no periodo pedido
  assert.deepEqual(r.resultado.opcoes.map((o) => o.rotulo), ['Outro horário no dia', 'Outro dia com ele', 'Ver outros barbeiros']);
  assert.match(r.resultado.orientacao, /^Rodrigo não tem horário de tarde nesse dia/);
  // o cliente aceitou outro barbeiro: qualquer=true consulta todos
  assert.deepEqual(g.bvGPlano(entrada({ operacao: 'horarios_livres', id_opcao_agendamento: '1', data: '2026-10-27', qualquer: true }), ctxR(), cfg).reqs, [{ m: 'GET', path: '/servicos/profissionais', qs: { idServico: S } }]);
  // escolheu outro barbeiro para ESTA remarcacao: a proxima consulta sem barbeiro segue com ele; escolha de outra conversa nao vale
  const kiel = { idProfissional: 'b2', apelido: 'Kiel' };
  assert.equal(g.bvGPlano(entrada({ operacao: 'horarios_livres', id_opcao_agendamento: '1', data: '2026-10-28' }), ctxR({ barbeiro: kiel, barbeiro_ag: 'a1' }), cfg).reqs[0].qs.idProfissional, 'b2');
  assert.equal(g.bvGPlano(entrada({ operacao: 'horarios_livres', id_opcao_agendamento: '1', data: '2026-10-28' }), ctxR({ barbeiro: kiel, barbeiro_ag: 'outro' }), cfg).reqs[0].qs.idProfissional, 'b1');
  // agendamento com barbeiro so da equipe: encaminha; com o de teste (TESTE): segue pela uniao dos barbeiros
  const cj = { ...cfg, humanos: [{ id: 'bj', nome: 'Jayme' }] };
  assert.equal(g.bvGPlano(entrada({ operacao: 'horarios_livres', id_opcao_agendamento: '1', data: '2026-10-27' }), { opcoes: {}, pedido: { agendamentos: [{ ...agd, idProfissional: 'bj', profissional: 'jayme' }] } }, cj).final.resultado.code, 'encaminhar_equipe');
  assert.equal(g.bvGPlano(entrada({ operacao: 'horarios_livres', id_opcao_agendamento: '1', data: '2026-10-27' }), { opcoes: {}, pedido: { agendamentos: [{ ...agd, idProfissional: TESTE, profissional: 'ZZ TESTE' }] } }, cfg).reqs[0].path, '/servicos/profissionais');

  // 3. barbeiro habitual (ultimo atendimento) sem horario no periodo: consulta os outros no mesmo passo e avisa
  const pedU = { identificado: true, idCliente: 'c1', ultimo: { servico: { idServico: S, nome: 'barba design', preco: 70, minutos: 40, opcao_id: 'ult' }, barbeiro: { idProfissional: 'bk', apelido: 'Black' } } };
  p = g.bvGPlano(entrada({ operacao: 'horarios_livres', data: '2026-10-27', periodo: 'manha' }), { opcoes: {}, pedido: pedU }, cfg);
  let st2 = g.bvGPasso(p.st, [ok({ minutos: 40, horarios: ['14:00'] }), resp(500, {})], cfg); // Black so tem a tarde
  assert.deepEqual(st2.reqs, [{ m: 'GET', path: '/servicos/profissionais', qs: { idServico: S } }]);
  st2 = g.bvGPasso(st2.st, [ok([{ idProfissional: 'bk', apelido: 'Black' }, { idProfissional: 'b2', apelido: 'Kiel' }])], cfg);
  assert.deepEqual(st2.reqs.map((q) => q.qs.idProfissional), ['b2', 'b2']); // nao consulta o Black de novo
  r = g.bvGPasso(st2.st, [ok({ minutos: 40, horarios: ['09:20', '10:00'] }), resp(500, {})], cfg).final;
  assert.deepEqual(r.resultado.opcoes.map((o) => [o.hora, o.barbeiro]), [['09:20', 'Kiel'], ['10:00', 'Kiel']]);
  assert.match(r.resultado.orientacao, /^Black, o barbeiro de costume do cliente, não tem horário de manha nesse dia: diga isso ao cliente e que os horários da lista são de outros barbeiros/);
  assert.equal(r.efeitos.pedido.barbeiro, undefined); // nao vira escolha do cliente
  // 17/11: pediu o barbeiro de sempre as 9h; ele nao tem e outro barbeiro tem as 9h. O horario pedido NAO vai direto ao resumo:
  // a lista e de outro barbeiro, e o cliente tem de aceitar (antes saia "corte com outro barbeiro, posso confirmar?")
  {
    const T9 = '99999999-9999-4999-8999-999999999999';
    const p9 = g.bvGPlano(entrada({ operacao: 'horarios_livres', data: '2026-10-27', hora: '09:00', turno_id: T9 }), { opcoes: {}, pedido: pedU }, cfg);
    let s9 = g.bvGPasso(p9.st, [ok({ minutos: 40, horarios: [] }), resp(500, {})], cfg); // o barbeiro de sempre nao tem nada no dia
    s9 = g.bvGPasso(s9.st, [ok([{ idProfissional: 'bk', apelido: 'Black' }, { idProfissional: 'b2', apelido: 'Kiel' }])], cfg);
    const r9 = g.bvGPasso(s9.st, [ok({ minutos: 40, horarios: ['09:00'] }), resp(500, {})], cfg).final;
    assert.deepEqual(r9.resultado.opcoes.map((o) => [o.hora, o.barbeiro]), [['09:00', 'Kiel']]);
    assert.equal(r9.resultado.horario_pedido_livre, undefined);
    assert.deepEqual({ ...r9.efeitos.pedido.busca, chave: undefined }, { turno: T9, n: 1, livre: null, hora: true, outros: true, chave: undefined });
    const ag9 = (turno) => semPacote(g.bvGPlano(entrada({ operacao: 'agendar', id_opcao_horario: '1', turno_id: turno }), { opcoes: r9.efeitos.opcoes, pedido: { ...pedU, ...r9.efeitos.pedido } }, cfg)).final.resultado;
    assert.equal(ag9(T9).code, 'cliente_nao_escolheu');
    assert.equal(ag9('88888888-8888-4888-8888-888888888888').aguardando_confirmacao, true); // turno seguinte: ele aceitou
  }
  // habitual com horario: lista dele e segue como sugestao (nao grava como escolha)
  r = g.bvGPasso(p.st, [ok({ minutos: 40, horarios: ['09:20'] }), resp(500, {})], cfg).final;
  assert.deepEqual([r.resultado.opcoes[0].barbeiro, r.efeitos.pedido.barbeiro], ['Black', undefined]);
  // barbeiro escolhido pelo cliente sem horario: fala dele, sem trocar
  p = g.bvGPlano(entrada({ operacao: 'horarios_livres', data: '2026-10-27' }), { opcoes: {}, pedido: { ...pedU, barbeiro: { idProfissional: 'bk', apelido: 'Black' } } }, cfg);
  r = g.bvGPasso(p.st, [ok({ minutos: 40, horarios: [] }), resp(500, {})], cfg).final;
  assert.match(r.resultado.orientacao, /^Black não tem horário nesse dia/);
}
console.log('graces.test.js melhorias dos atendimentos ok');

// Suite R18 e R21 (2026-11-16): servico pelo nome ou ja escolhido; cliente novo e cadastrado antes da transferencia
{
  const S = '046519b1-e111-44b4-8779-3e64366f9d8f';
  const inf = { idServico: S, nome: 'Corte Infantil ate 11 anos', preco: 70, minutos: 40, opcao_id: '1' };
  const ofH = { tipo: 'horario', itens: [] }; // depois de ver horarios a oferta nao e mais de servicos
  // o modelo manda o NOME no lugar do id: casa com o servico escolhido
  let n = g.bvGNormalizar({ ...base, operacao: 'listar_barbeiros', id_opcao_servico: 'Corte Infantil ate 11 anos' }, cfg);
  assert.deepEqual([n.ok, n.in.id_opcao_servico, n.in.servico_nome], [true, undefined, 'Corte Infantil ate 11 anos']);
  assert.deepEqual(g.bvGPlano(n.in, { opcoes: ofH, pedido: { servico: inf } }, cfg).reqs[0].qs, { idServico: S });
  // sem id nem nome: usa o servico ja escolhido; sem servico nenhum: pede para escolher
  assert.deepEqual(g.bvGPlano(entrada({ operacao: 'listar_barbeiros' }), { opcoes: ofH, pedido: { servico: inf } }, cfg).reqs[0].qs, { idServico: S });
  assert.equal(g.bvGPlano(entrada({ operacao: 'listar_barbeiros' }), { opcoes: ofH, pedido: {} }, cfg).final.resultado.code, 'servico_nao_escolhido');
  // nome de um servico que nao foi ofertado nem escolhido: nunca troca em silencio
  n = g.bvGNormalizar({ ...base, operacao: 'listar_barbeiros', id_opcao_servico: 'Coloração completa' }, cfg);
  assert.equal(g.bvGPlano(n.in, { opcoes: ofH, pedido: { servico: inf } }, cfg).final.resultado.code, 'opcao_desconhecida');
  // nome casando com um item da oferta de servicos em curso
  const ofS = { tipo: 'servico', itens: [{ id: '2', rotulo: 'corte adulto', valor: { idServico: 'sa', nome: 'corte adulto', preco: 90, minutos: 40 } }] };
  n = g.bvGNormalizar({ ...base, operacao: 'horarios_livres', id_opcao_servico: 'Corte Adulto', qualquer: true, data: '2026-10-27' }, cfg);
  assert.deepEqual(g.bvGPlano(n.in, { opcoes: ofS, pedido: { servico: inf } }, cfg).reqs[0].qs, { idServico: 'sa' });
  // transferir: cliente novo e cadastrado antes; ja cadastrado (ou cadastro desligado) transfere direto
  const aberto2 = { ...cfg, cadastroLiberado: true };
  assert.equal(g.bvGPlano(entrada({ operacao: 'transferir_atendimento' }), { pedido: { cliente_sem_cadastro: true } }, aberto2).final.resultado.code, 'cadastre_primeiro');
  assert.equal(g.bvGPlano(entrada({ operacao: 'transferir_atendimento' }), { pedido: { cliente_sem_cadastro: true } }, cfg).final.resultado.code, 'encaminhar_equipe');
  assert.equal(g.bvGPlano(entrada({ operacao: 'transferir_atendimento' }), { pedido: { idCliente: 'c1', cliente_sem_cadastro: false } }, aberto2).final.resultado.code, 'encaminhar_equipe');
}
console.log('graces.test.js servico pelo nome ok');

// Quem tem horario, em frase pronta (suite R18, 2026-11-16)
{
  const S = '046519b1-e111-44b4-8779-3e64366f9d8f';
  const bs = [{ opcao_id: '1', idProfissional: 'bk', apelido: 'Kiel' }, { opcao_id: '2', idProfissional: 'br', apelido: 'Rodrigo' }, { opcao_id: '3', idProfissional: 'bp', apelido: 'Pedro' }, { opcao_id: '4', idProfissional: 'bb', apelido: 'Black' }];
  const ped = { servico: { idServico: S, nome: 'Corte Infantil', opcao_id: '1' }, barbeiros: bs };
  const p = g.bvGPlano(entrada({ operacao: 'horarios_livres', qualquer: true, data: '2026-10-27' }), { opcoes: {}, pedido: ped }, cfg);
  const grade = (hs) => ok({ minutos: 40, horarios: hs });
  const r = g.bvGPasso(p.st, [grade(['09:20', '12:00']), grade(['11:20', '12:00', '12:40']), grade(['16:00']), grade([]), resp(500, {}), resp(500, {}), resp(500, {}), resp(500, {})], cfg).final.resultado;
  assert.equal(r.quem_tem_horario, 'Kiel a partir de 09:20; Rodrigo a partir de 11:20; Pedro a partir de 16:00 (só esse horário); Black sem horário');
  assert.deepEqual(r.opcoes.filter((o) => o.barbeiro === 'Rodrigo').map((o) => o.hora), ['11:20', '12:40']); // a lista mostra um barbeiro por horario
  assert.match(r.orientacao, /use quem_tem_horario como está/);
}
console.log('graces.test.js quem tem horario ok');

// Remarcacao com a lista de qualquer barbeiro (suite R8, 2026-11-16): a ferramenta diz que a lista nao e do barbeiro do agendamento
{
  const S = '046519b1-e111-44b4-8779-3e64366f9d8f';
  const agT = { opcao_id: '1', idAgenda: 'a1', horaInicio: '2026-10-23T10:00:00', idServico: S, servico: 'corte adulto', idProfissional: TESTE, profissional: 'ZZ TESTE' };
  let p = g.bvGPlano(entrada({ operacao: 'horarios_livres', id_opcao_agendamento: '1', data: '2026-10-27' }), { opcoes: {}, pedido: { agendamentos: [agT] } }, cfg);
  p = g.bvGPasso(p.st, [ok([{ idProfissional: 'b1', apelido: 'Kiel' }])], cfg);
  const r = g.bvGPasso(p.st, [ok({ minutos: 40, horarios: ['10:00'] }), resp(500, {})], cfg).final.resultado;
  assert.match(r.orientacao, /^os horários da lista são de qualquer barbeiro, não do barbeiro do agendamento: não diga que a remarcação mantém o barbeiro/);
}
console.log('graces.test.js remarcacao com qualquer barbeiro ok');

// Motivos de transferir_atendimento (itens 7 e 9, 2026-11-16)
{
  const aberto = { ...cfg, cadastroLiberado: true, textos: { encaminhar_equipe: 'Vou passar para a equipe.' } };
  const novo = { pedido: { cliente_sem_cadastro: true } };
  const t = (motivo, ctx) => g.bvGPlano(entrada({ operacao: 'transferir_atendimento', ...(motivo ? { motivo } : {}) }), ctx || novo, aberto).final;
  assert.equal(t().resultado.code, 'cadastre_primeiro'); // barbeiro da equipe: cadastro antes
  assert.equal(t('barbeiro_equipe').resultado.code, 'cadastre_primeiro');
  { // 23/11: o cadastro so segura a transferencia no turno em que o cliente foi visto sem cadastro; num turno seguinte, ainda sem
    // cadastro, a transferencia sai (o cliente do barbeiro so da equipe nunca fica preso no pedido de cadastro)
    const visto = (turno) => ({ pedido: { cliente_sem_cadastro: true, sem_cadastro_desde: turno } });
    assert.equal(t('barbeiro_equipe', visto(T2)).resultado.code, 'cadastre_primeiro'); // mesmo turno da identificacao: pede o cadastro
    assert.equal(t('barbeiro_equipe', visto(T2)).efeitos.pedido.sem_cadastro_desde, T2);
    assert.match(t('barbeiro_equipe', visto(T2)).resultado.orientacao, /chame esta ferramenta de novo na próxima mensagem/);
    const tr = t('barbeiro_equipe', visto(T1)); // turno seguinte: transfere, mesmo que o agente tenha pedido o cadastro por conta propria
    assert.equal(tr.resultado.code, 'encaminhar_equipe');
    assert.equal(tr.efeitos.falha.motivo, 'encaminhar_equipe|barbeiro_humano');
    assert.equal(t(undefined, visto(T1)).resultado.code, 'encaminhar_equipe'); // sem motivo = barbeiro da equipe
    // conversa sem a marca (anterior a esta versao): a primeira chamada pede o cadastro e marca; a de um turno seguinte transfere
    const p1 = t('barbeiro_equipe');
    assert.deepEqual([p1.resultado.code, p1.efeitos.pedido.sem_cadastro_desde], ['cadastre_primeiro', T2]);
    // quem se cadastrou no meio segue como sempre; com o cadastro desligado nunca houve o pedido
    assert.equal(t('barbeiro_equipe', { pedido: { idCliente: 'c1', cliente_sem_cadastro: false, sem_cadastro_desde: T1 } }).resultado.code, 'encaminhar_equipe');
    assert.equal(g.bvGPlano(entrada({ operacao: 'transferir_atendimento' }), novo, { ...aberto, cadastroLiberado: false }).final.resultado.code, 'encaminhar_equipe');
    // a identificacao sem cadastro grava o turno em que o cliente foi visto assim
    const pi = g.bvGPlano(entrada({ operacao: 'identificar_cliente' }), { pedido: {} }, aberto);
    assert.equal(g.bvGPasso(pi.st, [ok([])], aberto).final.efeitos.pedido.sem_cadastro_desde, T2);
    // identificar de novo num turno seguinte nao recomeca a contagem (senao o pedido de cadastro voltava a cada mensagem)
    const pi2 = g.bvGPlano(entrada({ operacao: 'identificar_cliente' }), visto(T1), aberto);
    assert.equal(g.bvGPasso(pi2.st, [ok([])], aberto).final.efeitos.pedido.sem_cadastro_desde, T1);
    assert.equal(t('barbeiro_equipe', { pedido: { ...visto(T1).pedido, ...g.bvGPasso(pi2.st, [ok([])], aberto).final.efeitos.pedido } }).resultado.code, 'encaminhar_equipe');
    // marca sozinha, sem o cliente estar marcado como sem cadastro (resto de outro estado), nao vale
    const pi3 = g.bvGPlano(entrada({ operacao: 'identificar_cliente' }), { pedido: { sem_cadastro_desde: T1 } }, aberto);
    assert.equal(g.bvGPasso(pi3.st, [ok([])], aberto).final.efeitos.pedido.sem_cadastro_desde, T2);
  }
  const jaPediu = { pedido: { cliente_sem_cadastro: true, pediu_numero: '99999999-9999-4999-8999-999999999999' } }; // pediu o numero num turno anterior
  for (const m of ['ja_cliente', 'pediu_pessoa', 'atraso', 'nao_resolvi']) { // esses vao direto, mesmo sem cadastro
    const r = t(m, m === 'ja_cliente' ? jaPediu : undefined);
    assert.equal(r.resultado.code, 'encaminhar_equipe');
    assert.equal(r.efeitos.pedido.handoff, true);
    assert.equal(r.efeitos.falha.motivo, 'encaminhar_equipe|' + m);
  }
  const base = t('pediu_pessoa').resultado.texto; // texto de encaminhamento do config, sem frase de abertura
  assert.equal(base, 'Vou passar para a equipe.');
  assert.equal(t('ja_cliente', jaPediu).resultado.texto, 'Como você já é cliente, seu cadastro deve estar com outro número. ' + base);
  // primeira chamada: pede o contato pelo numero do cadastro; no mesmo turno continua recusando; no turno seguinte transfere
  const p1 = t('ja_cliente');
  assert.equal(p1.resultado.code, 'peca_o_numero_do_cadastro');
  assert.ok(p1.efeitos.pedido.pediu_numero);
  assert.match(p1.resultado.texto, /^Como você já é cliente, seu cadastro deve estar com outro número\. Você consegue me chamar pelo número que está no cadastro\?/);
  assert.equal(p1.efeitos.pedido.handoff, undefined); // ainda nao transferiu
  assert.equal(t('outra_pessoa', { pedido: { idCliente: 'c1', pediu_numero: p1.efeitos.pedido.pediu_numero } }).resultado.code, 'peca_o_numero_do_cadastro');
  assert.equal(t('outra_pessoa', { pedido: { idCliente: 'c1', pediu_numero: jaPediu.pedido.pediu_numero } }).resultado.code, 'encaminhar_equipe');
  assert.equal(t('atraso').resultado.texto, 'Entendi! Quem confirma isso é a equipe. ' + base);
  assert.equal(t('nao_resolvi').resultado.texto, base);
  assert.equal(t('qualquer coisa').efeitos.falha.motivo, 'encaminhar_equipe|nao_resolvi'); // valor desconhecido
  assert.equal(t(null, { pedido: {} }).efeitos.falha.motivo, 'encaminhar_equipe|barbeiro_humano'); // sem motivo: clausula do Jayme, como antes
}
console.log('graces.test.js motivos de transferencia ok');

// Mais pedidos primeiro (item 10, owner 2026-11-16): a lista de 10 nao pode esconder o corte adulto
{
  const nomes = ['APLICAÇÃO', 'barba design', 'BARBA EXPRESS', 'Barba lisa', 'Barboterapia', 'Cabelo adulto + barba', 'Cabelo máquina + barba', 'Camuflagem', 'Camuflagem Barba', 'Coloração', 'corte adulto', 'corte adulto 2º vez', 'corte com maquina', 'Corte Infantil ate 11 anos'];
  const corpo = nomes.map((n, k) => ({ idServico: 's' + k, descricaoAgenda: n, tempoPadrao: 40, valorPadrao: 50, ativo: true }));
  const lista = (c) => g.bvGPasso(g.bvGPlano(entrada({ operacao: 'listar_servicos' }), null, c).st, [ok(corpo)], c).final.resultado;
  const dest = { ...cfg, destaque: ['corte adulto', 'corte com maquina', 'barba design', 'Corte Infantil ate 11 anos', 'Cabelo adulto + barba', 'Serviço que saiu do catálogo'] };
  const r = lista(dest);
  // destaque na ordem do config (maiusculas e espacos nao importam); o resto depois, na ordem da API; "2a vez" segue fora
  assert.deepEqual(r.servicos.map((s) => s.nome), ['corte adulto', 'corte com maquina', 'barba design', 'Corte Infantil ate 11 anos', 'Cabelo adulto + barba', 'APLICAÇÃO', 'BARBA EXPRESS', 'Barba lisa', 'Barboterapia', 'Cabelo máquina + barba']);
  assert.equal(r.total, 13);
  assert.match(r.orientacao, /mais pedidos e há outros/);
  assert.deepEqual(lista(cfg).servicos.map((s) => s.nome).slice(0, 2), ['APLICAÇÃO', 'barba design']); // sem destaque no config: ordem da API, como antes
}
console.log('graces.test.js mais pedidos ok');

// Segunda analise (2026-11-16): quem escolhe o horario e o cliente; sem cadastro a fase 1 pede o cadastro; motivos novos
{
  const S = '046519b1-e111-44b4-8779-3e64366f9d8f';
  const T = '11111111-1111-4111-8111-111111111111', T2 = '22222222-2222-4222-8222-222222222222';
  const b = { opcao_id: '1', idProfissional: 'bk', apelido: 'Kiel' };
  const ped = { idCliente: 'c1', servico: { idServico: S, nome: 'corte adulto', opcao_id: '1', preco: 90 }, barbeiro: b, barbeiros: [b] };
  const busca = (hora, hs, turno) => {
    const p = g.bvGPlano(entrada({ operacao: 'horarios_livres', id_opcao_barbeiro: '1', data: '2026-10-27', ...(hora ? { hora } : {}), turno_id: turno }), { opcoes: { tipo: 'barbeiro', itens: [{ id: '1', valor: b }] }, pedido: ped }, cfg);
    return g.bvGPasso(p.st, [ok({ minutos: 40, horarios: hs }), resp(500, {})], cfg).final;
  };
  const agendar = (f, turno, id) => semPacote(g.bvGPlano(entrada({ operacao: 'agendar', id_opcao_horario: id, turno_id: turno }), { opcoes: f.efeitos.opcoes, pedido: { ...ped, ...f.efeitos.pedido } }, cfg)).final.resultado;
  // pediu 09:30, so ha 13:20 e 14:00: no turno da busca o agente nao pode propor 13:20
  let f = busca('09:30', ['13:20', '14:00'], T);
  assert.deepEqual({ ...f.efeitos.pedido.busca, chave: undefined }, { turno: T, n: 2, livre: null, hora: true, outros: false, chave: undefined });
  assert.equal(agendar(f, T, '1').code, 'cliente_nao_escolheu');
  assert.equal(agendar(f, T2, '1').aguardando_confirmacao, true); // turno seguinte: o cliente escolheu
  // pediu 14:00 e esta livre: vai direto ao resumo; so ele
  f = busca('14:00', ['13:20', '14:00'], T);
  const livre = f.resultado.horario_pedido_livre;
  assert.equal(agendar(f, T, livre).aguardando_confirmacao, true);
  assert.equal(agendar(f, T, livre === '1' ? '2' : '1').code, 'cliente_nao_escolheu');
  // um unico horario na lista, sem hora pedida: pode propor (e exatamente o que o cliente pediu)
  f = busca(null, ['16:00'], T);
  assert.equal(agendar(f, T, '1').aguardando_confirmacao, true);
  // unico horario que NAO e a hora pedida: espera a escolha (17/11: pediu 9h, recebeu "as 8h com outro barbeiro, posso confirmar?")
  f = busca('09:00', ['08:00'], T);
  assert.equal(f.resultado.horario_pedido_livre, undefined);
  assert.equal(agendar(f, T, '1').code, 'cliente_nao_escolheu');
  assert.equal(agendar(f, T2, '1').aguardando_confirmacao, true);
  // "depois das 18h" (a_partir): so os inicios dessa hora em diante, sem o aviso de "perto"; sem nenhum, diz que nao ha a partir dela
  const aPartir = (hora, hs) => {
    const p = g.bvGPlano(entrada({ operacao: 'horarios_livres', id_opcao_barbeiro: '1', data: '2026-10-27', a_partir: hora, turno_id: T }), { opcoes: { tipo: 'barbeiro', itens: [{ id: '1', valor: b }] }, pedido: ped }, cfg);
    return g.bvGPasso(p.st, [ok({ minutos: 40, horarios: hs }), resp(500, {})], cfg).final;
  };
  f = aPartir('18:00', ['14:40', '16:00', '20:00', '20:40']);
  assert.deepEqual(f.resultado.opcoes.map((o) => o.hora), ['20:00', '20:40']);
  assert.equal(f.resultado.orientacao, undefined);
  assert.equal(f.efeitos.pedido.busca.hora, true);
  f = aPartir('18:00', ['14:40', '16:00']);
  assert.equal(f.resultado.total, 0);
  assert.match(f.resultado.orientacao, /Kiel não tem horário a partir das 18:00 nesse dia/);
  assert.equal(g.bvGNormalizar({ ...base, operacao: 'horarios_livres', data: '2026-10-27', a_partir: '18h' }, cfg).resultado.code, 'entrada_invalida');
  // a hora minima vem do texto do cliente no turno (o modelo so manda hora): "depois das", "a partir das", "apos as" a mesma hora
  const norm = (hora, texto, op = 'horarios_livres') => g.bvGNormalizar({ ...base, operacao: op, data: '2026-10-27', hora, texto_cliente: texto }, cfg);
  for (const t of ['Tem horário amanhã depois das 18h?', 'a partir das 18', 'após as 18:00 pode ser', 'DEPOIS DAS 6 da tarde', '[áudio transcrito] só consigo depois das 18 horas']) {
    const n = norm('18:00', t);
    assert.equal(n.ok, true, t);
    assert.deepEqual([n.in.a_partir, n.in.hora, n.in.texto_cliente], ['18:00', undefined, undefined], t);
  }
  for (const t of ['umas 18h', 'depois das 16h não posso, tem às 18h?', '', undefined, 'depois do almoço']) {
    const n = norm('18:00', t);
    assert.deepEqual([n.in.a_partir, n.in.hora, n.in.texto_cliente], [undefined, '18:00', undefined], String(t));
  }
  assert.equal(norm(undefined, 'depois das 18h').in.a_partir, undefined); // sem hora do modelo, nada muda
  // "Obrigado" nao e confirmacao (17/11): a fase 2 so segue com um sim na fala do cliente; sem o texto do turno, nada muda
  {
    const sim = ['Sim', 'pode', 'Pode confirmar', 'isso', 'fechou', 'ok', 'valeu, pode marcar', '👍', '👍🏽', '[áudio transcrito] Sim, pode marcar.', 'confirmo', 'tá bom', 'quero', 's', 'com certeza', 'exato', 'pode sim, obrigado'];
    const nao = ['Obrigado', 'obrigada', 'valeu', 'Oi', 'Boa tarde', '10:00 Kiel', '🙏', 'não', 'Não, obrigado', 'quanto custa?', '.', 'muito obrigado!', 'vlw'];
    for (const t of sim) assert.equal(g.bvgConfirmou(t, 'agendar'), true, t);
    for (const t of nao) assert.equal(g.bvgConfirmou(t, 'agendar'), false, t);
    assert.deepEqual(['Cancelar mesmo', 'cancela', 'sim', 'Remarcar', 'prefiro remarcar', 'Obrigado'].map((t) => g.bvgConfirmou(t, 'cancelar')), [true, true, true, false, false, false]);
    assert.equal(g.bvgConfirmou('cancela', 'agendar'), false);
    // negacao ou espera ao lado do sim nao confirma (revisao de seguranca, 19/11); turno sem fala tambem nao
    for (const t of ['Não quero mais', 'não pode ser nesse horário', 'Não confirma ainda', 'espera, não marca ainda', 'tá caro, deixa', 'deixa quieto, depois eu agendo', 'por favor não', 'n', '(sem texto)']) assert.equal(g.bvgConfirmou(t, 'agendar'), false, t);
    for (const t of ['não quero cancelar', 'não cancela não, deixa como está', 'desisti de cancelar']) assert.equal(g.bvgConfirmou(t, 'cancelar'), false, t);
    assert.equal(g.bvgConfirmou('não quero remarcar', 'reagendar'), false);
    // revisao de correcao (19/11): cancelamento digitado vale mesmo ao lado de "remarcar"; negado nao vale; mais formas de sim
    for (const t of ['Não quero remarcar, pode cancelar', 'cancela, depois eu remarco', 'Sim, cancela. Remarco depois', 'desmarca', 'Desmarcar mesmo', 'pode desmarcar']) assert.equal(g.bvgConfirmou(t, 'cancelar'), true, t);
    for (const t of ['cancela não', 'não cancela', 'por favor não cancela', 'espera, não cancela ainda']) assert.equal(g.bvgConfirmou(t, 'cancelar'), false, t);
    for (const t of ['está bom', 'tudo bem', 'esse mesmo', 'de acordo', 'é mais um mesmo', 'isso mesmo']) assert.equal(g.bvgConfirmou(t, 'agendar'), true, t);
    for (const t of ['Boa tarde', 'bom dia', 'tudo bem? queria saber o preço não']) assert.equal(g.bvgConfirmou(t, 'agendar'), false, t);
    assert.equal(g.bvgConfirmou('['.repeat(40000) + ' sim', 'agendar'), false); // teto de 600: o que vem depois nao conta, e a regex nao estoura
    const f2n = (op, texto) => g.bvGNormalizar({ ...base, operacao: op, proposta_id: T, texto_cliente: texto }, cfg);
    for (const op of ['agendar', 'reagendar', 'cancelar']) {
      const r = f2n(op, 'Obrigado');
      assert.deepEqual([r.ok, r.resultado.code], [false, 'cliente_nao_confirmou'], op);
      assert.match(r.resultado.orientacao, /nada foi feito na agenda/);
      assert.equal(f2n(op, 'Sim').ok, true, op);
      assert.equal(f2n(op, 'Sim').in.texto_cliente, undefined);
      assert.equal(f2n(op, undefined).ok, true, op); // sem o texto do turno a barreira nao age
    }
    assert.equal(g.bvGNormalizar({ ...base, operacao: 'agendar', id_opcao_horario: '1', texto_cliente: 'Obrigado' }, cfg).ok, true); // fase 1: sem barreira
  }
  // Uma lista de horarios por turno (R37, 19/11): outra busca no turno, depois de uma que achou horario, nao roda
  {
    const ctxB = { opcoes: { tipo: 'barbeiro', itens: [{ id: '1', valor: b }] }, pedido: ped };
    const busca = (o, ctx) => g.bvGPlano(entrada({ operacao: 'horarios_livres', id_opcao_barbeiro: '1', turno_id: T, ...o }), ctx, cfg);
    const p1 = busca({ data: '2026-10-27' }, ctxB);
    const f1 = g.bvGPasso(p1.st, [ok({ minutos: 40, horarios: ['10:00', '10:40'] }), resp(500, {})], cfg).final;
    const bu = f1.efeitos.pedido.busca;
    assert.deepEqual([bu.turno, bu.n, typeof bu.chave], [T, 2, 'string']);
    const depois = { opcoes: f1.efeitos.opcoes, pedido: { ...ped, ...f1.efeitos.pedido } };
    const p2 = busca({ data: '2026-10-28' }, depois); // outro dia, mesmo turno
    assert.equal(p2.reqs, undefined); // nao chama a agenda
    assert.equal(p2.final.resultado.code, 'lista_ja_definida');
    assert.match(p2.final.resultado.orientacao, /já está montada \(terça-feira, 27\/10\) e é a que o cliente vai receber/);
    assert.equal(p2.final.efeitos.opcoes, undefined); // a oferta guardada fica
    assert.equal(p2.final.efeitos.falha.motivo, 'graces|busca_repetida');
    assert.equal(busca({ data: '2026-10-27', periodo: 'tarde' }, depois).final.resultado.code, 'lista_ja_definida'); // mesma data, outro filtro
    assert.ok(Array.isArray(busca({ data: '2026-10-27' }, depois).reqs)); // a mesma busca (retentativa do agente) roda de novo
    // a oferta guardada ja nao e a lista de horarios (listar_barbeiros ou meus_agendamentos no meio do turno): a busca nova roda
    assert.ok(Array.isArray(busca({ data: '2026-10-28' }, { ...depois, opcoes: ctxB.opcoes }).reqs));
    assert.ok(Array.isArray(g.bvGPlano(entrada({ operacao: 'horarios_livres', id_opcao_barbeiro: '1', data: '2026-10-28', turno_id: T2 }), depois, cfg).reqs)); // outro turno
    const vazia = g.bvGPasso(p1.st, [ok({ minutos: 40, horarios: [] }), resp(500, {})], cfg).final; // busca sem horario nao trava a seguinte
    assert.equal(vazia.efeitos.pedido.busca.n, 0);
    assert.ok(Array.isArray(busca({ data: '2026-10-28' }, { opcoes: vazia.efeitos.opcoes, pedido: { ...ped, ...vazia.efeitos.pedido } }).reqs));
  }
  // aviso de hora sem resultado: sem o texto de maquina
  f = busca('18:00', ['14:40', '20:00'], T);
  assert.match(f.resultado.orientacao, /^não há horário perto das 18:00; a lista traz os mais próximos/);
  assert.doesNotMatch(f.resultado.orientacao, /60 min/);
  // sem cadastro: a fase 1 manda cadastrar e chamar de novo com a mesma opcao
  const sem = semPacote(g.bvGPlano(entrada({ operacao: 'agendar', id_opcao_horario: '1', turno_id: T2 }), { opcoes: f.efeitos.opcoes, pedido: { ...ped, idCliente: null, cliente_sem_cadastro: true } }, cfg)).final.resultado;
  assert.equal(sem.code, 'cadastre_primeiro');
  assert.match(sem.orientacao, /chame esta ferramenta de novo com a mesma opção/);
  // confirmacao escrita antes da pergunta
  const antes = g.bvGPlano(entrada({ operacao: 'agendar', proposta_id: '33333333-3333-4333-8333-333333333333', turno_id: T2 }), { opcoes: {}, pedido: ped, proposta: null, info: { estado: 'pendente', mesmo_turno: false, antes_da_pergunta: true } }, cfg).final.resultado;
  assert.equal(antes.code, 'confirmacao_antes_da_pergunta');
  // motivos novos de transferencia
  const tr = (m) => g.bvGPlano(entrada({ operacao: 'transferir_atendimento', motivo: m }), { pedido: ped }, { ...cfg, textos: { encaminhar_equipe: 'Vou passar.' } }).final;
  assert.equal(tr('pacote').resultado.texto, 'A equipe confere o seu pacote por aqui. Vou passar.');
  assert.equal(g.bvGPlano(entrada({ operacao: 'transferir_atendimento', motivo: 'outra_pessoa' }), { pedido: { ...ped, pediu_numero: '99999999-9999-4999-8999-999999999999' } }, cfg).final.efeitos.falha.motivo, 'encaminhar_equipe|outra_pessoa');
}
console.log('graces.test.js segunda analise ok');

{ // Teto de agendamentos por contato e dia (owner, 17/11): acima dele quem agenda e a equipe
  const teto = { ...cfg, agendamentosMaxDia: 3, textos: { encaminhar_equipe: 'A equipe continua por aqui.' }, handoff: { setor_id: 78 } };
  const ag = (agendados, extra = {}, c = teto) => semPacote(g.bvGPlano(entrada({ operacao: 'agendar', id_opcao_horario: '1', ...extra }), { ...ctxE(opcoesHora), dia: { agendados } }, c)).final;
  assert.equal(ag(2).resultado.aguardando_confirmacao, true);
  const r3 = ag(3);
  assert.equal(r3.resultado.code, 'encaminhar_equipe');
  assert.equal(r3.resultado.motivo, 'limite_agendamentos');
  assert.equal(r3.resultado.texto, 'A equipe continua por aqui.');
  assert.equal(r3.efeitos.pedido.handoff, true);
  assert.equal(r3.efeitos.handoff.queueId, 78);
  assert.equal(r3.efeitos.proposta_nova, undefined); // nenhuma proposta: nada a confirmar
  assert.equal(ag(7).resultado.code, 'encaminhar_equipe');
  // sem o teto no config (ou zero) nada muda; a contagem ausente vale zero
  assert.equal(ag(9, {}, cfg).resultado.aguardando_confirmacao, true);
  assert.equal(ag(9, {}, { ...teto, agendamentosMaxDia: 0 }).resultado.aguardando_confirmacao, true);
  assert.equal(semPacote(g.bvGPlano(entrada({ operacao: 'agendar', id_opcao_horario: '1' }), ctxE(opcoesHora), teto)).final.resultado.aguardando_confirmacao, true);
  // cancelar e remarcar seguem liberados acima do teto: o cliente consegue desfazer o que marcou
  const canc = g.bvGPlano(entrada({ operacao: 'cancelar', id_opcao_agendamento: '1' }), { ...ctxE(opcoesAg), dia: { agendados: 5 } }, teto).final;
  assert.equal(canc.resultado.aguardando_confirmacao, true);
  console.log('graces.test.js teto de agendamentos ok');
}

{ // Revisao de 17/11, etapa 4: as ferramentas de outra pessoa nao existem mais, nem no codigo
  for (const operacao of ['buscar_pessoa', 'escolher_pessoa', 'cadastrar_terceiro']) {
    assert.equal(g.bvGNormalizar({ ...base, operacao, nome: 'Paulo Souza', id_opcao: '1' }, cfg).resultado.code, 'entrada_invalida');
  }
  assert.equal(g.bvGNormalizar({ ...base, operacao: 'cadastrar_cliente', nome: 'Paulo Souza', celular: '11999998888' }, cfg).resultado.code, 'campo_desconhecido'); // o celular e sempre o do contato
  assert.equal(g.BVG_ACOES.cadastrar_terceiro, undefined);
  console.log('graces.test.js sem ferramentas de outra pessoa ok');
}

{ // Etapa 4: cancelar depois da recusa de presenca nao volta a pergunta "remarcar ou cancelar?" (ja feita no texto da recusa)
  const ag = { opcao_id: '1', idAgenda: 'a1', horaInicio: '2026-10-20T14:00:00', idServico: 's1', servico: 'corte adulto', idProfissional: TESTE, profissional: 'ZZ TESTE', recorrente: false };
  const canc = (pedido) => g.bvGPlano(entrada({ operacao: 'cancelar', id_opcao_agendamento: '1' }), { opcoes: {}, pedido: { idCliente: 'c1', agendamentos: [ag], ...pedido } }, cfg).final;
  const comum = canc({});
  assert.deepEqual(comum.efeitos.opcoes.itens.map((x) => x.valor), ['remarcar', 'cancelar']); // fluxo normal: sugere remarcar em lista
  assert.match(comum.resultado.orientacao, /Remarcar: pergunte o dia e o horário que ele prefere e só então horarios_livres/);
  const recusou = canc({ confirmacao_recusada: { idAgenda: 'a1', em: '2026-10-19T12:00:00Z' } });
  assert.equal(recusou.resultado.aguardando_confirmacao, true);
  assert.equal(recusou.resultado.opcoes, undefined);
  assert.deepEqual(recusou.efeitos.opcoes, {}); // sem lista de decisao
  assert.equal(recusou.efeitos.proposta_nova.acao, 'cancelar');
  assert.match(recusou.resultado.orientacao, /peça só a confirmação do cancelamento/);
  // recusa de OUTRO agendamento: segue o fluxo normal
  assert.deepEqual(canc({ confirmacao_recusada: { idAgenda: 'outro', em: '2026-10-19T12:00:00Z' } }).efeitos.opcoes.itens.map((x) => x.valor), ['remarcar', 'cancelar']);
  assert.match(semPacote(g.bvGPlano(entrada({ operacao: 'agendar', id_opcao_horario: '9' }), { opcoes: {}, pedido: { idCliente: 'c1' } }, cfg)).final.resultado.orientacao, /mande a lista de novo \(no máximo duas vezes/);
  console.log('graces.test.js cancelar depois da recusa ok');
}

{ // Etapa 4 (suite R34/R35): resumo do cancelamento sem o nome de barbeiro que o agente nunca mostra, e oferta de outro horario
  const ag = (prof, id) => ({ opcao_id: '1', idAgenda: 'a1', horaInicio: '2026-10-20T14:00:00', idServico: 's1', servico: 'corte adulto', idProfissional: id, profissional: prof, recorrente: false });
  const c = { ...cfg, ambiente: 'producao', escritaLiberada: true, redirecionar: false, humanos: [{ id: 'jay', nome: 'Jayme' }] };
  const res = (a1) => g.bvGPlano(entrada({ operacao: 'cancelar', id_opcao_agendamento: '1' }), { opcoes: {}, pedido: { idCliente: 'c1', agendamentos: [a1] } }, c).final;
  assert.match(res(ag('Pedro', 'b1')).resultado.resumo, /às 14:00 com Pedro$/);
  assert.match(res(ag('ZZ TESTE INTEGRACAO - NAO AGENDAR', TESTE)).resultado.resumo, /às 14:00$/);
  assert.match(res(ag('Jayme', 'jay')).resultado.resumo, /às 14:00$/); // clausula petrea: o nome nao aparece
  const dados = res(ag('Pedro', 'b1')).efeitos.proposta_nova.dados;
  const f2 = g.bvGPlano(entrada({ operacao: 'cancelar', proposta_id: '33333333-3333-4333-8333-333333333333' }), { pedido: { idCliente: 'c1' }, proposta: { id: '33333333-3333-4333-8333-333333333333', acao: 'cancelar', dados } }, c);
  const fim = g.bvGPasso(conferido(f2, c).st, [ok({ sucesso: true })], c).final.resultado;
  assert.match(fim.feito, /^Cancelado: corte adulto em terça-feira, 20\/10 às 14:00 com Pedro$/);
  // 25/11 (PROD): depois do cancelamento o agente ofereceu "confirmo o horário de sábado?" sem ter o que confirmar
  assert.match(fim.orientacao, /depois, numa pergunta só, ofereça marcar outro horário\. Nenhum horário ficou reservado nem aguardando confirmação nesta conversa: não pergunte se confirma um horário visto antes e não diga que algum está confirmado; se ele quiser marcar, chame horarios_livres de novo e mande o resumo$/);
  console.log('graces.test.js resumo do cancelamento ok');
}

{ // Etapa 4: meus_agendamentos nao leva ao modelo o nome de barbeiro que o agente nunca mostra
  const c = { ...cfg, ambiente: 'producao', escritaLiberada: true, redirecionar: false, testeLiberado: true, humanos: [{ id: 'jay', nome: 'Jayme' }] };
  const p = g.bvGPlano(entrada({ operacao: 'meus_agendamentos' }), { opcoes: {}, pedido: { idCliente: 'c1' } }, c);
  const ag = (id, prof, idProf) => ({ idAgenda: id, horaInicio: '2026-10-20T14:00:00', idServico: 's1', descricaoServico: 'corte adulto', idProfissional: idProf, profissional: prof });
  const r = g.bvGPasso(p.st, [ok([ag('a1', 'Pedro', 'b1'), ag('a2', 'Jayme', 'jay'), ag('a3', 'ZZ TESTE INTEGRACAO - NAO AGENDAR', TESTE)])], c).final.resultado;
  assert.deepEqual(r.agendamentos.map((x) => [x.barbeiro, x.so_equipe]), [['Pedro', undefined], [undefined, true], [undefined, undefined]]);
  assert.ok(!JSON.stringify(r).includes('Jayme') && !JSON.stringify(r).includes('ZZ TESTE'));
  assert.match(r.orientacao, /para remarcar esse, chame transferir_atendimento; cancelar segue o fluxo normal/);
  const so = g.bvGPasso(p.st, [ok([ag('a1', 'Pedro', 'b1')])], c).final.resultado;
  assert.equal(so.orientacao, undefined);
  console.log('graces.test.js meus_agendamentos sem nome oculto ok');
}

{ // Ids de servico valem para a conversa inteira (PROD, 23/11: com duas listas, corte + duas depilacoes virou tres depilacoes, agendadas)
  const sv = (id, nome, preco) => ({ idServico: id, descricaoAgenda: nome, tempoPadrao: 40, valorPadrao: preco, ativo: true });
  const lista = (texto, ped, itens) => { const p0 = g.bvGPlano(entrada({ operacao: 'listar_servicos', texto }), { opcoes: {}, pedido: ped }, cfg); return g.bvGPasso(p0.st, p0.reqs.map(() => ok(itens)), cfg).final; };
  const l1 = lista('corte', {}, [sv('c1', 'corte adulto', 90), sv('c2', 'corte com maquina', 70)]);
  assert.deepEqual(l1.efeitos.opcoes.itens.map((x) => x.id), ['s1', 's2']); // "s" na frente: o id nao e a posicao
  const ped1 = { idCliente: 'c1', ...l1.efeitos.pedido };
  const l2 = lista('depila', ped1, [sv('d0', 'Depilação', 25), sv('d1', 'DEPILAÇÃO DE NARIZ', 25), sv('c1', 'corte adulto', 95)]);
  assert.deepEqual(l2.efeitos.opcoes.itens.map((x) => [x.id, x.valor.nome]), [['s3', 'Depilação'], ['s4', 'DEPILAÇÃO DE NARIZ'], ['s1', 'corte adulto']]); // novo ganha o seguinte; o ja visto guarda o id
  assert.deepEqual(l2.resultado.servicos.map((x) => x.id), ['s3', 's4', 's1']); // o modelo ve os mesmos ids da lista enviada
  const ped2 = { ...ped1, ...l2.efeitos.pedido };
  assert.equal(ped2.servicos_vistos.find((x) => x.id === 's1').preco, 95); // o registro acompanha a ultima leitura
  assert.equal(ped2.servicos_vistos.length, 4);
  // a lista corrente e a de depilacoes; o corte com maquina ("s2") so esta na anterior e continua resolvendo, pelo servico certo
  const pe = g.bvGPlano(entrada({ operacao: 'horarios_livres', id_opcoes_servicos: ['s2', 's4'], data: '2026-12-01' }), { opcoes: l2.efeitos.opcoes, pedido: ped2 }, cfg);
  assert.deepEqual(pe.reqs.map((q) => q.qs.idServico), ['c2', 'd1']);
  assert.deepEqual(pe.st.meta.servicos.map((x) => x.nome), ['corte com maquina', 'DEPILAÇÃO DE NARIZ']);
  assert.ok(pe.st.meta.servicos.every((x) => x.id === undefined)); // o id da opcao nao vai para dentro do servico
  // id nunca ofertado continua recusado; servico de lista anterior tambem vale sozinho
  assert.equal(g.bvGPlano(entrada({ operacao: 'horarios_livres', id_opcoes_servicos: ['s2', 's9'], data: '2026-12-01' }), { opcoes: l2.efeitos.opcoes, pedido: ped2 }, cfg).final.resultado.code, 'opcao_desconhecida');
  assert.deepEqual(g.bvGPlano(entrada({ operacao: 'listar_barbeiros', id_opcao_servico: 's2' }), { opcoes: l2.efeitos.opcoes, pedido: ped2 }, cfg).reqs[0].qs, { idServico: 'c2' });
  // "2" digitado pelo cliente (o segundo da lista) nunca resolve como servico: o modelo tem de usar o id da lista
  for (const id of ['1', '2', '3']) assert.equal(g.bvGPlano(entrada({ operacao: 'listar_barbeiros', id_opcao_servico: id }), { opcoes: l2.efeitos.opcoes, pedido: ped2 }, cfg).final.resultado.code, 'opcao_desconhecida');
  // pedido de conversa antiga com ids numericos guardados: sao ignorados na numeracao nova, sem colidir
  assert.deepEqual(lista('corte', { servicos_vistos: [{ id: '1', idServico: 'zz', nome: 'x' }, { id: 's7', idServico: 'c2', nome: 'corte com maquina' }] }, [sv('c1', 'corte adulto', 90), sv('c2', 'corte com maquina', 70)]).efeitos.opcoes.itens.map((x) => x.id), ['s8', 's7']);
  // conversa que comecou antes desta versao (sem servicos_vistos): a lista corrente resolve como sempre
  assert.deepEqual(g.bvGPlano(entrada({ operacao: 'listar_barbeiros', id_opcao_servico: 's2' }), { opcoes: l1.efeitos.opcoes, pedido: { idCliente: 'c1' } }, cfg).reqs[0].qs, { idServico: 'c2' });
  // o titulo cortado do item ("CORTE MAQUINA SIMPLES (1"), que e o que volta quando o cliente toca, vale como o nome do servico
  const l3 = lista('maquina', {}, [sv('m1', 'CORTE MAQUINA SIMPLES (1 PENTE)', 55), sv('c2', 'corte com maquina', 70)]);
  assert.equal(l3.efeitos.opcoes.itens[0].rotulo, 'CORTE MAQUINA SIMPLES (1');
  const pm = g.bvGPlano(entrada({ operacao: 'listar_barbeiros', id_opcao_servico: 'CORTE MAQUINA SIMPLES (1' }), { opcoes: l3.efeitos.opcoes, pedido: { idCliente: 'c1', ...l3.efeitos.pedido } }, cfg);
  assert.deepEqual(pm.reqs[0].qs, { idServico: 'm1' });
  assert.equal(pm.st.meta.servico.rotulo, undefined); // o rotulo nao entra no servico guardado
  assert.equal(g.bvGPlano(entrada({ operacao: 'listar_barbeiros', id_opcao_servico: 'corte que nao existe' }), { opcoes: l3.efeitos.opcoes, pedido: { idCliente: 'c1' } }, cfg).final.resultado.code, 'opcao_desconhecida');
  // dois servicos com o mesmo titulo cortado: o texto nao escolhe um deles em silencio (a lista volta); o nome completo continua valendo
  const l4 = lista('infantil', {}, [sv('i1', 'Corte Infantil ate 11 anos + barba', 120), sv('i2', 'Corte Infantil ate 11 anos', 70)]);
  assert.deepEqual(l4.efeitos.opcoes.itens.map((x) => x.rotulo), ['Corte Infantil ate 11 an', 'Corte Infantil ate 11 an']);
  const ctx4 = { opcoes: l4.efeitos.opcoes, pedido: { idCliente: 'c1', ...l4.efeitos.pedido } };
  assert.equal(g.bvGPlano(entrada({ operacao: 'listar_barbeiros', id_opcao_servico: 'Corte Infantil ate 11 an' }), ctx4, cfg).final.resultado.code, 'opcao_desconhecida');
  assert.deepEqual(g.bvGPlano(entrada({ operacao: 'listar_barbeiros', id_opcao_servico: 'Corte Infantil ate 11 anos' }), ctx4, cfg).reqs[0].qs, { idServico: 'i2' });
  // "agendar separado" devolve ao modelo os ids da sequencia: tem de ser o id pelo qual cada servico foi pedido, e todos resolvem depois
  const profsDe = (ids) => ok(ids.map((id) => ({ idProfissional: id, apelido: id.toUpperCase() })));
  const plS = g.bvGPlano(entrada({ operacao: 'horarios_livres', id_opcoes_servicos: ['s2', 's4'], data: '2026-12-01' }), { opcoes: l2.efeitos.opcoes, pedido: ped2 }, cfg);
  const semUnico = g.bvGPasso(plS.st, [profsDe(['b1']), profsDe(['b2'])], cfg).final; // nenhum barbeiro faz os dois
  assert.equal(semUnico.resultado.sem_barbeiro_unico, true);
  assert.deepEqual(semUnico.efeitos.pedido.servicos.map((x) => [x.opcao_id, x.nome]), [['s2', 'corte com maquina'], ['s4', 'DEPILAÇÃO DE NARIZ']]);
  const ctxS = { opcoes: semUnico.efeitos.opcoes, pedido: { ...ped2, ...semUnico.efeitos.pedido } };
  const sepS = g.bvGPlano(entrada({ operacao: 'horarios_livres', id_opcao: semUnico.efeitos.opcoes.itens.find((x) => x.valor === 'separados').id, data: '2026-12-01' }), ctxS, cfg).final;
  assert.deepEqual(sepS.resultado.servicos, [{ id: 's2', nome: 'corte com maquina' }, { id: 's4', nome: 'DEPILAÇÃO DE NARIZ' }]);
  const ctxSep = { opcoes: {}, pedido: { ...ctxS.pedido, ...sepS.efeitos.pedido } }; // a oferta foi limpa: o segundo servico resolve pela lista da conversa
  assert.deepEqual(g.bvGPlano(entrada({ operacao: 'listar_barbeiros', id_opcao_servico: 's4' }), ctxSep, cfg).reqs[0].qs, { idServico: 'd1' });
  // titulo de uma palavra ("Pezinho") tem cara de id: nao resolvendo como id, vale como nome; se tambem nao e nome, e recusado (nunca vira o servico ja escolhido)
  const l5 = lista('pez', {}, [sv('p1', 'Pezinho', 30), sv('c1', 'corte adulto', 90)]);
  const ctx5 = { opcoes: l5.efeitos.opcoes, pedido: { idCliente: 'c1', servico: { idServico: 'c1', nome: 'corte adulto', opcao_id: 's2' }, ...l5.efeitos.pedido } };
  assert.deepEqual(g.bvGPlano(entrada({ operacao: 'listar_barbeiros', id_opcao_servico: 'Pezinho' }), ctx5, cfg).reqs[0].qs, { idServico: 'p1' });
  assert.equal(g.bvGPlano(entrada({ operacao: 'listar_barbeiros', id_opcao_servico: 'Selagem' }), ctx5, cfg).final.resultado.code, 'opcao_desconhecida');
  assert.deepEqual(g.bvGPlano(entrada({ operacao: 'listar_barbeiros' }), ctx5, cfg).reqs[0].qs, { idServico: 'c1' }); // sem id nem nome: o servico ja escolhido, como antes
  console.log('graces.test.js ids de servico da conversa ok');
}

{ // Agendamento feito por pacote (formato real medido em 23/11): o servico vem dentro de servicoPacote, sem idServico nem
  // descricaoServico em cima. Antes: lista sem o nome do servico, "Cancelar undefined" e remarcacao impossivel.
  const SP = '046519b1-e111-44b4-8779-3e64366f9d8f';
  const doPacote = { idAgenda: 'a7', horaInicio: '2026-12-01T10:00:00', horaFim: '2026-12-01T10:40:00', idProfissional: TESTE, profissional: 'ZZ TESTE ', idStatusAgenda: 2, status: 'A Confirmar', recorrente: false, excluido: false, servicoPacote: { idServico: SP, descricaoServico: 'corte adulto' } };
  const avulso = { idAgenda: 'a8', horaInicio: '2026-12-02T11:00:00', idServico: 's2', descricaoServico: 'barba design', idProfissional: TESTE, profissional: 'ZZ TESTE', recorrente: false };
  const pm = g.bvGPlano(entrada({ operacao: 'meus_agendamentos' }), { opcoes: {}, pedido: { idCliente: 'c1' } }, cfg);
  const rm = g.bvGPasso(pm.st, [ok([doPacote, avulso])], cfg).final;
  assert.deepEqual(rm.efeitos.opcoes.itens.map((x) => x.rotulo), ['01/12 10:00 corte adulto', '02/12 11:00 barba design']); // o do pacote aparece com o servico
  assert.deepEqual([rm.efeitos.opcoes.itens[0].valor.idServico, rm.efeitos.opcoes.itens[0].valor.servico], [SP, 'corte adulto']);
  assert.deepEqual(rm.efeitos.pedido.futuros.map((f) => [f.idServico, f.servico]), [[SP, 'corte adulto'], ['s2', 'barba design']]);
  // cancelar: o resumo traz o nome do servico (nunca "undefined")
  const ctxA = { opcoes: rm.efeitos.opcoes, pedido: { idCliente: 'c1', ...rm.efeitos.pedido } };
  const pc = g.bvGPlano(entrada({ operacao: 'cancelar', id_opcao_agendamento: rm.efeitos.opcoes.itens[0].id }), ctxA, cfg).final;
  assert.match(pc.resultado.resumo, /^Cancelar corte adulto em terça-feira, 01\/12 às 10:00$/);
  assert.ok(!/undefined/.test(JSON.stringify(pc)));
  // remarcar: a busca de horarios usa o servico do pacote
  const ph = g.bvGPlano(entrada({ operacao: 'horarios_livres', id_opcao_agendamento: rm.efeitos.opcoes.itens[0].id, data: '2026-12-03' }), ctxA, cfg);
  assert.ok(JSON.stringify(ph.reqs || ph.final).includes(SP));
  // a identificacao tambem le os futuros com o servico do pacote
  const pid = g.bvGPlano(entrada({ operacao: 'identificar_cliente' }), { pedido: {} }, cfg);
  const ph1 = g.bvGPasso(pid.st, [ok([{ idCliente: 'c1', nomeCliente: 'Ana' }])], cfg);
  const fut = g.bvGPasso(ph1.st, [ok([]), ok([doPacote])], cfg).final;
  assert.deepEqual(fut.efeitos.pedido.futuros.map((f) => [f.idServico, f.servico]), [[SP, 'corte adulto']]);
  // agendamento que chega sem servico nenhum (formato inesperado): o resumo diz "agendamento", nunca "undefined"
  const semServ = g.bvGPasso(pm.st, [ok([{ idAgenda: 'a9', horaInicio: '2026-12-04T09:00:00', idProfissional: TESTE, profissional: 'ZZ TESTE', recorrente: false, servicoPacote: {} }])], cfg).final;
  const pcs = g.bvGPlano(entrada({ operacao: 'cancelar', id_opcao_agendamento: semServ.efeitos.opcoes.itens[0].id }), { opcoes: semServ.efeitos.opcoes, pedido: { idCliente: 'c1', ...semServ.efeitos.pedido } }, cfg).final;
  assert.match(pcs.resultado.resumo, /^Cancelar agendamento em /);
  console.log('graces.test.js agendamento por pacote com servico ok');
}

{ // Cancelar agendamento de pacote (24/11): pela API a sessao nao volta ao pacote (medido e conferido pelo owner no sistema). O agente
  // nunca manda o DELETE: confere a agenda na hora, antes de apagar, e passa para a equipe. Na duvida, nao apaga.
  const SP = '046519b1-e111-44b4-8779-3e64366f9d8f', PIDP = '44444444-4444-4444-8444-444444444444';
  const cfgT = { ...cfg, textos: { encaminhar_equipe: 'Vou passar para a equipe.' }, handoff: { setor_id: 106 } };
  const doPacote = { idAgenda: 'a7', horaInicio: '2026-12-01T10:00:00', idProfissional: TESTE, profissional: 'ZZ TESTE ', recorrente: false, servicoPacote: { idServico: SP, descricaoServico: 'corte adulto' } };
  const avulso = { idAgenda: 'a8', horaInicio: '2026-12-02T11:00:00', idServico: 's2', descricaoServico: 'barba design', idProfissional: TESTE, profissional: 'ZZ TESTE', recorrente: false };
  const pm = g.bvGPlano(entrada({ operacao: 'meus_agendamentos' }), { opcoes: {}, pedido: { idCliente: 'c1' } }, cfgT);
  const rm = g.bvGPasso(pm.st, [ok([doPacote, avulso])], cfgT).final;
  assert.deepEqual(rm.efeitos.opcoes.itens.map((x) => !!x.valor.pacote), [true, false]); // a marca acompanha o agendamento (so para avisar o modelo)
  assert.deepEqual(rm.efeitos.pedido.futuros.map((f) => !!f.pacote), [true, false]);
  const ctxA = { opcoes: rm.efeitos.opcoes, pedido: { idCliente: 'c1', ...rm.efeitos.pedido } };
  const [idP, idA] = rm.efeitos.opcoes.itens.map((x) => x.id);
  // fase 1: a decisao "remarcar ou cancelar" continua igual; o modelo e avisado de que e do pacote
  const f1 = g.bvGPlano(entrada({ operacao: 'cancelar', id_opcao_agendamento: idP }), ctxA, cfgT).final;
  assert.deepEqual([f1.resultado.sugerir_remarcar, f1.efeitos.proposta_nova.acao], [true, 'cancelar']);
  assert.match(f1.resultado.pacote, /remarcar mantém a sessão/);
  // fase 2: sempre le a agenda do cliente antes de apagar
  const fase2 = (acao, dados, ped) => g.bvGPlano(entrada({ operacao: acao.startsWith('cancelar') ? 'cancelar' : 'agendar', proposta_id: PIDP }), { pedido: ped === undefined ? { idCliente: 'c1' } : ped, proposta: { id: PIDP, acao, dados } }, cfgT);
  const f2 = fase2('cancelar', f1.efeitos.proposta_nova.dados);
  assert.deepEqual(f2.reqs, [{ m: 'GET', path: '/agenda/agendamentos', qs: { idCliente: 'c1', proximos: true, pageSize: 200 } }]);
  const t2 = g.bvGPasso(f2.st, [ok([doPacote, avulso])], cfgT).final; // a agenda diz que e de pacote: nenhum DELETE, vai para a equipe
  assert.deepEqual([t2.resultado.code, t2.resultado.motivo], ['encaminhar_equipe', 'pacote']);
  assert.equal(t2.resultado.texto, 'Como esse horário é do seu pacote, quem cancela é a equipe, para a sessão voltar para o seu pacote. Vou passar para a equipe.');
  assert.deepEqual([t2.efeitos.pedido.handoff, t2.efeitos.handoff.queueId, t2.efeitos.falha.motivo, t2.efeitos.falha.operacao], [true, 106, 'encaminhar_equipe|pacote', 'cancelar']);
  assert.deepEqual(t2.efeitos.proposta_upd, { id: PIDP, estado: 'falhou', resultado: { ok: false, code: 'pacote_equipe' } });
  // proposta SEM marca nenhuma (nasceu do "Nao vou poder" do lembrete, ou antes desta versao) e pedido sem agendamentos lidos: a
  // decisao e pela agenda lida agora, entao transfere do mesmo jeito
  const doLembrete = { idAgenda: 'a7', horaInicio: '2026-12-01T10:00:00', recorrente: false, servico: 'horário', idCliente: 'c9' };
  const fl = fase2('cancelar', doLembrete, {});
  assert.deepEqual(fl.reqs[0].qs, { idCliente: 'c9', proximos: true, pageSize: 200 }); // o cliente vem da proposta do lembrete
  assert.equal(g.bvGPasso(fl.st, [ok([doPacote])], cfgT).final.resultado.motivo, 'pacote');
  // na duvida, nada e apagado: leitura que falha, agendamento que nao esta mais na agenda, cliente desconhecido
  const naoLeu = g.bvGPasso(f2.st, [resp(500, {})], cfgT).final;
  assert.deepEqual([naoLeu.resultado.code, naoLeu.efeitos.proposta_upd.estado, !!naoLeu.efeitos.handoff], ['nao_conferido', 'falhou', false]);
  assert.equal(g.bvGPasso(f2.st, [resp(0, null)], cfgT).final.resultado.code, 'nao_conferido');
  assert.equal(g.bvGPasso(f2.st, [ok({ nao: 'lista' })], cfgT).final.resultado.code, 'nao_conferido');
  assert.equal(g.bvGPasso(f2.st, [ok([avulso])], cfgT).final.resultado.code, 'agendamento_nao_encontrado');
  const semCliente = fase2('cancelar', { idAgenda: 'a7', horaInicio: '2026-12-01T10:00:00', servico: 'horário' }, {});
  assert.ok(!semCliente.reqs && semCliente.final.resultado.code === 'encaminhar_equipe' && semCliente.final.resultado.motivo === 'nao_resolvi');
  assert.equal(semCliente.final.resultado.texto, 'Vou passar para a equipe.'); // sem o texto do pacote: nao se sabe se e
  assert.equal(semCliente.final.efeitos.proposta_upd.estado, 'falhou');
  // avulso: conferido na agenda, cancela como sempre (DELETE)
  const fa = g.bvGPlano(entrada({ operacao: 'cancelar', id_opcao_agendamento: idA }), ctxA, cfgT).final;
  assert.ok(!fa.resultado.pacote);
  const fa2 = g.bvGPasso(fase2('cancelar', fa.efeitos.proposta_nova.dados).st, [ok([doPacote, avulso])], cfgT);
  assert.deepEqual([fa2.reqs[0].m, fa2.reqs[0].path], ['DELETE', '/agenda/a8']);
  assert.equal(g.bvGPasso(fa2.st, [ok({ sucesso: true })], cfgT).final.efeitos.proposta_upd.estado, 'executada');
  // revisao de 24/11: servicoPacote em formato nao medido (sem idServico, texto) tambem conta como pacote; serie recorrente vem em varias
  // linhas com o mesmo idAgenda e basta uma delas ser de pacote; leitura que falha fica registrada
  for (const sp of [{ descricaoServico: 'corte adulto' }, { id: 'x' }, 'p1']) assert.equal(g.bvGPasso(f2.st, [ok([{ idAgenda: 'a7', idServico: 's1', descricaoServico: 'corte adulto', servicoPacote: sp }])], cfgT).final.resultado.motivo, 'pacote', JSON.stringify(sp));
  assert.equal(g.bvGPasso(f2.st, [ok([{ idAgenda: 'a7', idServico: 's1', descricaoServico: 'corte adulto', horaInicio: '2026-11-24T10:00:00' }, doPacote])], cfgT).final.resultado.motivo, 'pacote');
  assert.match(naoLeu.efeitos.falha.motivo, /^graces\|/);
  // DELETE sem resposta: a verificacao le a agenda DO CLIENTE e, se o agendamento continua la, repete o mesmo DELETE (antes saia uma chamada vazia)
  const semResp = g.bvGPasso(fa2.st, [resp(500, {})], cfgT);
  assert.deepEqual(semResp.reqs[0].qs, { idCliente: 'c1', proximos: true, pageSize: 200 }); // a mesma leitura da conferencia: com a pagina padrao (50) o que ficava fora dela contava como cancelado
  assert.deepEqual(g.bvGPasso(semResp.st, [ok([avulso])], cfgT).reqs, [{ m: 'DELETE', path: '/agenda/a8', qs: { data: '2026-12-02' } }]);
  assert.equal(g.bvGPasso(semResp.st, [ok([doPacote])], cfgT).final.efeitos.proposta_upd.estado, 'executada'); // sumiu da agenda: cancelado, verificado
  // id numerico na agenda e texto na proposta (ou o contrario) e o mesmo agendamento
  assert.equal(g.bvGPasso(fase2('cancelar', { idAgenda: '77', horaInicio: '2026-12-01T10:00:00', servico: 'x' }).st, [ok([{ ...doPacote, idAgenda: 77 }])], cfgT).final.resultado.motivo, 'pacote');
  // cancelar os dois de uma vez: basta um ser de pacote para nenhum DELETE sair, e o texto fala no plural
  const fc = g.bvGPlano(entrada({ operacao: 'cancelar', id_opcoes_agendamentos: [idP, idA] }), ctxA, cfgT).final;
  assert.match(fc.resultado.pacote, /remarcar mantém a sessão/);
  const fc2 = fase2('cancelar_conjunto', fc.efeitos.proposta_nova.dados);
  assert.equal(fc2.reqs[0].path, '/agenda/agendamentos');
  const tc = g.bvGPasso(fc2.st, [ok([doPacote, avulso])], cfgT).final;
  assert.equal(tc.resultado.texto, 'Tem horário do seu pacote aí, então quem cancela é a equipe, para a sessão voltar para o seu pacote. Vou passar para a equipe.');
  assert.equal(g.bvGPasso(fc2.st, [ok([avulso])], cfgT).final.resultado.code, 'agendamento_nao_encontrado'); // um dos dois sumiu: nenhum e apagado
  const doisAvulsos = fase2('cancelar_conjunto', { itens: [{ ordem: 1, idAgenda: 'a8', horaInicio: '2026-12-02T11:00:00', servico: 'barba design' }, { ordem: 2, idAgenda: 'a9', horaInicio: '2026-12-03T11:00:00', servico: 'corte' }] });
  assert.deepEqual(g.bvGPasso(doisAvulsos.st, [ok([avulso, { ...avulso, idAgenda: 'a9', horaInicio: '2026-12-03T11:00:00' }])], cfgT).reqs.map((q) => [q.m, q.path]), [['DELETE', '/agenda/a8']]); // conjunto sem pacote segue item a item
  // remarcar o agendamento de pacote segue com o agente (a sessao e mantida, medido) e a marca nao se perde nos futuros
  const hora = { tipo: 'horario', itens: [{ id: '1', rotulo: '15:00', valor: { idServico: SP, servico: 'corte adulto', idProfissional: 'b1', apelido: 'Kiel', data: '2026-12-03', hora: '15:00', preco: 90, minutos: 40 } }] }; // o horario e de barbeiro real (o de teste nunca e escolhido)
  const fr = g.bvGPlano(entrada({ operacao: 'reagendar', id_opcao_agendamento: idP, id_opcao_horario: '1' }), { opcoes: hora, pedido: ctxA.pedido }, cfgT).final;
  assert.equal(fr.efeitos.proposta_nova.acao, 'reagendar');
  const pr = g.bvGPlano(entrada({ operacao: 'reagendar', proposta_id: PIDP }), { pedido: ctxA.pedido, proposta: { id: PIDP, acao: 'reagendar', dados: fr.efeitos.proposta_nova.dados } }, cfgT);
  const pr2 = g.bvGPasso(pr.st, [ok({ horarios: ['15:00'] }), ok([doPacote, avulso]), ok({ horarios: [] })], cfgT);
  assert.equal(pr2.reqs[0].m, 'PUT');
  assert.deepEqual(pr.reqs.map((q) => q.path), ['/agenda/horarios-livres', '/agenda/agendamentos', '/agenda/horarios']); // remarcar nao le nem exige secao em aberto: o PUT mantem a que ja esta reservada
  assert.deepEqual(g.bvGPasso(pr2.st, [ok({ sucesso: true })], cfgT).final.efeitos.pedido.futuros.find((f) => f.idAgenda === 'a7').pacote, true);
  // trocar o servico de um agendamento de pacote apagaria o antigo: recusado na fase 1 (pela marca) e conferido na fase 2 (pela agenda)
  const ft = g.bvGPlano(entrada({ operacao: 'agendar', id_opcao_horario: '1', substitui_id_opcao_agendamento: idP }), { opcoes: hora, pedido: ctxA.pedido }, cfgT).final;
  assert.equal(ft.resultado.code, 'pacote_equipe');
  assert.ok(!ft.efeitos.proposta_nova);
  const troca = fase2('trocar_servico', { idCliente: 'c1', idServico: 's2', servico: 'barba design', idProfissional: 'b1', barbeiro: 'Kiel', data: '2026-12-03', hora: '15:00', antigo: { idAgenda: 'a7', horaInicio: '2026-12-01T10:00:00' } }); // proposta antiga, sem marca
  const tt = g.bvGPasso(troca.st, [ok({ horarios: ['15:00'] }), ok([doPacote, avulso]), ok({ horarios: [] })], cfgT).final;
  assert.deepEqual([tt.resultado.motivo, tt.efeitos.falha.operacao], ['pacote', 'agendar']);
  assert.match(tt.resultado.texto, /^Como esse horário é do seu pacote, quem troca o serviço é a equipe, para você não perder a sessão do pacote\. /);
  // trocar o servico de um avulso segue como sempre: POST do novo e so depois o DELETE do antigo
  const plA = g.bvGPlano(entrada({ operacao: 'agendar', id_opcao_horario: '1', substitui_id_opcao_agendamento: idA }), { opcoes: hora, pedido: ctxA.pedido }, cfgT);
  const ftA = g.bvGPasso(plA.st, [ok([])], cfgT).final; // item 12: a proposta de agendar le antes o pacote do cliente (aqui, nenhum)
  assert.equal(ftA.efeitos.proposta_nova.acao, 'trocar_servico');
  const trocaA = fase2('trocar_servico', ftA.efeitos.proposta_nova.dados);
  assert.equal(g.bvGPasso(trocaA.st, [ok({ horarios: ['15:00'] }), ok([doPacote, avulso]), ok({ horarios: [] })], cfgT).reqs[0].m, 'POST');
  console.log('graces.test.js cancelar agendamento de pacote ok');
}
{ // Item 12 (owner, 2026-11-23): agendar abatendo do pacote do cliente. A secao vem so da leitura da Graces e e relida na hora de gravar.
  const S1 = 'aaaaaaaa-1111-4111-8111-111111111111', S2 = 'aaaaaaaa-2222-4222-8222-222222222222';
  const pac = (...ids) => ok([{ idClientePacote: 'p1', descricao: 'Pacote 4 cortes', dataValidade: null, secoes: ids.map((id) => ({ idClienteItemPacote: id, idProdutoServico: dadosAg.idServico })) }]);
  const pl = g.bvGPlano(entrada({ operacao: 'agendar', id_opcao_horario: '1' }), ctxE(opcoesHora), cfg);
  assert.deepEqual(pl.reqs, [{ m: 'GET', path: '/agenda/pacotes', qs: { idCliente: 'c1', idServico: dadosAg.idServico } }]); // so leitura, com o cliente do pedido
  const f1 = g.bvGPasso(pl.st, [pac(S1, S2)], cfg).final;
  const dp = f1.efeitos.proposta_nova.dados;
  assert.equal(dp.pacote, true);
  assert.match(f1.resultado.resumo, / às 14:00 \(abatido do seu pacote\)$/);
  assert.ok(!/R\$/.test(f1.resultado.resumo) && /não transfira/.test(f1.resultado.pacote) && f1.resultado.aguardando_confirmacao);
  assert.ok(!JSON.stringify(f1).includes(S1) && !JSON.stringify(f1).includes(S2)); // a secao nao vai ao modelo nem fica na proposta
  assert.deepEqual({ ...dp, pacote: 0, resumo: 0 }, { ...dadosAg, pacote: 0, resumo: 0 }); // o resto da proposta nao muda
  // sem pacote, o resumo e o de sempre, com o valor
  assert.equal(g.bvGPasso(pl.st, [ok([])], cfg).final.resultado.resumo, dadosAg.resumo);
  // so conta secao do proprio servico, de pacote que nao vence antes do dia, com id no formato; repetida conta uma vez
  const de = (o) => g.bvGPasso(pl.st, [ok([{ secoes: [{ idClienteItemPacote: S1, idProdutoServico: dadosAg.idServico }], ...o }])], cfg).final.efeitos.proposta_nova.dados.pacote;
  assert.deepEqual([de({}), de({ dataValidade: null }), de({ dataValidade: `${dadosAg.data}T00:00:00` }), de({ dataValidade: '2020-01-01T00:00:00' })], [true, true, true, undefined]);
  assert.equal(de({ secoes: [{ idClienteItemPacote: S1, idProdutoServico: 'outro-servico' }] }), undefined); // o filtro da consulta nao e tomado como garantia
  assert.equal(de({ secoes: [{ idClienteItemPacote: S1 }] }), undefined);
  assert.equal(de({ secoes: 'x' }), undefined);
  assert.equal(g.bvGPasso(pl.st, [ok([null, 7, { secoes: [null, {}] }])], cfg).final.resultado.resumo, dadosAg.resumo); // lixo na resposta nao derruba
  // 200 fora do formato (envelope, texto) e resposta ausente: valor avulso e falha registrada, como no 5xx
  for (const ruim of [[ok({ data: [] })], [ok('<html>')], []]) assert.equal(g.bvGPasso(pl.st, ruim, cfg).final.efeitos.falha.operacao, 'pacotes');
  // secao com id fora do formato nao conta
  assert.equal(g.bvGPasso(pl.st, [pac("x'; --")], cfg).final.efeitos.proposta_nova.dados.pacote, undefined);
  // leitura do pacote falhou: a proposta sai pelo valor avulso e a falha fica registrada
  const fr = g.bvGPasso(pl.st, [resp(500, {})], cfg).final;
  assert.ok(fr.resultado.resumo === dadosAg.resumo && !fr.resultado.pacote && fr.efeitos.proposta_nova.acao === 'agendar');
  assert.deepEqual([fr.efeitos.falha.operacao, fr.efeitos.falha.status], ['pacotes', 500]);
  assert.equal(g.bvGParams(pl.st.in, fr.efeitos, null)[10], 'pacotes'); // a falha vai para o Persistir junto da proposta
  // fase 2: a secao e relida no mesmo estagio da revalidacao, que continua so de leitura
  const p2 = f2({ operacao: 'agendar' }, prop('agendar', dp));
  assert.deepEqual(p2.reqs.map((q) => q.path), ['/agenda/horarios-livres', '/agenda/agendamentos', '/agenda/horarios', '/agenda/pacotes']);
  assert.ok(p2.reqs.every((q) => q.m === 'GET' && !q.body));
  const livre = [ok({ horarios: ['14:00'] }), ok([]), ok({ horarios: [] })];
  const w = g.bvGPasso(p2.st, [...livre, pac(S2, S1)], cfg);
  assert.deepEqual([w.reqs.length, w.reqs[0].m, w.reqs[0].path], [1, 'POST', '/agenda']);
  assert.equal(w.reqs[0].body.idClienteItemPacote, S2); // a primeira secao, na ordem que a Graces devolveu agora
  assert.ok(!('idServico' in w.reqs[0].body)); // exatamente um dos dois
  assert.deepEqual([w.reqs[0].body.idCliente, w.reqs[0].body.idProfissional, w.reqs[0].body.horaInicio], ['c1', TESTE, '14:00']);
  const fim = g.bvGPasso(w.st, [ok({ sucesso: true, idAgenda: 'n9' })], cfg).final;
  assert.equal(fim.efeitos.proposta_upd.estado, 'executada');
  assert.match(fim.resultado.feito, /^Agendado: .*\(abatido do seu pacote\)$/);
  // escrita incerta: a repeticao reusa o mesmo corpo, com a mesma secao
  const v1 = g.bvGPasso(w.st, [resp(0, null)], cfg);
  assert.equal(v1.reqs[0].path, '/agenda/agendamentos');
  assert.equal(g.bvGPasso(v1.st, [ok([])], cfg).reqs[0].body.idClienteItemPacote, S2);
  assert.equal(g.bvGPasso(g.bvGPasso(v1.st, [ok([])], cfg).st, [resp(0, null)], cfg).reqs[0].path, '/agenda/agendamentos'); // 2a incerta: verifica de novo, sem 3a escrita
  // pacote sem secao na hora de gravar: nada e escrito e a oferta de horario fica para o novo resumo, pelo valor avulso
  const sem = g.bvGPasso(p2.st, [...livre, ok([])], cfg).final;
  assert.deepEqual([sem.resultado.code, sem.efeitos.proposta_upd.estado, sem.efeitos.opcoes], ['pacote_indisponivel', 'falhou', undefined]);
  assert.match(sem.resultado.orientacao, /valor avulso/);
  // leitura do pacote falhou na hora de gravar: nada e escrito
  for (const ruim of [resp(503, {}), resp(404, {}), resp(0, null), ok({ data: [] }), undefined]) { // 5xx, 4xx, sem resposta, 200 fora do formato, ausente
    const inc = g.bvGPasso(p2.st, [...livre, ruim].filter(Boolean), cfg).final;
    assert.deepEqual([inc.resultado.code, inc.efeitos.falha.operacao, inc.efeitos.proposta_upd.estado, inc.efeitos.opcoes], ['pacote_nao_conferido', 'pacotes', 'falhou', undefined]);
    assert.match(inc.resultado.orientacao, /nada foi marcado/);
  }
  // POST pela secao recusado pela agenda: falhou, sem repetir
  const rec = g.bvGPasso(w.st, [resp(400, { code: 'PARAMETRO_INVALIDO' })], cfg).final;
  assert.ok(!rec.reqs && rec.efeitos.proposta_upd.estado === 'falhou');
  // escrita incerta que foi aplicada: reconhecida pelo barbeiro e pelo inicio, mesmo que a agenda devolva outro servico no agendamento do pacote
  const achou = g.bvGPasso(v1.st, [ok([{ idAgenda: 'n11', idServico: 'outro-id', idProfissional: TESTE, horaInicio: `${dp.data}T14:00:00` }])], cfg).final;
  assert.deepEqual([achou.efeitos.proposta_upd.estado, achou.resultado.verificada, achou.efeitos.mensagens.criar[0].idAgenda], ['executada', true, 'n11']);
  // horario tomado continua vindo antes: sem POST e sem olhar o pacote
  assert.equal(g.bvGPasso(p2.st, [ok({ horarios: ['15:20'] }), ok([]), ok({ horarios: [] }), pac(S1)], cfg).final.resultado.code, 'horario_indisponivel');
  // avulso continua com idServico e sem a leitura do pacote
  const pa = f2({ operacao: 'agendar' }, prop('agendar', dadosAg));
  assert.ok(!pa.reqs.some((q) => q.path === '/agenda/pacotes'));
  const wa = g.bvGPasso(pa.st, livre, cfg).reqs[0].body;
  assert.ok(wa.idServico === dadosAg.idServico && !('idClienteItemPacote' in wa));
  // no avulso o servico continua na comparacao (outro servico no mesmo horario nao e o nosso)
  const va = g.bvGPasso(g.bvGPasso(pa.st, livre, cfg).st, [resp(0, null)], cfg);
  assert.equal(g.bvGPasso(va.st, [ok([{ idAgenda: 'n12', idServico: 'outro-id', idProfissional: TESTE, horaInicio: `${dp.data}T14:00:00` }])], cfg).reqs[0].m, 'POST');
  // trocar de servico pelo pacote: POST pela secao e, depois, o DELETE do antigo
  const pt = f2({ operacao: 'agendar' }, prop('trocar_servico', { ...dp, antigo: { idAgenda: 'ant1', horaInicio: '2027-01-04T09:00:00', recorrente: false } }));
  const wt = g.bvGPasso(pt.st, [livre[0], ok([{ idAgenda: 'ant1', horaInicio: '2027-01-04T09:00:00', idServico: 's9', descricaoServico: 'barba' }]), livre[2], pac(S1)], cfg); // o antigo (avulso) e conferido na agenda antes do POST (24/11)
  assert.equal(wt.reqs[0].body.idClienteItemPacote, S1);
  assert.deepEqual(g.bvGPasso(wt.st, [ok({ sucesso: true, idAgenda: 'n10' })], cfg).reqs.map((q) => [q.m, q.path]), [['DELETE', '/agenda/ant1']]);
  console.log('graces.test.js pacote ok');
}

// Incluir um servico num agendamento que ja existe (PROD, 23/11: "barba e cabelo, ne?" terminou em "Trocar servico: BARBA EXPRESS"
// com outro barbeiro, e o cabelo sumiu). A busca e do servico novo, o horario colado sai marcado e nada do que existe e apagado.
{
  const JAY = 'b623cd84-6068-4a57-9ce6-2f7d9a37a11e', D = '2026-11-26';
  const cfgI = { ...cfg, ambiente: 'producao', redirecionar: false, escritaLiberada: true, testeLiberado: false, humanos: [{ id: JAY, nome: 'Jayme' }], agendamentosMaxDia: 3 };
  const T = (n) => `${String(n).repeat(8)}-1111-4111-8111-111111111111`;
  const ent = (o, c = cfgI) => { const n = g.bvGNormalizar({ ...base, ambiente: c.ambiente, ...o }, c); assert.ok(n.ok, JSON.stringify(n)); return n.in; };
  const grade = (hs, min = 40) => ok({ minutos: min, funcionamento: { horaInicio: '08:00', horaFim: '20:00' }, horarios: hs });
  const ocup = (...os) => ok({ horarios: os.map(([horaInicio, horaFim]) => ({ horaInicio, horaFim, tipo: 1 })) });
  const BARBA = ['11:20', '12:00'];
  const agBarba = { opcao_id: '1', idAgenda: 'a1', horaInicio: `${D}T11:20:00`, idServico: 'sBarba', servico: 'BARBA EXPRESS', idProfissional: 'bB', profissional: 'Beto', recorrente: false };
  const fut = (x = {}) => ({ idAgenda: 'a1', idServico: 'sBarba', horaInicio: `${D}T11:20:00`, servico: 'BARBA EXPRESS', fim: '12:00', idProfissional: 'bB', ...x });
  const vistos = [{ id: 's1', idServico: 'sCorte', nome: 'CORTE MAQUINA SIMPLES (1 PENTE)', preco: 55, minutos: 40 }, { id: 's2', idServico: 'sBarba', nome: 'BARBA EXPRESS', preco: 40, minutos: 40 }];
  const ped = (fs = [fut()], extra = {}) => ({ idCliente: 'c1', barbeiro: { idProfissional: 'bB', apelido: 'Beto' }, futuros: fs, agendamentos: [agBarba], servicos_vistos: vistos, ...extra });
  const plano = (o, pd, opcoes = {}, c = cfgI) => g.bvGPlano(ent({ operacao: 'horarios_livres', turno_id: T(2), data: D, ...o }, c), { pedido: pd, opcoes }, c);
  const busca = (o, pd, resps) => g.bvGPasso(plano(o, pd).st, resps, cfgI).final;
  const horas = (r) => r.resultado.opcoes.map((x) => `${x.hora}${x.junto ? '*' : ''}`);
  const agendar = (o, pd, opcoes, turno = T(3)) => { const pl = g.bvGPlano(ent({ operacao: 'agendar', turno_id: turno, ...o }), { pedido: pd, opcoes }, cfgI); return pl.reqs ? g.bvGPasso(pl.st, pl.reqs.map(() => ok([])), cfgI).final : pl.final; };
  const ofH = (idServico, servico, hora, data = D) => ({ tipo: 'horario', itens: [{ id: '1', rotulo: `${hora} Outro`, valor: { data, hora, idProfissional: 'bO', apelido: 'Outro', idServico, servico, preco: 40, minutos: 40 } }] });

  // 1. meus_agendamentos guarda o fim (HH:MM) e o barbeiro so pelo id
  const lidos = g.bvGPasso(g.bvGPlano(entrada({ operacao: 'meus_agendamentos' }), ctxOp({}, { idCliente: 'c1' }), cfg).st, [ok([{ ...agBruto[0], horaFim: '2026-10-20T14:40:00' }])], cfg).final.efeitos.pedido.futuros;
  assert.deepEqual(lidos, [{ idAgenda: 'a1', idServico: 's1', horaInicio: '2026-10-20T14:00:00', servico: 'corte adulto', fim: '14:40', idProfissional: TESTE }]);

  // 2. as escritas da conversa guardam o mesmo formato (fim = inicio + minutos); proposta sem minutos fica sem `fim`
  const escrita = (acao, dados, agenda) => {
    const pl = f2({ operacao: acao === 'reagendar' ? 'reagendar' : 'agendar' }, { pedido: { idCliente: 'c1', futuros: [fut()] }, proposta: { id: PID, acao, dados } });
    let s = g.bvGPasso(pl.st, [ok({ horarios: [dados.hora] }), ok(agenda), ok({ horarios: [] })], cfg);
    s = g.bvGPasso(s.st, [ok({ sucesso: true, idAgenda: 'n5' })], cfg);
    return (s.reqs ? g.bvGPasso(s.st, [ok({ sucesso: true })], cfg) : s).final; // trocar_servico: o DELETE do antigo vem depois do POST
  };
  const novoD = { idCliente: 'c1', idServico: 'sCorte', servico: 'CORTE', idProfissional: 'bB', barbeiro: 'Beto', data: D, hora: '15:00', minutos: 40 };
  const antigoD = { idAgenda: 'a1', horaInicio: `${D}T11:20:00`, recorrente: false };
  assert.deepEqual(escrita('reagendar', { ...antigoD, ...novoD, idServico: 'sBarba', servico: 'BARBA EXPRESS' }, []).efeitos.pedido.futuros,
    [{ idAgenda: 'a1', idServico: 'sBarba', horaInicio: `${D}T15:00:00`, servico: 'BARBA EXPRESS', fim: '15:40', idProfissional: 'bB' }]);
  const trocado = escrita('trocar_servico', { ...novoD, antigo: { ...antigoD, servico: 'BARBA EXPRESS' }, resumo: 'Trocar serviço: CORTE com Beto em quinta-feira, 26/11 às 15:00, no lugar de BARBA EXPRESS das 11:20' }, [{ idAgenda: 'a1', horaInicio: `${D}T11:20:00`, idServico: 'sBarba', descricaoServico: 'BARBA EXPRESS' }]);
  assert.deepEqual(trocado.efeitos.pedido.futuros, [{ idAgenda: 'n5', idServico: 'sCorte', horaInicio: `${D}T15:00:00`, servico: 'CORTE', fim: '15:40', idProfissional: 'bB' }]);
  assert.equal(trocado.resultado.feito, 'Serviço trocado: CORTE com Beto em quinta-feira, 26/11 às 15:00, no lugar de BARBA EXPRESS das 11:20'); // o texto final diz o que saiu
  const { minutos: _m, ...semMin } = novoD;
  assert.ok(!('fim' in escrita('agendar', semMin, []).efeitos.pedido.futuros[1]));

  // 3. colado antes e depois: marcados, e o "logo depois" (12:00) entra mesmo com o cliente pedindo manha
  let ri = busca({ periodo: 'manha', id_opcao_servico: 's1' }, ped(), [grade(['08:00', '10:40', '12:00', '14:00']), ocup(BARBA)]);
  assert.deepEqual(horas(ri), ['08:00', '10:40*', '12:00*']);
  assert.equal(ri.resultado.orientacao, 'para ficar junto do que ele já tem, sem intervalo: 10:40 (logo antes de BARBA EXPRESS) ou 12:00 (logo depois de BARBA EXPRESS). Diga isso em uma frase e pergunte qual horário ele prefere; os outros horários do dia seguem na lista');
  assert.equal(ri.efeitos.pedido.busca.outros, true); // o 12:00 entrou de fora do periodo pedido
  assert.match(ri.resultado.ja_tem_no_dia, /^BARBA EXPRESS às 11:20\. Estes horários são de CORTE MAQUINA SIMPLES \(1 PENTE\), um serviço a mais: .*sem substitui_id_opcao_agendamento/);
  assert.deepEqual(Object.keys(ri.efeitos.opcoes.itens[1].valor), ['data', 'hora', 'idProfissional', 'apelido', 'idServico', 'servico', 'preco', 'minutos']); // a oferta guardada nao ganha campo
  assert.equal(ri.efeitos.pedido.servico.idServico, 'sCorte');
  assert.ok(!JSON.stringify(ri.resultado).includes('bB')); // o id do barbeiro do agendamento nao vai ao modelo

  // 4. fim de ocupacao fora da grade (agendamento de 30 min): o inicio 11:50 e o colado
  ri = busca({ id_opcao_servico: 's1' }, ped([fut({ fim: '11:50' })]), [grade(['10:40', '12:40'], 30), ocup(['11:20', '11:50'])]);
  assert.deepEqual(horas(ri), ['10:40', '11:50*', '12:40']);

  // 5. nenhum colado: a lista segue inteira e a orientacao diz isso (a marca nunca cria horario)
  ri = busca({ id_opcao_servico: 's1' }, ped(), [grade(['08:00', '14:00']), ocup(['10:40', '11:20'], BARBA, ['12:00', '12:40'])]);
  assert.deepEqual(horas(ri), ['08:00', '12:40', '14:00']);
  assert.match(ri.resultado.orientacao, /^nenhum horário da lista fica junto do que ele já tem: /);

  // 6. sem horario no periodo: a decisao em lista segue como era, sem amarrar "Ver outros barbeiros" ao agendamento
  // (os dois lados do agendamento estao ocupados: nao ha colado, e nao e o piso da grade que tira o 12:00)
  const cheio = ocup(['10:40', '11:20'], BARBA, ['12:00', '12:40']);
  ri = busca({ periodo: 'noite', id_opcao_agendamento: '1', id_opcao_servico: 's1' }, ped(), [grade(['08:00', '14:00']), cheio]);
  assert.equal(ri.efeitos.opcoes.tipo, 'decisao_sem_horario');
  assert.deepEqual(ri.efeitos.opcoes.itens.map((x) => x.rotulo), ['Outro horário no dia', 'Outro dia com ele', 'Ver outros barbeiros']);
  assert.equal(ri.efeitos.opcoes.itens.find((x) => x.valor.acao === 'outros_barbeiros').valor.ag, null);
  assert.match(ri.resultado.orientacao, /^Beto não tem horário de noite nesse dia/);
  assert.match(ri.resultado.ja_tem_no_dia, /^BARBA EXPRESS às 11:20\./);
  assert.equal(ri.efeitos.pedido.busca.outros, false);
  // com o colado existindo (12:00 livre) e nada no periodo pedido: a lista e so o colado, o texto diz que no periodo nao ha, e o
  // horario nao vai ao resumo no mesmo turno (nao e o que o cliente pediu: ele escolhe)
  ri = busca({ periodo: 'noite', id_opcao_servico: 's1' }, ped(), [grade(['08:00', '14:00']), ocup(['10:40', '11:20'], BARBA)]);
  assert.deepEqual([ri.efeitos.opcoes.tipo, horas(ri)], ['horario', ['12:00*']]);
  assert.equal(ri.resultado.orientacao, 'para ficar junto do que ele já tem, sem intervalo: 12:00 (logo depois de BARBA EXPRESS). No período ou na hora que ele pediu não há horário: diga isso, ofereça o horário junto e pergunte se esse horário serve');
  assert.deepEqual([ri.efeitos.pedido.busca.n, ri.efeitos.pedido.busca.outros], [1, true]);
  assert.equal(agendar({ id_opcao_horario: '1' }, { ...ped(), ...ri.efeitos.pedido }, ri.efeitos.opcoes, T(2)).resultado.code, 'cliente_nao_escolheu');
  assert.equal(agendar({ id_opcao_horario: '1' }, { ...ped(), ...ri.efeitos.pedido }, ri.efeitos.opcoes, T(3)).efeitos.proposta_nova.acao, 'agendar'); // no turno seguinte, com a escolha dele
  // colado dentro do pedido e sozinho na lista: segue valendo a regra do horario unico (nada veio de fora do que ele pediu)
  ri = busca({ periodo: 'tarde', id_opcao_servico: 's1' }, ped(), [grade(['08:00']), ocup(BARBA)]);
  assert.deepEqual([horas(ri), ri.efeitos.pedido.busca.outros], [['12:00*'], false]);
  assert.match(ri.resultado.orientacao, /^para ficar junto do que ele já tem, sem intervalo: 12:00 \(logo depois de BARBA EXPRESS\)\. Diga isso em uma frase e pergunte se esse horário serve$/);

  // 7. qualquer barbeiro: no horario colado vale o barbeiro do agendamento; futuro antigo (sem idProfissional) fica com o primeiro
  const comLista = (fs) => ped(fs, { servico: { idServico: 'sCorte', nome: 'CORTE MAQUINA SIMPLES (1 PENTE)' }, barbeiros: [{ opcao_id: '1', idProfissional: 'bO', apelido: 'Outro' }, { opcao_id: '2', idProfissional: 'bB', apelido: 'Beto' }] });
  const doisB = [grade(['10:40', '14:00']), grade(['10:40']), ocup(), ocup(BARBA)];
  ri = busca({ qualquer: true, id_opcao_servico: 's1' }, comLista([fut()]), doisB);
  assert.deepEqual(ri.resultado.opcoes.map((x) => `${x.hora} ${x.barbeiro}${x.junto ? '*' : ''}`), ['10:40 Beto*', '12:00 Beto*', '14:00 Outro']);
  assert.match(ri.resultado.orientacao, /10:40 com Beto \(logo antes de BARBA EXPRESS\) ou 12:00 com Beto \(logo depois de BARBA EXPRESS\)/);
  const { idProfissional: _p, fim: _f, ...futAntigo } = fut();
  ri = busca({ qualquer: true, id_opcao_servico: 's1' }, comLista([futAntigo]), doisB);
  assert.deepEqual(ri.resultado.opcoes.map((x) => `${x.hora} ${x.barbeiro}${x.junto ? '*' : ''}`), ['10:40 Outro*', '12:00 Beto', '14:00 Outro']); // sem `fim` so da para marcar o "antes"

  // 8. agendamento + servico diferente: a busca e do servico novo, com o barbeiro do agendamento, e deixa de ser remarcacao
  const semBarb = ped([fut()], { barbeiro: undefined });
  let pi8 = plano({ periodo: 'manha', id_opcao_agendamento: '1', id_opcao_servico: 's1' }, semBarb);
  assert.deepEqual([pi8.reqs[0].qs.idServico, pi8.reqs[0].qs.idProfissional, pi8.st.in.id_opcao_agendamento, pi8.st.meta.agId], ['sCorte', 'bB', undefined, null]);
  ri = g.bvGPasso(pi8.st, [grade(['08:00', '10:40']), ocup(BARBA)], cfgI).final;
  assert.deepEqual(horas(ri), ['08:00', '10:40*', '12:00*']); // 12:00 = fim da ocupacao do proprio agendamento
  // a mesma chamada repetida no turno roda de novo (a chave da busca e calculada depois de tirar o agendamento)
  assert.ok(plano({ periodo: 'manha', id_opcao_agendamento: '1', id_opcao_servico: 's1' }, { ...semBarb, ...ri.efeitos.pedido }, ri.efeitos.opcoes).reqs);
  // o titulo cortado do item da lista tambem vale como o servico novo
  const ofServ = { tipo: 'servico', itens: [{ id: 's1', rotulo: 'CORTE MAQUINA SIMPLES (1', valor: { idServico: 'sCorte', nome: 'CORTE MAQUINA SIMPLES (1 PENTE)', preco: 55, minutos: 40 } }] };
  assert.equal(plano({ id_opcao_agendamento: '1', id_opcao_servico: 'CORTE MAQUINA SIMPLES (1' }, ped(), ofServ).reqs[0].qs.idServico, 'sCorte');

  // 9. agendamento + o mesmo servico, ou um nome que nao resolve: remarcacao, como sempre
  for (const sv of ['s2', 'servico que nao existe']) {
    const pr = plano({ id_opcao_agendamento: '1', id_opcao_servico: sv }, ped());
    assert.deepEqual([pr.reqs[0].qs.idServico, pr.reqs[0].qs.idProfissional, pr.st.in.id_opcao_agendamento, pr.st.meta.agId], ['sBarba', 'bB', '1', 'a1']);
  }

  // 10. remarcacao com outro servico no mesmo dia: sem marca (o horario e do proprio agendamento)
  const corteCedo = { idAgenda: 'a0', idServico: 'sCorte', horaInicio: `${D}T09:20:00`, servico: 'CORTE', fim: '10:00', idProfissional: 'bB' };
  ri = busca({ id_opcao_agendamento: '1' }, ped([corteCedo, fut()]), [grade(['10:00', '14:00']), ocup(['09:20', '10:00'], BARBA)]);
  assert.deepEqual([horas(ri), ri.resultado.ja_tem_no_dia], [['10:00', '12:00', '14:00'], undefined]); // 10:00 encosta no corte e 12:00 e fim de ocupacao: nenhum sai marcado

  // 11. o mesmo servico no dia, sem agendamento informado: sem marca (duplicidade e do bvgJaTem, na proposta)
  ri = busca({ id_opcao_servico: 's1' }, ped([fut({ idServico: 'sCorte', servico: 'CORTE' })]), [grade(['10:40', '12:00']), ocup(BARBA)]);
  assert.deepEqual([horas(ri), ri.resultado.ja_tem_no_dia], [['10:40', '12:00'], undefined]);

  // 12. clausula petrea: o agendamento do dia e com barbeiro so da equipe -> equipe, sem consultar a agenda; futuro antigo segue como era
  const pj = plano({ id_opcao_servico: 's1' }, ped([fut({ idProfissional: JAY })]));
  assert.deepEqual([pj.reqs, pj.final.resultado.code, pj.final.efeitos.pedido.handoff, pj.final.efeitos.falha.motivo], [undefined, 'encaminhar_equipe', true, 'encaminhar_equipe|barbeiro_humano']);
  assert.ok(plano({ id_opcao_servico: 's1' }, ped([futAntigo])).reqs);
  assert.ok(plano({ id_opcao_servico: 's1' }, ped([fut({ idProfissional: JAY, horaInicio: '2026-11-27T11:20:00' })])).reqs); // outro dia: nao e servico a mais

  // 13. agendamento do pacote no dia: incluir nao apaga nada, entao segue como agendar normal, com o aviso de que ele ja tem
  ri = busca({ id_opcao_servico: 's1' }, ped([fut({ pacote: true })]), [grade(['10:40']), ocup(BARBA)]);
  assert.deepEqual(horas(ri), ['10:40*', '12:00*']);
  let fi = agendar({ id_opcao_horario: '1' }, { ...ped([fut({ pacote: true })]), ...ri.efeitos.pedido }, ri.efeitos.opcoes);
  assert.deepEqual([fi.efeitos.proposta_nova.acao, fi.efeitos.proposta_nova.dados.antigo, fi.resultado.ja_tem], ['agendar', undefined, 'BARBA EXPRESS em quinta-feira, 26/11 às 11:20']);

  // 14. substituir pelo MESMO servico e recusado (era o "Trocar servico: BARBA EXPRESS" do incidente); a troca de verdade diz o que sai
  fi = agendar({ id_opcao_horario: '1', substitui_id_opcao_agendamento: '1' }, ped(), ofH('sBarba', 'BARBA EXPRESS', '09:20'));
  assert.deepEqual([fi.resultado.code, fi.efeitos.proposta_nova, fi.efeitos.falha.motivo], ['mesmo_servico', undefined, 'graces|troca_mesmo_servico']);
  assert.match(fi.resultado.orientacao, /chame horarios_livres com o id_opcao_servico do serviço novo; se ele só quer mudar o horário, chame reagendar/);
  fi = agendar({ id_opcao_horario: '1', substitui_id_opcao_agendamento: '1' }, ped(), ofH('sCorte', 'CORTE', '12:00'));
  assert.equal(fi.efeitos.proposta_nova.acao, 'trocar_servico');
  assert.equal(fi.resultado.resumo, 'Trocar serviço: CORTE com Outro em quinta-feira, 26/11 às 12:00 (R$ 40,00), no lugar de BARBA EXPRESS das 11:20');
  assert.equal(fi.efeitos.proposta_nova.dados.antigo.servico, 'BARBA EXPRESS');
  assert.match(agendar({ id_opcao_horario: '1', substitui_id_opcao_agendamento: '1' }, ped(), ofH('sCorte', 'CORTE', '12:00', '2026-11-27')).resultado.resumo, /em sexta-feira, 27\/11 às 12:00 \(R\$ 40,00\), no lugar de BARBA EXPRESS de 26\/11 às 11:20$/); // troca para outro dia: diz o dia do que sai
  // reagendar com horario de outro servico: a recusa manda refazer a busca so com o agendamento
  const rd = g.bvGPlano(ent({ operacao: 'reagendar', turno_id: T(3), id_opcao_agendamento: '1', id_opcao_horario: '1' }), { pedido: ped(), opcoes: ofH('sCorte', 'CORTE', '12:00') }, cfgI).final.resultado;
  assert.deepEqual([rd.code, /só com id_opcao_agendamento \(sem id_opcao_servico\)/.test(rd.orientacao)], ['servico_diferente', true]);

  // 15. dois agendamentos no dia: colado a qualquer um deles, e os dois aparecem em ja_tem_no_dia
  const sobr = { idAgenda: 'a0', idServico: 'sSobr', horaInicio: `${D}T09:20:00`, servico: 'SOBRANCELHA', fim: '10:00', idProfissional: 'bB' };
  ri = busca({ id_opcao_servico: 's1' }, ped([sobr, fut()]), [grade(['08:00', '10:00', '10:40', '14:00']), ocup(['09:20', '10:00'], BARBA)]);
  assert.deepEqual(horas(ri), ['08:00', '10:00*', '10:40*', '12:00*', '14:00']);
  assert.match(ri.resultado.ja_tem_no_dia, /^SOBRANCELHA às 09:20 e BARBA EXPRESS às 11:20\. /);
  assert.match(ri.resultado.orientacao, /10:00 \(logo depois de SOBRANCELHA\) ou 10:40 \(logo antes de BARBA EXPRESS\) ou 12:00 \(logo depois de BARBA EXPRESS\)/);

  // 16. a hora pedida e o proprio horario colado e esta livre: vai direto ao resumo, no mesmo turno, e o aviso de servico a mais fica
  ri = busca({ hora: '12:00', id_opcao_servico: 's1' }, ped(), [grade(['08:00', '10:40']), ocup(BARBA)]);
  const id12 = ri.resultado.opcoes.find((x) => x.hora === '12:00').id;
  assert.equal(ri.resultado.horario_pedido_livre, id12);
  assert.match(ri.resultado.orientacao, /^o horário pedido está livre: chame agendar com id_opcao_horario /);
  assert.match(ri.resultado.ja_tem_no_dia, /sem substitui_id_opcao_agendamento/);
  assert.equal(agendar({ id_opcao_horario: id12 }, { ...ped(), ...ri.efeitos.pedido }, ri.efeitos.opcoes, T(2)).efeitos.proposta_nova.acao, 'agendar');

  // 17. o incidente, de ponta a ponta. A manha do barbeiro dele esta cheia (08:00-11:20) e a barba vai ate 12:00.
  // (a) 12:00 livre: a lista e o colado com o mesmo barbeiro, dito como fora do periodo pedido; o fim e um agendar novo de CORTE
  const manhaCheia = ['08:00', '11:20'];
  let pedC = ped();
  ri = busca({ periodo: 'manha', id_opcao_agendamento: '1', id_opcao_servico: 's1' }, pedC, [grade(['12:00', '14:00']), ocup(manhaCheia, BARBA)]);
  assert.deepEqual([ri.efeitos.opcoes.tipo, horas(ri), ri.efeitos.pedido.busca.outros], ['horario', ['12:00*'], true]);
  assert.match(ri.resultado.orientacao, /^para ficar junto do que ele já tem, sem intervalo: 12:00 \(logo depois de BARBA EXPRESS\)\. No período ou na hora que ele pediu não há horário: /);
  fi = agendar({ id_opcao_horario: '1' }, { ...pedC, ...ri.efeitos.pedido }, ri.efeitos.opcoes);
  assert.deepEqual([fi.efeitos.proposta_nova.acao, fi.resultado.resumo, fi.resultado.ja_tem],
    ['agendar', 'CORTE MAQUINA SIMPLES (1 PENTE) com Beto em quinta-feira, 26/11 às 12:00 (R$ 55,00)', 'BARBA EXPRESS em quinta-feira, 26/11 às 11:20']);
  // (b) 12:00 tambem ocupado (nao ha colado com ele: e a ocupacao, nao o piso da grade, que tira o horario): a decisao sai sem
  // amarrar ao agendamento, "Ver outros barbeiros" segue com o CORTE e o fim e um agendar novo, colado, com outro barbeiro
  const betoCheio = [grade(['13:20', '14:00']), ocup(manhaCheia, BARBA, ['12:00', '13:20'])];
  ri = busca({ periodo: 'manha', id_opcao_agendamento: '1', id_opcao_servico: 's1' }, pedC, betoCheio);
  assert.deepEqual(ri.efeitos.opcoes.itens.map((x) => [x.rotulo, x.valor.ag || null]), [['Outro horário no dia', null], ['Outro dia com ele', null], ['Ver outros barbeiros', null]]);
  pedC = { ...pedC, ...ri.efeitos.pedido };
  let pv = g.bvGPlano(ent({ operacao: 'horarios_livres', turno_id: T(3), data: D, periodo: 'manha', qualquer: true }), { pedido: pedC, opcoes: ri.efeitos.opcoes }, cfgI);
  assert.deepEqual(pv.reqs.map((q) => [q.path, q.qs.idServico]), [['/servicos/profissionais', 'sCorte']]);
  pv = g.bvGPasso(pv.st, [ok([{ idProfissional: 'bB', apelido: 'Beto' }, { idProfissional: 'bO', apelido: 'Outro' }])], cfgI);
  ri = g.bvGPasso(pv.st, [betoCheio[0], grade(['09:20', '10:40']), betoCheio[1], ocup()], cfgI).final;
  assert.deepEqual(ri.resultado.opcoes.map((x) => `${x.hora} ${x.barbeiro}${x.junto ? '*' : ''}`), ['09:20 Outro', '10:40 Outro*']);
  assert.match(ri.resultado.orientacao, /^para ficar junto do que ele já tem, sem intervalo: 10:40 com Outro \(logo antes de BARBA EXPRESS\)\. Diga isso em uma frase e pergunte qual horário ele prefere; os outros horários do dia seguem na lista; /);
  pedC = { ...pedC, ...ri.efeitos.pedido };
  fi = agendar({ id_opcao_horario: '2' }, pedC, ri.efeitos.opcoes, T(4));
  assert.deepEqual([fi.efeitos.proposta_nova.acao, fi.resultado.resumo, fi.resultado.ja_tem],
    ['agendar', 'CORTE MAQUINA SIMPLES (1 PENTE) com Outro em quinta-feira, 26/11 às 10:40 (R$ 55,00)', 'BARBA EXPRESS em quinta-feira, 26/11 às 11:20']);

  // Revisao (A1): agendamento com barbeiro so da equipe + servico novo -> equipe, mesmo sem os futuros, com futuros antigos (sem o id
  // do barbeiro), em outro dia e quando so o nome identifica o barbeiro (na develop a remarcacao ja encaminhava; soltar o agendamento nao pode pular isso)
  const pedJ = (fs, a = {}) => ({ idCliente: 'c1', futuros: fs, agendamentos: [{ ...agBarba, idProfissional: JAY, profissional: 'Jayme', ...a }], servicos_vistos: vistos });
  for (const [fs, data, a] of [[[], D], [[futAntigo], D], [[], '2026-11-27'], [[fut({ idProfissional: JAY })], '2026-11-27'], [[], D, { idProfissional: 'outro-id', profissional: 'Jayme ' }]]) {
    const pj1 = plano({ id_opcao_agendamento: '1', id_opcao_servico: 's1', data }, pedJ(fs, a));
    assert.deepEqual([pj1.reqs, pj1.final.resultado.code, pj1.final.efeitos.pedido.handoff, pj1.final.efeitos.falha.motivo], [undefined, 'encaminhar_equipe', true, 'encaminhar_equipe|barbeiro_humano']);
    assert.ok(!JSON.stringify(pj1.final.resultado).includes('Jayme'));
  }

  // Revisao (A2): agendamento + servico diferente em OUTRO dia nao e servico a mais (remarcacao com id de servico velho virava um
  // agendamento novo do outro servico): recusa sem consultar a agenda; no dia do agendamento segue sendo a busca do servico novo
  const outroDia = plano({ id_opcao_agendamento: '1', id_opcao_servico: 's1', data: '2026-11-27' }, ped());
  assert.deepEqual([outroDia.reqs, outroDia.final.resultado.code, outroDia.final.efeitos], [undefined, 'servico_diferente', {}]);
  assert.match(outroDia.final.resultado.orientacao, /para remarcar o agendamento, chame de novo só com id_opcao_agendamento \(sem id_opcao_servico\); para um agendamento novo desse serviço, chame sem id_opcao_agendamento$/);
  assert.equal(plano({ id_opcao_agendamento: '1', id_opcao_servico: 's1' }, ped()).reqs[0].qs.idServico, 'sCorte');
  assert.equal(plano({ id_opcao_agendamento: '1', data: '2026-11-27' }, ped()).reqs[0].qs.idServico, 'sBarba'); // so o agendamento: remarcacao para outro dia, como sempre

  // Revisao (A5): o horario colado e com um barbeiro que nao e o do agendamento (escolhido antes na conversa): a orientacao diz com quem
  ri = busca({ id_opcao_servico: 's1' }, ped([fut()], { barbeiro: { idProfissional: 'bO', apelido: 'Outro' } }), [grade(['10:40', '14:00']), ocup()]);
  assert.deepEqual(horas(ri), ['10:40*', '14:00']);
  assert.match(ri.resultado.orientacao, /^para ficar junto do que ele já tem, sem intervalo: 10:40 com Outro \(logo antes de BARBA EXPRESS\)\. /);

  // Revisao (A6): o barbeiro padrao veio do agendamento e nao tem horario: o texto fala do "barbeiro do agendamento", nao do ultimo atendimento
  let pa6 = plano({ periodo: 'manha', id_opcao_agendamento: '1', id_opcao_servico: 's1' }, semBarb);
  assert.equal(pa6.st.meta.doAg, true);
  pa6 = g.bvGPasso(pa6.st, betoCheio, cfgI);
  assert.deepEqual(pa6.reqs.map((q) => q.path), ['/servicos/profissionais']);
  pa6 = g.bvGPasso(pa6.st, [ok([{ idProfissional: 'bB', apelido: 'Beto' }, { idProfissional: 'bO', apelido: 'Outro' }])], cfgI);
  ri = g.bvGPasso(pa6.st, [grade(['09:20']), ocup()], cfgI).final;
  assert.match(ri.resultado.orientacao, /Beto, o barbeiro do agendamento, não tem horário de manha nesse dia: diga isso ao cliente e que os horários da lista são de outros barbeiros/);
  assert.doesNotMatch(ri.resultado.orientacao, /último atendimento/);

  // TESTE: o agendamento esta no barbeiro de teste, que nao e ofertado; sem barbeiro escolhido o agente pergunta (nunca "opcao desconhecida")
  const agT = { ...agBarba, idProfissional: TESTE, profissional: 'ZZ TESTE' };
  const rt = g.bvGPlano(entrada({ operacao: 'horarios_livres', data: D, id_opcao_agendamento: '1', id_opcao_servico: 's1' }), { pedido: { idCliente: 'c1', futuros: [fut({ idProfissional: TESTE })], agendamentos: [agT], servicos_vistos: vistos }, opcoes: {} }, cfg);
  assert.equal(rt.final.resultado.code, 'barbeiro_nao_escolhido');
  console.log('graces.test.js incluir servico ok');
}

// Cabelo e barba (owner, 2026-11-24): os dois juntos ocupam dois horarios seguidos; a fala do cliente no turno decide em codigo
{
  const sim = ['Gostaria de agendar cabelo e barba amanhã', 'corte e barba pra quinta', 'Barba e cabelo né?', 'Raspar na navalha e barba', 'quero cortar o cabelo e fazer a barba',
    'máquina e barba amanhã', 'corte + barba', 'cabelo, barba', 'cabelo com barba', 'barba e corte na máquina', 'quanto custa cabelo e barba?', 'barba mais o cabelo',
    'só cabelo e barba', 'é só cabelo e barba mesmo', 'Fala amigo, quero cabelo e barba amanhã', 'Bom dia irmão, cabelo e barba amanhã às 10?', 'cabelo e barba não tem horário amanhã?',
    'cabelo/barba', 'cabelo & barba', 'um corte e uma barba', 'degradê e barba', 'Cabelo adulto + barba', 'Cabelo máquina + barba']; // os dois ultimos: o toque no item da lista
  const nao = ['quero cortar a barba amanhã', 'corte de barba', 'só o corte de cabelo, sem barba', 'cabelo, barba não', 'quero fazer a barba', 'raspar a barba', 'passar a máquina na barba',
    'fazer a barba com máquina', 'cabelo pro meu filho e barba pra mim', 'cabelo e sobrancelha', 'não quero barba, só cabelo', '', null, undefined,
    'cortei o cabelo semana passada, hoje é barba', 'cortar o bigode e a barba', 'corte infantil pro pequeno e barba pra mim', 'corte do menino e barba pra mim',
    'corte adulto e barba express', 'corte pro meu pai e barba pra mim', 'corte adulto', 'barba design'];
  for (const t of sim) assert.equal(g.bvgCabeloEBarba(t), true, t);
  for (const t of nao) assert.equal(g.bvgCabeloEBarba(t), false, String(t));
  const t0 = Date.now();
  for (const t of ['cabelo ' + 'e '.repeat(296), 'corte'.repeat(120), 'barba e '.repeat(75), 'so cabelo '.repeat(60)]) g.bvgCabeloEBarba(t);
  assert.ok(Date.now() - t0 < 50); // regex limitadas: 600 caracteres hostis nao seguram o turno
  // a marca nasce da fala (nunca de fora) e a fala nao segue adiante
  const dois = (o) => entrada({ texto_cliente: 'quero cabelo e barba amanhã de manhã', ...o });
  assert.deepEqual([dois({ operacao: 'listar_servicos' }).cabelo_barba, dois({ operacao: 'listar_servicos' }).texto_cliente], [true, undefined]);
  assert.equal(entrada({ operacao: 'listar_servicos', texto_cliente: 'quero cortar a barba' }).cabelo_barba, undefined);
  assert.equal(g.bvGNormalizar({ ...base, operacao: 'listar_servicos', cabelo_barba: true }, cfg).resultado.code, 'campo_desconhecido');
  // listar_servicos: o modelo pediu a lista geral (ou so "barba") e saem so os combinados, com a orientacao
  const cat = [{ idServico: 'c1', descricaoAgenda: 'corte adulto', valorPadrao: 90 }, { idServico: 'b1', descricaoAgenda: 'barba design', valorPadrao: 70 },
    { idServico: 'k1', descricaoAgenda: 'Cabelo adulto + barba', valorPadrao: 150 }, { idServico: 'k2', descricaoAgenda: 'Cabelo máquina + barba', valorPadrao: 130 }];
  for (const texto of [undefined, 'barba', 'cabelo e barba', 'corte']) {
    const p = g.bvGPlano(dois({ operacao: 'listar_servicos', texto }), null, cfg);
    assert.equal(p.reqs.length, texto === 'barba' || texto === 'corte' ? 2 : 1, String(texto)); // lista geral ja traz os combinados: nenhuma chamada a mais
    const f = g.bvGPasso(p.st, p.reqs.map(() => ok(cat)), cfg).final;
    assert.deepEqual(f.resultado.servicos.map((x) => x.nome), ['Cabelo adulto + barba', 'Cabelo máquina + barba'], String(texto));
    assert.match(f.resultado.orientacao, /dois horários seguidos/);
    assert.deepEqual(f.efeitos.opcoes.itens.map((x) => x.valor.idServico), ['k1', 'k2']);
  }
  const lista = (o, ctx) => { const p = g.bvGPlano(entrada({ operacao: 'listar_servicos', ...o }), ctx || null, cfg); return g.bvGPasso(p.st, p.reqs.map(() => ok(cat)), cfg).final.resultado; };
  const nomes = (r) => r.servicos.map((x) => x.nome);
  assert.deepEqual(nomes(lista({ texto: 'maquina', texto_cliente: 'máquina e barba amanhã' })), ['Cabelo adulto + barba', 'Cabelo máquina + barba']); // busca pela palavra do cabelo (TESTE, 24/11)
  // loja sem servico combinado: vale a lista que o modelo pediu, sem a orientacao
  let p = g.bvGPlano(dois({ operacao: 'listar_servicos', texto: 'barba' }), null, cfg);
  let f = g.bvGPasso(p.st, p.reqs.map(() => ok(cat.slice(0, 2))), cfg).final;
  assert.deepEqual([f.resultado.servicos.map((x) => x.nome), f.resultado.orientacao], [['corte adulto', 'barba design'], undefined]);
  // busca de outro servico no mesmo turno ("cabelo, barba e sobrancelha") segue como o modelo pediu
  assert.equal(nomes(lista({ texto: 'sobrancelha', texto_cliente: 'cabelo, barba e sobrancelha' })).length, 4);
  // so uma vez: se a oferta atual ja e a dos combinados, o cliente viu e quer outra coisa (avulsos, pacote)
  const ofComb = { tipo: 'servico', itens: [{ id: '1', rotulo: 'Cabelo adulto + barba', valor: { idServico: 'k1', nome: 'Cabelo adulto + barba' } }, { id: '2', rotulo: 'Cabelo máquina + barba', valor: { idServico: 'k2', nome: 'Cabelo máquina + barba' } }] };
  assert.equal(nomes(lista({ texto: 'corte', texto_cliente: 'tenho pacote de corte, quero corte e barba separados' }, { opcoes: ofComb, pedido: {} })).length, 4);
  // quem ja tem agendamento futuro pode estar incluindo o que falta (servico a mais): a lista do modelo fica como e
  const fut = (dia) => [{ idAgenda: 'a1', idServico: 'b1', servico: 'barba design', horaInicio: `${dia}T11:20:00`, hora: '11:20', fim: '12:00', idProfissional: 'p1' }];
  p = g.bvGPlano(entrada({ operacao: 'listar_servicos', texto: 'corte', texto_cliente: 'Barba e cabelo né?' }), { pedido: { futuros: fut('2026-11-26') }, opcoes: {} }, cfg);
  assert.deepEqual(p.reqs.map((q) => q.qs.texto), ['corte']);
  // sem a fala dos dois nada muda
  p = g.bvGPlano(entrada({ operacao: 'listar_servicos', texto: 'barba', texto_cliente: 'quero fazer a barba' }), null, cfg);
  assert.deepEqual(p.reqs.map((q) => q.qs.texto), ['barba']);
  // horarios_livres: servico avulso para quem pediu os dois e recusado antes de qualquer chamada; o combinado e a sequencia passam
  const ofS = { tipo: 'servico', itens: [{ id: '1', rotulo: 'corte adulto', valor: { idServico: 'c1', nome: 'corte adulto', preco: 90, minutos: 40 } },
    { id: '2', rotulo: 'Cabelo adulto + barba', valor: { idServico: 'k1', nome: 'Cabelo adulto + barba', preco: 150, minutos: 80 } }, { id: '3', rotulo: 'barba design', valor: { idServico: 'b1', nome: 'barba design', preco: 70, minutos: 40 } }] };
  const hl = (o, ctx = { opcoes: ofS, pedido: {} }) => g.bvGPlano(dois({ operacao: 'horarios_livres', qualquer: true, data: '2026-11-25', ...o }), ctx, cfg);
  f = hl({ id_opcao_servico: '1' }).final;
  assert.equal(f.resultado.code, 'pediu_dois_servicos');
  assert.match(f.resultado.orientacao, /listar_servicos/);
  assert.deepEqual(f.efeitos, { pedido: { dois_avisado: T2 } }); // so a marca do aviso: a oferta e o resto do pedido ficam como estavam
  assert.equal(hl({}, { opcoes: {}, pedido: { servico: { idServico: 'c1', nome: 'corte adulto' } } }).final.resultado.code, 'pediu_dois_servicos'); // servico ja escolhido antes
  // uma vez por turno: se o modelo insiste, o cliente quer mesmo um so (marca errada custa uma chamada, nunca um laco); turno novo avisa de novo
  assert.ok(hl({ id_opcao_servico: '1' }, { opcoes: ofS, pedido: { dois_avisado: T2 } }).reqs.length > 0);
  assert.equal(hl({ id_opcao_servico: '1' }, { opcoes: ofS, pedido: { dois_avisado: T1 } }).final.resultado.code, 'pediu_dois_servicos');
  assert.ok(hl({ id_opcao_servico: '2' }).reqs.length > 0);
  assert.ok(hl({ id_opcoes_servicos: '1,3', qualquer: undefined }).reqs.length > 0);
  assert.ok(g.bvGPlano(entrada({ operacao: 'horarios_livres', qualquer: true, data: '2026-11-25', id_opcao_servico: '1', texto_cliente: 'quero cortar o cabelo amanhã' }), { opcoes: ofS, pedido: {} }, cfg).reqs.length > 0);
  // servico a mais: com agendamento de outro servico NO DIA da busca segue (horario colado); agendamento em outro dia nao isenta
  assert.ok(hl({ id_opcao_servico: '1' }, { opcoes: ofS, pedido: { futuros: fut('2026-11-25') } }).reqs.length > 0);
  assert.equal(hl({ id_opcao_servico: '1' }, { opcoes: ofS, pedido: { futuros: fut('2026-12-20') } }).final.resultado.code, 'pediu_dois_servicos');
  // agendar (fase 1): horario de servico avulso no turno em que ele pede os dois nao vira proposta
  const ofH = (servico, idServico) => ({ tipo: 'horario', itens: [{ id: '1', rotulo: '10:00', valor: { data: '2026-11-25', hora: '10:00', idProfissional: 'p1', apelido: 'Pedro', idServico, servico, preco: 90, minutos: 40 } }] });
  const ag = (of, pedido = {}) => g.bvGPlano(entrada({ operacao: 'agendar', id_opcao_horario: '1', texto_cliente: 'esse das 10h, é cabelo e barba tá' }), { opcoes: of, pedido: { idCliente: 'cli-1', ...pedido } }, cfg);
  assert.equal(ag(ofH('corte adulto', 'c1')).final.resultado.code, 'pediu_dois_servicos');
  assert.ok(ag(ofH('corte adulto', 'c1'), { dois_avisado: T2 }).reqs.length > 0);
  assert.ok(ag(ofH('Cabelo adulto + barba', 'k1')).reqs.length > 0);
  // Cliente com pacote (24/11: 65 de 288 clientes ativos; todos de servico avulso): cabelo e barba vao pelo servico do pacote e o
  // outro em sequencia, nunca pelo combinado (outro servico: nao abate a sessao)
  const catP = [...cat, { idServico: 'b2', descricaoAgenda: 'BARBA EXPRESS', valorPadrao: 45 }, { idServico: 'b3', descricaoAgenda: 'Camuflagem Barba', valorPadrao: 50 }, { idServico: 'm1', descricaoAgenda: 'corte com maquina', valorPadrao: 70 },
    { idServico: 'j1', descricaoAgenda: 'corte juvenil 12 a 17 anos', valorPadrao: 75 }, { idServico: 'u1', descricaoAgenda: 'Corte de unha', valorPadrao: 20 }, { idServico: 'c9', descricaoAgenda: 'corte adulto 2º vez', valorPadrao: 45 }];
  const sec = (k) => `aaaaaaaa-aaaa-4aaa-8aaa-${String(k).padStart(12, '0')}`;
  const pacote = (...ids) => ok(ids.length ? [{ idClientePacote: 'p1', descricao: 'Pacote', dataValidade: null, secoes: ids.map((x, k) => ({ idClienteItemPacote: sec(k), idProdutoServico: x, descricaoAgendaOnline: x })) }] : []);
  const ctxP = (pedido = {}, opcoes = {}) => ({ pedido: { idCliente: 'cli-1', ...pedido }, opcoes });
  const listaP = (respPac, texto, respCat = ok(catP)) => {
    const pp = g.bvGPlano(dois({ operacao: 'listar_servicos', texto }), ctxP(), cfg);
    assert.deepEqual(pp.reqs.map((q) => [q.path, q.qs.texto, q.qs.idCliente, Object.keys(q.qs).length]), [['/agenda/servicos', undefined, undefined, 0], ['/agenda/pacotes', undefined, 'cli-1', 1]], String(texto)); // catalogo todo + pacotes, juntos
    return g.bvGPasso(pp.st, [respCat, respPac], cfg).final;
  };
  const marcados = (r) => r.servicos.map((x) => [x.nome, !!x.pacote]);
  const naLista = (fim) => fim.efeitos.opcoes.itens.map((x) => x.valor.nome);
  // pacote so de corte: o corte do pacote vai ao modelo marcado; a lista do WhatsApp leva so as barbas (camuflagem nao e barba)
  f = listaP(pacote('c1', 'c1'), 'barba');
  assert.deepEqual(marcados(f.resultado), [['corte adulto', true], ['barba design', false], ['BARBA EXPRESS', false]]);
  assert.deepEqual(naLista(f), ['barba design', 'BARBA EXPRESS']);
  assert.match(f.resultado.orientacao, /tem pacote de corte adulto \(dado.*Não ofereça o serviço combinado.*pergunte qual serviço de barba ele quer.*exatamente dois ids, um de cabelo e um de barba/);
  assert.doesNotMatch(JSON.stringify(f.resultado), /aaaaaaaa|Pacote/); // nada do pacote alem do nome do servico vai ao modelo
  const idC1 = f.resultado.servicos[0].id, idB1 = f.resultado.servicos[1].id;
  assert.deepEqual(f.efeitos.pedido.dois_pacote, { cabelo: idC1, barba: null });
  const vistosP = f.efeitos.pedido.servicos_vistos, ofP = f.efeitos.opcoes;
  // a sequencia pedida pelo modelo resolve os dois ids (o do pacote nao esta na lista do WhatsApp)
  const hlP = (o, pedido = { dois_pacote: f.efeitos.pedido.dois_pacote }, opcoes = ofP, texto = 'barba design') => g.bvGPlano(entrada({ operacao: 'horarios_livres', data: '2026-11-25', texto_cliente: texto, ...o }), ctxP({ servicos_vistos: vistosP, ...pedido }, opcoes), cfg);
  assert.deepEqual(hlP({ id_opcoes_servicos: `${idC1},${idB1}` }).reqs.map((q) => q.qs.idServico), ['c1', 'b1']);
  // turno da escolha: o modelo busca SO a barba (a fala e "barba design", sem a marca) e o codigo monta o par, cabelo primeiro
  let par = hlP({ id_opcao_servico: idB1, qualquer: true });
  assert.deepEqual([par.reqs.map((q) => [q.path, q.qs.idServico]), par.st.meta.enc], [[['/servicos/profissionais', 'c1'], ['/servicos/profissionais', 'b1']], true]);
  // depois da lista de servicos (oferta de horario, de sequencia...) quem busca um so e atendido; sem a marca do pacote, tambem
  assert.deepEqual(hlP({ id_opcao_servico: idB1, qualquer: true }, undefined, { tipo: 'sequencia', itens: [] }).reqs.map((q) => q.qs.idServico), ['b1']);
  assert.deepEqual(hlP({ id_opcao_servico: idB1, qualquer: true }, {}).reqs.map((q) => q.qs.idServico), ['b1']);
  // pacote so de barba: falta o cabelo (unha, infantil, juvenil e 2a vez nao entram); a busca so do corte vira o par
  f = listaP(pacote('b1'));
  assert.deepEqual([marcados(f.resultado), naLista(f)], [[['barba design', true], ['corte adulto', false], ['corte com maquina', false]], ['corte adulto', 'corte com maquina']]);
  assert.match(f.resultado.orientacao, /pergunte qual serviço de cabelo ele quer/);
  par = g.bvGPlano(entrada({ operacao: 'horarios_livres', data: '2026-11-25', id_opcao_servico: f.resultado.servicos[1].id, qualquer: true, texto_cliente: 'corte adulto' }), ctxP({ servicos_vistos: f.efeitos.pedido.servicos_vistos, dois_pacote: f.efeitos.pedido.dois_pacote }, f.efeitos.opcoes), cfg);
  assert.deepEqual(par.reqs.map((q) => q.qs.idServico), ['c1', 'b1']);
  // pacotes de corte e de barba: nada a perguntar e nenhuma lista de avulsos pendurada (a oferta fica como estava)
  f = listaP(pacote('c1', 'b1'));
  assert.deepEqual(marcados(f.resultado), [['corte adulto', true], ['barba design', true]]);
  assert.match(f.resultado.orientacao, /Sem perguntar o serviço, chame horarios_livres com id_opcoes_servicos com exatamente dois ids/);
  assert.equal(f.efeitos.opcoes, undefined);
  assert.deepEqual(Object.values(f.efeitos.pedido.dois_pacote).every(Boolean), true);
  // dois servicos de cabelo no pacote: o cliente escolhe entre eles (a lista leva so esses) e depois a barba
  f = listaP(pacote('c1', 'm1'));
  assert.deepEqual([naLista(f), f.efeitos.pedido.dois_pacote], [['corte adulto', 'corte com maquina'], { cabelo: null, barba: null }]);
  assert.match(f.resultado.orientacao, /pergunte qual serviço de cabelo ele quer.*depois pergunte qual de barba.*exatamente dois ids/);
  f = listaP(pacote('c1', 'm1', 'b1'));
  assert.deepEqual([naLista(f), f.efeitos.pedido.dois_pacote.cabelo, !!f.efeitos.pedido.dois_pacote.barba], [['corte adulto', 'corte com maquina'], null, true]);
  // sem pacote, pacote so do filho (juvenil), de camuflagem, de unha, de servico fora do catalogo ou "2a vez", secao sem id valido,
  // pacote vencido ou leitura com falha: seguem os combinados, e a marca do pacote de uma listagem anterior cai
  const vencido = ok([{ idClientePacote: 'p1', dataValidade: '2020-01-01T00:00:00', secoes: [{ idClienteItemPacote: sec(1), idProdutoServico: 'c1' }] }]);
  const semId = ok([{ idClientePacote: 'p1', secoes: [{ idClienteItemPacote: 'sec0', idProdutoServico: 'c1' }] }]);
  for (const rp of [pacote(), pacote('j1'), pacote('b3'), pacote('u1'), pacote('zz'), pacote('c9'), semId, resp(500, {}), resp(200, { erro: 1 }), undefined]) {
    f = listaP(rp);
    assert.deepEqual(f.resultado.servicos.map((x) => x.nome), ['Cabelo adulto + barba', 'Cabelo máquina + barba']);
    assert.match(f.resultado.orientacao, /dois horários seguidos/);
    assert.equal(f.efeitos.pedido.dois_pacote, null);
  }
  void vencido; // validade: a listagem nao tem dia; quem decide e a proposta (bvgSecoes com a data)
  // id da secao em maiusculas: os dois leitores concordam (o pacote vale)
  assert.deepEqual(marcados(listaP(ok([{ idClientePacote: 'p1', secoes: [{ idClienteItemPacote: sec(2), idProdutoServico: 'C1' }] }])).resultado)[0], ['corte adulto', true]);
  // catalogo com falha e pacotes ok: erro de infraestrutura, nunca "ok, zero servicos"
  f = listaP(pacote('c1'), undefined, resp(500, {}));
  assert.equal(f.resultado.ok, false);
  assert.equal(f.efeitos.opcoes, undefined);
  // turno seguinte sem a fala ("barba design") em que o modelo lista "cabelo e barba" de novo: quem tem pacote continua no caminho
  // do pacote (pedido.dois_pacote), nao cai nos combinados (TESTE, 24/11)
  const de2 = (texto, pedido) => g.bvGPlano(entrada({ operacao: 'listar_servicos', texto, texto_cliente: 'barba design' }), ctxP(pedido, ofP), cfg);
  const p2 = de2('cabelo e barba', { dois_pacote: { cabelo: idC1, barba: null } });
  assert.deepEqual(p2.reqs.map((q) => q.path), ['/agenda/servicos', '/agenda/pacotes']);
  assert.deepEqual(marcados(g.bvGPasso(p2.st, [ok(catP), pacote('c1')], cfg).final.resultado), [['corte adulto', true], ['barba design', false], ['BARBA EXPRESS', false]]);
  assert.deepEqual(de2('cabelo e barba', {}).reqs.map((q) => [q.path, q.qs.texto]), [['/agenda/servicos', 'cabelo']]); // sem pacote: a busca de sempre (combinados)
  assert.deepEqual(de2('barba', { dois_pacote: { cabelo: idC1, barba: null } }).reqs.map((q) => [q.path, q.qs.texto]), [['/agenda/servicos', 'barba']]); // outra busca segue como pedida
  // sem a fala dos dois e sem a marca do pacote ninguem le pacote na listagem
  assert.deepEqual(g.bvGPlano(entrada({ operacao: 'listar_servicos', texto: 'barba', texto_cliente: 'quero fazer a barba' }), ctxP(), cfg).reqs.map((q) => q.path), ['/agenda/servicos']);
  // duas buscas de servico no MESMO turno ("raspar na navalha" e depois "barba", TESTE 24/11): a segunda nao desfaz a lista dos
  // combinados; "vale uma vez" e por turno. No turno seguinte, com a lista dos combinados na tela, a busca do modelo segue como pedida.
  {
    const fala = 'Raspar na navalha e barba';
    const p1 = g.bvGPlano(entrada({ operacao: 'listar_servicos', texto: 'raspar na navalha', texto_cliente: fala }), null, cfg);
    const f1 = g.bvGPasso(p1.st, p1.reqs.map(() => ok(cat)), cfg).final;
    assert.deepEqual([nomes(f1.resultado), f1.efeitos.pedido.dois_turno], [['Cabelo adulto + barba', 'Cabelo máquina + barba'], T2]);
    const ctx2 = { pedido: { ...f1.efeitos.pedido }, opcoes: f1.efeitos.opcoes };
    const p2b = g.bvGPlano(entrada({ operacao: 'listar_servicos', texto: 'barba', texto_cliente: fala }), ctx2, cfg);
    assert.deepEqual(nomes(g.bvGPasso(p2b.st, p2b.reqs.map(() => ok(cat)), cfg).final.resultado), ['Cabelo adulto + barba', 'Cabelo máquina + barba']);
    const p3b = g.bvGPlano(entrada({ operacao: 'listar_servicos', texto: 'barba', texto_cliente: 'prefiro corte e barba separados', turno_id: T1 }), ctx2, cfg);
    assert.equal(nomes(g.bvGPasso(p3b.st, p3b.reqs.map(() => ok(cat)), cfg).final.resultado).length, 4);
  }
  // busca de servico sem resultado (PROD, 23/11): o resultado manda dizer qual nao achou, e a oferta anterior (a lista do outro
  // servico pedido) fica como estava
  {
    const pz = g.bvGPlano(entrada({ operacao: 'listar_servicos', texto: 'sobrancelha' }), { pedido: {}, opcoes: ofS }, cfg);
    const fz = g.bvGPasso(pz.st, [ok([])], cfg).final;
    assert.deepEqual([fz.resultado.ok, fz.resultado.total, fz.resultado.servicos], [true, 0, []]);
    assert.match(fz.resultado.orientacao, /nenhum serviço da loja com esse termo: diga ao cliente qual serviço você não achou.*sem trocar por outro/);
    assert.equal(fz.efeitos.opcoes, undefined);
    const fa = g.bvGPasso(pz.st, [ok([{ idServico: 'b1', descricaoAgenda: 'barba design', valorPadrao: 70 }])], cfg).final; // com resultado segue igual
    assert.deepEqual([fa.resultado.orientacao, fa.efeitos.opcoes.itens.length], [undefined, 1]);
  }
  console.log('graces.test.js cabelo e barba ok');
}

// ---- Sequencia respeita barbeiro e periodo (owner, 24/11: "cabelo e barba de manha com o Pedro" trazia o dia inteiro de todos) ----
{
  const D = '2026-11-26';
  const ofS = { tipo: 'servico', itens: [{ id: '1', rotulo: 'corte', valor: { idServico: 's1', nome: 'corte adulto', preco: 85, minutos: 40 } }, { id: '2', rotulo: 'barba', valor: { idServico: 's2', nome: 'barba', preco: 40, minutos: 30 } }] };
  const NOMES = { p1: 'Pedro', p2: 'Rui', p3: 'Beto', bj: 'Jayme', [TESTE]: 'ZZ TESTE' };
  const PEDRO = { idProfissional: 'p1', apelido: 'Pedro' };
  // a lista de barbeiros ja mostrada ao cliente (listar_barbeiros): '1' Pedro, '2' Rui, '3' Qualquer barbeiro
  const listados = { barbeiros: [{ opcao_id: '1', ...PEDRO }, { opcao_id: '2', idProfissional: 'p2', apelido: 'Rui' }], qualquer_opcao: '3' };
  const mais40 = (h) => { const m = Number(h.slice(0, 2)) * 60 + Number(h.slice(3)) + 40; return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; };
  // agenda = inicios de sequencia de cada barbeiro (corte 40 min + barba em seguida); fazem = quem faz cada servico
  const rodar = (pl, agenda, fazem, c = cfg, falhaEm = 0) => { // falhaEm: estagio (1 = barbeiros) cuja 1a resposta e um 500
    if (pl.final) return { fim: pl.final, reqs: 0, consultados: [] };
    const profs = (ids) => ok(ids.map((id) => ({ idProfissional: id, apelido: `${NOMES[id]} ` })));
    const grade = (q) => (q.path === '/agenda/horarios' ? ok({ horarios: [] }) : q.qs.idServico === 's1' ? ok({ minutos: 40, horarios: agenda[q.qs.idProfissional] || [] }) : ok({ minutos: 30, horarios: (agenda[q.qs.idProfissional] || []).map(mais40) }));
    let reqs = pl.reqs.length, estagios = 1;
    const consultados = [];
    let x = g.bvGPasso(pl.st, [profs(fazem[0]), profs(fazem[1])], c);
    while (x.reqs) {
      reqs += x.reqs.length; estagios += 1;
      assert.ok(x.reqs.length <= 20); // teto de consultas por estagio
      consultados.push(...new Set(x.reqs.map((q) => q.qs.idProfissional)));
      x = g.bvGPasso(x.st, x.reqs.map((q, k) => (estagios === falhaEm && k === 0 ? resp(500, { code: 'ERRO_INTERNO' }) : grade(q))), c);
    }
    return { fim: x.final, reqs, estagios, consultados };
  };
  const TODOS = [['p1', 'p2'], ['p1', 'p2']];
  const seq = (o, pedido, agenda, fazem = TODOS, c = cfg, falhaEm = 0, of = ofS) => rodar(g.bvGPlano(entrada({ operacao: 'horarios_livres', id_opcoes_servicos: ['1', '2'], data: D, ...o }), ctxOp(of, { idCliente: 'c1', ...pedido }), c), agenda, fazem, c, falhaEm);
  const lista = (x) => x.fim.resultado.opcoes.map((o) => `${o.hora} ${o.barbeiro}`);
  const AG = { p1: ['09:00', '14:00'], p2: ['10:00', '15:00'] };
  // agendar no turno da busca (T2) e no turno seguinte (T1), com a 1a opcao da lista
  const agendar = (x, turno) => semPacote(g.bvGPlano(entrada({ operacao: 'agendar', id_opcao_horario: x.fim.resultado.opcoes[0].id, turno_id: turno }), ctxOp(x.fim.efeitos.opcoes, { idCliente: 'c1', ...x.fim.efeitos.pedido }), cfg)).final.resultado;

  // sem barbeiro e sem periodo: como antes (todos os barbeiros que fazem os dois, o dia inteiro); a contagem de chamadas e a base
  let x = seq({}, {}, AG);
  assert.deepEqual([lista(x), x.fim.resultado.orientacao, x.reqs, x.estagios], [['09:00 Pedro', '10:00 Rui', '14:00 Pedro', '15:00 Rui'], undefined, 8, 2]); // 2 + 2 barbeiros x (2 grades + 1 ocupacao)
  assert.deepEqual([x.fim.efeitos.pedido.busca.outros, x.fim.efeitos.pedido.barbeiro], [false, undefined]);
  assert.equal(agendar(x, T2).aguardando_confirmacao, true); // lista do pedido: segue como antes
  const BASE = x.reqs;

  // periodo: ha no periodo => so as do periodo (pelo inicio da sequencia)
  x = seq({ periodo: 'manha' }, {}, AG);
  assert.deepEqual([lista(x), x.fim.resultado.orientacao, x.reqs], [['09:00 Pedro', '10:00 Rui'], undefined, BASE]);
  x = seq({ periodo: 'tarde' }, {}, AG);
  assert.deepEqual(lista(x), ['14:00 Pedro', '15:00 Rui']);
  // nao ha no periodo, ha no dia => diz isso e entrega as do dia; quem escolhe e o cliente (nao vira proposta no turno da busca)
  x = seq({ periodo: 'noite' }, {}, AG);
  assert.deepEqual([lista(x), x.reqs], [['09:00 Pedro', '10:00 Rui', '14:00 Pedro', '15:00 Rui'], BASE]);
  assert.match(x.fim.resultado.orientacao, /^sem horário para os serviços em sequência de noite nesse dia: diga isso ao cliente; a lista traz os horários do dia\. Pergunte qual horário ele prefere, sem escolher por ele$/);
  assert.equal(x.fim.efeitos.pedido.busca.outros, true);
  assert.equal(agendar(x, T2).code, 'cliente_nao_escolheu');
  assert.equal(agendar(x, T1).aguardando_confirmacao, true);
  // "depois das 18h" segue a mesma regra do periodo (antes a lista saia vazia e sem orientacao)
  x = seq({ a_partir: '18:00' }, {}, AG);
  assert.equal(lista(x).length, 4);
  assert.match(x.fim.resultado.orientacao, /^sem horário para os serviços em sequência a partir das 18:00 nesse dia: diga isso/);
  assert.deepEqual(lista(seq({ a_partir: '14:00' }, {}, AG)), ['14:00 Pedro', '15:00 Rui']);
  // nao ha no dia: a decisao de sempre (barbeiros diferentes | agendar separado), com ou sem periodo
  for (const o of [{}, { periodo: 'manha' }]) {
    x = seq(o, {}, {});
    assert.deepEqual([x.fim.resultado.sem_barbeiro_unico, x.fim.efeitos.opcoes.tipo, x.reqs], [true, 'modo_encadeamento', BASE]);
  }

  // barbeiro escolhido (pela opcao ou o que ja vale na conversa) e ele tem: so ele e consultado e so as dele saem
  for (const [o, pedido] of [[{ id_opcao_barbeiro: '1' }, listados], [{}, { barbeiro: PEDRO }]]) {
    x = seq(o, pedido, AG);
    assert.deepEqual([lista(x), x.fim.resultado.orientacao, x.consultados, x.reqs, x.estagios], [['09:00 Pedro', '14:00 Pedro'], undefined, ['p1'], 5, 2]); // 2 + (2 grades + 1 ocupacao)
    assert.deepEqual([x.fim.efeitos.pedido.barbeiro, x.fim.efeitos.pedido.busca.outros], [PEDRO, false]); // segue valendo na conversa
  }
  x = seq({ id_opcao_barbeiro: '1', periodo: 'manha' }, listados, AG);
  assert.deepEqual([lista(x), x.fim.resultado.orientacao, x.reqs], [['09:00 Pedro'], undefined, 5]);
  // ele nao tem no dia e outros tem: diz isso pelo apelido e entrega as dos outros; as chamadas nao passam das de antes
  x = seq({ id_opcao_barbeiro: '1' }, listados, { p2: AG.p2 });
  assert.deepEqual([lista(x), x.consultados, x.reqs, x.estagios], [['10:00 Rui', '15:00 Rui'], ['p1', 'p2'], BASE, 3]);
  assert.match(x.fim.resultado.orientacao, /^Pedro não tem horário para os serviços em sequência nesse dia: diga isso ao cliente; os horários da lista são de outros barbeiros\. Pergunte qual horário ele prefere, sem escolher por ele$/);
  assert.equal(x.fim.efeitos.pedido.busca.outros, true);
  assert.equal(agendar(x, T2).code, 'cliente_nao_escolheu'); // pediu o Pedro: a sequencia de outro barbeiro espera a resposta dele
  assert.equal(agendar(x, T1).aguardando_confirmacao, true);
  // ele nao tem no periodo: as dele em outro horario e as de outros barbeiros no periodo (a das 15:00 do Rui nao atende nem um nem outro)
  x = seq({ periodo: 'manha' }, { barbeiro: PEDRO }, { p1: ['14:00'], p2: AG.p2 });
  assert.deepEqual([lista(x), x.reqs], [['10:00 Rui', '14:00 Pedro'], BASE]);
  assert.match(x.fim.resultado.orientacao, /^Pedro não tem horário para os serviços em sequência de manha nesse dia: diga isso ao cliente; a lista traz os horários dele em outro horário do dia e os de outros barbeiros de manha nesse dia\. Pergunte/);
  x = seq({ periodo: 'manha' }, { barbeiro: PEDRO }, { p1: ['14:00'] }); // so ele tem, e fora do periodo
  assert.deepEqual(lista(x), ['14:00 Pedro']);
  assert.match(x.fim.resultado.orientacao, /a lista traz os horários dele em outro horário do dia\. Pergunte/);
  assert.equal(agendar(x, T2).code, 'cliente_nao_escolheu'); // unica opcao, mas fora do que ele pediu
  x = seq({ periodo: 'manha' }, { barbeiro: PEDRO }, { p2: ['15:00'] }); // nem ele no dia, nem ninguem no periodo
  assert.deepEqual(lista(x), ['15:00 Rui']);
  assert.match(x.fim.resultado.orientacao, /^Pedro não tem horário para os serviços em sequência nesse dia: diga isso ao cliente; os horários da lista são de outros barbeiros, em outro horário do dia \(de manha nesse dia não há com ninguém\)\. Pergunte/);
  x = seq({ periodo: 'manha' }, { barbeiro: PEDRO }, {}); // ninguem no dia: a decisao de sempre
  assert.deepEqual([x.fim.resultado.sem_barbeiro_unico, x.reqs], [true, BASE]);
  // ele nao faz um dos servicos: diz isso e entrega as de quem faz os dois, sem consultar a agenda dele
  x = seq({ id_opcao_barbeiro: '1' }, listados, AG, [['p1', 'p2'], ['p2']]);
  assert.deepEqual([lista(x), x.consultados, x.reqs], [['10:00 Rui', '15:00 Rui'], ['p2'], 5]);
  assert.match(x.fim.resultado.orientacao, /^Pedro não faz todos os serviços pedidos: diga isso ao cliente; os horários da lista são de outros barbeiros\. Pergunte/);
  assert.equal(seq({ id_opcao_barbeiro: '1' }, listados, AG, [['p1'], ['p2']]).fim.resultado.sem_barbeiro_unico, true); // ninguem faz os dois
  // hora aproximada: vale entre as sequencias dele
  x = seq({ id_opcao_barbeiro: '1', hora: '14:30' }, listados, AG);
  assert.deepEqual([lista(x), x.reqs], [['14:00 Pedro'], 5]);
  // teto de barbeiros por estagio: o escolhido e sempre consultado, mesmo sendo o ultimo da lista da Graces
  const c2 = { ...cfg, graces: { max_consultas_estagio: 6 } }; // 2 barbeiros
  x = seq({}, { barbeiro: PEDRO }, { p3: ['11:00'] }, [['p2', 'p3', 'p1'], ['p2', 'p3', 'p1']], c2);
  assert.deepEqual([x.consultados, x.fim.resultado.sem_barbeiro_unico], [['p1', 'p2'], true]);

  // qualquer=true (campo ou o item "Qualquer barbeiro"): todos, mesmo com barbeiro ja escolhido na conversa
  for (const o of [{ qualquer: true }, { id_opcao_barbeiro: '3' }]) {
    x = seq(o, { ...listados, barbeiro: PEDRO }, AG);
    assert.deepEqual([lista(x), x.fim.resultado.orientacao, x.reqs, x.fim.efeitos.pedido.barbeiro], [['09:00 Pedro', '10:00 Rui', '14:00 Pedro', '15:00 Rui'], undefined, BASE, undefined]);
  }

  // clausula petrea: barbeiro so da equipe escolhido => encaminha, sem consultar; na resposta da Graces ele nunca entra na lista
  const cj = { ...cfg, humanos: [{ id: 'bj', nome: 'Jayme' }] };
  x = seq({}, { barbeiro: { idProfissional: 'bj', apelido: 'Jayme' } }, AG, TODOS, cj);
  assert.deepEqual([x.fim.resultado.code, x.fim.resultado.motivo, x.fim.efeitos.pedido.handoff, x.reqs], ['encaminhar_equipe', 'barbeiro_humano', true, 0]);
  x = seq({ periodo: 'manha' }, {}, { ...AG, bj: ['08:00'], [TESTE]: ['08:00'] }, [['bj', TESTE, 'p1', 'p2'], ['bj', TESTE, 'p1', 'p2']], cj);
  assert.deepEqual([lista(x), x.consultados], [['09:00 Pedro', '10:00 Rui'], ['p1', 'p2']]);
  x = seq({ id_opcao_barbeiro: '1' }, listados, { bj: ['08:00'], [TESTE]: ['08:00'] }, [['bj', TESTE, 'p1'], ['bj', TESTE, 'p1']], cj); // sem alternativa que possa ser ofertada
  assert.deepEqual([x.fim.resultado.sem_barbeiro_unico, x.consultados], [true, ['p1']]);
  assert.doesNotMatch(JSON.stringify(x.fim), /Jayme|TESTE/);
  // opcao de barbeiro que nao veio de uma lista (id inventado, o nome no lugar do id) ou o barbeiro de teste: nunca troca de barbeiro em
  // silencio, e a recusa diz o que fazer (a oferta guardada e a de servicos: "mande a lista de novo" nao dizia qual)
  for (const [o, pedido] of [[{ id_opcao_barbeiro: '9' }, listados], [{ id_opcao_barbeiro: 'Pedro' }, {}], [{}, { barbeiro: { idProfissional: TESTE, apelido: 'ZZ TESTE' } }]]) {
    x = seq(o, pedido, AG);
    assert.deepEqual([x.fim.resultado.code, x.reqs, x.fim.efeitos], ['barbeiro_nao_listado', 0, {}]);
    assert.match(x.fim.resultado.orientacao, /nada foi consultado: chame listar_barbeiros com id_opcao_servico de um dos serviços e repita esta busca com o id_opcao_barbeiro da lista; se o cliente não pediu barbeiro, busque sem barbeiro$/);
  }

  // conversao do pacote (busca de UM servico vira o par): barbeiro, qualquer e periodo que o modelo mandou seguem valendo
  const pac = (o, pedido = {}) => g.bvGPlano(entrada({ operacao: 'horarios_livres', data: D, id_opcao_servico: '2', ...o }), ctxOp(ofS, { idCliente: 'c1', dois_pacote: { cabelo: '1', barba: null }, ...listados, ...pedido }), cfg);
  let pp = pac({ id_opcao_barbeiro: '1', periodo: 'manha' });
  assert.deepEqual([pp.st.in.id_opcoes_servicos, pp.st.in.id_opcao_barbeiro, pp.st.meta.enc, pp.st.meta.esc, pp.st.meta.periodo], [['1', '2'], '1', true, PEDRO, 'manha']);
  x = rodar(pp, AG, TODOS);
  assert.deepEqual([lista(x), x.reqs], [['09:00 Pedro'], 5]);
  assert.deepEqual(x.fim.efeitos.opcoes.itens[0].valor.itens.map((it) => [it.servico, it.hora, it.apelido]), [['corte adulto', '09:00', 'Pedro'], ['barba', '09:40', 'Pedro']]);
  assert.deepEqual(pac({ periodo: 'tarde' }, { barbeiro: PEDRO }).st.meta.esc, PEDRO); // sem a opcao, o barbeiro ja escolhido na conversa
  pp = pac({ qualquer: true, periodo: 'tarde' }, { barbeiro: PEDRO });
  assert.deepEqual([pp.st.in.qualquer, pp.st.meta.esc, pp.st.meta.periodo], [true, null, 'tarde']);
  assert.deepEqual(lista(rodar(pp, AG, TODOS)), ['14:00 Pedro', '15:00 Rui']);
  assert.deepEqual([pac({}).st.meta.esc, pac({}).st.meta.periodo], [null, undefined]); // sem barbeiro e sem periodo: como antes

  // "Outro dia" (mesma sequencia em outra data) leva periodo e barbeiro; "Barbeiros diferentes" leva so o periodo
  const modos = { tipo: 'modo_encadeamento', itens: [{ id: '1', rotulo: 'Outro dia', valor: 'outro_dia' }, { id: '2', rotulo: 'Barbeiros diferentes', valor: 'barbeiros_diferentes' }] };
  const pedM = { idCliente: 'c1', barbeiro: PEDRO, seq_dia: '2026-11-25', servicos: ofS.itens.map((it) => ({ opcao_id: it.id, ...it.valor })) };
  const modo = (id, o) => g.bvGPlano(entrada({ operacao: 'horarios_livres', id_opcao: id, data: D, ...o }), ctxOp(modos, pedM), cfg);
  pp = modo('1', { periodo: 'tarde' });
  assert.deepEqual([pp.st.meta.etapa, pp.st.meta.esc, pp.st.meta.periodo], ['enc_prof', PEDRO, 'tarde']);
  assert.deepEqual(lista(rodar(pp, AG, TODOS)), ['14:00 Pedro']);
  pp = modo('2', { periodo: 'tarde' });
  assert.deepEqual([pp.st.meta.etapa, pp.st.meta.esc, pp.st.meta.periodo], ['dif_prof', null, 'tarde']);
  const dif = (o, agenda) => rodar(modo('2', o), agenda, [['p1'], ['p2']]).fim; // corte so com o Pedro, barba so com o Rui
  let fd = dif({ periodo: 'tarde' }, { p1: ['09:00', '14:00'], p2: ['09:00', '14:00'] });
  assert.deepEqual([fd.resultado.opcoes.map((o) => `${o.hora} ${o.barbeiros.join('+')}`), fd.resultado.orientacao, fd.efeitos.pedido.busca.outros, fd.efeitos.pedido.barbeiro], [['14:00 Pedro+Rui'], undefined, false, undefined]);
  fd = dif({ periodo: 'noite' }, { p1: ['09:00', '14:00'], p2: ['09:00', '14:00'] });
  assert.deepEqual([fd.resultado.opcoes.map((o) => o.hora), fd.efeitos.pedido.busca.outros], [['09:00', '14:00'], true]);
  assert.match(fd.resultado.orientacao, /^sem horário para os serviços em sequência de noite nesse dia: diga isso ao cliente; a lista traz os horários do dia\. Pergunte/);

  // ---- revisao de 24/11 ----
  const vistos = ofS.itens.map((it) => ({ id: it.id, ...it.valor }));
  const depois = (x, pedido = {}) => ctxOp(x.fim.efeitos.opcoes, { idCliente: 'c1', servicos_vistos: vistos, ...pedido, ...x.fim.efeitos.pedido }); // o contexto da chamada seguinte
  // A. pacote + barbeiro: quem pede um barbeiro passa por listar_barbeiros, que troca a oferta para barbeiros e guarda UM servico no
  // pedido; a busca desse servico (pelo id, pelo nome ou sem servico nenhum) continua virando o par, com o barbeiro e o periodo
  const ofB = { tipo: 'barbeiro', itens: [{ id: '1', rotulo: 'Pedro', valor: PEDRO }, { id: '2', rotulo: 'Rui', valor: { idProfissional: 'p2', apelido: 'Rui' } }, { id: '3', rotulo: 'Qualquer barbeiro', valor: { qualquer: true } }] };
  const pedB = { idCliente: 'c1', dois_pacote: { cabelo: '1', barba: null }, servicos_vistos: vistos, servico: { ...ofS.itens[1].valor, opcao_id: '2' }, ...listados };
  const pacB = (o, pedido = pedB, of = ofB) => g.bvGPlano(entrada({ operacao: 'horarios_livres', data: D, id_opcao_barbeiro: '1', periodo: 'manha', ...o }), ctxOp(of, pedido), cfg);
  for (const o of [{ id_opcao_servico: '2' }, {}, { id_opcao_servico: 'barba' }]) {
    pp = pacB(o);
    assert.deepEqual([pp.st.in.id_opcoes_servicos, pp.st.in.id_opcao_servico, pp.st.in.servico_nome, pp.st.meta.esc, pp.st.meta.periodo, pp.reqs.map((q) => q.qs.idServico)], [['1', '2'], undefined, undefined, PEDRO, 'manha', ['s1', 's2']], JSON.stringify(o));
    x = rodar(pp, AG, TODOS);
    assert.deepEqual([lista(x), x.reqs], [['09:00 Pedro'], 5]);
    assert.deepEqual(x.fim.efeitos.opcoes.itens[0].valor.itens.map((it) => [it.servico, it.hora]), [['corte adulto', '09:00'], ['barba', '09:40']]);
  }
  assert.deepEqual(pacB({ id_opcao_barbeiro: '3' }).st.meta.esc, null); // "Qualquer barbeiro" da lista: o par, com todos
  // pacote de barba e a busca do corte: o par sai na mesma ordem (cabelo primeiro)
  assert.deepEqual(pacB({}, { ...pedB, dois_pacote: { cabelo: null, barba: '2' }, servico: { ...ofS.itens[0].valor, opcao_id: '1' } }).st.in.id_opcoes_servicos, ['1', '2']);
  // segue sendo busca de um servico so: sem a marca do pacote, depois que a oferta ja e de horarios, e o proprio servico do pacote
  for (const um of [pacB({ id_opcao_servico: '2' }, { ...pedB, dois_pacote: null }), pacB({}, pedB, { tipo: 'horario', itens: [] }), pacB({ id_opcao_servico: '1' })]) {
    assert.deepEqual([um.st.meta.enc, um.reqs.map((q) => q.path)], [undefined, ['/agenda/horarios-livres', '/agenda/horarios']]);
  }
  // B. hora pedida sem horario perto: a lista traz os mais proximos e espera a escolha do cliente, como na busca de um servico
  x = seq({ id_opcao_barbeiro: '1', hora: '17:00' }, listados, AG);
  assert.deepEqual([lista(x), x.fim.efeitos.pedido.busca.outros], [['09:00 Pedro', '14:00 Pedro'], true]);
  assert.match(x.fim.resultado.orientacao, /^não há horário perto das 17:00/);
  assert.equal(agendar(x, T2).code, 'cliente_nao_escolheu');
  assert.equal(agendar(x, T1).aguardando_confirmacao, true);
  assert.deepEqual([x.fim.efeitos.pedido.busca.outros, x.fim.efeitos.pedido.busca.fora], [true, false]); // "mais proximos" nao e lista fora do pedido: segue travando o turno
  // C. busca dia a dia no mesmo turno ("de manha, qualquer dia" | "depois das 18"): o dia que so tem sequencia fora do pedido nao
  // trava a busca do dia seguinte; a lista que atendeu o pedido continua sendo a unica do turno
  const outroDia = (x, o) => g.bvGPlano(entrada({ operacao: 'horarios_livres', id_opcoes_servicos: ['1', '2'], data: '2026-11-27', ...o }), depois(x), cfg);
  for (const o of [{ periodo: 'manha' }, { a_partir: '18:00' }]) {
    x = seq(o, { servicos_vistos: vistos }, { p1: ['14:00'], p2: ['15:00'] });
    assert.deepEqual([x.fim.efeitos.pedido.busca.n, x.fim.efeitos.pedido.busca.outros, x.fim.efeitos.pedido.busca.fora, x.fim.efeitos.opcoes.tipo], [2, true, true, 'sequencia']);
    assert.deepEqual(outroDia(x, o).reqs.map((q) => q.path), ['/servicos/profissionais', '/servicos/profissionais']);
  }
  x = seq({ periodo: 'manha' }, { servicos_vistos: vistos }, AG);
  assert.equal(outroDia(x, { periodo: 'manha' }).final.resultado.code, 'lista_ja_definida');
  // D. o cliente toca num item da lista mista e o modelo repete a MESMA busca antes de agendar: a busca guarda o turno da primeira e a
  // escolha passa; no turno da primeira busca a barreira segue valendo, e uma busca diferente volta a contar do turno dela
  const mista = (turno, ctx) => rodar(g.bvGPlano(entrada({ operacao: 'horarios_livres', id_opcoes_servicos: ['1', '2'], data: D, periodo: 'manha', turno_id: turno }), ctx, cfg), { p1: ['14:00'], p2: AG.p2 }, TODOS);
  const m1 = mista(T1, ctxOp(ofS, { idCliente: 'c1', servicos_vistos: vistos, barbeiro: PEDRO }));
  assert.deepEqual([lista(m1), m1.fim.efeitos.pedido.busca.turno, m1.fim.efeitos.pedido.busca.outros], [['10:00 Rui', '14:00 Pedro'], T1, true]);
  assert.equal(agendar(m1, T1).code, 'cliente_nao_escolheu');
  const m2 = mista(T2, depois(m1));
  assert.deepEqual([lista(m2), m2.fim.efeitos.pedido.busca.turno, m2.fim.efeitos.pedido.busca.outros], [['10:00 Rui', '14:00 Pedro'], T1, true]);
  assert.equal(agendar(m2, T2).aguardando_confirmacao, true);
  assert.equal(agendar(mista(T1, depois(m1)), T1).code, 'cliente_nao_escolheu'); // a repeticao no turno da primeira busca nao libera
  x = rodar(g.bvGPlano(entrada({ operacao: 'horarios_livres', id_opcoes_servicos: ['1', '2'], data: D, periodo: 'noite' }), depois(m1), cfg), AG, TODOS); // outra busca, no T2
  assert.deepEqual([x.fim.efeitos.pedido.busca.turno, agendar(x, T2).code], [T2, 'cliente_nao_escolheu']);
  // E. com hora pedida a lista e so um trecho: a orientacao fala dos itens entregues
  x = seq({ periodo: 'manha', hora: '10:00' }, { barbeiro: PEDRO }, { p1: ['14:00'], p2: ['10:00', '15:00'] });
  assert.deepEqual(lista(x), ['10:00 Rui']);
  assert.match(x.fim.resultado.orientacao, /^Pedro não tem horário para os serviços em sequência de manha nesse dia: diga isso ao cliente; os horários da lista são de outros barbeiros\. Pergunte qual horário ele prefere, sem escolher por ele$/);
  x = seq({ periodo: 'noite', hora: '19:00' }, {}, AG);
  assert.deepEqual(lista(x), ['14:00 Pedro', '15:00 Rui']);
  assert.match(x.fim.resultado.orientacao, /^não há horário perto das 19:00; a lista traz os mais próximos.*; sem horário para os serviços em sequência de noite nesse dia: diga isso ao cliente; a lista traz outros horários do dia\. Pergunte/);
  x = seq({ periodo: 'manha', hora: '15:00' }, { barbeiro: PEDRO }, { p1: ['14:00'], p2: ['10:00', '15:00'] }); // perto das 15h so ha o dele
  assert.deepEqual(lista(x), ['14:00 Pedro']);
  assert.match(x.fim.resultado.orientacao, /a lista traz os horários dele em outro horário do dia\. Pergunte/);
  // G. a consulta dos outros barbeiros (estagio a mais) falha: as do barbeiro escolhido, ja calculadas, seguem; sem nenhuma dele, e falha
  x = seq({ periodo: 'manha' }, { barbeiro: PEDRO }, { p1: ['14:00'], p2: AG.p2 }, TODOS, cfg, 3);
  assert.deepEqual([x.fim.resultado.ok, lista(x), x.estagios, x.fim.efeitos.falha.operacao], [true, ['14:00 Pedro'], 3, 'horarios_livres']);
  assert.match(x.fim.resultado.orientacao, /^Pedro não tem horário para os serviços em sequência de manha nesse dia: diga isso ao cliente; a lista traz os horários dele em outro horário do dia\. Pergunte/);
  x = seq({ periodo: 'manha' }, { barbeiro: PEDRO }, { p2: AG.p2 }, TODOS, cfg, 3);
  assert.deepEqual([x.fim.resultado.ok, x.fim.efeitos.opcoes, !!x.fim.efeitos.falha], [false, undefined, true]);
  assert.equal(seq({}, {}, AG, TODOS, cfg, 2).fim.resultado.ok, false); // sem barbeiro escolhido: como antes
  console.log('graces.test.js sequencia com barbeiro e periodo ok');
}

// Turno de retorno do atendimento humano (owner, 2026-11-25): a conversa acabou de voltar da equipe e nada a devolve neste turno
{
  const assert = require('assert');
  const ent = entrada({ operacao: 'transferir_atendimento', motivo: 'pediu_pessoa' });
  const comum = g.bvGPlano(ent, { pedido: { idCliente: 'c1' } }, cfg).final;
  assert.deepEqual([comum.resultado.code, !!comum.efeitos.handoff, comum.efeitos.pedido.handoff], ['encaminhar_equipe', true, true]);
  const outro = g.bvGPlano(ent, { pedido: { idCliente: 'c1', retorno: '99999999-9999-4999-8999-999999999999' } }, cfg).final;
  assert.equal(outro.resultado.code, 'encaminhar_equipe'); // marca de outro turno: vale a regra normal
  const r = g.bvGPlano(ent, { pedido: { idCliente: 'c1', retorno: ent.turno_id } }, cfg).final;
  assert.deepEqual([r.resultado.ok, r.resultado.code, r.efeitos.handoff, r.efeitos.pedido.handoff, r.resultado.texto], [false, 'equipe_neste_turno', undefined, undefined, undefined]);
  assert.match(r.resultado.orientacao, /sem dizer nome de barbeiro e sem prometer retorno da equipe/);
  assert.deepEqual([r.efeitos.falha.motivo, r.efeitos.falha.code], ['retorno_sem_transferir|pediu_pessoa', 'equipe_neste_turno']);
  // fim de estagio (bvGPasso) que passaria para a equipe: sai a transferencia, fica o resto dos efeitos (proposta fechada)
  const fimEquipe = { final: { resultado: { ok: false, code: 'encaminhar_equipe', motivo: 'pacote', texto: 'x' }, efeitos: { pedido: { handoff: true }, handoff: { queueId: 78 }, falha: { operacao: 'cancelar' }, proposta_upd: { id: 'p1', estado: 'falhou' } } } };
  const s = g.bvgSemRetransferir(fimEquipe, { retorno: 't1' }, 't1').final;
  assert.deepEqual([s.resultado.code, s.efeitos.handoff, s.efeitos.pedido, s.efeitos.proposta_upd, s.efeitos.falha.operacao], ['equipe_neste_turno', undefined, {}, { id: 'p1', estado: 'falhou' }, 'cancelar']);
  assert.equal(g.bvgSemRetransferir(fimEquipe, { retorno: 't1' }, 't2'), fimEquipe);
  assert.equal(g.bvgSemRetransferir(fimEquipe, {}, undefined), fimEquipe); // sem turno nao ha marca que valha
  const semEfeito = { final: { resultado: { ok: true }, efeitos: {} } };
  assert.equal(g.bvgSemRetransferir(semEfeito, { retorno: 't1' }, 't1'), semEfeito);
  console.log('graces.test.js retorno sem nova transferencia ok');
}

// ---- Fila da vez (26/11/2026): quando o sistema indica o barbeiro, vem primeiro quem ha mais tempo nao recebe um agendamento indicado ----
{
  const D = '2026-12-01', SV = { idServico: 's1', nome: 'corte adulto', preco: 85, minutos: 40, opcao_id: '1' };
  const cfgR = { ...cfg, rodizio: { ligado: true, janela_dias: 30 } }, cfgOff = { ...cfg, rodizio: { ligado: false, janela_dias: 30 } };
  const BS = ['K', 'B', 'P', 'R'].map((n) => ({ idProfissional: `id-${n}`, apelido: n }));
  const ped = (extra = {}) => ({ idCliente: 'c1', servico: SV, barbeiros: BS.map((b, k) => ({ opcao_id: String(k + 1), ...b })), qualquer_opcao: '5', ...extra });
  const HS = ['09:00', '09:40', '10:20', '11:00', '11:40'];
  const t = (n) => `2026-11-${String(n).padStart(2, '0')}T12:00:00.000Z`;
  // roda a busca de horarios; livres = { apelido: [horas] } (sem a chave, o barbeiro tem todas); devolve o resultado, os efeitos e a ordem consultada
  const busca = (o, ctx0, c = cfgR, livres = {}) => {
    const p = g.bvGPlano(entrada({ operacao: 'horarios_livres', data: D, ...o }), { opcoes: {}, pedido: ped(), ...ctx0 }, c);
    const ordem = p.reqs.filter((q) => q.path === '/agenda/horarios-livres').map((q) => q.qs.idProfissional.slice(3));
    const grade = (q) => (q.path === '/agenda/horarios' ? resp(500, {}) : ok({ minutos: 40, horarios: livres[q.qs.idProfissional.slice(3)] || HS }));
    const f = g.bvGPasso(p.st, p.reqs.map(grade), c).final;
    return { f, ordem, lista: f.efeitos.opcoes.itens.map((x) => `${x.valor.hora} ${x.valor.apelido}`), marcas: f.efeitos.opcoes.itens.map((x) => x.valor.indicado) };
  };

  // funcao da fila: sem historico, com historico, empate, desligado
  const ids = (bs) => bs.map((b) => b.apelido).join('');
  assert.equal(ids(g.bvgFila(BS, {})), 'KBPR'); // ninguem tem registro: a ordem recebida
  assert.equal(ids(g.bvgFila(BS, { 'id-K': t(20), 'id-P': t(18) })), 'BRPK'); // sem registro primeiro (B, R); depois o mais antigo (P) e o mais novo (K)
  assert.equal(ids(g.bvgFila(BS, { 'id-K': t(20), 'id-B': t(20), 'id-P': t(20), 'id-R': t(20) })), 'KBPR'); // empate: a ordem recebida
  assert.equal(ids(g.bvgFila(BS, { 'id-B': t(20), 'id-X': t(1) })), 'KPRB'); // registro de quem nao esta na lista nao muda nada
  assert.equal(ids(g.bvgFila(BS, { 'id-K': 'lixo', 'id-B': t(2) })), 'KPRB'); // data ilegivel vale como sem registro
  assert.equal(g.bvgFila(BS, null), BS); // desligado: a mesma lista, a ordem da Graces
  assert.equal(ids(BS), 'KBPR'); // a funcao nao muda a lista recebida

  // funcao da reparticao: em roda; quem nao tem o horario e pulado; o fixo (colado) ganha sem mexer na fila
  const cand = (livres) => (hh) => BS.filter((b) => (livres[b.apelido] || HS).includes(hh)).map((b) => ({ b }));
  const rep = (horas, livres, fila, fixo) => [...g.bvgRepartir(horas, cand(livres), fila, fixo).entries()].map(([hh, c]) => `${hh}${c.b.apelido}`).join(' ');
  assert.equal(rep(HS, {}, BS), '09:00K 09:40B 10:20P 11:00R 11:40K');
  assert.equal(rep(HS, { B: ['09:00', '11:00'] }, BS), '09:00K 09:40P 10:20R 11:00B 11:40K'); // B nao tem 09:40 nem 10:20: nao e sorteado nelas
  assert.equal(rep(HS, {}, [BS[1], BS[3], BS[0], BS[2]]), '09:00B 09:40R 10:20K 11:00P 11:40B');
  assert.equal(rep(HS, {}, null), '09:00K 09:40K 10:20K 11:00K 11:40K'); // desligado: o primeiro vence, como antes
  assert.equal(rep(HS, {}, BS, (hh) => (hh === '09:40' ? { b: BS[3] } : null)), '09:00K 09:40R 10:20B 11:00P 11:40R'); // o fixo (R as 09:40) nao gasta a vez dele: o R ainda e o proximo da fila no fim
  assert.equal(ids(BS), 'KBPR');

  // listar_barbeiros: a ordem da lista e a da fila; "Qualquer barbeiro" continua por ultimo; Jayme e o de teste nunca entram
  const lb = (rodizio, c = cfgR) => {
    const p = g.bvGPlano(entrada({ operacao: 'listar_barbeiros', id_opcao_servico: '1' }), { opcoes: { tipo: 'servico', itens: [{ id: '1', rotulo: 'corte', valor: SV }] }, pedido: {}, rodizio }, c);
    return g.bvGPasso(p.st, [ok([...BS, { idProfissional: TESTE, apelido: 'ZZ TESTE' }, { idProfissional: 'id-J', apelido: 'Jayme' }])], { ...c, humanos: [{ id: 'id-J', nome: 'Jayme' }] }).final;
  };
  assert.deepEqual(lb({}).resultado.barbeiros.map((b) => b.nome), ['K', 'B', 'P', 'R', 'Qualquer barbeiro']);
  assert.deepEqual(lb({ 'id-K': t(20), 'id-B': t(19) }).resultado.barbeiros.map((b) => b.nome), ['P', 'R', 'B', 'K', 'Qualquer barbeiro']);
  assert.deepEqual(lb({ 'id-K': t(20) }, cfgOff).resultado.barbeiros.map((b) => b.nome), ['K', 'B', 'P', 'R', 'Qualquer barbeiro']); // desligado: ordem da Graces
  assert.doesNotMatch(JSON.stringify(lb({ 'id-K': t(20) })), /Jayme|TESTE|indicado/);

  // horarios_livres com qualquer barbeiro: repartidos em roda, na ordem da fila; a ordem da consulta (e do corte de 10) tambem
  let x = busca({ qualquer: true }, { rodizio: {} });
  assert.deepEqual([x.ordem.join(''), x.lista], ['KBPR', ['09:00 K', '09:40 B', '10:20 P', '11:00 R', '11:40 K']]);
  assert.equal(x.f.resultado.quem_tem_horario, 'K a partir de 09:00; B a partir de 09:00; P a partir de 09:00; R a partir de 09:00');
  x = busca({ qualquer: true }, { rodizio: { 'id-K': t(20), 'id-P': t(18) } }); // fila: B, R, P, K
  assert.deepEqual([x.ordem.join(''), x.lista], ['BRPK', ['09:00 B', '09:40 R', '10:20 P', '11:00 K', '11:40 B']]);
  assert.deepEqual(x.f.resultado.por_barbeiro.map((b) => b.barbeiro), ['B', 'R', 'P', 'K']);
  assert.match(x.f.resultado.quem_tem_horario, /^B a partir de 09:00; R a partir/);
  x = busca({ qualquer: true }, { rodizio: { 'id-K': t(20) } }, cfgR, { B: ['09:00', '11:00'] }); // B so tem duas horas
  assert.deepEqual(x.lista, ['09:00 B', '09:40 P', '10:20 R', '11:00 K', '11:40 P']);
  // com a chave desligada: como antes (a ordem da Graces e o primeiro vence), mesmo com historico
  x = busca({ qualquer: true }, { rodizio: { 'id-K': t(20) } }, cfgOff);
  assert.deepEqual([x.ordem.join(''), x.lista.every((l) => l.endsWith(' K'))], ['KBPR', true]);
  x = busca({ qualquer: true }, {}, { ...cfg }); // config sem o bloco: tambem desligado
  assert.deepEqual([x.ordem.join(''), x.lista.every((l) => l.endsWith(' K'))], ['KBPR', true]);
  // valor que nao e objeto vale vazio
  for (const lixo of ['x', 7, [1], null]) assert.equal(busca({ qualquer: true }, { rodizio: lixo }).lista[1], '09:40 B');
  // horario colado: o barbeiro do agendamento que o cliente ja tem ganha o horario, sem gastar a vez de ninguem e sem marca
  const colado = { idAgenda: 'a1', idServico: 's9', horaInicio: `${D}T09:40:00`, servico: 'barba', fim: '10:20', idProfissional: 'id-R' };
  x = busca({ qualquer: true }, { rodizio: {}, pedido: ped({ futuros: [colado] }) });
  assert.deepEqual(x.lista, ['09:00 R', '09:40 K', '10:20 R', '11:00 B', '11:40 P']); // 09:00 (termina onde a barba comeca) e 10:20 (comeca onde ela termina) sao do R; o resto segue a roda, sem o R ter gasto a vez
  assert.deepEqual(x.marcas, [undefined, true, undefined, true, true]);

  // marca `indicado`: so quando o sistema escolheu o barbeiro
  x = busca({ qualquer: true }, { rodizio: {} });
  assert.deepEqual(x.marcas, [true, true, true, true, true]);
  x = busca({ qualquer: true }, { rodizio: {} }, cfgOff); // a marca nao depende da chave: o historico ja existe quando ela liga
  assert.ok(x.marcas.every((m) => m === true));
  x = busca({ id_opcao_barbeiro: '2' }, { rodizio: {} }); // o cliente pediu o B
  assert.deepEqual([x.ordem.join(''), x.marcas.every((m) => m === undefined), x.lista[0]], ['B', true, '09:00 B']);
  x = busca({}, { rodizio: {}, pedido: ped({ barbeiro: BS[2] }) }); // o da conversa
  assert.deepEqual([x.ordem.join(''), x.marcas.every((m) => m === undefined)], ['P', true]);
  const habitual = { ...ped({ barbeiros: undefined, servico: undefined }), ultimo: { servico: SV, barbeiro: BS[3] } }; // o habitual (ultimo atendimento)
  x = busca({ id_opcao_servico: '1' }, { rodizio: {}, pedido: habitual, opcoes: { tipo: 'servico', itens: [{ id: '1', rotulo: 'corte', valor: SV }] } });
  assert.deepEqual([x.ordem.join(''), x.marcas.every((m) => m === undefined)], ['R', true]);
  // habitual sem horario: o passo mostra os outros por indicacao (a marca vale, a fila tambem)
  let ph = g.bvGPlano(entrada({ operacao: 'horarios_livres', data: D, id_opcao_servico: '1' }), { opcoes: { tipo: 'servico', itens: [{ id: '1', rotulo: 'corte', valor: SV }] }, pedido: habitual, rodizio: { 'id-K': t(20) } }, cfgR);
  let sh = g.bvGPasso(ph.st, [ok({ minutos: 40, horarios: [] }), resp(500, {})], cfgR);
  assert.equal(sh.reqs[0].path, '/servicos/profissionais');
  sh = g.bvGPasso(sh.st, [ok(BS)], cfgR);
  assert.equal(sh.reqs.filter((q) => q.path === '/agenda/horarios-livres').map((q) => q.qs.idProfissional.slice(3)).join(''), 'BPK'); // sem o habitual (R); K, o ultimo da fila, por ultimo
  // remarcacao: no mesmo barbeiro nao ha marca; com qualquer barbeiro ha
  const ag = { opcao_id: '1', idAgenda: 'ag1', horaInicio: `${D}T15:00:00`, idServico: 's1', servico: 'corte adulto', idProfissional: 'id-B', profissional: 'B' };
  let pr = g.bvGPlano(entrada({ operacao: 'horarios_livres', data: D, id_opcao_agendamento: '1' }), { opcoes: {}, pedido: ped({ agendamentos: [ag] }), rodizio: {} }, cfgR);
  let fr = g.bvGPasso(pr.st, [ok({ minutos: 40, horarios: HS }), resp(500, {})], cfgR).final;
  assert.ok(fr.efeitos.opcoes.itens.every((y) => y.valor.idProfissional === 'id-B' && y.valor.indicado === undefined));
  pr = g.bvGPlano(entrada({ operacao: 'horarios_livres', data: D, id_opcao_agendamento: '1', qualquer: true }), { opcoes: {}, pedido: ped({ agendamentos: [ag] }), rodizio: { 'id-K': t(20) } }, cfgR);
  assert.equal(pr.st.meta.etapa, 'ag_prof');
  let sr = g.bvGPasso(pr.st, [ok(BS)], cfgR);
  assert.equal(sr.reqs.filter((q) => q.path === '/agenda/horarios-livres').map((q) => q.qs.idProfissional.slice(3)).join(''), 'BPRK'); // a fila vale antes do corte de 10
  fr = g.bvGPasso(sr.st, sr.reqs.map((q) => (q.path === '/agenda/horarios' ? resp(500, {}) : ok({ minutos: 40, horarios: HS }))), cfgR).final;
  assert.ok(fr.efeitos.opcoes.itens.every((y) => y.valor.indicado === true));
  assert.equal(fr.efeitos.opcoes.itens[0].valor.apelido, 'B');

  // a marca chega a propostas.dados (agendar, remarcar) e nunca ao modelo nem ao cliente
  x = busca({ qualquer: true }, { rodizio: {} });
  const ctxF = (extra = {}) => ({ opcoes: x.f.efeitos.opcoes, pedido: { ...ped(), ...x.f.efeitos.pedido, ...extra } });
  const ag1 = g.bvGPlano(entrada({ operacao: 'agendar', id_opcao_horario: '2', turno_id: T1 }), ctxF(), cfgR);
  const prop = semPacote(ag1).final.efeitos.proposta_nova;
  assert.deepEqual([prop.acao, prop.dados.idProfissional, prop.dados.indicado], ['agendar', 'id-B', true]);
  assert.equal(JSON.parse(g.bvGParams(base, semPacote(ag1).final.efeitos)[5]).indicado, true); // o que o Persistir grava em propostas.dados
  const aoModelo = JSON.stringify([x.f.resultado, semPacote(ag1).final.resultado]);
  assert.doesNotMatch(aoModelo, /indicado/);
  assert.doesNotMatch(JSON.stringify(x.f.efeitos.opcoes.itens.map((y) => y.rotulo)), /indicado/); // o que o cliente le na lista
  assert.ok(g.bvGParams(base, { opcoes: x.f.efeitos.opcoes })[1].includes('indicado')); // so a oferta guardada, que ninguem le, a leva
  const re = g.bvGPlano(entrada({ operacao: 'reagendar', id_opcao_agendamento: '1', id_opcao_horario: '2', turno_id: T1 }), { opcoes: fr.efeitos.opcoes, pedido: { ...ped({ agendamentos: [ag] }), ...fr.efeitos.pedido } }, { ...cfgR, ambiente: 'producao', redirecionar: false, escritaLiberada: true }); // PROD liberada: a agenda real de todos (no TESTE a escrita so vai ao barbeiro de teste)
  assert.deepEqual([re.final.efeitos.proposta_nova.acao, re.final.efeitos.proposta_nova.dados.indicado], ['reagendar', true]);
  // pedido pelo cliente: o agendamento sai sem a marca
  const xp = busca({ id_opcao_barbeiro: '2' }, { rodizio: {} });
  const pp = semPacote(g.bvGPlano(entrada({ operacao: 'agendar', id_opcao_horario: '1', turno_id: T1 }), { opcoes: xp.f.efeitos.opcoes, pedido: { ...ped(), ...xp.f.efeitos.pedido } }, cfgR)).final.efeitos.proposta_nova;
  assert.deepEqual(['indicado' in pp.dados, pp.dados.idProfissional], [false, 'id-B']);

  // de ponta a ponta: depois de uma proposta executada e indicada para o primeiro da fila, a lista seguinte comeca pelo segundo
  // (o Contexto devolve, por barbeiro, o instante da ultima proposta executada com item indicado: aqui, o que o agendamento gravou)
  const contexto = (propostas) => Object.fromEntries(propostas.filter((q) => q.dados.indicado).map((q) => [q.dados.idProfissional, q.em]));
  const gravadas = [];
  for (const rodada of [1, 2, 3, 4, 5]) {
    const lst = busca({ qualquer: true }, { rodizio: contexto(gravadas) });
    assert.equal(lst.ordem[0], 'KBPR'[(rodada - 1) % 4], `rodada ${rodada}`); // K, B, P, R, K
    assert.equal(lst.lista[0].split(' ')[1], 'KBPR'[(rodada - 1) % 4]);
    const a = semPacote(g.bvGPlano(entrada({ operacao: 'agendar', id_opcao_horario: '1', turno_id: T1 }), { opcoes: lst.f.efeitos.opcoes, pedido: { ...ped(), ...lst.f.efeitos.pedido } }, cfgR)).final.efeitos.proposta_nova;
    gravadas.push({ dados: a.dados, em: t(10 + rodada) }); // executada em t(10 + rodada)
  }
  // um barbeiro pedido pelo cliente nao gasta a vez dele
  const pedidoB = semPacote(g.bvGPlano(entrada({ operacao: 'agendar', id_opcao_horario: '1', turno_id: T1 }), { opcoes: xp.f.efeitos.opcoes, pedido: { ...ped(), ...xp.f.efeitos.pedido } }, cfgR)).final.efeitos.proposta_nova;
  assert.equal(busca({ qualquer: true }, { rodizio: contexto([{ dados: pedidoB.dados, em: t(25) }]) }).ordem.join(''), 'KBPR');

  // sequencia (dois servicos, mesmo barbeiro): candidatos na ordem da fila; o escolhido segue primeiro; so os do sistema levam a marca
  const ofS = { tipo: 'servico', itens: [{ id: '1', rotulo: 'corte', valor: { idServico: 's1', nome: 'corte adulto', preco: 85, minutos: 40 } }, { id: '2', rotulo: 'barba', valor: { idServico: 's2', nome: 'barba', preco: 40, minutos: 30 } }] };
  const seq = (o, rodizio, c = cfgR, ctxP = {}) => {
    const p = g.bvGPlano(entrada({ operacao: 'horarios_livres', id_opcoes_servicos: ['1', '2'], data: D, ...o }), { opcoes: ofS, pedido: { idCliente: 'c1', ...ctxP }, rodizio }, c);
    let y = g.bvGPasso(p.st, [ok(BS), ok(BS)], c);
    const consultados = [];
    while (y.reqs) {
      consultados.push(...new Set(y.reqs.map((q) => q.qs.idProfissional.slice(3))));
      y = g.bvGPasso(y.st, y.reqs.map((q) => (q.path === '/agenda/horarios' ? ok({ horarios: [] }) : q.qs.idServico === 's1' ? ok({ minutos: 40, horarios: ['09:00'] }) : ok({ minutos: 30, horarios: ['09:40'] }))), c);
    }
    return { f: y.final, consultados: consultados.join(''), lista: y.final.resultado.opcoes.map((q) => `${q.hora} ${q.barbeiro}`), itens: y.final.efeitos.opcoes.itens.map((q) => q.valor.itens) };
  };
  let sq = seq({}, { 'id-K': t(20) });
  assert.deepEqual([sq.consultados, sq.lista], ['BPRK', ['09:00 B', '09:00 P', '09:00 R', '09:00 K']]);
  assert.ok(sq.itens.every((its) => its.every((it) => it.indicado === true)));
  sq = seq({}, { 'id-K': t(20) }, { ...cfgR, graces: { max_consultas_estagio: 9 } }); // teto de 3 barbeiros por estagio: o corte cai depois da fila
  assert.equal(sq.consultados.slice(0, 3), 'BPR');
  assert.deepEqual(seq({}, {}, cfgOff).lista.map((l) => l.split(' ')[1]).join(''), 'KBPR');
  sq = seq({ id_opcao_barbeiro: '4' }, { 'id-R': t(20) }, cfgR, { barbeiros: ped().barbeiros }); // o cliente escolheu o R: segue primeiro, sem marca; os outros ficam na fila
  assert.equal(sq.consultados[0], 'R');
  assert.ok(sq.itens.filter((its) => its[0].idProfissional === 'id-R').every((its) => its.every((it) => it.indicado === undefined)));
  // barbeiros diferentes por servico: o primeiro da fila que cabe
  const dif = (rodizio, c = cfgR) => {
    const st0 = { in: entrada({ operacao: 'horarios_livres', id_opcoes_servicos: ['1', '2'], data: D }), ctx: { pedido: {}, opcoes: {}, dia: {}, rodizio: c.rodizio.ligado ? rodizio : null /* o que bvGPlano poe no ctx */ }, meta: { op: 'horarios_livres', enc: true, etapa: 'dif_prof', servicos: [{ idServico: 's1', nome: 'corte adulto', preco: 85, opcao_id: '1' }, { idServico: 's2', nome: 'barba', preco: 40, opcao_id: '2' }], data: D } };
    const a = g.bvGPasso(st0, [ok(BS), ok(BS)], c);
    return g.bvGPasso(a.st, a.reqs.map((q) => (q.path === '/agenda/horarios' ? ok({ horarios: [] }) : q.qs.idServico === 's1' ? ok({ minutos: 40, horarios: ['09:00'] }) : ok({ minutos: 30, horarios: ['09:40'] }))), c);
  };
  assert.equal(dif({ 'id-K': t(20) }).final.efeitos.opcoes.itens[0].valor.itens.map((q) => q.apelido).join(''), 'BB');
  assert.equal(dif({ 'id-K': t(20) }, cfgOff).final.efeitos.opcoes.itens[0].valor.itens.map((q) => q.apelido).join(''), 'KK');
  assert.ok(dif({}).final.efeitos.opcoes.itens[0].valor.itens.every((q) => q.indicado === true));

  // reoferta (horario tomado na revalidacao): a oferta refeita do mesmo barbeiro guarda a marca; a proposta nova sai com ela
  for (const indicado of [true, false]) {
    const dados = { idCliente: 'c1', idServico: 's1', servico: 'corte adulto', idProfissional: 'id-B', barbeiro: 'B', data: D, hora: '09:40', valor: 85, minutos: 40, ...(indicado ? { indicado } : {}) };
    const PID = '33333333-3333-4333-8333-333333333333';
    const f2 = g.bvGPlano(entrada({ operacao: 'agendar', proposta_id: PID, turno_id: T2 }), { opcoes: {}, pedido: { idCliente: 'c1' }, proposta: { id: PID, acao: 'agendar', dados } }, cfgR);
    const rv = g.bvGPasso(f2.st, [ok({ minutos: 40, horarios: ['10:20', '11:00'] }), ok([]), resp(500, {})], cfgR).final; // 09:40 foi tomado
    assert.equal(rv.resultado.code, 'horario_indisponivel');
    assert.deepEqual(rv.efeitos.opcoes.itens.map((y) => y.valor.indicado), [indicado || undefined, indicado || undefined]);
    const nova = semPacote(g.bvGPlano(entrada({ operacao: 'agendar', id_opcao_horario: '2', turno_id: T1 }), { opcoes: rv.efeitos.opcoes, pedido: { ...ped() } }, cfgR)).final.efeitos.proposta_nova;
    assert.deepEqual([nova.dados.idProfissional, nova.dados.hora, nova.dados.indicado], ['id-B', '11:00', indicado || undefined]);
  }

  // clausula petrea: o Jayme e o barbeiro de teste nao entram na fila nem com historico (filtrados antes de ordenar)
  const hum = [{ id: 'id-J', nome: 'Jayme' }];
  const pj = g.bvGPlano(entrada({ operacao: 'horarios_livres', qualquer: true, data: D }), { opcoes: {}, pedido: ped({ barbeiros: [...ped().barbeiros, { opcao_id: '9', idProfissional: 'id-J', apelido: 'Jayme' }, { opcao_id: '8', idProfissional: TESTE, apelido: 'ZZ TESTE' }] }), rodizio: { 'id-K': t(20) } }, { ...cfgR, humanos: hum });
  assert.deepEqual(pj.reqs.filter((q) => q.path === '/agenda/horarios-livres').map((q) => q.qs.idProfissional.slice(3)), ['B', 'P', 'R', 'K']);
  console.log('graces.test.js fila da vez ok');
}

// Barbeiro habitual pelos ultimos atendimentos (owner, 2026-11-26): vence quem mais atendeu nas ultimas N visitas; empate, o mais recente.
{
  const S = '046519b1-e111-44b4-8779-3e64366f9d8f', S2 = '22222222-2222-4222-8222-222222222222', JAY = 'b623cd84-6068-4a57-9ce6-2f7d9a37a11e';
  const cj = { ...cfg, humanos: [{ id: JAY, nome: 'Jayme' }] };
  const ped = { idCliente: 'c1', cliente_sem_cadastro: false, cliente_nome: 'Ana', identificado: true };
  const NOMES = { P: 'Pedro', B: 'Black', K: 'Kiel', R: 'Rodrigo', J: 'jayme ', T: 'ZZ TESTE' }, IDS = { P: 'bp', B: 'bb', K: 'bk', R: 'br', J: JAY, T: TESTE };
  // visita: dia (idComanda propria) e uma letra de barbeiro por servico; as visitas vao da mais recente para a mais antiga
  const vis = (dia, ...bs) => bs.map((b) => ({ idServico: S, descricaoServico: 'corte adulto', idComanda: `k${dia}`, dataAbertura: `2026-11-${String(dia).padStart(2, '0')}T14:00:00`, idProfissional: IDS[b], profissional: NOMES[b] }));
  const catalogo = ok([{ idServico: S, descricaoAgenda: 'corte adulto', valorPadrao: 85, tempoPadrao: 40, ativo: true }]);
  const quem = (letras) => ok(letras.split('').map((b) => ({ idProfissional: IDS[b], apelido: NOMES[b].trim() })));
  // le o historico e, se houver, o catalogo (faz o servico: `faz`); devolve o `ultimo` do pedido
  const rodar = (linhas, faz = 'PBKR', c = cj) => {
    const h = g.bvGPasso({ in: entrada({ operacao: 'identificar_cliente' }), ctx: { pedido: {}, opcoes: {} }, meta: { op: 'identificar_cliente', etapa: 'hist', ped } }, [ok(linhas), ok([])], c);
    return (h.reqs ? g.bvGPasso(h.st, [catalogo, quem(faz)], c).final : h.final).efeitos.pedido.ultimo;
  };
  const barb = (u) => (u.barbeiro ? u.barbeiro.apelido : null);
  const hist = (...v) => v.flat();
  // o exemplo do dono: quatro com o Pedro e a mais recente com o Black -> Pedro
  assert.equal(barb(rodar(hist(vis(20, 'B'), vis(15, 'P'), vis(10, 'P'), vis(5, 'P'), vis(1, 'P')))), 'Pedro');
  // 2, 2, 1: empate entre Black e Pedro, vence quem atendeu mais recentemente
  assert.equal(barb(rodar(hist(vis(20, 'B'), vis(15, 'P'), vis(10, 'B'), vis(5, 'P'), vis(1, 'K')))), 'Black');
  assert.equal(barb(rodar(hist(vis(20, 'P'), vis(15, 'B'), vis(10, 'B'), vis(5, 'P'), vis(1, 'K')))), 'Pedro');
  // so as 5 mais recentes contam: a sexta (Kiel, 3 vezes antigas) nao entra
  assert.equal(barb(rodar(hist(vis(20, 'P'), vis(19, 'B'), vis(18, 'B'), vis(17, 'P'), vis(16, 'P'), vis(3, 'K'), vis(2, 'K'), vis(1, 'K')))), 'Pedro');
  // menos de 5 visitas: a maioria do que houver; uma so: o barbeiro dela, como antes
  assert.equal(barb(rodar(hist(vis(20, 'B'), vis(15, 'P'), vis(10, 'P')))), 'Pedro');
  assert.deepEqual(rodar(vis(20, 'K')), { servico: { idServico: S, nome: 'corte adulto', preco: 85, minutos: 40, opcao_id: 'ult' }, barbeiro: { idProfissional: 'bk', apelido: 'Kiel' } }); // formato de sempre
  // dois servicos do mesmo barbeiro na mesma visita contam uma vez (Pedro 1 visita com 2 linhas, Black 2 visitas)
  assert.equal(barb(rodar(hist(vis(20, 'P', 'P'), vis(15, 'B'), vis(10, 'B')), 'PB')), 'Black');
  // visita com dois barbeiros conta para os dois (e o empate vai para o primeiro da visita mais recente)
  assert.equal(barb(rodar(hist(vis(20, 'B', 'P'), vis(15, 'P'), vis(10, 'K')), 'PB')), 'Pedro');
  // o vencedor nao faz o servico (ou nao esta na lista dele) -> o seguinte do ranking
  assert.equal(barb(rodar(hist(vis(20, 'B'), vis(15, 'P'), vis(10, 'P')), 'BK')), 'Black');
  // o vencedor e o de teste -> o seguinte (cliente comum nunca recebe o de teste)
  assert.equal(barb(rodar(hist(vis(20, 'B'), vis(15, 'T'), vis(10, 'T')), 'TBP')), 'Black');
  // ninguem do ranking serve -> sem habitual, o servico segue (o agente pergunta o barbeiro)
  assert.deepEqual(rodar(hist(vis(20, 'B'), vis(15, 'P')), 'KR').barbeiro, null);
  assert.equal(rodar(hist(vis(20, 'B'), vis(15, 'P')), 'KR').servico.nome, 'corte adulto');
  // clausula petrea: a ultima visita com o Jayme -> equipe, mesmo com outro barbeiro nas demais (como hoje)
  assert.deepEqual(rodar(hist(vis(20, 'J'), vis(15, 'P'), vis(10, 'P'), vis(5, 'P'))), { humano: 'Jayme' });
  // o Jayme e o mais frequente e a ultima foi com outro -> equipe (so aumenta as transferencias)
  assert.deepEqual(rodar(hist(vis(20, 'P'), vis(15, 'J'), vis(10, 'J'), vis(5, 'J'), vis(1, 'P'))), { humano: 'Jayme' });
  // o Jayme numa visita antiga, nem o mais frequente nem o ultimo -> nao transfere e nunca e proposto
  assert.equal(barb(rodar(hist(vis(20, 'P'), vis(15, 'P'), vis(10, 'J'), vis(5, 'B'), vis(1, 'K')), 'PJB')), 'Pedro');
  assert.equal(barb(rodar(hist(vis(20, 'P'), vis(15, 'P'), vis(10, 'B'), vis(5, 'J'), vis(1, 'K')), 'JBK')), 'Black'); // o Pedro nao faz: segue o ranking, sem o Jayme no meio
  // visitas: 1 (e valor invalido -> 5) reproduz o de hoje: so a ultima visita decide
  const c1 = { ...cj, habitual: { visitas: 1 } };
  assert.equal(barb(rodar(hist(vis(20, 'B'), vis(15, 'P'), vis(10, 'P'), vis(5, 'P')), 'PB', c1)), 'Black');
  assert.deepEqual(rodar(hist(vis(20, 'P'), vis(15, 'J'), vis(10, 'J')), 'PB', c1).barbeiro.apelido, 'Pedro'); // o Jayme frequente, mas a ultima foi com outro: com 1 visita nao transfere
  for (const lixo of [0, 21, 'x', null, -3]) assert.equal(barb(rodar(hist(vis(20, 'B'), vis(15, 'P'), vis(10, 'P')), 'PB', { ...cj, habitual: { visitas: lixo } })), 'Pedro');
  // pageSize: 10 por visita, ate 200
  const pg = (c) => g.bvGPasso(g.bvGPlano(entrada({ operacao: 'identificar_cliente' }), null, c).st, [ok([{ idCliente: 'c1', nomeCliente: 'Ana' }])], c).reqs[0].qs.pageSize;
  assert.deepEqual([pg(cj), pg(c1), pg({ ...cj, habitual: { visitas: 20 } }), pg({ ...cj, habitual: { visitas: 99 } })], [50, 10, 200, 50]);
  // linhas sem idProfissional ou com servico invalido sao ignoradas, sem quebrar
  const lixo = [{ idServico: 'x', idProfissional: 'bb', profissional: 'Black', dataAbertura: '2026-11-25T10:00:00' }, { descricaoServico: 'sem id', dataAbertura: '2026-11-24T10:00:00' }, null, 7];
  assert.equal(barb(rodar(hist(lixo, vis(20, 'P'), [{ ...vis(15, 'B')[0], idProfissional: undefined }], vis(10, 'P')), 'PB')), 'Pedro');
  assert.equal(rodar(lixo), null);
  // o barbeiro habitual nao anda a fila: nenhuma marca no ultimo
  assert.ok(!('indicado' in rodar(hist(vis(20, 'B'), vis(15, 'P'), vis(10, 'P')), 'PB').barbeiro));
  // clausula petrea, lado conservador (na duvida, transfere)
  const semId = (v) => v.map((x) => ({ ...x, idProfissional: undefined }));
  const comDois = (dia, a, b) => [...vis(dia, a), ...vis(dia, b)]; // um servico de cada barbeiro, mesma visita
  assert.deepEqual(rodar(hist(comDois(20, 'P', 'J'), vis(15, 'P'))), { humano: 'Jayme' }); // ultima visita com dois servicos, um do Jayme
  assert.deepEqual(rodar(hist([...semId(vis(20, 'P')), ...vis(20, 'J')], vis(15, 'P'))), { humano: 'Jayme' }); // uma linha sem id e outra do Jayme
  assert.deepEqual(rodar(hist(semId(vis(20, 'P')), vis(15, 'J'))), { humano: 'Jayme' }); // visita mais recente sem barbeiro conhecido, a anterior do Jayme
  assert.deepEqual(rodar(hist(vis(20, 'P'), semId(vis(15, 'J')), semId(vis(10, 'J')), semId(vis(5, 'J')), vis(1, 'B'))), { humano: 'Jayme' }); // Jayme so pelo nome em 3 de 5
  assert.deepEqual(rodar(hist(vis(20, 'P'), vis(15, 'J'), vis(10, 'P'), vis(5, 'J'), vis(1, 'K'))), { humano: 'Jayme' }); // 2 a 2 no topo: o Pedro e mais recente, mas o Jayme empata
  assert.equal(barb(rodar(hist(vis(20, 'P'), vis(15, 'J'), vis(10, 'P'), vis(5, 'B'), vis(1, 'K')))), 'Pedro'); // Jayme com 1 contra 2: nao empata no topo
  for (const l of [rodar(hist(vis(20, 'P'), semId(vis(15, 'J'))), 'PB'), rodar(hist(vis(20, 'P'), vis(15, 'J'), vis(10, 'J')), 'PBJ')]) assert.ok(!l.barbeiro || l.barbeiro.apelido !== 'jayme'); // nunca sai em ultimo.barbeiro
  // data ausente ou estranha e linhas fora de ordem nao quebram
  const sd = (v) => v.map((x) => ({ ...x, dataAbertura: undefined })), est = (v) => v.map((x) => ({ ...x, dataAbertura: 'ontem?' }));
  assert.equal(barb(rodar(hist(sd(vis(20, 'P')), est(vis(15, 'P')), vis(10, 'B')), 'PB')), 'Pedro');
  assert.equal(barb(rodar(hist(vis(5, 'P'), vis(20, 'B'), vis(10, 'P')), 'PB')), 'Pedro');
  assert.ok(rodar(hist(sd(vis(20, 'P')).map((x) => ({ ...x, idComanda: undefined })), est(vis(15, 'B'))), 'PB').servico);
  console.log('graces.test.js habitual ok');
}

// Convite de volta (owner, 2026-11-27): cadastro pelo celular e decisao com o historico, os proximos e os pacotes
{
  const assert = require('assert');
  const U = (n) => `${String(n).padStart(8, '0')}-0000-4000-8000-000000000000`;
  const ok = (body) => ({ status: 200, body });
  assert.deepEqual(g.bvgConviteCliente(ok([{ idCliente: U(1), nomeCliente: 'x' }])), { idCliente: U(1) });
  assert.deepEqual(g.bvgConviteCliente(ok([{ idCliente: U(1) }, { idCliente: U(1) }])), { idCliente: U(1) }); // a mesma pessoa duas vezes
  assert.deepEqual(g.bvgConviteCliente(ok([{ idCliente: U(1) }, { idCliente: U(2) }])), { motivo: 'varios_cadastros' });
  assert.deepEqual(g.bvgConviteCliente(ok([])), { motivo: 'sem_cadastro' });
  for (const r of [null, { status: 500, body: [] }, { status: 200, body: 'x' }]) assert.deepEqual(g.bvgConviteCliente(r), { motivo: 'graces_falhou' });
  assert.deepEqual(g.bvgConviteReqs(U(1)).map((r) => [r.m, r.path, r.qs.idCliente, !!r.qs.proximos]), [['GET', '/agenda/historico', U(1), false], ['GET', '/agenda/agendamentos', U(1), true], ['GET', '/agenda/pacotes', U(1), false]]);
  const c = { dias_min: 25, dias_max: 28 }, hoje = '2026-12-10';
  const h = (...ds) => ok(ds.map((d) => ({ dataAbertura: `${d}T14:00:00`, idServico: 's' })));
  const pac = ok([{ dataValidade: null, secoes: [{ idClienteItemPacote: U(11), idProdutoServico: 'a' }, { idClienteItemPacote: U(12), idProdutoServico: 'b' }] },
    { dataValidade: '2027-01-01T00:00:00', secoes: [{ idClienteItemPacote: U(13), idProdutoServico: 'a' }, { idClienteItemPacote: U(13), idProdutoServico: 'a' }, { idClienteItemPacote: 'lixo' }] },
    { dataValidade: '2026-12-01T00:00:00', secoes: [{ idClienteItemPacote: U(14), idProdutoServico: 'a' }] }]);
  // a ultima visita e a MAIOR dataAbertura, em qualquer ordem; 25 a 30 dias envia; sessoes somam os pacotes validos, sem repetir
  assert.deepEqual(g.bvgConvite([h('2026-10-01', '2026-11-14', '2026-09-01'), ok([]), pac], c, hoje), { enviar: true, dias: 26, sessoes: 3 });
  assert.deepEqual(g.bvgConvite([h('2026-11-15'), ok([]), ok([])], c, hoje), { enviar: true, dias: 25, sessoes: 0 });
  assert.equal(g.bvgConvite([h('2026-11-10'), ok([]), ok([])], c, hoje).enviar, true); // 30 dias: ainda "quase um mes"
  // pacote que nao deu para ler: envia sem a frase do pacote
  assert.deepEqual(g.bvgConvite([h('2026-11-14'), ok([]), { status: 500, body: null }], c, hoje), { enviar: true, dias: 26, sessoes: 0 });
  // nao envia: tem horario marcado; voltou depois; visita antiga (o agendamento da base foi falta); nunca veio; leitura falhou
  assert.deepEqual(g.bvgConvite([h('2026-11-14'), ok([{ idAgenda: 'a1' }]), pac], c, hoje), { enviar: false, motivo: 'tem_horario' });
  assert.deepEqual(g.bvgConvite([h('2026-11-14', '2026-12-02'), ok([]), pac], c, hoje), { enviar: false, motivo: 'voltou' });
  assert.deepEqual(g.bvgConvite([h('2026-11-09'), ok([]), pac], c, hoje), { enviar: false, motivo: 'visita_antiga' });
  assert.deepEqual(g.bvgConvite([ok([{ dataAbertura: null }]), ok([]), pac], c, hoje), { enviar: false, motivo: 'sem_visita' });
  assert.deepEqual(g.bvgConvite([{ status: 0 }, ok([]), pac], c, hoje), { enviar: false, motivo: 'graces_falhou' });
  assert.deepEqual(g.bvgConvite([h('2026-11-14'), { status: 500 }, pac], c, hoje), { enviar: false, motivo: 'graces_falhou' });
  assert.deepEqual(g.bvgConvite(null, c, hoje), { enviar: false, motivo: 'graces_falhou' });
  // bvgSecoes com servico continua como era (so as secoes daquele servico)
  assert.deepEqual(g.bvgSecoes(pac, 'a', hoje), [U(11), U(13)]);
  assert.deepEqual(g.bvgSecoes(pac, undefined, hoje), []); // so null abre para qualquer servico: item sem idServico nao consome secao alheia
  assert.equal(g.bvgSecoes(pac, null, hoje).length, 3);
  console.log('graces.test.js convite de volta ok');
}

{ // Remarcar depois de recusar o lembrete (PROD, 27/11): o agendamento recusado sai do que a conversa ja leu, sem meus_agendamentos
  const JAY = 'b623cd84-6068-4a57-9ce6-2f7d9a37a11e', PR = '44444444-4444-4444-8444-444444444444';
  const c = { ...cfg, ambiente: 'producao', redirecionar: false, escritaLiberada: true, testeLiberado: false, humanos: [{ id: JAY, nome: 'Jayme' }], recusaJanelaMin: 120 };
  const AGORA = Date.parse('2026-11-27T14:30:00Z'); // o relogio vem do no Planejar (ctx.agora_ms)
  // serie de sabado (o mesmo idAgenda em toda ocorrencia) e um avulso em outro dia; os futuros nao levam o nome do barbeiro
  const fut = (id, ini, prof = 'b1', extra = {}) => ({ idAgenda: id, idServico: 's1', horaInicio: ini, servico: 'corte adulto', idProfissional: prof, ...extra });
  const futuros = [fut('serie', '2026-11-28T11:20:00', 'b1', { recorrente: true }), fut('serie', '2026-12-05T11:20:00', 'b1', { recorrente: true }), fut('outro', '2026-12-05T12:00:00')];
  // o que o Registrar do bv-confirmacao grava, da linha do lembrete
  const rec = { idAgenda: 'serie', inicio: '2026-11-28T11:20:00', servico: 'corte adulto', barbeiro: 'Pedro Henrique ', idProfissional: 'b1', idCliente: 'c1', em: '2026-11-27T14:22:00Z' };
  // cliente como a identificacao o deixa: com o servico e o barbeiro de costume (sem eles a busca so com a data nem rodava e escondia o desvio)
  const ped = (extra = {}) => ({ idCliente: 'c1', cliente_nome: 'Paulo', identificado: true, futuros, confirmacao_recusada: rec,
    ultimo: { servico: { idServico: 's1', nome: 'corte adulto', preco: 70, minutos: 40, opcao_id: 'ult' }, barbeiro: { idProfissional: 'b7', apelido: 'Black' } }, ...extra });
  const hora = (prof = 'b1', apelido = 'Pedro Henrique', sv = 's1') => ({ tipo: 'horario', itens: [{ id: '9', rotulo: '20:00', valor: { data: '2026-11-30', hora: '20:00', idProfissional: prof, apelido, idServico: sv, servico: 'corte adulto', minutos: 40 } }] });
  const plano = (o, pedido, opcoes = {}, agora = AGORA) => g.bvGPlano(entrada(o), { opcoes, pedido, agora_ms: agora }, c);
  const busca = (pedido, extra = {}, agora = AGORA) => plano({ operacao: 'horarios_livres', data: '2026-11-30', ...extra }, pedido, {}, agora);
  const reag = (pedido, opcoes = hora(), extra = {}, agora = AGORA) => plano({ operacao: 'reagendar', id_opcao_horario: '9', ...extra }, pedido, opcoes, agora).final;
  const canc = (pedido, id = 'rec') => plano({ operacao: 'cancelar', id_opcao_agendamento: id }, pedido).final;
  const grade = [ok({ minutos: 40, horarios: ['18:00', '20:00'] })];
  const doRecusado = (p) => assert.deepEqual(p.reqs.map((q) => [q.path, q.qs.idServico, q.qs.idProfissional]), [['/agenda/horarios-livres', 's1', 'b1'], ['/agenda/horarios', 's1', 'b1']]);
  const deCostume = (p) => assert.deepEqual([p.reqs[0].qs.idProfissional, /\|rec\|/.test(g.bvGPasso(p.st, grade, c).final.efeitos.pedido.busca.chave)], ['b7', false]);

  // busca so com a data: remarcacao do agendamento recusado, com o barbeiro DELE (nao o de costume), sem ler a agenda do cliente de novo
  let p = busca(ped());
  doRecusado(p);
  let f = g.bvGPasso(p.st, grade, c).final;
  assert.deepEqual(f.resultado.opcoes.map((o) => [o.hora, o.barbeiro]), [['18:00', 'Pedro Henrique'], ['20:00', 'Pedro Henrique']]);
  assert.equal(f.efeitos.pedido.barbeiro_ag, 'serie');
  assert.match(f.efeitos.pedido.busca.chave, /\|rec\|/);
  // hora pedida e livre: a orientacao ja manda o reagendar com o id `rec`
  f = g.bvGPasso(busca(ped(), { hora: '20:00' }).st, grade, c).final;
  assert.match(f.resultado.orientacao, /chame reagendar com id_opcao_agendamento rec e id_opcao_horario \d+/);

  // Agendamento NOVO na mesma conversa: recusou o corte e escolheu barba com outro barbeiro. A busca so com a data continua da barba
  // e nao grava o corte por cima da escolha; com o `rec` informado, ou com o servico escolhido igual ao do recusado, e remarcacao.
  const barba = { servico: { idServico: 's2', nome: 'barba', minutos: 20, opcao_id: 's5' }, barbeiro: { idProfissional: 'b2', apelido: 'Kiel' } };
  p = busca(ped(barba));
  assert.deepEqual([p.reqs[0].qs.idServico, p.reqs[0].qs.idProfissional], ['s2', 'b2']);
  f = g.bvGPasso(p.st, [ok({ minutos: 20, horarios: ['18:00'] })], c).final;
  assert.deepEqual([f.efeitos.pedido.servico.idServico, f.efeitos.pedido.barbeiro.idProfissional, f.efeitos.pedido.barbeiro_ag], ['s2', 'b2', null]);
  doRecusado(busca(ped(barba), { id_opcao_agendamento: 'rec' }));
  doRecusado(busca(ped({ servico: { idServico: 's1', nome: 'corte adulto', opcao_id: 'ult' } })));
  // servico ou agendamento informado: a busca nao vira remarcacao do recusado
  assert.equal(busca(ped(barba), { id_opcao_servico: 's5' }).reqs[0].qs.idServico, 's2');
  assert.equal(busca(ped({ agendamentos: [{ opcao_id: '3', ...fut('outro', '2026-12-05T12:00:00'), profissional: 'Kiel', idProfissional: 'b2' }] }), { id_opcao_agendamento: '3' }).reqs[0].qs.idProfissional, 'b2');

  // reagendar so com o horario: proposta do agendamento recusado (a ocorrencia de 28/11 da serie), sem chamada a agenda
  let r = reag(ped());
  assert.equal(r.resultado.resumo, 'Remarcar corte adulto de 28/11 11:20 para segunda-feira, 30/11 às 20:00 com Pedro Henrique');
  assert.deepEqual([r.efeitos.proposta_nova.acao, r.efeitos.proposta_nova.dados.idAgenda, r.efeitos.proposta_nova.dados.horaInicio, r.efeitos.proposta_nova.dados.recorrente], ['reagendar', 'serie', '2026-11-28T11:20:00', true]);
  assert.deepEqual(reag(ped(), hora(), { id_opcao_agendamento: 'rec' }).efeitos.proposta_nova.dados, r.efeitos.proposta_nova.dados); // o id `rec` e o mesmo agendamento
  // PROD, 17/11: a mesma ocorrencia aparece com outro id no dia; mesmo inicio e mesmo barbeiro do lembrete, vale
  const outroId = ped({ futuros: [fut('novo-id', '2026-11-28T11:20:00')] });
  assert.equal(reag(outroId).efeitos.proposta_nova.dados.idAgenda, 'novo-id');
  // ja listado por meus_agendamentos: vale o nome do barbeiro que a agenda devolveu
  assert.match(reag(ped({ futuros: [], agendamentos: [{ opcao_id: '1', ...futuros[0], profissional: 'Pedro H' }], confirmacao_recusada: { ...rec, barbeiro: null } })).resultado.resumo, /com Pedro Henrique$/);

  // Recusa em pauta que nao resolve: nada e proposto e as ferramentas mandam listar. A busca so com a data NAO cai calada no servico
  // de costume (a linha do contexto promete o `rec`). Casos: barbeiro do agendamento achado diferente do do lembrete (achado pelo
  // inicio era de outra pessoa do mesmo telefone, ou a equipe trocou o barbeiro: o resumo diria um nome e a escrita iria a outro);
  // lembrete de outro cadastro; recusa sem o barbeiro; agendamento que a conversa nao leu; sem nome para o resumo; outro agendamento
  // no mesmo dia (com ou sem id); futuros sem barbeiro.
  const naoResolve = {
    'achado so pelo inicio, com outro barbeiro': ped({ futuros: [fut('do-filho', '2026-11-28T11:20:00', 'b2')] }),
    'mesmo id, a equipe trocou o barbeiro': ped({ futuros: [fut('serie', '2026-11-28T11:20:00', 'b2')] }),
    'lembrete de outro cadastro do telefone': ped({ confirmacao_recusada: { ...rec, idCliente: 'c2' } }),
    'recusa sem idProfissional': ped({ confirmacao_recusada: { ...rec, idProfissional: undefined } }),
    'agendamento nao lido': ped({ futuros: [futuros[2]] }),
    'sem nome do barbeiro': ped({ confirmacao_recusada: { ...rec, barbeiro: '' } }),
    'outro agendamento no dia': ped({ futuros: [...futuros, fut('irmao', '2026-11-28T12:00:00')] }),
    'outro no dia, sem id': ped({ futuros: [...futuros, { idAgenda: null, horaInicio: '2026-11-28T15:00:00', servico: 'barba' }] }),
    'futuro sem barbeiro': ped({ futuros: [{ ...futuros[0], idProfissional: undefined }] }),
  };
  for (const [caso, pd] of Object.entries(naoResolve)) {
    const b = busca(pd).final;
    assert.deepEqual([b.resultado.code, Object.keys(b.efeitos)], ['agendamento_nao_informado', []], caso);
    assert.match(b.resultado.orientacao, /chame meus_agendamentos .*agendamento novo, e não remarcar, chame de novo com o id_opcao_servico/, caso);
    for (const x of [reag(pd), reag(pd, hora(), { id_opcao_agendamento: 'rec' }), canc(pd), busca(pd, { id_opcao_agendamento: 'rec' }).final]) {
      assert.deepEqual([x.resultado.code, x.efeitos.proposta_nova], ['agendamento_nao_informado', undefined], caso);
      assert.match(x.resultado.orientacao, /chame meus_agendamentos/, caso);
    }
    deCostume(busca(pd, { id_opcao_servico: 'ult' })); // servico informado: agendamento novo, com o barbeiro de costume
    // `rec` informado junto com o servico: recusa tambem (buscava calado como agendamento novo e ainda marcava a oferta como remarcacao)
    for (const extra of [{ id_opcao_servico: 'ult' }, { id_opcao_servico: 'corte adulto' }, { id_opcao_servico: 'ult', qualquer: true }]) {
      assert.equal(busca(pd, { id_opcao_agendamento: 'rec', ...extra }).final.resultado.code, 'agendamento_nao_informado', caso);
    }
    assert.equal(g.bvGPasso(busca(pd, { id_opcao_servico: 'ult' }).st, grade, c).final.efeitos.opcoes.itens[0].valor.rec, undefined, caso); // busca comum nao leva a marca
    assert.equal(busca({ ...pd, ...barba }).reqs[0].qs.idServico, 's2', caso); // servico ja escolhido na conversa: a busca dele segue
  }
  // Sem recusa em pauta, a busca so com a data e a de sempre (servico e barbeiro de costume) e o reagendar sem agendamento manda listar:
  // sem recusa, recusa antiga (sem inicio), recusa vencida (a regra dos 120 min e a do bvMRecusa) e chamada sem relogio
  const semRecusa = [[ped({ confirmacao_recusada: undefined }), AGORA], [ped({ confirmacao_recusada: null }), AGORA], [ped({ confirmacao_recusada: { idAgenda: 'serie', em: rec.em } }), AGORA],
    [ped(), AGORA + 3 * 86400000], [ped(), Date.parse(rec.em) + 121 * 60000], [ped(), NaN]];
  for (const [pd, agora] of semRecusa) {
    deCostume(busca(pd, {}, agora));
    assert.deepEqual([reag(pd, hora(), {}, agora).resultado.code, reag(pd, hora(), {}, agora).efeitos.proposta_nova], ['agendamento_nao_informado', undefined]);
  }
  doRecusado(busca(ped(), {}, Date.parse(rec.em) + 119 * 60000)); // dentro da janela
  assert.equal(g.bvGNormalizar({ ...base, operacao: 'reagendar' }, cfg).resultado.code, 'faltam_dados'); // sem horario nem proposta continua faltando dado
  assert.equal(g.bvGNormalizar({ ...base, operacao: 'reagendar', id_opcao_agendamento: '1' }, cfg).resultado.code, 'faltam_dados');
  // horario de outro servico continua recusado
  assert.equal(reag(ped(), hora('b1', 'Pedro Henrique', 's9')).resultado.code, 'servico_diferente');

  // Clausula petrea: agendamento recusado com o barbeiro que so a equipe agenda. A busca encaminha, tambem com qualquer=true ou com
  // outro barbeiro informado (antes ofertava horarios de outros barbeiros como remarcacao); e o reagendar so com o horario, mesmo com
  // horario de OUTRO barbeiro na oferta, encaminha sem proposta (o padrao entra antes da barreira).
  const pedJ = ped({ futuros: [fut('serie', '2026-11-28T11:20:00', JAY)], confirmacao_recusada: { ...rec, barbeiro: 'Jayme', idProfissional: JAY }, barbeiros: [{ opcao_id: '2', idProfissional: 'b2', apelido: 'Kiel' }] });
  for (const extra of [{}, { qualquer: true }, { id_opcao_barbeiro: '2' }, { id_opcao_agendamento: 'rec', qualquer: true }, { hora: '20:00' }, { periodo: 'tarde' }]) {
    const bj = busca(pedJ, extra).final;
    assert.deepEqual([bj.resultado.code, bj.efeitos.handoff.queueId > 0, bj.efeitos.proposta_nova, bj.efeitos.opcoes], ['encaminhar_equipe', true, undefined, undefined], JSON.stringify(extra));
    assert.ok(!JSON.stringify(bj.resultado).includes('Jayme'));
  }
  // o mesmo para o agendamento dele informado pelo id da lista (sem recusa): qualquer=true nao oferta outros barbeiros
  const listadoJ = { idCliente: 'c1', agendamentos: [{ opcao_id: '1', ...fut('aj', '2026-12-01T10:00:00', JAY), profissional: 'Jayme' }], barbeiros: [{ opcao_id: '2', idProfissional: 'b2', apelido: 'Kiel' }] };
  for (const extra of [{ qualquer: true }, { id_opcao_barbeiro: '2' }]) assert.equal(busca(listadoJ, { id_opcao_agendamento: '1', ...extra }).final.resultado.code, 'encaminhar_equipe');
  for (const extra of [{}, { id_opcao_agendamento: 'rec' }]) {
    const rj = reag(pedJ, hora('b2', 'Kiel'), extra);
    assert.deepEqual([rj.resultado.code, rj.efeitos.proposta_nova, rj.efeitos.pedido.handoff], ['encaminhar_equipe', undefined, true]);
    assert.ok(!JSON.stringify(rj.resultado).includes('Jayme'));
  }
  // horario com o barbeiro da equipe na oferta e agendamento recusado de outro barbeiro: a barreira de sempre
  assert.equal(reag(ped(), hora(JAY, 'Jayme')).resultado.code, 'encaminhar_equipe');

  // TESTE, 27/11 (1 de 7 rodadas): depois da busca de remarcacao, o modelo chamou `agendar` no horario escolhido e saiu a proposta de
  // um agendamento NOVO, com o recusado de pe. O horario de uma busca de remarcacao do recusado leva a marca `rec` (nunca vai ao modelo)
  // e `agendar` com ele sai como a proposta de remarcar, igual a do `reagendar`, sem a leitura do pacote e sem contar no teto do dia
  f = g.bvGPasso(busca(ped()).st, grade, c).final;
  const marcaA = { idAgenda: 'serie', inicio: '2026-11-28T11:20' }; // a marca diz de qual agendamento foi a busca
  assert.deepEqual(f.efeitos.opcoes.itens.map((x) => x.valor.rec), [marcaA, marcaA]);
  assert.doesNotMatch(JSON.stringify(f.resultado), /"rec"/);
  const aposBusca = { ...ped(), ...f.efeitos.pedido }, idH = f.efeitos.opcoes.itens[1].id;
  const agendar = (pedido, opcoes, extra = {}, ctx = {}) => g.bvGPlano(entrada({ operacao: 'agendar', id_opcao_horario: idH, turno_id: T1, ...extra }), { opcoes, pedido, agora_ms: AGORA, ...ctx }, c);
  const conv = agendar(aposBusca, f.efeitos.opcoes).final;
  assert.deepEqual([conv.resultado.resumo, conv.efeitos.proposta_nova.acao, conv.efeitos.proposta_nova.dados.idAgenda, conv.efeitos.proposta_nova.dados.horaInicio],
    ['Remarcar corte adulto de 28/11 11:20 para segunda-feira, 30/11 às 20:00 com Pedro Henrique', 'reagendar', 'serie', '2026-11-28T11:20:00']);
  assert.deepEqual(conv.efeitos.proposta_nova.dados, plano({ operacao: 'reagendar', id_opcao_horario: idH, turno_id: T1 }, aposBusca, f.efeitos.opcoes).final.efeitos.proposta_nova.dados); // a mesma proposta do reagendar
  assert.equal(agendar(aposBusca, f.efeitos.opcoes, {}, { dia: { agendados: 3 } }).final.efeitos.proposta_nova.acao, 'reagendar'); // remarcar nao conta no teto de agendamentos do dia
  // o modelo chamou agendar: o resultado diz que saiu remarcacao, como confirmar e como pedir um agendamento a mais (o do reagendar nao muda)
  assert.match(conv.resultado.orientacao, /saiu como remarcação do agendamento cuja presença o cliente recusou.*chame reagendar \(ou agendar\) só com o proposta_id.*agendamento a mais.*id_opcao_servico/);
  assert.equal(plano({ operacao: 'reagendar', id_opcao_horario: idH, turno_id: T1 }, aposBusca, f.efeitos.opcoes).final.resultado.orientacao, undefined);
  // No sim, o modelo pode repetir `agendar` com o proposta_id: o mapa do no Contexto (espelhado em BVG_ACOES) deixa agendar reivindicar a
  // proposta de reagendar, e a fase 2 decide pela acao da proposta: revalida e manda o PUT. A conferencia do sim e a mesma nas duas.
  assert.deepEqual(g.BVG_ACOES, { agendar: 'agendar,trocar_servico,agendar_conjunto,reagendar', reagendar: 'reagendar,trocar_servico', cancelar: 'cancelar,cancelar_conjunto,reagendar,trocar_servico' });
  const sim2 = g.bvGPlano(entrada({ operacao: 'agendar', proposta_id: PR, texto_cliente: 'sim' }), { pedido: ped(), proposta: { id: PR, acao: 'reagendar', dados: conv.efeitos.proposta_nova.dados }, agora_ms: AGORA }, c);
  const put = g.bvGPasso(sim2.st, [ok({ minutos: 40, horarios: ['20:00'] }), ok(futuros), ok({ horarios: [] })], c);
  assert.deepEqual(put.reqs, [{ m: 'PUT', path: '/agenda/serie', body: { horaInicioOriginal: '2026-11-28T11:20:00', horaInicioNovo: '2026-11-30T20:00:00', idProfissional: 'b1' } }]);
  for (const fala of ['sim', 'pode confirmar', 'Obrigado', '28/11 11:20 corte adulto', 'não, deixa']) assert.equal(g.bvgConfirmou(fala, 'agendar'), g.bvgConfirmou(fala, 'reagendar'), fala);
  assert.equal(g.bvGNormalizar({ ...base, operacao: 'agendar', proposta_id: PR, texto_cliente: 'Obrigado' }, cfg).resultado.code, 'cliente_nao_confirmou');
  // a oferta guardada quando meus_agendamentos trocou a lista (pedido.horarios_oferta) vale igual
  assert.equal(agendar({ ...aposBusca, horarios_oferta: f.efeitos.opcoes }, { tipo: 'agendamento', itens: [] }).final.efeitos.proposta_nova.acao, 'reagendar');
  // barbeiro que so a equipe agenda: horario marcado e agendamento recusado dele, `agendar` encaminha sem proposta
  const ofJ = { tipo: 'horario', itens: [{ id: idH, rotulo: '20:00', valor: { ...f.efeitos.opcoes.itens[1].valor, idProfissional: 'b2', apelido: 'Kiel' } }] };
  const aj = agendar(pedJ, ofJ).final;
  assert.deepEqual([aj.resultado.code, aj.efeitos.proposta_nova, aj.efeitos.pedido.handoff], ['encaminhar_equipe', undefined, true]);
  // NAO converte: horario de busca de outro servico (quem recusou o corte e marca barba), recusa vencida, e a troca de servico informada
  const fb = g.bvGPasso(busca(ped(barba)).st, [ok({ minutos: 20, horarios: ['18:00', '20:00'] })], c).final;
  assert.deepEqual(fb.efeitos.opcoes.itens.map((x) => x.valor.rec), [undefined, undefined]);
  const novo = semPacote(agendar({ ...ped(barba), ...fb.efeitos.pedido }, fb.efeitos.opcoes)).final;
  assert.deepEqual([novo.efeitos.proposta_nova.acao, novo.efeitos.proposta_nova.dados.idServico, novo.efeitos.proposta_nova.dados.idAgenda], ['agendar', 's2', undefined]);
  const vencida = agendar(aposBusca, f.efeitos.opcoes, {}, { agora_ms: AGORA + 3 * 86400000 });
  assert.equal(semPacote(vencida).final.efeitos.proposta_nova.acao, 'agendar');
  assert.equal(agendar({ ...aposBusca, agendamentos: [{ opcao_id: '1', ...futuros[0], profissional: 'Pedro Henrique' }] }, f.efeitos.opcoes, { substitui_id_opcao_agendamento: '1' }).final.resultado.code, 'mesmo_servico');
  // horario tomado na fase 2 da remarcacao: a reoferta guarda a marca
  const tomado = g.bvGPasso(g.bvGPlano(entrada({ operacao: 'reagendar', proposta_id: PR }), { pedido: ped(), proposta: { id: PR, acao: 'reagendar', dados: conv.efeitos.proposta_nova.dados }, agora_ms: AGORA }, c).st,
    [ok({ minutos: 40, horarios: ['18:00'] }), ok([]), ok({ horarios: [] })], c).final;
  assert.deepEqual([tomado.resultado.code, tomado.efeitos.opcoes.itens.map((x) => x.valor.rec)], ['horario_indisponivel', [marcaA]]);
  // Duas recusas em duas horas: a oferta aberta e da busca feita para o agendamento de 28/11 e a recusa em pauta agora e outra (12/12).
  // `agendar` nesse horario NAO vira a remarcacao do outro agendamento (segue agendamento novo, com o aviso) e o `reagendar` so com o
  // horario, ou com o `rec`, manda listar em vez de propor remarcar o agendamento errado
  const pedB = { ...aposBusca, futuros: [...futuros, fut('avulso', '2026-12-12T09:00:00')], confirmacao_recusada: { ...rec, idAgenda: 'avulso', inicio: '2026-12-12T09:00:00' } };
  assert.equal(plano({ operacao: 'reagendar', id_opcao_horario: '9', turno_id: T1 }, pedB, hora()).final.efeitos.proposta_nova.dados.idAgenda, 'avulso'); // horario sem marca (busca comum): o padrao segue valendo
  const outra = semPacote(agendar(pedB, f.efeitos.opcoes)).final;
  assert.deepEqual([outra.efeitos.proposta_nova.acao, outra.efeitos.proposta_nova.dados.idAgenda, /já tem/.test(outra.resultado.orientacao)], ['agendar', undefined, true]);
  for (const extra of [{}, { id_opcao_agendamento: 'rec' }]) {
    const x = plano({ operacao: 'reagendar', id_opcao_horario: idH, turno_id: T1, ...extra }, pedB, f.efeitos.opcoes).final;
    assert.deepEqual([x.resultado.code, x.efeitos.proposta_nova], ['agendamento_nao_informado', undefined]);
  }

  // Ocorrencia certa (27/11): com a recusa de 28/11 em pauta, o cliente pede pela lista para remarcar OUTRO horario (o sabado seguinte
  // da mesma serie, ou o avulso). A busca sai pelo id da lista; os horarios saiam sem marca e o `reagendar` so com o horario propunha
  // remarcar o de 28/11. Toda busca de remarcacao marca a oferta com o agendamento dela: so com o horario manda informar o id.
  const listados = futuros.map((x, k) => ({ opcao_id: String(k + 1), ...x, profissional: 'Pedro Henrique' }));
  const comLista = ped({ agendamentos: listados });
  const daLista = (id) => {
    const fl = g.bvGPasso(busca(comLista, { id_opcao_agendamento: id }).st, grade, c).final;
    return { of: fl.efeitos.opcoes, pd: { ...comLista, ...fl.efeitos.pedido }, id: fl.efeitos.opcoes.itens[1].id };
  };
  const nessa = (b, op, extra = {}) => plano({ operacao: op, id_opcao_horario: b.id, turno_id: T1, ...extra }, b.pd, b.of);
  for (const [id, inicio, idAg] of [['2', '2026-12-05T11:20', 'serie'], ['3', '2026-12-05T12:00', 'outro']]) {
    const b = daLista(id);
    assert.deepEqual(b.of.itens.map((x) => x.valor.rec), [{ idAgenda: idAg, inicio }, { idAgenda: idAg, inicio }], id);
    const so = nessa(b, 'reagendar').final;
    assert.deepEqual([so.resultado.code, so.efeitos.proposta_nova], ['agendamento_nao_informado', undefined], id);
    assert.match(so.resultado.orientacao, /chame esta ferramenta de novo com o id_opcao_agendamento e este id_opcao_horario/, id);
    const com = nessa(b, 'reagendar', { id_opcao_agendamento: id }).final.efeitos.proposta_nova; // com o id da lista sai o escolhido
    assert.deepEqual([com.acao, com.dados.idAgenda, com.dados.horaInicio.slice(0, 16)], ['reagendar', idAg, inicio], id);
    assert.equal(semPacote(nessa(b, 'agendar')).final.efeitos.proposta_nova.acao, 'agendar', id); // e o `agendar` nao vira remarcacao do recusado
  }
  // a marca sai tambem na busca de remarcacao com `qualquer` e com outro barbeiro informado (horarios de varios barbeiros, ou de outro)
  const grades = (q) => (q.path === '/servicos/profissionais' ? ok([{ idProfissional: 'b1', apelido: 'Pedro Henrique' }, { idProfissional: 'b2', apelido: 'Kiel' }]) : q.path === '/agenda/horarios' ? ok({ horarios: [] }) : grade[0]);
  for (const [extra, doCaminho] of [[{ qualquer: true }, (v) => v.indicado === true], [{ id_opcao_barbeiro: '2' }, (v) => v.idProfissional === 'b2']]) {
    let x = busca({ ...comLista, barbeiros: [{ opcao_id: '2', idProfissional: 'b2', apelido: 'Kiel' }] }, { id_opcao_agendamento: '2', ...extra });
    while (!x.final) x = g.bvGPasso(x.st, x.reqs.map(grades), c);
    const vs = x.final.efeitos.opcoes.itens.map((o) => o.valor);
    assert.deepEqual([vs.length, vs.every(doCaminho), vs.every((v) => v.rec.idAgenda === 'serie' && v.rec.inicio === '2026-12-05T11:20')], [2, true, true], JSON.stringify(extra));
  }
  // busca do PROPRIO recusado pelo id da lista: a mesma marca do `rec`; so com o horario, e pelo `agendar`, sai a remarcacao dele
  const b1 = daLista('1');
  assert.deepEqual(b1.of.itens.map((x) => x.valor.rec), [marcaA, marcaA]);
  for (const op of ['reagendar', 'agendar']) {
    const x = nessa(b1, op).final.efeitos.proposta_nova;
    assert.deepEqual([x.acao, x.dados.idAgenda, x.dados.horaInicio], ['reagendar', 'serie', '2026-11-28T11:20:00'], op);
  }
  // horario tomado na fase 2 da remarcacao do sabado seguinte: a reoferta leva a marca dele, e so com o horario nao remarca o recusado
  const d05 = nessa(daLista('2'), 'reagendar', { id_opcao_agendamento: '2' }).final.efeitos.proposta_nova.dados;
  const tomado05 = g.bvGPasso(g.bvGPlano(entrada({ operacao: 'reagendar', proposta_id: PR }), { pedido: comLista, proposta: { id: PR, acao: 'reagendar', dados: d05 }, agora_ms: AGORA }, c).st,
    [ok({ minutos: 40, horarios: ['18:00'] }), ok([]), ok({ horarios: [] })], c).final;
  assert.deepEqual(tomado05.efeitos.opcoes.itens.map((x) => x.valor.rec), [{ idAgenda: 'serie', inicio: '2026-12-05T11:20' }]);
  assert.equal(plano({ operacao: 'reagendar', id_opcao_horario: tomado05.efeitos.opcoes.itens[0].id }, comLista, tomado05.efeitos.opcoes).final.resultado.code, 'agendamento_nao_informado');
  // sem recusa em pauta nada muda: a marca so e lida com ela
  const semRec = { ...b1.pd, confirmacao_recusada: null };
  assert.equal(semPacote(plano({ operacao: 'agendar', id_opcao_horario: b1.id, turno_id: T1 }, semRec, b1.of)).final.efeitos.proposta_nova.acao, 'agendar');
  assert.equal(plano({ operacao: 'reagendar', id_opcao_horario: b1.id, turno_id: T1 }, semRec, b1.of).final.resultado.code, 'agendamento_nao_informado');

  // cancelar: "e o agendamento recusado?" tem uma definicao so. Pelo id `rec`, pelo id da lista (mesmo id e mesmo inicio) e na ocorrencia
  // que apareceu com outro id, vale o ramo de quem ja ouviu a oferta de remarcar (sem lista de decisao); outra ocorrencia da mesma
  // serie e outro agendamento seguem com a lista "Remarcar / Cancelar mesmo"
  const curto = (x, id) => assert.deepEqual([x.efeitos.proposta_nova.acao, x.efeitos.proposta_nova.dados.idAgenda, x.efeitos.opcoes, /peça só a confirmação do cancelamento/.test(x.resultado.orientacao)], ['cancelar', id, {}, true]);
  const cn = canc(ped());
  curto(cn, 'serie');
  assert.equal(cn.efeitos.proposta_nova.dados.recorrente, true);
  curto(canc(outroId), 'novo-id');
  const lista = (fs) => fs.map((x, k) => ({ opcao_id: String(k + 1), ...x, profissional: 'Pedro Henrique' }));
  curto(canc(ped({ agendamentos: lista(futuros) }), '1'), 'serie');
  curto(canc({ ...outroId, agendamentos: lista(outroId.futuros) }, '1'), 'novo-id');
  for (const id of ['2', '3']) assert.deepEqual(canc(ped({ agendamentos: lista(futuros) }), id).efeitos.opcoes.itens.map((x) => x.valor), ['remarcar', 'cancelar']);
  assert.equal(canc(ped({ confirmacao_recusada: undefined })).resultado.code, 'agendamento_nao_informado'); // `rec` sem recusa: manda listar

  // fase 2: escrita no agendamento recusado tira a recusa do pedido; em outro agendamento (ou com a recusa antiga) nao mexe nela
  const dados = r.efeitos.proposta_nova.dados;
  const fase2 = (acao, d, pedido, op = acao) => g.bvGPlano(entrada({ operacao: op, proposta_id: PR }), { pedido, proposta: { id: PR, acao, dados: d }, agora_ms: AGORA }, c);
  const ate = (pl, resp) => { let x = pl; while (!x.final) x = g.bvGPasso(x.st, x.reqs.map(resp), c); return x.final; };
  const agenda = (q) => (q.path === '/agenda/horarios-livres' ? ok({ minutos: 40, horarios: ['20:00'] }) : q.path === '/agenda/agendamentos' ? ok(futuros.map((x) => ({ ...x, descricaoServico: x.servico })))
    : q.path === '/agenda/horarios' ? ok({ horarios: [] }) : q.path === '/agenda/pacotes' ? ok([]) : ok({ sucesso: true, idAgenda: 'novo' }));
  const fechou = (e) => e.efeitos.pedido.confirmacao_recusada === null;
  const e1 = ate(fase2('reagendar', dados, ped()), agenda);
  assert.deepEqual([e1.resultado.remarcado, fechou(e1)], [true, true]);
  // Ocorrencia certa (27/11): a escrita numa ocorrencia da serie tira dos futuros so ela; os outros sabados (o mesmo idAgenda) seguem
  // la. Pelo id so, sumiam da linha de agendamentos do contexto, do aviso de duplicidade e do `rec` de uma segunda recusa.
  const fs = (e) => e.efeitos.pedido.futuros.map((a) => `${a.idAgenda} ${a.horaInicio.slice(0, 16)}`);
  const resto = ['serie 2026-12-05T11:20', 'outro 2026-12-05T12:00'];
  assert.deepEqual(fs(e1), [...resto, 'serie 2026-11-30T20:00']);
  // o id e comparado como texto (numero nos futuros, texto na proposta): a ocorrencia antiga sai e o horario novo herda a marca de pacote
  const num = ate(fase2('reagendar', { ...dados, idAgenda: '7', horaInicio: '2026-12-05T12:00:00' }, ped({ futuros: [futuros[0], fut(7, '2026-12-05T12:00:00', 'b1', { pacote: true })] })), agenda);
  assert.deepEqual([fs(num), num.efeitos.pedido.futuros[1].pacote], [['serie 2026-11-28T11:20', '7 2026-11-30T20:00'], true]);
  assert.equal('confirmacao_recusada' in ate(fase2('reagendar', { ...dados, horaInicio: '2026-12-05T11:20:00' }, ped()), agenda).efeitos.pedido, false); // outra ocorrencia da mesma serie
  assert.equal('confirmacao_recusada' in ate(fase2('reagendar', dados, ped({ confirmacao_recusada: { idAgenda: 'serie', em: rec.em } })), agenda).efeitos.pedido, false); // recusa antiga: como antes
  assert.equal(fechou(ate(fase2('reagendar', { ...dados, idAgenda: 'novo-id' }, outroId), agenda)), true); // a ocorrencia com outro id
  const cf = ate(fase2('cancelar', cn.efeitos.proposta_nova.dados, ped()), agenda);
  assert.deepEqual([cf.resultado.cancelado, fechou(cf)], [true, true]);
  assert.deepEqual(fs(cf), resto);
  assert.deepEqual(fs(ate(fase2('cancelar', { ...cn.efeitos.proposta_nova.dados, idAgenda: 'outro', horaInicio: '2026-12-05T12:00:00' }, ped()), agenda)), ['serie 2026-11-28T11:20', 'serie 2026-12-05T11:20']); // o avulso: como antes
  // varios de uma vez e troca de servico: o recusado entre os cancelados, ou como o antigo da troca
  const cj = { itens: [{ ordem: 1, idAgenda: 'serie', horaInicio: '2026-11-28T11:20:00', recorrente: true, servico: 'corte adulto' }, { ordem: 2, idAgenda: 'outro', horaInicio: '2026-12-05T12:00:00', recorrente: false, servico: 'corte adulto' }], resumo: 'Cancelar os dois' };
  assert.equal(fechou(ate(fase2('cancelar_conjunto', cj, ped(), 'cancelar'), agenda)), true);
  assert.deepEqual(fs(ate(fase2('cancelar_conjunto', cj, ped(), 'cancelar'), agenda)), ['serie 2026-12-05T11:20']);
  assert.equal('confirmacao_recusada' in ate(fase2('cancelar_conjunto', { ...cj, itens: [cj.itens[1], { ...cj.itens[0], horaInicio: '2026-12-05T11:20:00' }] }, ped(), 'cancelar'), agenda).efeitos.pedido, false);
  const troca = { idCliente: 'c1', idServico: 's2', servico: 'barba', idProfissional: 'b1', barbeiro: 'Pedro Henrique', data: '2026-11-30', hora: '20:00', minutos: 40, antigo: { idAgenda: 'serie', horaInicio: '2026-11-28T11:20:00', recorrente: true, servico: 'corte adulto' }, resumo: 'Trocar serviço: barba' };
  const et = ate(fase2('trocar_servico', troca, ped(), 'agendar'), agenda);
  assert.deepEqual([et.resultado.serviço_trocado, fechou(et)], [true, true]);
  assert.deepEqual(fs(et), [...resto, 'novo 2026-11-30T20:00']);

  // futuros: `recorrente` entra quando a agenda marca; o nome do barbeiro continua fora
  const idf = g.bvGPasso(g.bvGPasso(g.bvGPlano(entrada({ operacao: 'identificar_cliente' }), null, c).st, [ok([{ idCliente: 'c1', nomeCliente: 'Paulo' }])], c).st,
    [ok([]), ok([{ idAgenda: 'serie', idServico: 's1', horaInicio: '2026-11-28T11:20:00', descricaoServico: 'corte adulto', idProfissional: 'b1', profissional: 'Pedro Henrique', recorrente: true }])], c).final;
  assert.deepEqual(idf.efeitos.pedido.futuros, [{ idAgenda: 'serie', idServico: 's1', horaInicio: '2026-11-28T11:20:00', servico: 'corte adulto', idProfissional: 'b1', recorrente: true }]);
  console.log('graces.test.js remarcar depois de recusar o lembrete ok');
}

{ // Cancelar so o que o cliente pediu (27/11): a proposta de cancelar que nasceu com a lista "Remarcar / Cancelar mesmo" ficava
  // pendente enquanto o cliente remarcava, e "ok, segunda então" passava na barreira do sim; e a recusa do lembrete de uma serie
  // recorrente nascia sem a marca, com o DELETE saindo sem a data da ocorrencia.
  const m = require('../workflows/shared/mensagens.js');
  const PC = '55555555-5555-4555-8555-555555555555';
  const INI = '2026-12-04T10:00:00';
  const ag = (id = 'a1', ini = INI, op = '1') => ({ opcao_id: op, idAgenda: id, horaInicio: ini, idServico: 's1', servico: 'corte adulto', idProfissional: TESTE, profissional: 'ZZ TESTE', recorrente: false });
  const pedido = (extra = {}) => ({ idCliente: 'c1', agendamentos: [ag(), ag('a2', '2026-12-05T11:00:00', '2')], ...extra });
  const fase1 = (ped, o = { id_opcao_agendamento: '1' }) => g.bvGPlano(entrada({ operacao: 'cancelar', ...o }), { opcoes: {}, pedido: ped }, cfg).final;
  // fase 2 com a fala do turno, como o no "Ferramenta cancelar" manda (texto_cliente); -> { barrado } quando o Normalizar ja recusa
  const fase2 = (fala, dados, acao = 'cancelar', ctx = {}) => {
    const n = g.bvGNormalizar({ ...base, operacao: 'cancelar', proposta_id: PC, ...(fala === undefined ? {} : { texto_cliente: fala }) }, cfg);
    return n.ok ? g.bvGPlano(n.in, { pedido: pedido(), proposta: { id: PC, acao, dados }, ...ctx }, cfg) : { barrado: n.resultado.code };
  };
  const linha = (id, ini, extra = {}) => ({ idAgenda: id, horaInicio: ini, idServico: 's1', descricaoServico: 'corte adulto', idProfissional: TESTE, ...extra });
  const SIM = ['sim', 'ok, segunda então', 'pode ser às 20', 'pode ser', '👍', 'amanhã às 10 pode ser', 'isso, de manhã', 'beleza, que horas tem?', 'pode tirar'];
  const DITO = ['Cancelar mesmo', 'cancela', 'pode cancelar', 'desmarca', 'sim, cancela', 'Não quero remarcar, pode cancelar', '[áudio transcrito] pode cancelar sim', 'sem problema, pode cancelar'];
  const NAO = ['Remarcar', 'quero remarcar', 'prefiro remarcar em vez de cancelar', 'melhor remarcar do que cancelar', 'remarcar, sem cancelar', 'ao invés de cancelar, remarca', 'não quero cancelar', '20:00', 'Obrigado'];

  // a barreira da fala: soDito tira o sim generico; as negacoes novas valem com e sem soDito
  for (const t of SIM) assert.deepEqual([g.bvgConfirmou(t, 'cancelar'), g.bvgConfirmou(t, 'cancelar', true)], [true, false], t);
  for (const t of DITO) assert.deepEqual([g.bvgConfirmou(t, 'cancelar'), g.bvgConfirmou(t, 'cancelar', true)], [true, true], t);
  for (const t of NAO) assert.deepEqual([g.bvgConfirmou(t, 'cancelar'), g.bvgConfirmou(t, 'cancelar', true)], [false, false], t);
  assert.equal(g.bvgConfirmou('sim', 'agendar', true), true); // soDito so muda o cancelar
  // so_sim e derivado da fala: nao entra de fora, e so existe na fase 2 do cancelar
  assert.equal(g.bvGNormalizar({ ...base, operacao: 'cancelar', proposta_id: PC, so_sim: false }, cfg).resultado.code, 'campo_desconhecido');
  assert.equal(g.bvGNormalizar({ ...base, operacao: 'cancelar', proposta_id: PC, texto_cliente: 'sim' }, cfg).in.so_sim, true);
  assert.equal(g.bvGNormalizar({ ...base, operacao: 'cancelar', proposta_id: PC, texto_cliente: 'Cancelar mesmo' }, cfg).in.so_sim, undefined);
  assert.equal(g.bvGNormalizar({ ...base, operacao: 'reagendar', proposta_id: PC, texto_cliente: 'sim' }, cfg).in.so_sim, undefined);

  // as quatro propostas que nascem com a lista de decisao (ou sem marca nenhuma): so o cancelamento dito executa
  const daLista = fase1(pedido());
  assert.deepEqual(daLista.efeitos.opcoes.itens.map((x) => x.valor), ['remarcar', 'cancelar']);
  assert.equal(daLista.efeitos.proposta_nova.dados.sim_basta, undefined);
  const conj = fase1(pedido(), { id_opcoes_agendamentos: ['1', '2'] });
  assert.deepEqual([conj.efeitos.proposta_nova.acao, conj.efeitos.proposta_nova.dados.sim_basta, conj.efeitos.opcoes.itens.length], ['cancelar_conjunto', undefined, 2]);
  const doLembrete = m.bvMDecisaoCancelar({ id: 9, inicio: INI, graces_cliente_id: 'c1', dados: { servico: 'corte adulto' } }, 'a1').dados;
  assert.equal(doLembrete.sim_basta, undefined);
  const antiga = { idAgenda: 'a1', horaInicio: INI, recorrente: false, servico: 'corte adulto', resumo: 'Cancelar corte adulto' }; // de antes desta versao
  const tipos = [['da lista', 'cancelar', daLista.efeitos.proposta_nova.dados], ['conjunto', 'cancelar_conjunto', conj.efeitos.proposta_nova.dados], ['do lembrete', 'cancelar', doLembrete], ['antiga', 'cancelar', antiga]];
  for (const [nome, acao, dados] of tipos) {
    for (const t of SIM) {
      const r = fase2(t, dados, acao);
      assert.ok(!r.reqs && r.final.resultado.code === 'cliente_nao_disse_cancelar', `${nome}: ${t}`); // nenhuma chamada a agenda
      assert.deepEqual(r.final.efeitos.proposta_upd, { id: PC, estado: 'falhou', resultado: { ok: false, code: 'cliente_nao_disse_cancelar' } });
      assert.equal(r.final.efeitos.falha.motivo, 'graces|cancelar_sem_dizer');
    }
    for (const t of DITO) assert.deepEqual(fase2(t, dados, acao).reqs.map((q) => [q.m, q.path]), [['GET', '/agenda/agendamentos']], `${nome}: ${t}`);
    for (const t of NAO) assert.equal(fase2(t, dados, acao).barrado, 'cliente_nao_confirmou', `${nome}: ${t}`);
    assert.ok(fase2(undefined, dados, acao).reqs, nome); // sem a fala do turno (chamada direta, sem o no da ferramenta): como antes
  }
  // a recusa tira a lista de decisao do estado, mas nao a lista de horarios de quem esta remarcando
  const decisao = { tipo: 'decisao_cancelamento', itens: [{ id: '1', rotulo: 'Remarcar', valor: 'remarcar' }, { id: '2', rotulo: 'Cancelar mesmo', valor: 'cancelar' }] };
  assert.deepEqual(fase2('sim', antiga, 'cancelar', { opcoes: decisao }).final.efeitos.opcoes, {});
  assert.equal('opcoes' in fase2('pode ser às 20', antiga, 'cancelar', { opcoes: { tipo: 'horario', itens: [{ id: '1', rotulo: '20:00', valor: {} }] } }).final.efeitos, false);
  assert.match(fase2('sim', antiga).final.resultado.orientacao, /siga a remarcação.*chame cancelar de novo com o agendamento.*peça só a confirmação do cancelamento, sem mandar a lista de novo/);

  // sem laco: depois da recusa, a fase 1 do MESMO agendamento sai pela pergunta direta (sem lista), e o "sim" a ela executa
  const visto = fase2('sim', daLista.efeitos.proposta_nova.dados).final.efeitos.pedido;
  assert.deepEqual(visto, { decisao_vista: [{ idAgenda: 'a1', inicio: '2026-12-04T10:00' }] });
  const direta = fase1(pedido(visto));
  assert.deepEqual([direta.efeitos.opcoes, direta.resultado.opcoes, direta.efeitos.proposta_nova.dados.sim_basta], [{}, undefined, true]);
  assert.match(direta.resultado.orientacao, /peça só a confirmação do cancelamento/);
  for (const t of ['sim', 'pode', 'isso', 'Cancelar mesmo']) {
    const d2 = g.bvGPasso(fase2(t, direta.efeitos.proposta_nova.dados).st, [ok([linha('a1', INI)])], cfg);
    assert.deepEqual(d2.reqs, [{ m: 'DELETE', path: '/agenda/a1', qs: { data: '2026-12-04' } }], t);
    assert.equal(g.bvGPasso(d2.st, [ok({ sucesso: true })], cfg).final.efeitos.proposta_upd.estado, 'executada', t);
  }
  assert.equal(fase2('não, quero remarcar', direta.efeitos.proposta_nova.dados).barrado, 'cliente_nao_confirmou'); // a pergunta direta tambem ouve o nao
  assert.deepEqual(fase1(pedido(visto), { id_opcao_agendamento: '2' }).efeitos.opcoes.itens.length, 2); // outro agendamento: a lista de decisao, como sempre
  assert.deepEqual(fase1(pedido({ decisao_vista: [{ idAgenda: 'a1', inicio: '2026-12-11T10:00' }] })).efeitos.opcoes.itens.length, 2); // outra ocorrencia do mesmo id tambem
  // varios de uma vez: a mesma saida
  const vistos = fase2('pode ser', conj.efeitos.proposta_nova.dados, 'cancelar_conjunto').final.efeitos.pedido;
  assert.deepEqual(vistos.decisao_vista.map((x) => x.idAgenda), ['a1', 'a2']);
  const diretaC = fase1(pedido(vistos), { id_opcoes_agendamentos: ['1', '2'] });
  assert.deepEqual([diretaC.efeitos.opcoes, diretaC.efeitos.proposta_nova.acao, diretaC.efeitos.proposta_nova.dados.sim_basta], [{}, 'cancelar_conjunto', true]);
  assert.ok(fase2('sim', diretaC.efeitos.proposta_nova.dados, 'cancelar_conjunto').reqs);
  assert.equal(fase1(pedido(visto), { id_opcoes_agendamentos: ['1', '2'] }).efeitos.opcoes.itens.length, 2); // so um dos dois viu a decisao: a lista
  // recusa do lembrete (sessao nova, medido no TESTE em 27/11): "Cancelar mesmo" cria a proposta pelo ramo curto e o "sim" executa
  const curta = fase1(pedido({ confirmacao_recusada: { idAgenda: 'a1', em: '2026-12-03T12:00:00Z' } }));
  assert.deepEqual([curta.efeitos.opcoes, curta.efeitos.proposta_nova.dados.sim_basta], [{}, true]);
  assert.deepEqual(g.bvGPasso(fase2('sim', curta.efeitos.proposta_nova.dados).st, [ok([linha('a1', INI)])], cfg).reqs, [{ m: 'DELETE', path: '/agenda/a1', qs: { data: '2026-12-04' } }]);

  // serie recorrente: a proposta do lembrete nasce sem a marca; a agenda lida na fase 2 decide, e so a ocorrencia confirmada sai
  const S = (d, extra = { recorrente: true }) => linha('a1', `${d}T10:00:00`, extra);
  const apaga = (agenda, dados = doLembrete) => g.bvGPasso(fase2('Cancelar mesmo', dados).st, [ok(agenda)], cfg);
  assert.equal(doLembrete.recorrente, false);
  assert.deepEqual(apaga([S('2026-12-04'), S('2026-12-11')]).reqs, [{ m: 'DELETE', path: '/agenda/a1', qs: { data: '2026-12-04' } }]);
  assert.deepEqual(apaga([S('2026-12-11'), S('2026-12-04')]).reqs[0].qs, { data: '2026-12-04' }); // a ocorrencia confirmada, nao a primeira linha do id
  assert.deepEqual(apaga([S('2026-12-04', {}), S('2026-12-11', {})]).reqs[0].qs, { data: '2026-12-04' }); // sem a marca na agenda: o mesmo id em duas linhas
  assert.deepEqual(apaga([S('2026-12-04')]).reqs[0].qs, { data: '2026-12-04' }); // uma ocorrencia so na resposta, com a marca
  // Uma linha so e sem a marca: avulso, ou serie que a leitura mostra assim. A data vai sempre (ocorrencia certa, 27/11): a Graces a
  // ignora no agendamento comum e, na serie, so a ocorrencia sai. Antes o DELETE saia sem a data e nao se sabia o que a serie fazia.
  assert.deepEqual(apaga([S('2026-12-04', {})]).reqs, [{ m: 'DELETE', path: '/agenda/a1', qs: { data: '2026-12-04' } }]);
  assert.deepEqual(apaga([{ ...S('2026-12-04', {}), idAgenda: 7 }], { ...doLembrete, idAgenda: '7' }).reqs[0].path, '/agenda/7'); // id numerico na agenda
  // a ocorrencia confirmada nao esta na agenda (saiu da serie, ou a equipe mudou o horario): nada e apagado
  for (const agenda of [[S('2026-12-11'), S('2026-12-18')], [S('2026-12-05', {})], [linha('a1', '2026-12-04T11:00:00')]]) {
    const r = apaga(agenda);
    assert.ok(!r.reqs && r.final.resultado.code === 'agendamento_nao_encontrado' && r.final.efeitos.proposta_upd.estado === 'falhou', JSON.stringify(agenda));
  }
  // pacote vem antes: qualquer ocorrencia do id com pacote leva a equipe, mesmo sem a ocorrencia confirmada na agenda
  assert.equal(apaga([S('2026-12-04', { recorrente: true, servicoPacote: { idServico: 's1' } }), S('2026-12-11')]).final.resultado.motivo, 'pacote');
  assert.equal(apaga([S('2026-12-11', { recorrente: true, servicoPacote: { idServico: 's1' } })]).final.resultado.motivo, 'pacote');
  // a data e sempre a da ocorrencia conferida, o que quer que a proposta diga de serie; e a conferencia nao afrouxou: como a Graces
  // ignora a data fora de serie, o agendamento comum que mudou de dia ou de hora nao recebe DELETE nenhum
  for (const rc of [true, false, undefined]) assert.deepEqual(apaga([S('2026-12-04', {})], { ...antiga, recorrente: rc }).reqs[0].qs, { data: '2026-12-04' });
  for (const agenda of [[S('2026-12-05', {})], [linha('a1', '2026-12-04T10:30:00')]]) assert.equal(apaga(agenda, antiga).final.resultado.code, 'agendamento_nao_encontrado');
  // DELETE da ocorrencia sem resposta: as outras ocorrencias seguem na agenda com o mesmo id, e isso nao e "nao cancelou"
  const del = apaga([S('2026-12-04'), S('2026-12-11')]);
  const ver = g.bvGPasso(del.st, [resp(500, {})], cfg);
  assert.deepEqual(ver.reqs[0].path, '/agenda/agendamentos');
  assert.deepEqual([g.bvGPasso(ver.st, [ok([S('2026-12-11')])], cfg).final.efeitos.proposta_upd.estado, g.bvGPasso(ver.st, [ok([S('2026-12-11')])], cfg).final.resultado.verificada], ['executada', true]);
  assert.deepEqual(g.bvGPasso(ver.st, [ok([S('2026-12-04'), S('2026-12-11')])], cfg).reqs, [{ m: 'DELETE', path: '/agenda/a1', qs: { data: '2026-12-04' } }]); // continua la: repete o mesmo DELETE
  // o mesmo na serie que a leitura mostrou com uma linha so e sem a marca: se a releitura traz os outros dias do id, a ocorrencia sumiu
  // e esta cancelado (pela regra antiga, so pelo id, o DELETE era repetido e a proposta terminava incerta com o horario ja cancelado)
  const ver1 = g.bvGPasso(apaga([S('2026-12-04', {})]).st, [resp(500, {})], cfg);
  assert.equal(g.bvGPasso(ver1.st, [ok([S('2026-12-11', {})])], cfg).final.efeitos.proposta_upd.estado, 'executada');
  assert.deepEqual(g.bvGPasso(ver1.st, [ok([S('2026-12-04', {})])], cfg).reqs, [{ m: 'DELETE', path: '/agenda/a1', qs: { data: '2026-12-04' } }]);
  // varios de uma vez e o antigo da troca de servico: a ocorrencia de cada um tambem tem de estar na agenda
  const cj = { itens: [{ ordem: 1, idAgenda: 'a1', horaInicio: INI, recorrente: false, servico: 'corte adulto' }, { ordem: 2, idAgenda: 'a2', horaInicio: '2026-12-05T11:00:00', recorrente: false, servico: 'corte adulto' }], resumo: 'Cancelar os dois' };
  const apagaC = (agenda) => g.bvGPasso(fase2('Cancelar mesmo', cj, 'cancelar_conjunto').st, [ok(agenda)], cfg);
  assert.deepEqual(apagaC([linha('a1', INI), linha('a2', '2026-12-05T11:00:00')]).reqs, [{ m: 'DELETE', path: '/agenda/a1', qs: { data: '2026-12-04' } }]);
  assert.equal(apagaC([linha('a1', INI), linha('a2', '2026-12-06T11:00:00')]).final.resultado.code, 'agendamento_nao_encontrado'); // um dos dois mudou de dia: nenhum e apagado

  { // cancelar pelo `rec` (a recusa em pauta): os futuros da identificacao nao trazem a marca de serie; a fase 2 a le na agenda
    const c = { ...cfg, ambiente: 'producao', redirecionar: false, escritaLiberada: true, testeLiberado: false, humanos: [], recusaJanelaMin: 120 };
    const AGORA = Date.parse('2026-12-03T12:10:00Z');
    const fut = (ini) => ({ idAgenda: 'serie', idServico: 's1', horaInicio: ini, servico: 'corte adulto', idProfissional: 'b1' });
    const ped = { idCliente: 'c1', identificado: true, futuros: [fut(INI), fut('2026-12-11T10:00:00')],
      confirmacao_recusada: { idAgenda: 'serie', inicio: INI, servico: 'corte adulto', barbeiro: 'Pedro', idProfissional: 'b1', idCliente: 'c1', em: '2026-12-03T12:00:00Z' } };
    const f1 = g.bvGPlano(entrada({ operacao: 'cancelar', id_opcao_agendamento: 'rec' }), { opcoes: {}, pedido: ped, agora_ms: AGORA }, c).final;
    assert.deepEqual([f1.efeitos.proposta_nova.dados.recorrente, f1.efeitos.proposta_nova.dados.sim_basta, f1.efeitos.opcoes], [false, true, {}]);
    const n = g.bvGNormalizar({ ...base, ambiente: 'producao', operacao: 'cancelar', proposta_id: PC, texto_cliente: 'sim' }, c);
    const pl = g.bvGPlano(n.in, { pedido: ped, proposta: { id: PC, acao: 'cancelar', dados: f1.efeitos.proposta_nova.dados }, agora_ms: AGORA }, c);
    const serie = [INI, '2026-12-11T10:00:00'].map((x) => ({ idAgenda: 'serie', horaInicio: x, idServico: 's1', descricaoServico: 'corte adulto', idProfissional: 'b1', recorrente: true }));
    const d = g.bvGPasso(pl.st, [ok(serie)], c);
    assert.deepEqual(d.reqs, [{ m: 'DELETE', path: '/agenda/serie', qs: { data: '2026-12-04' } }]);
    const fim = g.bvGPasso(d.st, [ok({ sucesso: true })], c).final;
    assert.deepEqual([fim.resultado.cancelado, fim.efeitos.pedido.confirmacao_recusada], [true, null]); // e a recusa sai do pedido (bvgFechaRecusa)
  }

  { // revisao independente (27/11): negacao abreviada ou separada por pontuacao, mencao sem pedido, "marca"/"agenda" como sim,
    // e a serie lida na fase 2 tambem no conjunto e no antigo da troca de servico
    const dois = (t) => [g.bvgConfirmou(t, 'cancelar'), g.bvgConfirmou(t, 'cancelar', true)];
    const NEGADO = ['n cancela', 'n quero cancelar', 'ñ quero cancelar', 'nn cancela', 'naum cancela', 'cancela n', 'cancela nada', 'cancela ainda não', 'cancelar mesmo não', 'cancelar, não',
      'cancelar? não, quero remarcar', 'cancelar... não', 'cancelar jamais', 'Cancelar? Nunca', 'cancela ñ', 'antes de cancelar, tem horário na segunda?', 'no lugar de cancelar, remarca', 'invés de cancelar remarca pra segunda',
      'prefiro remarcar que cancelar', 'não cancela', 'cancela não', 'não precisa cancelar', 'ainda não cancela', 'quero remarcar, não cancelar', 'pode remarcar, só não cancela'];
    const MENCAO = ['já foi cancelado?', 'você cancelou?', 'qual a taxa de cancelamento?', 'vocês cobram se cancelar?', 'se eu desmarcar perco o horário?'];
    const PEDIDO = ['não vou poder ir, cancela', 'não, cancela', 'Não quero remarcar, pode cancelar', 'sem problema, pode cancelar', 'n vou poder ir, cancela', 'cancelar mesmo, não vou poder', 'cancela, não vou poder ir',
      'cancela', 'cancelar', 'cancele', 'eu cancelo', 'desmarca', 'desmarcar', 'desmarque', 'desmarco', 'Cancelar mesmo', 'cancelaaa', 'vou ter que cancelar', 'quero que cancele', 'vê se cancela pra mim', 'não. cancela'];
    for (const t of [...NEGADO, ...MENCAO]) assert.deepEqual(dois(t), [false, false], t);
    for (const t of PEDIDO) assert.deepEqual(dois(t), [true, true], t);
    for (const t of NEGADO.slice(0, 5)) assert.equal(fase2(t, antiga).barrado, 'cliente_nao_confirmou', t); // nem chega a agenda
    // "marca", "agenda" e "quero marcar" estao na lista do sim, mas nao sao sim ao cancelamento: nem na pergunta direta
    const diretaD = { ...antiga, sim_basta: true };
    for (const t of ['marca pra segunda então', 'quero marcar outro horário', 'agenda outro pra mim', 'pode remarcar', 'sim, marca outro']) {
      assert.deepEqual(dois(t), [false, false], t);
      assert.equal(fase2(t, diretaD).barrado, 'cliente_nao_confirmou', t);
    }
    assert.equal(g.bvgConfirmou('marca pra segunda então', 'agendar'), true); // so o cancelar mudou
    for (const t of ['sim', 'pode', 'confirmo o cancelamento']) assert.ok(fase2(t, diretaD).reqs, t);
    assert.ok(fase2('sim, cancela. Depois eu remarco', antiga).reqs); // o pedido dito segue valendo ao lado de "remarco"

    // conjunto e antigo da troca de servico: cada DELETE leva a data da ocorrencia dele, seja serie ou avulso
    const serieA = [linha('a1', INI, { recorrente: true }), linha('a1', '2026-12-11T10:00:00', { recorrente: true }), linha('a2', '2026-12-05T11:00:00')];
    const c1 = apagaC(serieA);
    assert.deepEqual(c1.reqs, [{ m: 'DELETE', path: '/agenda/a1', qs: { data: '2026-12-04' } }]);
    assert.deepEqual(g.bvGPasso(c1.st, [ok({ sucesso: true })], cfg).reqs, [{ m: 'DELETE', path: '/agenda/a2', qs: { data: '2026-12-05' } }]); // o avulso tambem
    const serieB = [linha('a1', INI), linha('a2', '2026-12-05T11:00:00'), linha('a2', '2026-12-12T11:00:00')]; // o segundo item e a serie, pelo id repetido
    const c2 = apagaC(serieB);
    assert.deepEqual(c2.reqs[0].qs, { data: '2026-12-04' });
    assert.deepEqual(g.bvGPasso(c2.st, [ok({ sucesso: true })], cfg).reqs, [{ m: 'DELETE', path: '/agenda/a2', qs: { data: '2026-12-05' } }]);
    // o antigo da troca de servico: o DELETE dele vem depois do POST, e tambem depois de um POST sem resposta (verificacao)
    const troca = { ...dadosAg, antigo: { idAgenda: 'a1', horaInicio: INI, recorrente: false, servico: 'corte adulto' } };
    const serieT = [linha('a1', INI, { recorrente: true }), linha('a1', '2026-12-11T10:00:00', { recorrente: true })];
    const delAntigo = { m: 'DELETE', path: '/agenda/a1', qs: { data: '2026-12-04' } };
    const posta = (agenda) => g.bvGPasso(f2({ operacao: 'agendar' }, prop('trocar_servico', troca)).st, [ok({ horarios: [dadosAg.hora] }), ok(agenda), ok({ horarios: [] })], cfg);
    assert.equal(posta(serieT).reqs[0].m, 'POST');
    assert.deepEqual(g.bvGPasso(posta(serieT).st, [ok({ sucesso: true, idAgenda: 'n2' })], cfg).reqs, [delAntigo]);
    const semResp = g.bvGPasso(posta(serieT).st, [resp(500, {})], cfg);
    assert.equal(semResp.reqs[0].path, '/agenda/agendamentos');
    assert.deepEqual(g.bvGPasso(semResp.st, [ok([...serieT, { idAgenda: 'n2', idServico: dadosAg.idServico, idProfissional: TESTE, horaInicio: `${dadosAg.data}T${dadosAg.hora}:00` }])], cfg).reqs, [delAntigo]);
    assert.deepEqual(g.bvGPasso(posta([linha('a1', INI)]).st, [ok({ sucesso: true, idAgenda: 'n2' })], cfg).reqs, [delAntigo]); // antigo avulso: a mesma data
    // segunda passada da revisao: o sim a pergunta direta pode trazer "agendamento" ou "marcado" (so o verbo de marcar/agendar barra);
    // o plural do pedido vale; pergunta SOBRE cancelar nao e pedido; "desmarque" negado e "mantém" nao cancelam
    for (const t of ['sim, o agendamento de sábado', 'sim, meu agendamento', 'sim, o que está marcado pra sábado', 'sim, o horário marcado', 'sim, confirmo o cancelamento do agendamento', 'pode ir desmarcando']) {
      assert.deepEqual(dois(t), [true, false], t);
      assert.ok(fase2(t, diretaD).reqs, t); // executa a pergunta direta
      assert.equal(fase2(t, antiga).final.resultado.code, 'cliente_nao_disse_cancelar', t); // nao a proposta da lista
    }
    for (const t of ['marca segunda às 20', 'tá bom, vamos remarcar', 'sim, mas quero remarcar', 'marque pra sexta', 'agende outro', 'sim, mantém o agendamento', 'pode manter o agendamento', 'sim, quero manter', 'ok, mantenha']) assert.deepEqual(dois(t), [false, false], t);
    for (const t of ['cancelem', 'cancelem pra mim', 'desmarquem', 'podem cancelar', 'pode cancelar?', 'cancela pra mim?', 'posso cancelar?', 'cancela, depois eu remarco']) assert.deepEqual(dois(t), [true, true], t);
    for (const t of ['não cancelem', 'cancelem não', 'n cancelem', 'não desmarque', 'desmarque não', 'nao desmarquem', 'como faço pra cancelar?', 'por que cancelar?', 'cancelar pra quê?', 'cancelar por quê?', 'até quando posso cancelar?',
      'posso cancelar depois se precisar?', 'dá pra cancelar depois?', 'o que acontece se eu cancelo?', 'se eu cancelo perco?', 'e se eu desmarco?']) assert.deepEqual(dois(t), [false, false], t);
  }
  console.log('graces.test.js cancelar so o que o cliente pediu ok');
}

{ // Cancelar outro agendamento com um agendamento aguardando o sim (PROD, 25/11): cliente com corte em 03/12 pediu 28/11 09:20, ouviu
  // "voce ja tem um corte em 03/12, posso confirmar mais este?" e respondeu "o do dia 03/12 pode cancelar". O modelo chamou cancelar: a
  // proposta de agendar virou substituida, o "Cancelar mesmo" apagou o de 03/12 e o de 28/11 nunca foi criado.
  const JAY = 'b623cd84-6068-4a57-9ce6-2f7d9a37a11e', PP = '55555555-5555-4555-8555-555555555555';
  const c = { ...cfg, ambiente: 'producao', escritaLiberada: true, redirecionar: false, humanos: [{ id: JAY, nome: 'Jayme' }], agendamentosMaxDia: 3, textos: { encaminhar_equipe: 'TEXTO EQUIPE' } };
  const ent = (o, cf = c) => { const n = g.bvGNormalizar({ ...base, ambiente: cf.ambiente, ...o }, cf); assert.ok(n.ok, JSON.stringify(n)); return n.in; };
  const ag03 = { opcao_id: '1', idAgenda: 'ag03', horaInicio: '2026-12-03T12:00:00', idServico: 'sv-adulto', servico: 'corte adulto', idProfissional: 'rod', profissional: 'Rodrigo', recorrente: false };
  const dPend = { idCliente: 'c1', idServico: 'sv-adulto', servico: 'corte adulto', idProfissional: 'rod', barbeiro: 'Rodrigo', data: '2026-11-28', hora: '09:20', valor: 90, minutos: 40, resumo: 'corte adulto com Rodrigo em sábado, 28/11 às 09:20 (R$ 90,00)' };
  const pend = (extra = {}, acao = 'agendar') => ({ acao, dados: { ...dPend, ...extra } });
  const ped = (extra = {}) => ({ idCliente: 'c1', agendamentos: [ag03], futuros: [{ idAgenda: 'ag03', idServico: 'sv-adulto', horaInicio: '2026-12-03T12:00:00', servico: 'corte adulto', idProfissional: 'rod' }], ...extra });
  const canc = (pendente, pedido = ped(), extra = {}, cf = c, ctx = {}) => g.bvGPlano(ent({ operacao: 'cancelar', id_opcao_agendamento: '1', ...extra }, cf), { opcoes: {}, pedido, pendente, ...ctx }, cf);
  const lista = (r, acao = 'cancelar') => assert.deepEqual([r.final.efeitos.proposta_nova.acao, r.final.efeitos.opcoes.tipo, r.final.resultado.sugerir_remarcar], [acao, 'decisao_cancelamento', true]);

  // 1. mesmo servico: sai a proposta de remarcar o agendamento para o horario que aguardava o sim, sem chamada a Graces e sem a lista
  const conv = canc(pend());
  assert.ok(!conv.reqs);
  assert.equal(conv.final.resultado.resumo, 'Remarcar corte adulto de 03/12 12:00 para sábado, 28/11 às 09:20 com Rodrigo'); // as duas pontas
  assert.deepEqual(conv.final.efeitos, { proposta_nova: { acao: 'reagendar', resumo: conv.final.resultado.resumo,
    dados: { idAgenda: 'ag03', horaInicio: '2026-12-03T12:00:00', recorrente: false, idServico: 'sv-adulto', servico: 'corte adulto', idProfissional: 'rod', barbeiro: 'Rodrigo', data: '2026-11-28', hora: '09:20', minutos: 40, resumo: conv.final.resultado.resumo } } });
  assert.match(conv.final.resultado.orientacao, /pediu para cancelar este outro: em vez do cancelamento, saiu a remarcação.*Nada foi cancelado nem marcado ainda.*Com o sim, chame reagendar só com o proposta_id\. Se ele disser que quer só cancelar.*chame cancelar de novo com o id_opcao_agendamento$/);
  assert.equal(canc(pend({ indicado: true })).final.efeitos.proposta_nova.dados.indicado, true); // a fila da vez segue contando o barbeiro indicado
  assert.equal(canc(pend(), ped(), {}, c, { dia: { agendados: 3 } }).final.efeitos.proposta_nova.acao, 'reagendar'); // remarcar nao conta no teto do dia
  // o horario e sempre o da proposta pendente (estado): um id de horario vindo na chamada nao entra
  const ofOutro = { tipo: 'horario', itens: [{ id: '7', rotulo: '15:00', valor: { data: '2026-12-10', hora: '15:00', idProfissional: 'kiel', apelido: 'Kiel', idServico: 'sv-adulto', servico: 'corte adulto', preco: 90, minutos: 40 } }] };
  assert.deepEqual(g.bvGPlano(ent({ operacao: 'cancelar', id_opcao_agendamento: '1', id_opcao_horario: '7' }), { opcoes: ofOutro, pedido: ped(), pendente: pend() }, c).final.efeitos.proposta_nova.dados.hora, '09:20');
  const ofSeq = { tipo: 'sequencia', itens: [{ id: '7', rotulo: '15:00 Kiel', valor: { data: '2026-12-10', itens: [{ idServico: 'sv-x', servico: 'barba', idProfissional: 'kiel', apelido: 'Kiel', hora: '15:00', minutos: 20, valor: 50 }] } }] };
  const comSeq = g.bvGPlano(ent({ operacao: 'cancelar', id_opcao_agendamento: '1', id_opcao_horario: '7' }), { opcoes: ofSeq, pedido: ped(), pendente: pend({ idServico: 'sv-infantil', servico: 'Corte Infantil' }) }, c);
  assert.deepEqual([!comSeq.reqs, comSeq.final.efeitos.proposta_nova.acao, comSeq.final.efeitos.proposta_nova.dados.hora], [true, 'trocar_servico', '09:20']); // nem uma sequencia ofertada
  // sem a correcao (ctx.pendente ignorado) sai a lista "Remarcar / Cancelar mesmo": e o que segue valendo sem proposta pendente
  lista(canc(undefined));
  lista(canc(null));

  // 2. o sim: a fase 2 decide pela acao da proposta, seja qual for a ferramenta que o modelo repetir (reagendar, agendar ou cancelar)
  const propR = { id: PP, acao: 'reagendar', dados: conv.final.efeitos.proposta_nova.dados };
  const fase2 = (operacao, fala, proposta = propR) => g.bvGPlano(ent({ operacao, proposta_id: PP, ...(fala === undefined ? {} : { texto_cliente: fala }) }), { pedido: ped(), proposta }, c);
  const agendaC = [{ idAgenda: 'ag03', horaInicio: '2026-12-03T12:00:00', idServico: 'sv-adulto', idProfissional: 'rod' }];
  const put = { m: 'PUT', path: '/agenda/ag03', body: { horaInicioOriginal: '2026-12-03T12:00:00', horaInicioNovo: '2026-11-28T09:20:00', idProfissional: 'rod' } };
  for (const [op, fala] of [['reagendar', 'sim'], ['agendar', 'pode confirmar'], ['cancelar', 'sim'], ['cancelar', 'Pode'], ['cancelar', 'isso'], ['cancelar', '👍']]) {
    const s = fase2(op, fala);
    assert.deepEqual(g.bvGPasso(s.st, [ok({ minutos: 40, horarios: ['09:20'] }), ok(agendaC), ok({ horarios: [] })], c).reqs, [put], `${op}: ${fala}`);
  }
  assert.equal(g.BVG_ACOES.cancelar, 'cancelar,cancelar_conjunto,reagendar,trocar_servico'); // o mapa deixa o cancelar reivindicar as duas
  // Num resumo de remarcar ou de trocar, tirar o agendamento antigo ja e o que o resumo diz: a fala que cita cancelar confirma, como
  // sempre confirmou no reagendar (revisao de 28/11: a primeira versao recusava e mandava o modelo para a lista de cancelamento)
  const CITAM = ['sim, pode cancelar o do dia 03 e pôr no dia 05', 'isso, cancela o de quinta e passa pra sábado', 'pode sim, cancela o do dia 03 e marca no sábado', 'sim, pode cancelar o do dia 03',
    'isso, cancela o do dia 03 e fica o de 28', 'ok, desmarca aquele e põe nesse', 'pode trocar, cancela o antigo'];
  for (const fala of CITAM) {
    for (const op of ['reagendar', 'agendar', 'cancelar']) {
      assert.deepEqual(g.bvGPasso(fase2(op, fala).st, [ok({ minutos: 40, horarios: ['09:20'] }), ok(agendaC), ok({ horarios: [] })], c).reqs, [put], `${op}: ${fala}`);
    }
    assert.equal(g.bvgConfirmou(fala, 'reagendar'), true, fala);
  }
  // so o cancelamento dito, sem sim nenhum, nao e sim a "posso remarcar?": nada e lido nem escrito, a proposta deixa de valer e a
  // ocorrencia fica contada. Sem a fala do turno (chamada direta), tambem nao executa
  for (const fala of ['Cancelar mesmo', 'cancela', 'Cancelar', 'desmarca', 'cancelem', 'não, só cancela', undefined]) {
    const r = fase2('cancelar', fala);
    assert.ok(!r.reqs, String(fala));
    assert.deepEqual([r.final.resultado.code, r.final.efeitos.proposta_upd, r.final.efeitos.falha.motivo], ['cliente_nao_confirmou', { id: PP, estado: 'falhou', resultado: { ok: false, code: 'cliente_nao_confirmou' } }, 'graces|cancelar_sem_confirmar'], String(fala));
    assert.match(r.final.resultado.orientacao, /nada foi feito na agenda.*chame cancelar com o id_opcao_agendamento, sem proposta_id/, String(fala));
  }
  for (const op of ['reagendar', 'agendar']) assert.equal(g.bvGNormalizar({ ...base, operacao: op, proposta_id: PP, texto_cliente: 'Cancelar mesmo' }, cfg).resultado.code, 'cliente_nao_confirmou'); // pelas outras duas, para na entrada
  // "pode remarcar" pelo cancelar para na entrada, antes de reivindicar (a proposta segue pendente): limite registrado
  assert.equal(g.bvGNormalizar({ ...base, operacao: 'cancelar', proposta_id: PP, texto_cliente: 'pode remarcar' }, cfg).resultado.code, 'cliente_nao_confirmou');
  // a regra de 27/11 nao afrouxa: a proposta de cancelar da lista segue exigindo o cancelamento dito, e o sim generico nao a executa
  const propC = { id: PP, acao: 'cancelar', dados: { idAgenda: 'ag03', horaInicio: '2026-12-03T12:00:00', recorrente: false, servico: 'corte adulto', barbeiro: 'Rodrigo', resumo: 'Cancelar corte adulto em quinta-feira, 03/12 às 12:00 com Rodrigo' } };
  for (const fala of ['sim', 'Pode', 'isso', '👍']) assert.equal(fase2('cancelar', fala, propC).final.resultado.code, 'cliente_nao_disse_cancelar', fala);
  assert.deepEqual(fase2('cancelar', 'Cancelar mesmo', propC).reqs.map((q) => q.path), ['/agenda/agendamentos']);
  // sim_geral e derivado da fala: nao entra de fora, e so existe na fase 2 do cancelar
  assert.equal(g.bvGNormalizar({ ...base, operacao: 'cancelar', proposta_id: PP, sim_geral: true }, cfg).resultado.code, 'campo_desconhecido');
  assert.deepEqual(['sim', 'Cancelar mesmo', 'sim, pode cancelar o do dia 03', 'cancela'].map((t) => g.bvGNormalizar({ ...base, operacao: 'cancelar', proposta_id: PP, texto_cliente: t }, cfg).in.sim_geral), [true, undefined, true, undefined]);
  assert.equal(g.bvGNormalizar({ ...base, operacao: 'reagendar', proposta_id: PP, texto_cliente: 'sim' }, cfg).in.sim_geral, undefined);

  // a orientacao "nenhum horário ficou reservado" e so de cancelamento (um e varios): depois de remarcar, trocar ou agendar ela nao sai
  const ate = (pl, resps) => { let r = pl; for (const x of resps) r = g.bvGPasso(r.st, x, c); return r.final; };
  const RES = /Nenhum horário ficou reservado/, rev = [ok({ minutos: 40, horarios: ['09:20'] }), ok(agendaC), ok({ horarios: [] })];
  const feitoR = ate(fase2('reagendar', 'sim'), [rev, [ok({ sucesso: true })]]).resultado;
  assert.deepEqual([feitoR.feito, RES.test(feitoR.orientacao)], ['Remarcado: corte adulto de 03/12 12:00 para sábado, 28/11 às 09:20 com Rodrigo', false]);
  const feitoA = ate(fase2('agendar', 'sim', { id: PP, acao: 'agendar', dados: dPend }), [rev, [ok({ sucesso: true, idAgenda: 'n1' })]]).resultado;
  assert.deepEqual([/^Agendado: /.test(feitoA.feito), RES.test(feitoA.orientacao)], [true, false]);
  const itensC = [{ ordem: 1, idAgenda: 'ag03', horaInicio: '2026-12-03T12:00:00', servico: 'corte adulto' }, { ordem: 2, idAgenda: 'ag10', horaInicio: '2026-12-10T12:00:00', servico: 'corte adulto' }];
  const propCC = { id: PP, acao: 'cancelar_conjunto', dados: { itens: itensC, resumo: 'Cancelar corte adulto em quinta-feira, 03/12 às 12:00 e corte adulto em quinta-feira, 10/12 às 12:00' } };
  const feitoCC = ate(fase2('cancelar', 'cancela os dois', propCC), [[ok([...agendaC, { idAgenda: 'ag10', horaInicio: '2026-12-10T12:00:00', idServico: 'sv-adulto', idProfissional: 'rod' }])], [ok({ sucesso: true })], [ok({ sucesso: true })]]).resultado;
  assert.deepEqual([/^Cancelado: /.test(feitoCC.feito), RES.test(feitoCC.orientacao)], [true, true]);

  // 3. outro servico: sai a troca (o novo entra no lugar do antigo), com o resumo das duas pontas e sem ler o pacote de novo
  const inf = { idServico: 'sv-infantil', servico: 'Corte Infantil', idProfissional: 'ph', barbeiro: 'Pedro Henrique', valor: 70 };
  const troca = canc(pend(inf));
  assert.ok(!troca.reqs);
  assert.equal(troca.final.resultado.resumo, 'Trocar serviço: Corte Infantil com Pedro Henrique em sábado, 28/11 às 09:20 (R$ 70,00), no lugar de corte adulto de 03/12 às 12:00');
  assert.deepEqual([troca.final.efeitos.proposta_nova.acao, troca.final.efeitos.proposta_nova.dados.antigo, troca.final.efeitos.opcoes, troca.final.efeitos.falha],
    ['trocar_servico', { idAgenda: 'ag03', horaInicio: '2026-12-03T12:00:00', recorrente: false, servico: 'corte adulto' }, undefined, undefined]);
  assert.match(troca.final.resultado.orientacao, /em vez do cancelamento, saiu a troca.*Com o sim, chame agendar só com o proposta_id/);
  assert.equal(canc(pend(inf), ped(), {}, c, { dia: { agendados: 3 } }).final.efeitos.proposta_nova.acao, 'trocar_servico'); // trocar nao e agendamento novo
  // a marca do pacote da proposta pendente segue (a fase 2 rele a secao); sem ela, valor avulso
  const trocaP = canc(pend({ ...inf, pacote: true })).final;
  assert.deepEqual([trocaP.efeitos.proposta_nova.dados.pacote, /\(abatido do seu pacote\), no lugar de/.test(trocaP.resultado.resumo), /sai do pacote/.test(trocaP.resultado.pacote)], [true, true, true]);
  assert.equal(troca.final.efeitos.proposta_nova.dados.pacote, undefined);
  // o sim a troca pelo cancelar: POST do novo e so depois o DELETE do antigo, na ocorrencia dele
  const propT = { id: PP, acao: 'trocar_servico', dados: troca.final.efeitos.proposta_nova.dados };
  const post = g.bvGPasso(fase2('cancelar', 'sim', propT).st, [ok({ minutos: 40, horarios: ['09:20'] }), ok(agendaC), ok({ horarios: [] })], c);
  assert.deepEqual([post.reqs[0].m, post.reqs[0].body.idServico, post.reqs[0].body.idProfissional, post.reqs[0].body.horaInicio], ['POST', 'sv-infantil', 'ph', '09:20']);
  assert.deepEqual(g.bvGPasso(post.st, [ok({ sucesso: true, idAgenda: 'n9' })], c).reqs, [{ m: 'DELETE', path: '/agenda/ag03', qs: { data: '2026-12-03' } }]);
  assert.equal(fase2('cancelar', 'Cancelar mesmo', propT).final.resultado.code, 'cliente_nao_confirmou');
  const feitoT = ate(fase2('cancelar', 'sim', propT), [rev, [ok({ sucesso: true, idAgenda: 'n9' })], [ok({ sucesso: true })]]).resultado;
  assert.deepEqual([/^Serviço trocado: /.test(feitoT.feito), RES.test(feitoT.orientacao)], [true, false]);
  // a troca tambem pelo reagendar e pelo agendar: o contexto manda chamar "a ferramenta desta ação" e trocar_servico nao e ferramenta
  assert.equal(g.BVG_ACOES.reagendar, 'reagendar,trocar_servico');
  for (const op of ['reagendar', 'agendar']) assert.equal(g.bvGPasso(fase2(op, 'sim', propT).st, [ok({ minutos: 40, horarios: ['09:20'] }), ok(agendaC), ok({ horarios: [] })], c).reqs[0].m, 'POST', op);

  // 4. NAO converte (segue o cancelar de sempre, com a lista): proposta que nao e de um agendamento so, varios agendamentos, outro
  // cadastro do telefone, o mesmo inicio, busca neste turno, proposta sem os dados do horario, e pacote x avulso do mesmo servico
  for (const acao of ['agendar_conjunto', 'reagendar', 'trocar_servico', 'cancelar', 'cancelar_conjunto', null]) lista(canc(pend({}, acao)));
  const semConv = {
    'outro cadastro': canc(pend({ idCliente: 'c2' })),
    'sem cliente na proposta': canc(pend({ idCliente: undefined })),
    'o mesmo inicio': canc(pend({ data: '2026-12-03', hora: '12:00' })),
    'busca de horario neste turno': canc(pend(), ped({ busca: { turno: T2, n: 3 } })),
    'sem data': canc(pend({ data: undefined })),
    'hora invalida': canc(pend({ hora: '9h20' })),
    'sem barbeiro': canc(pend({ idProfissional: undefined })),
    'sem nome do barbeiro': canc(pend({ barbeiro: '' })),
    'sem servico': canc(pend({ idServico: undefined })),
    'dados ausentes': canc({ acao: 'agendar' }),
    'pelo pacote, agendamento avulso do mesmo servico': canc(pend({ pacote: true })),
  };
  for (const [caso, r] of Object.entries(semConv)) { assert.equal(r.final.efeitos.proposta_nova.acao, 'cancelar', caso); assert.equal(r.final.efeitos.opcoes.tipo, 'decisao_cancelamento', caso); }
  assert.equal(canc(pend(), ped({ busca: { turno: T1, n: 3 } })).final.efeitos.proposta_nova.acao, 'reagendar'); // busca de turno anterior nao impede
  // agendamento sem id ou sem servico no estado: nao converte
  for (const falta of ['idAgenda', 'idServico']) lista(canc(pend(), ped({ agendamentos: [{ ...ag03, [falta]: undefined }] })));
  const ag10 = { ...ag03, opcao_id: '2', idAgenda: 'ag10', horaInicio: '2026-12-10T12:00:00' };
  lista(canc(pend(), ped({ agendamentos: [ag03, ag10] }), { id_opcao_agendamento: undefined, id_opcoes_agendamentos: '1,2' }), 'cancelar_conjunto');
  lista(canc(pend(), ped({ agendamentos: [ag03, ag10] }), { id_opcoes_agendamentos: '1,2' }), 'cancelar_conjunto'); // os dois campos juntos: varios
  assert.equal(canc(pend(), ped(), { id_opcao_agendamento: '9' }).final.resultado.code, 'opcao_desconhecida'); // agendamento que nao resolve: como sempre
  // agendamento do pacote: remarcar mantem a sessao (segue), e pelo pacote dos dois lados tambem
  const pedPac = ped({ agendamentos: [{ ...ag03, pacote: true }] });
  assert.deepEqual([canc(pend(), pedPac).final.efeitos.proposta_nova.acao, canc(pend(), pedPac).final.efeitos.proposta_nova.dados.pacote], ['reagendar', true]);
  assert.equal(canc(pend({ pacote: true }), pedPac).final.efeitos.proposta_nova.acao, 'reagendar');

  // 5. as barreiras de remarcar e de trocar valem para a chamada convertida
  // clausula petrea: agendamento com o barbeiro so da equipe encaminha, sem proposta e sem o nome; o horario dele tambem (defesa)
  for (const r of [canc(pend(), ped({ agendamentos: [{ ...ag03, idProfissional: JAY, profissional: 'Jayme' }] })), canc(pend(inf), ped({ agendamentos: [{ ...ag03, idProfissional: JAY, profissional: 'Jayme' }] })),
    canc(pend({ idProfissional: JAY, barbeiro: 'Jayme' })), canc(pend({ ...inf, idProfissional: JAY, barbeiro: 'Jayme' }))]) {
    assert.deepEqual([r.final.resultado.code, r.final.efeitos.proposta_nova, r.final.efeitos.pedido.handoff], ['encaminhar_equipe', undefined, true]);
    assert.ok(!JSON.stringify(r.final.resultado).includes('Jayme'));
  }
  lista(canc(undefined, ped({ agendamentos: [{ ...ag03, idProfissional: JAY, profissional: 'Jayme' }] }))); // sem proposta pendente, cancelar o dele segue como era (decisao de 17/11)
  // outro servico aguardando o sim e agendamento do pacote: a troca ficaria com a equipe ("pacote_equipe", que fala em trocar o servico
  // e se repetia a cada chamada), e o cliente pediu cancelar. Nao converte: o cancelar de sempre, com o aviso do pacote
  const pacT = canc(pend(inf), pedPac);
  lista(pacT);
  assert.match(pacT.final.resultado.pacote, /agendamento do pacote do cliente: remarcar mantém a sessão/);
  assert.equal(canc(pend({ ...inf, pacote: true }), pedPac).final.efeitos.proposta_nova.acao, 'cancelar'); // com a proposta pelo pacote tambem
  // TESTE: so se mexe em agendamento do barbeiro de teste; com ele, a conversao sai (o horario e de barbeiro real, a escrita vai ao de teste)
  assert.equal(canc(pend(), ped(), {}, cfg).final.resultado.code, 'escrita_fora_do_teste');
  const pedT = ped({ agendamentos: [{ ...ag03, idProfissional: TESTE, profissional: 'ZZ TESTE INTEGRACAO - NAO AGENDAR' }] });
  assert.equal(canc(pend(), pedT, {}, cfg).final.resultado.resumo, 'Remarcar corte adulto de 03/12 12:00 para sábado, 28/11 às 09:20 com Rodrigo');
  assert.equal(canc(pend(inf), pedT, {}, cfg).final.efeitos.proposta_nova.acao, 'trocar_servico');
  assert.equal(canc(pend({ idProfissional: TESTE }), pedT, {}, cfg).final.resultado.code, 'opcao_desconhecida'); // o barbeiro de teste nunca e o horario proposto
  // escrita desligada e cliente nao identificado: as recusas de sempre
  assert.equal(canc(pend(), ped(), {}, { ...c, escritaLiberada: false }).final.resultado.code, 'escrita_desabilitada');
  // serie recorrente: a proposta leva a ocorrencia (id e inicio) e a marca, como em toda remarcacao
  assert.equal(canc(pend(), ped({ agendamentos: [{ ...ag03, recorrente: true }] })).final.efeitos.proposta_nova.dados.recorrente, true);
  // agendamento recusado no lembrete, pelo `rec`: converte igual
  const AGORA = Date.parse('2026-11-27T15:00:00Z');
  const pedRec = { idCliente: 'c1', futuros: [{ idAgenda: 'ag03', idServico: 'sv-adulto', horaInicio: '2026-12-03T12:00:00', servico: 'corte adulto', idProfissional: 'rod' }],
    confirmacao_recusada: { idAgenda: 'ag03', em: '2026-11-27T14:30:00.000Z', inicio: '2026-12-03T12:00:00', servico: 'corte adulto', barbeiro: 'Rodrigo', idProfissional: 'rod', idCliente: 'c1' } };
  const rcv = g.bvGPlano(ent({ operacao: 'cancelar', id_opcao_agendamento: 'rec' }), { opcoes: {}, pedido: pedRec, pendente: pend(), agora_ms: AGORA }, { ...c, recusaJanelaMin: 120 }).final;
  assert.deepEqual([rcv.efeitos.proposta_nova.acao, rcv.efeitos.proposta_nova.dados.idAgenda], ['reagendar', 'ag03']);

  const ofA = { tipo: 'horario', itens: [{ id: '1', rotulo: '09:20', valor: { data: '2026-11-28', hora: '09:20', idProfissional: 'rod', apelido: 'Rodrigo', idServico: 'sv-adulto', servico: 'corte adulto', preco: 90, minutos: 40 } }] };
  // 6. O sim que so existe na oracao do cancelar nao confirma um agendamento NOVO ("o do dia 03/12 pode cancelar" passava por "pode",
  // "ok, cancela esse" por "ok"). Vale so para a proposta de agendar e de sequencia: o agendar deixa de reivindica-las (acoes), a
  // proposta segue pendente para o cancelar converter, e a recusa diz o caminho. Com um sim fora da oracao do cancelar, confirma
  const f2n = (t, op = 'agendar') => g.bvGNormalizar({ ...base, operacao: op, proposta_id: PP, texto_cliente: t }, cfg);
  const SO_NO_CANCELAR = ['pode cancelar', 'O do dia 03/12 pode cancelar', 'pode cancelar o de quinta', 'ok, cancela esse', 'sim, cancela o de quinta', 'pode desmarcar o outro', 'confirmo o cancelamento', 'cancela 👍',
    'ok, cancele esse', 'ok, cancelem o outro', 'ok, cancelo esse', 'isso, desmarque o outro', 'pode, cancelaaa o outro', 'quero o cancelamento', '[áudio transcrito] Pode cancelar o do dia três.'];
  for (const t of SO_NO_CANCELAR) {
    assert.deepEqual([f2n(t).ok, f2n(t).in.sim_no_cancelar, f2n(t).in.acoes], [true, true, 'trocar_servico,reagendar'], t);
    assert.deepEqual([f2n(t, 'reagendar').in.sim_no_cancelar, f2n(t, 'reagendar').in.acoes], [undefined, 'reagendar,trocar_servico'], t); // o reagendar so traz remarcacao e troca
    assert.equal(g.bvgConfirmou(t, 'agendar'), true, t); // a regra do sim nao mudou: a decisao e pela acao da proposta
  }
  // com um sim fora da oracao do cancelar, e nas falas que so citam cancelamento, confirma como antes (as 19 da bateria da revisao)
  const SIM_FORA = ['sim, e pode cancelar o de quinta', 'pode marcar, qualquer coisa eu cancelo', 'pode confirmar, se precisar cancelar eu aviso', 'pode, o outro já foi cancelado', 'confirma, e se chover eu cancelo',
    'sim, tem taxa de cancelamento?', 'ok, mas se eu precisar desmarcar como faço?', 'sim, o que eu tinha cancelei ontem', 'isso, já cancelei o outro pelo site', 'pode sim, até quando posso cancelar?',
    'sim! desculpa ter cancelado semana passada', 'pode marcar, cancelou o da semana passada né?', 'sim, sem cancelamento dessa vez', 'pode marcar esse, o de quinta eu já desmarquei', 'fechado, e se eu atrasar vocês cancelam?',
    'pode confirmar, dessa vez eu vou, da outra tive que cancelar', 'sim, pode confirmar. obrigado por ter cancelado o outro', 'isso mesmo, e a política de cancelamento qual é?', 'pode, só me avisa se o barbeiro cancelar',
    'ok pode marcar, se der algum problema eu desmarco com antecedência', 'pode marcar e desmarca o de sexta', 'pode, e cancele o de quinta', 'sim', 'pode', 'pode confirmar', '👍', 'marca pra segunda então'];
  for (const t of SIM_FORA) assert.deepEqual([f2n(t).ok, f2n(t).in.sim_no_cancelar, f2n(t).in.acoes], [true, undefined, 'agendar,trocar_servico,agendar_conjunto,reagendar'], t);
  // sem sim nenhum, a recusa de sempre, na entrada, com a orientacao de sempre (a do cancelar so sai pela regra acima)
  for (const t of ['Obrigado', 'cancela', 'Cancelar mesmo', 'não, pode cancelar', 'sim, pode marcar. se eu não puder ir eu desmarco']) {
    assert.deepEqual([f2n(t).ok, f2n(t).resultado.code], [false, 'cliente_nao_confirmou'], t);
    assert.match(f2n(t).resultado.orientacao, /pergunte de novo se pode confirmar$/, t);
  }
  // acoes: o mapa que o no Contexto usa para reivindicar sai daqui, so na fase 2; nenhuma das marcas entra de fora
  assert.deepEqual(['agendar', 'reagendar', 'cancelar'].map((op) => f2n('sim', op).in.acoes), [g.BVG_ACOES.agendar, g.BVG_ACOES.reagendar, g.BVG_ACOES.cancelar]);
  assert.equal(g.bvGNormalizar({ ...base, operacao: 'cancelar', proposta_id: PP }, cfg).in.acoes, g.BVG_ACOES.cancelar); // sem a fala do turno tambem
  assert.equal(g.bvGNormalizar({ ...base, operacao: 'cancelar', id_opcao_agendamento: '1', texto_cliente: 'cancela' }, cfg).in.acoes, undefined); // fase 1 nao reivindica
  for (const campo of ['acoes', 'sim_no_cancelar']) assert.equal(g.bvGNormalizar({ ...base, operacao: 'agendar', proposta_id: PP, [campo]: 'agendar' }, cfg).resultado.code, 'campo_desconhecido');
  assert.equal(f2n('pode cancelar', 'cancelar').in.sim_no_cancelar, undefined); // o cancelar nao mudou
  // a proposta de agendar nao foi reivindicada (segue pendente): a recusa diz o caminho do cancelar e fica contada; nada e alterado
  const naoReiv = (fala, info = { estado: 'pendente', mesmo_turno: false, antes_da_pergunta: false }) => g.bvGPlano(ent({ operacao: 'agendar', proposta_id: PP, texto_cliente: fala }), { pedido: ped(), info }, c).final;
  const rd = naoReiv('O do dia 03/12 pode cancelar');
  assert.deepEqual([rd.resultado.code, Object.keys(rd.efeitos), rd.efeitos.falha.motivo], ['cliente_nao_confirmou', ['falha'], 'graces|sim_so_no_cancelar']);
  assert.match(rd.resultado.orientacao, /não confirma um agendamento novo: nada foi feito na agenda e este resumo segue aguardando\. Se ele quer cancelar um agendamento que já tem, chame cancelar com o id_opcao_agendamento dele/);
  assert.equal(naoReiv('sim').resultado.code, 'proposta_expirada'); // sem a marca, a recusa de sempre
  assert.equal(naoReiv('pode cancelar', { estado: 'executada', mesmo_turno: false }).resultado.code, 'proposta_nao_pendente');
  assert.equal(naoReiv('pode cancelar', { estado: 'pendente', mesmo_turno: true }).resultado.code, 'confirmacao_no_mesmo_turno');
  // a proposta de remarcar e a de trocar seguem reivindicadas pelo agendar e executam com a mesma fala
  assert.deepEqual(g.bvGPasso(fase2('agendar', 'pode cancelar o do dia 03').st, [ok({ minutos: 40, horarios: ['09:20'] }), ok(agendaC), ok({ horarios: [] })], c).reqs, [put]);
  assert.equal(g.bvGPasso(fase2('agendar', 'pode cancelar o de quinta', propT).st, [ok({ minutos: 40, horarios: ['09:20'] }), ok(agendaC), ok({ horarios: [] })], c).reqs[0].m, 'POST');

  // 6b. Proposta de agendar do MESMO turno ("marca sábado 9h20 e cancela o do dia 03/12" numa mensagem so): agendar fase 1 e cancelar
  // no mesmo turno deixavam a proposta de agendar substituida e, no "Cancelar mesmo", a agenda vazia. Converte igual
  const doTurno = { ...pend(), mesmo_turno: true };
  const mt = canc(doTurno);
  assert.deepEqual([mt.final.resultado.resumo, mt.final.efeitos.proposta_nova.acao, mt.final.efeitos.opcoes], ['Remarcar corte adulto de 03/12 12:00 para sábado, 28/11 às 09:20 com Rodrigo', 'reagendar', undefined]);
  // a busca de horario deste turno e a que gerou a proposta: nao impede, e o horario dela nao volta a esperar a escolha do cliente
  for (const busca of [{ turno: T2, n: 3, livre: null, hora: false, outros: false }, { turno: T2, n: 3, livre: '1', hora: true, outros: true }]) {
    assert.equal(canc(doTurno, ped({ busca })).final.efeitos.proposta_nova.acao, 'reagendar');
    assert.equal(canc({ ...pend(inf), mesmo_turno: true }, ped({ busca })).final.efeitos.proposta_nova.acao, 'trocar_servico');
  }
  lista(canc({ ...pend(), mesmo_turno: false }, ped({ busca: { turno: T2, n: 3 } }))); // proposta de turno anterior e busca neste turno: o cliente esta vendo outra coisa
  // Ordem inversa no mesmo turno (cancelar e depois agendar fase 1): o cancelar sai com a lista (ainda nao ha proposta) e o agendar
  // seguinte a substitui pelo resumo do horario novo, com o aviso de que ele ja tem o outro e o caminho da troca. Nada e apagado; o
  // pedido de cancelar fica para a resposta do cliente a esse resumo (ai a proposta de agendar e de turno anterior e converte)
  const inv1 = canc(undefined);
  lista(inv1);
  const inv2 = semPacote(g.bvGPlano(ent({ operacao: 'agendar', id_opcao_horario: '1' }), { opcoes: inv1.final.efeitos.opcoes, pedido: ped({ horarios_oferta: ofA }), pendente: { acao: 'cancelar', dados: inv1.final.efeitos.proposta_nova.dados, mesmo_turno: true } }, c)).final;
  assert.deepEqual([inv2.efeitos.proposta_nova.acao, inv2.resultado.ja_tem, /não chame cancelar: chame reagendar/.test(inv2.resultado.orientacao)], ['agendar', 'corte adulto em quinta-feira, 03/12 às 12:00', true]);
  assert.equal(canc({ acao: 'agendar', dados: inv2.efeitos.proposta_nova.dados, mesmo_turno: false }).final.efeitos.proposta_nova.acao, 'reagendar'); // no turno seguinte, "pode cancelar o de 03/12" converte
  // Duas chamadas de cancelar no mesmo turno: a primeira converte; a segunda encontra a proposta de remarcar (ou de trocar) deste
  // agendamento, deste turno, e devolve o mesmo resumo, sem proposta nova e sem lista (antes a proposta de cancelar a substituia e o
  // "Cancelar mesmo" apagava o horario sem criar o novo)
  for (const [acao, dados] of [['reagendar', conv.final.efeitos.proposta_nova.dados], ['trocar_servico', troca.final.efeitos.proposta_nova.dados]]) {
    const de2 = canc({ acao, dados, mesmo_turno: true });
    assert.deepEqual([de2.final.resultado.resumo, de2.final.resultado.aguardando_confirmacao, de2.final.efeitos], [dados.resumo, true, {}], acao);
    assert.match(de2.final.resultado.orientacao, /nada foi cancelado e nenhuma lista sai.*não chame cancelar de novo neste turno/, acao);
    lista(canc({ acao, dados, mesmo_turno: false })); // no turno seguinte ("não, só cancela") sai a lista de sempre
    lista(canc({ acao, dados, mesmo_turno: true }, ped({ agendamentos: [{ ...ag03, idAgenda: 'outro' }] }))); // proposta de outro agendamento
    lista(canc({ acao, dados, mesmo_turno: true }, ped({ agendamentos: [{ ...ag03, horaInicio: '2026-12-10T12:00:00' }] }))); // outra ocorrencia da serie
    lista(canc({ acao, dados: { ...dados, resumo: undefined }, mesmo_turno: true })); // sem resumo para repetir
  }
  lista(canc({ acao: 'cancelar', dados: inv1.final.efeitos.proposta_nova.dados, mesmo_turno: true })); // cancelar repetido sem conversao: como sempre
  lista(canc({ acao: 'reagendar', dados: conv.final.efeitos.proposta_nova.dados, mesmo_turno: true }, ped({ agendamentos: [ag03, ag10] }), { id_opcoes_agendamentos: '1,2' }), 'cancelar_conjunto');

  // 7. Aviso de duplicidade para qualquer agendamento futuro (owner, 28/11) e a conversao se encontram: corte infantil no sabado com o
  // corte adulto da sexta de pe (PROD, 25/11). O resumo sai com o aviso; o cliente pede para cancelar o antigo e sai a troca, nao a lista
  const sexta = { opcao_id: '1', idAgenda: 'agsex', horaInicio: '2026-11-27T18:40:00', idServico: 'sv-adulto', servico: 'corte adulto', idProfissional: 'ph', profissional: 'Pedro Henrique', recorrente: false };
  const pedB = { idCliente: 'c2', futuros: [{ idAgenda: 'agsex', idServico: 'sv-adulto', horaInicio: '2026-11-27T18:40:00', servico: 'corte adulto', idProfissional: 'ph' }] };
  const ofSab = { tipo: 'horario', itens: [{ id: '1', rotulo: '16:00', valor: { data: '2026-11-28', hora: '16:00', idProfissional: 'ph', apelido: 'Pedro Henrique', idServico: 'sv-infantil', servico: 'Corte Infantil', preco: 70, minutos: 40 } }] };
  const aviso = semPacote(g.bvGPlano(ent({ operacao: 'agendar', id_opcao_horario: '1', turno_id: T1 }), { opcoes: ofSab, pedido: pedB }, c)).final;
  assert.equal(aviso.resultado.ja_tem, 'corte adulto em sexta-feira, 27/11 às 18:40');
  assert.match(aviso.resultado.orientacao, /não chame cancelar: chame agendar com este id_opcao_horario e substitui_id_opcao_agendamento/);
  assert.equal(aviso.efeitos.proposta_nova.acao, 'agendar');
  const depois = g.bvGPlano(ent({ operacao: 'cancelar', id_opcao_agendamento: '1' }), { opcoes: {}, pedido: { ...pedB, agendamentos: [sexta] }, pendente: { acao: 'agendar', dados: aviso.efeitos.proposta_nova.dados } }, c).final;
  assert.deepEqual([depois.efeitos.proposta_nova.acao, depois.efeitos.opcoes, depois.resultado.resumo],
    ['trocar_servico', undefined, 'Trocar serviço: Corte Infantil com Pedro Henrique em sábado, 28/11 às 16:00 (R$ 70,00), no lugar de corte adulto de 27/11 às 18:40']);
  // e o caso A inteiro, pela proposta que a fase 1 do agendar gravou: aviso do mesmo servico em outro dia, depois a remarcacao
  const avisoA = semPacote(g.bvGPlano(ent({ operacao: 'agendar', id_opcao_horario: '1', turno_id: T1 }), { opcoes: ofA, pedido: ped() }, c)).final;
  assert.match(avisoA.resultado.ja_tem, /^corte adulto em quinta-feira, 03\/12 às 12:00$/);
  assert.equal(canc({ acao: 'agendar', dados: avisoA.efeitos.proposta_nova.dados }).final.resultado.resumo, 'Remarcar corte adulto de 03/12 12:00 para sábado, 28/11 às 09:20 com Rodrigo');

  // 8. Outro servico na hora exata do agendamento que ele ja tem (PROD, 25/11: "é para meu filho", "pode ser no mesmo horário"): a
  // ferramenta dizia "um serviço a mais" e a lista saia sem a hora dele. Agora diz que trocar mantendo o horario so a equipe faz
  const infSv = { idServico: 'sv-infantil', nome: 'Corte Infantil', preco: 70, minutos: 40 };
  const pedE = { idCliente: 'c2', agendamentos: [sexta], servicos_vistos: [{ id: 's2', ...infSv }], futuros: [{ idAgenda: 'agsex', idServico: 'sv-adulto', horaInicio: '2026-11-27T18:40:00', servico: 'corte adulto', idProfissional: 'ph', fim: '19:20' }] };
  const buscaE = (extra, grades, pedido = pedE) => { const pl = g.bvGPlano(ent({ operacao: 'horarios_livres', id_opcao_servico: 's2', data: '2026-11-27', ...extra }), { opcoes: {}, pedido }, c); return g.bvGPasso(pl.st, grades, c).final; };
  const gr = (hs) => ok({ horarios: hs, minutos: 40, funcionamento: { horaFim: '21:00' } }), semOcup = ok({ horarios: [] });
  const me = buscaE({ id_opcao_agendamento: '1', hora: '18:40' }, [gr(['12:40', '13:20', '19:20']), semOcup]);
  assert.match(me.resultado.mesmo_horario, /^18:40 é o horário de corte adulto que o cliente já tem nesse dia, e a busca é de outro serviço \(Corte Infantil\)\. Trocar o serviço mantendo esse mesmo horário só a equipe faz: .*passe para a equipe ou outro horário \(os da lista vão junto\).*transferir_atendimento com motivo nao_resolvi.*substitui_id_opcao_agendamento/);
  assert.deepEqual([me.resultado.ja_tem_no_dia, /^siga mesmo_horario antes de qualquer outra coisa/.test(me.resultado.orientacao), /serviço a mais:/.test(JSON.stringify(me.resultado)), me.efeitos.opcoes.tipo], [undefined, true, false, 'horario']);
  assert.match(buscaE({ hora: '18:40' }, [gr(['12:40', '13:20']), semOcup], { ...pedE, barbeiro: { idProfissional: 'ph', apelido: 'Pedro Henrique' } }).resultado.mesmo_horario, /^18:40 é o horário/); // sem informar o agendamento tambem
  // controle: outra hora do dia segue como servico a mais; e a hora dele livre com outro barbeiro (qualquer) segue ao resumo, como antes
  const outraHora = buscaE({ id_opcao_agendamento: '1', hora: '13:20' }, [gr(['12:40', '13:20', '19:20']), semOcup]);
  assert.deepEqual([outraHora.resultado.mesmo_horario, /um serviço a mais/.test(outraHora.resultado.ja_tem_no_dia)], [undefined, true]);
  // a hora pedida nao esta na lista por estar ocupada por outra pessoa, e o agendamento dele e em outra hora do dia: servico a mais
  const ocupada = buscaE({ id_opcao_agendamento: '1', hora: '15:00' }, [gr(['12:40', '14:20', '15:40', '19:20']), semOcup]);
  assert.deepEqual([ocupada.resultado.mesmo_horario, /um serviço a mais/.test(ocupada.resultado.ja_tem_no_dia)], [undefined, true]);
  const semHora = buscaE({ id_opcao_agendamento: '1' }, [gr(['12:40', '19:20']), semOcup]);
  assert.deepEqual([semHora.resultado.mesmo_horario, /um serviço a mais/.test(semHora.resultado.ja_tem_no_dia)], [undefined, true]);
  const pedQ = { ...pedE, servico: { ...infSv, opcao_id: 's2' }, barbeiros: [{ opcao_id: '1', idProfissional: 'ph', apelido: 'Pedro Henrique' }, { opcao_id: '2', idProfissional: 'kiel', apelido: 'Kiel' }] };
  const livreOutro = buscaE({ qualquer: true, hora: '18:40' }, [gr(['12:40']), gr(['18:40']), semOcup, semOcup], pedQ);
  assert.deepEqual([livreOutro.resultado.mesmo_horario, !!livreOutro.resultado.horario_pedido_livre, /um serviço a mais/.test(livreOutro.resultado.ja_tem_no_dia)], [undefined, true, true]);
  console.log('graces.test.js cancelar com agendar pendente ok');
}
