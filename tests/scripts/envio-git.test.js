// Na nuvem do Claude Code, o proxy deixa ler os dados pela API do GitHub mas só gravar por git push: o envio por git
// (desenho 2026-11-22-onde-investir-agendado). Repositórios de verdade, numa pasta temporária.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { enviarPorGit } from '../../scripts/envio-git.mjs';

const EU = ['-c', 'user.name=Teste', '-c', 'user.email=teste@exemplo.invalid', '-c', 'core.autocrlf=false'];
const git = (dir, ...a) => execFileSync('git', ['-C', dir, ...EU, ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

function montar(nomeDoRemoto = 'Projeto_R-dados.git') {
  const base = mkdtempSync(join(tmpdir(), 'envio-git-'));
  const remoto = join(base, nomeDoRemoto);
  execFileSync('git', ['init', '-q', '--bare', '-b', 'main', remoto]);
  const semente = join(base, 'semente');
  execFileSync('git', ['clone', '-q', remoto, semente], { stdio: 'ignore' });
  writeFileSync(join(semente, 'dados.json'), '{"v":1}\n');
  git(semente, 'add', 'dados.json');
  git(semente, 'commit', '-q', '-m', 'v1');
  git(semente, 'push', '-q', 'origin', 'HEAD:main');
  const clone = join(base, 'clone');
  execFileSync('git', ['clone', '-q', remoto, clone], { stdio: 'ignore' });
  return { base, remoto, semente, clone, sha: git(semente, 'rev-parse', 'HEAD:dados.json') };
}
const noRemoto = (remoto) => execFileSync('git', ['--git-dir', remoto, 'show', 'main:dados.json'], { encoding: 'utf8' });

test('enviarPorGit: com o dados.json do remoto igual ao baixado, grava e empurra para o main', () => {
  const r = montar();
  try {
    assert.equal(enviarPorGit({ clone: r.clone, conteudo: '{"v":2}\n', shaEsperado: r.sha, mensagem: 'Onde investir: teste' }), 'enviado');
    assert.equal(noRemoto(r.remoto), '{"v":2}\n');
  } finally { rmSync(r.base, { recursive: true, force: true }); }
});

test('enviarPorGit: se o app gravou no meio (o dados.json do remoto mudou), não grava e diz conflito', () => {
  const r = montar();
  try {
    writeFileSync(join(r.semente, 'dados.json'), '{"v":"do app"}\n');
    git(r.semente, 'commit', '-q', '-am', 'app');
    git(r.semente, 'push', '-q', 'origin', 'HEAD:main');
    assert.equal(enviarPorGit({ clone: r.clone, conteudo: '{"v":2}\n', shaEsperado: r.sha, mensagem: 'x' }), 'conflito');
    assert.equal(noRemoto(r.remoto), '{"v":"do app"}\n');
  } finally { rmSync(r.base, { recursive: true, force: true }); }
});

test('enviarPorGit: o mesmo conteúdo não vira commit vazio', () => {
  const r = montar();
  try {
    assert.equal(enviarPorGit({ clone: r.clone, conteudo: '{"v":1}\n', shaEsperado: r.sha, mensagem: 'x' }), 'sem mudança');
  } finally { rmSync(r.base, { recursive: true, force: true }); }
});

test('enviarPorGit: só grava no repositório de dados (nunca no público)', () => {
  const r = montar('Projeto_R.git');
  try {
    assert.throws(() => enviarPorGit({ clone: r.clone, conteudo: '{"v":2}\n', shaEsperado: r.sha, mensagem: 'x' }), /Projeto_R-dados/);
    assert.equal(noRemoto(r.remoto), '{"v":1}\n');
  } finally { rmSync(r.base, { recursive: true, force: true }); }
});
