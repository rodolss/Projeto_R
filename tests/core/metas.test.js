import { test } from 'node:test';
import assert from 'node:assert/strict';
import { perto } from '../ajuda.js';
import {
  custoDeVida, calcularMetas, provisaoMensal, rendaDoPatrimonio, CATEGORIAS_SUGERIDAS, precisaRevisarOrcamento,
} from '../../js/core/metas.js';

test('custoDeVida inclui anuais/12', () => {
  assert.deepEqual(
    custoDeVida([{ tipo: 'mensal', valor: 5000 }, { tipo: 'anual', valor: 6000 }]),
    { mensal: 5000, anual: 6000, total: 5500 },
  );
});
test('metas', () => {
  assert.deepEqual(calcularMetas({ custoTotal: 5500, salario: 7800, swr: 0.04 }), { independencia: 1650000, rendaPlena: 2340000 });
});
test('provisão', () => {
  assert.equal(provisaoMensal({ anual: 6000, salario: 7800, recebe13: true, recebeFerias: true }), 0);
  perto(provisaoMensal({ anual: 12000, salario: 3000, recebe13: true, recebeFerias: true }), 666.67);
  assert.equal(provisaoMensal({ anual: 12000, salario: 3000, recebe13: false, recebeFerias: false }), 1000);
});
test('renda do patrimônio', () => perto(rendaDoPatrimonio(1504879.41, 0.04), 5016.26));
test('revisão a cada 6 meses', () => {
  assert.equal(precisaRevisarOrcamento('2026-11', '2027-05'), true);
  assert.equal(precisaRevisarOrcamento('2026-11', '2027-04'), false);
  assert.equal(precisaRevisarOrcamento(null, '2027-05'), false);
});
test('categorias sugeridas têm mensais e anuais', () => {
  assert.ok(CATEGORIAS_SUGERIDAS.some((c) => c.nome === 'IPVA' && c.tipo === 'anual'));
  assert.ok(CATEGORIAS_SUGERIDAS.some((c) => c.nome === 'Mercado' && c.tipo === 'mensal'));
});
