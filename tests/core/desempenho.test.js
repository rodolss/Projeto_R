import { test } from 'node:test';
import assert from 'node:assert/strict';
import { perto, i5 } from '../ajuda.js';
import { estimarSaldo, indiceDesempenho, situacaoQueda } from '../../js/core/desempenho.js';

const ponto = (mes, valor, aportesDesdeAnterior = 0) => ({ mes, valor, aportesDesdeAnterior });

test('estimarSaldo cresce pela premissa', () => {
  const r = estimarSaldo({
    ultimoSaldo: { valor: 10000, mes: '2026-11' }, aportesDepois: [{ mes: '2026-12', valor: 1000 }], mesAtual: '2027-01', i: i5,
  });
  perto(r.valor, 11085.72);
  assert.equal(r.estimado, true);
  assert.equal(estimarSaldo({ ultimoSaldo: { valor: 500, mes: '2027-01' }, aportesDepois: [], mesAtual: '2027-01', i: i5 }).estimado, false);
});
test('índice ignora aportes', () => {
  assert.deepEqual(indiceDesempenho([ponto('2026-11', 10000), ponto('2026-12', 12000, 2000)], {}).map((p) => p.indice), [1, 1]);
});
test('índice com saldo anterior zero não divide por zero', () => {
  assert.deepEqual(indiceDesempenho([ponto('2026-11', 0), ponto('2026-12', 1000, 1000)], {}).map((p) => p.indice), [1, 1]);
});
test('índice é real (desconta IPCA)', () => {
  perto(indiceDesempenho([ponto('2026-11', 10000), ponto('2026-12', 10100)], { '2026-12': 0.01 })[1].indice, 1, 1e-9);
});
test('queda de 10% do pico', () => {
  const idx = indiceDesempenho([ponto('2026-11', 10000), ponto('2026-12', 10500), ponto('2027-01', 9000)], {});
  const q = situacaoQueda(idx);
  assert.equal(q.emQueda, true);
  assert.equal(q.mesInicio, '2027-01');
  perto(q.quedaPct, -0.142857, 1e-6);
});
test('recuperação encerra a queda', () => {
  const idx = [{ mes: 'a', indice: 1 }, { mes: 'b', indice: 1.05 }, { mes: 'c', indice: 0.9 }, { mes: 'd', indice: 1.06 }];
  assert.equal(situacaoQueda(idx).emQueda, false);
});
test('sem pontos não está em queda', () => assert.deepEqual(situacaoQueda([]), { emQueda: false, mesInicio: null, quedaPct: 0 }));
