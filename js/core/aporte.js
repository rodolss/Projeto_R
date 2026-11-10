// Para onde vai o excedente do mês: reserva, carteira ou caixa de oportunidade (spec §4.5 e §4.6).

export function tetoCaixa(excedenteMedio) {
  return 6 * excedenteMedio;
}

export function decidirAporte({
  excedente, reserva, alvoReserva, emQueda, caixa, caixaNoInicioDaQueda, tetoCaixa: teto, pmtNec, proventos = 0,
}) {
  const paraReserva = Math.min(excedente, Math.max(0, alvoReserva - reserva));
  const resto = excedente - paraReserva;
  let paraCarteira;
  let paraCaixa = 0;
  let daCaixaParaCarteira = 0;

  if (emQueda) {
    paraCarteira = resto;
    daCaixaParaCarteira = Math.min(caixa, caixaNoInicioDaQueda / 3);
  } else if (pmtNec >= resto) {
    paraCarteira = resto;
  } else {
    const base = Math.max(pmtNec, 0);
    paraCaixa = Math.min(resto - base, Math.max(0, teto - caixa));
    paraCarteira = resto - paraCaixa;
  }

  return {
    paraReserva,
    paraCarteira,
    paraCaixa,
    daCaixaParaCarteira,
    aDistribuir: paraCarteira + daCaixaParaCarteira + proventos,
  };
}
