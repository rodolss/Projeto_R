import { test } from 'node:test';
import assert from 'node:assert/strict';
import { topEtiquetas } from '../../js/core/gastos-por-etiqueta.js';
import { migrarCasa } from '../../js/core/casa.js';
import { anotarCompra } from '../../js/core/cartao.js';
import { juntasDaCasa } from '../../js/core/tags.js';

const K = 'c2';
function casaBase() {
  return migrarCasa({
    schemaVersion: 3,
    pessoas: [{ id: 'p1', nome: 'Ana' }, { id: 'p2', nome: 'Leo' }],
    contas: [{ id: 'c2', nome: 'Cartão', compraPorCompra: true, arquivada: false }],
    meses: [], cartoes: [{ id: K, contaId: K, donaId: 'p2', viraNoDia: 3, venceNoDia: 10, fixas: [] }], outrasPessoas: [],
  });
}
let n = 0;
const anotar = (casa, dados) => anotarCompra(casa, { cartaoId: K, para: 'casa', novoId: () => `k${++n}`, ...dados });

test('top de etiquetas: soma por etiqueta nos 12 meses; compra com duas etiquetas conta nas duas', () => {
  let casa = casaBase();
  casa = anotar(casa, { data: '2026-10-01', nome: 'Ração da Nami', valor: 100 });
  casa = anotar(casa, { data: '2026-10-02', nome: 'Vacina da Nami', valor: 80 });
  casa = anotar(casa, { data: '2026-09-02', nome: 'Mercado', valor: 150 });
  casa = anotar(casa, { data: '2026-09-10', nome: 'mercado', valor: 50 }); // mesma etiqueta (outra grafia)
  casa = anotar(casa, { data: '2026-08-10', nome: 'Pão de queijo', valor: 30 });
  casa = anotar(casa, { data: '2026-07-10', nome: 'Netflix', valor: 40, todoMes: true }); // todo mês: conta em cada fatura
  const r = topEtiquetas(casa, K, '2026-11', { juntas: juntasDaCasa(casa) });
  assert.equal(r.itens.length, 5);
  // Mercado 150+50; Nami 100+80 (as duas compras); Netflix 40 em cada fatura (ago a nov); Ração 100; Vacina 80.
  assert.deepEqual(r.itens.map((x) => [x.tag, x.valor]), [['Mercado', 200], ['Nami', 180], ['Netflix', 160], ['Ração', 100], ['Vacina', 80]]);
  const mercado = r.itens.find((x) => x.tag === 'Mercado');
  assert.equal(mercado.valor, 200);
  assert.equal(mercado.vezes, 2);
  assert.ok(r.itens[0].fracao > 0 && r.itens[0].fracao <= 1);
  assert.equal(r.de, '2025-12');
  assert.equal(r.ate, '2026-11');
  const todas = topEtiquetas(casa, K, '2026-11', { juntas: juntasDaCasa(casa), limite: 20 });
  assert.equal(todas.itens.find((x) => x.tag === 'Pão de Queijo').valor, 30); // a expressão vale uma etiqueta só
  assert.equal(todas.itens.some((x) => x.tag === 'Pão'), false);
});

test('top de etiquetas: fora dos 12 meses não conta; sem compras, lista vazia', () => {
  let casa = casaBase();
  casa = anotar(casa, { data: '2024-05-10', nome: 'Viagem', valor: 999 });
  const r = topEtiquetas(casa, K, '2026-11');
  assert.deepEqual(r.itens, []);
  assert.equal(r.total, 0);
  casa = anotar(casa, { data: '2026-11-10', nome: 'Aviao', valor: 500 });
  const depois = topEtiquetas(casa, K, '2026-12', { limite: 1 });
  assert.equal(depois.itens.length, 1);
  assert.equal(depois.itens[0].tag, 'Avião'); // acento corrigido na etiqueta (e o jeito de escrever mantido)
  assert.equal(depois.itens[0].valor, 500);
});
