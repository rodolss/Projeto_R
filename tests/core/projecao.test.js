import { test } from 'node:test';
import assert from 'node:assert/strict';
import { i5 } from '../ajuda.js';
import {
  ritmoDeAportes, projetar, proventosMedios, impactoNoPrazo, cenarios, setinha,
} from '../../js/core/projecao.js';

const p = { patrimonio: 128400, aporteMensal: 9200, i: i5, meta: 1650000, mesAtual: '2027-07' };

test('projetar', () => assert.deepEqual(projetar(p), { meses: 122, mes: '2037-09' }));
test('projetar com reserva em formação', () => {
  assert.equal(projetar({ ...p, reservaFaltando: 18400 }).meses, 124);
  assert.equal(projetar({ ...p, reservaFaltando: 10000 }).meses, 123);
});
test('projetar inalcançável', () => assert.deepEqual(projetar({ ...p, patrimonio: 0, aporteMensal: 0 }), { meses: null, mes: null }));
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
test('proventos médios', () => {
  assert.equal(proventosMedios({ historico: [{ mes: '2027-01', proventos: 300 }, { mes: '2027-03', proventos: 600 }], mesInicio: '2027-01' }), 300);
  assert.equal(proventosMedios({ historico: [], mesInicio: '2027-01' }), 0);
});
test('impacto no prazo da renda plena: gastar mais tira do aporte', () => {
  const base = { patrimonio: 260000, aporteMensal: 2400, i: i5, metaRendaPlena: 1800000 };
  assert.ok(impactoNoPrazo({ ...base, deltaCustoMensal: 300 }) > 0);
  assert.ok(impactoNoPrazo({ ...base, deltaCustoMensal: -300 }) < 0);
  assert.equal(impactoNoPrazo({ ...base, deltaCustoMensal: 0 }), 0);
});
test('cenários acompanham a premissa', () => {
  assert.deepEqual(cenarios(0.05).map((c) => [c.id, c.nome, c.emoji, Number(c.taxa.toFixed(4))]), [
    ['ruim', 'Ruim', '😟', 0.03], ['moderado', 'Moderado', '😐', 0.04], ['normal', 'Normal', '🙂', 0.05], ['bom', 'Bom', '😄', 0.07],
  ]);
  assert.deepEqual(cenarios(0.06).map((c) => Number(c.taxa.toFixed(4))), [0.04, 0.05, 0.06, 0.08]);
});
test('setinha compara o tempo que falta com o último mês anterior', () => {
  const meses = [{ mes: '2027-01', previsao: { mesRendaPlena: '2048-05' } }, { mes: '2027-02', previsao: { mesRendaPlena: '2048-04' } }];
  assert.deepEqual(setinha({ meses, mesAtual: '2027-03', faltamAgora: 251 }), { delta: -3, mesComparado: '2027-02', imediato: true });
});
test('setinha ignora o próprio mês e avisa quando o comparado não é o anterior', () => {
  const meses = [{ mes: '2026-12', previsao: { mesRendaPlena: '2048-02' } }, { mes: '2027-03', previsao: { mesRendaPlena: '2048-01' } }];
  assert.deepEqual(setinha({ meses, mesAtual: '2027-03', faltamAgora: 250 }), { delta: -4, mesComparado: '2026-12', imediato: false });
});
test('setinha some sem base de comparação', () => {
  assert.equal(setinha({ meses: [], mesAtual: '2027-03', faltamAgora: 250 }), null);
  assert.equal(setinha({ meses: [{ mes: '2027-02' }], mesAtual: '2027-03', faltamAgora: 250 }), null);
  assert.equal(setinha({ meses: [{ mes: '2027-02', previsao: { mesRendaPlena: null } }], mesAtual: '2027-03', faltamAgora: 250 }), null);
  assert.equal(setinha({ meses: [{ mes: '2027-02', previsao: { mesRendaPlena: '2048-01' } }], mesAtual: '2027-03', faltamAgora: null }), null);
});
