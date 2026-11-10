import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decidirAporte, tetoCaixa } from '../../js/core/aporte.js';

const b = {
  reserva: 33000, alvoReserva: 33000, emQueda: false, caixa: 0, caixaNoInicioDaQueda: 0, tetoCaixa: 55200, pmtNec: 10225,
};

test('reserva incompleta recebe tudo', () => {
  const r = decidirAporte({ ...b, excedente: 2800, reserva: 20000 });
  assert.equal(r.paraReserva, 2800);
  assert.equal(r.paraCarteira, 0);
});
test('reserva completa no meio do mês', () => {
  const r = decidirAporte({ ...b, excedente: 2800, reserva: 32000 });
  assert.equal(r.paraReserva, 1000);
  assert.equal(r.paraCarteira, 1800);
});
test('abaixo da trajetória: tudo na carteira', () => assert.equal(decidirAporte({ ...b, excedente: 9200 }).paraCarteira, 9200));
test('adiantado: diferença vai para a caixa', () => {
  const r = decidirAporte({ ...b, excedente: 9200, pmtNec: 6000 });
  assert.equal(r.paraCarteira, 6000);
  assert.equal(r.paraCaixa, 3200);
});
test('caixa perto do teto', () => {
  const r = decidirAporte({ ...b, excedente: 9200, pmtNec: 6000, caixa: 54000 });
  assert.equal(r.paraCaixa, 1200);
  assert.equal(r.paraCarteira, 8000);
});
test('queda: usa 1/3 da caixa e não enche a caixa', () => {
  const r = decidirAporte({ ...b, excedente: 9200, pmtNec: 6000, emQueda: true, caixa: 30000, caixaNoInicioDaQueda: 30000 });
  assert.equal(r.paraCarteira, 9200);
  assert.equal(r.daCaixaParaCarteira, 10000);
  assert.equal(r.paraCaixa, 0);
  assert.equal(decidirAporte({ ...b, excedente: 9200, emQueda: true, caixa: 5000, caixaNoInicioDaQueda: 30000 }).daCaixaParaCarteira, 5000);
});
test('depois do prazo tudo vai para a carteira', () => assert.equal(decidirAporte({ ...b, excedente: 9200, pmtNec: Infinity }).paraCarteira, 9200));
test('proventos são reinvestidos', () => assert.equal(decidirAporte({ ...b, excedente: 9200, proventos: 300 }).aDistribuir, 9500));
test('tetoCaixa', () => assert.equal(tetoCaixa(9200), 55200));
