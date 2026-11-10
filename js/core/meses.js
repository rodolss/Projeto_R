// Aritmética de meses ('YYYY-MM') e datas ('YYYY-MM-DD').

const NOMES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function partes(mes) {
  const [a, m] = mes.split('-').map(Number);
  return { a, m };
}

function montar(indice) {
  const a = Math.floor(indice / 12);
  const m = indice - a * 12 + 1;
  return `${a}-${String(m).padStart(2, '0')}`;
}

function indice(mes) {
  const { a, m } = partes(mes);
  return a * 12 + (m - 1);
}

export function somarMeses(mes, n) {
  return montar(indice(mes) + n);
}

export function diffMeses(de, ate) {
  return indice(ate) - indice(de);
}

export function mesDe(data) {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
}

export function dataISO(data) {
  return `${mesDe(data)}-${String(data.getDate()).padStart(2, '0')}`;
}

function utc(dataTexto) {
  const [a, m, d] = dataTexto.split('-').map(Number);
  return Date.UTC(a, m - 1, d);
}

export function diasEntre(de, ate) {
  return Math.round((utc(ate) - utc(de)) / 86_400_000);
}

export function formatarMes(mes) {
  const { a, m } = partes(mes);
  return `${NOMES[m - 1]}/${a}`;
}

// O ciclo das despesas anuais vai de novembro a outubro e leva o ano do novembro em que começa.
export function cicloAnual(mes) {
  const { a, m } = partes(mes);
  return String(m >= 11 ? a : a - 1);
}
