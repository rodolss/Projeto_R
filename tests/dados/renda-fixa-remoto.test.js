import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buscarTesouro, buscarCdi, precisaCdi } from '../../js/dados/renda-fixa-remoto.js';

const resposta = (corpo, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => corpo });
const TESOURO = { data: '2026-11-19', titulos: [{ nome: 'Tesouro Selic 2029', tipo: 'Tesouro Selic', vencimento: '2029-03-01', preco: 20305.65, taxa: 0.08 }] };

test('Tesouro: lê o arquivo público do próprio site; ausente ou inválido dá null', async () => {
  let pedido;
  const r = await buscarTesouro({ fetch: async (url, opcoes) => { pedido = [url, opcoes]; return resposta(TESOURO); } });
  assert.deepEqual(r, TESOURO);
  assert.equal(pedido[0], './dados-publicos/tesouro.json');
  assert.equal(pedido[1].cache, 'no-cache');
  assert.equal(await buscarTesouro({ fetch: async () => resposta({}, 404) }), null);
  assert.equal(await buscarTesouro({ fetch: async () => resposta({ data: 'x', titulos: [{ nome: 1 }] }) }), null);
  assert.equal(await buscarTesouro({ fetch: async () => { throw new Error('offline'); } }), null);
});

test('CDI: série diária do Banco Central em AAAA-MM-DD; junta com a guardada e só pede o que falta', async () => {
  const urls = [];
  const fetch = async (url) => { urls.push(url); return resposta([{ data: '20/11/2026', valor: '0.050788' }, { data: '23/11/2026', valor: '0.050788' }]); };
  const guardada = { '2026-01-02': 0.05, '2026-11-19': 0.05 };
  const serie = await buscarCdi({ fetch, desde: '2026-01-02', ate: '2026-11-24', guardada });
  assert.deepEqual(serie, { '2026-01-02': 0.05, '2026-11-19': 0.05, '2026-11-20': 0.050788, '2026-11-23': 0.050788 });
  assert.match(urls[0], /bcdata\.sgs\.12\/dados\?formato=json&dataInicial=19\/11\/2026&dataFinal=24\/11\/2026/);
  // Sem nada guardado (ou guardado depois de quando precisa): pede desde a aplicação.
  urls.length = 0;
  await buscarCdi({ fetch, desde: '2025-03-10', ate: '2026-11-24', guardada: {} });
  assert.match(urls[0], /dataInicial=10\/03\/2025/);
});

test('CDI: período longo vai em pedaços (o Banco Central limita a 10 anos); erro devolve a guardada', async () => {
  const urls = [];
  const fetch = async (url) => { urls.push(url); return resposta([]); };
  await buscarCdi({ fetch, desde: '2010-01-04', ate: '2026-11-24', guardada: {} });
  assert.equal(urls.length, 2);
  const guardada = { '2026-11-19': 0.05 };
  assert.deepEqual(await buscarCdi({ fetch: async () => { throw new Error('offline'); }, desde: '2026-11-01', ate: '2026-11-24', guardada }), guardada);
  assert.deepEqual(await buscarCdi({ fetch: async () => resposta({}, 404), desde: '2026-11-01', ate: '2026-11-24', guardada }), guardada);
});

test('precisa do CDI: sem série, série que não cobre a aplicação mais antiga, ou atualizada há mais de 12 horas', () => {
  const agora = new Date('2026-11-24T12:00:00.000Z');
  const guardado = { serie: { '2026-01-02': 0.05 }, atualizadoEm: '2026-11-24T08:00:00.000Z' };
  assert.equal(precisaCdi(guardado, '2026-01-05', agora), false);
  assert.equal(precisaCdi(guardado, '2025-06-01', agora), true);
  assert.equal(precisaCdi({ ...guardado, atualizadoEm: '2026-11-23T08:00:00.000Z' }, '2026-01-05', agora), true);
  assert.equal(precisaCdi(null, '2026-01-05', agora), true);
  assert.equal(precisaCdi(guardado, null, agora), false, 'sem título calculado, não precisa');
});
