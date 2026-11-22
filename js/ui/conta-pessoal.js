// Contas pessoais (desenho 2026-11-22-contas-pessoais): os textos e o campo "Ela tem fim?", iguais na aba Contas e nos
// Ajustes. Escolha em dois botões grandes com exemplo (como "Como você preenche esta conta?") e, com fim, quantas
// parcelas faltam contando a do mês.
import { h } from './dom.js';
import { icone } from './icones.js';
import { ultimoMesDasParcelas } from '../core/contas-pessoais.js';

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const nomeDoMes = (mes) => MESES[Number(mes.slice(5, 7)) - 1];
export const mesPorExtenso = (mes) => `${nomeDoMes(mes)} de ${mes.slice(0, 4)}`;

// A linha de explicação nos Ajustes: "todo mês", "até maio de 2028" ou "terminou em fevereiro de 2027".
export function textoDoFim(conta, mes) {
  if (!conta.ultimoMes) return 'todo mês';
  return conta.ultimoMes < mes ? `terminou em ${mesPorExtenso(conta.ultimoMes)}` : `até ${mesPorExtenso(conta.ultimoMes)}`;
}

// Sem fim, ou um valor depois da última parcela (adiantado antes de encurtar o fim): sem texto.
export const textoDasParcelas = (n) => (n == null || n < 1 ? null : n === 1 ? 'última parcela' : `faltam ${n} parcelas`);

const MAXIMO = 600; // 50 anos: cabe um financiamento

// `parcelas`: null = todo mês, sem fim. `aoMudar(parcelas|null)` a cada mudança.
export function campoDoFim({ parcelas = null, mes, aoMudar }) {
  let atual = parcelas;
  const caixa = h('div', { class: 'opcoes', role: 'radiogroup', 'aria-label': 'Ela tem fim?' });
  const quantas = h('div', { class: 'campo' });
  const opcoes = [
    { comFim: false, icone: 'repetir', titulo: 'Todo mês, sem fim', texto: 'Ex.: academia, celular, plano de saúde.' },
    { comFim: true, icone: 'historico', titulo: 'Tem fim', texto: 'Ex.: empréstimo, financiamento, parcelas.' },
  ];
  const mudar = (n) => { atual = n; aoMudar(n); desenhar(); };
  function desenharParcelas() {
    if (atual == null) { quantas.replaceChildren(); return; }
    const ultimo = h('span', { class: 'campo-dica' }, `A última é em ${mesPorExtenso(ultimoMesDasParcelas(mes, atual))}.`);
    const entrada = h('input', {
      class: 'entrada casa-parcelas', type: 'number', inputmode: 'numeric', min: '1', max: String(MAXIMO), value: String(atual),
      'aria-label': 'Quantas parcelas faltam',
      oninput: (e) => {
        const n = Math.floor(Number(e.target.value));
        if (n >= 1 && n <= MAXIMO) { atual = n; aoMudar(n); ultimo.textContent = `A última é em ${mesPorExtenso(ultimoMesDasParcelas(mes, n))}.`; }
      },
    });
    const passo = (d, aria, texto) => h('button', { type: 'button', class: 'seta-mes', 'aria-label': aria, onclick: () => mudar(Math.min(MAXIMO, Math.max(1, atual + d))) }, texto);
    quantas.replaceChildren(
      h('span', { class: 'campo-rotulo' }, `Quantas parcelas faltam, contando a de ${nomeDoMes(mes)}?`),
      h('div', { class: 'casa-passo' }, passo(-1, 'Menos parcelas', '−'), entrada, passo(1, 'Mais parcelas', '+')),
      ultimo);
  }
  function desenhar() {
    caixa.replaceChildren(...opcoes.map((o) => h('button', {
      type: 'button', class: 'opcao', role: 'radio', 'aria-checked': String(o.comFim === (atual != null)),
      onclick: () => { if (o.comFim !== (atual != null)) mudar(o.comFim ? 12 : null); },
    },
    h('span', { class: 'icone-cat cat-casa', 'aria-hidden': 'true' }, icone(o.icone)),
    h('span', { class: 'texto' }, h('b', {}, o.titulo), h('small', {}, o.texto)),
    h('span', { class: 'opcao-marca', 'aria-hidden': 'true' }))));
    desenharParcelas();
  }
  desenhar();
  return h('div', {}, h('div', { class: 'campo' }, h('span', { class: 'campo-rotulo' }, 'Ela tem fim?'), caixa), quantas);
}
