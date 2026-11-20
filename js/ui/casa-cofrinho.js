// Contas da casa · Cartão · Cofrinho (desenho 2026-11-20-ja-tenho): quanto deve ter no cofrinho do banco (o "já
// tenho" das faturas que ainda não venceram), de quais faturas, e quem ainda te deve, compra por compra. Tocar numa
// compra abre a folha dela por cima desta tela: o endereço e as folhas ficam com casa-cartao.js.
import { h, cartao } from './dom.js';
import { formatarBRL } from '../core/formato.js';

export const textoQuemDeve = (n) => (n === 0 ? 'Ninguém te deve' : n === 1 ? '1 pessoa te deve' : `${n} pessoas te devem`);

const dataCurta = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const seta = () => h('span', { class: 'seta', 'aria-hidden': 'true' }, '›');

// O botão no fim da fatura. `cofrinho`: o que cofrinhoDoCartao devolve.
export function botaoDoCofrinho({ cofrinho, aoAbrir }) {
  return h('button', { type: 'button', class: 'cartao cofrinho-botao', onclick: aoAbrir },
    h('span', { class: 'texto' },
      h('span', { class: 'rotulo' }, 'Cofrinho'),
      h('b', {}, `Deve ter ${formatarBRL(cofrinho.total)}`),
      h('small', {}, textoQuemDeve(cofrinho.devem.length))),
    seta());
}

// `nomeDaFatura(fatura)`: "janeiro" ou "janeiro de 2027"; `aoAbrirItem(item)`: um item de `devem[].itens`.
export function conteudoDoCofrinho({ cofrinho, nomeDaFatura, aoVoltar, aoAbrirItem }) {
  const linhaFatura = (x) => h('div', { class: 'casa-linha estatica' },
    h('span', { class: 'texto' }, h('b', {}, `Fatura de ${nomeDaFatura(x.fatura)}`), h('small', {}, `vence ${dataCurta(x.vence)}`)),
    h('span', { class: 'quanto' }, formatarBRL(x.valor)));
  // Compra veio da planilha sem data: só a fatura.
  const quando = (i) => (i.data ? ` · ${dataCurta(i.data)}` : i.tipo === 'fixa' ? ' · todo mês' : '');
  const linhaItem = (i) => h('button', { type: 'button', class: 'casa-linha cofrinho-item', onclick: () => aoAbrirItem(i) },
    h('span', { class: 'texto' }, h('b', {}, i.nome), h('small', {}, `Fatura de ${nomeDaFatura(i.fatura)}${quando(i)}`)),
    h('span', { class: 'quanto' }, formatarBRL(i.valor)),
    seta());
  const pessoa = (p) => [
    h('div', { class: 'casa-linha estatica cofrinho-pessoa' },
      h('span', { class: 'texto' }, h('b', {}, p.nome)),
      h('span', { class: 'quanto' }, formatarBRL(p.total))),
    ...p.itens.map(linhaItem),
  ];
  const temDevedor = cofrinho.devem.length > 0;
  return [
    h('button', { type: 'button', class: 'botao-link cofrinho-voltar', onclick: aoVoltar }, '‹ Voltar para a fatura'),
    h('h1', {}, 'Cofrinho'),
    cartao(h('div', { class: 'cofrinho-total' },
      h('div', { class: 'rotulo' }, 'Deve ter no cofrinho'),
      h('div', { class: 'valor-grande' }, formatarBRL(cofrinho.total)),
      h('p', { class: 'suave pequeno' }, 'Confira com o saldo do cofrinho no app do banco. Se não bater, alguma compra ficou sem marcar.'))),
    h('section', { class: 'cartao casa-lista' },
      h('h2', {}, 'De quais faturas'),
      cofrinho.faturas.length
        ? h('div', {}, ...cofrinho.faturas.map(linhaFatura))
        : h('p', { class: 'suave cofrinho-nota' }, 'Nada guardado nas faturas que ainda não venceram.'),
      h('p', { class: 'suave pequeno cofrinho-nota' }, 'Quando uma fatura vence, o valor dela sai daqui: foi usado para pagar.')),
    h('section', { class: 'cartao casa-lista' },
      h('h2', {}, 'Quem ainda te deve'),
      temDevedor ? h('div', {}, ...cofrinho.devem.flatMap(pessoa)) : h('p', { class: 'suave cofrinho-nota' }, 'Ninguém te deve nada.'),
      temDevedor && h('p', { class: 'suave pequeno cofrinho-nota' }, 'Toque numa compra para marcar "Já tenho" quando a pessoa pagar.')),
  ];
}
