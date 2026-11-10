// Saldos estimados entre atualizações (spec §4.8) e detecção de queda do mercado (spec §4.6).
import { diffMeses } from './meses.js';
import { crescer } from './financas.js';
import { fatorInflacao } from './ipca.js';

const LIMITE_QUEDA = -0.10;

export function estimarSaldo({ ultimoSaldo, aportesDepois, mesAtual, i }) {
  let valor = crescer(ultimoSaldo.valor, i, diffMeses(ultimoSaldo.mes, mesAtual));
  for (const a of aportesDepois) valor += crescer(a.valor, i, diffMeses(a.mes, mesAtual));
  return { valor, estimado: diffMeses(ultimoSaldo.mes, mesAtual) > 0 };
}

// Rentabilidade real ponderada no tempo, só com meses de saldos realmente atualizados.
export function indiceDesempenho(pontos, serieIpca) {
  const resultado = [];
  let indice = 1;
  pontos.forEach((b, k) => {
    if (k > 0) {
      const a = pontos[k - 1];
      if (a.valor > 0) {
        const nominal = (b.valor - b.aportesDesdeAnterior) / a.valor;
        indice *= nominal / fatorInflacao(serieIpca, a.mes, b.mes);
      }
    }
    resultado.push({ mes: b.mes, indice });
  });
  return resultado;
}

export function situacaoQueda(indices) {
  if (!indices.length) return { emQueda: false, mesInicio: null, quedaPct: 0 };
  let pico = -Infinity;
  let mesInicio = null;
  for (const { mes, indice } of indices) {
    if (indice > pico) {
      pico = indice;
      mesInicio = null;
    } else if (mesInicio === null && indice / pico - 1 <= LIMITE_QUEDA + 1e-12) {
      mesInicio = mes;
    }
  }
  const quedaPct = indices[indices.length - 1].indice / pico - 1;
  const emQueda = quedaPct <= LIMITE_QUEDA + 1e-12;
  return { emQueda, mesInicio: emQueda ? mesInicio : null, quedaPct };
}
