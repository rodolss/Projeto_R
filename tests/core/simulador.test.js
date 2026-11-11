import { test } from 'node:test';
import assert from 'node:assert/strict';
import { perto } from '../ajuda.js';
import { taxaMensal, pmtNecessario } from '../../js/core/financas.js';
import { simular, moverAlavanca, aporteNecessario } from '../../js/core/simulador.js';

// Números inventados (os mesmos do protótipo).
const BASE = { patrimonio: 260000, reserva: 21000, salario: 6000, custoTotal: 3500, ritmo: 2400, consegue: 2500, premissa: 0.05, swr: 0.04, mesAtual: '2026-11', mesAlvo: '2036-11' };
const REAIS = { salario: 6000, custo: 3500, aporte: 2400 };

test('quatro cenários com os números reais', () => {
  const r = simular({ base: BASE, sim: REAIS });
  assert.deepEqual(r.metas, { independencia: 1050000, rendaPlena: 1800000 });
  assert.deepEqual(r.cenarios.map((c) => [c.id, c.meses, c.mes]),
    [['ruim', 330, '2054-05'], ['moderado', 287, '2050-10'], ['normal', 255, '2048-02'], ['bom', 210, '2044-05']]);
});
test('alvo que não fecha: necessário e prazos maiores', () => {
  const r = simular({ base: BASE, sim: REAIS });
  assert.equal(r.alvo.mes, '2036-11');
  assert.equal(r.alvo.situacao, 'nao-fecha');
  perto(r.alvo.necessario, 8917, 1);
  assert.deepEqual(r.prazosMaiores.map((p) => p.mes), ['2041-11', '2046-11']);
  perto(r.prazosMaiores[0].necessario, 4756, 1);
  perto(r.prazosMaiores[1].necessario, 2736, 1);
  assert.equal(r.consegue, 2500);
  assert.equal(r.investeMaisQueConsegue, false);
});
test('cabe no que consegue', () => {
  const r = simular({ base: { ...BASE, consegue: 9000 }, sim: REAIS });
  assert.equal(r.alvo.situacao, 'cabe');
  perto(r.alvo.aMais, 8917 - 2400, 1);
});
test('chega antes do alvo', () => {
  assert.equal(simular({ base: BASE, sim: { ...REAIS, aporte: 15000 } }).alvo.situacao, 'antes');
});
test('alvo já passou: prazos contam de hoje', () => {
  const r = simular({ base: { ...BASE, mesAlvo: '2026-11' }, sim: REAIS });
  assert.equal(r.alvo.situacao, 'passou');
  assert.equal(r.alvo.necessario, null);
  assert.equal(r.alvo.aMais, null);
  assert.deepEqual(r.prazosMaiores.map((p) => p.mes), ['2031-11', '2036-11']);
});
test('alavancas ligadas', () => {
  assert.deepEqual(moverAlavanca(REAIS, 'salario', 7000), { salario: 7000, custo: 3500, aporte: 3400 });
  assert.deepEqual(moverAlavanca(REAIS, 'custo', 3800), { salario: 6000, custo: 3800, aporte: 2100 });
  assert.deepEqual(moverAlavanca(REAIS, 'custo', 9000), { salario: 6000, custo: 9000, aporte: 0 });
  assert.deepEqual(moverAlavanca(REAIS, 'aporte', 5000), { salario: 6000, custo: 3500, aporte: 5000 });
});
test('consegue acompanha as alavancas e avisa o excesso', () => {
  const r = simular({ base: BASE, sim: { salario: 7000, custo: 3800, aporte: 3000 } });
  assert.equal(r.consegue, 3200);
  assert.equal(r.investeMaisQueConsegue, false);
  assert.equal(simular({ base: BASE, sim: { ...REAIS, aporte: 2600 } }).investeMaisQueConsegue, true);
});
test('custo simulado maior aumenta a reserva que falta e atrasa a renda plena', () => {
  const r = simular({ base: BASE, sim: { salario: 6000, custo: 5000, aporte: 2400 } });
  assert.equal(r.metas.independencia, 1500000);
  assert.ok(r.cenarios[2].meses > 255);
});
test('aporteNecessario: coerente com pmtNecessario e com a reserva', () => {
  const i = taxaMensal(0.05);
  const args = { patrimonio: 260000, meta: 1800000, i, mesAtual: '2026-11', mesLimite: '2036-11' };
  perto(aporteNecessario(args), pmtNecessario({ p: 260000, meta: 1800000, i, meses: 120 }), 1);
  assert.ok(aporteNecessario({ ...args, reservaFaltando: 20000 }) > aporteNecessario(args));
  assert.equal(aporteNecessario({ ...args, mesLimite: '2026-11' }), Infinity);
  assert.equal(aporteNecessario({ ...args, patrimonio: 2000000 }), 0);
});
test('valores extremos não geram NaN nem Infinity no resultado (Review Focus 4)', () => {
  for (const sim of [{ salario: 0, custo: 0, aporte: 0 }, { salario: 6000, custo: 9000, aporte: 0 }, { salario: 30000, custo: 500, aporte: 0 }]) {
    const r = simular({ base: BASE, sim });
    const numeros = [r.consegue, r.alvo.necessario, r.alvo.aMais, ...r.prazosMaiores.map((p) => p.necessario)].filter((v) => v !== null);
    for (const v of numeros) assert.ok(Number.isFinite(v) && v >= 0, `valor inválido: ${v}`);
    for (const c of r.cenarios) assert.ok(c.meses === null || Number.isInteger(c.meses));
  }
});
