// Série do IPCA (variação mensal, em fração) e conversão de valores para "reais de hoje".
import { somarMeses, diffMeses } from './meses.js';

// Formato da API SGS do Banco Central: [{ data: '01/MM/YYYY', valor: '0.82' }].
export function parseSerieSgs(json) {
  const serie = {};
  for (const { data, valor } of json) {
    const [, mm, aaaa] = data.split('/');
    serie[`${aaaa}-${mm}`] = Number(valor) / 100;
  }
  return serie;
}

export function ultimoMes(serie) {
  const meses = Object.keys(serie).sort();
  return meses.length ? meses[meses.length - 1] : null;
}

function mesesEntre(de, ate) {
  const lista = [];
  for (let k = 1; k <= diffMeses(de, ate); k++) lista.push(somarMeses(de, k));
  return lista;
}

// Inflação acumulada nos meses (de, ate]. Mês sem dado conta como zero.
export function fatorInflacao(serie, de, ate) {
  return mesesEntre(de, ate).reduce((f, m) => f * (1 + (serie[m] ?? 0)), 1);
}

export function mesesFaltando(serie, de, ate) {
  return mesesEntre(de, ate).filter((m) => !(m in serie));
}

export function paraReaisDeHoje(valor, mesDoValor, serie) {
  const ultimo = ultimoMes(serie);
  if (!ultimo) return valor;
  return valor * fatorInflacao(serie, mesDoValor, ultimo);
}
