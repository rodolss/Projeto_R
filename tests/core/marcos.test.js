import { test } from 'node:test';
import assert from 'node:assert/strict';
import { avaliarMarcos, registrarComemoracao, MARCOS } from '../../js/core/marcos.js';

const metas = { independencia: 1050000, rendaPlena: 1800000 };

test('ordem dos marcos', () => assert.deepEqual(MARCOS, ['reserva', 'independencia', 'rendaPlena']));
test('reserva conta mesmo estimada; mostra quanto falta', () => {
  assert.deepEqual(avaliarMarcos({ reserva: 21000, alvoReserva: 21000, patrimonio: 0, metas, saldosConfirmados: false }).reserva, { atingido: true, falta: 0 });
  assert.deepEqual(avaliarMarcos({ reserva: 15000, alvoReserva: 21000, patrimonio: 0, metas, saldosConfirmados: false }).reserva, { atingido: false, falta: 6000 });
});
test('sem orçamento e sem metas não há marco atingido', () => {
  const m = avaliarMarcos({ reserva: 0, alvoReserva: 0, patrimonio: 0, metas: { independencia: 0, rendaPlena: 0 }, saldosConfirmados: true });
  assert.equal(m.reserva.atingido, false);
  assert.equal(m.independencia.atingido, false);
  assert.equal(m.rendaPlena.atingido, false);
  assert.deepEqual(m.aComemorar, []);
});
test('independência e renda plena pedem saldos confirmados', () => {
  const base = { reserva: 21000, alvoReserva: 21000, patrimonio: 1100000, metas };
  assert.deepEqual(avaliarMarcos({ ...base, saldosConfirmados: false }).independencia, { atingido: false, quaseLa: true });
  assert.deepEqual(avaliarMarcos({ ...base, saldosConfirmados: true }).independencia, { atingido: true, quaseLa: false });
  assert.deepEqual(avaliarMarcos({ ...base, saldosConfirmados: true }).rendaPlena, { atingido: false, quaseLa: false });
});
test('comemora uma vez, na ordem do caminho', () => {
  const base = { reserva: 21000, alvoReserva: 21000, patrimonio: 1900000, metas, saldosConfirmados: true };
  assert.deepEqual(avaliarMarcos(base).aComemorar, ['reserva', 'independencia', 'rendaPlena']);
  assert.deepEqual(avaliarMarcos({ ...base, comemorados: { reserva: '2027-01-01' } }).aComemorar, ['independencia', 'rendaPlena']);
});
test('registrarComemoracao guarda a data sem sobrescrever nem mutar', () => {
  const e = { marcos: { reserva: '2027-01-01' } };
  const novo = registrarComemoracao(e, ['reserva', 'independencia'], '2035-05-05');
  assert.deepEqual(novo.marcos, { reserva: '2027-01-01', independencia: '2035-05-05' });
  assert.deepEqual(e.marcos, { reserva: '2027-01-01' });
});
