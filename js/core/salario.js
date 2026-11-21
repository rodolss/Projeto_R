// Salário digitado uma vez só (desenho 2026-11-21-salario-unico): para quem administra (visão única), o salário
// digitado num lugar vale para os outros — o Dia de pagamento ("Salário que caiu"), o Mês da casa (divisão das contas
// e Balanço) e o salário do plano (metas e "veio algo a mais?").

// O salário de todo mês contido no que caiu na conta: com 13º, férias, PLR — ou um valor bem acima do salário, que o
// app trata como extra —, é o salário do plano; senão, o próprio valor.
export function salarioRegular({ recebido, tipoExtra, pareceExtra, salarioPlano }) {
  if (recebido == null) return null;
  return tipoExtra || pareceExtra ? salarioPlano : recebido;
}

// O Dia de pagamento começa com o salário já confirmado no Mês da casa, se ainda não foi digitado neste mês (e o mês
// não foi registrado). Devolve o rascunho preenchido ou null.
export function preencherRecebido({ rascunho, registrado, salarioCasa }) {
  if (registrado || rascunho.recebido != null || salarioCasa?.situacao !== 'confirmado') return null;
  return { ...rascunho, recebido: salarioCasa.valor, feito: { ...rascunho.feito, salario: true } };
}

// O salário do plano muda só se for diferente, a partir do mês (o mesmo que Ajustes › Renda faz).
export function configComSalario(config, valor, mes) {
  if (valor == null || valor === config.salario) return config;
  return { ...config, salario: valor, mesSalario: mes };
}
