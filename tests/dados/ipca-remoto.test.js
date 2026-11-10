import { test } from 'node:test';
import assert from 'node:assert/strict';
import { perto } from '../ajuda.js';
import { criarFetch } from './falsos.js';
import { buscarSerieIpca, precisaAtualizarIpca, URL_IPCA } from '../../js/dados/ipca-remoto.js';

test('buscarSerieIpca monta a URL e parseia', async () => {
  const { fetch, chamadas } = criarFetch([{ status: 200, json: [{ data: '01/09/2026', valor: '0.82' }] }]);
  const s = await buscarSerieIpca({ fetch, desde: '2026-07' });
  assert.ok(chamadas[0].url.startsWith(URL_IPCA));
  assert.match(chamadas[0].url, /dataInicial=01\/07\/2026/);
  perto(s['2026-09'], 0.0082, 1e-12);
});
test('resposta inválida lança erro', async () => {
  await assert.rejects(buscarSerieIpca({ fetch: criarFetch([{ status: 200, json: { erro: 'x' } }]).fetch, desde: '2026-07' }));
  await assert.rejects(buscarSerieIpca({ fetch: criarFetch([{ status: 500, json: [] }]).fetch, desde: '2026-07' }));
});
test('período ainda sem IPCA divulgado (404) devolve série vazia', async () => {
  assert.deepEqual(await buscarSerieIpca({ fetch: criarFetch([{ status: 404, json: {} }]).fetch, desde: '2026-10' }), {});
});
test('precisaAtualizarIpca', () => {
  assert.equal(precisaAtualizarIpca({ atualizadoEm: null }, new Date()), true);
  assert.equal(precisaAtualizarIpca({ atualizadoEm: new Date().toISOString() }, new Date()), false);
  assert.equal(precisaAtualizarIpca({ atualizadoEm: '2026-01-01T00:00:00Z' }, new Date('2026-01-02T01:00:00Z')), true);
});
