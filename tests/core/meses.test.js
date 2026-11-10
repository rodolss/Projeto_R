import { test } from 'node:test';
import assert from 'node:assert/strict';
import { somarMeses, diffMeses, mesDe, dataISO, diasEntre, formatarMes, cicloAnual } from '../../js/core/meses.js';

test('somarMeses atravessa o ano', () => {
  assert.equal(somarMeses('2026-11', 3), '2027-02');
  assert.equal(somarMeses('2027-07', 122), '2037-09');
  assert.equal(somarMeses('2027-01', -1), '2026-12');
});
test('diffMeses', () => {
  assert.equal(diffMeses('2026-11', '2036-11'), 120);
  assert.equal(diffMeses('2027-03', '2027-01'), -2);
});
test('formatarMes', () => {
  assert.equal(formatarMes('2026-11'), 'nov/2026');
  assert.equal(formatarMes('2037-02'), 'fev/2037');
});
test('cicloAnual vai de novembro a outubro', () => {
  assert.equal(cicloAnual('2026-11'), '2026');
  assert.equal(cicloAnual('2027-10'), '2026');
  assert.equal(cicloAnual('2027-11'), '2027');
});
test('mesDe e dataISO', () => {
  assert.equal(mesDe(new Date(2026, 10, 10)), '2026-11');
  assert.equal(dataISO(new Date(2026, 10, 5)), '2026-11-05');
});
test('diasEntre', () => {
  assert.equal(diasEntre('2026-11-10', '2026-12-15'), 35);
  assert.equal(diasEntre('2026-11-10', '2026-11-10'), 0);
});
