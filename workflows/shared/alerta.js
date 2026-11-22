// Alerta fora de banda (feature producao, FR-016): Postgres fora ou falhas do agente em serie (proxy de cota/gasto da
// OpenAI, sem chave de admin para ler o custo) e WhatsApp da loja fora do ar. Sem rede: o workflow bv-alerta chama e envia pelo Chat Master.

// Estado da conexao de WhatsApp, da resposta de POST /api/whatsapp-status ({ whatsapps: [{ id, status }] }, conferida em 2026-11-21).
// null = nao deu para saber (consulta falhou ou resposta fora do formato): nao alerta. Conexao que sumiu da lista conta como fora.
function bvAlertaConexao(resp, whatsappId) {
  const l = resp && Array.isArray(resp.whatsapps) ? resp.whatsapps : null;
  if (!l) return null;
  const c = l.find((x) => x && String(x.id) === String(whatsappId));
  return c ? String(c.status || '').replace(/[^A-Za-z_]/g, '').slice(0, 30) || 'SEM_STATUS' : 'AUSENTE';
}

// falhas: contagem da janela (null = consulta ao Postgres falhou); conexao: bvAlertaConexao (ausente/null = nao avaliada).
// -> [{tipo, texto, reserva}]. reserva: a conexao da loja esta fora, entao TODO alerta desta rodada sai pela conexao reserva.
function bvAlertaDecidir(falhas, cfg, conexao) {
  const fora = conexao != null && conexao !== 'CONNECTED';
  const out = [];
  if (fora) out.push({ tipo: 'whatsapp', texto: `[Barbearia da Vila ${cfg.rotulo}] Alerta: o WhatsApp da loja está fora do ar no Chat Master (estado: ${conexao}). Os clientes ficam sem resposta até reconectar.` });
  if (falhas === null) out.push({ tipo: 'postgres', texto: `[Barbearia da Vila ${cfg.rotulo}] Alerta: o Postgres não respondeu. O atendimento pode estar parado.` });
  else if (Number(falhas) >= cfg.limiar) out.push({ tipo: 'agente', texto: `[Barbearia da Vila ${cfg.rotulo}] Alerta: ${falhas} falhas do agente nos últimos ${cfg.janela_min} min. Pode ser cota ou gasto da OpenAI.` });
  return out.map((a) => ({ ...a, reserva: fora }));
}

// estado: staticData do workflow ({ultimo: {tipo: ms}, whatsappVoltou}). Repete o mesmo tipo so depois de repetir_min.
// WhatsApp fora do ar: um alerta por queda (owner, 2026-11-22: a conexao pode ficar fora por decisao dele); so volta a
// alertar depois de a conexao ser vista no ar de novo (conexao: bvAlertaConexao desta rodada).
function bvAlertaFiltrar(alertas, estado, agoraMs, cfg, conexao) {
  estado.ultimo = estado.ultimo || {};
  if (conexao === 'CONNECTED') estado.whatsappVoltou = true;
  return alertas.filter((a) => {
    const t = estado.ultimo[a.tipo];
    if (t && (agoraMs - t < cfg.repetir_min * 60000 || (a.tipo === 'whatsapp' && !estado.whatsappVoltou))) return false;
    estado.ultimo[a.tipo] = agoraMs;
    if (a.tipo === 'whatsapp') estado.whatsappVoltou = false;
    return true;
  });
}

if (typeof module !== 'undefined') module.exports = { bvAlertaConexao, bvAlertaDecidir, bvAlertaFiltrar };
