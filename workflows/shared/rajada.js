// Logica pura da recepcao (sem rede). Incluida nos Code nodes via {{BV:INCLUDE:shared/rajada.js}}.
// Contrato: docs/specs/recepcao-buffer/contracts/webhook-chatmaster.md (so campos observados).

// queueId do evento do Chat Master (numero, texto numerico, 'null' ou ausente) -> inteiro ou null
function bvFila(b) { return b && /^\d+$/.test(String(b.queueId)) ? Number(b.queueId) : null; }

// Chamado assumido por um atendente (owner, 2026-11-25): em PROD quem assume pelo painel deixa o chamado `open` com o seu userId e
// ele continua na fila do agente (medido em 25/11: fila 107, usuario 233, agente respondendo junto). Vale como fila humana: o
// agente cala, a mensagem da equipe entra no historico e o vigia encerra depois do prazo sem interacao.
function bvAssumido(b, usuarioAgente) {
  const t = b && b.ticketData;
  return !!t && t.status === 'open' && Number.isInteger(t.userId) && t.userId > 0 && t.userId !== Number(usuarioAgente);
}
// Fila que vale para o agente: a humana quando o chamado esta assumido; senao a do evento. Sem filaHumana, so a do evento.
function bvFilaDe(b, filaHumana, usuarioAgente) {
  return filaHumana != null && bvAssumido(b, usuarioAgente) ? Number(filaHumana) : bvFila(b);
}

// Aviso de chamado encerrado: o Chat Master manda sem token_origin (fixture 24). Nao e mensagem e nada e processado; a
// recepcao responde 200 para o painel nao gravar "HTTP 401" no chamado. Com token_origin presente vale a checagem normal.
function bvEncerradoSemToken(b) { return !!b && typeof b === 'object' && b.acao === 'closed' && b.token_origin === undefined; }

// Mensagem enviada pela equipe na fila humana (from_internal, fromMe) -> { telefone, fila, id, texto, ticket } ou null. O texto de
// encaminhamento do proprio agente chega como eco ja na fila humana: nao conta como resposta da equipe.
// Fora da fila humana so conta o chamado assumido, e so a mensagem escrita por gente (painel: userId; aparelho: fromApp): o eco
// de uma resposta do agente que saiu enquanto alguem assumia nao vira fala da equipe.
function bvEquipe(b, filaHumana, textoAgente, usuarioAgente) { // ticket: chamadoId do evento (e ele que o vigia encerra)
  if (!b || b.acao !== 'from_internal' || b.fromMe !== true) return null;
  const m = b.mensagem && !Array.isArray(b.mensagem) && typeof b.mensagem === 'object' ? b.mensagem : null;
  const deGente = !!m && (m.fromApp === true || (Number.isInteger(m.userId) && m.userId > 0 && m.userId !== Number(usuarioAgente)));
  if (bvFila(b) !== Number(filaHumana) && !(bvAssumido(b, usuarioAgente) && deGente)) return null;
  if (!m || typeof b.sender !== 'string' || !b.sender || b.isGroup === true) return null;
  let texto = typeof m.body === 'string' && m.body.trim() ? m.body.slice(0, 4000) : null;
  // Midia da equipe: o body traz o nome do arquivo ("<uuid>_<n>.mp3"), que entrava no historico como se fosse a fala (17/11).
  // Fica a marca do que foi enviado; legenda de verdade (body que nao e nome de arquivo) e mantida. O agente nao ouve o audio.
  if (m.mediaUrl) {
    const mt = String(m.mediaType || '');
    const marca = /audio|ptt/i.test(mt) ? '[áudio]' : /image|sticker/i.test(mt) ? '[imagem]' : /video/i.test(mt) ? '[vídeo]' : '[arquivo]';
    texto = texto && !/\.(?:mp3|ogg|oga|opus|m4a|aac|wav|mp4|mov|webm|jpe?g|png|webp|gif|pdf|docx?|xlsx?|csv|txt|zip)$/i.test(texto.trim()) ? `${marca} ${texto}` : marca;
  }
  if (texto && textoAgente && texto.includes(String(textoAgente))) return null;
  return { telefone: b.sender, fila: Number(filaHumana), id: m.id === undefined || m.id === null ? null : String(m.id), texto, ticket: /^\d+$/.test(String(b.chamadoId)) ? Number(b.chamadoId) : null };
}

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
      // fila do ticket neste evento (owner, 2026-11-16): na fila humana, ou com o chamado assumido, o agente nao interage
      filaId: bvFilaDe(b, opcoes && opcoes.filaHumana, opcoes && opcoes.usuarioAgente),
      // id do contato no Chat Master (lembretes, owner 2026-11-15): poupa a busca pelo numero na hora de agendar
      contatoCanalId: b.ticketData && Number.isInteger(b.ticketData.contactId) && b.ticketData.contactId > 0 ? b.ticketData.contactId : null,
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

if (typeof module !== 'undefined') module.exports = { bvFila, bvAssumido, bvFilaDe, bvEncerradoSemToken, bvEquipe, bvNormalizar, deveEntregar, consolidar };
