import { test } from 'node:test';
import assert from 'node:assert/strict';
import { topoDaEscala, rotuloDoMes } from '../../js/ui/carteira-graficos.js';

test('topoDaEscala: o próximo número redondo (1, 2, 2,5, 5 × 10^n) acima do maior valor', () => {
  assert.equal(topoDaEscala(0), 1);
  assert.equal(topoDaEscala(87), 100);
  assert.equal(topoDaEscala(180), 200);
  assert.equal(topoDaEscala(2100), 2500);
  assert.equal(topoDaEscala(20800), 25000);
  assert.equal(topoDaEscala(41000), 50000);
  assert.equal(topoDaEscala(100000), 100000);
});

test('rotuloDoMes: "dez/26"', () => {
  assert.equal(rotuloDoMes('2026-12'), 'dez/26');
  assert.equal(rotuloDoMes('2027-01'), 'jan/27');
});
