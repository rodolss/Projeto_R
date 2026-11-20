import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pessoaDoBalanco, enderecoDaFatura } from '../../js/ui/casa-balanco.js';

const casa = { pessoas: [{ id: 'p1', nome: 'Ana' }, { id: 'p2', nome: 'Leo' }] };

test('pessoa do balanço: a do perfil visto; sem perfil, a do endereço (se for da casa), senão a primeira', () => {
  assert.equal(pessoaDoBalanco({ hash: '#/casa-balanco?pessoa=p1', casa, visto: { id: 'p2' } }), 'p2');
  assert.equal(pessoaDoBalanco({ hash: '#/casa-balanco?pessoa=x9', casa, visto: { id: 'x9' } }), 'x9'); // perfil que não divide a casa
  assert.equal(pessoaDoBalanco({ hash: '#/casa-balanco?mes=2026-12&pessoa=p2', casa, visto: null }), 'p2');
  assert.equal(pessoaDoBalanco({ hash: '#/casa-balanco?pessoa=sumiu', casa, visto: null }), 'p1');
  assert.equal(pessoaDoBalanco({ hash: '#/casa-balanco', casa, visto: null }), 'p1');
  assert.equal(pessoaDoBalanco({ hash: '#/casa-balanco', casa: { pessoas: [] }, visto: null }), null);
});

test('revisão: as linhas do cartão (e a de outras pessoas) levam à fatura do mês no Cartão, não ao Cofrinho', () => {
  assert.equal(enderecoDaFatura('c2', '2026-12'), '#/casa-cartao?cartao=c2&fatura=2026-12');
});
