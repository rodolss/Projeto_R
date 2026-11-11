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
