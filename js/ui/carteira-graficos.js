// Gráficos da Carteira (desenho 2026-11-22-carteira), pela skill de dataviz: linhas de 2px, área a ~10%, colunas de no
// máximo 24px com ponta arredondada e base reta, grade fina, rótulos só onde importam, toque/passar mostra os valores
// e uma tabela por baixo. As cores vêm de variáveis do tema (claro e escuro validados).
import { h } from './dom.js';
import { abreviar } from './grafico.js';
import { formatarBRL } from '../core/formato.js';

const NS = 'http://www.w3.org/2000/svg';
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const r1 = (v) => Math.round(v * 10) / 10;

// As marcas do eixo, sem arredondar errado (2.500 é "2,5 mil": o abreviar() arredonda para "3 mil").
export function rotuloDoEixo(v) {
  const fmt = (x) => x.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  if (Math.abs(v) >= 1e6) return `${fmt(v / 1e6)} mi`;
  if (Math.abs(v) >= 1e3) return `${fmt(v / 1e3)} mil`;
  return fmt(v);
}

export const rotuloDoMes = (mes) => `${MESES[Number(mes.slice(5, 7)) - 1]}/${mes.slice(2, 4)}`;

// O próximo número redondo acima do maior valor (1, 2, 2,5, 5 × 10^n): o topo do eixo.
export function topoDaEscala(max) {
  if (!(max > 0)) return 1;
  const base = 10 ** Math.floor(Math.log10(max));
  return [1, 2, 2.5, 5, 10].map((f) => f * base).find((v) => v >= max - 1e-9);
}

function svg(tag, attrs = {}, ...filhos) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null) el.setAttribute(k, String(v));
  el.append(...filhos.flat().filter(Boolean));
  return el;
}

// O balão de valores: aparece sobre o gráfico, perto do ponto tocado, sem sair das bordas.
function balao(caixa) {
  const el = h('div', { class: 'grafico-balao', role: 'status', hidden: true });
  caixa.append(el);
  return {
    mostrar(xPct, linhas) {
      el.replaceChildren(...linhas);
      el.hidden = false;
      el.style.left = `${Math.min(Math.max(xPct, 18), 82)}%`;
    },
    esconder() { el.hidden = true; },
  };
}

const tabela = (titulo, colunas, linhas) => h('details', { class: 'grafico-tabela' },
  h('summary', {}, 'Ver em tabela'),
  h('table', {}, h('caption', { class: 'so-leitor' }, titulo),
    h('thead', {}, h('tr', {}, ...colunas.map((c) => h('th', { scope: 'col' }, c)))),
    h('tbody', {}, ...linhas.map((l) => h('tr', {}, ...l.map((v, k) => h(k ? 'td' : 'th', k ? {} : { scope: 'row' }, v)))))));

