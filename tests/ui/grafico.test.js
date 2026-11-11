import { test } from 'node:test';
import assert from 'node:assert/strict';
import { somarMeses } from '../../js/core/meses.js';
import { graficoTrajetoria, graficoZoom, abreviar, anel } from '../../js/ui/grafico.js';

const serie = (n, f) => Array.from({ length: n }, (_, k) => ({ mes: somarMeses('2026-11', k), valor: f(k) }));

test('svg sem NaN e com as quatro camadas', () => {
  const svg = graficoTrajetoria({
    plano: serie(121, (k) => 9500 + k * 13000),
    real: serie(9, (k) => 9500 + k * 11000),
    projecao: serie(130, (k) => 9500 + k * 12500),
    faixa: { otimista: serie(120, (k) => k * 14000), pessimista: serie(140, (k) => k * 11000) },
    meta: 1650000,
    mesAlvo: '2036-11',
  });
  assert.ok(svg.startsWith('<svg'));
  assert.ok(!svg.includes('NaN'));
  assert.equal((svg.match(/<polyline/g) || []).length, 3);
  assert.ok(svg.includes('<polygon'));
});
test('séries vazias não quebram', () => {
  const svg = graficoTrajetoria({ plano: [], real: [], projecao: [], faixa: { otimista: [], pessimista: [] }, meta: 0, mesAlvo: '2036-11' });
  assert.ok(svg.startsWith('<svg'));
  assert.ok(!svg.includes('NaN'));
});
test('zoom usa só os últimos 12 meses', () => {
  const svg = graficoZoom({ plano: serie(30, (k) => k), real: serie(30, (k) => k) });
  assert.equal((svg.match(/<circle/g) || []).length, 12);
  assert.ok(!svg.includes('NaN'));
});
test('abreviar valores dos eixos', () => {
  assert.equal(abreviar(1500000), '1,5 mi');
  assert.equal(abreviar(1650000), '1,65 mi');
  assert.equal(abreviar(500000), '500 mil');
  assert.equal(abreviar(0), '0');
});
test('anel: sem NaN e limitado entre 0 e 1', () => {
  for (const f of [NaN, -1, 0, 0.001, 0.25, 1, 3]) {
    const s = anel({ fracao: f });
    assert.ok(s.startsWith('<svg') && !s.includes('NaN'));
  }
  assert.match(anel({ fracao: 1 }), /stroke-dashoffset="0"/);
});
