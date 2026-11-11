// Mais: o que se usa pouco fica junto aqui (spec v2 §5.1).
import { h } from './dom.js';

const ITENS = [
  { href: '#/orcamento', titulo: 'Orçamento', frase: 'Seu custo de vida' },
  { href: '#/historico', titulo: 'Histórico', frase: 'Mês a mês' },
  { href: '#/config', titulo: 'Ajustes', frase: 'Premissas, conexão e backup' },
];

export function render(container) {
  container.replaceChildren(
    h('h1', {}, 'Mais'),
    h('section', { class: 'cartao lista-mais' }, ...ITENS.map((item) => h('a', { href: item.href },
      h('span', {}, h('b', {}, item.titulo), h('small', {}, item.frase)),
      h('span', { class: 'seta', 'aria-hidden': 'true' }, '›')))),
  );
}