// Evolução: patrimônio (linha de destaque com área) contra o total aplicado (linha cinza), um ponto por mês.
// Desenhados na largura de um celular (360): o texto do eixo sai em ~12px de verdade na tela.
export function graficoEvolucao(pontos) {
  const L = 360;
  const A = 190;
  const m = { esq: 46, dir: 10, topo: 12, base: 24 };
  const topo = topoDaEscala(Math.max(...pontos.map((p) => Math.max(p.patrimonio, p.aplicado))));
  const n = pontos.length;
  const x = (k) => m.esq + (n > 1 ? k / (n - 1) : 0.5) * (L - m.esq - m.dir);
  const y = (v) => A - m.base - (Math.max(0, v) / topo) * (A - m.topo - m.base);
  const linha = (campo) => pontos.map((p, k) => `${k ? 'L' : 'M'}${r1(x(k))},${r1(y(p[campo]))}`).join(' ');
  const grade = [0, topo / 2, topo].map((v) => [
    svg('line', { class: 'g-grade', x1: m.esq, x2: L - m.dir, y1: r1(y(v)), y2: r1(y(v)) }),
    svg('text', { class: 'g-eixo', x: m.esq - 8, y: r1(y(v) + 4), 'text-anchor': 'end' }, rotuloDoEixo(v)),
  ]);
  const marcas = [0, Math.floor((n - 1) / 2), n - 1].filter((k, i, a) => a.indexOf(k) === i)
    .map((k) => svg('text', { class: 'g-eixo', x: r1(x(k)), y: A - 6, 'text-anchor': k === 0 ? 'start' : k === n - 1 ? 'end' : 'middle' }, rotuloDoMes(pontos[k].mes)));
  const cruz = svg('line', { class: 'g-cruz', y1: m.topo, y2: A - m.base, visibility: 'hidden' });
  const pontoP = svg('circle', { class: 'g-ponto g-patrimonio-ponto', r: 5, visibility: 'hidden' });
  const pontoA = svg('circle', { class: 'g-ponto g-aplicado-ponto', r: 5, visibility: 'hidden' });
  const desenho = svg('svg', { viewBox: `0 0 ${L} ${A}`, class: 'g-svg', role: 'img', 'aria-label': `Evolução do patrimônio de ${rotuloDoMes(pontos[0].mes)} a ${rotuloDoMes(pontos[n - 1].mes)}: de ${formatarBRL(pontos[0].patrimonio)} a ${formatarBRL(pontos[n - 1].patrimonio)}` },
    ...grade,
    svg('path', { class: 'g-area', d: `${linha('patrimonio')} L${r1(x(n - 1))},${r1(y(0))} L${r1(x(0))},${r1(y(0))} Z` }),
    svg('path', { class: 'g-linha g-aplicado', d: linha('aplicado') }),
    svg('path', { class: 'g-linha g-patrimonio', d: linha('patrimonio') }),
    svg('circle', { class: 'g-ponto g-patrimonio-ponto', r: 5, cx: r1(x(n - 1)), cy: r1(y(pontos[n - 1].patrimonio)) }),
    ...marcas, cruz, pontoA, pontoP);
  const caixa = h('div', { class: 'grafico-caixa' }, desenho);
  const b = balao(caixa);
  const mostrar = (evento) => {
    const caixaR = desenho.getBoundingClientRect();
    const px = ((evento.clientX - caixaR.left) / caixaR.width) * L;
    const k = Math.round(Math.min(Math.max((px - m.esq) / ((L - m.esq - m.dir) / Math.max(1, n - 1)), 0), n - 1));
    const p = pontos[k];
    for (const [el, cx, cy] of [[cruz, x(k)], [pontoP, x(k), y(p.patrimonio)], [pontoA, x(k), y(p.aplicado)]]) {
      el.setAttribute('visibility', 'visible');
      if (el === cruz) { el.setAttribute('x1', r1(cx)); el.setAttribute('x2', r1(cx)); } else { el.setAttribute('cx', r1(cx)); el.setAttribute('cy', r1(cy)); }
    }
    b.mostrar((x(k) / L) * 100, [h('b', {}, rotuloDoMes(p.mes)),
      h('span', {}, h('i', { class: 'chave chave-patrimonio' }), 'Patrimônio ', h('b', {}, formatarBRL(p.patrimonio))),
      h('span', {}, h('i', { class: 'chave chave-aplicado' }), 'Aplicado ', h('b', {}, formatarBRL(p.aplicado)))]);
  };
  const esconder = () => { b.esconder(); for (const el of [cruz, pontoP, pontoA]) el.setAttribute('visibility', 'hidden'); };
  desenho.addEventListener('pointermove', mostrar);
  desenho.addEventListener('pointerdown', mostrar);
  // No toque, o navegador dispara pointerleave logo depois de soltar: o balão fica até o próximo toque.
  desenho.addEventListener('pointerleave', (e) => { if (e.pointerType !== 'touch') esconder(); });
  return h('div', { class: 'grafico-carteira' },
    h('div', { class: 'grafico-legenda' }, h('span', {}, h('i', { class: 'chave chave-patrimonio' }), 'Patrimônio'), h('span', {}, h('i', { class: 'chave chave-aplicado' }), 'Total aplicado')),
    caixa,
    tabela('Evolução do patrimônio', ['Mês', 'Patrimônio', 'Aplicado'], [...pontos].reverse().map((p) => [rotuloDoMes(p.mes), formatarBRL(p.patrimonio), formatarBRL(p.aplicado)])));
}

