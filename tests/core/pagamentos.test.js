import { test } from 'node:test';
import assert from 'node:assert/strict';
import { marcarPago, estaPago, tudoPago, mesEmFoco, marcaDaConta } from '../../js/core/pagamentos.js';
import { anotarCompra } from '../../js/core/cartao.js';
import { migrarCasa, salvarValor } from '../../js/core/casa.js';
import { mesclarCasa } from '../../js/dados/mesclar-casa.js';

// Casa inventada: Ana e Leo; Luz, Água e o Cartão Ana (conta ligada a um cartão) com valor em dez e jan.
function casaBase() {
  let casa = migrarCasa({
    schemaVersion: 3,
    pessoas: [{ id: 'p1', nome: 'Ana' }, { id: 'p2', nome: 'Leo' }],
    contas: [
      { id: 'c1', nome: 'Luz', compraPorCompra: false, arquivada: false },
      { id: 'c2', nome: 'Água', compraPorCompra: false, arquivada: false },
    ],
    meses: [], cartoes: [], outrasPessoas: [],
  });
  for (const mes of ['2026-12', '2027-01']) {
    casa = salvarValor(casa, { mes, contaId: 'c1', valor: 200 });
    casa = salvarValor(casa, { mes, contaId: 'c2', valor: 50 });
  }
  return casa;
}
const marcar = (casa, mes, pessoaId, contaId, pago = true) => marcarPago(casa, { mes, pessoaId, contaId, pago });

test('já paguei: marca e desmarca por pessoa, mês e conta; vazio não deixa rastro', () => {
  let casa = marcar(casaBase(), '2026-12', 'p1', 'c1');
  assert.equal(estaPago(casa, '2026-12', 'p1', 'c1'), true);
  assert.equal(estaPago(casa, '2026-12', 'p2', 'c1'), false); // cada um marca o seu
  assert.equal(estaPago(casa, '2027-01', 'p1', 'c1'), false);
  casa = marcar(casa, '2026-12', 'p1', 'c1', false);
  assert.equal('pagos' in casa, false);
});

test('já paguei: tudo pago só com contas no mês e todas marcadas', () => {
  let casa = casaBase();
  assert.equal(tudoPago(casa, '2026-11', 'p1'), false); // mês sem conta nenhuma: não conta como pago
  casa = marcar(casa, '2026-12', 'p1', 'c1');
  assert.equal(tudoPago(casa, '2026-12', 'p1'), false);
  casa = marcar(casa, '2026-12', 'p1', 'c2');
  assert.equal(tudoPago(casa, '2026-12', 'p1'), true);
  assert.equal(tudoPago(casa, '2026-12', 'p2'), false);
});

test('já paguei: quando tudo está pago a tela abre no mês seguinte (e segue enquanto estiver tudo pago)', () => {
  let casa = casaBase();
  assert.equal(mesEmFoco(casa, '2026-12-10', 'p1'), '2026-12');
  casa = marcar(marcar(casa, '2026-12', 'p1', 'c1'), '2026-12', 'p1', 'c2');
  assert.equal(mesEmFoco(casa, '2026-12-10', 'p1'), '2027-01');
  assert.equal(mesEmFoco(casa, '2026-12-10', 'p2'), '2026-12');
  assert.equal(mesEmFoco(casa, '2026-12-10', null), '2026-12'); // sem perfil: não muda
  casa = marcar(marcar(casa, '2027-01', 'p1', 'c1'), '2027-01', 'p1', 'c2');
  assert.equal(mesEmFoco(casa, '2026-12-10', 'p1'), '2027-02'); // fevereiro não tem contas: para nele
});

test('já paguei: marcas de dois aparelhos se juntam (cada um marcou uma conta)', () => {
  const base = casaBase();
  const r = mesclarCasa({ base, local: marcar(base, '2026-12', 'p1', 'c1'), remoto: marcar(base, '2026-12', 'p1', 'c2') });
  assert.deepEqual(r.pagos, { '2026-12': { p1: { c1: true, c2: true } } });
});

test('já paguei: a fatura do cartão de quem paga também precisa estar paga; a conta ligada a ele é a mesma marca', () => {
  let casa = migrarCasa({
    schemaVersion: 3,
    pessoas: [{ id: 'p1', nome: 'Ana' }, { id: 'p2', nome: 'Leo' }],
    contas: [{ id: 'c1', nome: 'Luz', compraPorCompra: false, arquivada: false }, { id: 'c2', nome: 'Cartão Ana', compraPorCompra: true, arquivada: false }],
    meses: [], cartoes: [{ id: 'k1', contaId: 'c2', donaId: 'p1', viraNoDia: 3, venceNoDia: 10, fixas: [] }], outrasPessoas: [],
  });
  casa = salvarValor(casa, { mes: '2026-12', contaId: 'c1', valor: 200 });
  casa = anotarCompra(casa, { cartaoId: 'k1', data: '2026-11-20', nome: 'Blusa', valor: 80, para: 'p1', novoId: () => 'x1' });
  assert.equal(marcaDaConta(casa, 'c2', 'p1'), 'cartao-k1');
  assert.equal(marcaDaConta(casa, 'c2', 'p2'), 'c2'); // cartão de outra pessoa: conta comum
  casa = marcar(casa, '2026-12', 'p1', 'c1');
  assert.equal(tudoPago(casa, '2026-12', 'p1'), false); // falta o cartão
  assert.equal(mesEmFoco(casa, '2026-12-10', 'p1'), '2026-12');
  casa = marcar(casa, '2026-12', 'p1', 'cartao-k1');
  assert.equal(tudoPago(casa, '2026-12', 'p1'), true);
  assert.equal(mesEmFoco(casa, '2026-12-10', 'p1'), '2027-01');
  assert.equal(tudoPago(casa, '2026-12', 'p2'), false); // o outro não pagou nada
});
