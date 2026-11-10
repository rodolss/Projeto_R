// Painel: estou no caminho? Status, renda que a carteira já paga, projeções, gráficos e check-up.
import { h, cartao, aviso, barra } from './dom.js';
import { graficoTrajetoria, graficoZoom } from './grafico.js';
import { formatarBRL, formatarPct } from '../core/formato.js';
import { formatarMes, diffMeses } from '../core/meses.js';
import { calcularPainel } from '../core/motor.js';

const STATUS = {
  adiantado: '🔵 Adiantado',
  'no-caminho': '🟢 No caminho',
  atencao: '🟡 Um pouco abaixo do plano',
  atrasado: '🔴 Abaixo do plano',
};

const quando = (projecao) => (projecao.mes ? formatarMes(projecao.mes) : 'não alcançada nesse ritmo');

function svg(marcacao) {
  const el = h('div', { class: 'grafico' });
  el.innerHTML = marcacao; // gerado por grafico.js, sem texto do usuário
  return el;
}

function blocoStatus(p) {
  const igual = Math.abs(p.diferenca) < 1;
  const frases = [
    h('p', {}, 'Hoje você tem ', h('b', {}, formatarBRL(p.patrimonio)), '. O plano previa ', h('b', {}, formatarBRL(p.planejadoHoje)),
      ' para esta data', igual ? ': você está exatamente no plano.' : [`: ${p.diferenca > 0 ? 'sobram' : 'faltam'} `, h('b', {}, formatarBRL(Math.abs(p.diferenca))), '.']),
  ];
  if (p.projecaoM1.mes) {
    const d = diffMeses(p.mesAlvo, p.projecaoM1.mes);
    const relacao = d === 0 ? 'exatamente no alvo' : `${Math.abs(d)} ${Math.abs(d) === 1 ? 'mês' : 'meses'} ${d > 0 ? 'depois' : 'antes'} do alvo (${formatarMes(p.mesAlvo)})`;
    frases.push(h('p', {}, `No seu ritmo, a Independência chega em `, h('b', {}, formatarMes(p.projecaoM1.mes)), `, ${relacao}.`));
  } else {
    frases.push(h('p', {}, 'No ritmo atual, a Independência ', h('b', {}, 'não é alcançada'), '. Cada real a mais por mês muda isso.'));
  }
  const atrasado = p.status === 'atencao' || p.status === 'atrasado';
  let acao = null;
  if (atrasado && p.acao) {
    acao = aviso('atencao', 'Para voltar ao alvo, aporte cerca de ', h('b', {}, `${formatarBRL(p.acao.aporteExtra)} a mais por mês`), ', ou espere: uma alta da bolsa também fecha parte da diferença.');
  } else if (atrasado) {
    acao = aviso('atencao', 'Espere: uma alta da bolsa também fecha a diferença.');
  }
  return h('section', { class: `cartao status ${p.status}` }, h('h2', {}, STATUS[p.status]), ...frases, acao);
}

function blocoRenda(p) {
  const fracao = p.custoTotal > 0 ? p.proventosMedios / p.custoTotal : 0;
  const rendaAnual = p.proventosMedios * 12;
  return cartao(
    h('div', { class: 'rotulo' }, 'Sua carteira já te paga'),
    h('div', { class: 'valor-grande' }, `${formatarBRL(p.proventosMedios)}/mês`),
    h('div', { class: 'suave' }, `de ${formatarBRL(p.custoTotal)} por mês do seu custo de vida (${formatarPct(fracao)}) · seu salário: ${formatarBRL(p.salario)}`),
    barra(fracao),
    p.proventosMedios === 0 && h('p', { class: 'suave pequeno' }, 'Informe os proventos na tela do mês para acompanhar sua renda passiva crescer.'),
    p.patrimonio > 0 && rendaAnual > p.patrimonio * 0.04
      && aviso('info', 'Na aposentadoria, reinvista o que passar de 4% ao ano para proteger a carteira da inflação.'));
}

