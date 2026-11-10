import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatarBRL, parseBRL, formatarPct } from '../../js/core/formato.js';

test('formatarBRL', () => {
  assert.equal(formatarBRL(1234.56), 'R$ 1.234,56');
  assert.equal(formatarBRL(0), 'R$ 0,00');
  assert.equal(formatarBRL(-5), '-R$ 5,00');
});
test('parseBRL aceita formatos brasileiros', () => {
  assert.equal(parseBRL('R$ 7.800,00'), 7800);
  assert.equal(parseBRL('7.800'), 7800);
  assert.equal(parseBRL('7800,5'), 7800.5);
  assert.equal(parseBRL('7800.5'), 7800.5);
  assert.equal(parseBRL('1.234.567'), 1234567);
  assert.equal(parseBRL('0'), 0);
});
test('parseBRL rejeita entradas inválidas', () => {
  for (const t of ['', '   ', 'abc', '-50', '1,2,3']) assert.equal(parseBRL(t), null, `entrada: "${t}"`);
});
test('formatarPct', () => {
  assert.equal(formatarPct(0.0643), '6,4%');
  assert.equal(formatarPct(0.25, 0), '25%');
});
