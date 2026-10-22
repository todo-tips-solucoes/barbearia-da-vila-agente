// Alerta fora de banda (feature producao, FR-016): Postgres fora ou falhas do agente em serie (proxy de cota/gasto da
// OpenAI, sem chave de admin para ler o custo). Sem rede: o workflow bv-alerta chama e envia pelo Chat Master.

// falhas: contagem da janela (null = consulta ao Postgres falhou). -> [{tipo, texto}] (0 ou 1 item)
function bvAlertaDecidir(falhas, cfg) {
  if (falhas === null) return [{ tipo: 'postgres', texto: `[Barbearia da Vila ${cfg.rotulo}] Alerta: o Postgres não respondeu. O atendimento pode estar parado.` }];
  if (Number(falhas) >= cfg.limiar) {
    return [{ tipo: 'agente', texto: `[Barbearia da Vila ${cfg.rotulo}] Alerta: ${falhas} falhas do agente nos últimos ${cfg.janela_min} min. Pode ser cota ou gasto da OpenAI.` }];
  }
  return [];
}

// estado: staticData do workflow ({ultimo: {tipo: ms}}). Repete o mesmo tipo so depois de repetir_min.
function bvAlertaFiltrar(alertas, estado, agoraMs, cfg) {
  estado.ultimo = estado.ultimo || {};
  return alertas.filter((a) => {
    const t = estado.ultimo[a.tipo];
    if (t && agoraMs - t < cfg.repetir_min * 60000) return false;
    estado.ultimo[a.tipo] = agoraMs;
    return true;
  });
}

if (typeof module !== 'undefined') module.exports = { bvAlertaDecidir, bvAlertaFiltrar };
