// Logica pura da recepcao (sem rede). Incluida nos Code nodes via {{BV:INCLUDE:shared/rajada.js}}.
// Contrato: docs/specs/recepcao-buffer/contracts/webhook-chatmaster.md (so campos observados).

function bvNormalizar(evento, opcoes) {
  const maxKb = (opcoes && opcoes.maxKb) || 2048;
  const b = evento && evento.body;
  if (!b || typeof b !== 'object' || Array.isArray(b)) return { status: 'invalida', motivo: 'sem_body' };
  if (JSON.stringify(b).length > maxKb * 1024) return { status: 'invalida', motivo: 'acima_do_limite' };
  // So `start` e mensagem recebida; from_internal e eco da mesma mensagem e outros valores nao trazem mensagem.
  if (b.acao !== 'start' || !Array.isArray(b.mensagem)) return { status: 'descartada', motivo: 'nao_mensagem' };
  if (b.fromMe === true) return { status: 'descartada', motivo: 'enviada_pela_loja' };
  if (b.isGroup === true) return { status: 'descartada', motivo: 'grupo' };
  const m = b.mensagem[0];
  if (typeof b.sender !== 'string' || !b.sender || !m || typeof m !== 'object') {
    return { status: 'invalida', motivo: 'campos_ausentes' };
  }
  let tipo;
  if (m.type === 'text' && typeof m.text === 'string') tipo = 'texto';
  else if (m.type === 'image' && m.fileUrl) tipo = 'imagem';
  else if (m.originalData && m.originalData.audioMessage && m.fileUrl) tipo = 'audio'; // tipo do audio nao confirmado: usa a estrutura observada
  else return { status: 'descartada', motivo: 'tipo_nao_suportado' };
  const midiaUrl = tipo === 'texto' ? null : String(m.fileUrl);
  return {
    status: 'aceita',
    msg: {
      telefone: b.sender,
      tipo,
      conteudo: typeof m.text === 'string' && m.text !== '' ? m.text : null,
      midiaUrl,
      mimetype: m.fileMimeType || null,
      // shortcut: o evento `start` nao traz id de mensagem; fileUrl identifica midia, texto fica sem id, so ate o owner informar o id do canal
      idCanal: midiaUrl,
    },
  };
}

// ultimaId/minhaId: ids em mensagens.id; maisAntigaMs/agoraMs: epoch ms; tetoS: buffer.teto_s.
function deveEntregar(p) {
  if (String(p.ultimaId) === String(p.minhaId)) return true;
  return p.agoraMs - p.maisAntigaMs >= p.tetoS * 1000;
}

// Ordem de chegada: criado_em, depois id.
function consolidar(linhas) {
  return linhas.slice().sort((a, b) => {
    const d = new Date(a.criado_em) - new Date(b.criado_em);
    return d !== 0 ? d : Number(a.id) - Number(b.id);
  });
}

if (typeof module !== 'undefined') module.exports = { bvNormalizar, deveEntregar, consolidar };
