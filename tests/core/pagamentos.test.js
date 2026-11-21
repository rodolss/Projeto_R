import { test } from 'node:test';
import assert from 'node:assert/strict';
import { marcarPago, estaPago, tudoPago, contasPagas, mesEmFoco, marcaDaConta, marcaDoCartao } from '../../js/core/pagamentos.js';
import { migrarCasa, salvarValor } from '../../js/core/casa.js';
import { anotarCompra } from '../../js/core/cartao.js';
import { mesclarCasa } from '../../js/dados/mesclar-casa.js';

// Casa inventada: Ana e Leo; Luz e Água com valor em dez e jan. `comCartao`: o cartão da Ana, com uma compra em dez.
function casaBase(comCartao = false) {
  let casa = migrarCasa({
    schemaVersion: 3,
    pessoas: [{ id: 'p1', nome: 'Ana' }, { id: 'p2', nome: 'Leo' }],
    contas: [
      { id: 'c1', nome: 'Luz', compraPorCompra: false, arquivada: false },
      { id: 'c2', nome: 'Água', compraPorCompra: false, arquivada: false },
      { id: 'c3', nome: 'Cartão Ana', compraPorCompra: true, arquivada: false },
    ],
    meses: [], cartoes: comCartao ? [{ id: 'k1', contaId: 'c3', donaId: 'p1', viraNoDia: 3, venceNoDia: 10, fixas: [] }] : [], outrasPessoas: [],
  });
  for (const mes of ['2026-12', '2027-01']) {
    casa = salvarValor(casa, { mes, contaId: 'c1', valor: 200 });
    casa = salvarValor(casa, { mes, contaId: 'c2', valor: 50 });
  }
  if (comCartao) casa = anotarCompra(casa, { cartaoId: 'k1', data: '2026-11-20', nome: 'Blusa', valor: 80, para: 'p1', novoId: () => 'x1' });
  return casa;
}
const marcar = (casa, mes, marca, pago = true) => marcarPago(casa, { mes, marca, pago });

test('já paguei: marca e desmarca por mês e conta (vale para os dois); vazio não deixa rastro', () => {
  let casa = marcar(casaBase(), '2026-12', 'c1');
  assert.equal(estaPago(casa, '2026-12', 'c1'), true);
  assert.equal(estaPago(casa, '2027-01', 'c1'), false);
  casa = marcar(casa, '2026-12', 'c1', false);
  assert.equal('pagamentos' in casa, false);
});

test('já paguei: contas pagas e tudo pago (mês sem conta não conta)', () => {
  let casa = casaBase();
  assert.equal(tudoPago(casa, '2026-11', 'p1'), false);
  casa = marcar(casa, '2026-12', 'c1');
  assert.equal(contasPagas(casa, '2026-12', 'p1'), false);
  casa = marcar(casa, '2026-12', 'c2');
  assert.equal(contasPagas(casa, '2026-12', 'p1'), true);
  assert.equal(tudoPago(casa, '2026-12', 'p1'), true);
  assert.equal(tudoPago(casa, '2026-12', 'p2'), true); // a marca é da casa: vale para os dois
});

test('já paguei: com tudo pago a tela abre no mês seguinte (e segue enquanto estiver tudo pago)', () => {
  let casa = marcar(marcar(casaBase(), '2026-12', 'c1'), '2026-12', 'c2');
  assert.equal(mesEmFoco(casa, '2026-12-10', 'p1'), '2027-01');
  assert.equal(mesEmFoco(casa, '2026-12-10', null), '2026-12'); // sem perfil: não muda
  casa = marcar(marcar(casa, '2027-01', 'c1'), '2027-01', 'c2');
  assert.equal(mesEmFoco(casa, '2026-12-10', 'p1'), '2027-02'); // fevereiro não tem contas: para nele
});

test('já paguei: a fatura do cartão de quem paga também precisa estar paga; a conta ligada a ele é a mesma marca', () => {
  let casa = casaBase(true);
  assert.equal(marcaDaConta(casa, 'c3', 'p1'), 'cartao-k1');
  assert.equal(marcaDaConta(casa, 'c3', 'p2'), 'c3'); // cartão de outra pessoa: conta comum
  casa = marcar(marcar(casa, '2026-12', 'c1'), '2026-12', 'c2');
  assert.equal(contasPagas(casa, '2026-12', 'p1'), true); // contas (sem o cartão) pagas
  assert.equal(tudoPago(casa, '2026-12', 'p1'), false); // falta a fatura do cartão
  assert.equal(mesEmFoco(casa, '2026-12-10', 'p1'), '2026-12');
  casa = marcar(casa, '2026-12', marcaDoCartao('k1'));
  assert.equal(tudoPago(casa, '2026-12', 'p1'), true);
  assert.equal(mesEmFoco(casa, '2026-12-10', 'p1'), '2027-01');
});

test('já paguei: marcas de dois aparelhos se juntam', () => {
  const base = casaBase();
  const r = mesclarCasa({ base, local: marcar(base, '2026-12', 'c1'), remoto: marcar(base, '2026-12', 'c2') });
  assert.deepEqual(r.pagamentos, { '2026-12': { c1: true, c2: true } });
});
