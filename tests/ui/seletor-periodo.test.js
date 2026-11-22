// Seletor de mês (desenho 2026-11-22-seletor-de-mes).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mesesDaGrade, temMesNoAno } from '../../js/ui/seletor-periodo.js';

test('temMesNoAno: a seta de um ano só liga se ele tiver algum mês dentro dos limites', () => {
  const limites = { min: '2026-10', max: '2027-11' };
  assert.equal(temMesNoAno(2025, limites), false);
  assert.equal(temMesNoAno(2026, limites), true);
  assert.equal(temMesNoAno(2027, limites), true);
  assert.equal(temMesNoAno(2028, limites), false);
});

test('mesesDaGrade: os 12 meses do ano, com o mês aberto marcado e os fora dos limites desligados', () => {
  const grade = mesesDaGrade(2026, { min: '2026-03', max: '2027-11', atual: '2026-11' });
  assert.equal(grade.length, 12);
  assert.deepEqual(grade[0], { mes: '2026-01', rotulo: 'jan', desligado: true, atual: false });
  assert.deepEqual(grade[2], { mes: '2026-03', rotulo: 'mar', desligado: false, atual: false });
  assert.deepEqual(grade[10], { mes: '2026-11', rotulo: 'nov', desligado: false, atual: true });
  assert.equal(grade[11].rotulo, 'dez');
});

test('mesesDaGrade: no último ano, os meses depois do limite ficam desligados', () => {
  const grade = mesesDaGrade(2027, { min: '2026-03', max: '2027-11', atual: '2026-11' });
  assert.deepEqual(grade.filter((m) => m.desligado).map((m) => m.mes), ['2027-12']);
  assert.equal(grade.some((m) => m.atual), false);
});
