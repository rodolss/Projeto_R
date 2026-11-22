import { test } from 'node:test';
import assert from 'node:assert/strict';
import { juntarNomes } from '../../js/ui/casa-ajustes.js';

test('juntarNomes: o resumo da gaveta Casa com duas, três ou uma pessoa', () => {
  assert.equal(juntarNomes(['Ana', 'Leo']), 'Ana e Leo');
  assert.equal(juntarNomes(['Ana', 'Leo', 'Cris']), 'Ana, Leo e Cris');
  assert.equal(juntarNomes(['Ana']), 'Ana');
});
