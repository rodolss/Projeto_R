import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mesclar } from '../../js/dados/mesclar.js';

const base = {
  schemaVersion: 1,
  config: { salario: 7800, swr: 0.04 },
  plano: { p0: 0 },
  meses: [{ mes: '2026-11', recebido: 7800 }],
  saldos: [{ ativoId: 'a', data: '2026-11-10', valor: 100 }],
  ativos: [{ id: 'a', nome: 'A' }],
  orcamento: [{ id: 'o1', valor: 10 }],
  contadoresAnuais: { 2026: 100 },
  ipca: { serie: { '2026-09': 0.008 }, atualizadoEm: '2026-11-01T00:00:00Z' },
  ipcaManual: {},
};
const copia = (mudar) => { const e = structuredClone(base); mudar(e); return e; };

test('meses lançados nos dois aparelhos são mantidos', () => {
  const local = copia((e) => e.meses.push({ mes: '2026-12', recebido: 1 }));
  const remoto = copia((e) => e.meses.push({ mes: '2027-01', recebido: 2 }, { mes: '2027-02', recebido: 3 }));
  assert.deepEqual(mesclar({ base, local, remoto }).meses.map((m) => m.mes), ['2026-11', '2026-12', '2027-01', '2027-02']);
});
test('mudança só local ou só remota prevalece', () => {
  const local = copia((e) => { e.config.salario = 9000; });
  const remoto = copia((e) => { e.plano.p0 = 50; });
  const r = mesclar({ base, local, remoto });
  assert.equal(r.config.salario, 9000);
  assert.equal(r.plano.p0, 50);
});
test('o mesmo mês alterado nos dois lados: vale o local', () => {
  const local = copia((e) => { e.meses[0].recebido = 1; });
  const remoto = copia((e) => { e.meses[0].recebido = 2; });
  assert.equal(mesclar({ base, local, remoto }).meses[0].recebido, 1);
});
test('contadores somam o que cada lado acrescentou', () => {
  const local = copia((e) => { e.contadoresAnuais[2026] = 150; });
  const remoto = copia((e) => { e.contadoresAnuais[2026] = 300; });
  assert.equal(mesclar({ base, local, remoto }).contadoresAnuais[2026], 350);
});
test('item apagado localmente some se o remoto não mexeu nele', () => {
  const local = copia((e) => { e.orcamento = []; });
  assert.deepEqual(mesclar({ base, local, remoto: structuredClone(base) }).orcamento, []);
});
test('saldos dos dois lados são unidos', () => {
  const local = copia((e) => e.saldos.push({ ativoId: 'a', data: '2026-12-10', valor: 110 }));
  const remoto = copia((e) => e.saldos.push({ ativoId: 'a', data: '2026-12-20', valor: 120 }));
  assert.equal(mesclar({ base, local, remoto }).saldos.length, 3);
});
test('IPCA: fica a série mais recente', () => {
  const remoto = copia((e) => { e.ipca = { serie: { '2026-09': 0.008, '2026-10': 0.004 }, atualizadoEm: '2026-11-12T00:00:00Z' }; });
  assert.ok('2026-10' in mesclar({ base, local: structuredClone(base), remoto }).ipca.serie);
});
test('sem base conhecida: une tudo e o local vence nos empates', () => {
  const local = copia((e) => { e.meses = [{ mes: '2026-11', recebido: 1 }]; });
  const remoto = copia((e) => { e.meses = [{ mes: '2026-11', recebido: 2 }, { mes: '2026-12', recebido: 3 }]; });
  const r = mesclar({ base: null, local, remoto });
  assert.deepEqual(r.meses.map((m) => [m.mes, m.recebido]), [['2026-11', 1], ['2026-12', 3]]);
});