function numeros(p) {
  const card = (rotulo, valor, sub) => cartao(h('div', { class: 'rotulo' }, rotulo), h('div', { class: 'valor' }, valor), sub && h('div', { class: 'suave pequeno' }, sub));
  const pctRenda = p.custoTotal > 0 ? p.rendaNoPrazo / p.custoTotal : 0;
  return h('div', { class: 'grade' },
    card('🥇 Independência (custo de vida)', quando(p.projecaoM1),
      `Alvo: ${formatarMes(p.mesAlvo)} · faixa provável: ${quando(p.faixa.otimista)} a ${quando(p.faixa.pessimista)}`),
    card(`Renda que você teria em ${formatarMes(p.mesAlvo)}`, `${formatarBRL(p.rendaNoPrazo)}/mês`,
      `de ${formatarBRL(p.custoTotal)} desejados (${formatarPct(pctRenda, 0)})`),
    card('🏆 Renda plena (salário)', quando(p.projecaoM2), `Patrimônio de ${formatarBRL(p.metas.rendaPlena)}`),
    card('Seu ritmo de aportes', `${formatarBRL(p.ritmo.valor)}/mês`,
      `${p.ritmo.fonte === 'esperado' ? 'baseada no seu excedente esperado (ainda sem histórico)' : 'média dos últimos 6 meses'}${Number.isFinite(p.pmtNec) ? ` · necessário: ${formatarBRL(p.pmtNec)}` : ''}`),
    card('Rendimento real desde o início', p.rendimentoReal == null ? '—' : `${formatarPct(p.rendimentoReal)} a.a.`,
      p.rendimentoReal == null ? 'Aparece depois de duas atualizações de saldo.' : 'Acima da inflação · premissa do plano: 5% a.a.'));
}

function graficos(p) {
  const blocos = [cartao(
    h('h3', {}, 'Até a meta'),
    h('div', { class: 'legenda' }, h('span', { class: 'l-plano' }, 'Plano'), h('span', { class: 'l-real' }, 'Real'),
      h('span', { class: 'l-projecao' }, 'Projeção no seu ritmo'), h('span', { class: 'l-faixa' }, 'Faixa provável (3% a 7% a.a.)')),
    svg(graficoTrajetoria({ ...p.grafico, meta: p.metas.independencia, mesAlvo: p.mesAlvo })),
    h('p', { class: 'suave pequeno' }, 'A projeção usa o seu ritmo real de aportes e a rentabilidade da premissa (5% a.a. acima da inflação). A faixa mostra onde você chegaria se o mercado render entre 3% e 7% ao ano.'))];
  if (p.grafico.real.length >= 2) {
    blocos.push(cartao(
      h('h3', {}, 'Últimos meses: real × plano'),
      h('div', { class: 'legenda' }, h('span', { class: 'l-plano' }, 'Plano'), h('span', { class: 'l-real' }, 'Real')),
      svg(graficoZoom({ plano: p.grafico.plano, real: p.grafico.real }))));
  }
  return blocos;
}

export function render(container, ctx) {
  const p = calcularPainel({ estado: ctx.estado, hoje: ctx.hoje });
  container.replaceChildren(...[
    blocoStatus(p),
    blocoRenda(p),
    numeros(p),
    ...graficos(p),
    cartao(h('h3', {}, 'Check-up da carteira'), ...p.checkup.map((item) => h('div', { class: 'linha' },
      h('div', { class: 'nome' }, h('span', {}, `${item.nivel === 'ok' ? '✅' : '🟡'} ${item.texto}`))))),
    p.avisos.includes('ipca-indisponivel') && aviso('info', 'Ainda não tenho a inflação mais recente; as metas usam a última disponível.'),
    p.estimado && h('p', { class: 'suave pequeno' }, 'Alguns saldos são estimados a partir da última atualização.'),
  ].filter(Boolean));
}
