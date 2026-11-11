// Simulador "E se…?" (spec v2 §4.9): mexe em salário, custo de vida e aporte sem tocar nos dados.
import { projetar, cenarios } from './projecao.js';
import { taxaMensal } from './financas.js';
import { calcularMetas } from './metas.js';
import { alvoReserva } from './protecao.js';
import { somarMeses, diffMeses } from './meses.js';

const TOLERANCIA = 0.5;

// Salário e custo de vida movem o aporte junto: + R$ X de salário = + R$ X investidos; + R$ X de custo = − R$ X.
export function moverAlavanca(sim, campo, valor) {
  const v = Math.max(0, Math.round(Number(valor) || 0));
  if (campo === 'salario') return { ...sim, salario: v, aporte: Math.max(0, Math.round(sim.aporte + (v - sim.salario))) };
  if (campo === 'custo') return { ...sim, custo: v, aporte: Math.max(0, Math.round(sim.aporte - (v - sim.custo))) };
  return { ...sim, aporte: v };
}

// Menor aporte mensal que alcança a meta até `mesLimite`, com a mesma regra de projetar() (reserva primeiro).
export function aporteNecessario({ patrimonio, meta, i, mesAtual, mesLimite, reservaFaltando = 0 }) {
  const prazo = diffMeses(mesAtual, mesLimite);
  if (prazo <= 0) return Infinity;
  const chega = (aporte) => {
    const r = projetar({ patrimonio, aporteMensal: aporte, i, meta, mesAtual, reservaFaltando });
    return r.meses !== null && r.meses <= prazo;
  };
  if (chega(0)) return 0;
  let baixo = 0;
  let alto = meta + reservaFaltando;
  while (alto - baixo > TOLERANCIA) {
    const meio = (baixo + alto) / 2;
    if (chega(meio)) alto = meio;
    else baixo = meio;
  }
  return alto;
}

export function simular({ base, sim }) {
  const metas = calcularMetas({ custoTotal: sim.custo, salario: sim.salario, swr: base.swr });
  const reservaFaltando = Math.max(0, alvoReserva(sim.custo) - base.reserva);
  const projecao = (taxa, aporte) => projetar({
    patrimonio: base.patrimonio, aporteMensal: aporte, i: taxaMensal(taxa), meta: metas.rendaPlena, mesAtual: base.mesAtual, reservaFaltando,
  });
  const lista = cenarios(base.premissa).map((c) => ({ ...c, ...projecao(c.taxa, sim.aporte) }));
  const normal = lista.find((c) => c.id === 'normal');

  const consegue = Math.max(0, base.consegue + (sim.salario - base.salario) - (sim.custo - base.custoTotal));
  const necessarioAte = (mesLimite) => aporteNecessario({
    patrimonio: base.patrimonio, meta: metas.rendaPlena, i: taxaMensal(base.premissa), mesAtual: base.mesAtual, mesLimite, reservaFaltando,
  });

  const passou = diffMeses(base.mesAtual, base.mesAlvo) <= 0;
  let alvo;
  if (normal.mes !== null && normal.mes <= base.mesAlvo) {
    const necessario = passou ? 0 : necessarioAte(base.mesAlvo);
    alvo = { mes: base.mesAlvo, situacao: 'antes', necessario, aMais: Math.max(0, necessario - sim.aporte) };
  } else if (passou) {
    alvo = { mes: base.mesAlvo, situacao: 'passou', necessario: null, aMais: null };
  } else {
    const necessario = necessarioAte(base.mesAlvo);
    alvo = { mes: base.mesAlvo, situacao: necessario <= consegue ? 'cabe' : 'nao-fecha', necessario, aMais: Math.max(0, necessario - sim.aporte) };
  }

  const referencia = passou ? base.mesAtual : base.mesAlvo;
  const prazosMaiores = [60, 120].map((n) => {
    const mes = somarMeses(referencia, n);
    return { mes, necessario: necessarioAte(mes) };
  });

  return {
    metas,
    cenarios: lista,
    consegue,
    investeMaisQueConsegue: sim.aporte > consegue + TOLERANCIA,
    alvo,
    prazosMaiores,
  };
}
