// Carteira-alvo e divisão do aporte entre os ativos, só com compras (spec §4.7).
import { formatarPct } from './formato.js';

export const CLASSES = ['rendaFixa', 'fiis', 'acoes', 'exterior'];

export const CARTEIRA_PADRAO = {
  rendaFixa: { peso: 0.40, ticker: 'Tesouro IPCA+ com Juros Semestrais', frase: 'Título do governo que paga juros a cada 6 meses e protege da inflação' },
  fiis: { peso: 0.25, ticker: 'XFIX11', frase: 'Fundo que reúne vários fundos imobiliários e paga aluguéis todo mês' },
  acoes: { peso: 0.25, ticker: 'DIVO11', frase: 'Fundo com empresas brasileiras que pagam bons dividendos' },
  exterior: { peso: 0.10, ticker: 'IVVB11', frase: 'As 500 maiores empresas dos EUA; não paga proventos, serve de proteção' },
};

export const NOMES_CLASSE = {
  rendaFixa: 'A renda fixa',
  fiis: 'A parte de fundos imobiliários',
  acoes: 'A bolsa brasileira',
  exterior: 'A parte no exterior',
};

const soma = (obj) => CLASSES.reduce((s, c) => s + (obj[c] ?? 0), 0);

// Proporcional aos déficits. Como Σdéficits ≥ aporte sempre, nunca há sobra para dividir pelos pesos.
export function distribuirAporte({ valores, pesos, aporte }) {
  const total = soma(valores) + aporte;
  const deficits = Object.fromEntries(CLASSES.map((c) => [c, Math.max(0, pesos[c] * total - (valores[c] ?? 0))]));
  const somaDeficits = soma(deficits);
  return Object.fromEntries(CLASSES.map((c) => [c, aporte > 0 && somaDeficits > 0 ? deficits[c] * (aporte / somaDeficits) : 0]));
}

export function arredondarDistribuicao(dist) {
  const total = soma(dist);
  const resultado = {};
  for (const c of CLASSES) if (c !== 'rendaFixa') resultado[c] = Math.floor(dist[c] ?? 0);
  resultado.rendaFixa = Math.round((total - soma(resultado)) * 100) / 100;
  return Object.fromEntries(CLASSES.map((c) => [c, resultado[c]]));
}

export function sugestaoPorAtivo({ distribuicao, carteiraAlvo, precos }) {
  return CLASSES
    .filter((c) => (distribuicao[c] ?? 0) > 0)
    .map((c) => {
      const preco = precos[c] ?? null;
      return {
        classe: c,
        ticker: carteiraAlvo[c].ticker,
        frase: carteiraAlvo[c].frase,
        valor: distribuicao[c],
        cotasAprox: preco ? Math.floor(distribuicao[c] / preco) : null,
      };
    });
}

export function explicarPorque({ valores, valoresMesAnterior, pesos, distribuicao, carteiraAlvo }) {
  const total = soma(valores);
  if (total <= 0) return 'Dividindo conforme a sua carteira-alvo.';
  // A classe mais favorecida é a que recebe mais em relação à sua fatia normal (peso), não a que recebe mais reais.
  const aporte = soma(distribuicao);
  const favorecimento = (x) => (pesos[x] > 0 && aporte > 0 ? (distribuicao[x] ?? 0) / (pesos[x] * aporte) : 0);
  const c = CLASSES.reduce((melhor, x) => (favorecimento(x) > favorecimento(melhor) ? x : melhor), CLASSES[0]);
  const { ticker } = carteiraAlvo[c];
  if (valoresMesAnterior && valores[c] < valoresMesAnterior[c]) {
    return `${NOMES_CLASSE[c]} caiu este mês e ficou abaixo do alvo, então o ${ticker} recebe uma fatia maior.`;
  }
  return `${NOMES_CLASSE[c]} está abaixo do alvo (${formatarPct(valores[c] / total)} de ${formatarPct(pesos[c])}), então o ${ticker} recebe uma fatia maior.`;
}
