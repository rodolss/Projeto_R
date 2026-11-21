// Ícones do app (desenho 2026-11-21-facelift): SVG de traço, 24 × 24, no mesmo desenho dos do menu (traço 1,8, pontas
// redondas, cor do texto em volta). `icone(nome)` devolve o <svg>; `iconeCategoria(cat)` devolve o selo colorido da linha.
import { h } from './dom.js';

const DESENHOS = {
  recibo: '<path d="M6 3.5h12v17l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
  carteira: '<path d="M4.5 7.5A2.5 2.5 0 0 1 7 5h10.5v3"/><rect x="4.5" y="8" width="15.5" height="11.5" rx="2.5"/><path d="M15.5 13.75h1.5"/>',
  entrou: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5v9M8.5 13l3.5 3.5 3.5-3.5"/>',
  saiu: '<circle cx="12" cy="12" r="8.5"/><path d="M12 16.5v-9M8.5 11 12 7.5l3.5 3.5"/>',
  sacola: '<path d="M5.5 8h13l-1 12h-11z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/>',
  repetir: '<path d="M17 4.5 19.5 7 17 9.5"/><path d="M4.5 12v-2a3 3 0 0 1 3-3h12"/><path d="M7 19.5 4.5 17 7 14.5"/><path d="M19.5 12v2a3 3 0 0 1-3 3h-12"/>',
  pessoas: '<circle cx="9" cy="8.5" r="3"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><circle cx="16.5" cy="9.5" r="2.5"/><path d="M15.6 14.2a4.5 4.5 0 0 1 4.9 4.8"/>',
  grafico: '<path d="M4 20h16"/><rect x="5.5" y="11" width="3" height="6" rx="1"/><rect x="10.5" y="6" width="3" height="11" rx="1"/><rect x="15.5" y="13" width="3" height="4" rx="1"/>',
  etiqueta: '<path d="M3.5 12.2V4.5a1 1 0 0 1 1-1h7.7l8.3 8.3a1.5 1.5 0 0 1 0 2.1l-6.1 6.1a1.5 1.5 0 0 1-2.1 0z"/><circle cx="8" cy="8" r="1.4"/>',
  cartao: '<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M3 10h18M7 14.5h4"/>',
  nuvem: '<path d="M7 18.5h10a4 4 0 0 0 .6-7.95A5.5 5.5 0 0 0 7 9.5a4.5 4.5 0 0 0 0 9z"/>',
  chave: '<circle cx="8" cy="15" r="4"/><path d="M11 12 19.5 3.5M16 7l2.5 2.5M14 9l2 2"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8v.2"/>',
  celular: '<rect x="7" y="3" width="10" height="18" rx="2.5"/><path d="M11 17.5h2"/>',
  alvo: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
  casa: '<path d="M4 11.5 12 5l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z"/>',
  sino: '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
  ajustes: '<path d="M5 7h9M18 7h1M5 12h3M12 12h7M5 17h11M20 17h-1"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="17" r="2"/>',
  investir: '<path d="M4 17.5 9.5 12l3.5 3.5L20 8.5"/><path d="M15 8.5h5v5"/>',
  moeda: '<circle cx="12" cy="12" r="8.5"/><path d="M14.5 9.3c-.5-.8-1.4-1.3-2.5-1.3-1.5 0-2.6.8-2.6 2s1 1.7 2.6 2 2.6.8 2.6 2-1.1 2-2.6 2c-1.1 0-2.1-.5-2.6-1.3M12 6.5V8M12 16v1.5"/>',
  escudo: '<path d="M12 3.5 19 6v5.5c0 4.3-3 7.8-7 9-4-1.2-7-4.7-7-9V6z"/><path d="m9 12 2 2 4-4"/>',
  historico: '<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4 4.5V8h3.5"/><path d="M12 8v4l3 2"/>',
  percentual: '<path d="M6 18 18 6"/><circle cx="7.5" cy="7.5" r="2"/><circle cx="16.5" cy="16.5" r="2"/>',
  brilho: '<path d="m12 4 1.6 4.4L18 10l-4.4 1.6L12 16l-1.6-4.4L6 10l4.4-1.6z"/><path d="m18.5 15.5.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"/>',
  copiar: '<rect x="8.5" y="8.5" width="11" height="11" rx="2.5"/><path d="M15.5 8.5V6A1.5 1.5 0 0 0 14 4.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5"/>',
  // categorias
  luz: '<path d="M9 17.5h6M10 20.5h4"/><path d="M12 3.5a6 6 0 0 0-3.6 10.8c.7.5 1.1 1.3 1.1 2.2h5c0-.9.4-1.7 1.1-2.2A6 6 0 0 0 12 3.5z"/>',
  agua: '<path d="M12 3.5s6 6.5 6 10.5a6 6 0 0 1-12 0c0-4 6-10.5 6-10.5z"/><path d="M9.5 14.5a2.5 2.5 0 0 0 2.5 2.5"/>',
  gas: '<path d="M12 21a6 6 0 0 0 6-6c0-3.5-2.5-5.5-3.5-8.5-1.5 2-2 3.5-2 3.5S11 7 9.5 4.5C8.5 7 6 10 6 15a6 6 0 0 0 6 6z"/>',
  conexao: '<path d="M3.5 9.5a12 12 0 0 1 17 0"/><path d="M6.5 12.8a7.5 7.5 0 0 1 11 0"/><path d="M9.5 16a3.2 3.2 0 0 1 5 0"/><path d="M12 19v.01"/>',
  moradia: '<rect x="5" y="3.5" width="14" height="17" rx="1.5"/><path d="M9 7.5h1.5M13.5 7.5H15M9 11h1.5M13.5 11H15M9 14.5h1.5M13.5 14.5H15M10.5 20.5v-3h3v3"/>',
  mercado: '<path d="M3.5 4.5h2l2 10.5h10l2-7.5H7"/><circle cx="9.5" cy="19" r="1.4"/><circle cx="16.5" cy="19" r="1.4"/>',
  comida: '<path d="M6 3.5v5.5a2 2 0 0 0 4 0V3.5M8 3.5v17"/><path d="M17.5 20.5v-17c-2.2.8-3.5 3.3-3.5 6.5 0 1.4.9 2.5 2.2 2.5h1.3"/>',
  transporte: '<path d="M4.5 16v-3.5l2.1-4.9a2 2 0 0 1 1.8-1.1h7.2a2 2 0 0 1 1.8 1.1l2.1 4.9V16a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1z"/><path d="M4.5 12.5h15M7 17v2M17 17v2"/>',
  saude: '<path d="M12 20s-7.5-4.5-7.5-10A4.3 4.3 0 0 1 12 7.3 4.3 4.3 0 0 1 19.5 10c0 5.5-7.5 10-7.5 10z"/><path d="M8 12.5h2l1-2 2 4 1-2h2"/>',
  pet: '<circle cx="7" cy="10" r="1.8"/><circle cx="10.5" cy="6.5" r="1.8"/><circle cx="14.5" cy="6.5" r="1.8"/><circle cx="18" cy="10" r="1.8"/><path d="M12 12.5c-2.5 0-5 2.8-5 5a2.2 2.2 0 0 0 2.5 2.2c1 0 1.6-.6 2.5-.6s1.5.6 2.5.6a2.2 2.2 0 0 0 2.5-2.2c0-2.2-2.5-5-5-5z"/>',
  assinatura: '<rect x="3.5" y="5.5" width="17" height="13" rx="3"/><path d="M10.5 9.5v5l4-2.5z"/>',
  educacao: '<path d="M4.5 5.5A1.5 1.5 0 0 1 6 4h13.5v14H6a1.5 1.5 0 0 0-1.5 1.5z"/><path d="M4.5 19.5A1.5 1.5 0 0 0 6 21h13.5v-3"/>',
  viagem: '<path d="M21 15.5v-2l-7.5-4.5V4.5a1.5 1.5 0 0 0-3 0V9L3 13.5v2l7.5-2.2v4.2L8.5 19v1.5l3.5-1 3.5 1V19l-2-1.5v-4.2z"/>',
  lazer: '<path d="M3.5 8.5v-2a1 1 0 0 1 1-1h15a1 1 0 0 1 1 1v2a2.5 2.5 0 0 0 0 5v2a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1v-2a2.5 2.5 0 0 0 0-5z"/><path d="M14 7v1.5M14 11v2M14 15.5V17"/>',
  roupa: '<path d="M8.5 4 4 6.5l1.5 4L8 9.5V20h8V9.5l2.5 1 1.5-4L15.5 4a3.5 3.5 0 0 1-7 0z"/>',
  presente: '<rect x="4" y="9" width="16" height="4" rx="1"/><path d="M5.5 13v7.5h13V13M12 9v11.5"/><path d="M12 9C10.5 5.5 6.5 5 6.5 7.5S10 9 12 9zm0 0c1.5-3.5 5.5-4 5.5-1.5S14 9 12 9z"/>',
};

