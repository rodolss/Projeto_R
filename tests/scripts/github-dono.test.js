// O dono do repositório tirado do remoto do git (na nuvem, `gh api user` não passa pelo proxy do GitHub).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { donoDaUrl } from '../../scripts/github-dono.mjs';

test('donoDaUrl: https, ssh e o proxy da nuvem', () => {
  assert.equal(donoDaUrl('https://github.com/dono/Projeto_R.git'), 'dono');
  assert.equal(donoDaUrl('https://github.com/dono/Projeto_R'), 'dono');
  assert.equal(donoDaUrl('git@github.com:dono/Projeto_R.git'), 'dono');
  assert.equal(donoDaUrl('http://local_proxy@127.0.0.1:1234/git/dono/Projeto_R'), 'dono');
  assert.equal(donoDaUrl('http://local_proxy@127.0.0.1:1234/git/dono/Projeto_R\n'), 'dono');
});

test('donoDaUrl: outro repositório ou nada', () => {
  assert.equal(donoDaUrl('https://github.com/dono/Outro.git'), null);
  assert.equal(donoDaUrl('https://github.com/dono/Projeto_R-dados.git'), null);
  assert.equal(donoDaUrl(''), null);
  assert.equal(donoDaUrl(null), null);
});
