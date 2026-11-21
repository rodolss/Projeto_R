// Salário digitado uma vez só (desenho 2026-11-21-salario-unico): para quem administra (visão única), o salário do
// mês se digita num lugar só — o Dia de pagamento ("Salário que caiu") — e vale também para o Mês da casa (divisão das
// contas e Balanço). O salário do plano (Ajustes do planejador) é a referência: não muda sozinho com o valor de cada
// mês (um mês menor, como o depois das férias, o derrubaria e travaria; um 13º digitado na casa o dobraria).

// O salário de todo mês contido no que caiu (com o adiantamento das férias guardado no mês anterior, o "efetivo"):
// com 13º, férias, PLR — ou um valor bem acima do salário, que o app trata como extra —, é o salário do plano.
export function salarioRegular({ recebidoEfetivo, tipoExtra, pareceExtra, salarioPlano }) {
  if (recebidoEfetivo == null) return null;
  return tipoExtra || pareceExtra ? salarioPlano : recebidoEfetivo;
}

// O Dia de pagamento abre com o salário já confirmado no Mês da casa (se ainda não foi digitado e o mês não foi
// registrado), mas sem marcar feito: um toque confirma — e em mês de 13º dá para corrigir o valor antes.
export function preencherRecebido({ rascunho, registrado, salarioCasa }) {
  if (registrado || rascunho.recebido != null || salarioCasa?.situacao !== 'confirmado') return null;
  return { ...rascunho, recebido: salarioCasa.valor };
}

// O Dia de pagamento leva o salário para o Mês da casa só quando lá ainda é previsão: o digitado na casa manda.
export const levarParaCasa = ({ salarioCasa, regular }) => regular != null && salarioCasa?.situacao !== 'confirmado';
