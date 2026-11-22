import { test } from 'node:test';
import assert from 'node:assert/strict';
import { iniciais, GRUPOS_FORA_DA_BOLSA, numeroBr, dataValida } from '../../js/ui/carteira-ativos.js';

test('iniciais do selo do ativo: duas letras, do código ou das duas primeiras palavras', () => {
  assert.equal(iniciais('XFIX11'), 'XF');
  assert.equal(iniciais('Tesouro IPCA+ 2035'), 'TI');
  assert.equal(iniciais('ivvb11'), 'IV');
  assert.equal(iniciais('  '), '?');
});

test('aba "Renda fixa e outros": só os grupos fora da bolsa (ações, FIIs e exterior ficam na busca)', () => {
  assert.deepEqual(GRUPOS_FORA_DA_BOLSA, ['rendaFixa', 'reserva', 'caixa', 'fora-do-plano', 'fgts']);
});

test('números do jeito brasileiro: vírgula decimal, ponto de milhar; com só ponto, o ponto é a vírgula', () => {
  assert.equal(numeroBr('0,47'), 0.47);
  assert.equal(numeroBr('1.250,50'), 1250.5);
  assert.equal(numeroBr('0.47'), 0.47);
  assert.equal(numeroBr(' 110 '), 110);
  assert.equal(numeroBr(''), null);
  assert.equal(numeroBr('abc'), null);
  assert.equal(numeroBr('0'), null);
});

test('revisão: data de aplicação válida só no formato do campo, de 2000 até hoje', () => {
  assert.equal(dataValida('2026-11-03', '2026-11-22'), true);
  assert.equal(dataValida('2026-11-22', '2026-11-22'), true);
  assert.equal(dataValida('2026-11-23', '2026-11-22'), false);
  assert.equal(dataValida('0024-12-01', '2026-11-22'), false);
  assert.equal(dataValida('1999-12-31', '2026-11-22'), false);
  assert.equal(dataValida('', '2026-11-22'), false);
  assert.equal(dataValida(null, '2026-11-22'), false);
});
