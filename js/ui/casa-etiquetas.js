// O infográfico do fim da tela Cartão (desenho 2026-11-21-top-etiquetas): as 5 etiquetas em que o cartão mais gastou nos
// últimos 12 meses, em barras. As etiquetas saem do nome das compras (core/tags.js); a conta é do core/gastos-por-etiqueta.js.
import { h, cartao } from './dom.js';
import { formatarBRL, formatarPct } from '../core/formato.js';
import { topEtiquetas } from '../core/gastos-por-etiqueta.js';
import { nomeDoMes } from './casa.js';

const CAPITAL = (tag) => tag[0].toUpperCase() + tag.slice(1); // "avião" aparece como "Avião"
const MES_CURTO = (mes) => `${nomeDoMes(mes).slice(0, 3)}/${mes.slice(2, 4)}`;

// `ate` é a fatura aberta; o período são as 12 faturas que terminam nela.
export function graficoDasEtiquetas({ casa, cartaoId, ate, juntas = [], dona = null }) {
  const r = topEtiquetas(casa, cartaoId, ate, { juntas });
  const titulo = h('h2', {}, 'Onde mais vai o cartão');
  const periodo = h('p', { class: 'suave pequeno top-periodo' },
    `Últimos 12 meses (${MES_CURTO(r.de)} a ${MES_CURTO(r.ate)}) · por etiqueta${dona ? ` · cartão de ${dona}` : ''}`);
  if (!r.itens.length) {
    return cartao(titulo, periodo, h('p', { class: 'suave' }, 'Ainda não há compras com etiqueta neste período. Conforme você anota, as etiquetas que mais pesam aparecem aqui.'));
  }
  const maior = r.itens[0].valor;
  const lista = h('ol', { class: 'top-etiquetas' }, ...r.itens.map((x, k) => h('li', { class: 'top-linha' },
    h('span', { class: 'top-posicao', 'aria-hidden': 'true' }, String(k + 1)),
    h('div', { class: 'top-corpo' },
      h('div', { class: 'top-cima' },
        h('b', { class: 'top-nome' }, CAPITAL(x.tag)),
        h('span', { class: 'top-valor' }, formatarBRL(x.valor))),
      h('div', {
        class: 'top-barra', role: 'img',
        'aria-label': `${CAPITAL(x.tag)}: ${formatarBRL(x.valor)}, ${formatarPct(x.fracao, 0)} do total do cartão`,
      }, h('i', { style: `width:${Math.max(3, Math.round((x.valor / maior) * 100))}%` })),
      h('div', { class: 'top-baixo suave pequeno' },
        `${formatarPct(x.fracao, 0)} do cartão · ${x.vezes === 1 ? '1 lançamento' : `${x.vezes} lançamentos`}`)))));
  return cartao(
    titulo, periodo, lista,
    h('p', { class: 'suave pequeno top-nota' },
      `Total do cartão no período: ${formatarBRL(r.total)}. Uma compra com mais de uma etiqueta (como "Ração da Nami") conta inteira em cada uma.`));
}
