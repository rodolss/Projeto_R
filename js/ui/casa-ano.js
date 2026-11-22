// Contas da casa · Ano (desenho de 2026-11-19): o quadro de resumo da planilha, em linguagem simples.
// Total e média das contas, quanto cada um pagou, mês a mês e para onde foi o dinheiro.
// Barras de uma série só (uma cor, valor sempre em texto ao lado), sem legenda.
import { h, cartao } from './dom.js';
import { formatarBRL, formatarPct } from '../core/formato.js';
import { resumoDoAno, anosDisponiveis } from '../core/casa-ano.js';
import { parametroDoHash } from './rotas.js';
import { nomeDoMes } from './casa.js';

const maiuscula = (t) => t[0].toUpperCase() + t.slice(1);

export function render(container, ctx) {
  desenhar(container, ctx);
}

export function atualizar(container, ctx) {
  desenhar(container, ctx);
}

function itemComBarra({ titulo, valor, detalhe, fracao, href }) {
  const pct = Math.max(0, Math.min(1, fracao || 0)) * 100;
  return h(href ? 'a' : 'div', { class: 'barra-item', href },
    h('div', { class: 'barra-topo' }, h('b', {}, titulo), h('span', { class: 'quanto' }, valor)),
    detalhe && h('small', {}, detalhe),
    h('div', { class: 'barra-trilho', 'aria-hidden': 'true' }, h('i', { style: `width:${pct.toFixed(1)}%` })));
}

function desenhar(container, ctx) {
  const { casa, hoje } = ctx;
  if (!casa) {
    container.replaceChildren(cartao(h('p', {}, 'Ainda não há contas da casa. '), h('a', { href: '#/casa' }, 'Começar')));
    return;
  }
  const mesAtual = hoje.slice(0, 7);
  const anos = anosDisponiveis(casa, mesAtual);
  const pedido = Number(parametroDoHash(location.hash, 'ano'));
  const ano = anos.includes(pedido) ? pedido : anos.at(-1);
  const r = resumoDoAno(casa, ano, mesAtual);
  const irPara = (a) => location.replace(`#/casa-ano?ano=${a}`);

  const cabecalho = h('div', { class: 'casa-mes' },
    h('button', { type: 'button', class: 'seta-mes', 'aria-label': 'Ano anterior', disabled: ano <= anos[0], onclick: () => irPara(ano - 1) }, '‹'),
    h('h1', {}, String(ano)),
    h('button', { type: 'button', class: 'seta-mes', 'aria-label': 'Próximo ano', disabled: ano >= anos.at(-1), onclick: () => irPara(ano + 1) }, '›'));
  const ate = r.ate && Number(mesAtual.slice(0, 4)) === ano && r.ate.slice(5) !== '12'
    && h('p', { class: 'nota', style: 'margin-top:-6px' }, `Até ${nomeDoMes(r.ate)}.`);

  if (!r.meses.length) {
    container.replaceChildren(cabecalho, cartao(h('p', { class: 'suave' }, 'Nenhuma conta anotada neste ano.')));
    return;
  }

  const total = cartao(
    h('div', { class: 'rotulo' }, 'Contas no ano'),
    h('div', { class: 'valor-grande' }, formatarBRL(r.total)),
    h('div', { class: 'suave' }, `média de ${formatarBRL(r.mediaMensal)} por mês`),
    r.fatiaDaRenda != null && h('p', { style: 'margin-top:8px' }, h('b', {}, formatarPct(r.fatiaDaRenda, 0)), r.pessoas.length > 2 ? ' da renda de vocês foi para as contas.' : ' da renda dos dois foi para as contas.'));

  const pessoas = h('div', { class: 'casa-pessoas' }, ...r.pessoas.map((p) => h('section', { class: 'cartao casa-pessoa' },
    h('div', { class: 'rotulo' }, `${p.pessoa.nome} pagou`),
    h('div', { class: 'valor' }, formatarBRL(p.totalPago)),
    p.mediaPaga != null
      ? [h('div', { class: 'suave pequeno' }, `${formatarBRL(p.mediaPaga)} por mês`),
        h('div', { class: 'suave pequeno' }, `sobra ${formatarBRL(p.mediaSobra)} por mês`)]
      : h('div', { class: 'suave pequeno' }, 'sem salários anotados'))));

  const maiorMes = Math.max(...r.meses.map((m) => m.total), 0);
  const nomeDe = (id) => casa.pessoas.find((p) => p.id === id)?.nome ?? '';
  const mesAMes = h('section', { class: 'cartao casa-lista' },
    h('h2', {}, 'Mês a mês'),
    h('div', {}, ...r.meses.map((m) => itemComBarra({
      titulo: maiuscula(nomeDoMes(m.mes)),
      valor: formatarBRL(m.total),
      detalhe: m.divide ? m.pessoas.map((p) => `${nomeDe(p.pessoaId)} ${formatarBRL(p.paga)}`).join(' · ') : 'sem salários para dividir',
      fracao: maiorMes ? m.total / maiorMes : 0,
      href: `#/casa?mes=${m.mes}`,
    }))));

  const maiorPeso = r.porConta[0]?.peso ?? 0;
  const ondeFoi = r.porConta.length > 0 && h('section', { class: 'cartao casa-lista' },
    h('h2', {}, 'Para onde foi o dinheiro'),
    h('div', {}, ...r.porConta.map((c) => itemComBarra({
      titulo: c.conta.nome,
      valor: `${formatarBRL(c.total)} · ${formatarPct(c.peso, 0)}`,
      fracao: maiorPeso ? c.peso / maiorPeso : 0,
    }))));

  container.replaceChildren(...[cabecalho, ate, total, pessoas, mesAMes, ondeFoi].filter(Boolean));
}
