// Investir a sobra (desenho 2026-11-20-investir-a-sobra): quanto investir no Dia de pagamento de `mes`, pela sobra
// do Balanço do mês anterior — o que já fechou (salário daquele mês menos a parte nas contas da casa e o que é seu no
// cartão). 10% para lazer, o resto para investir. Duas correções para a conta não errar:
// - o mês anterior registrado pela regra antiga (pelo orçamento) já investiu parte do salário dele: isso sai da sobra;
// - um mês que fechou no vermelho fica para compensar com as sobras seguintes (desde que a regra começou, até 6 meses).
// O que veio a mais no mês do pagamento (13º, PLR, férias) é tratado no motor (calcularMes).
import { somarMeses } from './meses.js';
import { centavos } from './casa.js';
import { balancoDoMes, dadosCompletos, divisaoDaSobra } from './balanco.js';

const JANELA = 6;
const registroDe = (estado, mes) => (estado?.meses ?? []).find((m) => m.mes === mes) ?? null;
const pelaSobra = (registro) => registro?.sugestao?.origem === 'sobra';

// O que saiu do salário do próprio mês no Dia de pagamento dele, se foi registrado pelo orçamento (registros de antes
// desta regra não têm origem: também contam). Proventos reinvestidos não vêm do salário.
function investidoDoSalario(estado, mes) {
  const r = registroDe(estado, mes);
  if (!r || pelaSobra(r)) return 0;
  const aplicado = (r.aplicado ?? []).reduce((s, a) => s + (a.valor ?? 0), 0);
  return centavos(Math.max(0, aplicado - (r.proventos ?? 0)));
}

// O potencial de investimento (desenho 2026-11-22-para-investir): o quanto investir neste mês (a regra abaixo) e a
// média dos últimos `meses` Dias de pagamento com os dados do Balanço completos — o que costuma sobrar por mês.
export function potencialDeInvestimento({ casa, estado, pessoaId, mes, hoje, meses = 3 }) {
  const atual = regraDaSobra({ casa, estado, pessoaId, mes, hoje });
  const valores = [];
  for (let k = 0; k < meses; k++) {
    const r = k === 0 ? atual : regraDaSobra({ casa, estado, pessoaId, mes: somarMeses(mes, -k), hoje });
    if (!r.incompleto) valores.push(r.investir);
  }
  const media = valores.length ? centavos(valores.reduce((s, v) => s + v, 0) / valores.length) : null;
  return { atual, media, quantos: valores.length };
}

export function regraDaSobra({ casa, estado, pessoaId, mes, hoje }) {
  const anterior = somarMeses(mes, -1);
  const b = balancoDoMes(casa, anterior, pessoaId, hoje);
  if (!dadosCompletos(b)) return { incompleto: true, mes: anterior };

  // Vermelho ainda a compensar, dos meses entre o começo da regra (o mês antes do 1º Dia de pagamento registrado pela
  // sobra) e o mês antes do anterior. Antes de existir um registro pela sobra, nada é puxado.
  const comecos = (estado?.meses ?? []).filter(pelaSobra).map((r) => somarMeses(r.mes, -1)).sort();
  let acumulado = 0;
  if (comecos.length) {
    const desde = [comecos[0], somarMeses(mes, -JANELA)].sort().at(-1);
    for (let k = desde; k < anterior; k = somarMeses(k, 1)) {
      const bk = balancoDoMes(casa, k, pessoaId, hoje);
      if (dadosCompletos(bk)) acumulado = Math.min(0, acumulado + bk.sobra - investidoDoSalario(estado, k));
    }
  }

  const jaInvestido = investidoDoSalario(estado, anterior);
  const deficit = centavos(-acumulado);
  const saldo = centavos(b.sobra - jaInvestido - deficit);
  const d = divisaoDaSobra(saldo);
  return {
    incompleto: false,
    mes: anterior,
    previsao: b.previsao,
    sobra: b.sobra,
    jaInvestido,
    deficit,
    base: d.sobra,
    lazer: d.lazer,
    investir: d.investir,
    deficitAgora: centavos(Math.max(0, -saldo)), // o vermelho que ainda fica para as próximas sobras
  };
}
