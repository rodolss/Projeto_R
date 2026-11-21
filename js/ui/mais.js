// Mais: o que se usa pouco fica junto aqui (spec v2 §5.1). Na visão única (desenho 2026-11-20-visao-unica), o que
// não está nas cinco abas: o simulador, o ano da casa, o orçamento, o histórico e os dois ajustes.
import { h } from './dom.js';
import { icone, iconeCategoria } from './icones.js';

const ITENS = [
  { href: '#/casa', titulo: 'Contas da casa', frase: 'Quanto cada um paga das contas', cat: 'casa' },
  { href: '#/orcamento', titulo: 'Orçamento', frase: 'Seu custo de vida', cat: 'salario' },
  { href: '#/historico', titulo: 'Histórico', frase: 'Mês a mês', cat: 'viagem', icone: 'historico' },
  { href: '#/config', titulo: 'Ajustes', frase: 'Premissas, conexão e backup', cat: 'outro', icone: 'ajustes' },
];

const ITENS_UNICA = [
  { href: '#/simular', titulo: 'Simulador', frase: 'E se eu investir mais, ou render menos?', cat: 'mercado', icone: 'investir' },
  { href: '#/casa-ano', titulo: 'Ano da casa', frase: 'Quanto foi para as contas no ano', cat: 'conexao', icone: 'grafico' },
  { href: '#/orcamento', titulo: 'Custo de vida', frase: 'O que saiu nos últimos meses, pelo Balanço', cat: 'casa', icone: 'recibo' },
  { href: '#/historico', titulo: 'Histórico', frase: 'Mês a mês da aposentadoria', cat: 'viagem', icone: 'historico' },
  { href: '#/casa-ajustes', titulo: 'Ajustes', frase: 'Pessoas, contas, cartões, perfis e o plano', cat: 'outro', icone: 'ajustes' },
];

// O selo de cada item (facelift): a cor da categoria com o ícone próprio do item, quando tem.
function iconeDoItem(item) {
  const selo = iconeCategoria(item.cat ?? 'outro');
  if (item.icone) selo.replaceChildren(icone(item.icone));
  return selo;
}

export const itensDoMais = (unica) => (unica ? ITENS_UNICA : ITENS);

export function render(container, ctx) {
  container.replaceChildren(
    h('h1', {}, 'Mais'),
    h('section', { class: 'cartao lista-mais' }, ...itensDoMais(Boolean(ctx?.unica)).map((item) => h('a', { href: item.href },
      iconeDoItem(item),
      h('span', {}, h('b', {}, item.titulo), h('small', {}, item.frase)),
      h('span', { class: 'seta', 'aria-hidden': 'true' }, '›')))),
  );
}
