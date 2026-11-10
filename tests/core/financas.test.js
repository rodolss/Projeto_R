import { test } from 'node:test';
import assert from 'node:assert/strict';
import { perto, i3, i5, i7 } from '../ajuda.js';
import {
  taxaMensal, crescer, valorFuturo, pmtNecessario, mesesAteMeta, pmtInicial, patrimonioPlanejado,
} from '../../js/core/financas.js';

test('taxaMensal', () => {
  perto(taxaMensal(0.05), 0.0040741237836, 1e-12);
  perto(taxaMensal(0.08), 0.00643403011, 1e-10);
});
test('crescer', () => perto(crescer(1000, i5, 12), 1050));
test('valorFuturo', () => {
  perto(valorFuturo({ p: 128400, aporte: 9200, i: i5, meses: 112 }), 1504879.41);
  assert.equal(valorFuturo({ p: 100, aporte: 10, i: 0, meses: 5 }), 150);
});
test('pmtNecessario', () => {
  perto(pmtNecessario({ p: 128400, meta: 1650000, i: i5, meses: 112 }), 10225.10);
  assert.equal(pmtNecessario({ p: 2000000, meta: 1650000, i: i5, meses: 12 }), 0);
  assert.equal(pmtNecessario({ p: 1000, meta: 1650000, i: i5, meses: 0 }), Infinity);
});
test('mesesAteMeta', () => {
  assert.equal(mesesAteMeta({ p: 128400, aporte: 9200, i: i5, meta: 1650000 }), 122);
  assert.equal(mesesAteMeta({ p: 128400, aporte: 9200, i: i3, meta: 1650000 }), 135);
  assert.equal(mesesAteMeta({ p: 128400, aporte: 9200, i: i7, meta: 1650000 }), 111);
  assert.equal(mesesAteMeta({ p: 128400, aporte: 9200, i: i5, meta: 4500000 }), 257);
  assert.equal(mesesAteMeta({ p: 1650000, aporte: 0, i: i5, meta: 1650000 }), 0);
  assert.equal(mesesAteMeta({ p: 0, aporte: 0, i: i5, meta: 1650000 }), null);
});
test('trajetória planejada', () => {
  perto(pmtInicial({ p0: 50000, meta: 1650000, i: i5, prazo: 120 }), 10161.46);
  perto(patrimonioPlanejado({ p0: 50000, meta: 1650000, i: i5, prazo: 120, t: 8 }), 134113.43);
  perto(patrimonioPlanejado({ p0: 50000, meta: 1650000, i: i5, prazo: 120, t: 120 }), 1650000);
});
