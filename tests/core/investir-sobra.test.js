import { test } from 'node:test';
import assert from 'node:assert/strict';
import { regraDaSobra, potencialDeInvestimento } from '../../js/core/investir-sobra.js';
import { definirSalario } from '../../js/core/salario.js';
import { migrarCasa, salvarValor, salvarSalario } from '../../js/core/casa.js';

// Casa inventada, sem cartões: Ana (p1, quem administra) ganha 6000 e o Leo 4000; só a Luz (1000), confirmada.
// Ana paga 60% das contas: 600 — sobra 5400 por mês. `luz` troca o valor de um mês (para fechar no vermelho).
// O salário cai no dia 27 e paga as contas do mês seguinte: no Dia de pagamento de um mês (dia 27), as contas e as
// faturas dele já fecharam, e é a sobra DELE que se investe (desenho 2026-11-22-sobra-do-proprio-mes).
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
const regra = (casa, estado, mes) => regraDaSobra({ casa, estado, pessoaId: 'p1', mes, hoje: `${mes}-27` });

test('potencial de investimento: o deste mês (pela sobra dele) e a média dos últimos 3 meses com dados', () => {
  // Novembro com a luz em 2000: a Ana paga 1200 e sobram 4800 (4320 para investir); os outros meses, 4860.
  const casa = casaBase({ '2026-11': 2000 });
  const p = potencialDeInvestimento({ casa, estado: { meses: [] }, pessoaId: 'p1', mes: '2027-01', hoje: '2027-01-07' });
  assert.deepEqual([p.atual.mes, p.atual.investir, p.media, p.quantos], ['2027-01', 4860, 4680, 3]);
  // No começo, só os meses com salários e contas entram na média.
  const comeco = potencialDeInvestimento({ casa, estado: { meses: [] }, pessoaId: 'p1', mes: '2026-11', hoje: '2026-11-07' });
  assert.deepEqual([comeco.atual.investir, comeco.media, comeco.quantos], [4320, 4590, 2]);
});

test('investir a sobra: a sobra do próprio mês, 10% para lazer, o resto para investir', () => {
  const r = regra(casaBase(), { meses: [] }, '2026-12');
  assert.deepEqual(
    [r.incompleto, r.mes, r.sobra, r.jaInvestido, r.deficit, r.base, r.lazer, r.investir, r.previsao, r.deficitAgora],
    [false, '2026-12', 5400, 0, 0, 5400, 540, 4860, false, 0],
  );
});

test('investir a sobra: o mês anterior registrado pela regra antiga já investiu parte deste salário (desconta)', () => {
  // Novembro registrado pelo orçamento no dia 27: aplicou 3500 do salário que acabava de cair (o de dezembro), dos quais
  // 500 eram proventos reinvestidos (não são do salário).
  const antigo = { meses: [{ mes: '2026-11', aplicado: [{ valor: 3000 }, { valor: 500 }], proventos: 500, sugestao: { origem: 'orcamento' } }] };
  const r = regra(casaBase(), antigo, '2026-12');
  assert.deepEqual([r.jaInvestido, r.base, r.lazer, r.investir], [3000, 2400, 240, 2160]);
  // Registro de antes desta regra (sem origem) também conta como pelo orçamento.
  assert.equal(regra(casaBase(), { meses: [{ ...antigo.meses[0], sugestao: {} }] }, '2026-12').jaInvestido, 3000);
  // Registrado pela sobra: o que saiu naquele Dia de pagamento era a sobra de novembro, não este salário.
  const pelaSobra = { meses: [{ ...antigo.meses[0], sugestao: { origem: 'sobra' } }] };
  assert.equal(regra(casaBase(), pelaSobra, '2026-12').jaInvestido, 0);
});

test('investir a sobra: o vermelho de um mês é compensado pelas sobras seguintes (desde que a regra começou)', () => {
  const casa = casaBase({ '2026-12': 20000 }); // dezembro: Ana paga 12000 → sobra -6000
  const estado = { meses: [{ mes: '2026-12', aplicado: [], proventos: 0, sugestao: { origem: 'sobra' } }] }; // começou em dez
  const dezembro = regra(casa, estado, '2026-12'); // vermelho: nada para investir
  assert.deepEqual([dezembro.sobra, dezembro.base, dezembro.investir, dezembro.deficitAgora], [-6000, 0, 0, 6000]);
  const janeiro = regra(casa, estado, '2027-01'); // janeiro sobra 5400, mas ainda faltam 6000 de dezembro
  assert.deepEqual([janeiro.sobra, janeiro.deficit, janeiro.base, janeiro.investir, janeiro.deficitAgora], [5400, 6000, 0, 0, 600]);
  const fevereiro = regra(casa, estado, '2027-02'); // sobram 600 de dezembro para cobrir
  assert.deepEqual([fevereiro.deficit, fevereiro.base, fevereiro.investir], [600, 4800, 4320]);
  // Sem nenhum registro pela sobra ainda, o vermelho de antes não é puxado.
  assert.equal(regra(casa, { meses: [] }, '2027-01').deficit, 0);
});

test('investir a sobra: sem os salários do mês, incompleto (o valor volta para o orçamento)', () => {
  const semNovembro = salvarSalario(salvarSalario(casaBase(), { mes: '2026-11', pessoaId: 'p1', valor: null }), { mes: '2026-11', pessoaId: 'p2', valor: null });
  const semOutubro = salvarSalario(salvarSalario(semNovembro, { mes: '2026-10', pessoaId: 'p1', valor: null }), { mes: '2026-10', pessoaId: 'p2', valor: null });
  assert.equal(regra(semOutubro, { meses: [] }, '2026-11').incompleto, true);
  assert.equal(regra(semOutubro, { meses: [] }, '2026-11').mes, '2026-11');
});

test('salário só no Balanço: o a mais de dezembro (13º) entra na sobra e é investido no Dia de pagamento de dezembro', () => {
  const casa = definirSalario(casaBase(), { mes: '2026-12', pessoaId: 'p1', salario: 6000, extra: 6000 });
  const r = regra(casa, { meses: [] }, '2026-12');
  assert.deepEqual([r.sobra, r.base, r.lazer, r.investir], [11400, 11400, 1140, 10260]);
  // Novembro registrado pelo orçamento com 9000 já investidos deste salário: o que saiu é descontado (não investe 2 vezes).
  const antigo = { meses: [{ mes: '2026-11', aplicado: [{ valor: 9000 }], proventos: 0, sugestao: { origem: 'orcamento' } }] };
  assert.deepEqual([regra(casa, antigo, '2026-12').jaInvestido, regra(casa, antigo, '2026-12').investir], [9000, 2160]);
});
