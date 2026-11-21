// Formatação e leitura de valores no padrão brasileiro.

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function formatarBRL(valor) {
  return BRL.format(valor).replace(/ /g, ' ');
}

export function formatarPct(fracao, casas = 1) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  }).format(fracao).replace(/ /g, ' ');
}

// Aceita "R$ 7.800,00", "7.800", "7800,5" e "7800.5". Devolve null para o que não for um valor válido.
export function parseBRL(texto) {
  const s = String(texto ?? '').replace(/R\$/g, '').replace(/[\s ]/g, '');
  if (s === '' || /[^0-9.,]/.test(s)) return null;

  let normal;
  const virgulas = (s.match(/,/g) || []).length;
  if (virgulas > 1) return null;
  if (virgulas === 1) {
    const [inteira, decimal] = s.split(',');
    normal = `${inteira.replace(/\./g, '')}.${decimal}`;
  } else if (s.includes('.')) {
    if (/^\d{1,3}(\.\d{3})+$/.test(s)) normal = s.replace(/\./g, '');
    else if ((s.match(/\./g) || []).length === 1) normal = s;
    else return null;
  } else {
    normal = s;
  }

  if (!/^\d*\.?\d*$/.test(normal) || normal === '.' || normal === '') return null;
  const valor = Number(normal);
  return Number.isFinite(valor) ? valor : null;
}

// Campo de reais (desenho 2026-11-21-mascara-reais): só se digitam números e a máscara põe o ponto e a vírgula, como
// no caixa do banco (digitou 1, 2, 3, 4, 5 → "123,45"). Vírgula e ponto digitados não entram.
// REGEX_REAIS é o formato final: milhares com ponto e sempre dois decimais ("0,05", "1.234,56").
export const REGEX_REAIS = /^\d{1,3}(\.\d{3})*,\d{2}$/;
const MAX_DIGITOS_REAIS = 13; // até 99.999.999.999,99

// Do que está no campo (qualquer texto) para o texto mascarado. Só zeros ou nada: '' (campo vazio, sem valor).
export function mascararReais(texto) {
  const digitos = String(texto ?? '').replace(/\D/g, '').replace(/^0+/, '').slice(0, MAX_DIGITOS_REAIS);
  if (digitos === '') return '';
  const cheio = digitos.padStart(3, '0');
  const inteira = cheio.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${inteira},${cheio.slice(-2)}`;
}

// O valor (em reais) de um texto já mascarado; null se vazio ou fora do formato.
export function valorDosReais(texto) {
  return REGEX_REAIS.test(texto ?? '') ? Number(texto.replace(/\./g, '').replace(',', '.')) : null;
}

// "21 anos e 3 meses", "1 ano", "8 meses". null = além do horizonte de 50 anos da projeção.
export function formatarDuracao(meses) {
  if (meses === null || meses === undefined) return 'mais de 50 anos';
  if (meses <= 0) return 'menos de 1 mês';
  const anos = Math.floor(meses / 12);
  const resto = meses % 12;
  const partes = [];
  if (anos) partes.push(`${anos} ${anos === 1 ? 'ano' : 'anos'}`);
  if (resto) partes.push(`${resto} ${resto === 1 ? 'mês' : 'meses'}`);
  return partes.join(' e ');
}

// "5%", "3,5%": sem casas decimais quando o percentual é inteiro.
export function formatarPctCurto(fracao) {
  const inteiro = Number.isInteger(Math.round(fracao * 1000) / 10);
  return formatarPct(fracao, inteiro ? 0 : 1);
}
