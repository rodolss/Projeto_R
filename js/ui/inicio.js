// Início: quanto falta para a renda plena, o que os investimentos já pagam e os marcos do caminho (spec v2 §5.2).
import { h, aviso } from './dom.js';
import { anel, abreviar } from './grafico.js';
import { formatarBRL, formatarDuracao } from '../core/formato.js';
import { formatarMes, diffMeses } from '../core/meses.js';
import { calcularPainel } from '../core/motor.js';
import { precisaRevisarOrcamento } from '../core/metas.js';
import { contar } from './movimento.js';
import { renderDetalhes } from './detalhes.js';
import { comemorar } from './festa.js';
import { registrarComemoracao } from '../core/marcos.js';

let comemorando = false; // vale entre renders: impede duas comemorações ao mesmo tempo

const abreviado = (v) => `R$ ${abreviar(v)}`;
const semCentavos = (v) => formatarBRL(Math.round(v)).replace(/,00$/, '');
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

function centroDoAnel(p) {
  if (p.marcos.rendaPlena.atingido) {
    return [h('span', { class: 'rotulo' }, 'Renda plena'), h('span', { class: 'anel-grande' }, 'Você chegou'), h('span', { class: 'anel-medio' }, '🏆')];
  }
  if (p.faltam === null) {
    return [h('span', { class: 'rotulo' }, 'Faltam'), h('span', { class: 'anel-medio' }, 'mais de'), h('span', { class: 'anel-grande' }, '50 anos'),
      h('small', {}, h('a', { href: '#/simular' }, 'Veja no simulador'))];
  }
  if (p.faltam === 0) {
    return [h('span', { class: 'anel-grande' }, 'Quase lá'), h('small', {}, 'Atualize seus saldos para confirmar')];
  }
  const anos = Math.floor(p.faltam / 12);
  const meses = p.faltam % 12;
  return [
    h('span', { class: 'rotulo' }, 'Faltam'),
    h('span', { class: 'anel-grande' }, anos ? plural(anos, 'ano', 'anos') : plural(meses, 'mês', 'meses')),
    anos && meses ? h('span', { class: 'anel-medio' }, `e ${plural(meses, 'mês', 'meses')}`) : null,
    h('small', {}, 'no seu ritmo de hoje'),
  ];
}

function chipSetinha(s) {
  if (!s) return null;
  if (s.delta === 0) return h('span', { class: 'chip-setinha' }, s.imediato ? 'igual ao mês passado' : `igual a ${formatarMes(s.mesComparado)}`);
  const menos = s.delta < 0;
  const quando = s.imediato ? 'no mês passado' : `em ${formatarMes(s.mesComparado)}`;
  return h('span', { class: `chip-setinha ${menos ? 'melhor' : 'pior'}` },
    `${menos ? '▼' : '▲'} ${formatarDuracao(Math.abs(s.delta))} a ${menos ? 'menos' : 'mais'} que ${quando}`);
}

function cartaoRenda(p) {
  const valor = h('span', {}, formatarBRL(p.proventosMedios));
  const fracao = p.salario > 0 ? Math.min(1, p.proventosMedios / p.salario) : 0;
  const posCusto = p.salario > 0 ? Math.min(1, p.custoTotal / p.salario) : 0;
  const custoAbaixo = posCusto > 0.62; // perto do fim, o rótulo do custo desce para não encostar no do salário
  const cartao = h('section', { class: 'cartao renda' },
    h('p', { class: 'rotulo' }, 'Seus investimentos já te pagam'),
    h('p', { class: 'renda-valor' }, valor, h('small', {}, ' por mês')),
    h('div', { class: `renda-barra${custoAbaixo ? ' com-abaixo' : ''}`, role: 'img', 'aria-label': `${formatarBRL(p.proventosMedios)} de ${formatarBRL(p.salario)} por mês` },
      h('i', { style: `width:${(fracao * 100).toFixed(1)}%` }),
      h('span', { class: `renda-marca${custoAbaixo ? ' abaixo' : ''}`, style: `left:${(posCusto * 100).toFixed(1)}%` }, `🥇 ${semCentavos(p.custoTotal)}`),
      h('span', { class: 'renda-marca fim' }, `🏆 ${semCentavos(p.salario)}`)),
    h('p', { class: 'suave pequeno' }, p.proventosMedios > 0
      ? 'Em 🥇 eles pagam o seu custo de vida. Em 🏆, o seu salário inteiro.'
      : 'Quando seus investimentos pagarem proventos, informe na tela do Mês e eles aparecem aqui.'));
  return { cartao, valor };
}

