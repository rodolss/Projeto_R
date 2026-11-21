import { test } from 'node:test';
import assert from 'node:assert/strict';
import { definirSalario, extraDoMes, salarioDoPlanoPelaCasa, salarioParaODia, rascunhoComBalanco } from '../../js/core/salario.js';
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

test('revisão: o salário do plano é o do último mês confirmado até hoje — mês futuro não mexe, mês menor não trava, tirar desfaz', () => {
  const config = { salario: 4000, mesSalario: '2026-10', recebe13: true };
  let casa = definirSalario(casaBase(), { mes: '2026-11', pessoaId: 'p1', salario: 5000, extra: 0 });
  casa = definirSalario(casa, { mes: '2027-10', pessoaId: 'p1', salario: 50000, extra: 0 }); // mês futuro (o Balanço deixa avançar)
  assert.deepEqual(salarioDoPlanoPelaCasa(config, { casa, pessoaId: 'p1', hoje: '2026-11-21' }), { salario: 5000, mesSalario: '2026-11', recebe13: true });
  // Um mês menor (dezembro) e um normal (janeiro): em janeiro o plano volta ao normal.
  casa = definirSalario(casa, { mes: '2026-12', pessoaId: 'p1', salario: 300, extra: 0 });
  casa = definirSalario(casa, { mes: '2027-01', pessoaId: 'p1', salario: 5000, extra: 6000 });
  assert.deepEqual(salarioDoPlanoPelaCasa(config, { casa, pessoaId: 'p1', hoje: '2026-12-10' }).salario, 300);
  assert.deepEqual(salarioDoPlanoPelaCasa(config, { casa, pessoaId: 'p1', hoje: '2027-01-10' }), { salario: 5000, mesSalario: '2027-01', recebe13: true }); // o a mais não entra
  // Tirar o salário de janeiro: volta ao último confirmado antes (dezembro).
  const semJaneiro = definirSalario(casa, { mes: '2027-01', pessoaId: 'p1', salario: null, extra: null });
  assert.equal(salarioDoPlanoPelaCasa(config, { casa: semJaneiro, pessoaId: 'p1', hoje: '2027-01-10' }).mesSalario, '2026-12');
  // Mesmo valor num mês mais novo: o mês do salário anda (a correção pela inflação parte dele).
  const igual = { salario: 5000, mesSalario: '2026-11' };
  assert.deepEqual(salarioDoPlanoPelaCasa(igual, { casa, pessoaId: 'p1', hoje: '2027-01-10' }), { salario: 5000, mesSalario: '2027-01' });
  // Já em dia, ou sem nenhum salário confirmado: o mesmo objeto.
  const emDia = { salario: 5000, mesSalario: '2027-01' };
  assert.equal(salarioDoPlanoPelaCasa(emDia, { casa, pessoaId: 'p1', hoje: '2027-01-10' }), emDia);
  assert.equal(salarioDoPlanoPelaCasa(config, { casa: casaBase(), pessoaId: 'p1', hoje: '2027-01-10' }), config);
});

test('Dia de pagamento: o salário (e o a mais) do Balanço; pronto só com o salário do mês confirmado', () => {
  let casa = definirSalario(casaBase(), { mes: '2026-11', pessoaId: 'p1', salario: 6000, extra: 0 });
  assert.deepEqual(salarioParaODia({ casa, mes: '2026-12', pessoaId: 'p1' }), { pronto: false, salario: 6000, extra: 0, recebido: 6000 }); // dezembro: previsão
  casa = definirSalario(casa, { mes: '2026-12', pessoaId: 'p1', salario: 6100, extra: 6100 });
  assert.deepEqual(salarioParaODia({ casa, mes: '2026-12', pessoaId: 'p1' }), { pronto: true, salario: 6100, extra: 6100, recebido: 12200 });
  assert.deepEqual(salarioParaODia({ casa: casaBase(), mes: '2026-12', pessoaId: 'p1' }), { pronto: false, salario: null, extra: 0, recebido: null });
});

test('Dia de pagamento sem a etapa do salário: o rascunho já vem com o salário do Balanço (ou a previsão, ou o do plano)', () => {
  const base = { mes: '2026-12', editando: false, recebido: 999, tipoExtra: 'plr', proventos: 10, saldos: null, saldosModo: null, feito: { salario: false, proventos: true } };
  assert.deepEqual(rascunhoComBalanco(base, { pronto: true, salario: 6000, extra: 100, recebido: 6100 }, 5000),
    { ...base, recebido: 6100, tipoExtra: null, feito: { salario: true, proventos: true } });
  // Ainda não confirmado no Balanço: a previsão (igual ao mês anterior); sem nada na casa: o salário do plano.
  assert.equal(rascunhoComBalanco(base, { pronto: false, salario: 6000, extra: 0, recebido: 6000 }, 5000).recebido, 6000);
  assert.deepEqual(rascunhoComBalanco(base, { pronto: false, salario: null, extra: 0, recebido: null }, 5000).feito, { salario: true, proventos: true });
  assert.equal(rascunhoComBalanco(base, { pronto: false, salario: null, extra: 0, recebido: null }, 5000).recebido, 5000);
});
