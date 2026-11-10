import { test } from 'node:test';
import assert from 'node:assert/strict';
import { i5 } from '../ajuda.js';
import {
  ritmoDeAportes, projetar, faixaProjecao, classificarStatus, acaoSugerida, proventosMedios, impactoNoPrazo,
} from '../../js/core/projecao.js';

const p = { patrimonio: 128400, aporteMensal: 9200, i: i5, meta: 1650000, mesAtual: '2027-07' };

test('projetar', () => assert.deepEqual(projetar(p), { meses: 122, mes: '2037-09' }));
test('projetar com reserva em formação', () => {
  assert.equal(projetar({ ...p, reservaFaltando: 18400 }).meses, 124);
  assert.equal(projetar({ ...p, reservaFaltando: 10000 }).meses, 123);
});
test('projetar inalcançável', () => assert.deepEqual(projetar({ ...p, patrimonio: 0, aporteMensal: 0 }), { meses: null, mes: null }));
test('faixa 3%–7%', () => {
  const f = faixaProjecao({ patrimonio: 128400, aporteMensal: 9200, rentabilidade: 0.05, meta: 1650000, mesAtual: '2027-07' });
  assert.equal(f.otimista.meses, 111);
  assert.equal(f.central.meses, 122);
  assert.equal(f.pessimista.meses, 135);
});
test('status', () => {
  const s = (m) => classificarStatus({ mesProjetado: m, mesAlvo: '2036-11' });
  assert.equal(s('2036-08'), 'adiantado');
  assert.equal(s('2036-09'), 'no-caminho');
  assert.equal(s('2037-02'), 'no-caminho');
  assert.equal(s('2037-03'), 'atencao');
  assert.equal(s('2037-11'), 'atencao');
  assert.equal(s('2037-12'), 'atrasado');
  assert.equal(s(null), 'atrasado');
});
test('ritmo real e esperado', () => {
  const h = [
    { mes: '2027-01', aplicadoCarteira: 9000, aplicadoCaixa: 0 },
    { mes: '2027-02', aplicadoCarteira: 9400, aplicadoCaixa: 0 },
    { mes: '2027-04', aplicadoCarteira: 9200, aplicadoCaixa: 400 },
  ];
  assert.deepEqual(ritmoDeAportes({ historico: h, mesInicio: '2027-01', excedenteEsperado: 9000 }), { valor: 7000, fonte: 'real' });
  assert.deepEqual(ritmoDeAportes({ historico: h.slice(0, 2), mesInicio: '2027-01', excedenteEsperado: 9000 }), { valor: 9000, fonte: 'esperado' });
  assert.deepEqual(ritmoDeAportes({ historico: [], mesInicio: '2027-01', excedenteEsperado: 9000 }), { valor: 9000, fonte: 'esperado' });
});
test('ação sugerida', () => {
  assert.deepEqual(acaoSugerida({ pmtNec: 10200, ritmo: 9200 }), { aporteExtra: 1000 });
  assert.equal(acaoSugerida({ pmtNec: 8000, ritmo: 9200 }), null);
  assert.equal(acaoSugerida({ pmtNec: Infinity, ritmo: 9200 }), null);
});
test('proventos médios', () => {
  assert.equal(proventosMedios({ historico: [{ mes: '2027-01', proventos: 300 }, { mes: '2027-03', proventos: 600 }], mesInicio: '2027-01' }), 300);
  assert.equal(proventosMedios({ historico: [], mesInicio: '2027-01' }), 0);
});
test('impacto de +R$ 300/mês', () => {
  assert.equal(impactoNoPrazo({ patrimonio: 128400, aporteMensal: 9200, i: i5, custoTotal: 5500, swr: 0.04, deltaCustoMensal: 300 }), 9);
});
