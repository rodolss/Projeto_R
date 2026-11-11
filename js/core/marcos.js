// Marcos do caminho (spec v2 §4.7): reserva de emergência → Independência → Renda plena.
// A reserva vale pelo saldo estimado (é feita de depósitos); as outras duas só com saldos confirmados.

export const MARCOS = ['reserva', 'independencia', 'rendaPlena'];

function porPatrimonio(patrimonio, meta, saldosConfirmados) {
  const alcancou = meta > 0 && patrimonio >= meta;
  return { atingido: alcancou && saldosConfirmados, quaseLa: alcancou && !saldosConfirmados };
}

export function avaliarMarcos({ reserva, alvoReserva, patrimonio, metas, saldosConfirmados, comemorados = {} }) {
  const resultado = {
    reserva: { atingido: alvoReserva > 0 && reserva >= alvoReserva, falta: Math.max(0, alvoReserva - reserva) },
    independencia: porPatrimonio(patrimonio, metas.independencia, saldosConfirmados),
    rendaPlena: porPatrimonio(patrimonio, metas.rendaPlena, saldosConfirmados),
  };
  resultado.aComemorar = MARCOS.filter((id) => resultado[id].atingido && !comemorados[id]);
  return resultado;
}

// Guarda a data da comemoração só dos marcos que ainda não tinham sido comemorados.
export function registrarComemoracao(estado, ids, data) {
  const marcos = { ...(estado.marcos ?? {}) };
  for (const id of ids) marcos[id] ??= data;
  return { ...estado, marcos };
}