// Proventos: uma coluna por mês (uma cor só), o valor só na maior; tocar mostra o do mês.
export function colunasProventos(meses) {
  const L = 360;
  const A = 170;
  const m = { esq: 40, dir: 6, topo: 22, base: 24 };
  const topo = topoDaEscala(Math.max(...meses.map((p) => p.valor)));
  const n = meses.length;
  const faixa = (L - m.esq - m.dir) / n;
  const larg = Math.min(24, faixa * 0.6);
  const y = (v) => A - m.base - (Math.max(0, v) / topo) * (A - m.topo - m.base);
  const maior = meses.reduce((k, p, i) => (p.valor > meses[k].valor ? i : k), 0);
  const coluna = (p, i) => {
    const cx = m.esq + faixa * (i + 0.5);
    const alto = A - m.base - y(p.valor);
    if (alto <= 0) return null;
    const r = Math.min(4, alto, larg / 2);
    const x0 = cx - larg / 2;
    const yb = A - m.base;
    // Ponta arredondada (4px), base reta.
    return svg('path', { class: 'g-coluna', 'data-i': i, d: `M${r1(x0)},${r1(yb)} V${r1(y(p.valor) + r)} Q${r1(x0)},${r1(y(p.valor))} ${r1(x0 + r)},${r1(y(p.valor))} H${r1(x0 + larg - r)} Q${r1(x0 + larg)},${r1(y(p.valor))} ${r1(x0 + larg)},${r1(y(p.valor) + r)} V${r1(yb)} Z` });
  };
  const desenho = svg('svg', { viewBox: `0 0 ${L} ${A}`, class: 'g-svg', role: 'img', 'aria-label': `Proventos por mês, de ${rotuloDoMes(meses[0].mes)} a ${rotuloDoMes(meses[n - 1].mes)}` },
    ...[0, topo].map((v) => [
      svg('line', { class: 'g-grade', x1: m.esq, x2: L - m.dir, y1: r1(y(v)), y2: r1(y(v)) }),
      svg('text', { class: 'g-eixo', x: m.esq - 8, y: r1(y(v) + 4), 'text-anchor': 'end' }, rotuloDoEixo(v)),
    ]),
    ...meses.map(coluna),
    meses[maior].valor > 0 && svg('text', { class: 'g-valor', x: r1(m.esq + faixa * (maior + 0.5)), y: r1(y(meses[maior].valor) - 6), 'text-anchor': 'middle' }, abreviar(meses[maior].valor)),
    ...meses.map((p, i) => (n <= 6 || i % 2 === (n - 1) % 2) && svg('text', { class: 'g-eixo', x: r1(m.esq + faixa * (i + 0.5)), y: A - 6, 'text-anchor': 'middle' }, rotuloDoMes(p.mes).slice(0, 3))));
  const caixa = h('div', { class: 'grafico-caixa' }, desenho);
  const b = balao(caixa);
  const mostrar = (evento) => {
    const rect = desenho.getBoundingClientRect();
    const px = ((evento.clientX - rect.left) / rect.width) * L;
    const i = Math.min(Math.max(Math.floor((px - m.esq) / faixa), 0), n - 1);
    for (const c of desenho.querySelectorAll('.g-coluna')) c.classList.toggle('apagada', Number(c.dataset.i) !== i);
    b.mostrar(((m.esq + faixa * (i + 0.5)) / L) * 100, [h('b', {}, rotuloDoMes(meses[i].mes)), h('span', {}, formatarBRL(meses[i].valor))]);
  };
  desenho.addEventListener('pointermove', mostrar);
  desenho.addEventListener('pointerdown', mostrar);
  desenho.addEventListener('pointerleave', (e) => {
    if (e.pointerType === 'touch') return; // no toque, o balão fica até o próximo toque
    b.esconder();
    for (const c of desenho.querySelectorAll('.g-coluna')) c.classList.remove('apagada');
  });
  return h('div', { class: 'grafico-carteira' }, caixa,
    tabela('Proventos por mês', ['Mês', 'Proventos'], [...meses].reverse().map((p) => [rotuloDoMes(p.mes), formatarBRL(p.valor)])));
}

// A divisão da carteira numa barra fina (8px), cada classe na sua cor, com 2px de folga entre as partes.
export const barraDivisao = (alocacao) => h('div', { class: 'barra-divisao', role: 'img', 'aria-label': alocacao.filter((a) => a.valor > 0).map((a) => `${a.nome} ${Math.round(a.pct * 100)}%`).join(', ') },
  ...alocacao.filter((a) => a.valor > 0).map((a) => h('i', { class: `cor-${a.classe}`, style: `flex:${a.pct}` })));
