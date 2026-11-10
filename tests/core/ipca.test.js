import { test } from 'node:test';
import assert from 'node:assert/strict';
import { perto } from '../ajuda.js';
import { parseSerieSgs, ultimoMes, fatorInflacao, mesesFaltando, paraReaisDeHoje } from '../../js/core/ipca.js';

const amostra = [
  { data: '01/07/2026', valor: '0.07' },
  { data: '01/08/2026', valor: '-0.32' },
  { data: '01/09/2026', valor: '0.82' },
];

test('parseSerieSgs', () => {
  const s = parseSerieSgs(amostra);
  perto(s['2026-08'], -0.0032, 1e-12);
  assert.equal(ultimoMes(s), '2026-09');
  assert.equal(ultimoMes({}), null);
});
test('fatorInflacao', () => {
  const s = parseSerieSgs(amostra);
  perto(fatorInflacao(s, '2026-06', '2026-09'), 1.005677241632, 1e-9);
  assert.equal(fatorInflacao(s, '2026-09', '2026-09'), 1);
});
test('paraReaisDeHoje', () => {
  const s = parseSerieSgs(amostra);
  perto(paraReaisDeHoje(1000, '2026-06', s), 1005.68);
  assert.equal(paraReaisDeHoje(1000, '2026-06', {}), 1000);
});
test('mês sem dado não quebra e é listado', () => {
  const s = { '2026-07': 0.01, '2026-09': 0.01 };
  perto(fatorInflacao(s, '2026-06', '2026-09'), 1.0201, 1e-9);
  assert.deepEqual(mesesFaltando(s, '2026-06', '2026-09'), ['2026-08']);
});
