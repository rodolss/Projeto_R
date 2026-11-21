import { test } from 'node:test';
import assert from 'node:assert/strict';
import { definirSalario, extraDoMes, salarioDoPlanoDepois, salarioParaODia } from '../../js/core/salario.js';
import { migrarCasa, salarioNoMes, resumoDoMes } from '../../js/core/casa.js';

const casaBase = () => migrarCasa({
  schemaVersion: 3,
  pessoas: [{ id: 'p1', nome: 'Ana' }, { id: 'p2', nome: 'Leo' }],
  contas: [], meses: [], cartoes: [], outrasPessoas: [],
});

test('salário no Balanço: o salário do mês vai para a casa; o a mais fica à parte (não muda a divisão)', () => {
  let casa = definirSalario(casaBase(), { mes: '2026-12', pessoaId: 'p1', salario: 6000, extra: 6000 });
  casa = definirSalario(casa, { mes: '2026-12', pessoaId: 'p2', salario: 4000, extra: 0 });
  assert.deepEqual(salarioNoMes(casa, '2026-12', 'p1'), { valor: 6000, situacao: 'confirmado', deOnde: null });
  assert.equal(extraDoMes(casa, '2026-12', 'p1'), 6000);
  assert.equal(extraDoMes(casa, '2026-12', 'p2'), 0);
  assert.deepEqual(casa.extras, { '2026-12': { p1: 6000 } }); // sem a mais: nada guardado
  assert.equal(resumoDoMes(casa, '2026-12').renda, 10000); // a divisão usa só os salários
  // Tirar o a mais e depois o salário: volta à previsão e não sobra nada guardado.
  casa = definirSalario(casa, { mes: '2026-12', pessoaId: 'p1', salario: 6000, extra: null });
  assert.equal('extras' in casa, false);
  casa = definirSalario(casa, { mes: '2026-12', pessoaId: 'p1', salario: null, extra: null });
  assert.equal(salarioNoMes(casa, '2026-12', 'p1').situacao, 'vazio');
});

test('salário do plano acompanha o salário do mês digitado no Balanço (do último mês usado em diante)', () => {
  const config = { salario: 5000, mesSalario: '2026-12', recebe13: true };
  assert.deepEqual(salarioDoPlanoDepois(config, { mes: '2027-01', salario: 5200 }), { salario: 5200, mesSalario: '2027-01', recebe13: true });
  assert.deepEqual(salarioDoPlanoDepois(config, { mes: '2026-12', salario: 5100 }), { salario: 5100, mesSalario: '2026-12', recebe13: true });
  assert.equal(salarioDoPlanoDepois(config, { mes: '2026-11', salario: 4000 }), config); // mês antigo: não muda o plano
  assert.equal(salarioDoPlanoDepois(config, { mes: '2027-01', salario: 5000 }), config); // igual
  assert.equal(salarioDoPlanoDepois(config, { mes: '2027-01', salario: null }), config); // tirado
});

test('Dia de pagamento: o salário (e o a mais) do Balanço; pronto só com o salário do mês confirmado', () => {
  let casa = definirSalario(casaBase(), { mes: '2026-11', pessoaId: 'p1', salario: 6000, extra: 0 });
  assert.deepEqual(salarioParaODia({ casa, mes: '2026-12', pessoaId: 'p1' }), { pronto: false, salario: 6000, extra: 0, recebido: 6000 }); // dezembro: previsão
  casa = definirSalario(casa, { mes: '2026-12', pessoaId: 'p1', salario: 6100, extra: 6100 });
  assert.deepEqual(salarioParaODia({ casa, mes: '2026-12', pessoaId: 'p1' }), { pronto: true, salario: 6100, extra: 6100, recebido: 12200 });
  assert.deepEqual(salarioParaODia({ casa: casaBase(), mes: '2026-12', pessoaId: 'p1' }), { pronto: false, salario: null, extra: 0, recebido: null });
});
