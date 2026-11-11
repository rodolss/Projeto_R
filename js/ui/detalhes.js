// "Ver detalhes" do Início: os números, gráficos e o check-up que eram do Painel, em palavras simples (spec v2 §5.2).
import { h, linha } from './dom.js';
import { graficoTrajetoria, graficoZoom } from './grafico.js';
import { formatarBRL, formatarPct, formatarPctCurto } from '../core/formato.js';
import { formatarMes } from '../core/meses.js';

function svg(marcacao) {
  const el = h('div', { class: 'grafico' });
  el.innerHTML = marcacao; // gerado por grafico.js, sem texto do usuário
  return el;
}

export function renderDetalhes(p, estado) {
  const premissa = estado.config.rentabilidadeReal;
  const numeros = h('div', {},
    linha('Investido hoje', formatarBRL(p.patrimonio), 'Conta para a meta'),
    linha('Reserva de emergência', formatarBRL(p.reserva), p.marcos.reserva.atingido
      ? 'Completa: 6 meses do seu custo de vida'
      : `Faltam ${formatarBRL(p.marcos.reserva.falta)} para 6 meses do custo de vida`),
    linha('Meta da renda plena', formatarBRL(p.metas.rendaPlena), `Paga o seu salário de ${formatarBRL(p.salario)} por mês`),
    linha('Meta da Independência', formatarBRL(p.metas.independencia), `Paga o seu custo de vida de ${formatarBRL(p.custoTotal)} por mês`),
    linha('Você investe por mês', formatarBRL(p.ritmo.valor), p.ritmo.fonte === 'esperado'
      ? 'Pelo que sobra do salário (ainda sem histórico)'
      : 'Média dos últimos 6 meses'),
    linha('Seus investimentos já pagam', `${formatarBRL(p.proventosMedios)}/mês`, 'Proventos, média de até 12 meses'),
    linha('Rendimento real desde o início', p.rendimentoReal == null ? '—' : `${formatarPct(p.rendimentoReal)} ao ano`,
      p.rendimentoReal == null ? 'Aparece depois de duas atualizações de saldo' : 'Acima da inflação'),
    linha('Para chegar no alvo', Number.isFinite(p.necessarioAlvo) ? `${formatarBRL(p.necessarioAlvo)}/mês` : '—',
      `Até ${formatarMes(p.mesAlvo)}, no cenário normal`));

  const blocos = [
    numeros,
    h('div', { class: 'detalhes-grafico' },
      h('h3', {}, 'Até a renda plena'),
      h('div', { class: 'legenda' }, h('span', { class: 'l-plano' }, 'Plano'), h('span', { class: 'l-real' }, 'Real'),
        h('span', { class: 'l-projecao' }, 'Projeção no seu ritmo'), h('span', { class: 'l-faixa' }, 'Faixa: do cenário ruim ao bom')),
      svg(graficoTrajetoria({ ...p.grafico, meta: p.metas.rendaPlena, mesAlvo: p.mesAlvo })),
      h('p', { class: 'suave pequeno' }, `A projeção usa o seu ritmo e ${formatarPctCurto(premissa)} ao ano acima da inflação (o cenário normal). `
        + `A faixa vai do cenário ruim (${formatarPctCurto(premissa - 0.02)}) ao bom (${formatarPctCurto(premissa + 0.02)}).`)),
  ];
  if (p.grafico.real.length >= 2) {
    blocos.push(h('div', { class: 'detalhes-grafico' },
      h('h3', {}, 'Últimos meses: real × plano'),
      h('div', { class: 'legenda' }, h('span', { class: 'l-plano' }, 'Plano'), h('span', { class: 'l-real' }, 'Real')),
      svg(graficoZoom({ plano: p.grafico.plano, real: p.grafico.real }))));
  }
  blocos.push(h('div', {}, h('h3', {}, 'Check-up da carteira'),
    ...p.checkup.map((item) => h('div', { class: 'linha' }, h('div', { class: 'nome' }, h('span', {}, `${item.nivel === 'ok' ? '✅' : '🟡'} ${item.texto}`))))));
  return h('div', { class: 'detalhes-conteudo' }, ...blocos);
}
