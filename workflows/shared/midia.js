// Validacao pura de midia (sem rede). Incluida nos Code nodes via {{BV:INCLUDE:shared/midia.js}}.
// Contrato: docs/specs/audio-imagem/data-model.md (codigos) e contracts/config-midia.md (chaves).

// Devolve { host, caminho } ou null. https apenas; host [a-z0-9.-], sem porta, @, \, % ou ponto final.
function bvParseUrlMidia(url) {
  if (typeof url !== 'string') return null;
  const m = /^https:\/\/([a-z0-9][a-z0-9.-]*[a-z0-9])(\/[^?#\s\\]*)?(?:[?#]\S*)?$/i.exec(url);
  if (!m || m[1].includes('..') || /(^|\/)(\.|%2e){2}(\/|$)/i.test(m[2] || '')) return null; // sem ../ no caminho (prefixo)
  return { host: m[1].toLowerCase(), caminho: m[2] || '/' };
}

// So o host (sem caminho/query) para registro de falha; null se a URL nao e valida.
function bvHostRecusado(url) {
  const p = bvParseUrlMidia(url);
  if (p) return p.host;
  const m = typeof url === 'string' && /^https?:\/\/([^/:?#@\\\s]*)/i.exec(url);
  return m && /^[a-z0-9.-]{1,253}$/i.test(m[1]) ? m[1].toLowerCase() : null;
}

function bvMimeBase(mime) {
  return typeof mime === 'string' ? mime.split(';')[0].trim().toLowerCase() : '';
}

// item: { tipo, midia_url, midia_mime, midia_segundos, midia_bytes }; cfg: chaves `midia.*` (contracts/config-midia.md).
// Retorna { ok: true } ou { ok: false, motivo } com os codigos de data-model.md.
function bvValidarMidia(item, cfg) {
  if (!item || (item.tipo !== 'audio' && item.tipo !== 'imagem')) return { ok: false, motivo: 'sem_suporte' };
  const audio = item.tipo === 'audio';
  const p = bvParseUrlMidia(item.midia_url);
  const hosts = ((audio ? cfg.hosts_audio : cfg.hosts_imagem) || []).map((h) => String(h).toLowerCase());
  const prefixos = (audio ? cfg.prefixos_audio : cfg.prefixos_imagem) || [];
  if (!p || !hosts.includes(p.host)) return { ok: false, motivo: 'host_recusado' };
  if (prefixos.length && !prefixos.some((x) => p.caminho.startsWith(x))) return { ok: false, motivo: 'host_recusado' };
  const mimes = ((audio ? cfg.mimes_audio : cfg.mimes_imagem) || []).map((x) => x.toLowerCase());
  if (!mimes.includes(bvMimeBase(item.midia_mime))) return { ok: false, motivo: 'sem_suporte' };
  if (audio && Number.isFinite(item.midia_segundos) && item.midia_segundos > cfg.audio_max_s) return { ok: false, motivo: 'longo' };
  const maxBytes = (audio ? cfg.audio_max_mb : cfg.imagem_max_mb) * 1024 * 1024;
  if (Number.isFinite(item.midia_bytes) && item.midia_bytes > maxBytes) return { ok: false, motivo: 'grande' };
  return { ok: true };
}

if (typeof module !== 'undefined') module.exports = { bvParseUrlMidia, bvHostRecusado, bvMimeBase, bvValidarMidia };
