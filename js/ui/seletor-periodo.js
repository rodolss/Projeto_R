// Seletor de mês, de fatura ou de ano (desenho 2026-11-22-seletor-de-mes). No teste de mesa, o "‹" grande no canto
// de cima, onde os apps põem o "Voltar", fazia a pessoa voltar um mês achando que voltava de tela. Agora, como nos
// apps de finanças e no Google Agenda: uma pílula no centro com setas pequenas coladas ao nome, e tocar no nome abre,
// logo abaixo, a grade para pular direto. A grade abre na própria tela (sem entrar no histórico): o voltar do celular
// continua saindo da tela, e trocar de mês usa location.replace.
import { h } from './dom.js';
import { icone } from './icones.js';

const CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

// Os 12 meses de um ano para a grade: os fora de [min, max] ficam desligados; `atual` é o que a tela mostra.
export function mesesDaGrade(ano, { min, max, atual }) {
  return CURTOS.map((rotulo, k) => {
    const mes = `${ano}-${String(k + 1).padStart(2, '0')}`;
    return { mes, rotulo, desligado: mes < min || mes > max, atual: mes === atual };
  });
}

// O ano tem algum mês dentro dos limites? (a seta para ele só liga assim)
export const temMesNoAno = (ano, { min, max }) => `${ano}-12` >= min && `${ano}-01` <= max;

const seta = (lado, { aria, desligado, ir }) => h('button', {
  type: 'button', class: `seta-periodo ${lado}`, 'aria-label': aria, disabled: desligado, onclick: ir,
}, icone('chevron'));

// `anterior`/`proximo`: { aria, desligado, ir }. `grade(fechar)`: o que abre ao tocar no nome. `atalho`: { texto, ir },
// o caminho de volta ao período em foco (só quando a tela mostra outro).
export function seletorDePeriodo({ rotulo, anterior, proximo, grade, atalho }) {
  const id = `grade-${Math.random().toString(36).slice(2, 8)}`;
  const caixa = h('div', { class: 'seletor-grade', id, hidden: true });
  // Sem grade (um ano só, por exemplo): o nome é só texto, sem a setinha de abrir.
  const nome = !grade ? h('span', { class: 'seletor-nome' }, rotulo) : h('button', {
    type: 'button', class: 'seletor-nome', 'aria-expanded': 'false', 'aria-controls': id,
    onclick: () => (caixa.hidden ? abrir() : fechar()),
  }, h('span', {}, rotulo), h('span', { class: 'seletor-abre', 'aria-hidden': 'true' }, icone('chevron')));
  function abrir() {
    caixa.replaceChildren(grade(fechar));
    caixa.hidden = false;
    nome.setAttribute('aria-expanded', 'true');
  }
  function fechar() {
    caixa.hidden = true;
    nome.setAttribute('aria-expanded', 'false');
  }
  return h('div', { class: 'seletor-periodo' },
    h('div', { class: 'seletor-pilula' }, seta('antes', anterior), h('h1', {}, nome), seta('depois', proximo)),
    caixa,
    atalho && h('button', { type: 'button', class: 'botao-link seletor-atalho', onclick: atalho.ir }, atalho.texto));
}

// A grade dos meses, com o ano e setas para trocar de ano.
export function gradeDeMeses({ atual, min, max, irPara }) {
  let ano = Number(atual.slice(0, 4));
  const caixa = h('div', { class: 'grade-periodo' });
  const desenhar = () => caixa.replaceChildren(
    h('div', { class: 'grade-ano' },
      seta('antes', { aria: 'Ano anterior', desligado: !temMesNoAno(ano - 1, { min, max }), ir: () => { ano -= 1; desenhar(); } }),
      h('b', {}, String(ano)),
      seta('depois', { aria: 'Próximo ano', desligado: !temMesNoAno(ano + 1, { min, max }), ir: () => { ano += 1; desenhar(); } })),
    h('div', { class: 'grade-meses' }, ...mesesDaGrade(ano, { min, max, atual }).map((m) => h('button', {
      type: 'button', disabled: m.desligado, 'aria-current': m.atual ? 'true' : null, onclick: () => irPara(m.mes),
    }, m.rotulo))));
  desenhar();
  return caixa;
}

// A grade dos anos (aba Ano).
export function gradeDeAnos({ atual, anos, irPara }) {
  return h('div', { class: 'grade-periodo' }, h('div', { class: 'grade-meses' }, ...anos.map((a) => h('button', {
    type: 'button', 'aria-current': a === atual ? 'true' : null, onclick: () => irPara(a),
  }, String(a)))));
}
