import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mesclarCasa } from '../../js/dados/mesclar-casa.js';
import { salvarValor, adicionarCompra, apagarCompra, editarConta } from '../../js/core/casa.js';

function base() {
  return {
    schemaVersion: 1,
    pessoas: [{ id: 'p1', nome: 'Ana' }, { id: 'p2', nome: 'Bia' }],
    contas: [
      { id: 'c1', nome: 'Água', compraPorCompra: false, arquivada: false },
      { id: 'c2', nome: 'Luz', compraPorCompra: false, arquivada: false },
      { id: 'c4', nome: 'Cartão', compraPorCompra: true, arquivada: false },
    ],
    meses: [{ mes: '2026-11', salarios: { p1: 5000 }, valores: { c1: 40 }, compras: [{ id: 'x1', contaId: 'c4', nome: 'Pão', valor: 10 }] }],
  };
}
const mes = (casa, m) => casa.meses.find((x) => x.mes === m);

test('dois aparelhos digitam contas diferentes no mesmo mês: as duas ficam', () => {
  const b = base();
  const local = salvarValor(b, { mes: '2026-11', contaId: 'c2', valor: 210 });
  const remoto = salvarValor(b, { mes: '2026-11', contaId: 'c1', valor: 45 });
  const r = mesclarCasa({ base: b, local, remoto });
  assert.deepEqual(mes(r, '2026-11').valores, { c1: 45, c2: 210 });
  assert.deepEqual(mes(r, '2026-11').salarios, { p1: 5000 });
});

test('os dois anotam compras diferentes no cartão: as duas ficam', () => {
  const b = base();
  const local = adicionarCompra(b, { mes: '2026-11', contaId: 'c4', nome: 'Gás', valor: 100, novoId: () => 'L1' });
  const remoto = adicionarCompra(b, { mes: '2026-11', contaId: 'c4', nome: 'Farmácia', valor: 30, novoId: () => 'R1' });
  const r = mesclarCasa({ base: b, local, remoto });
  assert.deepEqual(mes(r, '2026-11').compras.map((c) => c.id).sort(), ['L1', 'R1', 'x1']);
});

test('compra apagada num aparelho e intacta no outro some', () => {
  const b = base();
  const local = apagarCompra(b, { mes: '2026-11', compraId: 'x1' });
  const remoto = salvarValor(b, { mes: '2026-11', contaId: 'c2', valor: 99 });
  const r = mesclarCasa({ base: b, local, remoto });
  assert.deepEqual(mes(r, '2026-11').compras, []);
  assert.equal(mes(r, '2026-11').valores.c2, 99);
});

test('valor tirado num aparelho e intacto no outro some', () => {
  const b = base();
  const local = salvarValor(b, { mes: '2026-11', contaId: 'c1', valor: null });
  const remoto = salvarValor(b, { mes: '2026-11', contaId: 'c2', valor: 80 });
  const r = mesclarCasa({ base: b, local, remoto });
  assert.deepEqual(mes(r, '2026-11').valores, { c2: 80 });
});

test('uma conta renomeada num lado e arquivada no outro: nome novo e arquivada', () => {
  const b = base();
  const local = editarConta(b, 'c2', { nome: 'Energia' });
  const remoto = editarConta(b, 'c2', { arquivada: true });
  const r = mesclarCasa({ base: b, local, remoto });
  assert.deepEqual(r.contas.find((c) => c.id === 'c2'), { id: 'c2', nome: 'Energia', compraPorCompra: false, arquivada: true });
});

test('o mesmo campo mudado nos dois lados: vale o local', () => {
  const b = base();
  const local = salvarValor(b, { mes: '2026-11', contaId: 'c1', valor: 50 });
  const remoto = salvarValor(b, { mes: '2026-11', contaId: 'c1', valor: 60 });
  assert.equal(mes(mesclarCasa({ base: b, local, remoto }), '2026-11').valores.c1, 50);
});

test('sem base (primeira sincronização) une as listas', () => {
  const local = salvarValor(base(), { mes: '2026-10', contaId: 'c1', valor: 1 });
  const remoto = salvarValor(base(), { mes: '2026-12', contaId: 'c1', valor: 2 });
  const r = mesclarCasa({ base: null, local, remoto });
  assert.deepEqual(r.meses.map((m) => m.mes), ['2026-10', '2026-11', '2026-12']);
});

test('mês novo dos dois lados vem em ordem', () => {
  const b = base();
  const local = salvarValor(b, { mes: '2026-09', contaId: 'c1', valor: 1 });
  const remoto = salvarValor(b, { mes: '2026-12', contaId: 'c1', valor: 2 });
  assert.deepEqual(mesclarCasa({ base: b, local, remoto }).meses.map((m) => m.mes), ['2026-09', '2026-11', '2026-12']);
});
