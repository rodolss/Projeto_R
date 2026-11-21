import { test } from 'node:test';
import assert from 'node:assert/strict';
import { regraDaSobra } from '../../js/core/investir-sobra.js';
import { definirSalario } from '../../js/core/salario.js';
import { migrarCasa, salvarValor, salvarSalario } from '../../js/core/casa.js';

// Casa inventada, sem cartões: Ana (p1, quem administra) ganha 6000 e o Leo 4000; só a Luz (1000), confirmada.
// Ana paga 60% das contas: 600 — sobra 5400 por mês. `luz` troca o valor de um mês (para fechar no vermelho).
function casaBase(luz = {}) {
  let casa = migrarCasa({
    schemaVersion: 3,
    pessoas: [{ id: 'p1', nome: 'Ana' }, { id: 'p2', nome: 'Leo' }],
    contas: [{ id: 'c1', nome: 'Luz', compraPorCompra: false, arquivada: false }],
    meses: [], cartoes: [], outrasPessoas: [],
  });
  for (const mes of ['2026-10', '2026-11', '2026-12', '2027-01', '2027-02']) {
    casa = salvarSalario(casa, { mes, pessoaId: 'p1', valor: 6000 });
    casa = salvarSalario(casa, { mes, pessoaId: 'p2', valor: 4000 });
    casa = salvarValor(casa, { mes, contaId: 'c1', valor: luz[mes] ?? 1000 });
  }
  return casa;
}
const regra = (casa, estado, mes) => regraDaSobra({ casa, estado, pessoaId: 'p1', mes, hoje: `${mes}-07` });

test('investir a sobra: a sobra do mês anterior, 10% para lazer, o resto para investir', () => {
  const r = regra(casaBase(), { meses: [] }, '2026-12');
  assert.deepEqual(
    [r.incompleto, r.mes, r.sobra, r.jaInvestido, r.deficit, r.base, r.lazer, r.investir, r.previsao, r.deficitAgora],
    [false, '2026-11', 5400, 0, 0, 5400, 540, 4860, false, 0],
  );
});

test('investir a sobra: mês anterior registrado pela regra antiga desconta o que já saiu do salário dele', () => {
  // Novembro registrado pelo orçamento: aplicou 3500, dos quais 500 eram proventos reinvestidos (não são do salário).
  const antigo = { meses: [{ mes: '2026-11', aplicado: [{ valor: 3000 }, { valor: 500 }], proventos: 500, sugestao: { origem: 'orcamento' } }] };
  const r = regra(casaBase(), antigo, '2026-12');
  assert.deepEqual([r.jaInvestido, r.base, r.lazer, r.investir], [3000, 2400, 240, 2160]);
  // Registro de antes desta regra (sem origem) também conta como pelo orçamento.
  assert.equal(regra(casaBase(), { meses: [{ ...antigo.meses[0], sugestao: {} }] }, '2026-12').jaInvestido, 3000);
  // Registrado pela sobra: o que saiu naquele Dia de pagamento veio da sobra de outubro, não do salário de novembro.
  const pelaSobra = { meses: [{ ...antigo.meses[0], sugestao: { origem: 'sobra' } }] };
  assert.equal(regra(casaBase(), pelaSobra, '2026-12').jaInvestido, 0);
});

test('investir a sobra: o vermelho de um mês é compensado pelas sobras seguintes (desde que a regra começou)', () => {
  const casa = casaBase({ '2026-12': 20000 }); // dezembro: Ana paga 12000 → sobra -6000
  const estado = { meses: [{ mes: '2026-12', aplicado: [], proventos: 0, sugestao: { origem: 'sobra' } }] }; // começou em dez
  const janeiro = regra(casa, estado, '2027-01'); // olha dezembro: vermelho
  assert.deepEqual([janeiro.sobra, janeiro.base, janeiro.investir, janeiro.deficitAgora], [-6000, 0, 0, 6000]);
  const fevereiro = regra(casa, estado, '2027-02'); // janeiro sobra 5400, mas ainda faltam 6000 de dezembro
  assert.deepEqual([fevereiro.sobra, fevereiro.deficit, fevereiro.base, fevereiro.investir, fevereiro.deficitAgora], [5400, 6000, 0, 0, 600]);
  // Sem nenhum registro pela sobra ainda, o vermelho de antes não é puxado (só o mês anterior conta).
  assert.equal(regra(casa, { meses: [] }, '2027-02').deficit, 0);
});

test('investir a sobra: sem os salários do mês anterior, incompleto (o valor volta para o orçamento)', () => {
  const casa = salvarSalario(salvarSalario(casaBase(), { mes: '2026-11', pessoaId: 'p1', valor: null }), { mes: '2026-11', pessoaId: 'p2', valor: null });
  const semOutubro = salvarSalario(salvarSalario(casa, { mes: '2026-10', pessoaId: 'p1', valor: null }), { mes: '2026-10', pessoaId: 'p2', valor: null });
  assert.equal(regra(semOutubro, { meses: [] }, '2026-12').incompleto, true);
  assert.equal(regra(semOutubro, { meses: [] }, '2026-12').mes, '2026-11');
});

test('salário só no Balanço: o a mais de novembro (13º) entra na sobra e é investido em dezembro, sem mudar a parte das contas', () => {
  const casa = definirSalario(casaBase(), { mes: '2026-11', pessoaId: 'p1', salario: 6000, extra: 6000 });
  const r = regra(casa, { meses: [] }, '2026-12');
  assert.deepEqual([r.sobra, r.base, r.lazer, r.investir], [11400, 11400, 1140, 10260]);
  // Novembro registrado pelo orçamento com o 13º já investido naquele dia: o que saiu é descontado (não investe 2 vezes).
  const antigo = { meses: [{ mes: '2026-11', aplicado: [{ valor: 9000 }], proventos: 0, sugestao: { origem: 'orcamento' } }] };
  assert.deepEqual([regra(casa, antigo, '2026-12').jaInvestido, regra(casa, antigo, '2026-12').investir], [9000, 2160]);
});
