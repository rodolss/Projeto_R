import { test } from 'node:test';
import assert from 'node:assert/strict';
import { iniciais } from '../../js/ui/carteira-ativos.js';

test('iniciais do selo do ativo: duas letras, do código ou das duas primeiras palavras', () => {
  assert.equal(iniciais('XFIX11'), 'XF');
  assert.equal(iniciais('Tesouro IPCA+ 2035'), 'TI');
  assert.equal(iniciais('ivvb11'), 'IV');
  assert.equal(iniciais('  '), '?');
});
