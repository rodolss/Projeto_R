import { test } from 'node:test';
import assert from 'node:assert/strict';
import { itensDoMais } from '../../js/ui/mais.js';

test('Mais: como antes fora da visão única; na visão única, o que não está nas abas', () => {
  assert.deepEqual(itensDoMais(false).map((i) => i.href), ['#/casa', '#/orcamento', '#/historico', '#/config']);
  assert.deepEqual(itensDoMais(true).map((i) => i.href), ['#/simular', '#/casa-ano', '#/orcamento', '#/historico', '#/casa-ajustes', '#/config']);
  assert.ok(itensDoMais(true).every((i) => i.titulo && i.frase));
});
