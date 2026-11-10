// Matemática financeira em termos reais. Aportes acontecem no fim de cada mês.

export function taxaMensal(rAnual) {
  return Math.pow(1 + rAnual, 1 / 12) - 1;
}

export function crescer(valor, i, meses) {
  return valor * Math.pow(1 + i, meses);
}

export function valorFuturo({ p, aporte, i, meses }) {
  if (i === 0) return p + aporte * meses;
  const f = Math.pow(1 + i, meses);
  return p * f + aporte * (f - 1) / i;
}

// Aporte mensal necessário para sair de p e chegar à meta em `meses`.
export function pmtNecessario({ p, meta, i, meses }) {
  if (meses <= 0) return p < meta ? Infinity : 0;
  if (i === 0) return Math.max(0, (meta - p) / meses);
  const f = Math.pow(1 + i, meses);
  return Math.max(0, (meta - p * f) * i / (f - 1));
}

// Quantos meses até a meta; null se não chegar em `max` meses.
export function mesesAteMeta({ p, aporte, i, meta, max = 600 }) {
  let v = p;
  for (let m = 0; m <= max; m++) {
    if (v >= meta) return m;
    v = v * (1 + i) + aporte;
  }
  return null;
}

export function pmtInicial({ p0, meta, i, prazo }) {
  return pmtNecessario({ p: p0, meta, i, meses: prazo });
}

export function patrimonioPlanejado({ p0, meta, i, prazo, t }) {
  return valorFuturo({ p: p0, aporte: pmtInicial({ p0, meta, i, prazo }), i, meses: t });
}
