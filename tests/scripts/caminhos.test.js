// Os dados pessoais nunca dentro do repositório público (que não os ignora).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { dentroDe } from '../../scripts/caminhos.mjs';

test('dentroDe: a própria pasta e as de dentro, sim; as de fora, não', () => {
  const raiz = resolve('repo-de-teste');
  assert.equal(dentroDe(raiz, raiz), true);
  assert.equal(dentroDe(raiz, join(raiz, 'scripts', 'recomendacao.json')), true);
  assert.equal(dentroDe(raiz, join(tmpdir(), 'onde-investir', 'recomendacao.json')), false);
  assert.equal(dentroDe(raiz, `${raiz}-dados`), false, 'pasta irmã com o mesmo começo de nome');
});
