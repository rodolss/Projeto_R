// Ordem de proteção do valor recebido (spec §4.5): custo de vida, extras, despesas anuais e excedente.
import { cicloAnual } from './meses.js';

export const TIPOS_EXTRA = ['decimo-terceiro', 'ferias', 'plr', 'outro'];

export function perguntarExtra({ recebidoEfetivo, salario }) {
  return recebidoEfetivo > salario * 1.1;
}

export function calcularExcedente({
  recebido, pendenteDoMesAnterior = 0, salario, custoMensal, provisao, tipoExtra = null, anuaisFaltando,
}) {
  const recebidoEfetivo = recebido + pendenteDoMesAnterior;
  const base = Math.min(recebidoEfetivo, salario);
  let extra = Math.max(0, recebidoEfetivo - salario);

  // Férias: o excedente é salário de 30 dias + 1/3. Só o 1/3 (E/4) é extra;
  // o resto adianta o salário do mês seguinte, que virá menor.
  let guardarParaProximoMes = 0;
  if (tipoExtra === 'ferias') {
    guardarParaProximoMes = extra * 3 / 4;
    extra /= 4;
  }

  const disponivel = recebidoEfetivo - guardarParaProximoMes;
  if (disponivel <= custoMensal) {
    return {
      recebidoEfetivo, semAporte: true, motivo: 'custo-de-vida', excedente: 0, paraAnuais: 0,
      guardarParaProximoMes, paraDiaADia: disponivel,
    };
  }

  const paraAnuais = Math.min(extra, anuaisFaltando);
  const bruto = base - custoMensal - provisao + (extra - paraAnuais);
  const excedente = Math.max(0, bruto);
  return {
    recebidoEfetivo,
    semAporte: bruto <= 0,
    motivo: bruto <= 0 ? 'sem-sobra' : null,
    excedente,
    paraAnuais,
    guardarParaProximoMes,
    paraDiaADia: disponivel - excedente - paraAnuais,
  };
}

export function anuaisFaltando({ anual, contadores, mes }) {
  return Math.max(0, anual - (contadores[cicloAnual(mes)] ?? 0));
}

export function somarAoCiclo(contadores, mes, valor) {
  const ciclo = cicloAnual(mes);
  return { ...contadores, [ciclo]: (contadores[ciclo] ?? 0) + valor };
}

export function alvoReserva(custoTotal) {
  return 6 * custoTotal;
}
