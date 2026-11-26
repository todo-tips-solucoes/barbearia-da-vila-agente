// Configuracao que varios nos usam, num lugar so (revisao de 17/11). Os placeholders BV daqui sao trocados no deploy
// (scripts/deploy-n8n.py troca tambem dentro do INCLUDE); por isso este arquivo so roda renderizado (tests: test_workflows_*.py).
// Antes: o bloco do bv-graces copiado em Normalizar, Planejar, Passo e Efeitos; o do envio em Decidir e Resultado (bv-mensagens);
// e a trava de simulacao do TESTE em Saidas, Desfecho, Montar retomada e Montar aviso.
const bvDigitos = (s) => String(s == null ? '' : s).replace(/\D/g, '');
// Lista de escrita do TESTE (null em producao = sem trava). No TESTE so esses contatos recebem de verdade no WhatsApp.
const BV_ESCRITA_TESTE = '{{BV:ambiente}}' === 'integracao' ? {{BV:teste.contatos_escrita}} : null;
// Trava de simulacao: no TESTE, contato fora da lista de escrita e simulado (a saida e gravada, nada vai ao WhatsApp).
const bvSimulado = (telefone) => !!BV_ESCRITA_TESTE && !BV_ESCRITA_TESTE.map(bvDigitos).includes(bvDigitos(telefone));
// bv-graces: telefone = o do Gatilho (contato de teste liberado ve o barbeiro de teste).
const bvGCfg = (telefone) => ({ ambiente: '{{BV:ambiente}}', redirecionar: '{{BV:teste.redirecionar_escrita}}' === 'True', testeId: '{{BV:graces.barbeiro_teste_id}}', escritaLiberada: '{{BV:graces.escrita_liberada}}' === 'True', agendamentosMaxDia: {{BV:graces.agendamentos_max_dia}}, rodizio: { ligado: '{{BV:graces.rodizio.ligado}}' === 'True' }, humanos: {{BV:graces.barbeiros_humanos}}, destaque: {{BV:graces.servicos_destaque}}, handoff: { setor_id: {{BV:handoff.setor_id}} }, textos: { encaminhar_equipe: '{{BV:textos.encaminhar_equipe}}' }, testeLiberado: {{BV:graces.teste_contatos}}.includes(bvDigitos(telefone)), cadastroLiberado: '{{BV:cadastro.liberado}}' === 'True', clienteTesteId: '{{BV:cadastro.cliente_teste_id}}', lista: { max_itens: {{BV:lista.max_itens}}, max_titulo: {{BV:lista.max_titulo}} }, encadeamento: { max_servicos: {{BV:encadeamento.max_servicos}} }, graces: { max_estagios: {{BV:graces.max_estagios}}, max_consultas_estagio: {{BV:graces.max_consultas_estagio}} } });
// bv-mensagens: envio de confirmacao, lembrete e pos-atendimento.
const bvMCfgEnvio = () => ({ wid: '{{BV:chatmaster.whatsapp_id}}', fila: '{{BV:chatmaster.queue_id}}', botao: "{{BV:textos.lista_botao}}", topo: "{{BV:textos.lista_topo}}", titulo_sim: "{{BV:mensagens.titulo_sim}}", titulo_nao: "{{BV:mensagens.titulo_nao}}", retentativas_min: {{BV:mensagens.retentativas_min}},
  textos: { confirmacao: "{{BV:textos.confirmacao}}", lembrete: "{{BV:textos.lembrete}}", pos: "{{BV:textos.pos}}" },
  teste: BV_ESCRITA_TESTE ? { testeId: '{{BV:graces.barbeiro_teste_id}}', escrita: BV_ESCRITA_TESTE } : null });
