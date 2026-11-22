import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buscarSugestoes, buscarPreco, atualizarCotacoes, precisaAtualizar } from '../../js/dados/cotacoes-remoto.js';

// Resposta da lista do brapi.dev, simplificada: a busca por ITUB traz também o fracionário (ITUB4F).
const LISTA = {
  stocks: [
    { stock: 'ITUB4F', name: 'ITAU UNIBANCO HOLDING S.A.', close: 39.93, type: 'stock', subType: 'stock' },
    { stock: 'ITUB4', name: 'ITAU UNIBANCO HOLDING S.A.', close: 40.07, type: 'stock', subType: 'stock' },
    { stock: 'MXRF11', name: 'MAXI RENDA FII', close: 8.5, type: 'fund', subType: 'fii' },
  ],
};
const resposta = (corpo, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => corpo });
const fetchDe = (corpo, status) => async () => resposta(corpo, status);

test('sugestões: código, nome, preço e tipo; menos de 2 letras não consulta', async () => {
  let pedidos = 0;
  const fetch = async (url) => { pedidos++; assert.match(url, /quote\/list\?search=ITUB/); return resposta(LISTA); };
  const lista = await buscarSugestoes(' itub ', { fetch });
  assert.deepEqual(lista[1], { ticker: 'ITUB4', nome: 'ITAU UNIBANCO HOLDING S.A.', preco: 40.07, tipo: 'stock', subTipo: 'stock' });
  assert.equal(lista.length, 3);
  assert.deepEqual(await buscarSugestoes('I', { fetch }), []);
  assert.equal(pedidos, 1);
});

test('sugestões: o código exato vem primeiro; erro de rede ou resposta estranha dá lista vazia', async () => {
  const exato = await buscarSugestoes('ITUB4', { fetch: fetchDe(LISTA) });
  assert.equal(exato[0].ticker, 'ITUB4');
  assert.deepEqual(await buscarSugestoes('ITUB', { fetch: async () => { throw new Error('offline'); } }), []);
  assert.deepEqual(await buscarSugestoes('ITUB', { fetch: fetchDe({ stocks: 'nada' }) }), []);
  assert.deepEqual(await buscarSugestoes('ITUB', { fetch: fetchDe({}, 429) }), []);
  assert.deepEqual(await buscarSugestoes('ITUB', { fetch: fetchDe(null) }), []);
});

test('preço: escolhe o código exato (não o fracionário); sem ele, ou com erro, null', async () => {
  assert.equal(await buscarPreco('ITUB4', { fetch: fetchDe(LISTA) }), 40.07);
  assert.equal(await buscarPreco('MXRF11', { fetch: fetchDe(LISTA) }), 8.5);
  assert.equal(await buscarPreco('PETR4', { fetch: fetchDe(LISTA) }), null);
  assert.equal(await buscarPreco('ITUB4', { fetch: fetchDe({}, 500) }), null);
  assert.equal(await buscarPreco('ITUB4', { fetch: async () => { throw new Error('offline'); } }), null);
  assert.equal(await buscarPreco('ITUB4', { fetch: fetchDe({ stocks: [{ stock: 'ITUB4', close: 0 }] }) }), null);
});

test('atualizar: um pedido por papel; quem falha mantém o valor guardado; para no limite de pedidos (429)', async () => {
  const guardadas = { PETR4: { preco: 30, em: '2026-12-09T10:00:00.000Z' } };
  const agora = new Date('2026-12-10T12:00:00.000Z');
  const visto = [];
  const fetch = async (url) => {
    const t = decodeURIComponent(url.match(/search=([^&]+)/)[1]);
    visto.push(t);
    if (t === 'PETR4') return resposta({ stocks: [] }); // não achou: mantém o guardado
    if (t === 'VALE3') return resposta({}, 429);
    return resposta({ stocks: [{ stock: t, close: 12.5 }] });
  };
  const r = await atualizarCotacoes(['ITUB4', 'PETR4', 'VALE3', 'MXRF11'], { fetch, guardadas, agora, espera: 0 });
  assert.deepEqual(visto, ['ITUB4', 'PETR4', 'VALE3'], 'depois do 429 não pede mais');
  assert.deepEqual(r.cotacoes.ITUB4, { preco: 12.5, em: agora.toISOString() });
  assert.deepEqual(r.cotacoes.PETR4, guardadas.PETR4);
  assert.equal(r.cotacoes.MXRF11, undefined);
  assert.equal(r.falhou, true);
  const ok = await atualizarCotacoes(['ITUB4'], { fetch, guardadas: {}, agora, espera: 0 });
  assert.equal(ok.falhou, false);
});

test('precisa atualizar: papel novo ou cotação com mais de 15 minutos; sem papéis, nunca', () => {
  const agora = new Date('2026-12-10T12:00:00.000Z');
  const fresca = { ITUB4: { preco: 40, em: '2026-12-10T11:50:00.000Z' } };
  assert.equal(precisaAtualizar(fresca, ['ITUB4'], agora), false);
  assert.equal(precisaAtualizar(fresca, ['ITUB4', 'VALE3'], agora), true);
  assert.equal(precisaAtualizar({ ITUB4: { preco: 40, em: '2026-12-10T11:30:00.000Z' } }, ['ITUB4'], agora), true);
  assert.equal(precisaAtualizar({}, [], agora), false);
  assert.equal(precisaAtualizar(null, ['ITUB4'], agora), true);
});
