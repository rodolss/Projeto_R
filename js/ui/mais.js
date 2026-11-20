// Mais: o que se usa pouco fica junto aqui (spec v2 §5.1). Na visão única (desenho 2026-11-20-visao-unica), o que
// não está nas cinco abas: o simulador, o ano da casa, o orçamento, o histórico e os dois ajustes.
import { h } from './dom.js';

const ITENS = [
  { href: '#/casa', titulo: 'Contas da casa', frase: 'Quanto cada um paga das contas' },
  { href: '#/orcamento', titulo: 'Orçamento', frase: 'Seu custo de vida' },
  { href: '#/historico', titulo: 'Histórico', frase: 'Mês a mês' },
  { href: '#/config', titulo: 'Ajustes', frase: 'Premissas, conexão e backup' },
];

const ITENS_UNICA = [
  { href: '#/simular', titulo: 'Simulador', frase: 'E se eu investir mais, ou render menos?' },
  { href: '#/casa-ano', titulo: 'Ano da casa', frase: 'Quanto foi para as contas no ano' },
  { href: '#/orcamento', titulo: 'Orçamento', frase: 'Seu custo de vida' },
  { href: '#/historico', titulo: 'Histórico', frase: 'Mês a mês da aposentadoria' },
  { href: '#/casa-ajustes', titulo: 'Ajustes da casa', frase: 'Pessoas, contas, cartões e perfis' },
  { href: '#/config', titulo: 'Ajustes do planejador', frase: 'Premissas, conexão e backup' },
];

export const itensDoMais = (unica) => (unica ? ITENS_UNICA : ITENS);

export function render(container, ctx) {
  container.replaceChildren(
    h('h1', {}, 'Mais'),
    h('section', { class: 'cartao lista-mais' }, ...itensDoMais(Boolean(ctx?.unica)).map((item) => h('a', { href: item.href },
      h('span', {}, h('b', {}, item.titulo), h('small', {}, item.frase)),
      h('span', { class: 'seta', 'aria-hidden': 'true' }, '›')))),
  );
}