// O ícone de cada categoria (core/categorias.js).
const DA_CATEGORIA = {
  luz: 'luz', agua: 'agua', gas: 'gas', conexao: 'conexao', moradia: 'moradia', mercado: 'mercado', comida: 'comida',
  transporte: 'transporte', saude: 'saude', pet: 'pet', assinatura: 'assinatura', educacao: 'educacao', viagem: 'viagem',
  lazer: 'lazer', roupa: 'roupa', presente: 'presente', compras: 'sacola', cartao: 'cartao', casa: 'casa',
  salario: 'carteira', extra: 'brilho', saida: 'saiu',
};

export function icone(nome) {
  const caixa = document.createElement('span');
  caixa.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${DESENHOS[nome] ?? DESENHOS.recibo}</svg>`;
  return caixa.firstChild;
}

// O selo colorido no começo de uma linha. `padrao` é o ícone de "outro" (recibo para conta, sacola para compra).
export const iconeCategoria = (cat, padrao = 'recibo') => h('span', { class: `icone-cat cat-${cat}`, 'aria-hidden': 'true' },
  icone(cat === 'outro' ? padrao : (DA_CATEGORIA[cat] ?? padrao)));

export const temIcone = (nome) => Object.prototype.hasOwnProperty.call(DESENHOS, nome);
