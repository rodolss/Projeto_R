// Gráficos em SVG feitos à mão (funções puras, sem DOM). As cores vêm das classes CSS do tema.
import { diffMeses, somarMeses, formatarMes } from '../core/meses.js';

const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const num = (v) => (Number.isFinite(v) ? Math.round(v * 10) / 10 : 0);

export function abreviar(valor) {
  const fmt = (v, casas = 1) => v.toLocaleString('pt-BR', { maximumFractionDigits: casas });
  if (Math.abs(valor) >= 1e6) return `${fmt(valor / 1e6, 2)} mi`;
  if (Math.abs(valor) >= 1e3) return `${fmt(Math.round(valor / 1e3))} mil`;
  return fmt(Math.round(valor));
}

const pontos = (serie, x, y) => serie.map((p) => `${num(x(p.mes))},${num(y(p.valor))}`).join(' ');

export function graficoTrajetoria({ plano, real, projecao, faixa, meta, mesAlvo, largura = 640, altura = 300 }) {
  const m = { esq: 56, dir: 14, topo: 20, base: 26 };
  const todas = [plano, real, projecao, faixa.otimista, faixa.pessimista];
  const meses = todas.flat().map((p) => p.mes).concat(mesAlvo).sort();
  const inicio = meses[0];
  const span = Math.max(1, diffMeses(inicio, meses.at(-1)));
  const maxValor = Math.max(meta, ...todas.flat().map((p) => p.valor).filter(Number.isFinite), 1) * 1.05;
  const x = (mes) => m.esq + (diffMeses(inicio, mes) / span) * (largura - m.esq - m.dir);
  const y = (v) => altura - m.base - (Math.max(0, v) / maxValor) * (altura - m.topo - m.base);

  const partes = [];
  for (let k = 0; k <= 3; k++) {
    const v = (maxValor / 1.05) * (k / 3);
    partes.push(`<line class="grade-linha" x1="${m.esq}" y1="${num(y(v))}" x2="${largura - m.dir}" y2="${num(y(v))}"/>`);
    partes.push(`<text x="${m.esq - 6}" y="${num(y(v) + 4)}" text-anchor="end">${abreviar(v)}</text>`);
  }
  const anoInicial = Number(inicio.slice(0, 4));
  const anos = Math.ceil(span / 12);
  const passo = Math.max(1, Math.ceil(anos / 6));
  for (let a = anoInicial + 1; a <= anoInicial + anos; a += passo) {
    const mes = `${a}-01`;
    if (diffMeses(inicio, mes) > span) break;
    partes.push(`<text x="${num(x(mes))}" y="${altura - 6}" text-anchor="middle">${a}</text>`);
  }
  if (meta > 0) {
    partes.push(`<line class="meta" x1="${m.esq}" y1="${num(y(meta))}" x2="${largura - m.dir}" y2="${num(y(meta))}"/>`);
    partes.push(`<text class="meta-texto" x="${m.esq + 4}" y="${num(y(meta) - 6)}">Meta · ${abreviar(meta)}</text>`);
  }
  partes.push(`<line class="meta" x1="${num(x(mesAlvo))}" y1="${m.topo}" x2="${num(x(mesAlvo))}" y2="${altura - m.base}"/>`);
  partes.push(`<text class="meta-texto" x="${num(x(mesAlvo))}" y="${altura - m.base - 6}" text-anchor="middle">alvo ${formatarMes(mesAlvo)}</text>`);
  if (faixa.otimista.length && faixa.pessimista.length) {
    partes.push(`<polygon class="faixa" points="${pontos(faixa.otimista, x, y)} ${pontos([...faixa.pessimista].reverse(), x, y)}"/>`);
  }
  if (plano.length) partes.push(`<polyline class="plano" points="${pontos(plano, x, y)}"/>`);
  if (projecao.length) partes.push(`<polyline class="projecao" points="${pontos(projecao, x, y)}"/>`);
  if (real.length) {
    partes.push(`<polyline class="real" points="${pontos(real, x, y)}"/>`);
    const fim = real.at(-1);
    partes.push(`<circle class="ponto" cx="${num(x(fim.mes))}" cy="${num(y(fim.valor))}" r="4"/>`);
  }
  return `<svg viewBox="0 0 ${largura} ${altura}" role="img" aria-label="Patrimônio planejado, real e projetado até a meta">${partes.join('')}</svg>`;
}

export function graficoZoom({ plano, real, largura = 640, altura = 160 }) {
  const m = { esq: 56, dir: 14, topo: 14, base: 22 };
  const reais = real.slice(-12);
  const conjunto = new Set(reais.map((p) => p.mes));
  const planos = plano.filter((p) => conjunto.has(p.mes));
  const valores = [...reais, ...planos].map((p) => p.valor).filter(Number.isFinite);
  const min = valores.length ? Math.min(...valores) : 0;
  const max = valores.length ? Math.max(...valores) : 1;
  const folga = (max - min) * 0.1 || Math.max(1, max * 0.1);
  const [baixo, alto] = [min - folga, max + folga];
  const inicio = reais[0]?.mes ?? '2000-01';
  const span = Math.max(1, reais.length - 1);
  const x = (mes) => m.esq + (diffMeses(inicio, mes) / span) * (largura - m.esq - m.dir);
  const y = (v) => altura - m.base - ((v - baixo) / (alto - baixo)) * (altura - m.topo - m.base);

  const partes = [];
  for (const v of [baixo + folga, (min + max) / 2, alto - folga]) {
    partes.push(`<line class="grade-linha" x1="${m.esq}" y1="${num(y(v))}" x2="${largura - m.dir}" y2="${num(y(v))}"/>`);
    partes.push(`<text x="${m.esq - 6}" y="${num(y(v) + 4)}" text-anchor="end">${abreviar(v)}</text>`);
  }
  for (let k = 0; k < reais.length; k++) {
    const mes = somarMeses(inicio, k);
    partes.push(`<text x="${num(x(mes))}" y="${altura - 4}" text-anchor="middle">${MESES_CURTOS[Number(mes.slice(5)) - 1]}</text>`);
  }
  if (planos.length) partes.push(`<polyline class="plano" points="${pontos(planos, x, y)}"/>`);
  if (reais.length) partes.push(`<polyline class="real" points="${pontos(reais, x, y)}"/>`);
  for (const p of reais) partes.push(`<circle class="ponto" cx="${num(x(p.mes))}" cy="${num(y(p.valor))}" r="3"/>`);
  return `<svg viewBox="0 0 ${largura} ${altura}" role="img" aria-label="Últimos meses: patrimônio real comparado ao plano">${partes.join('')}</svg>`;
}

// Anel de progresso do Início: começa no topo e enche no sentido horário (spec v2 §5.2).
export function anel({ fracao }) {
  const R = 104;
  const C = 2 * Math.PI * R;
  let f = Number.isFinite(fracao) ? Math.min(1, Math.max(0, fracao)) : 0;
  if (f > 0 && f < 0.015) f = 0.015; // um tiquinho visível em vez de nada
  const resto = Math.round(C * (1 - f) * 100) / 100;
  return `<svg viewBox="0 0 260 260" aria-hidden="true">`
    + `<circle class="anel-trilho" cx="130" cy="130" r="${R}" fill="none" stroke-width="18"/>`
    + (f > 0 ? `<circle class="anel-arco" cx="130" cy="130" r="${R}" fill="none" stroke-width="18" stroke-linecap="round" `
      + `stroke-dasharray="${num(C)}" stroke-dashoffset="${resto}" style="--anel-total:${num(C)}" transform="rotate(-90 130 130)"/>` : '')
    + '</svg>';
}
