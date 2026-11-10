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
