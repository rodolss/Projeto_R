import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolverRota, abaDoMenu, TELAS } from '../../js/ui/rotas.js';

test('telas conhecidas', () => {
  assert.deepEqual(TELAS, ['boas-vindas', 'inicio', 'mes', 'simular', 'mais', 'orcamento', 'historico', 'config']);
});
test('rotas', () => {
  assert.equal(resolverRota('', true), 'inicio');
  assert.equal(resolverRota('#/painel', true), 'inicio');
  assert.equal(resolverRota('#/xyz', true), 'inicio');
  assert.equal(resolverRota('#/simular', true), 'simular');
  assert.equal(resolverRota('#/mes?x=1', true), 'mes');
  assert.equal(resolverRota('#/mes', false), 'boas-vindas');
  assert.equal(resolverRota('#/boas-vindas', true), 'boas-vindas');
});
test('aba do menu', () => {
  assert.equal(abaDoMenu('config'), 'mais');
  assert.equal(abaDoMenu('orcamento'), 'mais');
  assert.equal(abaDoMenu('historico'), 'mais');
  assert.equal(abaDoMenu('mes'), 'mes');
  assert.equal(abaDoMenu('inicio'), 'inicio');
  assert.equal(abaDoMenu('boas-vindas'), null);
});
