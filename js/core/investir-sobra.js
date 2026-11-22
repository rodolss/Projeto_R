// Investir a sobra (desenhos 2026-11-20-investir-a-sobra e 2026-11-22-sobra-do-proprio-mes): quanto investir no Dia de
// pagamento de `mes`, pela sobra do Balanço DO PRÓPRIO MÊS. O salário cai no dia 27 e paga as contas do mês seguinte:
// no dia 27 de dezembro, as contas e as faturas de dezembro (que fecham dia 23/24) já fecharam, e o que sobrou delas é o
// que se investe. Antes disso, a mesma conta é a previsão (a Carteira mostra o quanto vai ter para investir). 10% para
// lazer, o resto para investir. Duas correções para a conta não errar:
// - o mês anterior registrado pela regra antiga (pelo orçamento) já investiu parte deste salário: isso sai da sobra;
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
  const b = balancoDoMes(casa, mes, pessoaId, hoje);
  if (!dadosCompletos(b)) return { incompleto: true, mes };

  // Vermelho ainda a compensar, dos meses entre o começo da regra (o 1º Dia de pagamento registrado pela sobra) e o mês
  // antes deste. Antes de existir um registro pela sobra, nada é puxado.
  const comecos = (estado?.meses ?? []).filter(pelaSobra).map((r) => r.mes).sort();
  let acumulado = 0;
  if (comecos.length) {
    const desde = [comecos[0], somarMeses(mes, -JANELA)].sort().at(-1);
    for (let k = desde; k < mes; k = somarMeses(k, 1)) {
      const bk = balancoDoMes(casa, k, pessoaId, hoje);
      if (dadosCompletos(bk)) acumulado = Math.min(0, acumulado + bk.sobra - investidoDoSalario(estado, somarMeses(k, -1)));
    }
  }

  // O Dia de pagamento do mês anterior, se foi pelo orçamento, investiu do salário que tinha acabado de cair: este.
  const jaInvestido = investidoDoSalario(estado, somarMeses(mes, -1));
  const deficit = centavos(-acumulado);
  const saldo = centavos(b.sobra - jaInvestido - deficit);
  const d = divisaoDaSobra(saldo);
  return {
    incompleto: false,
    mes,
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
