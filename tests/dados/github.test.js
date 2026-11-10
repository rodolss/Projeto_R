import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarFetch, base64 } from './falsos.js';
import { criarClienteGitHub, donoPadrao } from '../../js/dados/github.js';

const cliente = (respostas) => {
  const f = criarFetch(respostas);
  return { c: criarClienteGitHub({ token: 'tk', dono: 'fulano', fetch: f.fetch }), chamadas: f.chamadas };
};

test('ler decodifica UTF-8 e usa o token', async () => {
  const conteudo = base64('{"schemaVersion":1,"config":{"nome":"Ação"}}').replace(/(.{20})/g, '$1\n');
  const { c, chamadas } = cliente([{ status: 200, json: { content: conteudo, sha: 'abc' } }]);
  const r = await c.ler();
  assert.equal(r.estado.config.nome, 'Ação');
  assert.equal(r.sha, 'abc');
  assert.equal(chamadas[0].url, 'https://api.github.com/repos/fulano/Projeto_R-dados/contents/dados.json');
  assert.equal(chamadas[0].headers.Authorization, 'Bearer tk');
});
test('ler sem arquivo devolve null', async () => {
  const { c } = cliente([{ status: 404, json: {} }, { status: 200, json: {} }]);
  assert.equal(await c.ler(), null);
});
test('repo inexistente', async () => {
  const { c } = cliente([{ status: 404, json: {} }, { status: 404, json: {} }]);
  await assert.rejects(c.ler(), (e) => e.codigo === 'repo-nao-encontrado');
});
test('token inválido e sem permissão', async () => {
  await assert.rejects(cliente([{ status: 401, json: {} }]).c.ler(), (e) => e.codigo === 'token-invalido');
  await assert.rejects(cliente([{ status: 403, json: {} }]).c.ler(), (e) => e.codigo === 'sem-permissao');
});
test('falha de rede', async () => {
  await assert.rejects(cliente(['rede']).c.ler(), (e) => e.codigo === 'rede');
});
test('gravar envia sha e conteúdo em base64 e devolve o novo sha', async () => {
  const { c, chamadas } = cliente([{ status: 200, json: { content: { sha: 'novo' } } }]);
  assert.equal(await c.gravar({ schemaVersion: 1, nome: 'Ação' }, 'velho'), 'novo');
  const corpo = JSON.parse(chamadas[0].body);
  assert.equal(chamadas[0].method, 'PUT');
  assert.equal(corpo.sha, 'velho');
  assert.equal(JSON.parse(Buffer.from(corpo.content, 'base64').toString('utf8')).nome, 'Ação');
});
test('gravar sem sha na primeira vez', async () => {
  const { c, chamadas } = cliente([{ status: 201, json: { content: { sha: 'primeiro' } } }]);
  assert.equal(await c.gravar({ schemaVersion: 1 }, null), 'primeiro');
  assert.equal('sha' in JSON.parse(chamadas[0].body), false);
});
test('conflito no PUT', async () => {
  await assert.rejects(cliente([{ status: 409, json: {} }]).c.gravar({}, 'x'), (e) => e.codigo === 'conflito');
  await assert.rejects(cliente([{ status: 422, json: {} }]).c.gravar({}, 'x'), (e) => e.codigo === 'conflito');
});
test('donoPadrao', () => {
  assert.equal(donoPadrao('fulano.github.io'), 'fulano');
  assert.equal(donoPadrao('localhost'), '');
});
