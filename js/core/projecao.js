// Ritmo, projeções, faixa de incerteza, status e impacto do orçamento (spec §4.9 e §4.11).
import { somarMeses, diffMeses } from './meses.js';
import { taxaMensal, mesesAteMeta } from './financas.js';

const LIMITE_MESES = 600;

function janela(historico, mesInicio, tamanho) {
  const ultimo = historico.map((h) => h.mes).sort().at(-1);
  const candidato = somarMeses(ultimo, -(tamanho - 1));
  const inicio = diffMeses(mesInicio, candidato) < 0 ? mesInicio : candidato;
  return { inicio, ultimo, meses: diffMeses(inicio, ultimo) + 1 };
}

const dentro = (mes, { inicio, ultimo }) => mes >= inicio && mes <= ultimo;

export function ritmoDeAportes({ historico, mesInicio, excedenteEsperado }) {
  const comCarteira = historico.filter((h) => h.aplicadoCarteira > 0).length;
  if (comCarteira < 3) return { valor: excedenteEsperado, fonte: 'esperado' };
  const j = janela(historico, mesInicio, 6);
  const total = historico
    .filter((h) => dentro(h.mes, j))
    .reduce((s, h) => s + h.aplicadoCarteira + h.aplicadoCaixa, 0);
  return { valor: total / j.meses, fonte: 'real' };
}

// Simula mês a mês: o aporte completa primeiro o que falta da reserva; o resto rende na carteira.
export function projetar({ patrimonio, aporteMensal, i, meta, mesAtual, reservaFaltando = 0 }) {
  let v = patrimonio;
  let falta = reservaFaltando;
  for (let m = 0; m <= LIMITE_MESES; m++) {
    if (v >= meta) return { meses: m, mes: somarMeses(mesAtual, m) };
    const paraReserva = Math.min(Math.max(aporteMensal, 0), falta);
    falta -= paraReserva;
    v = v * (1 + i) + aporteMensal - paraReserva;
  }
  return { meses: null, mes: null };
}

export function faixaProjecao({ patrimonio, aporteMensal, rentabilidade, meta, mesAtual, reservaFaltando = 0, delta = 0.02 }) {
  const com = (r) => projetar({ patrimonio, aporteMensal, i: taxaMensal(r), meta, mesAtual, reservaFaltando });
  return { otimista: com(rentabilidade + delta), central: com(rentabilidade), pessimista: com(rentabilidade - delta) };
}

export function classificarStatus({ mesProjetado, mesAlvo }) {
  if (!mesProjetado) return 'atrasado';
  const d = diffMeses(mesAlvo, mesProjetado);
  if (d <= -3) return 'adiantado';
  if (d <= 3) return 'no-caminho';
  if (d <= 12) return 'atencao';
  return 'atrasado';
}

export function acaoSugerida({ pmtNec, ritmo }) {
  const extra = pmtNec - ritmo;
  return Number.isFinite(extra) && extra > 0 ? { aporteExtra: extra } : null;
}

export function proventosMedios({ historico, mesInicio }) {
  if (!historico.length) return 0;
  const j = janela(historico, mesInicio, 12);
  const total = historico.filter((h) => dentro(h.mes, j)).reduce((s, h) => s + (h.proventos ?? 0), 0);
  return total / j.meses;
}

// Meses de diferença até a renda plena quando o custo mensal muda: a meta (que segue o salário) fica,
// e o aporte cai ou sobe junto com o custo.
export function impactoNoPrazo({ patrimonio, aporteMensal, i, metaRendaPlena, deltaCustoMensal }) {
  const antes = mesesAteMeta({ p: patrimonio, aporte: aporteMensal, i, meta: metaRendaPlena });
  const depois = mesesAteMeta({ p: patrimonio, aporte: aporteMensal - deltaCustoMensal, i, meta: metaRendaPlena });
  if (antes === null || depois === null) return null;
  return depois - antes;
}

// Os quatro cenários de mercado, em relação à premissa de rendimento real (spec v2 §4.5).
export function cenarios(premissa) {
  return [
    { id: 'ruim', nome: 'Ruim', emoji: '😟', taxa: premissa - 0.02 },
    { id: 'moderado', nome: 'Moderado', emoji: '😐', taxa: premissa - 0.01 },
    { id: 'normal', nome: 'Normal', emoji: '🙂', taxa: premissa },
    { id: 'bom', nome: 'Bom', emoji: '😄', taxa: premissa + 0.02 },
  ];
}

// Compara o tempo que falta agora com o que faltava no último lançamento de um mês anterior (spec v2 §4.4).
export function setinha({ meses, mesAtual, faltamAgora }) {
  if (faltamAgora === null || faltamAgora === undefined) return null;
  const anterior = meses.filter((m) => m.mes < mesAtual && m.previsao).sort((a, b) => (a.mes < b.mes ? -1 : 1)).at(-1);
  if (!anterior || !anterior.previsao.mesRendaPlena) return null;
  const faltava = diffMeses(anterior.mes, anterior.previsao.mesRendaPlena);
  return { delta: faltamAgora - faltava, mesComparado: anterior.mes, imediato: anterior.mes === somarMeses(mesAtual, -1) };
}
