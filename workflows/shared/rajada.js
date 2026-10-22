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
  // Liberacao gradual (producao): lista nao vazia = so esses numeros sao atendidos; os demais nao geram gravacao nem resposta.
  const lib = (opcoes && Array.isArray(opcoes.liberados)) ? opcoes.liberados.map((x) => String(x).replace(/\D/g, '')) : [];
  if (lib.length && !lib.includes(b.sender.replace(/\D/g, ''))) return { status: 'descartada', motivo: 'nao_liberado' };
  const od = m.originalData && typeof m.originalData === 'object' ? m.originalData : {};
  const eAudio = (typeof m.type === 'string' && m.type.startsWith('audio/')) || !!od.audioMessage;
  const bloco = eAudio ? od.audioMessage : od.imageMessage;
  let tipo;
  if (m.type === 'text' && typeof m.text === 'string') tipo = 'texto';
  else if (!m.fileUrl) return { status: 'descartada', motivo: 'tipo_nao_suportado' };
  else if (eAudio) tipo = 'audio'; // FR-003: type audio/* OU audioMessage; formato decidido por fileMimeType, nunca pela extensao
  else if (m.type === 'image' && od.imageMessage) tipo = 'imagem';
  else tipo = 'outro'; // video/documento/etc: gravado e respondido (D10), nenhum outro campo lido
  const midiaUrl = tipo === 'texto' ? null : String(m.fileUrl);
  const num = (x) => (Number.isFinite(Number(x)) && x !== null && x !== '' ? Number(x) : null);
  return {
    status: 'aceita',
    msg: {
      telefone: b.sender,
      ticketId: Number.isInteger(b.chamadoId) ? b.chamadoId : null,
      tipo,
      conteudo: typeof m.text === 'string' && m.text !== '' ? m.text : null,
      midiaUrl,
      mimetype: m.fileMimeType || null,
      midiaMime: tipo === 'texto' ? null : (typeof m.fileMimeType === 'string' ? m.fileMimeType : null),
      midiaSegundos: tipo === 'audio' && bloco ? num(bloco.seconds) : null,
      midiaBytes: (tipo === 'audio' || tipo === 'imagem') && bloco ? num(bloco.fileLength) : null,
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