function fileiraDeMarcos(p) {
  const m = p.marcos;
  const item = (classe, icone, titulo, sub) => h('div', { class: `marco ${classe}` },
    h('span', { class: 'marco-bola', 'aria-hidden': 'true' }, icone), h('b', {}, titulo), h('span', {}, sub));
  const situacao = (x, senao) => (x.atingido ? 'conquistada' : x.quaseLa ? 'quase lá: atualize seus saldos' : senao);
  return h('section', { class: 'cartao marcos', 'aria-label': 'Marcos do caminho' },
    item(m.reserva.atingido ? 'feito' : '', m.reserva.atingido ? '✓' : '🛡️', 'Reserva de emergência',
      m.reserva.atingido ? 'conquistada' : `faltam ${semCentavos(m.reserva.falta)}`),
    item(m.independencia.atingido ? 'feito' : '', '🥇', 'Independência', situacao(m.independencia, `em ${formatarDuracao(p.projecaoM1.meses)}`)),
    item(m.rendaPlena.atingido ? 'meta feito' : 'meta', '🏆', 'Renda plena',
      situacao(m.rendaPlena, p.projecaoM2.mes ? formatarMes(p.projecaoM2.mes) : 'mais de 50 anos')));
}

function fraseDoAlvo(p) {
  if (!p.projecaoM2.mes || p.marcos.rendaPlena.atingido) return null;
  const d = diffMeses(p.mesAlvo, p.projecaoM2.mes);
  const quando = d === 0 ? 'chega bem no alvo' : `chega ${formatarDuracao(Math.abs(d))} ${d > 0 ? 'depois' : 'antes do alvo'}`;
  return h('p', { class: 'nota' }, `Seu alvo é ${formatarMes(p.mesAlvo)}. No seu ritmo, a renda plena ${quando}. `,
    h('a', { href: '#/simular' }, 'Veja o que muda no simulador'));
}

export function render(container, ctx) {
  const { estado, hoje } = ctx;
  const p = calcularPainel({ estado, hoje });
  const fracao = p.marcos.rendaPlena.atingido ? 1 : (p.metas.rendaPlena > 0 ? p.patrimonio / p.metas.rendaPlena : 0);
  const renda = cartaoRenda(p);
  const topo = h('section', { class: 'inicio-topo' },
      h('p', { class: 'rotulo' }, 'Sua renda plena'),
      h('div', { class: 'anel', html: anel({ fracao }) }, h('div', { class: 'anel-centro' }, ...centroDoAnel(p))),
      chipSetinha(p.setinha),
      h('p', { class: 'juntou' }, 'Você já juntou ', h('b', {}, abreviado(p.patrimonio)), ` de ${abreviado(p.metas.rendaPlena)}.`));

  container.replaceChildren(...[
    topo,
    renda.cartao,
    fileiraDeMarcos(p),
    fraseDoAlvo(p),
    h('section', { class: 'cartao acao' },
      h('div', {}, h('h3', {}, 'Dia de pagamento?'), h('p', { class: 'suave' }, 'Veja quanto investir este mês e onde.')),
      h('a', { class: 'botao', href: '#/mes' }, 'Abrir')),
    precisaRevisarOrcamento(estado.config.ultimaRevisaoOrcamento, hoje.slice(0, 7))
      && aviso('atencao', 'Já faz 6 meses desde a última revisão do orçamento. ', h('a', { href: '#/orcamento' }, 'Revisar agora')),
    p.avisos.includes('ipca-indisponivel') && aviso('info', 'Ainda não tenho a inflação mais recente; as metas usam a última disponível.'),
    p.estimado && h('p', { class: 'nota' }, 'Alguns saldos são estimados a partir da última atualização.'),
    h('details', { class: 'cartao detalhes' }, h('summary', {}, 'Ver detalhes'), renderDetalhes(p, estado)),
  ].filter(Boolean));
  contar(renda.valor, p.proventosMedios, formatarBRL);

  // Comemora só depois da sincronização, com os dados mais novos: assim um marco já comemorado no outro aparelho
  // não é comemorado de novo. A data é gravada antes de o cartão aparecer.
  if (p.marcos.aComemorar.length) {
    ctx.quandoSincronizado((estadoAtual) => {
      if (comemorando || !topo.isConnected) return;
      const ids = calcularPainel({ estado: estadoAtual, hoje }).marcos.aComemorar;
      if (!ids.length) return;
      comemorando = true;
      ctx.salvar((e) => registrarComemoracao(e, ids, hoje)).catch((erro) => console.warn('Não gravei a comemoração', erro));
      comemorar(ids).then(() => { comemorando = false; });
    });
  }
}
