import { test } from 'node:test';
import assert from 'node:assert/strict';
import { perto } from '../ajuda.js';
import {
  TIPOS_EXTRA, perguntarExtra, calcularExcedente, anuaisFaltando, somarAoCiclo, alvoReserva,
} from '../../js/core/protecao.js';

const base = { salario: 7800, custoMensal: 5000, provisao: 0, anuaisFaltando: 0 };

test('mês normal', () => {
  const r = calcularExcedente({ ...base, recebido: 7800 });
  assert.equal(r.excedente, 2800);
  assert.equal(r.paraDiaADia, 5000);
  assert.equal(r.semAporte, false);
});
test('recebeu menos que o custo de vida', () => {
  const r = calcularExcedente({ ...base, recebido: 4000 });
  assert.equal(r.semAporte, true);
  assert.equal(r.motivo, 'custo-de-vida');
  assert.equal(r.excedente, 0);
});
test('13º cobre as anuais primeiro', () => {
  const r = calcularExcedente({ ...base, recebido: 15600, tipoExtra: 'decimo-terceiro', anuaisFaltando: 6000 });
  assert.equal(r.paraAnuais, 6000);
  assert.equal(r.excedente, 4600);
});
test('férias: só 1/3 é extra, o resto fica para o mês seguinte', () => {
  const r = calcularExcedente({ ...base, recebido: 18200, tipoExtra: 'ferias' });
  assert.equal(r.guardarParaProximoMes, 7800);
  assert.equal(r.excedente, 5400);
});
test('mês depois das férias usa o valor guardado', () => {
  const r = calcularExcedente({ ...base, recebido: 0, pendenteDoMesAnterior: 7800 });
  assert.equal(r.excedente, 2800);
  assert.equal(r.semAporte, false);
});
test('provisão mensal sai do excedente', () => perto(calcularExcedente({ ...base, recebido: 7800, provisao: 666.67 }).excedente, 2133.33));
test('provisão aparece separada e não vira dia a dia (revisão I7)', () => {
  const r = calcularExcedente({ ...base, recebido: 7800, provisao: 666.67 });
  perto(r.provisao, 666.67);
  perto(r.paraDiaADia, 5000);
  perto(r.excedente, 2133.33);
});
test('provisão parcial quando sobra pouco (revisão I7)', () => {
  const r = calcularExcedente({ ...base, recebido: 5500, provisao: 600 });
  perto(r.provisao, 500);
  perto(r.paraDiaADia, 5000);
});
test('sem sobra', () => {
  const r = calcularExcedente({ ...base, recebido: 5500, provisao: 600 });
  assert.equal(r.semAporte, true);
  assert.equal(r.motivo, 'sem-sobra');
});
test('perguntarExtra', () => {
  assert.equal(perguntarExtra({ recebidoEfetivo: 8580, salario: 7800 }), false);
  assert.equal(perguntarExtra({ recebidoEfetivo: 8581, salario: 7800 }), true);
});
test('ciclo anual', () => {
  const c = somarAoCiclo({}, '2026-12', 2000);
  assert.equal(anuaisFaltando({ anual: 6000, contadores: c, mes: '2027-03' }), 4000);
  assert.equal(anuaisFaltando({ anual: 6000, contadores: c, mes: '2027-11' }), 6000);
});
test('alvo da reserva', () => assert.equal(alvoReserva(5500), 33000));
test('tipos de extra', () => assert.deepEqual(TIPOS_EXTRA, ['decimo-terceiro', 'ferias', 'plr', 'outro']));
